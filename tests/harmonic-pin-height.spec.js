import { test, expect } from './helpers/fixtures.js'

/**
 * @fileoverview E2E tests for harmonic pin height sizing.
 *
 * Pin lines are sized in screen pixels, not in time units: their height is
 * derived from the base (unzoomed) render height, so zooming in/out leaves the
 * on-screen height unchanged while the pin keeps hanging from the anchor time
 * of the original click (its top edge — the symbol/pin junction — is the click).
 *
 * Debug config spans freq 0-100 Hz over time 0-60 s. A 10 Hz set anchored at
 * t=30 s keeps harmonic 5 (50 Hz) near the centre of the image, so it stays
 * visible at every zoom level exercised here.
 */

const ANCHOR_TIME = 30
const SPACING = 10
/** Harmonic that sits at the horizontal centre of the span (50 Hz of 0-100). */
const CENTRE_HARMONIC = 5

/**
 * Measure a single pin line's client-rect geometry alongside the image's, so the
 * pin height can be compared against the image height at the same zoom level.
 * @param {import('./helpers/gram-frame-page.js').GramFramePage} gfp - Page helper
 * @param {string} setId - Harmonic set id
 * @param {number} harmonicNumber - Which pin to measure
 * @returns {Promise<{lineHeight: number, lineTop: number, image: {top: number, height: number}}>}
 */
async function readPinGeometry(gfp, setId, harmonicNumber) {
  return gfp.page.evaluate(([id, num]) => {
    const line = document.querySelector(
      `.gram-frame-harmonic-line[data-harmonic-set-id="${id}"][data-harmonic-number="${num}"]`
    )
    const imageRect = document.querySelector('.gram-frame-spectrogram-image').getBoundingClientRect()
    const lineRect = line.getBoundingClientRect()
    return {
      lineHeight: lineRect.height,
      lineTop: lineRect.top,
      image: { top: imageRect.top, height: imageRect.height }
    }
  }, [setId, harmonicNumber])
}

test.describe('Harmonic pin height', () => {
  test.beforeEach(async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Harmonics')
    await gramFramePage.waitForImageDimensions()
  })

  test('pin height in pixels is unchanged by zooming', async ({ gramFramePage }) => {
    const setId = await gramFramePage.addHarmonicSet(ANCHOR_TIME, SPACING)

    const base = await readPinGeometry(gramFramePage, setId, CENTRE_HARMONIC)
    expect(base.lineHeight).toBeGreaterThan(0)

    for (const level of [2.0, 4.0, 8.0]) {
      await gramFramePage.setZoom(level, 0.5, 0.5)

      const zoomed = await readPinGeometry(gramFramePage, setId, CENTRE_HARMONIC)
      // The image really did grow — otherwise this test proves nothing.
      expect(zoomed.image.height).toBeGreaterThan(base.image.height * (level - 0.5))
      // ...but the pin did not.
      expect(zoomed.lineHeight).toBeCloseTo(base.lineHeight, 1)
    }
  })

  test('pin keeps hanging from its anchor time while zooming', async ({ gramFramePage }) => {
    const setId = await gramFramePage.addHarmonicSet(ANCHOR_TIME, SPACING)

    for (const level of [1.0, 2.0, 4.0]) {
      await gramFramePage.setZoom(level, 0.5, 0.5)

      const { lineTop, image } = await readPinGeometry(gramFramePage, setId, CENTRE_HARMONIC)
      // Where the anchor time falls on the (zoomed) image; time axis runs bottom-up.
      // The top of the pin — not its centre — is the anchor (issue #284).
      const expectedTop = image.top + (1 - ANCHOR_TIME / 60) * image.height
      expect(lineTop).toBeCloseTo(expectedTop, 0)
    }
  })

  test('a pin can still be grabbed at its anchor time when zoomed in', async ({ gramFramePage }) => {
    const setId = await gramFramePage.addHarmonicSet(ANCHOR_TIME, SPACING)
    await gramFramePage.setZoom(4.0, 0.5, 0.5)

    // Hit-testing works in the same pixel space as rendering: the anchor time is
    // the top of the pin, a point well below it (in the now-stretched time axis) is not.
    const hit = await gramFramePage.page.evaluate(([id, num]) => {
      // @ts-ignore - test-only global
      const instance = window.GramFrame.__test__getInstances()[0]
      const mode = instance.modes['harmonics']
      const freq = num * 10
      /**
       * @param {number} time - Time to probe at
       * @returns {boolean} Whether a harmonic set is found there
       */
      const probe = (time) => {
        return mode.findHarmonicSetAt({ freq, time })?.id === id
      }
      return { atAnchor: probe(30), farBelow: probe(10) }
    }, [setId, CENTRE_HARMONIC])

    expect(hit.atAnchor).toBe(true)
    expect(hit.farBelow).toBe(false)
  })
})
