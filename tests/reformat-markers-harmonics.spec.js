import { test, expect } from './helpers/fixtures.js'

/**
 * @fileoverview E2E tests for feature 161 — "Reformat existing markers &
 * harmonics, with a cross (symbol-less) style".
 *
 * Covers:
 *  - US2: the `cross` symbol-less style is available and is the default.
 *  - US1: selecting a harmonic set drives the style controls and restyling the
 *    selected set (colour/symbol) takes effect in place, affecting only it.
 *  - US3: markers can carry a symbol; a shaped marker draws that symbol, a
 *    cross marker draws the crosshair and shows a filled colour rectangle.
 */

/** Locator for the shared symbol drop-down */
const SYMBOL_SELECT = '.gram-frame-symbol-select'
/** Locator for the colour slider canvas */
const COLOR_CANVAS = '.gram-frame-color-canvas'

/**
 * Read the DOM shape of a marker overlay group: how many crosshair lines and
 * how many symbol marks it contains, and the symbol id if present.
 * @param {import('@playwright/test').Page} page
 * @param {string} markerId
 * @returns {Promise<{lines: number, symbols: number, symbol: string|null}>}
 */
async function markerOverlay(page, markerId) {
  return page.evaluate((id) => {
    const g = document.querySelector(`.gram-frame-analysis-marker[data-marker-id="${id}"]`)
    if (!g) return { lines: 0, symbols: 0, symbol: null }
    const symbol = g.querySelector('.gram-frame-marker-symbol')
    return {
      lines: g.querySelectorAll('line').length,
      symbols: symbol ? 1 : 0,
      symbol: symbol ? symbol.getAttribute('data-symbol') : null
    }
  }, markerId)
}

/**
 * Read the marker table row's colour-indicator shape.
 * @param {import('@playwright/test').Page} page
 * @param {string} markerId
 * @returns {Promise<{swatchSymbol: string|null, hasRect: boolean}>}
 */
async function markerRowIndicator(page, markerId) {
  return page.evaluate((id) => {
    const row = document.querySelector(`tr[data-marker-id="${id}"]`)
    if (!row) return { swatchSymbol: null, hasRect: false }
    const mark = row.querySelector('.gram-frame-harmonic-symbol')
    const rect = row.querySelector('.gram-frame-color-swatch')
    return {
      swatchSymbol: mark ? mark.getAttribute('data-symbol') : null,
      hasRect: !!rect
    }
  }, markerId)
}

// ──────────────────────────────────────────────────────────────
// US2 — the cross (symbol-less) style as the default
// ──────────────────────────────────────────────────────────────

test.describe('US2: cross is the default, symbol-less style', () => {
  test('the symbol selector offers "cross" and it is the default selection', async ({ gramFramePage }) => {
    const select = gramFramePage.page.locator(SYMBOL_SELECT)
    await expect(select).toBeVisible()

    const values = await select.locator('option').evaluateAll(
      (opts) => opts.map((o) => /** @type {HTMLOptionElement} */ (o).value)
    )
    expect(values).toContain('cross')

    // Default selection is cross
    await expect(select).toHaveValue('cross')
    const state = await gramFramePage.getState()
    expect(state.selectedSymbol).toBe('cross')
  })

  test('a harmonic set created without picking a symbol draws no symbol shape', async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Harmonics')
    await gramFramePage.page.waitForTimeout(100)

    const setId = await gramFramePage.addHarmonicSet(30, 20)
    await gramFramePage.page.waitForTimeout(150)

    const state = await gramFramePage.getState()
    const set = state.harmonics.harmonicSets.find((s) => s.id === setId)
    expect(set.symbol).toBe('cross')

    // No symbol marks, but the pin lines are still drawn
    const symbols = await gramFramePage.getPinSymbols(setId)
    expect(symbols.length).toBe(0)
    const lines = await gramFramePage.getHarmonicNumbers(setId)
    expect(lines.length).toBeGreaterThan(0)
  })

  test('a marker created without picking a symbol renders as a crosshair', async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Cross Cursor')
    await gramFramePage.page.waitForTimeout(150)

    await gramFramePage.clickSpectrogram(220, 160)
    await gramFramePage.page.waitForTimeout(150)

    const state = await gramFramePage.getState()
    expect(state.analysis.markers.length).toBe(1)
    const marker = state.analysis.markers[0]
    expect(marker.symbol).toBe('cross')

    const overlay = await markerOverlay(gramFramePage.page, marker.id)
    expect(overlay.lines).toBe(2) // crosshair h + v line
    expect(overlay.symbols).toBe(0)

    // Table indicator is a filled colour rectangle (no symbol swatch)
    const indicator = await markerRowIndicator(gramFramePage.page, marker.id)
    expect(indicator.hasRect).toBe(true)
    expect(indicator.swatchSymbol).toBeNull()
  })
})

