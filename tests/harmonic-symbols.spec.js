import { test, expect } from './helpers/fixtures.js'
import { GramFramePage } from './helpers/gram-frame-page.js'

/**
 * @fileoverview E2E tests for "Symbols on Harmonic Pins" (feature
 * 157-harmonic-pin-symbols). Covers the symbol selector, symbol rendering on
 * pins and in the harmonics table, persistence across reload, and graceful
 * display of legacy harmonic sets that predate the symbol field.
 */

/** Canonical symbol catalogue expected in the selector */
const CATALOGUE = ['circle', 'square', 'diamond', 'triangle', 'triangle-down', 'star']

/**
 * Read the app state from a trainer/student fixture page (which exposes the
 * test-only instance registry rather than the debug #state-display element).
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<any>}
 */
async function getStateFromPage(page) {
  return page.evaluate(() => {
    // @ts-ignore - test-only global
    const instances = window.GramFrame && window.GramFrame.__test__getInstances()
    if (instances && instances.length > 0) {
      return JSON.parse(JSON.stringify(instances[0].state))
    }
    return null
  })
}

/**
 * Wait until GramFrame has initialised on a fixture page. The instance only
 * reaches the registry once its constructor (including annotation restore) has
 * returned, so this is the exact ready signal.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function waitForFixtureReady(page) {
  await page.locator('.gram-frame-container').waitFor({ timeout: 10000 })
  await expect
    .poll(async () => (await getStateFromPage(page)) !== null, {
      message: 'Timed out waiting for GramFrame to initialise'
    })
    .toBe(true)
}

// ──────────────────────────────────────────────────────────────
// User Story 1 — Distinguish harmonic sets by symbol as well as colour
// ──────────────────────────────────────────────────────────────

test.describe('US1: Symbols on harmonic pins', () => {
  test.beforeEach(async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Harmonics')
  })

  // T004
  test('the symbol popup is reachable and offers the catalogue shapes', async ({ gramFramePage }) => {
    const button = gramFramePage.page.locator('.gram-frame-symbol-select')
    await expect(button).toBeVisible()

    await button.click()
    const values = await gramFramePage.page.locator('.gram-frame-symbol-cell').evaluateAll(
      (cells) => cells.map((c) => c.getAttribute('data-symbol'))
    )
    for (const symbol of CATALOGUE) {
      expect(values).toContain(symbol)
    }
    // At minimum circle, square, diamond must be present (FR-002)
    expect(values).toEqual(expect.arrayContaining(['circle', 'square', 'diamond']))
  })

  // T005
  test('click/drag with a selected symbol renders that filled symbol at the top of each pin, label readable', async ({ gramFramePage }) => {
    await gramFramePage.selectSymbol('square')

    // Create a harmonic set by click/drag on the spectrogram. Scroll it into
    // view first so the raw-mouse coordinates below stay within the viewport
    // regardless of how tall the guidance panel above the component is.
    await gramFramePage.svg.scrollIntoViewIfNeeded()
    const svgBox = await gramFramePage.svg.boundingBox()
    if (!svgBox) throw new Error('SVG not found')
    await gramFramePage.page.mouse.move(svgBox.x + 200, svgBox.y + 150)
    await gramFramePage.page.mouse.down()
    await gramFramePage.page.mouse.move(svgBox.x + 320, svgBox.y + 120, { steps: 5 })
    await gramFramePage.page.mouse.up()
    await gramFramePage.waitForHarmonicSetCount(1)

    const state = await gramFramePage.getState()
    const set = state.harmonics.harmonicSets[0]
    expect(set.symbol).toBe('square')

    // Every pin symbol is a square filled in the set's colour
    const symbols = await gramFramePage.getPinSymbols(set.id)
    expect(symbols.length).toBeGreaterThan(0)
    for (const s of symbols) {
      expect(s.symbol).toBe('square')
      expect(s.fill.toLowerCase()).toBe(String(set.color).toLowerCase())
    }

    // The pin-number label is present and not obscured — spec 159 stacks the
    // label ABOVE the symbol (order: label, symbol, line), and centres the label
    // horizontally on the pin. Scope to the pin overlay (symbols with a set id;
    // the harmonics-table swatches share the class but carry no set id) and pair
    // a label with the symbol on the same pin (nearest centre-x).
    const overlap = await gramFramePage.page.evaluate((setId) => {
      const centreX = (r) => (r.left + r.right) / 2
      const label = document.querySelector(
        `.gram-frame-harmonic-number[data-harmonic-set-id="${setId}"]`
      )
      const pinSymbols = Array.from(document.querySelectorAll(
        `.gram-frame-harmonic-symbol[data-harmonic-set-id="${setId}"]`
      ))
      if (!label || pinSymbols.length === 0) return null
      const l = label.getBoundingClientRect()
      const lCx = centreX(l)
      // Pick the symbol on the same pin as this label
      let symbol = pinSymbols[0]
      let best = Infinity
      for (const s of pinSymbols) {
        const d = Math.abs(centreX(s.getBoundingClientRect()) - lCx)
        if (d < best) { best = d; symbol = s }
      }
      const s = symbol.getBoundingClientRect()
      return {
        symbolTop: s.top,
        labelBottom: l.bottom,
        symbolCenterX: centreX(s),
        labelCenterX: lCx
      }
    }, set.id)
    expect(overlap).not.toBeNull()
    // Label's bottom is at or above the symbol's top (with a couple px tolerance)
    expect(overlap.labelBottom).toBeLessThanOrEqual(overlap.symbolTop + 3)
    // Label is horizontally centred on the symbol/pin (within a few px)
    expect(Math.abs(overlap.labelCenterX - overlap.symbolCenterX)).toBeLessThanOrEqual(3)
  })

  // T006
  test('manual add dialog uses the currently selected symbol', async ({ gramFramePage }) => {
    await gramFramePage.selectSymbol('diamond')

    await gramFramePage.page.locator('.gram-frame-manual-button').click()
    await gramFramePage.page.locator('.gram-frame-harmonic-spacing-input').fill('25')
    await gramFramePage.page.locator('.gram-frame-manual-harmonic-modal .gram-frame-modal-add').click()
    await gramFramePage.waitForHarmonicSetCount(1)

    const state = await gramFramePage.getState()
    const set = state.harmonics.harmonicSets[state.harmonics.harmonicSets.length - 1]
    expect(set.symbol).toBe('diamond')

    const symbols = await gramFramePage.getPinSymbols(set.id)
    expect(symbols.length).toBeGreaterThan(0)
    for (const s of symbols) {
      expect(s.symbol).toBe('diamond')
    }
  })

  // T007
  test('each harmonics-table row shows the set symbol in the set colour', async ({ gramFramePage }) => {
    await gramFramePage.selectSymbol('star')
    const setId = await gramFramePage.addHarmonicSet(5, 100)

    const state = await gramFramePage.getState()
    const set = state.harmonics.harmonicSets.find((s) => s.id === setId)
    expect(set).toBeTruthy()
    expect(set.symbol).toBe('star')

    const swatches = await gramFramePage.getTableSymbolSwatches()
    expect(swatches.length).toBe(state.harmonics.harmonicSets.length)
    const swatch = swatches[state.harmonics.harmonicSets.findIndex((s) => s.id === setId)]
    expect(swatch.symbol).toBe('star')
    expect(swatch.fill.toLowerCase()).toBe(String(set.color).toLowerCase())
  })
})

// ──────────────────────────────────────────────────────────────
// User Story 2 — Preserve symbols across save and reload
// ──────────────────────────────────────────────────────────────

test.describe('US2: Symbols persist across reload', () => {
  test('symbols on pins and in the table survive a save/reload round-trip', async ({ page }) => {
    const gfp = new GramFramePage(page)
    await page.goto('/tests/fixtures/trainer-page.html')
    await page.evaluate(() => localStorage.clear())
    await waitForFixtureReady(page)

    // Select a distinctive symbol and create a harmonic set
    await page.locator('.gram-frame-mode-btn[title="Harmonics" i]').click()
    await gfp.selectSymbol('triangle')
    const setId = await gfp.addHarmonicSet(5, 100)

    const before = await getStateFromPage(page)
    const setBefore = before.harmonics.harmonicSets.find((s) => s.id === setId)
    expect(setBefore.symbol).toBe('triangle')

    // Reload
    await page.reload()
    await waitForFixtureReady(page)

    const after = await getStateFromPage(page)
    const setAfter = after.harmonics.harmonicSets.find((s) => s.id === setId)
    expect(setAfter).toBeTruthy()
    expect(setAfter.symbol).toBe('triangle')
    expect(setAfter.color).toBe(setBefore.color)

    // Pins render the restored symbol
    const pins = await gfp.getPinSymbols(setId)
    expect(pins.length).toBeGreaterThan(0)
    for (const p of pins) {
      expect(p.symbol).toBe('triangle')
    }

    // Table swatch shows the restored symbol
    const swatches = await gfp.getTableSymbolSwatches()
    expect(swatches.some((s) => s.symbol === 'triangle')).toBe(true)
  })
})

// ──────────────────────────────────────────────────────────────
// User Story 3 — Gracefully display legacy harmonics that predate symbols
// ──────────────────────────────────────────────────────────────

test.describe('US3: Legacy harmonic sets default to cross (symbol-less)', () => {
  test('a legacy v1 blob without symbol reloads as cross with no symbol shape and no console error', async ({ page }) => {
    /** @type {string[]} */
    const consoleErrors = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/tests/fixtures/trainer-page.html')
    await page.evaluate(() => localStorage.clear())

    // Seed a legacy (pre-feature) v1 record whose harmonic sets have no `symbol`
    await page.evaluate(() => {
      const key = 'gramframe::' + window.location.pathname
      localStorage.setItem(key, JSON.stringify({
        version: 1,
        savedAt: new Date().toISOString(),
        analysis: { markers: [] },
        harmonics: {
          harmonicSets: [
            { id: 'legacy-1', color: '#00ff00', anchorTime: 5, spacing: 100 }
          ]
        },
        doppler: { fPlus: null, fMinus: null, fZero: null, color: null }
      }))
    })

    // Reload — legacy data must load (SCHEMA_VERSION unchanged) and default to
    // the symbol-less 'cross' style (feature 161 changed the default from circle)
    await page.reload()
    await waitForFixtureReady(page)

    const gfp = new GramFramePage(page)
    const state = await getStateFromPage(page)
    const legacySet = state.harmonics.harmonicSets.find((s) => s.id === 'legacy-1')
    expect(legacySet).toBeTruthy()
    expect(legacySet.symbol).toBe('cross')

    // Pin lines are still drawn, but no symbol shape is rendered for a cross set
    const pins = await gfp.getPinSymbols('legacy-1')
    expect(pins.length).toBe(0)

    // The harmonics-table row shows a filled colour rectangle (no symbol mark)
    const swatches = await gfp.getTableSymbolSwatches()
    expect(swatches.length).toBe(0)

    // No console errors during the legacy load
    expect(consoleErrors).toEqual([])
  })
})
