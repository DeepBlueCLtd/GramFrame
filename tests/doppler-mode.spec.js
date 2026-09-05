import { test, expect } from './helpers/fixtures.js'
import {

/// <reference path="../src/types.js" />
  expectValidMetadata,
  expectValidMode,
  expectValidConfig,
  expectValidImageDetails
} from './helpers/state-assertions.js'

/**
 * @fileoverview E2E tests for Doppler mode: marker placement, dragging, speed
 * calculation, persistence across modes and reset.
 *
 * Every interaction here is positioned from the drawn gram's own bounding box.
 * These tests used to drive `page.mouse` at absolute page coordinates like
 * (200, 150), which on the debug page sit some 390px *above* the component —
 * no marker was ever placed, and each assertion was wrapped in an
 * `if (state.doppler.fPlus)` or bailed out with an early `return`, so the whole
 * suite passed while exercising nothing. Assertions are unconditional now: if a
 * placement stops working, these fail.
 *
 * Debug config spans freq 0-100 Hz across the image and time 0-60 s bottom-up.
 */

const FREQ_SPAN = 100
const TIME_SPAN = 60

/**
 * The drawn gram's rectangle in client coordinates.
 *
 * Scrolls the component fully into view first. The debug page puts the gram low
 * enough that its bottom edge can sit below the viewport, and a drag towards a
 * point outside the window leaves the SVG — which correctly cancels the drag,
 * but for reasons that have nothing to do with what is being tested.
 * @param {import('./helpers/gram-frame-page.js').GramFramePage} gfp - Page helper
 * @returns {Promise<{x: number, y: number, width: number, height: number}>} Client rect
 */
async function gramRect(gfp) {
  await gfp.svg.scrollIntoViewIfNeeded()
  const box = await gfp.page.locator('.gram-frame-spectrogram-image').boundingBox()
  expect(box).not.toBeNull()
  return box
}

/**
 * A client point at a fraction across and down the drawn gram.
 * @param {{x: number, y: number, width: number, height: number}} rect - Gram rect
 * @param {number} fx - Fraction across (0 = left edge, 1 = right edge)
 * @param {number} fy - Fraction down (0 = top edge, 1 = bottom edge)
 * @returns {{x: number, y: number}} Client coordinates
 */
function pointAt(rect, fx, fy) {
  return { x: rect.x + rect.width * fx, y: rect.y + rect.height * fy }
}

/**
 * The data coordinates a gram fraction corresponds to, for expected values.
 * @param {number} fx - Fraction across
 * @param {number} fy - Fraction down
 * @returns {{freq: number, time: number}} Data coordinates
 */
function dataAt(fx, fy) {
  return { freq: FREQ_SPAN * fx, time: TIME_SPAN * (1 - fy) }
}

/**
 * Drag out a Doppler curve between two fractions of the gram, and wait for the
 * placement to land.
 * @param {import('./helpers/gram-frame-page.js').GramFramePage} gfp - Page helper
 * @param {[number, number]} from - Start fraction [across, down]
 * @param {[number, number]} to - End fraction [across, down]
 * @returns {Promise<GramFrameState>} State after placement
 */
async function placeCurve(gfp, from, to) {
  const rect = await gramRect(gfp)
  const start = pointAt(rect, from[0], from[1])
  const end = pointAt(rect, to[0], to[1])

  await gfp.page.mouse.move(start.x, start.y)
  await gfp.page.mouse.down()
  await gfp.page.mouse.move(end.x, end.y, { steps: 5 })
  await gfp.page.mouse.up()

  await gfp.waitForState((state) => !!(state.doppler.fPlus && state.doppler.fMinus && state.doppler.fZero))
  return gfp.getState()
}

/**
 * Drag a rendered Doppler marker by a client-pixel offset.
 * @param {import('./helpers/gram-frame-page.js').GramFramePage} gfp - Page helper
 * @param {'fPlus'|'fMinus'|'crosshair'} marker - Which marker's element to grab
 * @param {number} dx - Horizontal offset in client px
 * @param {number} dy - Vertical offset in client px
 * @returns {Promise<void>}
 */
