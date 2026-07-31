import { test, expect } from './helpers/fixtures.js'
import { MAX_VISIBLE_PINS, NICE_STEPS } from '../src/utils/harmonicSampling.js'

/**
 * @fileoverview E2E tests for harmonic pin sampling (feature 158), updated for
 * feature 159 which supersedes 158's pin-dropping.
 *
 * The debug page config spans freq 0-100 Hz over time 0-60 s. A harmonic set
 * with 0.5 Hz spacing would place 200 pins across that span. Feature 159 draws a
 * pin LINE for every one of them; the spec-158 sampling maths (cap
 * MAX_VISIBLE_PINS = 25, regular "nice" step) now governs which pins carry a
 * number LABEL/symbol. So these tests assert the sampling invariants on the
 * drawn labels, not on the drawn lines. A sparse set (large spacing) is drawn
 * and labelled in full.
 *
 * @see specs/158-harmonic-pin-sampling/spec.md
 * @see specs/159-harmonic-pin-labels/spec.md
 */

/**
 * Compute the constant step of an ascending arithmetic series, or null if the
 * series is not perfectly arithmetic (or too short to have a step).
 * @param {number[]} nums - Ascending harmonic numbers
 * @returns {number|null} The constant step, or null
 */
function arithmeticStep(nums) {
  if (nums.length < 2) return null
  const step = nums[1] - nums[0]
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] - nums[i - 1] !== step) return null
  }
  return step
}

