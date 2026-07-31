/**
 * Pure harmonic-pin sampling utilities.
 *
 * When a harmonic set is placed with a small spacing (e.g. 0.5 Hz) over a wide
 * frequency span, drawing one pin per harmonic produces an illegible solid
 * block. These helpers cap the number of pins drawn per set to a maximum and,
 * when a set would exceed that cap, select a regularly-spaced subset (every Nth
 * harmonic, N chosen from a "nice" step series).
 *
 * The module is intentionally dependency-free (no DOM, no zoom, no state) so it
 * is trivially unit-testable in isolation. `HarmonicsMode` supplies the visible
 * harmonic range and renders whatever these functions return.
 *
 * MAX_VISIBLE_PINS, NICE_STEPS and chooseSamplingStep have no importer in
 * src/ (HarmonicsMode calls sampleHarmonics): they are test-only seams for the
 * unit lane, and are excluded from the unused-export ratchet on that basis.
 *
 * @see specs/158-harmonic-pin-sampling/contracts/sampling-algorithm.md
 */

/**
 * Maximum number of harmonic pins drawn per set within the visible span.
 * Lower values force a coarser sampling step (wider pin separation), which keeps
 * dense sets legible; raise it to show more pins.
 * @type {number}
 */
export const MAX_VISIBLE_PINS = 25

/**
 * Ascending "nice" step series (1-2-5 progression with the 25/250/2500 members
 * the feature explicitly calls out). A step of 1 means "show every pin".
 * @type {number[]}
 */
export const NICE_STEPS = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000]

/**
 * @typedef {Object} SamplingResult
 * @property {number} step - Chosen nice-series step S (1 when no thinning needed)
 * @property {number[]} harmonics - Ascending harmonic numbers to draw (length <= max)
 */

/**
 * Count the multiples of `step` in the inclusive range [minHarmonic, maxHarmonic].
 * @param {number} minHarmonic - Lowest harmonic number in view (>= 1)
 * @param {number} maxHarmonic - Highest harmonic number in view
 * @param {number} step - Candidate step
 * @returns {number} Number of multiples of `step` within the range
 */
function countMultiples(minHarmonic, maxHarmonic, step) {
  return Math.floor(maxHarmonic / step) - Math.floor((minHarmonic - 1) / step)
}

/**
 * Choose the smallest step from NICE_STEPS whose multiple-count in the inclusive
 * range [minHarmonic, maxHarmonic] is <= max.
 *
 * - Returns 1 when the range already fits (count <= max).
 * - Returns the largest NICE_STEPS member if none brings the count <= max
 *   (the renderer still hard-caps the emitted length).
 *
 * @param {number} minHarmonic - Lowest harmonic number in view (>= 1)
 * @param {number} maxHarmonic - Highest harmonic number in view
 * @param {number} [max=MAX_VISIBLE_PINS] - Maximum pins allowed
 * @returns {number} A member of NICE_STEPS
 */
export function chooseSamplingStep(minHarmonic, maxHarmonic, max = MAX_VISIBLE_PINS) {
  for (const step of NICE_STEPS) {
    if (countMultiples(minHarmonic, maxHarmonic, step) <= max) {
      return step
    }
  }
  return NICE_STEPS[NICE_STEPS.length - 1]
}

/**
 * Compute the sampled harmonic numbers to draw for a visible harmonic range.
 *
 * Emits ascending harmonic numbers that are multiples of the chosen step and lie
 * within [minHarmonic, maxHarmonic], anchored on multiples of the step (so pins
 * stay stable while panning). Generates directly (<= max iterations) and never
 * materialises the full range.
 *
 * @param {number} minHarmonic - Lowest harmonic number in view (>= 1)
 * @param {number} maxHarmonic - Highest harmonic number in view
 * @param {number} [max=MAX_VISIBLE_PINS] - Maximum pins allowed
 * @returns {SamplingResult} The chosen step and the harmonic numbers to draw
 */
export function sampledHarmonics(minHarmonic, maxHarmonic, max = MAX_VISIBLE_PINS) {
  if (maxHarmonic < minHarmonic) {
    return { step: 1, harmonics: [] }
  }

  const step = chooseSamplingStep(minHarmonic, maxHarmonic, max)

  // First multiple of `step` that is >= minHarmonic.
  const first = Math.ceil(minHarmonic / step) * step

  /** @type {number[]} */
  const harmonics = []
  for (let h = first; h <= maxHarmonic && harmonics.length < max; h += step) {
    harmonics.push(h)
  }

  return { step, harmonics }
}
