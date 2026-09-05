import { test, expect } from './helpers/fixtures.js'
import { GramFramePage } from './helpers/gram-frame-page.js'

/**
 * @fileoverview Harmonic pin frequencies and the drag spacing floor (R9-25,
 * issue #277).
 *
 * The September 2026 mutation probe found two single-line changes that the
 * whole 484-test suite failed to notice:
 *
 *   1. `HarmonicsMode.freqForIndex` returning `(index + 1) × spacing` draws
 *      every pin one spacing too high, with the labels unchanged.
 *   2. Removing the `MIN_PIN_SPACING` clamp from `freqUpdatesForDrag` reopens
 *      the BH-2 hang class: a drag towards 0 Hz reaches zero or negative
 *      spacing, and the pin loop runs to Infinity.
 *
 * Both survived because the existing harmonics specs assert pin *counts*,
 * *labels*, *state* spacing and hit areas — never a rendered pin's frequency,
 * and never a drag below the floor. These tests close that: they read each
 * pin's position back through the component's own cursor readout, which is the
 * number an analyst actually sees, and they drag a set into the floor.
 */

/** The floor `PinSetMode` clamps drag spacing to. */
const MIN_PIN_SPACING = 0.1

/** The cap on rendered pin lines per set — the BH-2 backstop. */
const MAX_PIN_LINES = 1000

/**
 * Assert a pin is drawn at its own harmonic.
 *
 * The tolerance is a fraction of the spacing rather than an absolute hertz
 * figure, because that is the error this exists to catch: a pin one harmonic
 * out is a whole spacing wrong, so a tenth of a spacing is a wide margin for
 * hover-pixel rounding (Playwright rounds hover positions to whole pixels) and
 * still an order of magnitude tighter than the defect.
 * @param {number} freq - Frequency the component reported at the pin
 * @param {number} harmonic - The pin's harmonic number
 * @param {number} spacing - The set's spacing in Hz
 * @returns {void}
 */
function expectPinAtHarmonic(freq, harmonic, spacing) {
  const expected = harmonic * spacing
  expect(
    Math.abs(freq - expected),
    `pin ${harmonic} should be drawn at ${expected} Hz, read ${freq.toFixed(2)} Hz`
  ).toBeLessThan(spacing * 0.1)
}

/**
 * Drag from one SVG-relative point to another.
 *
 * `dragSVG` takes viewport coordinates, not SVG-relative ones, so the SVG's
 * own offset has to be added — a difference that otherwise makes a drag miss
 * the feature silently and the test pass for the wrong reason.
 * @param {GramFramePage} gfp - Page object
 * @param {{x: number, y: number}} from - SVG-relative start
 * @param {{x: number, y: number}} to - SVG-relative end
 * @returns {Promise<void>}
 */
async function dragWithin(gfp, from, to) {
  const box = await gfp.svg.boundingBox()
  if (!box) {
    throw new Error('SVG has no bounding box')
  }
  await gfp.dragSVG(box.x + from.x, box.y + from.y, box.x + to.x, box.y + to.y)
}

/**
 * Read the frequency the component reports at each rendered pin of a set.
 * @param {GramFramePage} gfp - Page object
 * @param {string} setId - Harmonic set id
 * @param {number} hoverY - SVG-relative y to hover at, inside the image
 * @returns {Promise<Array<{harmonic: number, freq: number}>>} Pin number and reported frequency
 */
async function readPinFrequencies(gfp, setId, hoverY) {
  const pins = await gfp.getHarmonicPinPixels(setId)
  /** @type {Array<{harmonic: number, freq: number}>} */
  const readings = []
  for (const pin of pins) {
    const data = await gfp.readDataAtPixel(pin.x, hoverY)
    if (data) {
      readings.push({ harmonic: pin.harmonic, freq: data.freq })
    }
  }
  return readings
}

