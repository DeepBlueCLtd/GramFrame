import { test, expect } from './helpers/fixtures.js'
import { GramFramePage } from './helpers/gram-frame-page.js'

/**
 * @fileoverview E2E tests for feature 231 — cross-cursor labels.
 *
 * Covers the whole loop an analyst walks: place a marker, select its row, type
 * into the style panel's Label field, see the text on the gram and abbreviated
 * in the table's Label column, edit it, and clear it. Also covers the two
 * placement rules (upper-right quadrant for a cross, centred above a shaped
 * symbol), the halo styling, and persistence across a reload.
 *
 * The label used to be entered in a modal dialog opened from a button in the
 * row. The control-row redesign edits it in place instead, in the style panel
 * beside the same marker's colour and symbol — one place where everything about
 * a selected feature is changed.
 *
 * The pure rules behind abbreviation and placement are unit-tested in
 * tests/unit/marker-label.test.js; what is asserted here is the wiring.
 *
 * Waiting note: the field writes through on `input`, so the helper that drives
 * it waits on the label appearing in broadcast state rather than on a delay.
 */

const LABEL_INPUT = '.gram-frame-style-label-input'

/**
 * Place a marker in Cross Cursor mode and return its id.
 * @param {import('./helpers/gram-frame-page.js').GramFramePage} gramFramePage
 * @param {number} x - Click X within the SVG
 * @param {number} y - Click Y within the SVG
 * @returns {Promise<string>} The new marker's id
 */
async function placeMarker(gramFramePage, x, y) {
  const before = (await gramFramePage.getState()).analysis.markers.length
  await gramFramePage.clickSpectrogram(x, y)
  await gramFramePage.waitForMarkerCount(before + 1)
  const state = await gramFramePage.getState()
  return state.analysis.markers[before].id
}

