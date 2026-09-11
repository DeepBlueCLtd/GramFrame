/**
 * The contrast controls' arithmetic (spec 171, FR-009 to FR-013).
 *
 * A floor and a ceiling over the *painted* level scale, both fractions of
 * 0..1. What they re-map is the 8-bit image `audio/gramImage.js` produced, not
 * the magnitude grid, which is discarded once the PNG exists — so this is
 * contrast adjustment, not a display range in the dB sense, and detail already
 * clipped at the file's 5th and 99.9th percentiles is not recoverable by any
 * position of these two controls (spec 171, Risks).
 *
 * Pure, so the rules an analyst feels — the two never cross, the defaults
 * reproduce the image exactly — are covered without a browser.
 */

/**
 * The contrast controls' positions: fractions of the painted 8-bit range, not
 * decibels — the magnitude grid is gone by the time these act.
 * @typedef {Object} DisplayRange
 * @property {number} floor - 0..1; levels at or below it render as background
 * @property {number} ceiling - 0..1, always above the floor; levels at or above it saturate
 */

/**
 * The floor and ceiling at rest: the whole painted range, which reproduces the
 * image exactly as it loads (FR-013).
 * @type {{floor: number, ceiling: number}}
 */
export const DEFAULT_DISPLAY_RANGE = { floor: 0, ceiling: 1 }

/**
 * The narrowest gap the two controls may be pushed to.
 *
 * They must not cross (FR-012), and coincident ends would divide by zero and
 * blank the image — a thing an analyst can do by accident with one drag, and
 * the spec's edge case says it must not happen.
 * @type {number}
 */
const MIN_DISPLAY_SPAN = 0.02

/**
 * Settle a proposed pair into a legal one.
 *
 * Whichever control the analyst moved is honoured and the other yields, so a
 * drag never stalls: pushing the floor into the ceiling pushes the ceiling up
 * ahead of it, until the top of the scale, where the floor stops instead.
 * @param {number} floor - Proposed floor, 0..1
 * @param {number} ceiling - Proposed ceiling, 0..1
 * @param {'floor'|'ceiling'} [moved='floor'] - Which control the analyst moved
 * @returns {{floor: number, ceiling: number}} A pair at least MIN_DISPLAY_SPAN apart, inside 0..1
 */
export function settleDisplayRange(floor, ceiling, moved = 'floor') {
  const lo = clamp01(Number.isFinite(floor) ? floor : 0)
  const hi = clamp01(Number.isFinite(ceiling) ? ceiling : 1)
  if (hi - lo >= MIN_DISPLAY_SPAN) {
    return { floor: lo, ceiling: hi }
  }
  if (moved === 'floor') {
    const settledFloor = Math.min(lo, 1 - MIN_DISPLAY_SPAN)
    return { floor: settledFloor, ceiling: settledFloor + MIN_DISPLAY_SPAN }
  }
  const settledCeiling = Math.max(hi, MIN_DISPLAY_SPAN)
  return { floor: settledCeiling - MIN_DISPLAY_SPAN, ceiling: settledCeiling }
}

/**
 * Whether a pair is the resting one, so the image may be shown unfiltered.
 * @param {DisplayRange} range - The pair to test
 * @returns {boolean} True when nothing is re-mapped
 */
export function isDefaultDisplayRange(range) {
  return range.floor === DEFAULT_DISPLAY_RANGE.floor && range.ceiling === DEFAULT_DISPLAY_RANGE.ceiling
}

/**
 * The linear transfer the pair describes, as an SVG `feFuncR/G/B` takes it:
 * `out = slope · in + intercept`, with everything below the floor landing at 0
 * and everything above the ceiling at 1.
 * @param {DisplayRange} range - Control positions
 * @returns {{slope: number, intercept: number}} Transfer coefficients
 */
export function displayTransfer(range) {
  const { floor, ceiling } = settleDisplayRange(range.floor, range.ceiling)
  const slope = 1 / (ceiling - floor)
  return { slope, intercept: -floor * slope }
}

/**
 * @param {number} value - Any number
 * @returns {number} The value inside 0..1
 */
function clamp01(value) {
  return Math.max(0, Math.min(1, value))
}