test.describe('A harmonic pin is drawn at its own harmonic (R9-25)', () => {
  test('on a gram whose axis starts at 0 Hz, pin n reads n × spacing', async ({ gramFramePage }) => {
    const gfp = gramFramePage
    await gfp.clickMode('harmonics')

    // 12.5 Hz on a 0–100 Hz gram: pins 1..8, none of them at the axis edges
    // where a hover would be clamped.
    const setId = await gfp.addHarmonicSet(30, 12.5)
    await gfp.waitForHarmonicSetCount(1)

    const { y } = await gfp.imageSVGPoint(0.5, 0.5)
    const readings = await readPinFrequencies(gfp, setId, y)

    expect(readings.length).toBeGreaterThan(3)
    for (const { harmonic, freq } of readings) {
      expectPinAtHarmonic(freq, harmonic, 12.5)
    }
  })

  test('on a gram whose axis starts above 0 Hz, the visible window is still n × spacing', async ({ page }) => {
    // The case an off-by-one shows up in as a wrong *frequency* rather than a
    // wrong count: the origin is off-screen, so the drawn pins are a window
    // part-way up the series.
    const gfp = new GramFramePage(page)
    await page.goto('/tests/fixtures/offset-freq-page.html')
    // The fixture has no diagnostics panel, so wait on the component itself
    // rather than on the debug page's state display.
    await page.locator('.gram-frame-container').waitFor()
    await gfp.waitForState((state) => state.config.freqMin === 200, {
      message: 'the 200-400 Hz config to be parsed'
    })
    await gfp.clickMode('harmonics')

    // 30 Hz spacing on 200–400 Hz: harmonics 7..13, at 210…390 Hz.
    const setId = await gfp.addHarmonicSet(30, 30)
    await gfp.waitForHarmonicSetCount(1)

    const numbers = await gfp.getHarmonicNumbers(setId)
    expect(Math.min(...numbers)).toBe(7)
    expect(Math.max(...numbers)).toBe(13)

    const { y } = await gfp.imageSVGPoint(0.5, 0.5)
    const readings = await readPinFrequencies(gfp, setId, y)

    expect(readings.length).toBe(numbers.length)
    for (const { harmonic, freq } of readings) {
      expectPinAtHarmonic(freq, harmonic, 30)
    }
  })

  test('the labels agree with the positions, not just with each other', async ({ gramFramePage }) => {
    const gfp = gramFramePage
    await gfp.clickMode('harmonics')
    const setId = await gfp.addHarmonicSet(30, 20)
    await gfp.waitForHarmonicSetCount(1)

    // A pin one spacing out keeps its label, so the label set alone cannot
    // catch it. Pair each label with the frequency read at its own pin.
    const labels = await gfp.getHarmonicLabelNumbers(setId)
    const { y } = await gfp.imageSVGPoint(0.5, 0.5)
    const readings = await readPinFrequencies(gfp, setId, y)

    expect(labels.sort((a, b) => a - b)).toEqual(readings.map(r => r.harmonic).sort((a, b) => a - b))
    for (const { harmonic, freq } of readings) {
      expectPinAtHarmonic(freq, harmonic, 20)
    }
  })
})

test.describe('Dragging a harmonic set cannot cross the spacing floor (R9-25)', () => {
  test('a drag towards 0 Hz clamps at MIN_PIN_SPACING instead of collapsing', async ({ gramFramePage }) => {
    const gfp = gramFramePage
    await gfp.clickMode('harmonics')

    const setId = await gfp.addHarmonicSet(30, 25)
    await gfp.waitForHarmonicSetCount(1)

    // Grab a drawn pin and drag it to the far left of the image — the lowest
    // frequency the gram can express. Without the clamp the computed spacing
    // reaches 0 and the pin loop runs `h <= Infinity`.
    const pins = await gfp.getHarmonicPinPixels(setId)
    expect(pins.length).toBeGreaterThan(0)
    const grab = pins[pins.length - 1]
    const { y } = await gfp.imageSVGPoint(0.5, 0.5)
    const leftEdge = await gfp.imageSVGPoint(0.001, 0.5)

    await dragWithin(gfp, { x: grab.x, y }, { x: leftEdge.x, y })

    const state = await gfp.getState()
    const set = state.harmonics.harmonicSets.find((/** @type {any} */ s) => s.id === setId)
    expect(set).toBeTruthy()
    expect(set.spacing).toBeGreaterThanOrEqual(MIN_PIN_SPACING)

    // And the page is still alive and bounded: the component answers, and the
    // rendered line count stayed under the cap rather than running away.
    const lineCount = await gfp.getHarmonicLineCount(setId)
    expect(lineCount).toBeGreaterThan(0)
    expect(lineCount).toBeLessThanOrEqual(MAX_PIN_LINES)
  })

  test('a set already at the floor survives another drag towards zero', async ({ gramFramePage }) => {
    const gfp = gramFramePage
    await gfp.clickMode('harmonics')

    const setId = await gfp.addHarmonicSet(30, MIN_PIN_SPACING)
    await gfp.waitForHarmonicSetCount(1)

    const { y } = await gfp.imageSVGPoint(0.5, 0.5)
    const leftEdge = await gfp.imageSVGPoint(0.001, 0.5)
    const pins = await gfp.getHarmonicPinPixels(setId)
    expect(pins.length).toBeGreaterThan(0)

    await dragWithin(gfp, { x: pins[pins.length - 1].x, y }, { x: leftEdge.x, y })

    const state = await gfp.getState()
    const set = state.harmonics.harmonicSets.find((/** @type {any} */ s) => s.id === setId)
    expect(set.spacing).toBeGreaterThanOrEqual(MIN_PIN_SPACING)
    expect(Number.isFinite(set.spacing)).toBe(true)
  })
})
