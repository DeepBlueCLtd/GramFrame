import { test, expect } from './helpers/fixtures.js'

/**
 * @fileoverview Cross-input coordinate agreement (spec 166, AS-2.4 / SC-003).
 *
 * The Vitest grid proves the canonical module reproduces the four
 * implementations it replaced, but it runs against stubs. This spec is the
 * real-browser half: for the same physical point, mouse, rendering, keyboard
 * and wheel-zoom must all report the same data coordinates, at every
 * zoom × expand combination.
 *
 * The lever is a placed marker. Its data coordinates are authoritative, its
 * rendered centre is where the pipeline says those coordinates belong, and
 * hovering that centre asks the pipeline the inverse question. If any leg
 * disagreed, the answers would diverge.
 */

/** Agreement tolerances, in data units, at the demo page's ranges */
const FREQ_TOLERANCE = 2
const TIME_TOLERANCE = 0.5

/**
 * The SVG-element-relative CSS pixel a marker's centre is rendered at.
 *
 * Read from the marker's centre circle, converted out of viewBox units, so the
 * result is directly hoverable.
 * @param {import('@playwright/test').Page} page
 * @param {string} markerId
 * @returns {Promise<{x: number, y: number}|null>} Hoverable pixel, or null if not rendered
 */
async function markerRenderedPixel(page, markerId) {
  return page.evaluate((id) => {
    const group = document.querySelector(`.gram-frame-analysis-marker[data-marker-id="${id}"]`)
    if (!group) return null
    const circle = group.querySelector('circle')
    if (!circle) return null

    const svg = document.querySelector('.gram-frame-svg')
    const rect = svg.getBoundingClientRect()
    const viewBox = svg.viewBox.baseVal
    const style = window.getComputedStyle(svg)
    const borderLeft = parseFloat(style.borderLeftWidth) || 0
    const borderTop = parseFloat(style.borderTopWidth) || 0

    // viewBox units back to CSS pixels, then to the padding-box origin that
    // Playwright's hover position uses.
    const scaleX = rect.width / viewBox.width
    const scaleY = rect.height / viewBox.height

    return {
      x: parseFloat(circle.getAttribute('cx')) * scaleX - borderLeft,
      y: parseFloat(circle.getAttribute('cy')) * scaleY - borderTop
    }
  }, markerId)
}

/**
 * Read a marker's data coordinates from broadcast state.
 * @param {import('./helpers/gram-frame-page.js').GramFramePage} gramFramePage
 * @param {string} id
 * @returns {Promise<{freq: number, time: number}>}
 */
async function markerData(gramFramePage, id) {
  const state = await gramFramePage.getState()
  const marker = state.analysis.markers.find((m) => m.id === id)
  return { freq: marker.freq, time: marker.time }
}

