import { test, expect } from './helpers/fixtures.js'
import { GramFramePage } from './helpers/gram-frame-page.js'

/**
 * @fileoverview E2E tests for the harmonic-pin visibility toggle in the Symbol
 * panel. Covers the default-on session preference, pin-less creation, editing an
 * existing set in place, persistence within the browser session, and the
 * restore of harmonic sets saved before the toggle existed.
 */

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

/**
 * Wait until a harmonic set's `showPin` reaches the expected value.
 * @param {import('./helpers/gram-frame-page.js').GramFramePage} gramFramePage
 * @param {string} setId
 * @param {boolean} showPin
 * @returns {Promise<void>}
 */
async function waitForSetPin(gramFramePage, setId, showPin) {
  await gramFramePage.waitForState(
    (state) => state.harmonics.harmonicSets.find((s) => s.id === setId)?.showPin === showPin,
    { message: `harmonic set ${setId} to have showPin=${showPin}` }
  )
}

// ──────────────────────────────────────────────────────────────
// User Story 1 — Create harmonic sets without the vertical pin
// ──────────────────────────────────────────────────────────────

test.describe('US1: Pin toggle governs newly created harmonic sets', () => {
  test.beforeEach(async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Harmonics')
  })

  test('the toggle is present and on at the start of a session', async ({ gramFramePage }) => {
    const toggle = gramFramePage.page.locator('.gram-frame-pin-toggle-input')
    await expect(toggle).toBeVisible()

    const { checked, disabled } = await gramFramePage.getPinToggleState()
    expect(checked).toBe(true)
    expect(disabled).toBe(false)

    const state = await gramFramePage.getState()
    expect(state.showHarmonicPin).toBe(true)
  })

  test('with the toggle on, a new set draws its pin lines', async ({ gramFramePage }) => {
    const setId = await gramFramePage.addHarmonicSet(5, 100)

    const state = await gramFramePage.getState()
    const set = state.harmonics.harmonicSets.find((s) => s.id === setId)
    expect(set.showPin).toBe(true)
    expect(await gramFramePage.getHarmonicLineCount(setId)).toBeGreaterThan(0)
  })

  test('with the toggle off, a new set renders symbols and numbers but no pin lines', async ({ gramFramePage }) => {
    await gramFramePage.selectSymbol('square')
    await gramFramePage.setPinToggle(false)

    const setId = await gramFramePage.addHarmonicSet(5, 100)

    const state = await gramFramePage.getState()
    expect(state.showHarmonicPin).toBe(false)
    const set = state.harmonics.harmonicSets.find((s) => s.id === setId)
    expect(set.showPin).toBe(false)

    // No pin lines, but the symbols and number labels are still drawn
    expect(await gramFramePage.getHarmonicLineCount(setId)).toBe(0)
    const symbols = await gramFramePage.getPinSymbols(setId)
    expect(symbols.length).toBeGreaterThan(0)
    for (const s of symbols) {
      expect(s.symbol).toBe('square')
    }
    const labels = await gramFramePage.getHarmonicLabelNumbers(setId)
    expect(labels.length).toBeGreaterThan(0)
  })

  test('the toggle applies per set, so pinned and pin-less sets coexist', async ({ gramFramePage }) => {
    // First set with the pin on
    const pinnedId = await gramFramePage.addHarmonicSet(5, 100)
    // Deselect the newly created set so the toggle targets the session default
    await gramFramePage.page.evaluate(() => {
      // @ts-ignore - test-only global
      window.GramFrame.__test__getInstances()[0].interaction.clearSelection()
    })
    await gramFramePage.setPinToggle(false)
    const pinlessId = await gramFramePage.addHarmonicSet(5, 150)

    expect(await gramFramePage.getHarmonicLineCount(pinnedId)).toBeGreaterThan(0)
    expect(await gramFramePage.getHarmonicLineCount(pinlessId)).toBe(0)
  })
})

// ──────────────────────────────────────────────────────────────
// User Story 2 — Edit an existing harmonic set's pin
// ──────────────────────────────────────────────────────────────

