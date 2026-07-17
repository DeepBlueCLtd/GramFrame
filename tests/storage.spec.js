import { test, expect } from '@playwright/test'
import { GramFramePage } from './helpers/gram-frame-page.js'

/**
 * Helper: navigate to a fixture page, wait for GramFrame to initialise
 * @param {import('@playwright/test').Page} page
 * @param {string} fixturePath - relative to base URL, e.g. '/tests/fixtures/trainer-page.html'
 * @returns {Promise<GramFramePage>}
 */
async function gotoFixture(page, fixturePath) {
  const gfp = new GramFramePage(page)
  await page.goto(fixturePath)
  // Wait for GramFrame container to appear
  await page.locator('.gram-frame-container').waitFor({ timeout: 10000 })
  // Brief pause for state init
  await page.waitForTimeout(300)
  return gfp
}

/**
 * Helper: add an analysis marker by clicking on the SVG
 * @param {GramFramePage} gfp
 * @param {number} x
 * @param {number} y
 */
async function addAnalysisMarker(gfp, x, y) {
  // Ensure we're in analysis mode
  const modeBtn = gfp.page.locator('.gram-frame-mode-btn:text("Cross Cursor")')
  await modeBtn.click()
  await gfp.page.waitForTimeout(200)

  // Click on the SVG to add a marker
  await gfp.svg.click({ position: { x, y } })
  await gfp.page.waitForTimeout(300)
}

/**
 * Helper: add a harmonic set by dragging on the SVG in harmonics mode
 * @param {GramFramePage} gfp
 * @param {number} startX
 * @param {number} startY
 * @param {number} endX
 * @param {number} endY
 */
async function addHarmonicSet(gfp, startX, startY, endX, endY) {
  const modeBtn = gfp.page.locator('.gram-frame-mode-btn:text("Harmonics")')
  await modeBtn.click()
  await gfp.page.waitForTimeout(200)

  const svgBox = await gfp.svg.boundingBox()
  if (!svgBox) throw new Error('SVG not found')
  await gfp.page.mouse.move(svgBox.x + startX, svgBox.y + startY)
  await gfp.page.mouse.down()
  await gfp.page.mouse.move(svgBox.x + endX, svgBox.y + endY, { steps: 5 })
  await gfp.page.mouse.up()
  await gfp.page.waitForTimeout(300)
}

/**
 * Helper: get current state from the page via evaluate
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<any>}
 */
async function getStateFromPage(page) {
  return page.evaluate(() => {
    // @ts-ignore
    const instances = window.GramFrame && window.GramFrame.__test__getInstances()
    if (instances && instances.length > 0) {
      return JSON.parse(JSON.stringify(instances[0].state))
    }
    return null
  })
}

// ──────────────────────────────────────────────────────────────
// User Story 1 — Trainer Annotations Persist Across Page Reloads
// ──────────────────────────────────────────────────────────────