test.describe('One coordinate pipeline: every input agrees on the same point', () => {
  test('a marker renders where the mouse reads it back, at every zoom level', async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Cross Cursor')

    // Place the marker at the image centre, by clicking, so its coordinates
    // come from the pointer path. The centre is the point that stays on screen
    // when zooming about (0.5, 0.5), so it can be hovered at every zoom level.
    const centre = await gramFramePage.imageSVGPoint(0.5, 0.5)
    await gramFramePage.clickSpectrogram(centre.x, centre.y)
    await gramFramePage.waitForMarkerCount(1)
    const state = await gramFramePage.getState()
    const id = state.analysis.markers[0].id
    const placed = await markerData(gramFramePage, id)

    for (const zoom of [1.0, 1.5, 2.0, 4.0]) {
      await gramFramePage.setZoom(zoom, 0.5, 0.5)

      // Where the rendering path (dataToSVG) says the marker belongs
      const pixel = await markerRenderedPixel(gramFramePage.page, id)
      expect(pixel, `marker should be rendered at zoom ${zoom}`).not.toBeNull()

      // What the pointer path reports for that same physical pixel
      const readBack = await gramFramePage.readDataAtPixel(pixel.x, pixel.y)
      expect(readBack, `readout at zoom ${zoom}`).not.toBeNull()

      expect(Math.abs(readBack.freq - placed.freq),
        `freq agreement at zoom ${zoom}`).toBeLessThan(FREQ_TOLERANCE)
      expect(Math.abs(readBack.time - placed.time),
        `time agreement at zoom ${zoom}`).toBeLessThan(TIME_TOLERANCE)

      // The marker's own data must not drift as the view zooms
      const current = await markerData(gramFramePage, id)
      expect(current.freq).toBeCloseTo(placed.freq, 6)
      expect(current.time).toBeCloseTo(placed.time, 6)
    }
  })

  test('the keyboard moves along the same pipeline the mouse reads', async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Cross Cursor')

    const centre = await gramFramePage.imageSVGPoint(0.5, 0.5)
    await gramFramePage.clickSpectrogram(centre.x, centre.y)
    await gramFramePage.waitForMarkerCount(1)
    const state = await gramFramePage.getState()
    const id = state.analysis.markers[0].id

    for (const zoom of [1.0, 2.0, 4.0]) {
      await gramFramePage.setZoom(zoom, 0.5, 0.5)

      const before = await markerData(gramFramePage, id)
      const pixelBefore = await markerRenderedPixel(gramFramePage.page, id)

      // One keypress, with no external zoom compensation, must move the marker
      // exactly one rendered pixel — the invariant that let the increment /
      // zoomLevel division be deleted (FR-003, I2).
      await gramFramePage.page.keyboard.press('ArrowRight')
      await gramFramePage.waitForState(
        (s) => s.analysis.markers.find((m) => m.id === id).freq !== before.freq,
        { message: `the arrow-key move at zoom ${zoom}` }
      )

      const pixelAfter = await markerRenderedPixel(gramFramePage.page, id)
      expect(pixelAfter.x - pixelBefore.x,
        `rendered pixels per keypress at zoom ${zoom}`).toBeCloseTo(1, 1)

      // And the mouse still reads the marker's new position back
      const after = await markerData(gramFramePage, id)
      const readBack = await gramFramePage.readDataAtPixel(pixelAfter.x, pixelAfter.y)
      expect(readBack, `readout after keypress at zoom ${zoom}`).not.toBeNull()
      expect(Math.abs(readBack.freq - after.freq),
        `freq agreement after keypress at zoom ${zoom}`).toBeLessThan(FREQ_TOLERANCE)
      expect(Math.abs(readBack.time - after.time),
        `time agreement after keypress at zoom ${zoom}`).toBeLessThan(TIME_TOLERANCE)
    }
  })

  test('wheel-zoom leaves the marker on the same data point the mouse reads', async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Cross Cursor')

    const centre = await gramFramePage.imageSVGPoint(0.5, 0.5)
    await gramFramePage.clickSpectrogram(centre.x, centre.y)
    await gramFramePage.waitForMarkerCount(1)
    const state = await gramFramePage.getState()
    const id = state.analysis.markers[0].id
    const placed = await markerData(gramFramePage, id)

    // Ctrl+wheel zooms about the pointer, a different route into the same
    // viewport maths than setZoom takes.
    for (let notch = 0; notch < 3; notch++) {
      await gramFramePage.wheelAtSVG(centre.x, centre.y, -100, true)
    }
    await gramFramePage.waitForState((s) => s.zoom.level > 1.0, {
      message: 'the wheel zoom to take effect'
    })

    const pixel = await markerRenderedPixel(gramFramePage.page, id)
    expect(pixel, 'marker should still be rendered after wheel zoom').not.toBeNull()

    const readBack = await gramFramePage.readDataAtPixel(pixel.x, pixel.y)
    expect(readBack, 'readout after wheel zoom').not.toBeNull()
    expect(Math.abs(readBack.freq - placed.freq), 'freq agreement after wheel zoom')
      .toBeLessThan(FREQ_TOLERANCE)
    expect(Math.abs(readBack.time - placed.time), 'time agreement after wheel zoom')
      .toBeLessThan(TIME_TOLERANCE)
  })
})

test.describe('One coordinate pipeline: expand does not move a data point', () => {
  test('a marker reads back the same data before, during and after expand', async ({ page }) => {
    const { GramFramePage } = await import('./helpers/gram-frame-page.js')
    await page.setViewportSize({ width: 1600, height: 900 })
    await page.goto('/sample/pub10-gram1.html')
    await page.locator('.gram-frame-container').waitFor({ timeout: 10000 })
    const gfp = new GramFramePage(page)
    await gfp.waitForState((s) => s.imageDetails.naturalWidth > 0, {
      message: 'the image to be measured'
    })

    await page.locator('.gram-frame-mode-btn:text("Cross Cursor")').click()
    await gfp.waitForMode('analysis')
    const centre = await gfp.imageSVGPoint(0.5, 0.5)
    await gfp.clickSpectrogram(centre.x, centre.y)
    await gfp.waitForMarkerCount(1)

    const state = await gfp.getState()
    const id = state.analysis.markers[0].id
    const placed = await markerData(gfp, id)

    if (!(await gfp.isExpandToggleVisible())) {
      test.skip(true, 'no expand toggle on this page')
    }

    for (const step of ['expanded', 'collapsed']) {
      await gfp.clickExpandToggle()

      // The data is unchanged by a pure layout change...
      const current = await markerData(gfp, id)
      expect(Math.abs(current.freq - placed.freq), `freq after ${step}`).toBeLessThan(0.01)
      expect(Math.abs(current.time - placed.time), `time after ${step}`).toBeLessThan(0.01)

      // ...and the mouse still reads it back at the marker's new rendered spot
      const pixel = await markerRenderedPixel(page, id)
      expect(pixel, `marker rendered when ${step}`).not.toBeNull()
      const readBack = await gfp.readDataAtPixel(pixel.x, pixel.y)
      expect(readBack, `readout when ${step}`).not.toBeNull()
      expect(Math.abs(readBack.freq - placed.freq), `freq agreement when ${step}`)
        .toBeLessThan(FREQ_TOLERANCE)
      expect(Math.abs(readBack.time - placed.time), `time agreement when ${step}`)
        .toBeLessThan(TIME_TOLERANCE)
    }
  })
})