test.describe('US2: Toggling restyles the selected harmonic set in place', () => {
  test.beforeEach(async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Harmonics')
  })

  test('turning the pin off and on again updates the selected set only', async ({ gramFramePage }) => {
    const setId = await gramFramePage.addHarmonicSet(5, 100)
    const pinnedCount = await gramFramePage.getHarmonicLineCount(setId)
    expect(pinnedCount).toBeGreaterThan(0)

    // The set is auto-selected on creation, so the toggle targets it
    await gramFramePage.setPinToggle(false)
    await waitForSetPin(gramFramePage, setId, false)

    let state = await gramFramePage.getState()
    expect(await gramFramePage.getHarmonicLineCount(setId)).toBe(0)
    // Restyling a selected set must not change the session default
    expect(state.showHarmonicPin).toBe(true)

    // Turn it back on
    await gramFramePage.setPinToggle(true)
    await waitForSetPin(gramFramePage, setId, true)

    expect(await gramFramePage.getHarmonicLineCount(setId)).toBe(pinnedCount)
  })

  test('selecting a set reflects its pin state back into the toggle', async ({ gramFramePage }) => {
    // A pin-less set, then a pinned one
    await gramFramePage.setPinToggle(false)
    const pinlessId = await gramFramePage.addHarmonicSet(5, 100)
    await gramFramePage.page.evaluate(() => {
      // @ts-ignore - test-only global
      window.GramFrame.__test__getInstances()[0].interaction.clearSelection()
    })
    await gramFramePage.setPinToggle(true)
    const pinnedId = await gramFramePage.addHarmonicSet(5, 150)

    // The pinned set is selected (created last)
    expect((await gramFramePage.getPinToggleState()).checked).toBe(true)

    // Select the pin-less set via its table row
    await gramFramePage.clickTableRow('harmonics', pinlessId)
    expect((await gramFramePage.getPinToggleState()).checked).toBe(false)

    // Back to the pinned set
    await gramFramePage.clickTableRow('harmonics', pinnedId)
    expect((await gramFramePage.getPinToggleState()).checked).toBe(true)
  })

  test('the toggle is disabled while an analysis marker is selected', async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Cross Cursor')
    await gramFramePage.svg.scrollIntoViewIfNeeded()
    const svgBox = await gramFramePage.svg.boundingBox()
    if (!svgBox) throw new Error('SVG not found')
    await gramFramePage.page.mouse.click(svgBox.x + 200, svgBox.y + 150)
    await gramFramePage.waitForMarkerCount(1)

    expect((await gramFramePage.getPinToggleState()).disabled).toBe(true)
  })
})

// ──────────────────────────────────────────────────────────────
// User Story 3 — The preference lasts for the browser session
// ──────────────────────────────────────────────────────────────

test.describe('US3: Pin preference persists within the session', () => {
  test('the choice survives a reload and applies to sets created afterwards', async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Harmonics')
    await gramFramePage.setPinToggle(false)

    await gramFramePage.page.reload()
    await gramFramePage.waitForComponentLoad()

    // The toggle comes back off, and so does the state it drives
    await gramFramePage.waitForState((state) => state.showHarmonicPin === false, {
      message: 'the restored pin preference to be off'
    })
    expect((await gramFramePage.getPinToggleState()).checked).toBe(false)

    await gramFramePage.clickMode('Harmonics')
    const setId = await gramFramePage.addHarmonicSet(5, 100)
    expect(await gramFramePage.getHarmonicLineCount(setId)).toBe(0)
  })

  test('a set keeps its own pin state across a save/reload round-trip', async ({ page }) => {
    const gfp = new GramFramePage(page)
    await page.goto('/tests/fixtures/trainer-page.html')
    await page.evaluate(() => localStorage.clear())
    await waitForFixtureReady(page)

    await page.locator('.gram-frame-mode-btn:text("Harmonics")').click()
    await page.locator('.gram-frame-symbol-select').selectOption('star')
    await page.locator('.gram-frame-pin-toggle-input').uncheck()
    const setId = await gfp.addHarmonicSet(5, 100)

    await page.reload()
    await waitForFixtureReady(page)

    const after = await getStateFromPage(page)
    const set = after.harmonics.harmonicSets.find((s) => s.id === setId)
    expect(set).toBeTruthy()
    expect(set.showPin).toBe(false)
    expect(await gfp.getHarmonicLineCount(setId)).toBe(0)
    const symbols = await gfp.getPinSymbols(setId)
    expect(symbols.length).toBeGreaterThan(0)
  })
})

// ──────────────────────────────────────────────────────────────
// User Story 4 — Harmonic sets saved before the toggle keep their pins
// ──────────────────────────────────────────────────────────────

test.describe('US4: Legacy harmonic sets restore with pins shown', () => {
  test('a stored set without showPin loads as pinned, with no console error', async ({ page }) => {
    /** @type {string[]} */
    const consoleErrors = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/tests/fixtures/trainer-page.html')
    await page.evaluate(() => localStorage.clear())

    // Seed a record whose harmonic set predates the pin toggle
    await page.evaluate(() => {
      const key = 'gramframe::' + window.location.pathname
      localStorage.setItem(key, JSON.stringify({
        version: 1,
        savedAt: new Date().toISOString(),
        analysis: { markers: [] },
        harmonics: {
          harmonicSets: [
            { id: 'legacy-pin-1', color: '#00ff00', anchorTime: 5, spacing: 100, symbol: 'circle' }
          ]
        },
        doppler: { fPlus: null, fMinus: null, fZero: null, color: null }
      }))
    })

    await page.reload()
    await waitForFixtureReady(page)

    const gfp = new GramFramePage(page)
    const state = await getStateFromPage(page)
    const legacySet = state.harmonics.harmonicSets.find((s) => s.id === 'legacy-pin-1')
    expect(legacySet).toBeTruthy()
    expect(legacySet.showPin).toBe(true)
    expect(await gfp.getHarmonicLineCount('legacy-pin-1')).toBeGreaterThan(0)

    expect(consoleErrors).toEqual([])
  })
})