test.describe('Harmonic Pin Sampling (feature 158)', () => {
  test.beforeEach(async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Harmonics')
    await gramFramePage.waitForImageDimensions()
  })

  // ────────────────────────────────────────────────────────────────
  // User Story 1 — Keep a dense harmonic set legible
  // ────────────────────────────────────────────────────────────────
  test.describe('US1: dense sets stay legible', () => {
    // T012
    test('a dense 0.5 Hz set labels no more than the cap while drawing all pins', async ({ gramFramePage }) => {
      const setId = await gramFramePage.addHarmonicSet(30, 0.5)

      // Every pin line is drawn (200 across 0-100 Hz) -> well over the label cap
      const lineCount = await gramFramePage.getHarmonicLineCount(setId)
      expect(lineCount).toBeGreaterThan(MAX_VISIBLE_PINS)

      // Only the thinned major subset carries a label
      const labelCount = (await gramFramePage.getHarmonicLabelNumbers(setId)).length
      expect(labelCount).toBeGreaterThan(0)
      expect(labelCount).toBeLessThanOrEqual(MAX_VISIBLE_PINS)
    })

    // T013
    test('labelled harmonic numbers form a constant-step series from NICE_STEPS', async ({ gramFramePage }) => {
      const setId = await gramFramePage.addHarmonicSet(30, 0.5)

      const nums = await gramFramePage.getHarmonicLabelNumbers(setId)
      // Ascending order
      for (let i = 1; i < nums.length; i++) {
        expect(nums[i]).toBeGreaterThan(nums[i - 1])
      }
      const step = arithmeticStep(nums)
      expect(step).not.toBeNull()
      // Dense set is thinned, so the step is a NICE_STEPS member greater than 1
      expect(NICE_STEPS).toContain(step)
      expect(step).toBeGreaterThan(1)
      // Every labelled number is a multiple of the step (anchored on multiples)
      for (const n of nums) {
        expect(n % (/** @type {number} */ (step))).toBe(0)
      }
    })

    // T014
    test('a sparse set draws and labels every pin (no thinning, step 1)', async ({ gramFramePage }) => {
      // spacing 20 Hz over 0-100 Hz -> harmonics 1..5, well under the cap
      const setId = await gramFramePage.addHarmonicSet(30, 20)

      const lineNums = await gramFramePage.getHarmonicNumbers(setId)
      expect(lineNums).toEqual([1, 2, 3, 4, 5])
      // Under the cap -> every drawn pin is labelled
      const labelNums = await gramFramePage.getHarmonicLabelNumbers(setId)
      expect(labelNums).toEqual([1, 2, 3, 4, 5])
    })
  })

  // ────────────────────────────────────────────────────────────────
  // User Story 2 — Reveal finer detail by zooming in
  // ────────────────────────────────────────────────────────────────
  //
  // NOTE: FR-007 / SC-003 require that zooming in never *decreases the density*
  // (never coarsens the sampling step) and never exceeds the cap. The absolute
  // count of drawn pins is intentionally NOT asserted to increase monotonically:
  // narrowing the visible span shrinks the harmonic population, so with a fixed
  // cap the raw count can fall even as the step refines. The step (density) is
  // the invariant the spec guarantees, so that is what we assert.
  test.describe('US2: progressive disclosure on zoom/pan', () => {
    // T016
    test('zooming in yields the same or a finer label step and stays within the cap', async ({ gramFramePage }) => {
      const setId = await gramFramePage.addHarmonicSet(30, 0.5)

      /** @type {number|null} */
      let prevStep = null
      for (const level of [1.0, 2.0, 4.0, 8.0]) {
        await gramFramePage.setZoom(level, 0.5, 0.5)

        const nums = await gramFramePage.getHarmonicLabelNumbers(setId)
        expect(nums.length).toBeLessThanOrEqual(MAX_VISIBLE_PINS)
        const step = arithmeticStep(nums) ?? 1
        if (prevStep !== null) {
          // density never decreases when zooming in -> label step never coarsens
          expect(step).toBeLessThanOrEqual(prevStep)
        }
        prevStep = step
      }
    })

    // T017
    test('zooming in far enough labels every pin in view (step 1)', async ({ gramFramePage }) => {
      const setId = await gramFramePage.addHarmonicSet(30, 0.5)

      // Zoom in progressively until the visible span is small enough that every
      // pin is labelled (step 1). Robust to the configured cap value.
      /** @type {number|null} */
      let step = null
      /** @type {number[]} */
      let nums = []
      for (const level of [4.0, 8.0, 16.0, 32.0]) {
        await gramFramePage.setZoom(level, 0.5, 0.5)
        nums = await gramFramePage.getHarmonicLabelNumbers(setId)
        expect(nums.length).toBeLessThanOrEqual(MAX_VISIBLE_PINS)
        step = arithmeticStep(nums)
        if (step === 1) break
      }
      expect(nums.length).toBeGreaterThan(0)
      // Every consecutive harmonic labelled -> nothing thinned out
      expect(step).toBe(1)
    })

    // T018
    test('zoom out/reset returns to a thinned state; a pan keeps the same label step', async ({ gramFramePage }) => {
      const setId = await gramFramePage.addHarmonicSet(30, 0.5)

      // Zoom in far enough to label every pin (step 1)
      let zoomedStep = null
      for (const level of [4.0, 8.0, 16.0, 32.0]) {
        await gramFramePage.setZoom(level, 0.5, 0.5)
        zoomedStep = arithmeticStep(await gramFramePage.getHarmonicLabelNumbers(setId))
        if (zoomedStep === 1) break
      }
      expect(zoomedStep).toBe(1)

      // Reset -> thinned again, within cap, coarser step
      await gramFramePage.setZoom(1.0, 0.5, 0.5)
      const resetNums = await gramFramePage.getHarmonicLabelNumbers(setId)
      expect(resetNums.length).toBeLessThanOrEqual(MAX_VISIBLE_PINS)
      const resetStep = arithmeticStep(resetNums)
      expect(resetStep).toBeGreaterThan(1)

      // Pan at a fixed zoom (with comfortable margin from the cap threshold):
      // the label step is unchanged, only which multiples are labelled shifts.
      await gramFramePage.setZoom(3.0, 0.5, 0.5)
      const before = await gramFramePage.getHarmonicLabelNumbers(setId)
      const stepBefore = arithmeticStep(before)

      await gramFramePage.setZoom(3.0, 0.6, 0.5)
      const after = await gramFramePage.getHarmonicLabelNumbers(setId)
      const stepAfter = arithmeticStep(after)

      expect(stepAfter).toBe(stepBefore)
      // Panning shifted the window -> the specific pins labelled changed
      expect(after[0]).not.toBe(before[0])
    })
  })

  // ────────────────────────────────────────────────────────────────
  // User Story 3 — Consistent labels and interaction on shown pins
  // ────────────────────────────────────────────────────────────────
  test.describe('US3: label and interaction consistency', () => {
    // T020
    test('every label corresponds to a drawn line (no orphan labels)', async ({ gramFramePage }) => {
      const setId = await gramFramePage.addHarmonicSet(30, 0.5)

      const lineNums = await gramFramePage.getHarmonicNumbers(setId)
      const labelNums = await gramFramePage.getHarmonicLabelNumbers(setId)

      // Labels are a thinned subset of the (all-drawn) lines: fewer labels than
      // lines, and every label's number is a drawn line number.
      expect(labelNums.length).toBeGreaterThan(0)
      expect(labelNums.length).toBeLessThanOrEqual(lineNums.length)
      const lineSet = new Set(lineNums)
      for (const label of labelNums) {
        expect(lineSet.has(label)).toBe(true)
      }
    })

    // T021
    test('a thinned set stays selectable in a label gap and adjustable', async ({ gramFramePage }) => {
      const setId = await gramFramePage.addHarmonicSet(30, 0.5)

      // Confirm the labels are genuinely thinned (a real label gap exists)
      const labelNums = await gramFramePage.getHarmonicLabelNumbers(setId)
      const step = arithmeticStep(labelNums)
      expect(step).toBeGreaterThan(1)
      // Harmonic 7 is drawn as a line but is NOT labelled (labels anchored on
      // multiples of the step > 1)
      expect(labelNums).not.toContain(7)

      // Harmonic 7 (freq 3.5 Hz). Hit-testing runs over the FULL series of drawn
      // pins, so the set is still selectable at an unlabelled pin.
      const gapFreq = 7 * 0.5
      const result = await gramFramePage.page.evaluate(([id, freq]) => {
        // @ts-ignore - test-only global
        const instance = window.GramFrame.__test__getInstances()[0]
        const harmonics = instance.modes['harmonics']
        // Cursor must be within the pin's vertical range (anchorTime = 30)
        instance.state.cursorPosition = {
          freq, time: 30, x: 0, y: 0, svgX: 0, svgY: 0, imageX: 0, imageY: 0
        }
        const found = harmonics.findHarmonicSetAtFrequency(freq)
        const target = harmonics.findHarmonicSetTarget({ freq, time: 30 })

        // Simulate a spacing adjustment via the drag seam (data coordinates),
        // exactly as the event layer would drive it.
        let spacingChanged = false
        if (target) {
          const original = instance.state.harmonics.harmonicSets.find((s) => s.id === id).spacing
          harmonics.onHarmonicSetDragStart(target, { freq, time: 30 })
          harmonics.onHarmonicSetDragUpdate(target, { freq: freq + 5, time: 30 }, { freq, time: 30 })
          harmonics.onHarmonicSetDragEnd(target, { freq: freq + 5, time: 30 })
          const updated = instance.state.harmonics.harmonicSets.find((s) => s.id === id).spacing
          spacingChanged = updated !== original
        }

        return {
          foundId: found ? found.id : null,
          hasTarget: !!target,
          spacingChanged
        }
      }, [setId, gapFreq])

      // Selectable in the sampling gap
      expect(result.foundId).toBe(setId)
      expect(result.hasTarget).toBe(true)
      // Adjustment took effect
      expect(result.spacingChanged).toBe(true)

      // After adjustment the labels are still bounded and a subset of the lines
      const afterNums = await gramFramePage.getHarmonicNumbers(setId)
      const afterLabels = await gramFramePage.getHarmonicLabelNumbers(setId)
      expect(afterLabels.length).toBeGreaterThan(0)
      expect(afterLabels.length).toBeLessThanOrEqual(MAX_VISIBLE_PINS)
      expect(afterLabels.length).toBeLessThanOrEqual(afterNums.length)
    })
  })
})