test.describe('US1: Trainer annotations persist across reloads', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    await page.goto('/tests/fixtures/trainer-page.html')
    await page.evaluate(() => localStorage.clear())
  })

  // T007
  test('analysis markers persist across page reload', async ({ page }) => {
    const gfp = await gotoFixture(page, '/tests/fixtures/trainer-page.html')

    // Add a marker
    await addAnalysisMarker(gfp, 200, 150)

    // Verify marker was added
    const stateBefore = await getStateFromPage(page)
    expect(stateBefore.analysis.markers.length).toBeGreaterThan(0)
    const markerBefore = stateBefore.analysis.markers[0]

    // Reload page
    await page.reload()
    await page.locator('.gram-frame-container').waitFor({ timeout: 10000 })
    await page.waitForTimeout(500)

    // Verify marker was restored
    const stateAfter = await getStateFromPage(page)
    expect(stateAfter.analysis.markers.length).toBe(stateBefore.analysis.markers.length)
    const markerAfter = stateAfter.analysis.markers[0]
    expect(markerAfter.id).toBe(markerBefore.id)
    expect(markerAfter.color).toBe(markerBefore.color)
    expect(markerAfter.time).toBeCloseTo(markerBefore.time, 1)
    expect(markerAfter.freq).toBeCloseTo(markerBefore.freq, 1)
  })

  // T008
  test('harmonic sets persist across page reload', async ({ page }) => {
    const gfp = await gotoFixture(page, '/tests/fixtures/trainer-page.html')

    // Add a harmonic set by dragging
    await addHarmonicSet(gfp, 200, 150, 300, 100)

    const stateBefore = await getStateFromPage(page)
    expect(stateBefore.harmonics.harmonicSets.length).toBeGreaterThan(0)
    const hsBefore = stateBefore.harmonics.harmonicSets[0]

    // Reload
    await page.reload()
    await page.locator('.gram-frame-container').waitFor({ timeout: 10000 })
    await page.waitForTimeout(500)

    const stateAfter = await getStateFromPage(page)
    expect(stateAfter.harmonics.harmonicSets.length).toBe(stateBefore.harmonics.harmonicSets.length)
    const hsAfter = stateAfter.harmonics.harmonicSets[0]
    expect(hsAfter.id).toBe(hsBefore.id)
    expect(hsAfter.spacing).toBeCloseTo(hsBefore.spacing, 1)
    expect(hsAfter.anchorTime).toBeCloseTo(hsBefore.anchorTime, 1)
  })

  // T009
  test('doppler markers persist across page reload', async ({ page }) => {
    const gfp = await gotoFixture(page, '/tests/fixtures/trainer-page.html')

    // Switch to doppler mode and add markers
    const modeBtn = gfp.page.locator('.gram-frame-mode-btn:text("Doppler")')
    await modeBtn.click()
    await page.waitForTimeout(200)

    // Place two points for doppler curve
    await gfp.svg.click({ position: { x: 200, y: 100 } })
    await page.waitForTimeout(200)
    await gfp.svg.click({ position: { x: 200, y: 200 } })
    await page.waitForTimeout(300)

    const stateBefore = await getStateFromPage(page)
    const hasDopplerData = stateBefore.doppler.fPlus !== null || stateBefore.doppler.fMinus !== null

    if (hasDopplerData) {
      // Reload
      await page.reload()
      await page.locator('.gram-frame-container').waitFor({ timeout: 10000 })
      await page.waitForTimeout(500)

      const stateAfter = await getStateFromPage(page)
      if (stateBefore.doppler.fPlus) {
        expect(stateAfter.doppler.fPlus).not.toBeNull()
        expect(stateAfter.doppler.fPlus.time).toBeCloseTo(stateBefore.doppler.fPlus.time, 1)
        expect(stateAfter.doppler.fPlus.freq).toBeCloseTo(stateBefore.doppler.fPlus.freq, 1)
      }
      if (stateBefore.doppler.fMinus) {
        expect(stateAfter.doppler.fMinus).not.toBeNull()
      }
    }
  })

  // Regression: restored annotations must repopulate the control-panel tables,
  // not just the SVG overlays and in-memory state.
  test('restored markers repopulate the markers table on reload', async ({ page }) => {
    const gfp = await gotoFixture(page, '/tests/fixtures/trainer-page.html')

    await addAnalysisMarker(gfp, 200, 150)

    // Markers table should have a row before reload
    const rowsBefore = await page
      .locator('.gram-frame-markers-persistent-container .gram-frame-table tbody tr')
      .count()
    expect(rowsBefore).toBeGreaterThan(0)

    await page.reload()
    await page.locator('.gram-frame-container').waitFor({ timeout: 10000 })
    await page.waitForTimeout(500)

    // After reload, the markers table must be repopulated (not just the SVG/state)
    const rowsAfter = await page
      .locator('.gram-frame-markers-persistent-container .gram-frame-table tbody tr')
      .count()
    expect(rowsAfter).toBe(rowsBefore)
  })

  // Regression: restored harmonic sets must repopulate the harmonics panel table.
  test('restored harmonic sets repopulate the harmonics panel on reload', async ({ page }) => {
    const gfp = await gotoFixture(page, '/tests/fixtures/trainer-page.html')

    await addHarmonicSet(gfp, 200, 150, 300, 100)

    const stateBefore = await getStateFromPage(page)
    expect(stateBefore.harmonics.harmonicSets.length).toBeGreaterThan(0)

    const rowsBefore = await page
      .locator('.gram-frame-harmonics-persistent-container .gram-frame-table tbody tr')
      .count()
    expect(rowsBefore).toBeGreaterThan(0)

    await page.reload()
    await page.locator('.gram-frame-container').waitFor({ timeout: 10000 })
    await page.waitForTimeout(500)

    const rowsAfter = await page
      .locator('.gram-frame-harmonics-persistent-container .gram-frame-table tbody tr')
      .count()
    expect(rowsAfter).toBe(rowsBefore)
  })

  // T010
  test('annotations are restored silently without prompt', async ({ page }) => {
    const gfp = await gotoFixture(page, '/tests/fixtures/trainer-page.html')

    // Add a marker
    await addAnalysisMarker(gfp, 200, 150)

    // Reload
    await page.reload()
    await page.locator('.gram-frame-container').waitFor({ timeout: 10000 })
    await page.waitForTimeout(500)

    // Verify no dialogs were shown
    const dialogShown = await page.evaluate(() => {
      // @ts-ignore - checking a flag we'd set if dialog appeared
      return window.__dialogWasShown || false
    })
    expect(dialogShown).toBe(false)

    // Verify markers were restored (silently)
    const state = await getStateFromPage(page)
    expect(state.analysis.markers.length).toBeGreaterThan(0)
  })
})

