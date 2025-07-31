/**
 * Doppler calculation utilities
 */

/// <reference path="../types.js" />

/**
 * Calculate the midpoint between two Doppler points
 * @param {Object} fPlus - f+ point with time and frequency
 * @param {Object} fMinus - f- point with time and frequency  
 * @returns {Object} Midpoint with time and frequency
 */
export function calculateMidpoint(fPlus, fMinus) {
  return {
    time: (fPlus.time + fMinus.time) / 2,
    freq: (fPlus.freq + fMinus.freq) / 2
  }
}

/**
 * Calculate speed using Doppler formula
 * @param {Object} fPlus - f+ point with time and frequency
 * @param {Object} fMinus - f- point with time and frequency
 * @param {Object} fZero - f₀ point with time and frequency (optional, uses midpoint if not provided)
 * @param {number} speedOfSound - Speed of sound in water (default: 1500 m/s)
 * @returns {number} Calculated speed in m/s
 */
export function calculateDopplerSpeed(fPlus, fMinus, fZero = null, speedOfSound = 1500) {
  // Use provided fZero or calculate midpoint
  const f0 = fZero ? fZero.freq : calculateMidpoint(fPlus, fMinus).freq
  
  // Calculate frequency shift
  const deltaF = (fPlus.freq - fMinus.freq) / 2
  
  // Apply Doppler formula: v = (c / f₀) × Δf
  const speed = (speedOfSound / f0) * deltaF
  
  return Math.abs(speed) // Return absolute value for speed
}

/**
 * Check if a point is near a Doppler marker for dragging
 * @param {Object} mousePos - Mouse position with x, y coordinates
 * @param {Object} markerSVG - Marker SVG position with x, y coordinates
 * @param {number} threshold - Distance threshold in pixels (default: 15)
 * @returns {boolean} True if mouse is near the marker
 */
export function isNearMarker(mousePos, markerSVG, threshold = 25) {
  const dx = mousePos.x - markerSVG.x
  const dy = mousePos.y - markerSVG.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  return distance <= threshold
}


