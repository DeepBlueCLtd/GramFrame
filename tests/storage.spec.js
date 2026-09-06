import { test, expect } from '@playwright/test'
import { GramFramePage } from './helpers/gram-frame-page.js'

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

/**
 * Helper: wait for a condition on the instance's live state.
 * @param {import('@playwright/test').Page} page
 * @param {(state: any) => boolean} predicate
 * @param {string} message - What is being waited for, for the failure message
 * @returns {Promise<void>}
 */
async function waitForPageState(page, predicate, message) {
  await expect
    .poll(async () => {
      const state = await getStateFromPage(page)
      return state ? predicate(state) : false
    }, { message: `Timed out waiting for ${message}` })
    .toBe(true)
}

/**
 * Helper: wait until GramFrame has finished initialising on the current page.
 *
 * The instance is only pushed onto the registry after its constructor returns,
 * and the constructor restores saved annotations before returning — so an
 * instance being visible here means the restore has already run. That makes
 * this the exact signal to wait on after a load or reload, including in the
 * tests that assert nothing was restored.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function waitForInitialised(page) {
  await page.locator('.gram-frame-container').waitFor({ timeout: 10000 })
  await waitForPageState(page, () => true, 'GramFrame to finish initialising')
}

/**
 * Helper: navigate to a fixture page, wait for GramFrame to initialise
 * @param {import('@playwright/test').Page} page
 * @param {string} fixturePath - relative to base URL, e.g. '/tests/fixtures/trainer-page.html'
 * @returns {Promise<GramFramePage>}
 */
async function gotoFixture(page, fixturePath) {
  const gfp = new GramFramePage(page)
  await page.goto(fixturePath)
  await waitForInitialised(page)
  return gfp
}

/**
 * Helper: reload the page and wait for the restored component to be ready.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function reloadAndWait(page) {
  await page.reload()
  await waitForInitialised(page)
}

/**
 * Helper: add an analysis marker by clicking on the SVG
 * @param {GramFramePage} gfp
 * @param {number} x
 * @param {number} y
 */