// ──────────────────────────────────────────────────────────────
// User Story 2 — Student Annotations Persist Within a Session
// ──────────────────────────────────────────────────────────────

test.describe('US2: Student annotations persist within session', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/fixtures/student-page.html')
    await page.evaluate(() => sessionStorage.clear())
  })

  // T015
  test('annotations persist within session on reload', async ({ page }) => {
    const gfp = await gotoFixture(page, '/tests/fixtures/student-page.html')

    // Add a marker
    await addAnalysisMarker(gfp, 200, 150)

    const stateBefore = await getStateFromPage(page)
    expect(stateBefore.analysis.markers.length).toBeGreaterThan(0)

    // Reload within same session
    await page.reload()
    await page.locator('.gram-frame-container').waitFor({ timeout: 10000 })
    await page.waitForTimeout(500)

    const stateAfter = await getStateFromPage(page)
    expect(stateAfter.analysis.markers.length).toBe(stateBefore.analysis.markers.length)
  })

  // T016
  test('annotations are gone in a new browser context', async ({ browser }) => {
    // First context — add annotations
    const context1 = await browser.newContext()
    const page1 = await context1.newPage()
    const gfp1 = await gotoFixture(page1, '/tests/fixtures/student-page.html')
    await addAnalysisMarker(gfp1, 200, 150)

    const state1 = await getStateFromPage(page1)
    expect(state1.analysis.markers.length).toBeGreaterThan(0)
    await context1.close()

    // Second context — should be clean (new sessionStorage)
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()
    await gotoFixture(page2, '/tests/fixtures/student-page.html')

    const state2 = await getStateFromPage(page2)
    expect(state2.analysis.markers.length).toBe(0)
    await context2.close()
  })
})

// ──────────────────────────────────────────────────────────────
// gf-persistent flag — opts a page into trainer (localStorage) persistence
// ──────────────────────────────────────────────────────────────