// ──────────────────────────────────────────────────────────────
// US1 — reformat an existing harmonic set
// ──────────────────────────────────────────────────────────────

test.describe('US1: reformat an existing harmonic set', () => {
  test.beforeEach(async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Harmonics')
    await gramFramePage.page.waitForTimeout(100)
  })

  test('selecting a set updates the symbol selector; restyling affects only that set', async ({ gramFramePage }) => {
    const page = gramFramePage.page

    // Set 1 — square
    await gramFramePage.selectSymbol('square')
    const set1 = await gramFramePage.addHarmonicSet(30, 20)
    await page.waitForTimeout(100)
    // Deselect (toggle the row) so the next symbol choice targets the NEXT set
    await page.locator(`tr[data-harmonic-id="${set1}"]`).click()
    await page.waitForTimeout(50)

    // Set 2 — star
    await gramFramePage.selectSymbol('star')
    const set2 = await gramFramePage.addHarmonicSet(30, 25)
    await page.waitForTimeout(100)

    // Selecting set 1 makes the symbol selector show its symbol (square)
    await page.locator(`tr[data-harmonic-id="${set1}"]`).click()
    await page.waitForTimeout(50)
    await expect(page.locator(SYMBOL_SELECT)).toHaveValue('square')

    // Reformat set 1 to diamond — only set 1 changes
    await gramFramePage.selectSymbol('diamond')
    await page.waitForTimeout(100)

    const state = await gramFramePage.getState()
    const s1 = state.harmonics.harmonicSets.find((s) => s.id === set1)
    const s2 = state.harmonics.harmonicSets.find((s) => s.id === set2)
    expect(s1.symbol).toBe('diamond')
    expect(s2.symbol).toBe('star')

    const pins1 = await gramFramePage.getPinSymbols(set1)
    expect(pins1.length).toBeGreaterThan(0)
    for (const p of pins1) expect(p.symbol).toBe('diamond')
  })

  test('reformatting a set to cross removes its symbol shape but keeps its lines', async ({ gramFramePage }) => {
    const page = gramFramePage.page

    await gramFramePage.selectSymbol('circle')
    const setId = await gramFramePage.addHarmonicSet(30, 20)
    await page.waitForTimeout(100)
    // The set is auto-selected after creation; reformat it to cross
    await gramFramePage.selectSymbol('cross')
    await page.waitForTimeout(100)

    const state = await gramFramePage.getState()
    const set = state.harmonics.harmonicSets.find((s) => s.id === setId)
    expect(set.symbol).toBe('cross')

    const symbols = await gramFramePage.getPinSymbols(setId)
    expect(symbols.length).toBe(0)
    const lines = await gramFramePage.getHarmonicNumbers(setId)
    expect(lines.length).toBeGreaterThan(0)
  })

  test('changing the colour of a selected set restyles only that set', async ({ gramFramePage }) => {
    const page = gramFramePage.page

    const set1 = await gramFramePage.addHarmonicSet(30, 20)
    await page.waitForTimeout(80)
    await page.locator(`tr[data-harmonic-id="${set1}"]`).click() // deselect
    const set2 = await gramFramePage.addHarmonicSet(30, 25)
    await page.waitForTimeout(80)

    const before = await gramFramePage.getState()
    const set2ColorBefore = before.harmonics.harmonicSets.find((s) => s.id === set2).color

    // Select set 1 and pick a colour from the far-left of the slider
    await page.locator(`tr[data-harmonic-id="${set1}"]`).click()
    await page.waitForTimeout(50)
    await page.locator(COLOR_CANVAS).click({ position: { x: 4, y: 10 } })
    await page.waitForTimeout(100)

    const after = await gramFramePage.getState()
    const set1ColorBefore = before.harmonics.harmonicSets.find((s) => s.id === set1).color
    const set1ColorAfter = after.harmonics.harmonicSets.find((s) => s.id === set1).color
    const set2ColorAfter = after.harmonics.harmonicSets.find((s) => s.id === set2).color

    expect(set1ColorAfter).not.toBe(set1ColorBefore)
    // The unselected set is untouched
    expect(set2ColorAfter).toBe(set2ColorBefore)
  })

  test('with nothing selected, changing the symbol sets the next feature only', async ({ gramFramePage }) => {
    const page = gramFramePage.page

    await gramFramePage.selectSymbol('square')
    const set1 = await gramFramePage.addHarmonicSet(30, 20)
    await page.waitForTimeout(100)
    // Deselect
    await page.locator(`tr[data-harmonic-id="${set1}"]`).click()
    await page.waitForTimeout(50)

    // No selection: changing the symbol must not touch the placed set
    await gramFramePage.selectSymbol('triangle')
    await page.waitForTimeout(100)

    let state = await gramFramePage.getState()
    expect(state.harmonics.harmonicSets.find((s) => s.id === set1).symbol).toBe('square')
    // The control now targets the next feature (its DOM value is the source of
    // truth; state.selectedSymbol is not broadcast when nothing is selected).
    await expect(page.locator(SYMBOL_SELECT)).toHaveValue('triangle')

    // The next created set uses the newly selected symbol
    const set2 = await gramFramePage.addHarmonicSet(30, 25)
    await page.waitForTimeout(100)
    state = await gramFramePage.getState()
    expect(state.harmonics.harmonicSets.find((s) => s.id === set2).symbol).toBe('triangle')
  })
})

