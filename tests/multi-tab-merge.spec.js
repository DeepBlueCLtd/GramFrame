import { test, expect } from '@playwright/test'
import { GramFramePage } from './helpers/gram-frame-page.js'

/**
 * @fileoverview Two trainer tabs on one page (R9-18, issue #269).
 *
 * Two pages in the same Playwright browser context share an origin, so they
 * share `localStorage` and fire `storage` events at each other — the same way
 * two real tabs do. That makes this the actual defect reproduced, not a
 * simulation of it: before merging, tab B's save erased the markers tab A had
 * added, silently.
 */

const TRAINER = '/tests/fixtures/trainer-page.html'

/**
 * Open a tab on the trainer fixture and wait for the component.
 * @param {import('@playwright/test').BrowserContext} context
 * @returns {Promise<{page: import('@playwright/test').Page, gfp: GramFramePage}>}
 */
async function openTab(context) {
  const page = await context.newPage()
  await page.goto(TRAINER)
  await page.locator('.gram-frame-container').waitFor()
  const gfp = new GramFramePage(page)
  await gfp.waitForState(() => true, { message: 'the component to publish state' })
  return { page, gfp }
}

/**
 * The marker ids in a tab's live state.
 * @param {GramFramePage} gfp
 * @returns {Promise<string[]>} Sorted ids
 */
async function markerIds(gfp) {
  const state = await gfp.getState()
  return (state.analysis?.markers ?? []).map((/** @type {any} */ m) => m.id).sort()
}

/**
 * The marker ids in the stored record.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string[]>} Sorted ids
 */
async function storedMarkerIds(page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('gramframe::' + window.location.pathname)
    if (!raw) return []
    return (JSON.parse(raw).analysis?.markers ?? []).map((/** @type {any} */ m) => m.id).sort()
  })
}