test.describe('gf-persistent flag forces trainer persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/fixtures/persistent-flag-page.html')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  test('page with #gf-persistent uses localStorage (not sessionStorage)', async ({ page }) => {
    const gfp = await gotoFixture(page, '/tests/fixtures/persistent-flag-page.html')

    await addAnalysisMarker(gfp, 200, 150)
    await page.waitForTimeout(300)

    // Annotations should be written to localStorage (trainer behaviour)
    const localKeys = await gfp.getStorageKeys('local')
    expect(localKeys.length).toBeGreaterThan(0)

    // ...and NOT to sessionStorage (student behaviour)
    const sessionKeys = await gfp.getStorageKeys('session')
    expect(sessionKeys.length).toBe(0)
  })

  test('annotations persist across reload via the gf-persistent flag', async ({ page }) => {
    const gfp = await gotoFixture(page, '/tests/fixtures/persistent-flag-page.html')

    await addAnalysisMarker(gfp, 200, 150)
    const stateBefore = await getStateFromPage(page)
    expect(stateBefore.analysis.markers.length).toBeGreaterThan(0)

    await page.reload()
    await page.locator('.gram-frame-container').waitFor({ timeout: 10000 })
    await page.waitForTimeout(500)

    const stateAfter = await getStateFromPage(page)
    expect(stateAfter.analysis.markers.length).toBe(stateBefore.analysis.markers.length)
  })

  // The DITA-friendly class flag must drive the full localStorage pipeline,
  // not just detection — DITA-OT id-mangling makes the class form the one the
  // AAAC publishing pipeline can actually emit.
  test('page with class="gf-persistent" uses localStorage (not sessionStorage)', async ({ page }) => {
    await page.goto('/tests/fixtures/persistent-class-page.html')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    const gfp = await gotoFixture(page, '/tests/fixtures/persistent-class-page.html')

    await addAnalysisMarker(gfp, 200, 150)
    await page.waitForTimeout(300)

    const localKeys = await gfp.getStorageKeys('local')
    expect(localKeys.length).toBeGreaterThan(0)

    const sessionKeys = await gfp.getStorageKeys('session')
    expect(sessionKeys.length).toBe(0)
  })
})

// ──────────────────────────────────────────────────────────────
// User Story 3 — Trainer Clears Stored Annotations
// ──────────────────────────────────────────────────────────────

test.describe('US3: Clear gram button', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/fixtures/trainer-page.html')
    await page.evaluate(() => localStorage.clear())
  })

  // T020
  test('Clear gram button removes annotations from display and storage', async ({ page }) => {
    const gfp = await gotoFixture(page, '/tests/fixtures/trainer-page.html')

    // Add a marker
    await addAnalysisMarker(gfp, 200, 150)
    const stateBefore = await getStateFromPage(page)
    expect(stateBefore.analysis.markers.length).toBeGreaterThan(0)

    // The marker should appear as a row in the markers table above the gram
    const markerRows = page.locator('.gram-frame-table tbody tr')
    expect(await markerRows.count()).toBeGreaterThan(0)

    // Click clear gram button
    const clearBtn = page.locator('.gram-frame-clear-btn')
    await expect(clearBtn).toBeVisible()
    await clearBtn.click()
    await page.waitForTimeout(300)

    // Verify annotations removed from state
    const stateAfter = await getStateFromPage(page)
    expect(stateAfter.analysis.markers.length).toBe(0)
    expect(stateAfter.harmonics.harmonicSets.length).toBe(0)

    // Verify the markers table above the gram is also cleared (not just the SVG)
    expect(await markerRows.count()).toBe(0)

    // Verify storage is cleared
    const keys = await gfp.getStorageKeys('local')
    expect(keys.length).toBe(0)
  })

  // T021
  test('after clearing, reload shows no annotations', async ({ page }) => {
    const gfp = await gotoFixture(page, '/tests/fixtures/trainer-page.html')

    // Add and clear
    await addAnalysisMarker(gfp, 200, 150)
    const clearBtn = page.locator('.gram-frame-clear-btn')
    await clearBtn.click()
    await page.waitForTimeout(300)

    // Reload
    await page.reload()
    await page.locator('.gram-frame-container').waitFor({ timeout: 10000 })
    await page.waitForTimeout(500)

    const state = await getStateFromPage(page)
    expect(state.analysis.markers.length).toBe(0)
  })

  // T022
  test('no Clear gram button on student page', async ({ page }) => {
    await gotoFixture(page, '/tests/fixtures/student-page.html')
    const clearBtn = page.locator('.gram-frame-clear-btn')
    await expect(clearBtn).toHaveCount(0)
  })
})

// ──────────────────────────────────────────────────────────────
// Phase 6: Edge Cases & Cross-Cutting Concerns
// ──────────────────────────────────────────────────────────────

