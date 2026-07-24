import { test, expect } from './helpers/fixtures.js'
import { MAX_VISIBLE_PINS } from '../src/utils/harmonicSampling.js'

/**
 * @fileoverview E2E tests for feature 159 — show every harmonic pin line, label
 * only the thinned "major" subset, and stack each label centred above its symbol.
 *
 * Debug config spans freq 0-100 Hz over time 0-60 s, so a 0.5 Hz set places 200
 * pins (harmonics 1..200) across the visible span.
 *
 * @see specs/159-harmonic-pin-labels/spec.md
 */

/**
 * Read per-harmonic client-rect geometry for one set's lines, labels and symbols.
 * Symbols carry no harmonic number, so each is matched to a line by nearest
 * centre-x. Returns null entries where a labelled harmonic has no matched symbol.
 * @param {import('./helpers/gram-frame-page.js').GramFramePage} gfp - Page helper
 * @param {string} setId - Harmonic set id
 * @returns {Promise<{image: {top:number}, byNum: Record<string, any>}>}
 */
async function readStackGeometry(gfp, setId) {
  return gfp.page.evaluate((id) => {
    const centreX = (r) => (r.left + r.right) / 2
    const image = document.querySelector('.gram-frame-spectrogram-image')
    const imageRect = image.getBoundingClientRect()

    const lines = Array.from(document.querySelectorAll(
      `.gram-frame-harmonic-line[data-harmonic-set-id="${id}"]`
    ))
    const labels = Array.from(document.querySelectorAll(
      `.gram-frame-harmonic-number[data-harmonic-set-id="${id}"]`
    ))
    const symbols = Array.from(document.querySelectorAll(
      `.gram-frame-harmonic-symbol[data-harmonic-set-id="${id}"]`
    ))

    /** @type {Record<string, any>} */
    const byNum = {}
    for (const label of labels) {
      const num = label.getAttribute('data-harmonic-number')
      const line = lines.find((l) => l.getAttribute('data-harmonic-number') === num)
      if (!line) continue
      const lineRect = line.getBoundingClientRect()
      const lineCx = centreX(lineRect)
      const labelRect = label.getBoundingClientRect()

      // Match the symbol whose centre-x is closest to this pin's line.
      let symbolRect = null
      let best = Infinity
      for (const s of symbols) {
        const sr = s.getBoundingClientRect()
        const d = Math.abs(centreX(sr) - lineCx)
        if (d < best) { best = d; symbolRect = sr }
      }

      byNum[num] = {
        lineTop: lineRect.top,
        lineCx,
        labelBottom: labelRect.bottom,
        labelTop: labelRect.top,
        labelCx: centreX(labelRect),
        symbolTop: symbolRect ? symbolRect.top : null,
        symbolBottom: symbolRect ? symbolRect.bottom : null,
        symbolCx: symbolRect ? centreX(symbolRect) : null
      }
    }
    return { image: { top: imageRect.top }, byNum }
  }, setId)
}

