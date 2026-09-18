/**
 * Doppler calculation utilities
 */

/// <reference path="../types.js" />

/**
 * Conversion factor from metres per second to knots.
 * @type {number}
 */
export const MS_TO_KNOTS = 1.94384

/**
 * Speed of sound in seawater, in metres per second.
 *
 * 1500 m/s is the nominal seawater figure sonar training works to. The code
 * used to run on 1481 -- fresh water at 20 °C -- while both this function's
 * own JSDoc and `docs/Doppler-Calc.md` said 1500, so every speed an analyst
 * read was 1.3 % below what the specification described and nothing in the
 * repository agreed with anything else (R9-04). Nothing in `src/` passes
 * `speedOfSound`, so this default is what every analyst sees.
 *
 * Not exported: it has no caller outside this module, and the unit lane keeps
 * it, the JSDoc and the specification in step instead.
 * @type {number}
 */
const DEFAULT_SPEED_OF_SOUND = 1500

/**
 * Calculate the midpoint between two Doppler points
 * @param {DataCoordinates} fPlus - f+ point with time and frequency
 * @param {DataCoordinates} fMinus - f- point with time and frequency  
 * @returns {DataCoordinates} Midpoint with time and frequency
 */
export function calculateMidpoint(fPlus, fMinus) {
  return {
    time: (fPlus.time + fMinus.time) / 2,
    freq: (fPlus.freq + fMinus.freq) / 2
  }
}

/**
 * Calculate speed using Doppler formula
 * @param {DataCoordinates} fPlus - f+ point with time and frequency
 * @param {DataCoordinates} fMinus - f- point with time and frequency
 * @param {DataCoordinates|null} [fZero] - f₀ point with time and frequency (optional, uses midpoint if not provided)
 * @param {number} [speedOfSound] - Speed of sound in water in m/s (default: 1500, nominal seawater)
 * @returns {number} Calculated speed in m/s — the UI converts to knots for display
 */
export function calculateDopplerSpeed(fPlus, fMinus, fZero = null, speedOfSound = DEFAULT_SPEED_OF_SOUND) {
  // Use provided fZero or calculate midpoint
  const f0 = fZero ? fZero.freq : calculateMidpoint(fPlus, fMinus).freq
  
  // Calculate frequency shift
  const deltaF = (fPlus.freq - fMinus.freq) / 2
  
  // Apply Doppler formula: v = (c / f₀) × Δf
  const speed = (speedOfSound / f0) * (deltaF)
  
  return Math.abs(speed) // Return absolute value for speed
}

/**
 * Whether all three markers are placed: the one rule for "there is a curve",
 * shared by the renderer, the mode's capability predicate and storage. Anything
 * less draws nothing, so it must count as nothing too. A lone f+ used to count
 * as an annotation and block every later placement.
 * @param {DopplerState|null|undefined} doppler - Doppler state
 * @returns {boolean} True when f+, f- and f₀ are all set
 */
export function isCompleteCurve(doppler) {
  return !!(doppler && doppler.fPlus && doppler.fMinus && doppler.fZero)
}

/**
 * A complete curve, as it stood when a placement began to replace it.
 * @typedef {Object} DopplerCurveSnapshot
 * @property {DataCoordinates} fPlus - The f+ marker
 * @property {DataCoordinates} fMinus - The f- marker
 * @property {DataCoordinates} fZero - The f₀ marker
 * @property {number|null} speed - The speed it gave, in m/s
 * @property {string|null} color - The colour it was drawn in
 */

/**
 * The curve a placement is about to replace, or null when there is not a
 * complete one to come back to.
 * @param {DopplerState} doppler - Doppler state
 * @returns {DopplerCurveSnapshot|null} A copy of the curve, or null
 */
export function snapshotCurve(doppler) {
  if (!isCompleteCurve(doppler)) {
    return null
  }
  return {
    fPlus: { .../** @type {DataCoordinates} */ (doppler.fPlus) },
    fMinus: { .../** @type {DataCoordinates} */ (doppler.fMinus) },
    fZero: { .../** @type {DataCoordinates} */ (doppler.fZero) },
    speed: doppler.speed,
    color: doppler.color
  }
}

/**
 * The snapshot a `place` target carries, if any.
 * @param {DragTarget} target - Drag target from the engine
 * @returns {DopplerCurveSnapshot|null} The replaced curve, or null
 */
export function replacedCurveOf(target) {
  return (target.data && target.data.replaced) || null
}
