import { test, expect } from '@playwright/test'
import { GramFramePage } from './helpers/gram-frame-page.js'

/**
 * Acceptance tests for the fixed-height, scrolling markers/harmonics tables.
 *
 * The panels must keep a constant height however many rows they hold: growing
 * tables previously pushed the readout row taller (untidy layout) and stole
 * vertical space from an expanded spectrogram image. The table body scrolls
 * instead, with the header row pinned outside the scroll.
 */

const LANDSCAPE_PAGE = '/sample/pub10-gram1.html'

/** How many rows to add — comfortably more than any panel can show at once. */
const MANY_ROWS = 15

const MARKERS_TABLE = '.gram-frame-middle-column .gram-frame-table-container'
const HARMONICS_TABLE = '.gram-frame-right-column .gram-frame-table-container'

/**
 * Navigate to the demonstrator page and wait for GramFrame to initialise.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<GramFramePage>}
 */
async function gotoDemo(page) {
  const gfp = new GramFramePage(page)
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(LANDSCAPE_PAGE)
  await page.locator('.gram-frame-container').waitFor({ timeout: 10000 })
  await page.waitForFunction(() => {
    const sd = document.getElementById('state-display')
    if (!sd || !sd.textContent) return false
    try {
      const s = JSON.parse(sd.textContent)
      return s.imageDetails && s.imageDetails.naturalWidth > 0
    } catch {
      return false
    }
  }, {}, { timeout: 10000 })
  return gfp
}

/**
 * Bounding-box height of an element, rounded.
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 * @returns {Promise<number>}
 */
async function heightOf(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    return el ? Math.round(el.getBoundingClientRect().height) : -1
  }, selector)
}

/**
 * Top edge of the spectrogram SVG in viewport coordinates, rounded.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<number>}
 */
async function svgTop(page) {
  return page.evaluate(() => Math.round(document.querySelector('.gram-frame-svg').getBoundingClientRect().top))
}

/**
 * Add markers and harmonic sets to both panels.
 * @param {GramFramePage} gfp
 * @param {number} count - How many of each to add
 * @returns {Promise<void>}
 */
async function fillBothPanels(gfp, count) {
  for (let i = 0; i < count; i++) {
    await gfp.addMarker(i * 2, 100 + i * 10)
    await gfp.addHarmonicSet(i * 2, 50 + i * 5)
  }
  // Both tables have rendered a row per feature — the condition the rows were
  // added for, rather than a guess at how long rendering takes.
  await gfp.waitForTableRowCount('markers', count)
  await gfp.waitForTableRowCount('harmonics', count)
}

/**
 * Select a feature the way clicking it on the gram does — through the
 * instance's selection API rather than through its table row, which is the
 * case the row could be off-screen for.
 * @param {import('@playwright/test').Page} page
 * @param {string} type - Selection type, e.g. 'harmonicSet'
 * @param {string} id - Feature id
 * @param {number} index - Row index, for display purposes
 * @returns {Promise<void>}
 */
async function selectFeature(page, type, id, index) {
  await page.evaluate(([featureType, featureId, featureIndex]) => {
    // @ts-ignore - test-only global
    const instance = window.GramFrame.__test__getInstances()[0]
    instance.interaction.setSelection(featureType, featureId, featureIndex)
  }, [type, id, index])
}

/**
 * Where the selected row sits relative to the scrollport and the sticky header.
 * @param {import('@playwright/test').Page} page
 * @param {string} selector - Scroll container selector
 * @returns {Promise<{overflowing: boolean, rowTop: number, rowBottom: number, headerBottom: number, viewportBottom: number}>}
 */
async function selectedRowPosition(page, selector) {
  return page.evaluate((sel) => {
    const container = document.querySelector(sel)
    const row = container.querySelector('tbody tr.gram-frame-selected-row')
    const containerBox = container.getBoundingClientRect()
    const headerBox = container.querySelector('thead th').getBoundingClientRect()
    const rowBox = row.getBoundingClientRect()
    return {
      overflowing: container.scrollHeight > container.clientHeight,
      rowTop: rowBox.top,
      rowBottom: rowBox.bottom,
      headerBottom: headerBox.bottom,
      // clientTop is the container's top border, which sits outside the
      // scrollport that clientHeight measures.
      viewportBottom: containerBox.top + container.clientTop + container.clientHeight
    }
  }, selector)
}