test.describe('Harmonic Pin Labels (feature 159)', () => {
  test.beforeEach(async ({ gramFramePage }) => {
    await gramFramePage.page.waitForTimeout(100)
    await gramFramePage.clickMode('Harmonics')
    await gramFramePage.waitForImageDimensions()
  })

  // ────────────────────────────────────────────────────────────────
  // User Story 1 — See every harmonic pin, even at high density
  // ────────────────────────────────────────────────────────────────
  test.describe('US1: every pin line drawn, only labels thinned', () => {
    test('a dense set draws a line for every harmonic in the span (no gaps)', async ({ gramFramePage }) => {
      const setId = await gramFramePage.addHarmonicSet(30, 0.5)
      await gramFramePage.page.waitForTimeout(100)

      const lineNums = await gramFramePage.getHarmonicNumbers(setId)
      // Far more than the label cap are drawn
      expect(lineNums.length).toBeGreaterThan(MAX_VISIBLE_PINS)
      // Contiguous run of every harmonic in the span (no dropped lines)
      for (let i = 1; i < lineNums.length; i++) {
        expect(lineNums[i]).toBe(lineNums[i - 1] + 1)
      }
      // freq 0-100 at 0.5 Hz -> harmonics 1..200
      expect(lineNums[0]).toBe(1)
      expect(lineNums[lineNums.length - 1]).toBe(200)
    })

    test('labels are a bounded, evenly-spaced subset of the drawn lines', async ({ gramFramePage }) => {
      const setId = await gramFramePage.addHarmonicSet(30, 0.5)
      await gramFramePage.page.waitForTimeout(100)

      const lineNums = new Set(await gramFramePage.getHarmonicNumbers(setId))
      const labelNums = await gramFramePage.getHarmonicLabelNumbers(setId)

      expect(labelNums.length).toBeGreaterThan(0)
      expect(labelNums.length).toBeLessThanOrEqual(MAX_VISIBLE_PINS)
      // Every label maps to an actual drawn pin (no orphan labels, FR-008)
      for (const n of labelNums) {
        expect(lineNums.has(n)).toBe(true)
      }
      // Evenly spaced (regular step > 1 for a dense set, FR-004)
      const step = labelNums[1] - labelNums[0]
      expect(step).toBeGreaterThan(1)
      for (let i = 1; i < labelNums.length; i++) {
        expect(labelNums[i] - labelNums[i - 1]).toBe(step)
      }
    })

    test('one symbol per labelled pin, capped with the labels', async ({ gramFramePage }) => {
      const setId = await gramFramePage.addHarmonicSet(30, 0.5)
      await gramFramePage.page.waitForTimeout(100)

      const labelCount = (await gramFramePage.getHarmonicLabelNumbers(setId)).length
      const symbols = await gramFramePage.getPinSymbols(setId)
      expect(symbols.length).toBe(labelCount)
      expect(symbols.length).toBeLessThanOrEqual(MAX_VISIBLE_PINS)
    })

    test('a set within the limit labels every drawn pin', async ({ gramFramePage }) => {
      // spacing 20 Hz over 0-100 Hz -> harmonics 1..5, under the cap
      const setId = await gramFramePage.addHarmonicSet(30, 20)
      await gramFramePage.page.waitForTimeout(100)

      const lineNums = await gramFramePage.getHarmonicNumbers(setId)
      const labelNums = await gramFramePage.getHarmonicLabelNumbers(setId)
      expect(lineNums).toEqual([1, 2, 3, 4, 5])
      expect(labelNums).toEqual([1, 2, 3, 4, 5])
    })

    test('zooming in on a dense set never coarsens the label step', async ({ gramFramePage }) => {
      const setId = await gramFramePage.addHarmonicSet(30, 0.5)
      await gramFramePage.page.waitForTimeout(100)

      /** @type {number|null} */
      let prevStep = null
      for (const level of [1.0, 2.0, 4.0, 8.0]) {
        await gramFramePage.setZoom(level, 0.5, 0.5)
        await gramFramePage.page.waitForTimeout(100)

        // Every visible pin still has a line (contiguous) at each zoom level
        const lineNums = await gramFramePage.getHarmonicNumbers(setId)
        for (let i = 1; i < lineNums.length; i++) {
          expect(lineNums[i]).toBe(lineNums[i - 1] + 1)
        }

        const labelNums = await gramFramePage.getHarmonicLabelNumbers(setId)
        expect(labelNums.length).toBeLessThanOrEqual(MAX_VISIBLE_PINS)
        const step = labelNums.length >= 2 ? labelNums[1] - labelNums[0] : 1
        if (prevStep !== null) {
          expect(step).toBeLessThanOrEqual(prevStep)
        }
        prevStep = step
      }
    })
  })

  // ────────────────────────────────────────────────────────────────
  // User Story 2 — Read labels clearly above the pins
  // ────────────────────────────────────────────────────────────────
  test.describe('US2: label centred above the symbol', () => {
    test('each label is centred on its pin and stacked above symbol above line', async ({ gramFramePage }) => {
      // Sparse set -> every pin labelled, clear 1:1 label/symbol/line matching
      const setId = await gramFramePage.addHarmonicSet(30, 20)
      await gramFramePage.page.waitForTimeout(100)

      // Label element attributes: centred on the pin line, anchored middle
      const attrs = await gramFramePage.page.evaluate((id) => {
        const line = document.querySelector(
          `.gram-frame-harmonic-line[data-harmonic-set-id="${id}"][data-harmonic-number="2"]`
        )
        const label = document.querySelector(
          `.gram-frame-harmonic-number[data-harmonic-set-id="${id}"][data-harmonic-number="2"]`
        )
        return {
          lineX: parseFloat(line.getAttribute('x1')),
          labelX: parseFloat(label.getAttribute('x')),
          anchor: label.getAttribute('text-anchor')
        }
      }, setId)
      expect(attrs.anchor).toBe('middle')
      expect(Math.abs(attrs.labelX - attrs.lineX)).toBeLessThanOrEqual(0.5)

      // Client-rect geometry: label above symbol above line top, centred
      const { byNum } = await readStackGeometry(gramFramePage, setId)
      const entries = Object.values(byNum)
      expect(entries.length).toBeGreaterThan(0)
      for (const g of entries) {
        // Horizontally centred on the pin (within a few px)
        expect(Math.abs(g.labelCx - g.lineCx)).toBeLessThanOrEqual(3)
        expect(Math.abs(g.symbolCx - g.lineCx)).toBeLessThanOrEqual(3)
        // Vertical order: label -> symbol -> line top (small tolerance)
        expect(g.labelBottom).toBeLessThanOrEqual(g.symbolTop + 2)
        expect(g.symbolBottom).toBeLessThanOrEqual(g.lineTop + 2)
      }
    })

    test('a label/symbol stack near the top edge stays within the image', async ({ gramFramePage }) => {
      // Place the pin at each time extreme; whichever puts the pin near the top
      // must still keep the label within the image's top edge (FR-011).
      for (const anchorTime of [0, 60]) {
        const setId = await gramFramePage.addHarmonicSet(anchorTime, 20)
        await gramFramePage.page.waitForTimeout(100)

        const { image, byNum } = await readStackGeometry(gramFramePage, setId)
        const entries = Object.values(byNum)
        expect(entries.length).toBeGreaterThan(0)
        for (const g of entries) {
          // The label never renders above the top edge of the spectrogram
          expect(g.labelTop).toBeGreaterThanOrEqual(image.top - 1)
        }
      }
    })
  })
})