async function addAnalysisMarker(gfp, x, y) {
  const page = gfp.page
  const before = (await getStateFromPage(page)).analysis.markers.length

  // Ensure we're in analysis mode
  await page.locator('.gram-frame-mode-btn[title="Cross Cursor" i]').click()
  await waitForPageState(page, (s) => s.mode === 'analysis', 'analysis mode')

  // Click on the SVG to add a marker
  await gfp.svg.click({ position: { x, y } })
  await waitForPageState(
    page,
    (s) => s.analysis.markers.length > before,
    `the marker count to rise above ${before}`
  )
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
  const page = gfp.page
  const before = (await getStateFromPage(page)).harmonics.harmonicSets.length

  await page.locator('.gram-frame-mode-btn[title="Harmonics" i]').click()
  await waitForPageState(page, (s) => s.mode === 'harmonics', 'harmonics mode')

  const svgBox = await gfp.svg.boundingBox()
  if (!svgBox) throw new Error('SVG not found')
  await page.mouse.move(svgBox.x + startX, svgBox.y + startY)
  await page.mouse.down()
  await page.mouse.move(svgBox.x + endX, svgBox.y + endY, { steps: 5 })
  await page.mouse.up()
  await waitForPageState(
    page,
    (s) => s.harmonics.harmonicSets.length > before,
    `the harmonic set count to rise above ${before}`
  )
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
    await reloadAndWait(page)

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
    await reloadAndWait(page)

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
    await gfp.page.locator('.gram-frame-mode-btn[title="Doppler" i]').click()
    await waitForPageState(page, (s) => s.mode === 'doppler', 'doppler mode')

    // Place two points for doppler curve
    await gfp.svg.click({ position: { x: 200, y: 100 } })
    await gfp.svg.click({ position: { x: 200, y: 200 } })
    await waitForPageState(
      page,
      (s) => s.doppler.fPlus !== null || s.doppler.fMinus !== null,
      'a doppler marker to be placed'
    )

    const stateBefore = await getStateFromPage(page)
    const hasDopplerData = stateBefore.doppler.fPlus !== null || stateBefore.doppler.fMinus !== null

    if (hasDopplerData) {
      // Reload
      await reloadAndWait(page)

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

    await reloadAndWait(page)

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

    await reloadAndWait(page)

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
    await reloadAndWait(page)

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
    await reloadAndWait(page)

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

    // Annotations should be written to localStorage (trainer behaviour)
    await expect.poll(async () => (await gfp.getStorageKeys('local')).length).toBeGreaterThan(0)

    // ...and NOT to sessionStorage (student behaviour)
    const sessionKeys = await gfp.getStorageKeys('session')
    expect(sessionKeys.length).toBe(0)
  })

  test('annotations persist across reload via the gf-persistent flag', async ({ page }) => {
    const gfp = await gotoFixture(page, '/tests/fixtures/persistent-flag-page.html')

    await addAnalysisMarker(gfp, 200, 150)
    const stateBefore = await getStateFromPage(page)
    expect(stateBefore.analysis.markers.length).toBeGreaterThan(0)

    await reloadAndWait(page)

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

    await expect.poll(async () => (await gfp.getStorageKeys('local')).length).toBeGreaterThan(0)

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

    // The marker should appear as a row in the markers table above the gram.
    // Scoped to that table and to rows carrying a marker id: an empty table now
    // shows an instructional row of its own, and there are three tables.
    const markerRows = page.locator('.gram-frame-markers-persistent-container tbody tr[data-marker-id]')
    expect(await markerRows.count()).toBeGreaterThan(0)

    // Click clear gram button
    const clearBtn = page.locator('.gram-frame-clear-btn')
    await expect(clearBtn).toBeVisible()
    await clearBtn.click()
    await waitForPageState(
      page,
      (s) => s.analysis.markers.length === 0 && s.harmonics.harmonicSets.length === 0,
      'the annotations to be cleared'
    )

    // Verify annotations removed from state
    const stateAfter = await getStateFromPage(page)
    expect(stateAfter.analysis.markers.length).toBe(0)
    expect(stateAfter.harmonics.harmonicSets.length).toBe(0)

    // Verify the markers table above the gram is also cleared (not just the SVG)
    expect(await markerRows.count()).toBe(0)

    // Verify storage holds no annotations.
    //
    // Not "no key": clearing now leaves a record that is nothing but
    // tombstones (issue #269). It has to. Another tab holding the same
    // annotations would otherwise merge them straight back in on its next
    // save, and the clear would silently undo itself. What the trainer asked
    // for — that none of their work is in storage — is what is asserted here.
    const record = await page.evaluate(() => {
      const raw = localStorage.getItem('gramframe::' + window.location.pathname)
      return raw ? JSON.parse(raw) : null
    })
    if (record) {
      expect(record.analysis.markers).toEqual([])
      expect(record.harmonics.harmonicSets).toEqual([])
      expect(record.sidebands?.sidebandSets ?? []).toEqual([])
      expect(record.doppler.fPlus).toBeNull()
      expect(Object.keys(record.tombstones.markers).length).toBeGreaterThan(0)
    }
    void gfp
  })

  // T021
  test('after clearing, reload shows no annotations', async ({ page }) => {
    const gfp = await gotoFixture(page, '/tests/fixtures/trainer-page.html')

    // Add and clear
    await addAnalysisMarker(gfp, 200, 150)
    const clearBtn = page.locator('.gram-frame-clear-btn')
    await clearBtn.click()
    await waitForPageState(page, (s) => s.analysis.markers.length === 0, 'the annotations to be cleared')

    // Reload
    await reloadAndWait(page)

    const state = await getStateFromPage(page)
    expect(state.analysis.markers.length).toBe(0)
  })

  // T022
  test('a student page offers the clear button too', async ({ page }) => {
    // It used to be trainer-only, on the reasoning that a student's work
    // expires anyway. "It will be gone tomorrow" is no answer to a student who
    // has mislabelled a gram and wants to start the exercise again today.
    const gfp = await gotoFixture(page, '/tests/fixtures/student-page.html')
    await addAnalysisMarker(gfp, 200, 150)

    const clearBtn = page.locator('.gram-frame-clear-btn')
    await expect(clearBtn).toBeVisible()
    await clearBtn.click()
    await waitForPageState(page, (s) => s.analysis.markers.length === 0, 'the annotations to be cleared')

    // And the session-scoped record is cleared with them.
    const stored = await page.evaluate(() => {
      const key = Object.keys(sessionStorage).find((k) => k.startsWith('gramframe::'))
      return key ? sessionStorage.getItem(key) : null
    })
    const record = stored ? JSON.parse(stored) : null
    expect(record?.markers ?? []).toHaveLength(0)
  })

  // Issue #229: the detected context must be visible from outside, because a
  // trainer page that came out as student loses the button and its permanent
  // storage with no other sign. The container carries the context and one
  // console line names what decided it.
  test('trainer page stamps data-gf-context="trainer" and logs what matched', async ({ page }) => {
    /** @type {string[]} */
    const infoLines = []
    page.on('console', (msg) => {
      if (msg.type() === 'info') infoLines.push(msg.text())
    })
    await gotoFixture(page, '/tests/fixtures/trainer-page.html')

    await expect(page.locator('.gram-frame-container')).toHaveAttribute('data-gf-context', 'trainer')
    const line = infoLines.find((t) => t.includes('is on a trainer page'))
    expect(line, `expected a GramFrame context line among: ${infoLines.join(' | ')}`).toBeTruthy()
    expect(line).toContain('legacy "ANALYSIS" anchor')
    expect(line).toContain('annotations persist in localStorage')
  })

  test('student page stamps data-gf-context="student" and logs that nothing matched', async ({ page }) => {
    /** @type {string[]} */
    const infoLines = []
    page.on('console', (msg) => {
      if (msg.type() === 'info') infoLines.push(msg.text())
    })
    await gotoFixture(page, '/tests/fixtures/student-page.html')

    await expect(page.locator('.gram-frame-container')).toHaveAttribute('data-gf-context', 'student')
    const line = infoLines.find((t) => t.includes('is on a student page'))
    expect(line, `expected a GramFrame context line among: ${infoLines.join(' | ')}`).toBeTruthy()
    expect(line).toContain('no gf-persistent flag')
    expect(line).toContain('annotations are session-only and expire after 24 hours')
  })

  test('the class flag is named in the context line', async ({ page }) => {
    /** @type {string[]} */
    const infoLines = []
    page.on('console', (msg) => {
      if (msg.type() === 'info') infoLines.push(msg.text())
    })
    await gotoFixture(page, '/tests/fixtures/persistent-class-page.html')

    await expect(page.locator('.gram-frame-container')).toHaveAttribute('data-gf-context', 'trainer')
    const line = infoLines.find((t) => t.includes('is on a trainer page'))
    expect(line).toContain('<span class="gf-persistent">')
  })
})

