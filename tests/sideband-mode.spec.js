import { test, expect } from './helpers/fixtures.js'

/**
 * @fileoverview Sidebands mode (issue #241).
 *
 * A sideband set is a harmonic set whose origin the analyst places: pins spread
 * both sides of a fundamental rather than marching up from 0 Hz. These tests
 * cover what makes it a distinct mode — where the pins land, what a drag on the
 * fundamental does versus a drag on a sideband, its own always-visible table —
 * and that the shared pin-set machinery it rides on (cross-mode rendering,
 * selection, deletion, persistence) reaches it too. The last three guard the
 * control row itself: a fourth table went into a row that was already full.
 *
 * The debug gram spans 0-60 s and 0-100 Hz, so a set placed by clicking gets a
 * seed spacing of 100 / 8 = 12.5 Hz.
 */

/** Seed spacing for a set placed on the debug gram: the axis span over 8. */
const SEED_SPACING = 12.5

/**
 * Place a sideband set by clicking the gram at a fraction across the image,
 * exactly as an analyst would.
 * @param {import('./helpers/gram-frame-page.js').GramFramePage} gfp - Page object
 * @param {number} fracX - Horizontal position, 0-1 across the image
 * @param {number} fracY - Vertical position, 0-1 down the image
 * @returns {Promise<any>} The created set, from broadcast state
 */
async function placeSetByClicking(gfp, fracX, fracY) {
  const point = await gfp.imageSVGPoint(fracX, fracY)
  await gfp.clickSVG(point.x, point.y)
  await gfp.waitForSidebandSetCount(1)
  const state = await gfp.getState()
  return state.sidebands.sidebandSets[0]
}

