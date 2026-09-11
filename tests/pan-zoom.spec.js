import { test, expect } from '@playwright/test'
import { GramFramePage } from './helpers/gram-frame-page.js'

/**
 * Acceptance tests for feature 160 — Mouse-Wheel Pan and Zoom.
 *
 * Covers the four user stories from specs/160-mouse-wheel-navigation/spec.md:
 *  - US1: Ctrl+scroll zoom around the pointer (all modes)
 *  - US2: plain scroll pans horizontally when zoomed in
 *  - US3: wheel-button (middle) drag pans without placing markers
 *  - US4: on-screen guidance describes the wheel interactions
 * plus a regression guard for the existing +/− buttons and click-drag pan.
 */

test.describe('Feature 160 — Mouse-wheel pan and zoom', () => {
  /** @type {GramFramePage} */
  let gfp

  test.beforeEach(async ({ page }) => {
    gfp = new GramFramePage(page)
    await gfp.goto()
  })

  test.describe('US1 — Ctrl+scroll zoom', () => {
    test('Ctrl+scroll up zooms in, down zooms out, bounded to 1-10x', async () => {
      let state = await gfp.getState()
      expect(state.zoom.level).toBe(1.0)

      // Scroll up (deltaY < 0) with Ctrl → zoom in
      const p = await gfp.imageSVGPoint(0.5, 0.5)
      await gfp.wheelAtSVG(p.x, p.y, -100, true)
      state = await gfp.getState()
      expect(state.zoom.level).toBeGreaterThan(1.0)
      expect(state.zoom.level).toBeLessThanOrEqual(10.0)

      // Many zoom-ins clamp at the maximum
      for (let i = 0; i < 30; i++) {
        const c = await gfp.imageSVGPoint(0.5, 0.5)
        await gfp.wheelAtSVG(c.x, c.y, -100, true)
      }
      state = await gfp.getState()
      expect(state.zoom.level).toBeLessThanOrEqual(10.0)
      expect(state.zoom.level).toBeGreaterThan(5.0)

      // Many zoom-outs clamp at the minimum (1.0)
      for (let i = 0; i < 40; i++) {
        const c = await gfp.imageSVGPoint(0.5, 0.5)
        await gfp.wheelAtSVG(c.x, c.y, 100, true)
      }
      state = await gfp.getState()
      expect(state.zoom.level).toBe(1.0)
    })

    test('Ctrl+scroll centres the zoom on the pointer', async () => {
      // Pointer in the upper-left quadrant of the image
      const p = await gfp.imageSVGPoint(0.25, 0.25)
      await gfp.wheelAtSVG(p.x, p.y, -100, true)
      const state = await gfp.getState()
      expect(state.zoom.level).toBeGreaterThan(1.0)
      // Centre moves toward the pointer's data fraction (~0.25), not the middle
      expect(state.zoom.centerX).toBeLessThan(0.45)
      expect(state.zoom.centerY).toBeLessThan(0.45)
    })

    test('Ctrl+scroll zoom works in Harmonics mode too', async () => {
      await gfp.clickMode('Harmonics')
      const p = await gfp.imageSVGPoint(0.5, 0.5)
      await gfp.wheelAtSVG(p.x, p.y, -100, true)
      const state = await gfp.getState()
      expect(state.zoom.level).toBeGreaterThan(1.0)
    })
  })

  test.describe('US2 — Scroll to pan', () => {
    test('plain scroll pans horizontally when zoomed in', async () => {
      await gfp.setZoom(2.0, 0.5, 0.5)
      const p = await gfp.imageSVGPoint(0.5, 0.5)
      await gfp.wheelAtSVG(p.x, p.y, 120, false)
      const state = await gfp.getState()
      expect(state.zoom.level).toBe(2.0)
      // Horizontal pan changed centreX; centreY is unaffected
      expect(state.zoom.centerX).not.toBeCloseTo(0.5, 2)
      expect(state.zoom.centerY).toBeCloseTo(0.5, 5)
    })

    test('plain scroll does nothing when not zoomed in', async () => {
      const p = await gfp.imageSVGPoint(0.5, 0.5)
      await gfp.wheelAtSVG(p.x, p.y, 120, false)
      const state = await gfp.getState()
      expect(state.zoom.level).toBe(1.0)
      expect(state.zoom.centerX).toBe(0.5)
      expect(state.zoom.centerY).toBe(0.5)
    })

    test('scroll-pan clamps at the data edge', async () => {
      await gfp.setZoom(2.0, 0.5, 0.5)
      // Scroll hard in one direction repeatedly; centre must stay within [0,1]
      for (let i = 0; i < 30; i++) {
        const p = await gfp.imageSVGPoint(0.5, 0.5)
        await gfp.wheelAtSVG(p.x, p.y, 200, false)
      }
      const state = await gfp.getState()
      expect(state.zoom.centerX).toBeGreaterThanOrEqual(0)
      expect(state.zoom.centerX).toBeLessThanOrEqual(1)
    })
  })

  test.describe('US3 — Wheel-button drag pan', () => {
    test('middle-drag pans the view when zoomed in', async () => {
      await gfp.setZoom(2.0, 0.5, 0.5)
      const start = await gfp.imageSVGPoint(0.5, 0.5)
      await gfp.middleDragSVG(start.x, start.y, start.x - 80, start.y - 40)
      const state = await gfp.getState()
      expect(state.zoom.level).toBe(2.0)
      expect(state.zoom.centerX).not.toBeCloseTo(0.5, 2)
      expect(state.zoom.centerY).not.toBeCloseTo(0.5, 2)
    })

    test('middle-drag does nothing when not zoomed in', async () => {
      const start = await gfp.imageSVGPoint(0.5, 0.5)
      await gfp.middleDragSVG(start.x, start.y, start.x - 80, start.y - 40)
      const state = await gfp.getState()
      expect(state.zoom.level).toBe(1.0)
      expect(state.zoom.centerX).toBe(0.5)
    })

    test('middle-drag places no marker but a normal click does', async () => {
      // Switch to Cross Cursor mode, where a left click places a marker.
      await gfp.clickMode('Cross Cursor')
      await gfp.setZoom(2.0, 0.5, 0.5)
      const start = await gfp.imageSVGPoint(0.5, 0.5)
      await gfp.middleDragSVG(start.x, start.y, start.x - 80, start.y - 40)
      let state = await gfp.getState()
      expect(state.analysis.markers.length).toBe(0)

      // A normal left click still places a marker
      const click = await gfp.imageSVGPoint(0.5, 0.5)
      await gfp.clickSVG(click.x, click.y)
      state = await gfp.getState()
      expect(state.analysis.markers.length).toBeGreaterThan(0)
    })
  })

  test.describe('US4 — Guidance', () => {
    const guidance = () => gfp.page.locator('.gram-frame-guidance')

    test('Pan mode (the initial mode) shows Navigation and Pan Mode sections', async () => {
      // Default mode is Pan, so its guidance is shown on load.
      const text = await guidance().textContent()
      expect(text).toContain('Navigation')
      expect(text).toContain('Pan Mode')
      expect(text).toContain('Ctrl')
      expect(text?.toLowerCase()).toContain('available in all modes')
      expect(text?.toLowerCase()).toContain('scroll to pan')
      expect(text?.toLowerCase()).toContain('wheel-button drag')
    })

    test('other modes do not repeat the wheel guidance', async () => {
      await gfp.clickMode('Cross Cursor')
      const text = await guidance().textContent()
      expect(text).not.toContain('Navigation')
      expect(text?.toLowerCase()).not.toContain('wheel-button drag')
    })
  })

  test.describe('Mode switching', () => {
    test('can switch to Pan mode when fully zoomed out', async () => {
      // Leave Pan (the default), then come back with no zoom applied.
      await gfp.clickMode('Cross Cursor')
      expect((await gfp.getState()).mode).toBe('analysis')
      expect((await gfp.getState()).zoom.level).toBe(1.0)

      await gfp.clickMode('Pan')
      expect((await gfp.getState()).mode).toBe('pan')
    })
  })

  test.describe('Zoom anchoring — the point under the pointer', () => {
    /** Half a percent of the debug gram's 0-100 Hz / 0-60 s span. */
    const FREQ_TOLERANCE = 0.5
    const TIME_TOLERANCE = 0.3

    /**
     * The data under an SVG point, read the way an analyst sees it — by putting
     * the pointer there and looking at the readout.
     * @param {number} x - X coordinate relative to the SVG
     * @param {number} y - Y coordinate relative to the SVG
     * @returns {Promise<{freq: number, time: number}>} The data under that point
     */
    const dataUnder = async (x, y) => {
      await gfp.moveMouse(x, y)
      const { cursorPosition } = await gfp.getState()
      if (!cursorPosition) {
        throw new Error('dataUnder: the pointer is not over the gram')
      }
      return cursorPosition
    }

    test('a second Ctrl+scroll elsewhere holds the gram under the pointer', async () => {
      // The aim of a wheel zoom is that the thing being looked at stays where
      // it is. From 1x that is free, so the bug only ever showed on the second
      // notch: zoom once here, move the pointer, and zoom again there.
      const first = await gfp.imageSVGPoint(0.3, 0.3)
      await gfp.wheelAtSVG(first.x, first.y, -100, true)

      const second = await gfp.imageSVGPoint(0.7, 0.6)
      const before = await dataUnder(second.x, second.y)

      await gfp.wheelAtSVG(second.x, second.y, -100, true)

      // Away and back, so the return is a real pointer move.
      await gfp.moveMouse(first.x, first.y)
      const after = await dataUnder(second.x, second.y)

      expect(Math.abs(after.freq - before.freq)).toBeLessThan(FREQ_TOLERANCE)
      expect(Math.abs(after.time - before.time)).toBeLessThan(TIME_TOLERANCE)
    })

    test('four notches in on a drifting hand still end up where they started', async () => {
      // A hand on a wheel does not hold still, and each notch must hold the
      // gram under wherever the pointer has got to. Notching at one fixed pixel
      // would pass under the old rule too, because there the pointer happens to
      // sit on the anchor.
      const p = await gfp.imageSVGPoint(0.65, 0.35)
      const before = await dataUnder(p.x, p.y)

      for (const drift of [0, 6, -4, 9]) {
        await gfp.wheelAtSVG(p.x + drift, p.y + drift, -100, true)
      }
      expect((await gfp.getState()).zoom.level).toBeGreaterThan(2.0)

      await gfp.moveMouse(p.x - 40, p.y - 20)
      const after = await dataUnder(p.x, p.y)

      expect(Math.abs(after.freq - before.freq)).toBeLessThan(FREQ_TOLERANCE)
      expect(Math.abs(after.time - before.time)).toBeLessThan(TIME_TOLERANCE)
    })

    test('the +/- buttons hold the middle of the view, not the wheel anchor', async () => {
      // The buttons are pressed off the gram, so there is no pointer to follow:
      // what they must not do is drag the view towards wherever the wheel last
      // zoomed, press by press.
      const p = await gfp.imageSVGPoint(0.2, 0.2)
      await gfp.wheelAtSVG(p.x, p.y, -100, true)
      await gfp.clickMode('Pan')

      const mid = async () => {
        const r = await gfp.visibleDataRange()
        return { freq: (r.freqMin + r.freqMax) / 2, time: (r.timeMin + r.timeMax) / 2 }
      }
      const before = await mid()

      await gfp.page.locator('.gram-frame-command-btn[title="Zoom In"]').click()
      const afterIn = await mid()
      expect(Math.abs(afterIn.freq - before.freq)).toBeLessThan(FREQ_TOLERANCE)
      expect(Math.abs(afterIn.time - before.time)).toBeLessThan(TIME_TOLERANCE)

      await gfp.page.locator('.gram-frame-command-btn[title="Zoom Out"]').click()
      const afterOut = await mid()
      expect(Math.abs(afterOut.freq - before.freq)).toBeLessThan(FREQ_TOLERANCE)
      expect(Math.abs(afterOut.time - before.time)).toBeLessThan(TIME_TOLERANCE)
    })
  })

  test.describe('Regression — existing zoom/pan still works', () => {
    test('the + command button still zooms in', async () => {
      await gfp.setZoom(2.0, 0.5, 0.5)
      await gfp.clickMode('Pan')
      const before = (await gfp.getState()).zoom.level
      await gfp.page.locator('.gram-frame-command-btn[title="Zoom In"]').click()
      const after = (await gfp.getState()).zoom.level
      expect(after).toBeGreaterThan(before)
    })

    test('click-drag pan still moves the view when zoomed in', async () => {
      await gfp.setZoom(2.0, 0.5, 0.5)
      await gfp.clickMode('Pan')
      expect((await gfp.getState()).mode).toBe('pan')
      const svgBox = await gfp.svg.boundingBox()
      const start = await gfp.imageSVGPoint(0.5, 0.5)
      await gfp.page.mouse.move(svgBox.x + start.x, svgBox.y + start.y)
      await gfp.page.mouse.down()
      await gfp.page.mouse.move(svgBox.x + start.x - 80, svgBox.y + start.y - 40, { steps: 5 })
      await gfp.page.mouse.up()
      const state = await gfp.getState()
      expect(state.zoom.centerX).not.toBeCloseTo(0.5, 2)
    })
  })
})
