import { test, expect } from '@playwright/test'
import { GramFramePage } from './helpers/gram-frame-page.js'

/**
 * Acceptance tests for feature 156 — Expand Image Toggle.
 * Exercised against the Pub-10 demonstrator pages at a fixed viewport.
 */

const LANDSCAPE_PAGE = '/sample/pub10-gram1.html'
const VERNIER_PAGE = '/sample/pub10-vernier.html'

/**
 * Navigate to a demonstrator page and wait for GramFrame to initialise with
 * its image dimensions populated.
 * @param {import('@playwright/test').Page} page
 * @param {string} path
 * @returns {Promise<GramFramePage>}
 */
async function gotoDemo(page, path) {
  const gfp = new GramFramePage(page)
  // Wide viewport so the landscape gram has real horizontal slack to fill.
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(path)
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
 * Compute the available render size the implementation should target, from the
 * live DOM/viewport (mirrors the production formula).
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<{width: number, height: number}>}
 */
async function computeAvailable(page) {
  return page.evaluate(() => {
    const cell = document.querySelector('.gram-frame-main-panel')
    const svg = document.querySelector('.gram-frame-svg')
    const image = document.querySelector('.gram-frame-spectrogram-image')
    const cs = window.getComputedStyle(cell)
    const ss = window.getComputedStyle(svg)
    const padL = parseFloat(cs.paddingLeft)
    const padR = parseFloat(cs.paddingRight)
    const svgBorderX = parseFloat(ss.borderLeftWidth) + parseFloat(ss.borderRightWidth)
    const margins = { left: 60, right: 15, top: 15, bottom: 50 }
    const width = cell.clientWidth - padL - padR - svgBorderX - margins.left - margins.right
    const svgRect = svg.getBoundingClientRect()
    const imageTopViewport = svgRect.top + margins.top
    const height = window.innerHeight - imageTopViewport - margins.bottom - 16
    return { width, height }
  })
}

test.describe('Expand Image Toggle — User Story 1', () => {
  test('SC-001/SC-002: expanded image fills available width and height', async ({ page }) => {
    const gfp = await gotoDemo(page, LANDSCAPE_PAGE)

    expect(await gfp.isExpandToggleVisible()).toBe(true)

    await gfp.clickExpandToggle()

    // Measure available space in the settled expanded layout (after any page
    // scrollbar has appeared), then compare to the rendered image size.
    const expected = await computeAvailable(page)
    const rendered = await gfp.getRenderedImageSize()
    expect(rendered.width).toBeGreaterThan(902) // grew beyond natural width
    expect(Math.abs(rendered.width - expected.width)).toBeLessThanOrEqual(2)
    expect(Math.abs(rendered.height - expected.height)).toBeLessThanOrEqual(2)
  })

  test('SC-003: axis label font size unchanged after expand', async ({ page }) => {
    const gfp = await gotoDemo(page, LANDSCAPE_PAGE)

    const before = await gfp.getAxisLabelFontSize()
    await gfp.clickExpandToggle()
    const after = await gfp.getAxisLabelFontSize()

    expect(before).toBeGreaterThan(0)
    expect(after).toBe(before)
  })

  test('SC-006: collapse restores exact original natural dimensions', async ({ page }) => {
    const gfp = await gotoDemo(page, LANDSCAPE_PAGE)

    const state0 = await gfp.getState()
    const naturalWidth = state0.imageDetails.naturalWidth
    const naturalHeight = state0.imageDetails.naturalHeight

    const original = await gfp.getRenderedImageSize()
    expect(original.width).toBe(naturalWidth)
    expect(original.height).toBe(naturalHeight)

    await gfp.clickExpandToggle() // expand
    await gfp.clickExpandToggle() // collapse

    const restored = await gfp.getRenderedImageSize()
    expect(restored.width).toBe(naturalWidth)
    expect(restored.height).toBe(naturalHeight)

    const state1 = await gfp.getState()
    expect(state1.imageDetails.renderWidth).toBe(naturalWidth)
    expect(state1.imageDetails.renderHeight).toBe(naturalHeight)
    expect(state1.imageExpanded).toBe(false)
  })
})

test.describe('Expand Image Toggle — User Story 3 (portrait guard)', () => {
  test('SC-005: no toggle for portrait vernier, toggle present for landscape', async ({ page }) => {
    const landscape = await gotoDemo(page, LANDSCAPE_PAGE)
    expect(await landscape.isExpandToggleVisible()).toBe(true)

    const portrait = await gotoDemo(page, VERNIER_PAGE)
    expect(await portrait.isExpandToggleVisible()).toBe(false)
  })
})

test.describe('Expand Image Toggle — User Story 2 (annotation fidelity)', () => {
  test('SC-004: a known pixel reports the same freq/time before and after expand', async ({ page }) => {
    const gfp = await gotoDemo(page, LANDSCAPE_PAGE)

    // Hover a point well inside the image region
    const before = await gfp.readDataAtPixel(300, 120)
    expect(before).not.toBeNull()

    await gfp.clickExpandToggle()

    // After expand, find the screen pixel mapping to the same data point and
    // verify the reported data matches. We sample the same data coordinate by
    // hovering the corresponding rendered position.
    const state = await gfp.getState()
    const { renderWidth, renderHeight, naturalWidth, naturalHeight } = state.imageDetails
    const margins = { left: 60, top: 15 }
    // Original pixel (300,120) in image space -> data ratios using natural dims
    const fx = (300 - margins.left) / naturalWidth
    const fy = (120 - margins.top) / naturalHeight
    const newX = margins.left + fx * renderWidth
    const newY = margins.top + fy * renderHeight

    const after = await gfp.readDataAtPixel(newX, newY)
    // Coordinate fidelity within integer-pixel hover precision (data ranges are
    // 200 Hz over ~902px and 40 s over ~237px natural).
    expect(after).not.toBeNull()
    expect(Math.abs(after.freq - before.freq)).toBeLessThan(1)
    expect(Math.abs(after.time - before.time)).toBeLessThan(0.5)
  })

  test('SC-007: an analysis marker returns to its data coordinates after expand→collapse', async ({ page }) => {
    const gfp = await gotoDemo(page, LANDSCAPE_PAGE)

    // Place an analysis marker
    await page.locator('.gram-frame-mode-btn:text("Cross Cursor")').click()
    await page.waitForTimeout(150)
    await gfp.svg.click({ position: { x: 320, y: 130 } })
    await page.waitForTimeout(200)

    const s0 = await gfp.getState()
    expect(s0.analysis.markers.length).toBeGreaterThan(0)
    const m0 = s0.analysis.markers[0]

    await gfp.clickExpandToggle() // expand
    await gfp.clickExpandToggle() // collapse

    const s1 = await gfp.getState()
    const m1 = s1.analysis.markers[0]
    expect(Math.abs(m1.freq - m0.freq)).toBeLessThan(0.5)
    expect(Math.abs(m1.time - m0.time)).toBeLessThan(0.1)
  })
})
