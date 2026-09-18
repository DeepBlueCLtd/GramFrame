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
const VIEW = '.gram-frame-region-view'
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
      const { renderWidth, renderHeight } = await gfp.renderSize()

      // A box from 10% to 58% of the gram on both axes. Equal fractions means
      // it is already the view's own shape, so `contain` neither grows nor
      // crops it and the drawn box is exactly the view. It starts clear of the
      // expand toggle, which overlays the gram's top-left.
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

        await gfp.commandButton('Fit Whole Gram').click()
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
      await gfp.commandButton('Fit Whole Gram').click()
      await gfp.waitForZoomLevel(1.0)

      const state = await gfp.getState()
      expect(state.zoom).toMatchObject({ level: 1.0, centerX: 0.5, centerY: 0.5 })
    })

    test('is present but disabled when the whole gram is shown (AS-2.2, FR-015)', async () => {
      await expect(gfp.commandButton('Fit Whole Gram')).toBeVisible()
      await expect(gfp.commandButton('Fit Whole Gram')).toBeDisabled()

      await gfp.setZoom(2.0)
      await expect(gfp.commandButton('Fit Whole Gram')).toBeEnabled()
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
      const svgBox = await gfp.svgBox()
      await page.mouse.move(svgBox.x + c.x, svgBox.y + c.y)
      await expect(readout).not.toHaveText(first || '')

      await page.mouse.up()
      await page.keyboard.up('Shift')
      await expect(page.locator(BOX)).toHaveCount(0)
    })

    test('the box follows the pointer, and the view it produces is shown too (AS-3.2, FR-003)', async ({ page }) => {
      const { renderWidth, renderHeight } = await gfp.renderSize()

      // A wide, shallow sweep: nothing constrains it, so it stays shallow.
      const a = await gfp.imageSVGPoint(0.1, 0.5)
      const b = await gfp.imageSVGPoint(0.6, 0.53)
      await gfp.shiftDragSVG(a.x, a.y, b.x, b.y, { release: false })

      const box = page.locator(BOX)
      const width = Number(await box.getAttribute('width'))
      const height = Number(await box.getAttribute('height'))
      // Half the gram wide and a sliver tall: far from the view's proportions.
      expect(width / height).toBeGreaterThan(3 * (renderWidth / renderHeight))

      // ...and the second outline says what will actually be on screen: the
      // same width, grown to the view's shape.
      const view = page.locator(VIEW)
      await expect(view).toBeVisible()
      const viewWidth = Number(await view.getAttribute('width'))
      const viewHeight = Number(await view.getAttribute('height'))
      expect(viewWidth).toBeCloseTo(width, 0)
      expect(viewHeight).toBeGreaterThan(height)
      expect(viewWidth / viewHeight).toBeCloseTo(renderWidth / renderHeight, 2)

      await page.mouse.up()
      await page.keyboard.up('Shift')
    })

    test('the dimming traces the selection, not the view it will produce (FR-004)', async ({ page }) => {
      // A wide, shallow band: the resulting view is much taller than the box,
      // so the two candidates for the mask are far apart and the assertion is
      // not accidentally satisfied by them coinciding.
      const a = await gfp.imageSVGPoint(0.15, 0.5)
      const b = await gfp.imageSVGPoint(0.7, 0.56)
      await gfp.shiftDragSVG(a.x, a.y, b.x, b.y, { release: false })

      const box = page.locator(BOX)
      const left = Number(await box.getAttribute('x'))
      const top = Number(await box.getAttribute('y'))
      const right = left + Number(await box.getAttribute('width'))
      const bottom = top + Number(await box.getAttribute('height'))

      // The dim path is the selectable area with the clear region punched out
      // of it, even-odd. Its inner subpath must be the selection's own corners.
      const d = await page.locator(DIM).getAttribute('d')
      expect(d).toContain(`M${left} ${top}H${right}V${bottom}H${left}Z`)

      // ...and the view is genuinely taller, so this was not a free pass.
      const view = page.locator(VIEW)
      await expect(view).toBeVisible()
      expect(Number(await view.getAttribute('height'))).toBeGreaterThan(bottom - top + 10)

      await page.mouse.up()
      await page.keyboard.up('Shift')
    })

    test('the second outline is drawn only when it would say something (AS-3.2)', async ({ page }) => {
      // A box a quarter of the gram across and a quarter down is close to the
      // view's own shape, so the resulting view is the selection give or take
      // the pointer's rounding — and the dashed outline is drawn only if the
      // two would be visibly different lines.
      const a = await gfp.imageSVGPoint(0.3, 0.3)
      const b = await gfp.imageSVGPoint(0.55, 0.55)
      await gfp.shiftDragSVG(a.x, a.y, b.x, b.y, { release: false })

      const read = async (/** @type {string} */ selector) => {
        const el = page.locator(selector)
        return {
          x: Number(await el.getAttribute('x')),
          y: Number(await el.getAttribute('y')),
          width: Number(await el.getAttribute('width')),
          height: Number(await el.getAttribute('height'))
        }
      }
      const box = await read(BOX)
      const view = await read(VIEW)

      // The view always contains the selection: `contain` never crops.
      expect(view.x).toBeLessThanOrEqual(box.x + 0.5)
      expect(view.y).toBeLessThanOrEqual(box.y + 0.5)
      expect(view.x + view.width).toBeGreaterThanOrEqual(box.x + box.width - 0.5)
      expect(view.y + view.height).toBeGreaterThanOrEqual(box.y + box.height - 0.5)

      // ...and it is hidden exactly when drawing it would only double the line.
      const coincides = Math.abs(view.x - box.x) < 1 && Math.abs(view.y - box.y) < 1 &&
        Math.abs(view.width - box.width) < 1 && Math.abs(view.height - box.height) < 1
      await expect(page.locator(VIEW)).toBeVisible({ visible: !coincides })

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

      const svgBox = await gfp.svgBox()
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
      await gfp.showGuidance()
      const text = await gfp.page.locator('.gram-frame-guidance').textContent()
      expect(text).toContain('In every mode')
      expect(text).toMatch(/Shift \+ drag/)
    })
  })
})