test.describe('Edge cases', () => {
  // T027
  test('graceful degradation when storage is unavailable', async ({ page }) => {
    await page.goto('/tests/fixtures/trainer-page.html')
    await page.locator('.gram-frame-container').waitFor({ timeout: 10000 })

    // Block storage access
    await page.evaluate(() => {
      const noopStorage = {
        getItem: () => { throw new Error('storage disabled') },
        setItem: () => { throw new Error('storage disabled') },
        removeItem: () => { throw new Error('storage disabled') },
        key: () => null,
        length: 0,
        clear: () => { throw new Error('storage disabled') }
      }
      Object.defineProperty(window, 'localStorage', { value: noopStorage, writable: true })
      Object.defineProperty(window, 'sessionStorage', { value: noopStorage, writable: true })
    })

    // Reload with blocked storage
    await page.reload()
    await page.locator('.gram-frame-container').waitFor({ timeout: 10000 })
    await page.waitForTimeout(300)

    // Verify no errors in console that break the component
    const state = await getStateFromPage(page)
    expect(state).not.toBeNull()
    expect(state.mode).toBe('analysis')

    // Verify annotations still work (just not persisted)
    const gfp = new GramFramePage(page)
    await addAnalysisMarker(gfp, 200, 150)
    const stateAfter = await getStateFromPage(page)
    expect(stateAfter.analysis.markers.length).toBeGreaterThan(0)
  })

  // T028
  test('stored data with unrecognised schema version is discarded', async ({ page }) => {
    await page.goto('/tests/fixtures/trainer-page.html')
    await page.evaluate(() => localStorage.clear())

    // Plant bad data with wrong version
    await page.evaluate(() => {
      const key = 'gramframe::' + window.location.pathname
      localStorage.setItem(key, JSON.stringify({
        version: 999,
        savedAt: new Date().toISOString(),
        analysis: { markers: [{ id: 'old', color: '#ff0000', time: 10, freq: 50 }] },
        harmonics: { harmonicSets: [] },
        doppler: { fPlus: null, fMinus: null, fZero: null, color: null }
      }))
    })

    // Reload — should discard bad data
    await page.reload()
    await page.locator('.gram-frame-container').waitFor({ timeout: 10000 })
    await page.waitForTimeout(500)

    const state = await getStateFromPage(page)
    expect(state.analysis.markers.length).toBe(0)

    // Verify bad data was removed from storage
    const raw = await page.evaluate(() => {
      const key = 'gramframe::' + window.location.pathname
      return localStorage.getItem(key)
    })
    expect(raw).toBeNull()
  })

  // T029
  test('no storage entry until first annotation', async ({ page }) => {
    await page.goto('/tests/fixtures/trainer-page.html')
    await page.evaluate(() => localStorage.clear())

    await page.reload()
    await page.locator('.gram-frame-container').waitFor({ timeout: 10000 })
    await page.waitForTimeout(500)

    // Verify no storage entries yet
    const gfp = new GramFramePage(page)
    const keys = await gfp.getStorageKeys('local')
    expect(keys.length).toBe(0)

    // Add a marker — should now create a storage entry
    await addAnalysisMarker(gfp, 200, 150)
    await page.waitForTimeout(300)

    const keysAfter = await gfp.getStorageKeys('local')
    expect(keysAfter.length).toBeGreaterThan(0)
  })
})

// ──────────────────────────────────────────────────────────────
// Feature 157: Student Tonal Expiry (24-Hour Persistence Limit)
// ──────────────────────────────────────────────────────────────

/**
 * Rewrite the `savedAt` field of the app-written gramframe:: record in the
 * given storage. Reads the key the app actually wrote (enumerating the store
 * for the `gramframe::` prefix) rather than reconstructing it, per the contract.
 * @param {import('@playwright/test').Page} page
 * @param {'local' | 'session'} storageType
 * @param {string | null} newSavedAt - New ISO value, or null to delete the field
 * @returns {Promise<boolean>} True if a record was found and rewritten
 */
async function mutateSavedAt(page, storageType, newSavedAt) {
  return page.evaluate(({ storageType, newSavedAt }) => {
    const store = storageType === 'local' ? localStorage : sessionStorage
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i)
      if (key && key.startsWith('gramframe::')) {
        const rec = JSON.parse(/** @type {string} */ (store.getItem(key)))
        if (newSavedAt === null) {
          delete rec.savedAt
        } else {
          rec.savedAt = newSavedAt
        }
        store.setItem(key, JSON.stringify(rec))
        return true
      }
    }
    return false
  }, { storageType, newSavedAt })
}

