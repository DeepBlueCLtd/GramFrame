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

