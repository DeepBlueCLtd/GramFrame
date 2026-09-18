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
 *
 * Waiting note: the colour canvas and symbol drop-down handlers run
 * synchronously, so Playwright's click/selectOption has already applied the
 * restyle by the time it resolves. Where a test then reads broadcast state,
 * it waits on the value it expects rather than on a fixed delay.
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

/**
 * Wait until a harmonic set carries the expected symbol in broadcast state.
 * @param {import('./helpers/gram-frame-page.js').GramFramePage} gramFramePage
 * @param {string} setId
 * @param {string} symbol
 * @returns {Promise<void>}
 */
async function waitForSetSymbol(gramFramePage, setId, symbol) {
  await gramFramePage.waitForState(
    (state) => state.harmonics.harmonicSets.find((s) => s.id === setId)?.symbol === symbol,
    { message: `harmonic set ${setId} to carry symbol "${symbol}"` }
  )
}

/**
 * Wait until a marker carries the expected symbol in broadcast state.
 * @param {import('./helpers/gram-frame-page.js').GramFramePage} gramFramePage
 * @param {string} markerId
 * @param {string} symbol
 * @returns {Promise<void>}
 */
async function waitForMarkerSymbol(gramFramePage, markerId, symbol) {
  await gramFramePage.waitForState(
    (state) => state.analysis.markers.find((m) => m.id === markerId)?.symbol === symbol,
    { message: `marker ${markerId} to carry symbol "${symbol}"` }
  )
}

// ──────────────────────────────────────────────────────────────
// US2 — the cross (symbol-less) style as the default
// ──────────────────────────────────────────────────────────────

