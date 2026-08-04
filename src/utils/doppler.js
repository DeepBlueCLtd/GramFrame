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
 * @param {number} speedOfSound - Speed of sound in water (default: 1500 m/s)
 * @returns {number} Calculated speed in m/s
 */
export function calculateDopplerSpeed(fPlus, fMinus, fZero = null, speedOfSound = 1481) {
  // Use provided fZero or calculate midpoint
  const f0 = fZero ? fZero.freq : calculateMidpoint(fPlus, fMinus).freq
  
  // Calculate frequency shift
  const deltaF = (fPlus.freq - fMinus.freq) / 2
  
  // Apply Doppler formula: v = (c / f₀) × Δf
  const speed = (speedOfSound / f0) * (deltaF)
  
  return Math.abs(speed) // Return absolute value for speed
}