// ──────────────────────────────────────────────────────────────
// Feature 157 — Student Tonal Expiry (24-hour persistence limit)
// ──────────────────────────────────────────────────────────────

/**
 * Helper: rewrite the app-written gramframe:: record's `savedAt` in the given
 * storage. Reads the key the app actually wrote (enumerating the prefix) rather
 * than reconstructing it, per the contract's test obligations.
 * @param {import('@playwright/test').Page} page
 * @param {'local' | 'session'} storageType
 * @param {(rec: any) => void} mutate - mutation applied to the parsed record
 * @returns {Promise<number>} number of records mutated
 */
async function mutateStoredRecord(page, storageType, mutate) {
  return page.evaluate(({ type, mutateSrc }) => {
    const store = type === 'local' ? localStorage : sessionStorage
    // eslint-disable-next-line no-new-func
    const fn = new Function('rec', `(${mutateSrc})(rec)`)
    let count = 0
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i)
      if (k && k.startsWith('gramframe::')) {
        const rec = JSON.parse(store.getItem(k))
        fn(rec)
        store.setItem(k, JSON.stringify(rec))
        count++
      }
    }
    return count
  }, { type: storageType, mutateSrc: mutate.toString() })
}

test.describe('Feature 157: student 24-hour expiry', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/fixtures/student-page.html')
    await page.evaluate(() => sessionStorage.clear())
  })

  // T006 / T-A / SC-001 / FR-003
  test('student annotations older than 24h are discarded on load', async ({ page }) => {
    const gfp = await gotoFixture(page, '/tests/fixtures/student-page.html')

    // Seed an annotation (student → sessionStorage)
    await addAnalysisMarker(gfp, 200, 150)
    const stateBefore = await getStateFromPage(page)
    expect(stateBefore.analysis.markers.length).toBeGreaterThan(0)

    // Confirm the app wrote a session key
    const keysBefore = await gfp.getStorageKeys('session')
    expect(keysBefore.length).toBeGreaterThan(0)

    // Backdate the app-written record's savedAt to 25h ago
    const mutated = await mutateStoredRecord(page, 'session', (rec) => {
      rec.savedAt = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    })
    expect(mutated).toBeGreaterThan(0)

    // Reload → expired record must be discarded
    await reloadAndWait(page)

    const stateAfter = await getStateFromPage(page)
    expect(stateAfter.analysis.markers.length).toBe(0)
    expect(stateAfter.harmonics.harmonicSets.length).toBe(0)
    expect(stateAfter.doppler.fPlus).toBeNull()
    expect(stateAfter.doppler.fMinus).toBeNull()

    // ...and the stale key must be removed
    const keysAfter = await gfp.getStorageKeys('session')
    expect(keysAfter.length).toBe(0)
  })

  // T007 / T-B / SC-002 / FR-004
  test('student annotations within 24h are restored on load', async ({ page }) => {
    const gfp = await gotoFixture(page, '/tests/fixtures/student-page.html')

    await addAnalysisMarker(gfp, 200, 150)
    const stateBefore = await getStateFromPage(page)
    expect(stateBefore.analysis.markers.length).toBeGreaterThan(0)

    // Set savedAt to ~1h ago — well within the 24h window
    const mutated = await mutateStoredRecord(page, 'session', (rec) => {
      rec.savedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    })
    expect(mutated).toBeGreaterThan(0)

    await reloadAndWait(page)

    const stateAfter = await getStateFromPage(page)
    expect(stateAfter.analysis.markers.length).toBe(stateBefore.analysis.markers.length)

    // Key must still be present
    const keysAfter = await gfp.getStorageKeys('session')
    expect(keysAfter.length).toBeGreaterThan(0)
  })

  // T008 / T-D / FR-009
  test('student record with missing/garbage savedAt is discarded', async ({ page }) => {
    const gfp = await gotoFixture(page, '/tests/fixtures/student-page.html')

    await addAnalysisMarker(gfp, 200, 150)
    const stateBefore = await getStateFromPage(page)
    expect(stateBefore.analysis.markers.length).toBeGreaterThan(0)

    // Corrupt savedAt into an unparseable value (also covers the missing case)
    const mutated = await mutateStoredRecord(page, 'session', (rec) => {
      rec.savedAt = 'not-a-date'
    })
    expect(mutated).toBeGreaterThan(0)

    await reloadAndWait(page)

    const stateAfter = await getStateFromPage(page)
    expect(stateAfter.analysis.markers.length).toBe(0)

    const keysAfter = await gfp.getStorageKeys('session')
    expect(keysAfter.length).toBe(0)
  })
})