test.describe('Sidebands mode', () => {
  test.beforeEach(async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Sidebands')
  })

  test('sits between Harmonics and Doppler in the mode buttons', async ({ gramFramePage }) => {
    const order = await gramFramePage.page.evaluate(() =>
      Array.from(document.querySelectorAll('.gram-frame-mode-btn')).map((b) => b.getAttribute('data-mode'))
    )
    expect(order).toEqual(['pan', 'analysis', 'harmonics', 'sideband', 'doppler'])
  })

  test('a click sets the fundamental at that frequency', async ({ gramFramePage }) => {
    const set = await placeSetByClicking(gramFramePage, 0.5, 0.5)

    // The debug gram spans 0-100 Hz, so the middle of the image is ~50 Hz.
    expect(set.fundamentalFreq).toBeGreaterThan(45)
    expect(set.fundamentalFreq).toBeLessThan(55)
    expect(set.spacing).toBeCloseTo(SEED_SPACING, 5)
  })

  test('pins spread both sides of the fundamental, about eight of them', async ({ gramFramePage }) => {
    const set = await placeSetByClicking(gramFramePage, 0.5, 0.5)
    const indices = await gramFramePage.getSidebandIndices(set.id)

    expect(indices).toContain(0)
    expect(indices.filter((n) => n < 0).length).toBeGreaterThan(0)
    expect(indices.filter((n) => n > 0).length).toBeGreaterThan(0)
    // Eight steps across the axis puts 7-9 pins in view wherever it is placed.
    expect(indices.length).toBeGreaterThanOrEqual(7)
    expect(indices.length).toBeLessThanOrEqual(9)

    // Each pin's frequency is the fundamental plus n spacings — that is what
    // "equally distributed either side" means.
    const positions = await gramFramePage.page.evaluate((id) => {
      const lines = Array.from(
        document.querySelectorAll(`.gram-frame-sideband-line[data-sideband-set-id="${id}"]`)
      )
      return lines.map((line) => ({
        index: Number(line.getAttribute('data-sideband-index')),
        x: Number(line.getAttribute('x1'))
      }))
    }, set.id)

    const byIndex = new Map(positions.map((p) => [p.index, p.x]))
    const step = byIndex.get(1) - byIndex.get(0)
    expect(step).toBeGreaterThan(0)
    expect(byIndex.get(0) - byIndex.get(-1)).toBeCloseTo(step, 3)
  })

  test('an off-centre fundamental gets more pins on the roomier side', async ({ gramFramePage }) => {
    const set = await placeSetByClicking(gramFramePage, 0.25, 0.5)
    const indices = await gramFramePage.getSidebandIndices(set.id)

    const below = indices.filter((n) => n < 0).length
    const above = indices.filter((n) => n > 0).length
    expect(above).toBeGreaterThan(below)
  })

  test('every pin carries a signed label, with 0 on the fundamental', async ({ gramFramePage }) => {
    const set = await placeSetByClicking(gramFramePage, 0.5, 0.5)

    const labels = await gramFramePage.page.evaluate((id) => {
      const texts = Array.from(
        document.querySelectorAll(`.gram-frame-sideband-number[data-sideband-set-id="${id}"]`)
      )
      return texts.map((t) => ({ index: Number(t.getAttribute('data-sideband-index')), text: t.textContent }))
    }, set.id)

    expect(labels.length).toBeGreaterThan(0)
    for (const label of labels) {
      const expected = label.index > 0 ? `+${label.index}` : String(label.index)
      expect(label.text).toBe(expected)
    }
    expect(labels.some((l) => l.text === '0')).toBe(true)
  })

  test('dragging a sideband sets the spacing and leaves the fundamental alone', async ({ gramFramePage }) => {
    const setId = await gramFramePage.addSidebandSet(30, 50, 10)

    // Grab the +1 sideband (60 Hz) and pull it out to 70 Hz: the spacing
    // becomes 20 Hz, the fundamental does not move.
    const updated = await gramFramePage.page.evaluate((id) => {
      // @ts-ignore - test-only global
      const instance = window.GramFrame.__test__getInstances()[0]
      const sideband = instance.modes['sideband']
      const target = sideband.findSetTarget({ freq: 60, time: 30 })
      if (!target) return null
      sideband.onSetDragStart(target)
      sideband.onSetDragUpdate(target, { freq: 70, time: 30 }, { freq: 60, time: 30 })
      sideband.onSetDragEnd()
      return instance.state.sidebands.sidebandSets.find((s) => s.id === id)
    }, setId)

    expect(updated).not.toBeNull()
    expect(updated.spacing).toBeCloseTo(20, 5)
    expect(updated.fundamentalFreq).toBeCloseTo(50, 5)
  })

  test('dragging the fundamental moves the origin and leaves the spacing alone', async ({ gramFramePage }) => {
    const setId = await gramFramePage.addSidebandSet(30, 50, 10)

    const updated = await gramFramePage.page.evaluate((id) => {
      // @ts-ignore - test-only global
      const instance = window.GramFrame.__test__getInstances()[0]
      const sideband = instance.modes['sideband']
      const target = sideband.findSetTarget({ freq: 50, time: 30 })
      if (!target) return null
      sideband.onSetDragStart(target)
      sideband.onSetDragUpdate(target, { freq: 65, time: 30 }, { freq: 50, time: 30 })
      sideband.onSetDragEnd()
      return instance.state.sidebands.sidebandSets.find((s) => s.id === id)
    }, setId)

    expect(updated).not.toBeNull()
    expect(updated.fundamentalFreq).toBeCloseTo(65, 5)
    expect(updated.spacing).toBeCloseTo(10, 5)
  })

  test('its table is visible in every mode, alongside the harmonics one', async ({ gramFramePage }) => {
    const page = gramFramePage.page
    const sidebands = page.locator('.gram-frame-sidebands-persistent-container')
    const harmonics = page.locator('.gram-frame-harmonics-persistent-container')

    for (const mode of ['Sidebands', 'Harmonics', 'Pan', 'Cross Cursor', 'Doppler']) {
      await gramFramePage.clickMode(mode)
      await expect(sidebands, `sidebands table in ${mode} mode`).toBeVisible()
      await expect(harmonics, `harmonics table in ${mode} mode`).toBeVisible()
    }
  })

  test('adding the fourth table left the spectrogram where it was', async ({ gramFramePage }) => {
    // The control row is a constant height in every mode, so switching mode no
    // longer moves the gram up or down the page — and the height it settled on
    // is the smallest it used to take, not the largest.
    const tops = []
    for (const mode of ['Pan', 'Cross Cursor', 'Harmonics', 'Sidebands', 'Doppler']) {
      await gramFramePage.clickMode(mode)
      tops.push(await gramFramePage.page.evaluate(
        () => Math.round(document.querySelector('.gram-frame-svg').getBoundingClientRect().top)
      ))
    }
    expect(new Set(tops).size, `svg top per mode: ${tops.join(', ')}`).toBe(1)
  })

  test('the whole control row fits the component, with nothing cut off', async ({ gramFramePage }) => {
    // Measured on the laid-out row rather than on a `width: min-content` clone.
    // The redesigned row is deliberately elastic — the tables give up width
    // first, and past a point the guidance column collapses itself to its rail
    // — so its min-content width is larger than the space it needs and says
    // nothing about whether anything is actually cut off. What matters is that
    // every column ends inside the row, and that the row itself never scrolls.
    const fits = await gramFramePage.page.evaluate(() => {
      const layout = /** @type {HTMLElement} */ (document.querySelector('.gram-frame-unified-layout'))
      const row = layout.getBoundingClientRect()
      const overflow = Array.from(layout.children).map((child) => {
        const box = child.getBoundingClientRect()
        return Math.round(box.right - row.right)
      })
      return {
        worstOverflow: Math.max(...overflow),
        scrolls: layout.scrollWidth > layout.clientWidth + 1,
        columns: layout.children.length
      }
    })
    // Five columns: the mode rail, guidance, readouts, style and the tables.
    expect(fits.columns).toBe(5)
    expect(fits.worstOverflow, `a column overflows the row by ${fits.worstOverflow}px`)
      .toBeLessThanOrEqual(1)
    expect(fits.scrolls, 'the control row scrolls horizontally').toBe(false)
  })

  test('a set appears in the table and can be deleted from it', async ({ gramFramePage }) => {
    const setId = await gramFramePage.addSidebandSet(30, 40, 8)
    const row = gramFramePage.page.locator(`tr[data-sideband-id="${setId}"]`)

    await expect(row).toBeVisible()
    await expect(row.locator('.gram-frame-sideband-freq')).toHaveText('40.00')
    await expect(row.locator('.gram-frame-sideband-spacing')).toHaveText('8.00')

    await row.locator('.gram-frame-sideband-delete').click()
    await gramFramePage.waitForSidebandSetCount(0)
    await expect(gramFramePage.page.locator('.gram-frame-sideband-line')).toHaveCount(0)
  })

  test('its pins stay drawn after switching to another mode', async ({ gramFramePage }) => {
    const setId = await gramFramePage.addSidebandSet(30, 50, 10)
    expect((await gramFramePage.getSidebandIndices(setId)).length).toBeGreaterThan(0)

    await gramFramePage.clickMode('Doppler')
    expect((await gramFramePage.getSidebandIndices(setId)).length).toBeGreaterThan(0)
  })

  test('arrow keys nudge the spacing of the selected set', async ({ gramFramePage }) => {
    const setId = await gramFramePage.addSidebandSet(30, 50, 10)
    // Creation selects the set, which also gives the instance keyboard focus.
    const before = await gramFramePage.getState()
    expect(before.selection.selectedType).toBe('sidebandSet')
    expect(before.selection.selectedId).toBe(setId)

    await gramFramePage.page.keyboard.press('ArrowRight')
    await gramFramePage.waitForState(
      (state) => state.sidebands.sidebandSets[0].spacing > 10,
      { message: 'the spacing to grow' }
    )
  })

  test('a set survives a reload on a trainer page', async ({ page }) => {
    await page.goto('/debug-trainer.html')
    await page.locator('.gram-frame-container').first().waitFor()

    const { GramFramePage } = await import('./helpers/gram-frame-page.js')
    const gfp = new GramFramePage(page)
    await gfp.clearStorage()
    await page.reload()
    await page.locator('.gram-frame-container').first().waitFor()

    await gfp.clickMode('Sidebands')
    const setId = await gfp.addSidebandSet(25, 40, 7.5)
    // The save runs off a state notification, so wait for the write itself.
    await page.waitForFunction(() => {
      const raw = localStorage.getItem(`gramframe::${window.location.pathname}`)
      return !!raw && raw.includes('sidebandSets')
    })

    await page.reload()
    await page.locator('.gram-frame-container').first().waitFor()
    await gfp.waitForSidebandSetCount(1)

    const state = await gfp.getState()
    const restored = state.sidebands.sidebandSets[0]
    expect(restored.id).toBe(setId)
    expect(restored.fundamentalFreq).toBeCloseTo(40, 5)
    expect(restored.spacing).toBeCloseTo(7.5, 5)
    // And it is drawn, not merely stored.
    expect((await gfp.getSidebandIndices(setId)).length).toBeGreaterThan(0)
  })
})