test.describe('US2: cross is the default, symbol-less style', () => {
  test('the symbol popup offers "cross" and it is the default selection', async ({ gramFramePage }) => {
    const button = gramFramePage.page.locator(SYMBOL_SELECT)
    await expect(button).toBeVisible()
    await expect(button).toHaveAttribute('data-symbol', 'cross')

    await button.click()
    const values = await gramFramePage.page.locator('.gram-frame-symbol-cell').evaluateAll(
      (cells) => cells.map((c) => c.getAttribute('data-symbol'))
    )
    expect(values).toContain('cross')
    await expect(gramFramePage.page.locator('.gram-frame-symbol-cell-selected'))
      .toHaveAttribute('data-symbol', 'cross')

    const state = await gramFramePage.getState()
    expect(state.selectedSymbol).toBe('cross')
  })

  test('a harmonic set created without picking a symbol draws no symbol shape', async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Harmonics')

    const setId = await gramFramePage.addHarmonicSet(30, 20)

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

    await gramFramePage.clickSpectrogram(220, 160)
    await gramFramePage.waitForMarkerCount(1)

    const state = await gramFramePage.getState()
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
  })

  test('selecting a set updates the symbol selector; restyling affects only that set', async ({ gramFramePage }) => {
    const page = gramFramePage.page

    // Set 1 — square
    await gramFramePage.selectSymbol('square')
    const set1 = await gramFramePage.addHarmonicSet(30, 20)
    // Deselect (toggle the row) so the next symbol choice targets the NEXT set
    await gramFramePage.clickTableRow('harmonics', set1)

    // Set 2 — star
    await gramFramePage.selectSymbol('star')
    const set2 = await gramFramePage.addHarmonicSet(30, 25)

    // Selecting set 1 makes the symbol selector show its symbol (square)
    await gramFramePage.clickTableRow('harmonics', set1)
    await expect(page.locator(SYMBOL_SELECT)).toHaveAttribute('data-symbol', 'square')

    // Reformat set 1 to diamond — only set 1 changes
    await gramFramePage.selectSymbol('diamond')
    await waitForSetSymbol(gramFramePage, set1, 'diamond')

    const state = await gramFramePage.getState()
    const s2 = state.harmonics.harmonicSets.find((s) => s.id === set2)
    expect(s2.symbol).toBe('star')

    const pins1 = await gramFramePage.getPinSymbols(set1)
    expect(pins1.length).toBeGreaterThan(0)
    for (const p of pins1) expect(p.symbol).toBe('diamond')
  })

  test('reformatting a set to cross removes its symbol shape but keeps its lines', async ({ gramFramePage }) => {
    await gramFramePage.selectSymbol('circle')
    const setId = await gramFramePage.addHarmonicSet(30, 20)
    // The set is auto-selected after creation; reformat it to cross
    await gramFramePage.selectSymbol('cross')
    await waitForSetSymbol(gramFramePage, setId, 'cross')

    const symbols = await gramFramePage.getPinSymbols(setId)
    expect(symbols.length).toBe(0)
    const lines = await gramFramePage.getHarmonicNumbers(setId)
    expect(lines.length).toBeGreaterThan(0)
  })

  test('changing the colour of a selected set restyles only that set', async ({ gramFramePage }) => {
    const page = gramFramePage.page

    const set1 = await gramFramePage.addHarmonicSet(30, 20)
    await gramFramePage.clickTableRow('harmonics', set1) // deselect
    const set2 = await gramFramePage.addHarmonicSet(30, 25)

    const before = await gramFramePage.getState()
    const set1ColorBefore = before.harmonics.harmonicSets.find((s) => s.id === set1).color
    const set2ColorBefore = before.harmonics.harmonicSets.find((s) => s.id === set2).color

    // Select set 1 and pick a colour from the far-left of the slider
    await gramFramePage.clickTableRow('harmonics', set1)
    await page.locator(COLOR_CANVAS).click({ position: { x: 4, y: 10 } })
    await gramFramePage.waitForState(
      (state) => state.harmonics.harmonicSets.find((s) => s.id === set1).color !== set1ColorBefore,
      { message: `set ${set1} to be recoloured` }
    )

    // The unselected set is untouched
    const after = await gramFramePage.getState()
    expect(after.harmonics.harmonicSets.find((s) => s.id === set2).color).toBe(set2ColorBefore)
  })

  test('with nothing selected, changing the symbol sets the next feature only', async ({ gramFramePage }) => {
    const page = gramFramePage.page

    await gramFramePage.selectSymbol('square')
    const set1 = await gramFramePage.addHarmonicSet(30, 20)
    // Deselect
    await gramFramePage.clickTableRow('harmonics', set1)

    // No selection: changing the symbol must not touch the placed set
    await gramFramePage.selectSymbol('triangle')

    // The control now targets the next feature (its DOM value is the source of
    // truth; state.selectedSymbol is not broadcast when nothing is selected).
    await expect(page.locator(SYMBOL_SELECT)).toHaveAttribute('data-symbol', 'triangle')
    let state = await gramFramePage.getState()
    expect(state.harmonics.harmonicSets.find((s) => s.id === set1).symbol).toBe('square')

    // The next created set uses the newly selected symbol
    const set2 = await gramFramePage.addHarmonicSet(30, 25)
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
    await gramFramePage.selectSymbol('star')
    const setId = await gramFramePage.addHarmonicSet(30, 20)

    // The new set is selected
    let state = await gramFramePage.getState()
    expect(state.selection.selectedType).toBe('harmonicSet')
    expect(state.selection.selectedId).toBe(setId)
    const colorBefore = state.harmonics.harmonicSets.find((s) => s.id === setId).color

    // Switching to Cross Cursor clears the selection
    await gramFramePage.clickMode('Cross Cursor')
    await gramFramePage.waitForState((s) => s.selection.selectedType === null, {
      message: 'the selection to clear on mode switch'
    })

    // Picking a colour now arms the next feature and must NOT restyle the set.
    // The canvas handler is synchronous, so the click has been fully applied by
    // the time it resolves — an unchanged colour here is a real result.
    await page.locator(COLOR_CANVAS).click({ position: { x: 4, y: 10 } })
    state = await gramFramePage.getState()
    expect(state.harmonics.harmonicSets.find((s) => s.id === setId).color).toBe(colorBefore)
  })

  test('re-clicking the already-active mode also clears the selection', async ({ gramFramePage }) => {
    const page = gramFramePage.page

    await gramFramePage.clickMode('Harmonics')
    const setId = await gramFramePage.addHarmonicSet(30, 20)

    let state = await gramFramePage.getState()
    expect(state.selection.selectedType).toBe('harmonicSet')
    expect(state.selection.selectedId).toBe(setId)
    const colorBefore = state.harmonics.harmonicSets.find((s) => s.id === setId).color

    // Clicking Harmonics again - the mode does not change, but the selection drops
    await gramFramePage.clickMode('Harmonics')
    await gramFramePage.waitForState((s) => s.selection.selectedType === null, {
      message: 'the selection to clear on re-clicking the active mode'
    })
    state = await gramFramePage.getState()
    expect(state.mode).toBe('harmonics')
    expect(state.selection.selectedId).toBeNull()

    // The colour picker now arms the next set rather than restyling the placed one
    await page.locator(COLOR_CANVAS).click({ position: { x: 4, y: 10 } })
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
    await gramFramePage.clickSpectrogram(200, 150)
    await gramFramePage.waitForMarkerCount(1)
    let state = await gramFramePage.getState()
    const markerId = state.analysis.markers[0].id
    await gramFramePage.selectSymbol('square') // marker is auto-selected -> restyle it
    await waitForMarkerSymbol(gramFramePage, markerId, 'square')

    let ov = await markerOverlay(page, markerId)
    expect(ov.symbol).toBe('square')

    // Add a harmonic set — its renderer must not wipe the marker's symbol
    await gramFramePage.clickMode('Harmonics')
    await gramFramePage.addHarmonicSet(30, 20)

    ov = await markerOverlay(page, markerId)
    expect(ov.symbols).toBe(1)
    expect(ov.symbol).toBe('square')

    // Back to Cross Cursor: the symbol is still on the overlay
    await gramFramePage.clickMode('Cross Cursor')
    ov = await markerOverlay(page, markerId)
    expect(ov.symbol).toBe('square')

    // Adding a new marker re-renders everything; both markers keep their symbol
    await gramFramePage.selectSymbol('square')
    await gramFramePage.clickSpectrogram(320, 220)
    await gramFramePage.waitForMarkerCount(2)
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
  })

  test('assigning a shaped symbol draws that symbol; reverting to cross restores the crosshair', async ({ gramFramePage }) => {
    const page = gramFramePage.page

    await gramFramePage.clickSpectrogram(220, 160)
    await gramFramePage.waitForMarkerCount(1)
    const state = await gramFramePage.getState()
    const markerId = state.analysis.markers[0].id

    // The new marker is auto-selected; the selector shows cross
    await expect(page.locator(SYMBOL_SELECT)).toHaveAttribute('data-symbol', 'cross')

    // Assign a square — the marker is drawn as a colour-coded square
    await gramFramePage.selectSymbol('square')
    await waitForMarkerSymbol(gramFramePage, markerId, 'square')

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
    await waitForMarkerSymbol(gramFramePage, markerId, 'cross')

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
    await gramFramePage.waitForMarkerCount(1)
    await gramFramePage.clickSpectrogram(300, 220)
    await gramFramePage.waitForMarkerCount(2)

    const before = await gramFramePage.getState()
    const m1 = before.analysis.markers[0]
    const m2 = before.analysis.markers[1]

    // Select marker 1 via its table row, then pick a far-left colour
    await gramFramePage.clickTableRow('markers', m1.id)
    await page.locator(COLOR_CANVAS).click({ position: { x: 4, y: 10 } })
    await gramFramePage.waitForState(
      (state) => state.analysis.markers.find((m) => m.id === m1.id).color !== m1.color,
      { message: `marker ${m1.id} to be recoloured` }
    )

    const after = await gramFramePage.getState()
    expect(after.analysis.markers.find((m) => m.id === m2.id).color).toBe(m2.color)
  })
})