test.describe('Markers/harmonics tables: fixed height with a scrolling body', () => {
  test('panel heights and the image position are unchanged as rows are added', async ({ page }) => {
    const gfp = await gotoDemo(page)

    const before = {
      markers: await heightOf(page, MARKERS_TABLE),
      harmonics: await heightOf(page, HARMONICS_TABLE),
      layout: await heightOf(page, '.gram-frame-unified-layout'),
      svgTop: await svgTop(page)
    }
    expect(before.markers).toBeGreaterThan(0)

    await fillBothPanels(gfp, MANY_ROWS)

    expect(await heightOf(page, MARKERS_TABLE)).toBe(before.markers)
    expect(await heightOf(page, HARMONICS_TABLE)).toBe(before.harmonics)
    expect(await heightOf(page, '.gram-frame-unified-layout')).toBe(before.layout)
    expect(await svgTop(page)).toBe(before.svgTop)
  })

  test('each table body has a permanent scrollbar and scrolls once it overflows', async ({ page }) => {
    const gfp = await gotoDemo(page)

    for (const selector of [MARKERS_TABLE, HARMONICS_TABLE]) {
      const overflowY = await page.evaluate(
        (sel) => window.getComputedStyle(document.querySelector(sel)).overflowY,
        selector
      )
      expect(overflowY).toBe('scroll')
    }

    await fillBothPanels(gfp, MANY_ROWS)

    for (const selector of [MARKERS_TABLE, HARMONICS_TABLE]) {
      const metrics = await page.evaluate((sel) => {
        const el = document.querySelector(sel)
        el.scrollTop = 1000
        return { scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, scrollTop: el.scrollTop }
      }, selector)

      // Content overflows, and the body really did scroll
      expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight)
      expect(metrics.scrollTop).toBeGreaterThan(0)
    }
  })

  test('rows keep the height they start with as more are added', async ({ page }) => {
    const gfp = await gotoDemo(page)

    /** First row's height after each addition. */
    const heights = []
    for (let i = 0; i < 6; i++) {
      await gfp.addMarker(i * 2, 100 + i * 10)
      await gfp.waitForTableRowCount('markers', i + 1)
      heights.push(await page.evaluate((sel) => {
        const row = document.querySelector(`${sel} tbody tr`)
        return Math.round(row.getBoundingClientRect().height)
      }, MARKERS_TABLE))
    }

    // One row and six rows are the same height. They used to shrink with every
    // addition — the table inherited `height: 100%` from the class the outer
    // frame also uses, so it shared the container's surplus out across however
    // many rows there happened to be.
    expect(new Set(heights).size).toBe(1)
  })

  test('a newly added row is scrolled into view once the table overflows', async ({ page }) => {
    const gfp = await gotoDemo(page)
    await fillBothPanels(gfp, MANY_ROWS)

    for (const selector of [MARKERS_TABLE, HARMONICS_TABLE]) {
      const metrics = await page.evaluate((sel) => {
        const container = document.querySelector(sel)
        const rows = container.querySelectorAll('tbody tr')
        const last = rows[rows.length - 1]
        return {
          overflowing: container.scrollHeight > container.clientHeight,
          lastRowBottom: last.offsetTop + last.offsetHeight,
          viewportBottom: container.scrollTop + container.clientHeight
        }
      }, selector)

      // There is more content than fits...
      expect(metrics.overflowing).toBe(true)
      // ...and the row just added is inside the visible band, not below it.
      expect(metrics.lastRowBottom).toBeLessThanOrEqual(metrics.viewportBottom + 1)
    }
  })

  test('selecting a harmonic set off-screen scrolls its row into view', async ({ page }) => {
    const gfp = await gotoDemo(page)
    await fillBothPanels(gfp, MANY_ROWS)

    const sets = (await gfp.getState()).harmonics.harmonicSets

    // Filling left the table auto-scrolled to the newest set, so the FIRST set
    // is above the fold. Selecting it — as clicking its pins on the gram does —
    // must bring its row back into view (scrolling up).
    await selectFeature(page, 'harmonicSet', sets[0].id, 0)
    await gfp.waitForSelectedRow('harmonics', sets[0].id)
    const first = await selectedRowPosition(page, HARMONICS_TABLE)
    expect(first.overflowing).toBe(true)
    expect(first.rowTop).toBeGreaterThanOrEqual(first.headerBottom - 1)
    expect(first.rowBottom).toBeLessThanOrEqual(first.viewportBottom + 1)

    // ...and selecting the LAST set from there scrolls back down to it.
    const last = sets[sets.length - 1]
    await selectFeature(page, 'harmonicSet', last.id, sets.length - 1)
    await gfp.waitForSelectedRow('harmonics', last.id)
    const lastPosition = await selectedRowPosition(page, HARMONICS_TABLE)
    expect(lastPosition.rowTop).toBeGreaterThanOrEqual(lastPosition.headerBottom - 1)
    expect(lastPosition.rowBottom).toBeLessThanOrEqual(lastPosition.viewportBottom + 1)
  })

  test('a selected row already in view does not move the table', async ({ page }) => {
    const gfp = await gotoDemo(page)
    await fillBothPanels(gfp, MANY_ROWS)

    const sets = (await gfp.getState()).harmonics.harmonicSets
    await selectFeature(page, 'harmonicSet', sets[0].id, 0)
    await gfp.waitForSelectedRow('harmonics', sets[0].id)

    // The analyst nudges the scroll by hand; the selected row is still visible,
    // so a re-render for an unrelated reason must leave the position alone.
    const scrollTop = await page.evaluate((sel) => {
      const container = document.querySelector(sel)
      container.scrollTop += 5
      return container.scrollTop
    }, HARMONICS_TABLE)

    await page.evaluate(() => {
      // @ts-ignore - test-only global
      const instance = window.GramFrame.__test__getInstances()[0]
      instance.modes['harmonics'].refreshPanel()
    })

    expect(await page.evaluate((sel) => document.querySelector(sel).scrollTop, HARMONICS_TABLE))
      .toBe(scrollTop)
  })

  test('scrolling back up is not undone by an update that adds no rows', async ({ page }) => {
    const gfp = await gotoDemo(page)
    await fillBothPanels(gfp, MANY_ROWS)

    // Auto-scroll left both tables at the bottom; the analyst scrolls back up.
    await page.evaluate((sel) => { document.querySelector(sel).scrollTop = 0 }, MARKERS_TABLE)

    // Selecting a row re-renders the table. Nothing was added, so the scroll
    // position is the analyst's to keep. The helper waits on the selection
    // reaching broadcast state, so the re-render has happened by the time the
    // scroll position is read.
    const markers = (await gfp.getState()).analysis.markers
    await gfp.clickTableRow('markers', markers[0].id)

    expect(await page.evaluate((sel) => document.querySelector(sel).scrollTop, MARKERS_TABLE)).toBe(0)
  })

  test('the header row stays pinned while the body scrolls under it', async ({ page }) => {
    const gfp = await gotoDemo(page)
    await fillBothPanels(gfp, MANY_ROWS)

    for (const selector of [MARKERS_TABLE, HARMONICS_TABLE]) {
      const result = await page.evaluate((sel) => {
        const container = document.querySelector(sel)
        const table = container.querySelector('.gram-frame-table')
        // The sticky boxes are the header cells themselves
        const headerCell = table.tHead.rows[0].cells[1]
        const containerTop = container.getBoundingClientRect().top

        // Start from the top: filling the panels leaves the body auto-scrolled
        // to the newest row, and this test is about scrolling DOWN from rest.
        container.scrollTop = 0
        const headerTopBefore = headerCell.getBoundingClientRect().top
        const firstRowBefore = table.tBodies[0].rows[0].getBoundingClientRect().top

        container.scrollTop = 60

        return {
          containerTop,
          headerTopBefore,
          headerTopAfter: headerCell.getBoundingClientRect().top,
          headerHeight: headerCell.getBoundingClientRect().height,
          firstRowBefore,
          firstRowAfter: table.tBodies[0].rows[0].getBoundingClientRect().top
        }
      }, selector)

      // Header did not move (it is not part of the scrolled content)
      expect(Math.abs(result.headerTopAfter - result.headerTopBefore)).toBeLessThanOrEqual(1)
      // ...and it is still pinned to the top of the scroll container
      expect(result.headerTopAfter - result.containerTop).toBeLessThanOrEqual(3)
      // The body content did scroll
      expect(result.firstRowBefore - result.firstRowAfter).toBeGreaterThan(50)
    }
  })

  test('an expanded image keeps its size as rows are added', async ({ page }) => {
    const gfp = await gotoDemo(page)

    await gfp.clickExpandToggle()

    const expanded = await gfp.getState()
    expect(expanded.imageExpanded).toBe(true)
    const renderHeightBefore = expanded.imageDetails.renderHeight

    await fillBothPanels(gfp, MANY_ROWS)

    const after = await gfp.getState()
    expect(after.imageDetails.renderHeight).toBe(renderHeightBefore)
  })
})