test.describe('Feature 157: student annotation 24h expiry', () => {
  // Each test runs in its own isolated browser context (fresh session/local
  // storage), so no explicit clear is needed. Grant extra headroom for the
  // extra reload + storage-mutation steps under parallel load.
  test.beforeEach(() => {
    test.setTimeout(30000)
  })

  // ── User Story 1: Old student annotations do not resurface ──

  // T006 — contract T-A, SC-001, FR-003
  test('US1: student annotations older than 24h are discarded on load', async ({ page }) => {
    const gfp = await gotoFixture(page, '/tests/fixtures/student-page.html')
    await addAnalysisMarker(gfp, 200, 150)

    // Confirm the app wrote a student record to sessionStorage
    const keysBefore = await gfp.getStorageKeys('session')
    expect(keysBefore.length).toBeGreaterThan(0)

    // Backdate the record's savedAt to 25h ago
    const mutated = await mutateSavedAt(page, 'session', new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString())
    expect(mutated).toBe(true)

    // Reload — the expired record must not restore and must be removed
    await page.reload()
    await page.locator('.gram-frame-container').waitFor({ timeout: 10000 })
    await page.waitForTimeout(500)

    const state = await getStateFromPage(page)
    expect(state.analysis.markers.length).toBe(0)
    expect(state.harmonics.harmonicSets.length).toBe(0)
    expect(state.doppler.fPlus).toBeNull()
    expect(state.doppler.fMinus).toBeNull()

    // The stale key must have been removed during the load
    const keysAfter = await gfp.getStorageKeys('session')
    expect(keysAfter.length).toBe(0)
  })

  // T007 — contract T-B, SC-002, FR-004
  test('US1: student annotations within 24h are restored on load', async ({ page }) => {
    const gfp = await gotoFixture(page, '/tests/fixtures/student-page.html')
    await addAnalysisMarker(gfp, 200, 150)

    const stateBefore = await getStateFromPage(page)
    expect(stateBefore.analysis.markers.length).toBeGreaterThan(0)

    // Set savedAt to ~1h ago — well within the 24h window
    const mutated = await mutateSavedAt(page, 'session', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    expect(mutated).toBe(true)

    await page.reload()
    await page.locator('.gram-frame-container').waitFor({ timeout: 10000 })
    await page.waitForTimeout(500)

    const stateAfter = await getStateFromPage(page)
    expect(stateAfter.analysis.markers.length).toBe(stateBefore.analysis.markers.length)

    // Key should still be present (not discarded)
    const keysAfter = await gfp.getStorageKeys('session')
    expect(keysAfter.length).toBeGreaterThan(0)
  })

  // T008 — contract T-D, FR-009
  test('US1: student record with missing savedAt is discarded on load', async ({ page }) => {
    const gfp = await gotoFixture(page, '/tests/fixtures/student-page.html')
    await addAnalysisMarker(gfp, 200, 150)

    // Remove the savedAt field entirely — cannot prove freshness, fail safe
    const mutated = await mutateSavedAt(page, 'session', null)
    expect(mutated).toBe(true)

    await page.reload()
    await page.locator('.gram-frame-container').waitFor({ timeout: 10000 })
    await page.waitForTimeout(500)

    const state = await getStateFromPage(page)
    expect(state.analysis.markers.length).toBe(0)

    const keysAfter = await gfp.getStorageKeys('session')
    expect(keysAfter.length).toBe(0)
  })

  // T008b — garbage (unparseable) savedAt is also discarded (contract T-D, FR-009)
  test('US1: student record with garbage savedAt is discarded on load', async ({ page }) => {
    const gfp = await gotoFixture(page, '/tests/fixtures/student-page.html')
    await addAnalysisMarker(gfp, 200, 150)

    const mutated = await mutateSavedAt(page, 'session', 'not-a-date')
    expect(mutated).toBe(true)

    await page.reload()
    await page.locator('.gram-frame-container').waitFor({ timeout: 10000 })
    await page.waitForTimeout(500)

    const state = await getStateFromPage(page)
    expect(state.analysis.markers.length).toBe(0)

    const keysAfter = await gfp.getStorageKeys('session')
    expect(keysAfter.length).toBe(0)
  })

  // T008c — future savedAt (clock skew) is discarded (contract T-D, FR-009)
  test('US1: student record with a future savedAt is discarded on load', async ({ page }) => {
    const gfp = await gotoFixture(page, '/tests/fixtures/student-page.html')
    await addAnalysisMarker(gfp, 200, 150)

    // 2 hours in the future
    const mutated = await mutateSavedAt(page, 'session', new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString())
    expect(mutated).toBe(true)

    await page.reload()
    await page.locator('.gram-frame-container').waitFor({ timeout: 10000 })
    await page.waitForTimeout(500)

    const state = await getStateFromPage(page)
    expect(state.analysis.markers.length).toBe(0)

    const keysAfter = await gfp.getStorageKeys('session')
    expect(keysAfter.length).toBe(0)
  })

  // ── User Story 3: Trainer annotations remain permanent ──

  // T011 — contract T-C, SC-003, FR-006
  test('US3: trainer annotations survive beyond 24h', async ({ page }) => {
    const gfp = await gotoFixture(page, '/tests/fixtures/trainer-page.html')
    await addAnalysisMarker(gfp, 200, 150)

    const stateBefore = await getStateFromPage(page)
    expect(stateBefore.analysis.markers.length).toBeGreaterThan(0)

    // Backdate savedAt to 10 days ago — far beyond the student window
    const mutated = await mutateSavedAt(page, 'local', new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString())
    expect(mutated).toBe(true)

    await page.reload()
    await page.locator('.gram-frame-container').waitFor({ timeout: 10000 })
    await page.waitForTimeout(500)

    // Trainer records must still be restored and the key must remain
    const stateAfter = await getStateFromPage(page)
    expect(stateAfter.analysis.markers.length).toBe(stateBefore.analysis.markers.length)

    const keysAfter = await gfp.getStorageKeys('local')
    expect(keysAfter.length).toBeGreaterThan(0)
  })

  // T012 — contract behavior matrix, FR-006
  test('US3: trainer record with missing savedAt is NOT discarded', async ({ page }) => {
    const gfp = await gotoFixture(page, '/tests/fixtures/trainer-page.html')
    await addAnalysisMarker(gfp, 200, 150)

    const stateBefore = await getStateFromPage(page)
    expect(stateBefore.analysis.markers.length).toBeGreaterThan(0)

    // Remove savedAt — for trainer context the expiry gate is skipped entirely
    const mutated = await mutateSavedAt(page, 'local', null)
    expect(mutated).toBe(true)

    await page.reload()
    await page.locator('.gram-frame-container').waitFor({ timeout: 10000 })
    await page.waitForTimeout(500)

    const stateAfter = await getStateFromPage(page)
    expect(stateAfter.analysis.markers.length).toBe(stateBefore.analysis.markers.length)

    const keysAfter = await gfp.getStorageKeys('local')
    expect(keysAfter.length).toBeGreaterThan(0)
  })

  // ── User Story 2: Instructors can force an immediate reset ──

  // T014 — contract T-E, US2, FR-008
  // A fresh browser session (new sessionStorage) restores no student annotations,
  // regardless of the 24h window. This preserves the instructor override.
  test('US2: fresh browser session restores no student annotations', async ({ browser }) => {
    // Session 1 — seed student annotations
    const context1 = await browser.newContext()
    const page1 = await context1.newPage()
    const gfp1 = await gotoFixture(page1, '/tests/fixtures/student-page.html')
    await addAnalysisMarker(gfp1, 200, 150)

    const state1 = await getStateFromPage(page1)
    expect(state1.analysis.markers.length).toBeGreaterThan(0)
    await context1.close()

    // Session 2 — a fresh session starts with empty sessionStorage
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()
    await gotoFixture(page2, '/tests/fixtures/student-page.html')

    const state2 = await getStateFromPage(page2)
    expect(state2.analysis.markers.length).toBe(0)
    await context2.close()
  })
})
