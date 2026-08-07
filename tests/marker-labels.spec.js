import { test, expect } from './helpers/fixtures.js'
import { GramFramePage } from './helpers/gram-frame-page.js'

/**
 * @fileoverview E2E tests for feature 231 — cross-cursor labels.
 *
 * Covers the whole loop an analyst walks: place a marker, open the label
 * dialog from its row's Label button, enter text, see it on the gram and
 * abbreviated in the table's Label column, edit it, and clear it. Also covers
 * the two placement rules (upper-right quadrant for a cross, centred above a
 * shaped symbol), the halo styling, and persistence across a reload.
 *
 * The pure rules behind abbreviation and placement are unit-tested in
 * tests/unit/marker-label.test.js; what is asserted here is the wiring.
 *
 * Waiting note: the dialog's Save handler runs synchronously, so the helper
 * that drives it waits on the label appearing in broadcast state rather than on
 * a fixed delay.
 */

const LABEL_BUTTON = '.gram-frame-marker-label-btn'
const LABEL_INPUT = '.gram-frame-marker-label-input'
const MODAL_OVERLAY = '.gram-frame-marker-label-modal'

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

  test('every marker row offers a Label button in the top-right of its Label cell', async ({ gramFramePage }) => {
    const markerId = await placeMarker(gramFramePage, 220, 160)

    const row = gramFramePage.page.locator(`tr[data-marker-id="${markerId}"]`)
    await expect(row.locator(LABEL_BUTTON)).toBeVisible()
    await expect(row.locator('.gram-frame-marker-delete-btn')).toBeVisible()

    // "In the Label cell's top-right corner" is a layout claim, so measure it
    // rather than assume the markup. The button sits out of flow there so it
    // costs the row no height — it used to stack above Delete, which made every
    // row tall enough for two controls.
    const cellBox = await row.locator('.gram-frame-marker-label-cell').boundingBox()
    const labelBox = await row.locator(LABEL_BUTTON).boundingBox()
    expect(cellBox).not.toBeNull()
    expect(labelBox).not.toBeNull()

    // Right-aligned within the cell, and in its top half.
    expect(cellBox.x + cellBox.width - (labelBox.x + labelBox.width)).toBeLessThanOrEqual(3)
    expect(labelBox.y).toBeLessThan(cellBox.y + cellBox.height / 2)
  })

  test('the label button does not make the row taller than the controls beside it', async ({ gramFramePage }) => {
    // Enough markers to overflow the fixed-height table body. Below that the
    // rows stretch to fill it, and their height says nothing about what the
    // content needs — which is the thing under test.
    let markerId = null
    for (let i = 0; i < 6; i++) {
      markerId = await placeMarker(gramFramePage, 150 + i * 20, 120 + i * 15)
    }

    const row = gramFramePage.page.locator(`tr[data-marker-id="${markerId}"]`)
    const rowBox = await row.boundingBox()
    const labelBox = await row.locator(LABEL_BUTTON).boundingBox()
    const deleteBox = await row.locator('.gram-frame-marker-delete-btn').boundingBox()

    // The row only ever has to be as tall as ONE control plus the cell padding.
    // Were the label button back in the flow above Delete, the row would need
    // room for both and this would fail.
    expect(rowBox.height).toBeLessThan(labelBox.height + deleteBox.height)
  })

  // ──────────────────────────────────────────────────────────
  // Adding, editing and clearing a label through the dialog
  // ──────────────────────────────────────────────────────────

  test('the Label button opens a dialog that adds a label to the marker', async ({ gramFramePage }) => {
    const markerId = await placeMarker(gramFramePage, 220, 160)

    await gramFramePage.setMarkerLabel(markerId, 'Contact A')

    // Dialog closed itself
    await expect(gramFramePage.page.locator(MODAL_OVERLAY)).toHaveCount(0)

    const overlay = await gramFramePage.getMarkerLabelOverlay(markerId)
    expect(overlay).not.toBeNull()
    expect(overlay.text).toBe('Contact A')
  })

  test('the dialog opens pre-filled when the marker already has a label', async ({ gramFramePage }) => {
    const markerId = await placeMarker(gramFramePage, 220, 160)
    await gramFramePage.setMarkerLabel(markerId, 'Contact A')

    const input = await gramFramePage.openMarkerLabelDialog(markerId)
    await expect(input).toHaveValue('Contact A')
  })

  test('editing a label replaces it on the gram and in the table', async ({ gramFramePage }) => {
    const markerId = await placeMarker(gramFramePage, 220, 160)
    await gramFramePage.setMarkerLabel(markerId, 'Contact A')
    await gramFramePage.setMarkerLabel(markerId, 'Sub 7')

    const overlay = await gramFramePage.getMarkerLabelOverlay(markerId)
    expect(overlay.text).toBe('Sub 7')
    expect(await gramFramePage.getMarkerLabelCell(markerId)).toBe('Sub 7')
  })

  test('clearing the field and saving removes the label entirely', async ({ gramFramePage }) => {
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

    const input = await gramFramePage.openMarkerLabelDialog(markerId)
    await input.fill('    ')
    await gramFramePage.page.locator('.gram-frame-modal-save').click()

    await expect(gramFramePage.page.locator(MODAL_OVERLAY)).toHaveCount(0)
    const state = await gramFramePage.getState()
    expect(state.analysis.markers[0]).not.toHaveProperty('label')
  })

  test('Cancel and Escape both leave the existing label untouched', async ({ gramFramePage }) => {
    const markerId = await placeMarker(gramFramePage, 220, 160)
    await gramFramePage.setMarkerLabel(markerId, 'Contact A')

    // Cancel
    let input = await gramFramePage.openMarkerLabelDialog(markerId)
    await input.fill('Discarded')
    await gramFramePage.page.locator('.gram-frame-modal-cancel').click()
    await expect(gramFramePage.page.locator(MODAL_OVERLAY)).toHaveCount(0)
    expect((await gramFramePage.getState()).analysis.markers[0].label).toBe('Contact A')

    // Escape
    input = await gramFramePage.openMarkerLabelDialog(markerId)
    await input.fill('Also discarded')
    await input.press('Escape')
    await expect(gramFramePage.page.locator(MODAL_OVERLAY)).toHaveCount(0)
    expect((await gramFramePage.getState()).analysis.markers[0].label).toBe('Contact A')
  })

  test('Enter in the input saves the label', async ({ gramFramePage }) => {
    const markerId = await placeMarker(gramFramePage, 220, 160)

    const input = await gramFramePage.openMarkerLabelDialog(markerId)
    await input.fill('Contact B')
    await input.press('Enter')

    await gramFramePage.waitForState(
      (state) => state.analysis.markers[0].label === 'Contact B',
      { message: 'the label entered with Enter' }
    )
    await expect(gramFramePage.page.locator(MODAL_OVERLAY)).toHaveCount(0)
  })

  test('clicking the Label button does not toggle the row selection', async ({ gramFramePage }) => {
    const markerId = await placeMarker(gramFramePage, 220, 160)
    // A newly placed marker is auto-selected.
    await gramFramePage.waitForSelectedRow('markers', markerId)

    await gramFramePage.page
      .locator(`tr[data-marker-id="${markerId}"] ${LABEL_BUTTON}`)
      .click()
    await expect(gramFramePage.page.locator(LABEL_INPUT)).toBeVisible()

    const state = await gramFramePage.getState()
    expect(state.selection.selectedId).toBe(markerId)
    await gramFramePage.page.locator('.gram-frame-modal-cancel').click()
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

  test('the label is drawn black inside a white halo, painted behind the glyphs', async ({ gramFramePage }) => {
    const markerId = await placeMarker(gramFramePage, 220, 160)
    await gramFramePage.setMarkerLabel(markerId, 'Halo')

    const overlay = await gramFramePage.getMarkerLabelOverlay(markerId)
    expect(overlay.fill).toBe('#000')
    expect(overlay.stroke).toBe('#fff')
    expect(overlay.paintOrder).toBe('stroke fill')
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

  test('the dialog caps how long a label can be', async ({ gramFramePage }) => {
    const markerId = await placeMarker(gramFramePage, 220, 160)

    const input = await gramFramePage.openMarkerLabelDialog(markerId)
    await expect(input).toHaveAttribute('maxlength', '32')
    await input.fill('x'.repeat(60))
    await expect(input).toHaveValue('x'.repeat(32))
    await gramFramePage.page.locator('.gram-frame-modal-cancel').click()
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

    await page.locator('.gram-frame-mode-btn:text("Cross Cursor")').click()
    await gfp.svg.click({ position: { x: 200, y: 150 } })

    const markerRow = page.locator('tr[data-marker-id]').first()
    await expect(markerRow).toBeVisible()
    const markerId = await markerRow.getAttribute('data-marker-id')

    await markerRow.locator(LABEL_BUTTON).click()
    await page.locator(LABEL_INPUT).fill('Saved label')
    await page.locator('.gram-frame-modal-save').click()
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
    await page.locator('.gram-frame-mode-btn:text("Cross Cursor")').click()
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
