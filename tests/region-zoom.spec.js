import { test, expect } from '@playwright/test'
import { GramFramePage } from './helpers/gram-frame-page.js'

/**
 * Acceptance tests for feature 170 — Region Zoom (Shift-drag a box to zoom).
 *
 * Covers the image-backed stories from specs/170-region-zoom/spec.md:
 *  - US1: frame a region in any mode, at any zoom, without placing anything
 *  - US2: the Fit button gets the whole gram back in one click
 *  - US3: the outline, the dimmed surround and the live span readout
 * plus the edge cases the spec calls out and a regression guard for every
 * navigation gesture that existed before it. US4 (players) lives in
 * `tests/player-region-zoom.spec.js`, which is a different code path.
 */

/** The selection overlay's pieces. */
const BOX = '.gram-frame-region-box'
const DIM = '.gram-frame-region-dim'
const READOUT = '.gram-frame-region-readout'

test.describe('Feature 170 — Region zoom', () => {
  /** @type {GramFramePage} */
  let gfp

  test.beforeEach(async ({ page }) => {
    gfp = new GramFramePage(page)
    await gfp.goto()
    await gfp.waitForImageDimensions()
  })

  test.describe('US1 — Frame a region and zoom to it', () => {
    test('a Shift-drag at 1x zooms to the drawn box (AS-1.1)', async () => {
      const before = await gfp.getState()
      expect(before.zoom.level).toBe(1.0)

      const a = await gfp.imageSVGPoint(0.25, 0.25)
      const b = await gfp.imageSVGPoint(0.55, 0.55)
      await gfp.shiftDragSVG(a.x, a.y, b.x, b.y)

      const after = await gfp.getState()
      // A box 30% of the gram wide becomes the view: ~3.3x.
      expect(after.zoom.level).toBeGreaterThan(2.5)
      expect(after.zoom.level).toBeLessThan(4)
      // ...and centred on the box, which sits above and left of the middle.
      expect(after.zoom.centerX).toBeLessThan(0.5)
      expect(after.zoom.centerY).toBeLessThan(0.5)
    })

    test('the visible range matches the box that was drawn (SC-002)', async () => {
      const before = await gfp.getState()
      const { freqMin, freqMax, timeMin, timeMax } = before.config
      const freqRange = freqMax - freqMin
      const timeRange = timeMax - timeMin
      const { renderWidth, renderHeight } = before.imageDetails

      // A box from 10% to 58% of the gram on both axes: equal fractions, so the
      // aspect lock has nothing to correct and the drawn box is the box. It
      // starts clear of the expand toggle, which overlays the gram's top-left.
      const from = { x: 0.1, y: 0.1 }
      const to = { x: 0.58, y: 0.58 }
      const a = await gfp.imageSVGPoint(from.x, from.y)
      const b = await gfp.imageSVGPoint(to.x, to.y)
      await gfp.shiftDragSVG(a.x, a.y, b.x, b.y)

      const visible = await gfp.visibleDataRange()
      // "to within one rendered pixel on each edge" — two, to leave room for the
      // pointer landing on a whole device pixel.
      const freqTolerance = (2 / renderWidth) * freqRange
      const timeTolerance = (2 / renderHeight) * timeRange
      expect(Math.abs(visible.freqMin - (freqMin + from.x * freqRange))).toBeLessThan(freqTolerance)
      expect(Math.abs(visible.freqMax - (freqMin + to.x * freqRange))).toBeLessThan(freqTolerance)
      // Time runs upward: the box's top edge (the smaller y fraction) is the later time.
      expect(Math.abs(visible.timeMax - (timeMax - from.y * timeRange))).toBeLessThan(timeTolerance)
      expect(Math.abs(visible.timeMin - (timeMax - to.y * timeRange))).toBeLessThan(timeTolerance)
      expect(timeMin).toBe(0)
    })

    test('zooms further from an existing zoom, in Harmonics mode (AS-1.2)', async () => {
      await gfp.clickMode('Harmonics')
      await gfp.setZoom(3.0, 0.5, 0.5)

      const a = await gfp.imageSVGPoint(0.4, 0.4)
      const b = await gfp.imageSVGPoint(0.6, 0.6)
      await gfp.shiftDragSVG(a.x, a.y, b.x, b.y)

      const state = await gfp.getState()
      expect(state.zoom.level).toBeGreaterThan(3.0)
      expect(state.harmonics?.harmonicSets ?? []).toHaveLength(0)
    })

    test('creates no annotation in any mode (FR-002, SC-004)', async () => {
      for (const mode of ['Pan', 'Cross Cursor', 'Harmonics', 'Sidebands', 'Doppler']) {
        await gfp.clickMode(mode)
        const a = await gfp.imageSVGPoint(0.3, 0.3)
        const b = await gfp.imageSVGPoint(0.5, 0.5)
        await gfp.shiftDragSVG(a.x, a.y, b.x, b.y)

        const state = await gfp.getState()
        expect(state.analysis?.markers ?? [], `${mode} created a marker`).toHaveLength(0)
        expect(state.harmonics?.harmonicSets ?? [], `${mode} created a harmonic set`).toHaveLength(0)
        expect(state.sidebands?.sidebandSets ?? [], `${mode} created a sideband set`).toHaveLength(0)
        expect(state.doppler?.fPlus ?? null, `${mode} placed a doppler point`).toBeNull()

        await gfp.commandButton('Fit').click()
      }
    })

    test('existing markers keep their data coordinates across the zoom (FR-018)', async () => {
      await gfp.clickMode('Cross Cursor')
      const at = await gfp.imageSVGPoint(0.6, 0.4)
      await gfp.clickSVG(at.x, at.y)
      await gfp.waitForMarkerCount(1)
      const placed = (await gfp.getState()).analysis.markers[0]

      const a = await gfp.imageSVGPoint(0.3, 0.2)
      const b = await gfp.imageSVGPoint(0.7, 0.6)
      await gfp.shiftDragSVG(a.x, a.y, b.x, b.y)

      const markers = (await gfp.getState()).analysis.markers
      expect(markers).toHaveLength(1)
      expect(markers[0].freq).toBeCloseTo(placed.freq, 6)
      expect(markers[0].time).toBeCloseTo(placed.time, 6)
    })

    test('leaves every pre-existing gesture alone (FR-017, AS-1.5)', async () => {
      // A plain left-drag in Analysis still places a marker.
      await gfp.clickMode('Cross Cursor')
      const a = await gfp.imageSVGPoint(0.4, 0.4)
      await gfp.clickSVG(a.x, a.y)
      await gfp.waitForMarkerCount(1)

      // Ctrl+wheel still zooms about the pointer.
      await gfp.wheelAtSVG(a.x, a.y, -100, true)
      expect((await gfp.getState()).zoom.level).toBeGreaterThan(1.0)

      // The middle-button drag still pans, and still places nothing.
      const centre = await gfp.imageSVGPoint(0.5, 0.5)
      await gfp.middleDragSVG(centre.x, centre.y, centre.x - 60, centre.y - 30)
      const state = await gfp.getState()
      expect(state.analysis.markers).toHaveLength(1)
      expect(state.zoom.centerX).not.toBeCloseTo(0.5, 2)
    })
  })

  test.describe('US2 — Fit', () => {
    test('one click returns the whole gram (AS-2.1, SC-003)', async () => {
      await gfp.setZoom(6.0, 0.2, 0.8)
      await gfp.commandButton('Fit').click()
      await gfp.waitForZoomLevel(1.0)

      const state = await gfp.getState()
      expect(state.zoom).toMatchObject({ level: 1.0, centerX: 0.5, centerY: 0.5 })
    })

    test('is present but disabled when the whole gram is shown (AS-2.2, FR-015)', async () => {
      await expect(gfp.commandButton('Fit')).toBeVisible()
      await expect(gfp.commandButton('Fit')).toBeDisabled()

      await gfp.setZoom(2.0)
      await expect(gfp.commandButton('Fit')).toBeEnabled()
    })
  })

  test.describe('US3 — See what you are about to select', () => {
    test('the outline, the dimming and the readout appear together (AS-3.1)', async ({ page }) => {
      const a = await gfp.imageSVGPoint(0.2, 0.2)
      const b = await gfp.imageSVGPoint(0.6, 0.6)
      await gfp.shiftDragSVG(a.x, a.y, b.x, b.y, { release: false })

      await expect(page.locator(BOX)).toBeVisible()
      await expect(page.locator(DIM)).toBeVisible()
      const readout = page.locator(READOUT)
      await expect(readout).toBeVisible()
      // In the axes' own units: a frequency span and an mm:ss time span.
      await expect(readout).toHaveText(/Hz × -?\d\d:\d\d/)

      const first = await readout.textContent()
      const c = await gfp.imageSVGPoint(0.4, 0.4)
      await page.mouse.move((await gfp.svg.boundingBox()).x + c.x, (await gfp.svg.boundingBox()).y + c.y)
      await expect(readout).not.toHaveText(first)

      await page.mouse.up()
      await page.keyboard.up('Shift')
      await expect(page.locator(BOX)).toHaveCount(0)
    })

    test('the box keeps the gram’s proportions (AS-3.2, FR-003)', async ({ page }) => {
      const state = await gfp.getState()
      const gramAspect = state.imageDetails.renderWidth / state.imageDetails.renderHeight

      // A wide, shallow sweep: the pointer's larger dimension wins.
      const a = await gfp.imageSVGPoint(0.1, 0.5)
      const b = await gfp.imageSVGPoint(0.6, 0.53)
      await gfp.shiftDragSVG(a.x, a.y, b.x, b.y, { release: false })

      const box = page.locator(BOX)
      const width = Number(await box.getAttribute('width'))
      const height = Number(await box.getAttribute('height'))
      expect(width / height).toBeCloseTo(gramAspect, 3)

      await page.mouse.up()
      await page.keyboard.up('Shift')
    })

    test('Escape cancels the selection and leaves the view alone (AS-3.3, FR-009)', async ({ page }) => {
      const before = await gfp.getState()
      const a = await gfp.imageSVGPoint(0.2, 0.2)
      const b = await gfp.imageSVGPoint(0.7, 0.7)
      await gfp.shiftDragSVG(a.x, a.y, b.x, b.y, { release: false })
      await expect(page.locator(BOX)).toBeVisible()

      await page.keyboard.press('Escape')
      await expect(page.locator(BOX)).toHaveCount(0)

      await page.mouse.up()
      await page.keyboard.up('Shift')
      const after = await gfp.getState()
      expect(after.zoom).toEqual(before.zoom)
    })
  })

  test.describe('Edge cases', () => {
    test('a Shift-click below the threshold changes nothing (FR-008, SC-005)', async () => {
      await gfp.clickMode('Cross Cursor')
      const before = await gfp.getState()
      const a = await gfp.imageSVGPoint(0.5, 0.5)
      await gfp.shiftDragSVG(a.x, a.y, a.x + 2, a.y + 2)

      const after = await gfp.getState()
      expect(after.zoom).toEqual(before.zoom)
      expect(after.analysis.markers).toHaveLength(0)
    })

    test('a box finer than the cap clamps at 10x rather than being refused (FR-007)', async () => {
      const a = await gfp.imageSVGPoint(0.5, 0.5)
      const b = await gfp.imageSVGPoint(0.52, 0.52)
      await gfp.shiftDragSVG(a.x, a.y, b.x, b.y)
      expect((await gfp.getState()).zoom.level).toBe(10.0)
    })

    test('a release over the axis margin still completes the zoom (FR-011)', async () => {
      const state = await gfp.getState()
      const a = await gfp.imageSVGPoint(0.5, 0.5)
      // Up and left, ending inside the left margin — off-image, still in the SVG.
      await gfp.shiftDragSVG(a.x, a.y, state.margins.left / 2, a.y - 60)
      expect((await gfp.getState()).zoom.level).toBeGreaterThan(1.0)
    })

    test('the pointer leaving the component cancels the selection (FR-010)', async ({ page }) => {
      const before = await gfp.getState()
      const a = await gfp.imageSVGPoint(0.4, 0.4)
      const b = await gfp.imageSVGPoint(0.7, 0.7)
      await gfp.shiftDragSVG(a.x, a.y, b.x, b.y, { release: false })
      await expect(page.locator(BOX)).toBeVisible()

      const svgBox = await gfp.svg.boundingBox()
      await page.mouse.move(svgBox.x - 40, svgBox.y - 40)
      await expect(page.locator(BOX)).toHaveCount(0)

      await page.mouse.up()
      await page.keyboard.up('Shift')
      expect((await gfp.getState()).zoom).toEqual(before.zoom)
    })

    test('a middle-button press mid-selection starts no competing drag', async ({ page }) => {
      const a = await gfp.imageSVGPoint(0.3, 0.3)
      const b = await gfp.imageSVGPoint(0.6, 0.6)
      await gfp.shiftDragSVG(a.x, a.y, b.x, b.y, { release: false })

      await page.mouse.down({ button: 'middle' })
      await page.mouse.up({ button: 'middle' })
      const during = await gfp.getState()
      expect(during.drag).toMatchObject({ active: true, kind: 'region' })

      await page.mouse.up()
      await page.keyboard.up('Shift')
      const after = await gfp.getState()
      expect(after.drag.active).toBe(false)
      expect(after.zoom.level).toBeGreaterThan(1.0)
    })
  })

  test.describe('US1 supporting — guidance (FR-016)', () => {
    test('the cross-mode navigation section describes the gesture', async () => {
      const text = await gfp.page.locator('.gram-frame-guidance').textContent()
      expect(text).toContain('Navigation')
      expect(text).toMatch(/Shift \+ drag/)
    })
  })
})
