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

    test('Pan mode (the initial mode) shows Mouse-Wheel and Pan Mode sections', async () => {
      // Default mode is Pan, so its guidance is shown on load.
      const text = await guidance().textContent()
      expect(text).toContain('Mouse-Wheel')
      expect(text).toContain('Pan Mode')
      expect(text).toContain('Ctrl')
      expect(text?.toLowerCase()).toContain('available in all modes')
      expect(text?.toLowerCase()).toContain('scroll to pan')
      expect(text?.toLowerCase()).toContain('wheel-button drag')
    })

    test('other modes do not repeat the wheel guidance', async () => {
      await gfp.clickMode('Cross Cursor')
      const text = await guidance().textContent()
      expect(text).not.toContain('Mouse-Wheel')
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
