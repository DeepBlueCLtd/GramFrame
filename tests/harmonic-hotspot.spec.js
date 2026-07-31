import { test, expect } from './helpers/fixtures.js'

/**
 * @fileoverview E2E tests for the grab region ("hotspot") of an existing
 * harmonic set.
 *
 * Everything drawn for a pin should grab it: the pin line, and the number label
 * and symbol stacked above the line's top. Previously only the line's own span
 * was live, so the digits and symbol were dead space — and a set with its pin
 * hidden could only be grabbed in the blank gap below its digits, where the
 * (undrawn) line would have been.
 *
 * Debug config spans freq 0-100 Hz over time 0-60 s.
 */

const ANCHOR_TIME = 30
const SPACING = 10
/** Harmonic near the horizontal centre of the span (50 Hz of 0-100). */
const CENTRE_HARMONIC = 5

/**
 * Probe the harmonics hit-test at the centre of a rendered element, converting
 * that element's on-screen position back into data coordinates the same way a
 * mouse over it would resolve.
 *
 * @param {import('./helpers/gram-frame-page.js').GramFramePage} gfp - Page helper
 * @param {string} selector - CSS selector of the element to probe over
 * @param {number} [dy=0] - Extra vertical offset in client px (+ve = downwards)
 * @returns {Promise<string|null>} Id of the harmonic set found there, if any
 */
async function probeAt(gfp, selector, dy = 0) {
  return gfp.page.evaluate(([sel, offsetY]) => {
    const el = document.querySelector(sel)
    if (!el) return 'ELEMENT_NOT_FOUND'
    const rect = el.getBoundingClientRect()
    const imageRect = document.querySelector('.gram-frame-spectrogram-image').getBoundingClientRect()

    const cx = (rect.left + rect.right) / 2
    const cy = (rect.top + rect.bottom) / 2 + offsetY
    // Debug config: 0-100 Hz across the image, 0-60 s bottom-up.
    const freq = 100 * (cx - imageRect.left) / imageRect.width
    const time = 60 * (1 - (cy - imageRect.top) / imageRect.height)

    // @ts-ignore - test-only global
    const instance = window.GramFrame.__test__getInstances()[0]
    instance.state.cursorPosition = { freq, time, x: 0, y: 0, svgX: 0, svgY: 0, imageX: 0, imageY: 0 }
    const found = instance.modes['harmonics'].findHarmonicSetAtFrequency(freq)
    return found ? found.id : null
  }, [selector, dy])
}

/**
 * Probe the harmonics hit-test directly at a data coordinate.
 *
 * @param {import('./helpers/gram-frame-page.js').GramFramePage} gfp - Page helper
 * @param {number} freq - Frequency in Hz
 * @param {number} time - Time in seconds
 * @returns {Promise<string|null>} Id of the harmonic set found there, if any
 */
async function probeAtData(gfp, freq, time) {
  return gfp.page.evaluate(([f, t]) => {
    // @ts-ignore - test-only global
    const instance = window.GramFrame.__test__getInstances()[0]
    instance.state.cursorPosition = { freq: f, time: t, x: 0, y: 0, svgX: 0, svgY: 0, imageX: 0, imageY: 0 }
    const found = instance.modes['harmonics'].findHarmonicSetAtFrequency(f)
    return found ? found.id : null
  }, [freq, time])
}

/**
 * Set properties on an existing harmonic set through the mode's own updater, so
 * the overlay re-renders exactly as it would after a control-panel edit.
 * @param {import('./helpers/gram-frame-page.js').GramFramePage} gfp - Page helper
 * @param {string} setId - Harmonic set id
 * @param {Object} updates - Properties to apply
 * @returns {Promise<void>}
 */
async function updateSet(gfp, setId, updates) {
  await gfp.page.evaluate(([id, patch]) => {
    // @ts-ignore - test-only global
    const instance = window.GramFrame.__test__getInstances()[0]
    instance.modes['harmonics'].updateHarmonicSet(id, patch)
  }, [setId, updates])
}

/**
 * Selector for a pin's number label.
 * @param {string} setId - Harmonic set id
 * @param {number} harmonicNumber - Harmonic number
 * @returns {string} CSS selector
 */