// ──────────────────────────────────────────────────────────────
// Switching mode clears the selection (about to add something new)
// ──────────────────────────────────────────────────────────────

test.describe('Switching mode clears the current selection', () => {
  test('a selected harmonic is deselected on mode switch, so the controls target the next feature', async ({ gramFramePage }) => {
    const page = gramFramePage.page

    await gramFramePage.clickMode('Harmonics')
    await page.waitForTimeout(100)
    await gramFramePage.selectSymbol('star')
    const setId = await gramFramePage.addHarmonicSet(30, 20)
    await page.waitForTimeout(100)

    // The new set is selected
    let state = await gramFramePage.getState()
    expect(state.selection.selectedType).toBe('harmonicSet')
    expect(state.selection.selectedId).toBe(setId)
    const colorBefore = state.harmonics.harmonicSets.find((s) => s.id === setId).color

    // Switching to Cross Cursor clears the selection
    await gramFramePage.clickMode('Cross Cursor')
    await page.waitForTimeout(150)
    state = await gramFramePage.getState()
    expect(state.selection.selectedType).toBeNull()

    // Picking a colour now arms the next feature and must NOT restyle the set
    await page.locator(COLOR_CANVAS).click({ position: { x: 4, y: 10 } })
    await page.waitForTimeout(100)
    state = await gramFramePage.getState()
    expect(state.harmonics.harmonicSets.find((s) => s.id === setId).color).toBe(colorBefore)
  })
})

// ──────────────────────────────────────────────────────────────
// Marker symbols coexist with harmonic sets (regression)
// ──────────────────────────────────────────────────────────────

