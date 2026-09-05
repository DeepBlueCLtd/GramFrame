import { test, expect } from './helpers/fixtures.js'

/**
 * @fileoverview One commit cadence, one spacing clamp (R9-13 / M5, issue #264).
 *
 * The August review predicted that a copy-pasted mutation cadence would drift.
 * By September it had: a harmonic set dragged clamped at
 * `MIN_PIN_SPACING = 0.1`, but the same set nudged with the arrow keys clamped
 * at 1.0, because HarmonicsMode overrode `nudgeFreqUpdates` for no other reason
 * than to raise its own floor.
 *
 * These tests hold the two halves: mouse and keyboard reach the same floor,
 * harmonics and sidebands agree, and every annotation mutation still bumps the
 * revision the storage listener watches — the step that goes missing silently
 * when four lines are repeated by hand.
 */

const MIN_PIN_SPACING = 0.1

/**
 * Nudge the selected feature with repeated arrow presses.
 * @param {import('@playwright/test').Page} page
 * @param {string} key - Arrow key name
 * @param {number} times - How many presses
 * @returns {Promise<void>}
 */
async function pressArrow(page, key, times) {
  for (let i = 0; i < times; i++) {
    await page.keyboard.press(key)
  }
}

/**
 * Select a feature's table row and leave its instance focused, which is what
 * routes arrow keys to it.
 *
 * Clicking a row toggles selection, and a newly created set is already
 * selected — so a single click would deselect it. Clicking until state reports
 * it selected handles both cases, and every click focuses the instance.
 * @param {import('./helpers/gram-frame-page.js').GramFramePage} gfp
 * @param {string} rowAttribute - `data-harmonic-id` or `data-sideband-id`
 * @param {string} id - Feature id
 * @returns {Promise<void>}
 */
async function selectAndFocusRow(gfp, rowAttribute, id) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const selection = (await gfp.getState()).selection
    if (selection && selection.selectedId === id) {
      // Already selected; one click off and one back on leaves it selected and
      // the instance focused.
      if (attempt === 0) {
        await gfp.page.locator(`tr[${rowAttribute}="${id}"]`).click()
      }
    }
    await gfp.page.locator(`tr[${rowAttribute}="${id}"]`).click()
    const after = (await gfp.getState()).selection
    if (after && after.selectedId === id) {
      return
    }
  }
  throw new Error(`could not select ${id}`)
}

test.describe('Keyboard and mouse reach the same spacing floor (R9-13)', () => {
  test('a harmonic set nudged down stops at MIN_PIN_SPACING, not at 1 Hz', async ({ gramFramePage }) => {
    const page = gramFramePage.page
    await gramFramePage.clickMode('Harmonics')

    const setId = await gramFramePage.addHarmonicSet(30, 3)
    await gramFramePage.waitForHarmonicSetCount(1)

    // Select the set, then walk the spacing down well past the old 1 Hz floor.
    await selectAndFocusRow(gramFramePage, 'data-harmonic-id', setId)
    await pressArrow(page, 'ArrowLeft', 40)

    const state = await gramFramePage.getState()
    const set = state.harmonics.harmonicSets.find((/** @type {any} */ s) => s.id === setId)

    // Was 1.0: the arrow keys refused to go where the mouse could.
    expect(set.spacing).toBeLessThan(1.0)
    expect(set.spacing).toBeGreaterThanOrEqual(MIN_PIN_SPACING)
  })

  test('the floor holds: nudging further never goes below it or non-finite', async ({ gramFramePage }) => {
    const page = gramFramePage.page
    await gramFramePage.clickMode('Harmonics')
    const setId = await gramFramePage.addHarmonicSet(30, MIN_PIN_SPACING)
    await gramFramePage.waitForHarmonicSetCount(1)

    await selectAndFocusRow(gramFramePage, 'data-harmonic-id', setId)
    await pressArrow(page, 'ArrowLeft', 20)

    const state = await gramFramePage.getState()
    const set = state.harmonics.harmonicSets.find((/** @type {any} */ s) => s.id === setId)
    expect(set.spacing).toBeGreaterThanOrEqual(MIN_PIN_SPACING)
    expect(Number.isFinite(set.spacing)).toBe(true)
  })

  test('harmonics and sidebands agree on the floor', async ({ gramFramePage }) => {
    const page = gramFramePage.page

    await gramFramePage.clickMode('Harmonics')
    const harmonicId = await gramFramePage.addHarmonicSet(30, 3)
    await gramFramePage.waitForHarmonicSetCount(1)
    await selectAndFocusRow(gramFramePage, 'data-harmonic-id', harmonicId)
    await pressArrow(page, 'ArrowLeft', 40)
    const harmonicSpacing = (await gramFramePage.getState())
      .harmonics.harmonicSets.find((/** @type {any} */ s) => s.id === harmonicId).spacing

    await gramFramePage.clickMode('Sidebands')
    const sidebandId = await gramFramePage.addSidebandSet(30, 50, 3)
    await gramFramePage.waitForSidebandSetCount(1)
    await selectAndFocusRow(gramFramePage, 'data-sideband-id', sidebandId)
    await pressArrow(page, 'ArrowLeft', 40)
    const sidebandSpacing = (await gramFramePage.getState())
      .sidebands.sidebandSets.find((/** @type {any} */ s) => s.id === sidebandId).spacing

    // Two pin-set modes, one shared floor: the override that made them differ
    // is gone.
    expect(harmonicSpacing).toBeCloseTo(sidebandSpacing, 6)
  })
})