test.describe('Marker labels', () => {
  test.beforeEach(async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Cross Cursor')
  })

  // ──────────────────────────────────────────────────────────
  // Labels are opt-in
  // ──────────────────────────────────────────────────────────

  test('a new marker carries no label, draws none, and shows an empty Label cell', async ({ gramFramePage }) => {
    const markerId = await placeMarker(gramFramePage, 220, 160)

    const state = await gramFramePage.getState()
    expect(state.analysis.markers[0]).not.toHaveProperty('label')

    expect(await gramFramePage.getMarkerLabelOverlay(markerId)).toBeNull()
    expect(await gramFramePage.getMarkerLabelCell(markerId)).toBe('')
  })

  test('the markers table has a Label column', async ({ gramFramePage }) => {
    const headers = await gramFramePage.page
      .locator('.gram-frame-markers-panel th, .gram-frame-table th')
      .allTextContents()
    expect(headers).toContain('Label')
  })

  test('a marker row shows its label and a delete control, and nothing else', async ({ gramFramePage }) => {
    const markerId = await placeMarker(gramFramePage, 220, 160)

    const row = gramFramePage.page.locator(`tr[data-marker-id="${markerId}"]`)
    await expect(row.locator('.gram-frame-marker-delete-btn')).toBeVisible()
    // The per-row label button is gone: labels are edited in the style panel,
    // and a second control in the row made every row tall enough for two.
    await expect(row.locator('.gram-frame-marker-label-btn')).toHaveCount(0)
  })

  // ──────────────────────────────────────────────────────────
  // Adding, editing and clearing a label in the style panel
  // ──────────────────────────────────────────────────────────

  test('selecting a marker offers a Label field that writes to it', async ({ gramFramePage }) => {
    const markerId = await placeMarker(gramFramePage, 220, 160)

    await gramFramePage.setMarkerLabel(markerId, 'Contact A')

    const overlay = await gramFramePage.getMarkerLabelOverlay(markerId)
    expect(overlay).not.toBeNull()
    expect(overlay.text).toBe('Contact A')
  })

  test('the field carries the label of whichever marker is selected', async ({ gramFramePage }) => {
    const markerId = await placeMarker(gramFramePage, 220, 160)
    await gramFramePage.setMarkerLabel(markerId, 'Contact A')

    // Deselect and select again: the field is filled from the selection, not
    // from what was last typed into it.
    const row = gramFramePage.page.locator(`tr[data-marker-id="${markerId}"]`)
    await row.click()
    await expect(gramFramePage.page.locator(LABEL_INPUT)).toBeHidden()
    await row.click()
    await expect(gramFramePage.page.locator(LABEL_INPUT)).toHaveValue('Contact A')
  })

  test('the Label field is offered only while a marker is selected', async ({ gramFramePage }) => {
    const markerId = await placeMarker(gramFramePage, 220, 160)
    // A newly placed marker is auto-selected, so the field is there.
    await expect(gramFramePage.page.locator(LABEL_INPUT)).toBeVisible()

    // Deselecting returns the panel to its "New features" face, which has no
    // label to edit.
    await gramFramePage.page.locator(`tr[data-marker-id="${markerId}"]`).click()
    await expect(gramFramePage.page.locator(LABEL_INPUT)).toBeHidden()
  })

  test('editing a label replaces it on the gram and in the table', async ({ gramFramePage }) => {
    const markerId = await placeMarker(gramFramePage, 220, 160)
    await gramFramePage.setMarkerLabel(markerId, 'Contact A')
    await gramFramePage.setMarkerLabel(markerId, 'Sub 7')

    const overlay = await gramFramePage.getMarkerLabelOverlay(markerId)
    expect(overlay.text).toBe('Sub 7')
    expect(await gramFramePage.getMarkerLabelCell(markerId)).toBe('Sub 7')
  })

  test('clearing the field removes the label entirely', async ({ gramFramePage }) => {
    const markerId = await placeMarker(gramFramePage, 220, 160)
    await gramFramePage.setMarkerLabel(markerId, 'Contact A')

    await gramFramePage.setMarkerLabel(markerId, '')

    const state = await gramFramePage.getState()
    // Absent, not empty: "no label" has one representation.
    expect(state.analysis.markers[0]).not.toHaveProperty('label')
    expect(await gramFramePage.getMarkerLabelOverlay(markerId)).toBeNull()
    expect(await gramFramePage.getMarkerLabelCell(markerId)).toBe('')
  })

  test('a whitespace-only entry is treated as no label', async ({ gramFramePage }) => {
    const markerId = await placeMarker(gramFramePage, 220, 160)

    const input = await gramFramePage.openMarkerLabelField(markerId)
    await input.fill('    ')

    await gramFramePage.waitForState(
      (state) => state.analysis.markers[0].label === undefined,
      { message: 'whitespace to be treated as no label' }
    )
    const state = await gramFramePage.getState()
    expect(state.analysis.markers[0]).not.toHaveProperty('label')
  })

  test('typing in the field leaves the row selected', async ({ gramFramePage }) => {
    const markerId = await placeMarker(gramFramePage, 220, 160)
    // A newly placed marker is auto-selected.
    await gramFramePage.waitForSelectedRow('markers', markerId)

    await gramFramePage.setMarkerLabel(markerId, 'Contact B')

    const state = await gramFramePage.getState()
    expect(state.selection.selectedId).toBe(markerId)
    await expect(gramFramePage.page.locator(LABEL_INPUT)).toHaveValue('Contact B')
  })

  test('the label applies to the marker whose row was clicked', async ({ gramFramePage }) => {
    const first = await placeMarker(gramFramePage, 180, 120)
    const second = await placeMarker(gramFramePage, 300, 200)

    await gramFramePage.setMarkerLabel(second, 'Second')

    expect(await gramFramePage.getMarkerLabelCell(second)).toBe('Sec..')
    expect(await gramFramePage.getMarkerLabelCell(first)).toBe('')
    expect(await gramFramePage.getMarkerLabelOverlay(first)).toBeNull()
  })

  // ──────────────────────────────────────────────────────────
  // Table abbreviation
  // ──────────────────────────────────────────────────────────

  test('the Label column shows short labels whole and abbreviates longer ones', async ({ gramFramePage }) => {
    const markerId = await placeMarker(gramFramePage, 220, 160)

    await gramFramePage.setMarkerLabel(markerId, 'ABCDE') // exactly five
    expect(await gramFramePage.getMarkerLabelCell(markerId)).toBe('ABCDE')

    await gramFramePage.setMarkerLabel(markerId, 'ABCDEF') // six
    expect(await gramFramePage.getMarkerLabelCell(markerId)).toBe('ABC..')

    // The gram still carries the full text — abbreviation is the table's alone.
    const overlay = await gramFramePage.getMarkerLabelOverlay(markerId)
    expect(overlay.text).toBe('ABCDEF')
  })

  // ──────────────────────────────────────────────────────────
  // On-gram placement and styling
  // ──────────────────────────────────────────────────────────

  test('a cross marker draws its label in the upper-right quadrant', async ({ gramFramePage }) => {
    const markerId = await placeMarker(gramFramePage, 220, 160)
    await gramFramePage.setMarkerLabel(markerId, 'UR')

    const state = await gramFramePage.getState()
    expect(state.analysis.markers[0].symbol).toBe('cross')

    const overlay = await gramFramePage.getMarkerLabelOverlay(markerId)
    const centre = await gramFramePage.page.evaluate((id) => {
      const dot = document.querySelector(
        `.gram-frame-analysis-marker[data-marker-id="${id}"] circle`
      )
      return dot
        ? { x: parseFloat(dot.getAttribute('cx')), y: parseFloat(dot.getAttribute('cy')) }
        : null
    }, markerId)

    expect(centre).not.toBeNull()
    expect(overlay.x).toBeGreaterThan(centre.x)
    expect(overlay.y).toBeLessThan(centre.y)
    expect(overlay.textAnchor).toBe('start')
  })

  test('a shaped marker draws its label centred above the symbol', async ({ gramFramePage }) => {
    await gramFramePage.selectSymbol('square')
    const markerId = await placeMarker(gramFramePage, 220, 160)
    await gramFramePage.setMarkerLabel(markerId, 'Above')

    const symbol = await gramFramePage.page.evaluate((id) => {
      const el = document.querySelector(`.gram-frame-marker-symbol[data-marker-id="${id}"]`)
      if (!el) return null
      const box = /** @type {SVGGraphicsElement} */ (el).getBBox()
      return { centreX: box.x + box.width / 2, top: box.y }
    }, markerId)

    const overlay = await gramFramePage.getMarkerLabelOverlay(markerId)
    expect(symbol).not.toBeNull()
    expect(overlay.textAnchor).toBe('middle')
    expect(overlay.x).toBeCloseTo(symbol.centreX, 1)
    expect(overlay.y).toBeLessThan(symbol.top)
  })

  // Issue #242: an up-pointing triangle is aimed at the gram above it, so its
  // label goes underneath rather than over the data being marked.
  test('an up-triangle marker draws its label centred BELOW the symbol', async ({ gramFramePage }) => {
    await gramFramePage.selectSymbol('triangle')
    const markerId = await placeMarker(gramFramePage, 220, 160)
    await gramFramePage.setMarkerLabel(markerId, 'Below')

    const symbol = await gramFramePage.page.evaluate((id) => {
      const el = document.querySelector(`.gram-frame-marker-symbol[data-marker-id="${id}"]`)
      if (!el) return null
      const box = /** @type {SVGGraphicsElement} */ (el).getBBox()
      return { centreX: box.x + box.width / 2, bottom: box.y + box.height }
    }, markerId)

    const overlay = await gramFramePage.getMarkerLabelOverlay(markerId)
    expect(symbol).not.toBeNull()
    expect(overlay.textAnchor).toBe('middle')
    expect(overlay.x).toBeCloseTo(symbol.centreX, 1)
    // The baseline clears the symbol's underside, so the glyphs sit below it.
    expect(overlay.y).toBeGreaterThan(symbol.bottom)
  })

  // Issue #243: the label used to be haloed (a white outline behind the glyphs),
  // which let the gram show through between and inside the characters. It now
  // sits on an opaque white plate, as the legacy viewer's labels do.
  test('the label is drawn black on a white rounded plate', async ({ gramFramePage }) => {
    const markerId = await placeMarker(gramFramePage, 220, 160)
    await gramFramePage.setMarkerLabel(markerId, 'Plate')

    const overlay = await gramFramePage.getMarkerLabelOverlay(markerId)
    expect(overlay.fill).toBe('#000')
    // No halo stroke left on the glyphs: the plate is the contrast now
    expect(overlay.stroke).toBe('')
    expect(overlay.plate).not.toBeNull()
    expect(overlay.plate.fill).toBe('#fff')
    expect(overlay.plate.radius).toBeGreaterThan(0)
  })

  test('the plate covers the label it carries, with room around it', async ({ gramFramePage }) => {
    const markerId = await placeMarker(gramFramePage, 220, 160)
    await gramFramePage.setMarkerLabel(markerId, 'Contact Alpha')

    const { plate, textBox } = await gramFramePage.getMarkerLabelOverlay(markerId)
    expect(plate).not.toBeNull()
    expect(plate.box.left).toBeLessThanOrEqual(textBox.left)
    expect(plate.box.right).toBeGreaterThanOrEqual(textBox.right)
    expect(plate.box.top).toBeLessThanOrEqual(textBox.top)
    expect(plate.box.bottom).toBeGreaterThanOrEqual(textBox.bottom)
    // Wider than the text, so the contrast reaches past the characters
    expect(plate.box.right - plate.box.left).toBeGreaterThan(textBox.right - textBox.left)
  })

  test('the plate stays clear of the crosshair it annotates', async ({ gramFramePage }) => {
    const markerId = await placeMarker(gramFramePage, 220, 160)
    await gramFramePage.setMarkerLabel(markerId, 'Clear')

    const { plate } = await gramFramePage.getMarkerLabelOverlay(markerId)
    const centre = await gramFramePage.page.evaluate((id) => {
      const dot = document.querySelector(
        `.gram-frame-analysis-marker[data-marker-id="${id}"] circle`
      )
      const r = dot.getBoundingClientRect()
      return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2, right: r.right, top: r.top }
    }, markerId)

    // Upper-right quadrant, with the PLATE — not just the text — outside the
    // crosshair's centre dot, so the white rectangle never covers the point the
    // marker is on.
    expect(plate.box.left).toBeGreaterThanOrEqual(centre.right)
    expect(plate.box.bottom).toBeLessThanOrEqual(centre.top)
  })

  test('the label moves with the marker when it is dragged', async ({ gramFramePage }) => {
    const markerId = await placeMarker(gramFramePage, 220, 160)
    await gramFramePage.setMarkerLabel(markerId, 'Moves')

    const before = await gramFramePage.getMarkerLabelOverlay(markerId)

    const svgBox = await gramFramePage.svg.boundingBox()
    await gramFramePage.page.mouse.move(svgBox.x + 220, svgBox.y + 160)
    await gramFramePage.page.mouse.down()
    await gramFramePage.page.mouse.move(svgBox.x + 300, svgBox.y + 200, { steps: 5 })
    await gramFramePage.page.mouse.up()

    await expect
      .poll(async () => (await gramFramePage.getMarkerLabelOverlay(markerId)).x)
      .toBeGreaterThan(before.x)

    const after = await gramFramePage.getMarkerLabelOverlay(markerId)
    expect(after.text).toBe('Moves')
    expect(after.y).toBeGreaterThan(before.y) // moved down the gram
  })

  test('a label survives a switch to another mode and back', async ({ gramFramePage }) => {
    const markerId = await placeMarker(gramFramePage, 220, 160)
    await gramFramePage.setMarkerLabel(markerId, 'Persist')

    await gramFramePage.clickMode('Harmonics')
    // Markers stay visible across modes, and so do their labels.
    expect((await gramFramePage.getMarkerLabelOverlay(markerId)).text).toBe('Persist')

    await gramFramePage.clickMode('Cross Cursor')
    expect((await gramFramePage.getMarkerLabelOverlay(markerId)).text).toBe('Persist')
    expect(await gramFramePage.getMarkerLabelCell(markerId)).toBe('Per..')
  })

  test('the field caps how long a label can be', async ({ gramFramePage }) => {
    const markerId = await placeMarker(gramFramePage, 220, 160)

    const input = await gramFramePage.openMarkerLabelField(markerId)
    await expect(input).toHaveAttribute('maxlength', '32')
    await input.fill('x'.repeat(60))
    await expect(input).toHaveValue('x'.repeat(32))
  })
})