// ──────────────────────────────────────────────────────────────
// Feature 157 — Trainer permanence (US3) & fresh-session override (US2)
// ──────────────────────────────────────────────────────────────

test.describe('Feature 157: trainer permanence beyond 24h', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/fixtures/persistent-flag-page.html')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  // T011 / T-C / SC-003 / FR-006
  test('trainer annotations survive beyond 24h', async ({ page }) => {
    const gfp = await gotoFixture(page, '/tests/fixtures/persistent-flag-page.html')

    // Seed on a trainer page (localStorage)
    await addAnalysisMarker(gfp, 200, 150)
    const stateBefore = await getStateFromPage(page)
    expect(stateBefore.analysis.markers.length).toBeGreaterThan(0)

    const localKeysBefore = await gfp.getStorageKeys('local')
    expect(localKeysBefore.length).toBeGreaterThan(0)

    // Backdate savedAt to 10 days ago — far beyond 24h
    const mutated = await mutateStoredRecord(page, 'local', (rec) => {
      rec.savedAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    })
    expect(mutated).toBeGreaterThan(0)

    await reloadAndWait(page)

    // Trainer permanence: still restored, key intact
    const stateAfter = await getStateFromPage(page)
    expect(stateAfter.analysis.markers.length).toBe(stateBefore.analysis.markers.length)

    const localKeysAfter = await gfp.getStorageKeys('local')
    expect(localKeysAfter.length).toBeGreaterThan(0)
  })

  // T012 / FR-006 — trainer records skip the expiry gate entirely
  test('trainer record with missing savedAt is NOT discarded', async ({ page }) => {
    const gfp = await gotoFixture(page, '/tests/fixtures/persistent-flag-page.html')

    await addAnalysisMarker(gfp, 200, 150)
    const stateBefore = await getStateFromPage(page)
    expect(stateBefore.analysis.markers.length).toBeGreaterThan(0)

    // Remove savedAt — would expire a student record, but must NOT touch trainer
    const mutated = await mutateStoredRecord(page, 'local', (rec) => {
      delete rec.savedAt
    })
    expect(mutated).toBeGreaterThan(0)

    await reloadAndWait(page)

    const stateAfter = await getStateFromPage(page)
    expect(stateAfter.analysis.markers.length).toBe(stateBefore.analysis.markers.length)

    const localKeysAfter = await gfp.getStorageKeys('local')
    expect(localKeysAfter.length).toBeGreaterThan(0)
  })
})