test.describe('Two tabs on the same gram (R9-18)', () => {
  test('a save in one tab does not erase the other tab\'s markers', async ({ context }) => {
    const a = await openTab(context)
    await a.page.evaluate(() => localStorage.clear())

    const b = await openTab(context)

    const fromA = await a.gfp.addMarker(10, 20)
    await expect.poll(() => storedMarkerIds(a.page)).toEqual([fromA])

    // Tab B knew nothing about A's marker when it loaded. Its save used to
    // write its own state over the whole record.
    const fromB = await b.gfp.addMarker(30, 40)

    await expect
      .poll(() => storedMarkerIds(b.page), { message: 'both tabs\' markers to be in the record' })
      .toEqual([fromA, fromB].sort())
  })

  test('the tab that did not save catches up without a reload', async ({ context }) => {
    const a = await openTab(context)
    await a.page.evaluate(() => localStorage.clear())
    const b = await openTab(context)

    const fromB = await b.gfp.addMarker(30, 40)

    // A is not the tab that saved: it learns through the `storage` event.
    await expect
      .poll(() => markerIds(a.gfp), { message: 'tab A to adopt tab B\'s marker' })
      .toContain(fromB)
  })

  test('both tabs converge on the union after each has added one', async ({ context }) => {
    const a = await openTab(context)
    await a.page.evaluate(() => localStorage.clear())
    const b = await openTab(context)

    const fromA = await a.gfp.addMarker(10, 20)
    const fromB = await b.gfp.addMarker(30, 40)
    const both = [fromA, fromB].sort()

    await expect.poll(() => markerIds(a.gfp), { message: 'tab A to hold both' }).toEqual(both)
    await expect.poll(() => markerIds(b.gfp), { message: 'tab B to hold both' }).toEqual(both)
  })

  test('a deletion in one tab is not undone by the other', async ({ context }) => {
    // The case a plain union gets wrong: without tombstones, B still holds the
    // marker A deleted and merges it straight back in.
    const a = await openTab(context)
    await a.page.evaluate(() => localStorage.clear())

    const doomed = await a.gfp.addMarker(10, 20)
    const b = await openTab(context)
    await expect.poll(() => markerIds(b.gfp)).toEqual([doomed])

    await a.page.evaluate((id) => {
      const analysis = /** @type {any} */ (window.GramFrame.__test__getInstances()[0].modes['analysis'])
      analysis.removeMarker(id)
    }, doomed)
    await a.gfp.waitForMarkerCount(0)

    await expect
      .poll(() => storedMarkerIds(a.page), { message: 'the deletion to reach the record' })
      .toEqual([])

    // B saves next, still holding its stale copy. The tombstone is what stops
    // it coming back.
    const fresh = await b.gfp.addMarker(50, 60)
    await expect
      .poll(() => storedMarkerIds(b.page), { message: 'the deleted marker to stay deleted' })
      .toEqual([fresh])
  })

  test('a harmonic set added in each tab survives both saves', async ({ context }) => {
    const a = await openTab(context)
    await a.page.evaluate(() => localStorage.clear())
    const b = await openTab(context)

    const fromA = await a.gfp.addHarmonicSet(10, 12)
    const fromB = await b.gfp.addHarmonicSet(30, 20)

    const stored = await b.page.evaluate(() => {
      const raw = localStorage.getItem('gramframe::' + window.location.pathname)
      return (JSON.parse(raw ?? '{}').harmonics?.harmonicSets ?? []).map((/** @type {any} */ h) => h.id).sort()
    })
    expect(stored).toEqual([fromA, fromB].sort())
  })

  // The two mechanisms are independent, and each needs proving on its own.
  // Writing to `localStorage` from a page does NOT fire a `storage` event in
  // that same page, so planting a record and then saving exercises the
  // read-merge-write in `saveAnnotations` with the live listener out of the
  // picture entirely.
  test('a save merges with a record the tab never saw — no storage event involved', async ({ context }) => {
    const a = await openTab(context)
    await a.page.evaluate(() => localStorage.clear())
    const mine = await a.gfp.addMarker(10, 20)

    const planted = await a.page.evaluate(() => {
      const key = 'gramframe::' + window.location.pathname
      const record = JSON.parse(localStorage.getItem(key) ?? '{}')
      record.analysis.markers.push({ id: 'unseen', color: '#123456', time: 5, freq: 5, symbol: 'cross' })
      record.savedAt = new Date(Date.now() - 60000).toISOString()
      localStorage.setItem(key, JSON.stringify(record))
      return 'unseen'
    })

    // This tab still knows nothing about it: same-page writes fire no event.
    expect(await markerIds(a.gfp)).toEqual([mine])

    // Its next save must not overwrite what it never saw.
    const second = await a.gfp.addMarker(40, 50)
    await expect
      .poll(() => storedMarkerIds(a.page), { message: 'the unseen marker to survive the save' })
      .toEqual([mine, planted, second].sort())
  })

  test('a save carries this tab\'s deletions into a record it never saw', async ({ context }) => {
    const a = await openTab(context)
    await a.page.evaluate(() => localStorage.clear())

    const doomed = await a.gfp.addMarker(10, 20)
    await a.page.evaluate((id) => {
      const analysis = /** @type {any} */ (window.GramFrame.__test__getInstances()[0].modes['analysis'])
      analysis.removeMarker(id)
    }, doomed)
    await a.gfp.waitForMarkerCount(0)

    // Plant a record that still holds the deleted marker, as a stale tab's
    // save would leave behind.
    await a.page.evaluate((id) => {
      const key = 'gramframe::' + window.location.pathname
      const record = JSON.parse(localStorage.getItem(key) ?? '{}')
      record.analysis.markers = [{ id, color: '#123456', time: 10, freq: 20, symbol: 'cross' }]
      record.tombstones = { markers: {}, harmonicSets: {}, sidebandSets: {}, doppler: null }
      record.savedAt = new Date(Date.now() - 60000).toISOString()
      localStorage.setItem(key, JSON.stringify(record))
    }, doomed)

    const fresh = await a.gfp.addMarker(40, 50)
    await expect
      .poll(() => storedMarkerIds(a.page), { message: 'the deletion to win over the planted copy' })
      .toEqual([fresh])
  })

  test('another tab\'s record for a different gram is ignored', async ({ context }) => {
    // The load path refuses a foreign fingerprint (BH-6, BH-23); adopting one
    // live would be the same mistake with a different route in.
    const a = await openTab(context)
    await a.page.evaluate(() => localStorage.clear())
    const mine = await a.gfp.addMarker(10, 20)

    await a.page.evaluate(() => {
      const key = 'gramframe::' + window.location.pathname
      const record = JSON.parse(localStorage.getItem(key) ?? '{}')
      window.dispatchEvent(new StorageEvent('storage', {
        key,
        newValue: JSON.stringify({
          ...record,
          gram: { ...record.gram, image: 'a-different-recording.png' },
          analysis: { markers: [{ id: 'foreign', color: '#123456', time: 1, freq: 2, symbol: 'cross' }] }
        })
      }))
    })

    expect(await markerIds(a.gfp)).toEqual([mine])
  })
})