// ──────────────────────────────────────────────────────────────
// Persistence — a label is saved with its marker
// ──────────────────────────────────────────────────────────────

test.describe('Marker labels persist', () => {
  test('a label survives a page reload on a trainer page', async ({ page }) => {
    await page.goto('/tests/fixtures/trainer-page.html')
    await page.evaluate(() => localStorage.clear())

    const gfp = new GramFramePage(page)
    await page.goto('/tests/fixtures/trainer-page.html')
    await page.locator('.gram-frame-container').waitFor({ timeout: 10000 })

    await page.locator('.gram-frame-mode-btn[title="Cross Cursor" i]').click()
    await gfp.svg.click({ position: { x: 200, y: 150 } })

    const markerRow = page.locator('tr[data-marker-id]').first()
    await expect(markerRow).toBeVisible()
    const markerId = await markerRow.getAttribute('data-marker-id')

    // The marker arrives selected, so the style panel's Label field is already
    // pointed at it.
    await expect(page.locator(LABEL_INPUT)).toBeVisible()
    await page.locator(LABEL_INPUT).fill('Saved label')
    await expect(page.locator(`tr[data-marker-id="${markerId}"] .gram-frame-marker-label-cell`))
      .toHaveText('Sav..')

    await page.reload()
    await page.locator('.gram-frame-container').waitFor({ timeout: 10000 })

    const restored = await page.evaluate(() => {
      // @ts-ignore test-only global
      const instances = window.GramFrame.__test__getInstances()
      return instances[0].state.analysis.markers.map((/** @type {any} */ m) => m.label)
    })
    expect(restored).toEqual(['Saved label'])

    await expect(page.locator('.gram-frame-marker-label')).toHaveText('Saved label')
  })

  test('a marker with no label persists without one', async ({ page }) => {
    await page.goto('/tests/fixtures/trainer-page.html')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/tests/fixtures/trainer-page.html')
    await page.locator('.gram-frame-container').waitFor({ timeout: 10000 })

    const gfp = new GramFramePage(page)
    await page.locator('.gram-frame-mode-btn[title="Cross Cursor" i]').click()
    await gfp.svg.click({ position: { x: 200, y: 150 } })
    await expect(page.locator('tr[data-marker-id]')).toHaveCount(1)

    await page.reload()
    await page.locator('.gram-frame-container').waitFor({ timeout: 10000 })

    const hasLabel = await page.evaluate(() => {
      // @ts-ignore test-only global
      const instances = window.GramFrame.__test__getInstances()
      return instances[0].state.analysis.markers.map(
        (/** @type {any} */ m) => Object.prototype.hasOwnProperty.call(m, 'label')
      )
    })
    expect(hasLabel).toEqual([false])
  })
})