test.describe('Feature 157: instructor fresh-session override (US2)', () => {
  // T014 / T-E / FR-008 — a fresh session restores no student annotations.
  // (Guards the existing sessionStorage scoping against regression from the
  // new expiry gate; complements the feature-155 new-context test above.)
  test('fresh browser session restores no student annotations', async ({ browser }) => {
    const context1 = await browser.newContext()
    const page1 = await context1.newPage()
    const gfp1 = await gotoFixture(page1, '/tests/fixtures/student-page.html')
    await addAnalysisMarker(gfp1, 200, 150)

    const state1 = await getStateFromPage(page1)
    expect(state1.analysis.markers.length).toBeGreaterThan(0)
    await context1.close()

    // Fresh session — sessionStorage starts empty regardless of the 24h gate
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()
    const gfp2 = await gotoFixture(page2, '/tests/fixtures/student-page.html')

    const state2 = await getStateFromPage(page2)
    expect(state2.analysis.markers.length).toBe(0)

    const keys = await gfp2.getStorageKeys('session')
    expect(keys.length).toBe(0)
    await context2.close()
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
    await reloadAndWait(page)

    // Verify no errors in console that break the component
    const state = await getStateFromPage(page)
    expect(state).not.toBeNull()
    expect(state.mode).toBe('pan')

    // Verify annotations still work (just not persisted)
    const gfp = new GramFramePage(page)
    await addAnalysisMarker(gfp, 200, 150)
    const stateAfter = await getStateFromPage(page)
    expect(stateAfter.analysis.markers.length).toBeGreaterThan(0)
  })

  // T028 — updated for BH-21: an unrecognised version is IGNORED, not deleted.
  // Deleting on read meant one visit from an older build permanently destroyed
  // a newer build's data; the record now stays in storage, unrestored.
  test('stored data with unrecognised schema version is ignored but not deleted', async ({ page }) => {
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

    // Reload — the record must not restore into state...
    await reloadAndWait(page)

    const state = await getStateFromPage(page)
    expect(state.analysis.markers.length).toBe(0)

    // ...but it must still be in storage: it may belong to a newer build.
    const raw = await page.evaluate(() => {
      const key = 'gramframe::' + window.location.pathname
      return localStorage.getItem(key)
    })
    expect(raw).not.toBeNull()
    expect(JSON.parse(/** @type {string} */ (raw)).version).toBe(999)
  })

  // T029
  test('no storage entry until first annotation', async ({ page }) => {
    await page.goto('/tests/fixtures/trainer-page.html')
    await page.evaluate(() => localStorage.clear())

    await reloadAndWait(page)

    // Verify no storage entries yet
    const gfp = new GramFramePage(page)
    const keys = await gfp.getStorageKeys('local')
    expect(keys.length).toBe(0)

    // Add a marker — should now create a storage entry
    await addAnalysisMarker(gfp, 200, 150)

    await expect.poll(async () => (await gfp.getStorageKeys('local')).length).toBeGreaterThan(0)
  })
})