test.describe('Every annotation mutation is committed the same way (R9-13)', () => {
  /**
   * Read the revision counter the storage listener watches.
   * @param {import('./helpers/gram-frame-page.js').GramFramePage} gfp
   * @returns {Promise<number>} annotationRevision
   */
  const revision = async (gfp) => (await gfp.getState()).annotationRevision || 0

  test('creating, restyling and deleting each advance the revision', async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Cross Cursor')

    const before = await revision(gramFramePage)

    const markerId = await gramFramePage.addMarker(30, 50)
    const afterCreate = await revision(gramFramePage)
    expect(afterCreate, 'creating a marker must advance the revision').toBeGreaterThan(before)

    await gramFramePage.setMarkerLabel(markerId, 'Contact A')
    const afterLabel = await revision(gramFramePage)
    expect(afterLabel, 'labelling a marker must advance the revision').toBeGreaterThan(afterCreate)

    await gramFramePage.page.evaluate((id) => {
      const instance = window.GramFrame.__test__getInstances()[0]
      instance.modes['analysis'].removeMarker(id)
    }, markerId)
    await gramFramePage.waitForMarkerCount(0)
    const afterDelete = await revision(gramFramePage)
    expect(afterDelete, 'deleting a marker must advance the revision').toBeGreaterThan(afterLabel)
  })

  test('a pin set advances it on create, update and remove', async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Harmonics')

    const before = await revision(gramFramePage)
    const setId = await gramFramePage.addHarmonicSet(30, 12)
    await gramFramePage.waitForHarmonicSetCount(1)
    const afterCreate = await revision(gramFramePage)
    expect(afterCreate).toBeGreaterThan(before)

    await gramFramePage.page.evaluate((id) => {
      const instance = window.GramFrame.__test__getInstances()[0]
      instance.modes['harmonics'].updateSet(id, { spacing: 15 })
    }, setId)
    const afterUpdate = await revision(gramFramePage)
    expect(afterUpdate).toBeGreaterThan(afterCreate)

    await gramFramePage.page.evaluate((id) => {
      const instance = window.GramFrame.__test__getInstances()[0]
      instance.modes['harmonics'].removeSet(id)
    }, setId)
    await gramFramePage.waitForHarmonicSetCount(0)
    expect(await revision(gramFramePage)).toBeGreaterThan(afterUpdate)
  })

  test('the change reaches storage, not just state', async ({ page }) => {
    // The revision exists so the storage listener notices; assert the end of
    // that chain rather than only its first link.
    const gfp = new (await import('./helpers/gram-frame-page.js')).GramFramePage(page)
    await page.goto('/tests/fixtures/trainer-page.html')
    await page.locator('.gram-frame-container').waitFor()
    await page.evaluate(() => localStorage.clear())

    await gfp.addMarker(30, 50)

    await expect.poll(async () => {
      return page.evaluate(() => {
        const raw = localStorage.getItem('gramframe::' + window.location.pathname)
        return raw ? JSON.parse(raw).analysis.markers.length : 0
      })
    }, { message: 'the new marker to be saved' }).toBe(1)
  })
})