async function dragMarker(gfp, marker, dx, dy) {
  const box = await gfp.page.locator(`.gram-frame-doppler-${marker}`).first().boundingBox()
  expect(box, `the ${marker} marker should be rendered`).not.toBeNull()

  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2

  await gfp.page.mouse.move(cx, cy)
  await gfp.page.mouse.down()
  await gfp.page.mouse.move(cx + dx, cy + dy, { steps: 5 })
  await gfp.page.mouse.up()
}

test.describe('Doppler Mode', () => {
  test.beforeEach(async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Doppler')
    await gramFramePage.waitForImageDimensions()

    const state = await gramFramePage.getState()
    expectValidMode(state, 'doppler')
  })

  test.describe('Marker Placement', () => {
    test('a drag places f+ and f- at its two ends', async ({ gramFramePage }) => {
      // Start high on the gram (later in time), finish low (earlier).
      const state = await placeCurve(gramFramePage, [0.3, 0.2], [0.6, 0.7])

      const expectedHigh = dataAt(0.3, 0.2)
      const expectedLow = dataAt(0.6, 0.7)

      // f+ is defined as the later marker, whichever end of the drag it was.
      expect(state.doppler.fPlus.time).toBeGreaterThan(state.doppler.fMinus.time)

      expect(state.doppler.fPlus.time).toBeCloseTo(expectedHigh.time, 0)
      expect(state.doppler.fPlus.freq).toBeCloseTo(expectedHigh.freq, 0)
      expect(state.doppler.fMinus.time).toBeCloseTo(expectedLow.time, 0)
      expect(state.doppler.fMinus.freq).toBeCloseTo(expectedLow.freq, 0)
    })

    test('a drag placed the other way round still orders f+ after f-', async ({ gramFramePage }) => {
      // Same two points, dragged bottom-to-top: the roles must not swap.
      const state = await placeCurve(gramFramePage, [0.6, 0.7], [0.3, 0.2])

      expect(state.doppler.fPlus.time).toBeGreaterThan(state.doppler.fMinus.time)
      expect(state.doppler.fPlus.freq).toBeCloseTo(dataAt(0.3, 0.2).freq, 0)
      expect(state.doppler.fMinus.freq).toBeCloseTo(dataAt(0.6, 0.7).freq, 0)
    })

    test('f₀ is derived as the midpoint of f+ and f-', async ({ gramFramePage }) => {
      const { doppler } = await placeCurve(gramFramePage, [0.3, 0.2], [0.6, 0.7])

      expect(doppler.fZero.time).toBeCloseTo((doppler.fPlus.time + doppler.fMinus.time) / 2, 6)
      expect(doppler.fZero.freq).toBeCloseTo((doppler.fPlus.freq + doppler.fMinus.freq) / 2, 6)
    })

    test('placement leaves no half-finished geometry behind', async ({ gramFramePage }) => {
      const state = await placeCurve(gramFramePage, [0.3, 0.2], [0.6, 0.7])

      expect(state.doppler.tempFirst).toBeNull()
      expect(state.doppler.previewEnd).toBeNull()
      expect(state.drag.active).toBe(false)
    })
  })

  test.describe('Marker Dragging', () => {
    // The cursor affordance over a marker is covered in cursor-hover.spec.js,
    // and the size of the region that grabs one in doppler-hotspot.spec.js.

    test('dragging f+ moves f+ and leaves f- alone', async ({ gramFramePage }) => {
      const before = await placeCurve(gramFramePage, [0.3, 0.2], [0.6, 0.7])

      await dragMarker(gramFramePage, 'fPlus', 40, 20)
      const after = await gramFramePage.getState()

      expect(after.doppler.fPlus.freq).toBeGreaterThan(before.doppler.fPlus.freq)
      expect(after.doppler.fPlus.time).toBeLessThan(before.doppler.fPlus.time)
      expect(after.doppler.fMinus).toEqual(before.doppler.fMinus)
    })

    test('dragging f- moves f- and leaves f+ alone', async ({ gramFramePage }) => {
      const before = await placeCurve(gramFramePage, [0.3, 0.2], [0.6, 0.7])

      await dragMarker(gramFramePage, 'fMinus', -40, 20)
      const after = await gramFramePage.getState()

      expect(after.doppler.fMinus.freq).toBeLessThan(before.doppler.fMinus.freq)
      expect(after.doppler.fMinus.time).toBeLessThan(before.doppler.fMinus.time)
      expect(after.doppler.fPlus).toEqual(before.doppler.fPlus)
    })

    test('f₀ drags independently of the markers it was derived from', async ({ gramFramePage }) => {
      const before = await placeCurve(gramFramePage, [0.25, 0.2], [0.75, 0.8])

      // f₀ sits at the curve's midpoint, well clear of both ends here.
      await dragMarker(gramFramePage, 'crosshair', 30, 0)
      const after = await gramFramePage.getState()

      expect(after.doppler.fZero.freq).toBeGreaterThan(before.doppler.fZero.freq)
      expect(after.doppler.fPlus).toEqual(before.doppler.fPlus)
      expect(after.doppler.fMinus).toEqual(before.doppler.fMinus)
    })

    test('a completed drag leaves the engine idle', async ({ gramFramePage }) => {
      await placeCurve(gramFramePage, [0.3, 0.2], [0.6, 0.7])
      await dragMarker(gramFramePage, 'fPlus', 20, 10)

      const state = await gramFramePage.getState()
      expect(state.drag.active).toBe(false)
      expect(state.drag.kind).toBeNull()
    })
  })

  test.describe('Speed Calculation', () => {
    test('speed follows the Doppler formula over f+, f- and f₀', async ({ gramFramePage }) => {
      const { doppler } = await placeCurve(gramFramePage, [0.3, 0.2], [0.7, 0.8])

      // v = (c / f₀) × Δf, with c = 1500 m/s (nominal seawater, R9-04) and
      // Δf = (f+ − f−) / 2.
      const expected = Math.abs((1500 / doppler.fZero.freq) * ((doppler.fPlus.freq - doppler.fMinus.freq) / 2))

      expect(doppler.speed).toBeCloseTo(expected, 6)
    })

    test('dragging a marker recomputes the speed', async ({ gramFramePage }) => {
      const before = await placeCurve(gramFramePage, [0.3, 0.2], [0.7, 0.8])
      expect(before.doppler.speed).toBeGreaterThan(0)

      // Widen the frequency gap: a bigger Δf over the same f₀ means more speed.
      await dragMarker(gramFramePage, 'fPlus', -60, 0)
      const after = await gramFramePage.getState()

      expect(after.doppler.fPlus.freq).toBeLessThan(before.doppler.fPlus.freq)
      expect(after.doppler.speed).not.toBeCloseTo(before.doppler.speed, 3)
      const expected = Math.abs(
        (1500 / after.doppler.fZero.freq) * ((after.doppler.fPlus.freq - after.doppler.fMinus.freq) / 2)
      )
      expect(after.doppler.speed).toBeCloseTo(expected, 6)
    })

    test('markers at the same frequency give a speed of zero', async ({ gramFramePage }) => {
      // Vertically aligned: same frequency, different times.
      const { doppler } = await placeCurve(gramFramePage, [0.5, 0.25], [0.5, 0.75])

      expect(doppler.fPlus.freq).toBeCloseTo(doppler.fMinus.freq, 3)
      expect(doppler.speed).toBeCloseTo(0, 3)
    })

    test('the speed LED shows the calculated value', async ({ gramFramePage }) => {
      const { doppler } = await placeCurve(gramFramePage, [0.3, 0.2], [0.7, 0.8])

      const led = await gramFramePage.getLEDValue('Doppler\u00a0Speed (kts)')
      expect(led).toMatch(/\d/)
      // The LED reads in knots; state carries m/s.
      const shown = parseFloat(led.replace(/[^\d.-]/g, ''))
      expect(shown).toBeCloseTo(doppler.speed * 1.94384, 0)
    })
  })

  test.describe('Coordinates', () => {
    test('marker positions land inside the configured ranges', async ({ gramFramePage }) => {
      const state = await placeCurve(gramFramePage, [0.2, 0.15], [0.8, 0.85])

      for (const marker of [state.doppler.fPlus, state.doppler.fMinus, state.doppler.fZero]) {
        expect(marker.time).toBeGreaterThanOrEqual(state.config.timeMin)
        expect(marker.time).toBeLessThanOrEqual(state.config.timeMax)
        expect(marker.freq).toBeGreaterThanOrEqual(state.config.freqMin)
        expect(marker.freq).toBeLessThanOrEqual(state.config.freqMax)
      }
    })

    test('markers placed at the gram edges stay in range', async ({ gramFramePage }) => {
      // Two pixels inside opposite corners — the extremes a press can still
      // resolve to data coordinates at all.
      const rect = await gramRect(gramFramePage)
      const inset = 2
      await gramFramePage.page.mouse.move(rect.x + inset, rect.y + inset)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(
        rect.x + rect.width - inset,
        rect.y + rect.height - inset,
        { steps: 5 }
      )
      await gramFramePage.page.mouse.up()
      await gramFramePage.waitForState((s) => !!(s.doppler.fPlus && s.doppler.fMinus))

      const state = await gramFramePage.getState()
      for (const marker of [state.doppler.fPlus, state.doppler.fMinus, state.doppler.fZero]) {
        expect(marker.time).toBeGreaterThanOrEqual(state.config.timeMin)
        expect(marker.time).toBeLessThanOrEqual(state.config.timeMax)
        expect(marker.freq).toBeGreaterThanOrEqual(state.config.freqMin)
        expect(marker.freq).toBeLessThanOrEqual(state.config.freqMax)
      }
    })

    test('a drag of barely any distance still places both markers', async ({ gramFramePage }) => {
      const rect = await gramRect(gramFramePage)
      const start = pointAt(rect, 0.5, 0.5)

      await gramFramePage.page.mouse.move(start.x, start.y)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(start.x + 1, start.y + 1)
      await gramFramePage.page.mouse.up()

      const state = await gramFramePage.getState()
      expect(state.doppler.fPlus).not.toBeNull()
      expect(state.doppler.fMinus).not.toBeNull()
      expect(Math.abs(state.doppler.fPlus.freq - state.doppler.fMinus.freq)).toBeLessThan(1)
    })
  })

  test.describe('Cross-Mode Behaviour', () => {
    test('markers survive a round trip through another mode', async ({ gramFramePage }) => {
      const before = await placeCurve(gramFramePage, [0.3, 0.2], [0.6, 0.7])

      await gramFramePage.clickMode('Cross Cursor')
      const away = await gramFramePage.getState()
      expect(away.doppler.fPlus).toEqual(before.doppler.fPlus)
      expect(away.doppler.fMinus).toEqual(before.doppler.fMinus)
      expect(away.doppler.fZero).toEqual(before.doppler.fZero)

      await gramFramePage.clickMode('Doppler')
      const back = await gramFramePage.getState()
      expect(back.doppler.fPlus).toEqual(before.doppler.fPlus)
      expect(back.doppler.fMinus).toEqual(before.doppler.fMinus)

      // And the curve is drawn again rather than merely remembered.
      await expect(gramFramePage.page.locator('.gram-frame-doppler-fPlus')).toHaveCount(1)
    })

    test('a doppler curve coexists with cross-cursor markers', async ({ gramFramePage }) => {
      await gramFramePage.clickMode('Cross Cursor')
      await gramFramePage.clickSpectrogram(150, 100)
      await gramFramePage.waitForMarkerCount(1)

      await gramFramePage.clickMode('Doppler')
      const state = await placeCurve(gramFramePage, [0.4, 0.3], [0.7, 0.7])

      expect(state.analysis.markers).toHaveLength(1)
      expect(state.doppler.fPlus).not.toBeNull()
      expect(state.doppler.fMinus).not.toBeNull()
      await expect(gramFramePage.page.locator('.gram-frame-doppler-fPlus')).toHaveCount(1)
    })
  })

  test.describe('Reset', () => {
    test('right-click clears every marker and the speed', async ({ gramFramePage }) => {
      await placeCurve(gramFramePage, [0.3, 0.2], [0.6, 0.7])

      const rect = await gramRect(gramFramePage)
      const centre = pointAt(rect, 0.45, 0.45)
      await gramFramePage.page.mouse.click(centre.x, centre.y, { button: 'right' })

      const state = await gramFramePage.getState()
      expect(state.doppler.fPlus).toBeNull()
      expect(state.doppler.fMinus).toBeNull()
      expect(state.doppler.fZero).toBeNull()
      expect(state.doppler.speed).toBeNull()
      await expect(gramFramePage.page.locator('.gram-frame-doppler-fPlus')).toHaveCount(0)
    })

    test('a fresh curve can be drawn after a reset', async ({ gramFramePage }) => {
      await placeCurve(gramFramePage, [0.3, 0.2], [0.6, 0.7])

      const rect = await gramRect(gramFramePage)
      const centre = pointAt(rect, 0.45, 0.45)
      await gramFramePage.page.mouse.click(centre.x, centre.y, { button: 'right' })
      await gramFramePage.waitForState((state) => state.doppler.fPlus === null)

      const state = await placeCurve(gramFramePage, [0.2, 0.3], [0.5, 0.6])
      expect(state.doppler.fPlus).not.toBeNull()
      expect(state.doppler.speed).toBeGreaterThan(0)
    })
  })

  test.describe('Edge Cases', () => {
    test('placing then immediately dragging keeps the state consistent', async ({ gramFramePage }) => {
      await placeCurve(gramFramePage, [0.3, 0.2], [0.6, 0.7])
      await dragMarker(gramFramePage, 'fPlus', -20, -20)

      const state = await gramFramePage.getState()
      expect(state.doppler.fPlus).not.toBeNull()
      expect(state.doppler.fMinus).not.toBeNull()
      expect(state.doppler.fZero).not.toBeNull()
      expect(state.drag.active).toBe(false)
      expect(state.drag.kind).toBeNull()
    })

    test('releasing outside the gram cancels rather than stranding the drag', async ({ gramFramePage }) => {
      const before = await placeCurve(gramFramePage, [0.3, 0.2], [0.6, 0.7])

      const box = await gramFramePage.page.locator('.gram-frame-doppler-fPlus').boundingBox()
      await gramFramePage.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await gramFramePage.page.mouse.down()
      // Out over the axis margin, where there are no data coordinates.
      await gramFramePage.page.mouse.move(box.x + box.width / 2, before.margins.top - 40, { steps: 5 })
      await gramFramePage.page.mouse.up()

      const state = await gramFramePage.getState()
      expect(state.drag.active).toBe(false)
      expect(state.doppler.fPlus).not.toBeNull()
    })

    test('the component stays coherent through a mode switch', async ({ gramFramePage }) => {
      await placeCurve(gramFramePage, [0.3, 0.2], [0.6, 0.7])

      await gramFramePage.clickMode('Cross Cursor')
      await gramFramePage.clickMode('Doppler')

      const state = await gramFramePage.getState()
      expectValidMetadata(state)
      expectValidMode(state, 'doppler')
      expectValidConfig(state)
      expectValidImageDetails(state)

      expect(state.drag.active).toBe(false)
      expect(state.drag.kind).toBeNull()
      expect(state.doppler.tempFirst).toBeNull()
      expect(state.doppler.previewEnd).toBeNull()
    })
  })
})
