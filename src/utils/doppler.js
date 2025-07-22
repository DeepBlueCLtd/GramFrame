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
    frequency: (fPlus.frequency + fMinus.frequency) / 2
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
  const f0 = fZero ? fZero.frequency : calculateMidpoint(fPlus, fMinus).frequency
  
  // Calculate frequency shift
  const deltaF = (fPlus.frequency - fMinus.frequency) / 2
  
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
export function isNearMarker(mousePos, markerSVG, threshold = 15) {
  const dx = mousePos.x - markerSVG.x
  const dy = mousePos.y - markerSVG.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  return distance <= threshold
}

/**
 * Convert screen coordinates to data coordinates for Doppler points
 * @param {Object} screenPos - Screen position with x, y coordinates
 * @param {Object} instance - GramFrame instance
 * @returns {Object} Data coordinates with time and frequency
 */
export function screenToDopplerData(screenPos, instance) {
  const margins = instance.state.axes.margins
  const { naturalWidth, naturalHeight } = instance.state.imageDetails
  const { timeMin, timeMax, freqMin, freqMax } = instance.state.config
  
  // Convert screen position to SVG coordinates within the image bounds
  const imageX = Math.max(0, Math.min(naturalWidth, screenPos.x - margins.left))
  const imageY = Math.max(0, Math.min(naturalHeight, screenPos.y - margins.top))
  
  // Convert to data coordinates
  const freqRatio = imageX / naturalWidth
  const timeRatio = 1 - (imageY / naturalHeight) // Invert Y since time increases bottom to top
  
  return {
    time: timeMin + timeRatio * (timeMax - timeMin),
    frequency: freqMin + freqRatio * (freqMax - freqMin)
  }
}

/**
 * Convert data coordinates to SVG coordinates for Doppler points
 * @param {Object} dataPoint - Data point with time and frequency
 * @param {Object} instance - GramFrame instance
 * @returns {Object} SVG coordinates with x, y
 */
export function dopplerDataToSVG(dataPoint, instance) {
  const margins = instance.state.axes.margins
  const { naturalWidth, naturalHeight } = instance.state.imageDetails
  const { timeMin, timeMax, freqMin, freqMax } = instance.state.config
  
  const timeRatio = (dataPoint.time - timeMin) / (timeMax - timeMin)
  const freqRatio = (dataPoint.frequency - freqMin) / (freqMax - freqMin)
  
  return {
    x: margins.left + freqRatio * naturalWidth,
    y: margins.top + (1 - timeRatio) * naturalHeight // Invert Y coordinate
  }
}