const labelSelector = (setId, harmonicNumber) =>
  `.gram-frame-harmonic-number[data-harmonic-set-id="${setId}"][data-harmonic-number="${harmonicNumber}"]`

test.describe('Harmonic set hotspot', () => {
  test.beforeEach(async ({ gramFramePage }) => {
    await gramFramePage.page.waitForTimeout(100)
    await gramFramePage.clickMode('Harmonics')
    await gramFramePage.waitForImageDimensions()
  })

  test('the number label grabs its harmonic set', async ({ gramFramePage }) => {
    const setId = await gramFramePage.addHarmonicSet(ANCHOR_TIME, SPACING)
    await gramFramePage.page.waitForTimeout(100)

    expect(await probeAt(gramFramePage, labelSelector(setId, CENTRE_HARMONIC))).toBe(setId)
  })

  test('the symbol grabs its harmonic set', async ({ gramFramePage }) => {
    const setId = await gramFramePage.addHarmonicSet(ANCHOR_TIME, SPACING)
    await updateSet(gramFramePage, setId, { symbol: 'circle' })
    await gramFramePage.page.waitForTimeout(100)

    const symbol = `.gram-frame-harmonic-symbol[data-harmonic-set-id="${setId}"]`
    expect(await probeAt(gramFramePage, symbol)).toBe(setId)
  })

  test('the pin line itself still grabs its harmonic set', async ({ gramFramePage }) => {
    const setId = await gramFramePage.addHarmonicSet(ANCHOR_TIME, SPACING)
    await gramFramePage.page.waitForTimeout(100)

    const line = `.gram-frame-harmonic-line[data-harmonic-set-id="${setId}"][data-harmonic-number="${CENTRE_HARMONIC}"]`
    expect(await probeAt(gramFramePage, line)).toBe(setId)
  })

  test('with the pin hidden, the number label alone grabs the set', async ({ gramFramePage }) => {
    const setId = await gramFramePage.addHarmonicSet(ANCHOR_TIME, SPACING)
    await updateSet(gramFramePage, setId, { showPin: false })
    await gramFramePage.page.waitForTimeout(100)

    // No lines are drawn, so the label/symbol stack is the whole feature.
    expect(await gramFramePage.page.locator(
      `.gram-frame-harmonic-line[data-harmonic-set-id="${setId}"]`
    ).count()).toBe(0)

    expect(await probeAt(gramFramePage, labelSelector(setId, CENTRE_HARMONIC))).toBe(setId)
  })

  test('with the pin hidden, the blank span below the label does not grab the set', async ({ gramFramePage }) => {
    const setId = await gramFramePage.addHarmonicSet(ANCHOR_TIME, SPACING)
    await gramFramePage.page.waitForTimeout(100)

    // The anchor time is the vertical centre of the pin line — and the only
    // place a pin-less set used to be grabbable, well below its digits.
    const probe = () => probeAtData(gramFramePage, CENTRE_HARMONIC * SPACING, ANCHOR_TIME)

    // While the pin is drawn, that point is on the line and grabs the set...
    expect(await probe()).toBe(setId)

    // ...once the pin is hidden it is blank space, and grabs nothing.
    await updateSet(gramFramePage, setId, { showPin: false })
    await gramFramePage.page.waitForTimeout(100)
    expect(await probe()).toBeNull()
  })

  test('the stack and the line meet with no dead gap between them', async ({ gramFramePage }) => {
    const setId = await gramFramePage.addHarmonicSet(ANCHOR_TIME, SPACING)
    await gramFramePage.page.waitForTimeout(100)

    // Just below the digits is where the symbol sits and the line begins.
    expect(await probeAt(gramFramePage, labelSelector(setId, CENTRE_HARMONIC), 6)).toBe(setId)
  })

  test('empty space well above the stack does not grab the set', async ({ gramFramePage }) => {
    const setId = await gramFramePage.addHarmonicSet(ANCHOR_TIME, SPACING)
    await gramFramePage.page.waitForTimeout(100)

    expect(await probeAt(gramFramePage, labelSelector(setId, CENTRE_HARMONIC), -60)).toBeNull()
  })
})