test.describe('Marker symbols coexist with harmonic sets', () => {
  test('a marker symbol survives adding a harmonic set and switching modes', async ({ gramFramePage }) => {
    const page = gramFramePage.page

    // Cross Cursor: create a marker and give it a square symbol
    await gramFramePage.clickMode('Cross Cursor')
    await page.waitForTimeout(150)
    await gramFramePage.clickSpectrogram(200, 150)
    await page.waitForTimeout(120)
    let state = await gramFramePage.getState()
    const markerId = state.analysis.markers[0].id
    await gramFramePage.selectSymbol('square') // marker is auto-selected -> restyle it
    await page.waitForTimeout(120)

    let ov = await markerOverlay(page, markerId)
    expect(ov.symbol).toBe('square')

    // Add a harmonic set — its renderer must not wipe the marker's symbol
    await gramFramePage.clickMode('Harmonics')
    await page.waitForTimeout(120)
    await gramFramePage.addHarmonicSet(30, 20)
    await page.waitForTimeout(150)

    ov = await markerOverlay(page, markerId)
    expect(ov.symbols).toBe(1)
    expect(ov.symbol).toBe('square')

    // Back to Cross Cursor: the symbol is still on the overlay
    await gramFramePage.clickMode('Cross Cursor')
    await page.waitForTimeout(150)
    ov = await markerOverlay(page, markerId)
    expect(ov.symbol).toBe('square')

    // Adding a new marker re-renders everything; both markers keep their symbol
    await gramFramePage.selectSymbol('square')
    await gramFramePage.clickSpectrogram(320, 220)
    await page.waitForTimeout(150)
    state = await gramFramePage.getState()
    const secondId = state.analysis.markers.find((m) => m.id !== markerId).id
    const ov1 = await markerOverlay(page, markerId)
    const ov2 = await markerOverlay(page, secondId)
    expect(ov1.symbol).toBe('square')
    expect(ov2.symbol).toBe('square')
  })
})

// ──────────────────────────────────────────────────────────────
// US3 — reformat a marker, including giving it a symbol
// ──────────────────────────────────────────────────────────────

test.describe('US3: reformat a marker and give it a symbol', () => {
  test.beforeEach(async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Cross Cursor')
    await gramFramePage.page.waitForTimeout(150)
  })

  test('assigning a shaped symbol draws that symbol; reverting to cross restores the crosshair', async ({ gramFramePage }) => {
    const page = gramFramePage.page

    await gramFramePage.clickSpectrogram(220, 160)
    await page.waitForTimeout(150)
    let state = await gramFramePage.getState()
    const markerId = state.analysis.markers[0].id

    // The new marker is auto-selected; the selector shows cross
    await expect(page.locator(SYMBOL_SELECT)).toHaveValue('cross')

    // Assign a square — the marker is drawn as a colour-coded square
    await gramFramePage.selectSymbol('square')
    await page.waitForTimeout(120)
    state = await gramFramePage.getState()
    expect(state.analysis.markers[0].symbol).toBe('square')

    let overlay = await markerOverlay(page, markerId)
    expect(overlay.symbols).toBe(1)
    expect(overlay.symbol).toBe('square')
    expect(overlay.lines).toBe(0) // symbol replaces the crosshair

    // The table indicator now shows the colour-coded symbol
    let indicator = await markerRowIndicator(page, markerId)
    expect(indicator.swatchSymbol).toBe('square')
    expect(indicator.hasRect).toBe(false)

    // Revert to cross — crosshair and filled rectangle indicator come back
    await gramFramePage.selectSymbol('cross')
    await page.waitForTimeout(120)
    state = await gramFramePage.getState()
    expect(state.analysis.markers[0].symbol).toBe('cross')

    overlay = await markerOverlay(page, markerId)
    expect(overlay.symbols).toBe(0)
    expect(overlay.lines).toBe(2)

    indicator = await markerRowIndicator(page, markerId)
    expect(indicator.hasRect).toBe(true)
    expect(indicator.swatchSymbol).toBeNull()
  })

  test('changing the colour of a selected marker restyles only that marker', async ({ gramFramePage }) => {
    const page = gramFramePage.page

    await gramFramePage.clickSpectrogram(180, 140)
    await page.waitForTimeout(120)
    await gramFramePage.clickSpectrogram(300, 220)
    await page.waitForTimeout(120)

    const before = await gramFramePage.getState()
    expect(before.analysis.markers.length).toBe(2)
    const m1 = before.analysis.markers[0]
    const m2 = before.analysis.markers[1]

    // Select marker 1 via its table row, then pick a far-left colour
    await page.locator(`tr[data-marker-id="${m1.id}"]`).click()
    await page.waitForTimeout(50)
    await page.locator(COLOR_CANVAS).click({ position: { x: 4, y: 10 } })
    await page.waitForTimeout(100)

    const after = await gramFramePage.getState()
    const m1After = after.analysis.markers.find((m) => m.id === m1.id)
    const m2After = after.analysis.markers.find((m) => m.id === m2.id)
    expect(m1After.color).not.toBe(m1.color)
    expect(m2After.color).toBe(m2.color)
  })
})