// ──────────────────────────────────────────────────────────────
// August 2026 bug-hunt regressions (docs/Bug-Hunt-2026-08.md)
// ──────────────────────────────────────────────────────────────

test.describe('Bug-hunt regressions: restore validation and save hygiene', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/fixtures/trainer-page.html')
    await page.evaluate(() => localStorage.clear())
  })

  // BH-1 — a stored spacing:0 harmonic set used to hard-hang the page at load
  test('a stored harmonic set with spacing 0 is discarded instead of hanging the page', async ({ page }) => {
    await page.evaluate(() => {
      const key = 'gramframe::' + window.location.pathname
      localStorage.setItem(key, JSON.stringify({
        version: 1,
        savedAt: new Date().toISOString(),
        analysis: { markers: [{ id: 'ok', color: '#ff0000', time: 10, freq: 50 }] },
        harmonics: { harmonicSets: [{ id: 'brick', color: '#00ff00', anchorTime: 30, spacing: 0 }] },
        doppler: { fPlus: null, fMinus: null, fZero: null, color: null }
      }))
    })

    // Without field validation this reload never completes: the pin loop runs
    // h = Infinity; h <= Infinity; h++ forever during init.
    await reloadAndWait(page)

    const state = await getStateFromPage(page)
    expect(state.harmonics.harmonicSets.length).toBe(0)
    // The valid marker in the same record still restores.
    expect(state.analysis.markers.length).toBe(1)
  })

  // BH-5 — merely viewing a gram used to restamp savedAt on every load,
  // resetting the student 24h expiry window indefinitely
  test('loading a page without changing anything does not restamp savedAt', async ({ page }) => {
    const gfp = await gotoFixture(page, '/tests/fixtures/trainer-page.html')
    await addAnalysisMarker(gfp, 200, 150)

    const savedAtBefore = await page.evaluate(() => {
      const key = 'gramframe::' + window.location.pathname
      return JSON.parse(/** @type {string} */ (localStorage.getItem(key))).savedAt
    })
    expect(savedAtBefore).toBeTruthy()

    // A view-only reload: restore runs, nothing is edited.
    await reloadAndWait(page)

    const savedAtAfter = await page.evaluate(() => {
      const key = 'gramframe::' + window.location.pathname
      return JSON.parse(/** @type {string} */ (localStorage.getItem(key))).savedAt
    })
    expect(savedAtAfter).toBe(savedAtBefore)
  })

  // BH-6 / BH-23 — records fingerprinted for a different gram must not restore
  test('a record fingerprinted for a different spectrogram is refused, not restored', async ({ page }) => {
    const gfp = await gotoFixture(page, '/tests/fixtures/trainer-page.html')
    await addAnalysisMarker(gfp, 200, 150)

    // Repoint the stored record at a different image, as republishing the
    // lesson with a new recording at the same path would.
    const mutated = await mutateStoredRecord(page, 'local', (rec) => {
      rec.gram = { ...(rec.gram || {}), image: 'a-different-recording.png' }
    })
    expect(mutated).toBeGreaterThan(0)

    await reloadAndWait(page)

    const state = await getStateFromPage(page)
    expect(state.analysis.markers.length).toBe(0)

    // Refused means left alone: the record still exists for whichever page it
    // belongs to.
    const gfp2 = new GramFramePage(page)
    expect((await gfp2.getStorageKeys('local')).length).toBeGreaterThan(0)
    void gfp
  })

  // H1 — the pin toggle is a persisted restyle and must survive a reload
  test('hiding the pin of a selected harmonic set survives a reload', async ({ page }) => {
    const gfp = await gotoFixture(page, '/tests/fixtures/trainer-page.html')
    await addHarmonicSet(gfp, 200, 150, 250, 150)

    // The freshly created set is auto-selected; restyle it through the same
    // seam the Symbol panel's pin toggle uses.
    const applied = await page.evaluate(() => {
      // @ts-ignore test-only global
      const instance = window.GramFrame.__test__getInstances()[0]
      return instance.interaction.applyPinToSelectedFeature(false)
    })
    expect(applied).toBe(true)

    await expect.poll(async () => page.evaluate(() => {
      const key = 'gramframe::' + window.location.pathname
      const raw = localStorage.getItem(key)
      if (!raw) return null
      return JSON.parse(raw).harmonics.harmonicSets[0]?.showPin
    })).toBe(false)

    await reloadAndWait(page)

    const state = await getStateFromPage(page)
    expect(state.harmonics.harmonicSets.length).toBe(1)
    expect(state.harmonics.harmonicSets[0].showPin).toBe(false)
  })

  // BH-15 — a restored doppler curve used to read speed 0.0 until nudged
  test('a restored doppler curve has its speed recomputed on load', async ({ page }) => {
    const gfp = await gotoFixture(page, '/tests/fixtures/trainer-page.html')

    await page.locator('.gram-frame-mode-btn[title="Doppler" i]').click()
    await waitForPageState(page, (s) => s.mode === 'doppler', 'doppler mode')

    // Place a real curve with distinct f+/f- frequencies (diagonal drag).
    const svgBox = await gfp.svg.boundingBox()
    if (!svgBox) throw new Error('SVG not found')
    await page.mouse.move(svgBox.x + 150, svgBox.y + 100)
    await page.mouse.down()
    await page.mouse.move(svgBox.x + 250, svgBox.y + 200, { steps: 5 })
    await page.mouse.up()
    await waitForPageState(
      page,
      (s) => s.doppler.fPlus !== null && s.doppler.fMinus !== null && s.doppler.fZero !== null,
      'a complete doppler curve'
    )

    const stateBefore = await getStateFromPage(page)
    expect(typeof stateBefore.doppler.speed).toBe('number')

    await reloadAndWait(page)

    const stateAfter = await getStateFromPage(page)
    expect(typeof stateAfter.doppler.speed).toBe('number')
    expect(stateAfter.doppler.speed).toBeCloseTo(stateBefore.doppler.speed, 3)
  })
})


// ──────────────────────────────────────────────────────────────
// R9-01 (issue #253) — a load that does not restore what was stored says so
// ──────────────────────────────────────────────────────────────

const WARNING = '.gram-frame-storage-warning'
const WARNING_TEXT = '.gram-frame-storage-warning-message'

/**
 * Helper: write a raw string into the record this page would read.
 * @param {import('@playwright/test').Page} page
 * @param {string} raw - Exactly what goes into storage
 * @returns {Promise<void>}
 */
async function writeRawRecord(page, raw) {
  await page.evaluate((value) => {
    localStorage.setItem('gramframe::' + window.location.pathname, value)
  }, raw)
}

test.describe('Load refusals are visible, not console-only (R9-01)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/fixtures/trainer-page.html')
    await page.evaluate(() => localStorage.clear())
  })

  test('an unreadable record raises the banner and is left in storage', async ({ page }) => {
    await writeRawRecord(page, 'not json{')
    await reloadAndWait(page)

    await expect(page.locator(WARNING)).toHaveCount(1)
    await expect(page.locator(WARNING_TEXT)).toContainText('could not be read')
    // The analyst's immediate question — is it gone? — is answered.
    await expect(page.locator(WARNING_TEXT)).toContainText('left in browser storage')

    const raw = await page.evaluate(() => localStorage.getItem('gramframe::' + window.location.pathname))
    expect(raw).toBe('not json{')
  })

  test('a record from a different build raises the banner', async ({ page }) => {
    await writeRawRecord(page, JSON.stringify({
      version: 999,
      savedAt: new Date().toISOString(),
      analysis: { markers: [{ id: 'old', color: '#ff0000', time: 10, freq: 50 }] },
      harmonics: { harmonicSets: [] },
      doppler: { fPlus: null, fMinus: null, fZero: null, color: null }
    }))
    await reloadAndWait(page)

    await expect(page.locator(WARNING)).toHaveCount(1)
    await expect(page.locator(WARNING_TEXT)).toContainText('different version')

    const state = await getStateFromPage(page)
    expect(state.analysis.markers.length).toBe(0)
  })

  test('a record fingerprinted for another gram raises the banner', async ({ page }) => {
    const gfp = await gotoFixture(page, '/tests/fixtures/trainer-page.html')
    await addAnalysisMarker(gfp, 200, 150)
    await expect(page.locator(WARNING)).toHaveCount(0)

    const mutated = await mutateStoredRecord(page, 'local', (rec) => {
      rec.gram = { ...(rec.gram || {}), image: 'a-different-recording.png' }
    })
    expect(mutated).toBeGreaterThan(0)

    await reloadAndWait(page)

    await expect(page.locator(WARNING)).toHaveCount(1)
    await expect(page.locator(WARNING_TEXT)).toContainText('different spectrogram')
    await expect(page.locator(WARNING_TEXT)).toContainText('left in browser storage')
  })

  test('a partially restored record says how many entries were skipped', async ({ page }) => {
    await writeRawRecord(page, JSON.stringify({
      version: 1,
      savedAt: new Date().toISOString(),
      analysis: { markers: [{ id: 'ok', color: '#ff0000', time: 10, freq: 50 }] },
      harmonics: { harmonicSets: [{ id: 'bad', color: '#00ff00', anchorTime: 30, spacing: 0 }] },
      doppler: { fPlus: null, fMinus: null, fZero: null, color: null }
    }))
    await reloadAndWait(page)

    await expect(page.locator(WARNING)).toHaveCount(1)
    await expect(page.locator(WARNING_TEXT)).toContainText('1 saved annotation could not be restored')

    // The rest really did restore — the banner is a report, not a refusal.
    const state = await getStateFromPage(page)
    expect(state.analysis.markers.length).toBe(1)
    expect(state.harmonics.harmonicSets.length).toBe(0)
  })

  test('an expired student record says so instead of showing an empty gram', async ({ page }) => {
    await page.goto('/tests/fixtures/student-page.html')
    await page.evaluate(() => sessionStorage.clear())
    const gfp = await gotoFixture(page, '/tests/fixtures/student-page.html')
    await addAnalysisMarker(gfp, 200, 150)

    const mutated = await mutateStoredRecord(page, 'session', (rec) => {
      rec.savedAt = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    })
    expect(mutated).toBeGreaterThan(0)

    await reloadAndWait(page)

    await expect(page.locator(WARNING)).toHaveCount(1)
    await expect(page.locator(WARNING_TEXT)).toContainText('more than 24 hours old')
  })

  test('a clean restore, and a first load with nothing stored, stay silent', async ({ page }) => {
    // Nothing stored at all.
    await reloadAndWait(page)
    await expect(page.locator(WARNING)).toHaveCount(0)

    // A record that restores in full.
    const gfp = new GramFramePage(page)
    await addAnalysisMarker(gfp, 200, 150)
    await reloadAndWait(page)

    const state = await getStateFromPage(page)
    expect(state.analysis.markers.length).toBe(1)
    await expect(page.locator(WARNING)).toHaveCount(0)
  })

  test('the banner clears once the analyst saves over the refused record', async ({ page }) => {
    await writeRawRecord(page, 'not json{')
    await reloadAndWait(page)
    await expect(page.locator(WARNING)).toHaveCount(1)

    const gfp = new GramFramePage(page)
    await addAnalysisMarker(gfp, 200, 150)

    // A successful save is the point at which the analyst has knowingly
    // started again; the stale "not restored" notice must not outlive it.
    await expect(page.locator(WARNING)).toHaveCount(0)
  })
})
