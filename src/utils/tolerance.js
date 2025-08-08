/**
 * Tolerance utilities for consistent mouse interaction handling across modes
 * 
 * Provides standardized tolerance calculations that balance precision with usability
 * across different zoom levels and coordinate systems.
 */

/// <reference path="../types.js" />

/**
 * Default tolerance configuration
 * @type {Object}
 */
export const DEFAULT_TOLERANCE = {
  // Pixel tolerance for drag/click detection (in SVG coordinate space)
  pixelRadius: 8,
  
  // Minimum data space tolerance (prevents overly sensitive interactions at high zoom)
  minDataTolerance: {
    time: 0.01,  // 0.01 seconds minimum
    freq: 1.0    // 1 Hz minimum
  },
  
  // Maximum data space tolerance (prevents insensitive interactions at low zoom)
  maxDataTolerance: {
    time: 0.5,   // 0.5 seconds maximum
    freq: 50.0   // 50 Hz maximum
  }
}

/**
 * Calculate tolerance in data coordinates based on current viewport and zoom
 * @param {Object} viewport - Viewport configuration
 * @param {HTMLElement|SVGImageElement} spectrogramImage - Spectrogram image element for scaling
 * @param {Object} [customTolerance] - Custom tolerance overrides
 * @returns {Object} Tolerance object with time and freq properties
 */
export function calculateDataTolerance(viewport, spectrogramImage, customTolerance = {}) {
  const config = { ...DEFAULT_TOLERANCE, ...customTolerance }
  
  if (!viewport || !spectrogramImage) {
    // Fallback to minimum tolerance if viewport/image unavailable
    return config.minDataTolerance
  }
  
  const { config: dataConfig, imageDetails, zoom } = viewport
  const { naturalWidth, naturalHeight } = imageDetails
  
  if (!dataConfig || !naturalWidth || !naturalHeight) {
    return config.minDataTolerance
  }
  
  // Calculate pixel-to-data conversion factors
  const timeRange = dataConfig.timeMax - dataConfig.timeMin
  const freqRange = dataConfig.freqMax - dataConfig.freqMin
  
  // Account for zoom level - higher zoom means smaller pixel tolerance in data space
  const effectiveZoom = zoom?.level || 1.0
  
  // Convert pixel tolerance to data space
  const timeToleranceFromPixels = (config.pixelRadius / naturalHeight) * timeRange / effectiveZoom
  const freqToleranceFromPixels = (config.pixelRadius / naturalWidth) * freqRange / effectiveZoom
  
  // Apply min/max constraints
  const timeTolerance = Math.max(
    config.minDataTolerance.time,
    Math.min(config.maxDataTolerance.time, timeToleranceFromPixels)
  )
  
  const freqTolerance = Math.max(
    config.minDataTolerance.freq,
    Math.min(config.maxDataTolerance.freq, freqToleranceFromPixels)
  )
  
  return {
    time: timeTolerance,
    freq: freqTolerance
  }
}

/**
 * Check if a position is within tolerance of a target position
 * @param {DataCoordinates} position - Position to check
 * @param {DataCoordinates} targetPosition - Target position
 * @param {Object} tolerance - Tolerance object with time and freq properties
 * @returns {boolean} True if within tolerance
 */
export function isWithinDataTolerance(position, targetPosition, tolerance) {
  const timeDiff = Math.abs(position.time - targetPosition.time)
  const freqDiff = Math.abs(position.freq - targetPosition.freq)
  
  return timeDiff <= tolerance.time && freqDiff <= tolerance.freq
}

/**
 * Calculate Euclidean distance in data coordinates using tolerance scaling
 * @param {DataCoordinates} pos1 - First position
 * @param {DataCoordinates} pos2 - Second position
 * @param {Object} tolerance - Tolerance object for scaling
 * @returns {number} Normalized distance (1.0 = at tolerance boundary)
 */
export function calculateNormalizedDistance(pos1, pos2, tolerance) {
  const timeDiff = Math.abs(pos1.time - pos2.time) / tolerance.time
  const freqDiff = Math.abs(pos1.freq - pos2.freq) / tolerance.freq
  
  return Math.sqrt(timeDiff * timeDiff + freqDiff * freqDiff)
}

/**
 * Check if position is within tolerance using Euclidean distance
 * @param {DataCoordinates} position - Position to check
 * @param {DataCoordinates} targetPosition - Target position
 * @param {Object} tolerance - Tolerance object with time and freq properties
 * @returns {boolean} True if within tolerance circle
 */
export function isWithinToleranceRadius(position, targetPosition, tolerance) {
  return calculateNormalizedDistance(position, targetPosition, tolerance) <= 1.0
}

/**
 * Find closest target within tolerance from a list of targets
 * @param {DataCoordinates} position - Position to check
 * @param {Array<{position: DataCoordinates, id: string, data?: any}>} targets - Array of targets
 * @param {Object} tolerance - Tolerance object with time and freq properties
 * @returns {Object|null} Closest target within tolerance, or null if none found
 */
export function findClosestTarget(position, targets, tolerance) {
  let closestTarget = null
  let closestDistance = Infinity
  
  for (const target of targets) {
    const distance = calculateNormalizedDistance(position, target.position, tolerance)
    
    if (distance <= 1.0 && distance < closestDistance) {
      closestDistance = distance
      closestTarget = target
    }
  }
  
  return closestTarget
}


/**
 * Mode-specific tolerance configurations
 * @type {Object}
 */
export const MODE_TOLERANCES = {
  analysis: {
    pixelRadius: 16, // Larger hit area for analysis markers (matches crosshair visual size)
    minDataTolerance: {
      time: 0.01,
      freq: 1.0
    },
    maxDataTolerance: {
      time: 0.5,
      freq: 50.0
    }
  },
  harmonics: {
    pixelRadius: 10, // Medium hit area for harmonic lines
    minDataTolerance: {
      time: 0.01,
      freq: 1.0
    },
    maxDataTolerance: {
      time: 0.5,
      freq: 50.0
    }
  },
  doppler: {
    pixelRadius: 12, // Medium-large hit area for doppler markers
    minDataTolerance: {
      time: 0.01,
      freq: 1.0
    },
    maxDataTolerance: {
      time: 0.5,
      freq: 50.0
    }
  }
}

/**
 * Get mode-specific tolerance calculation
 * @param {string} mode - Mode name (analysis, harmonics, doppler)
 * @param {Object} viewport - Viewport configuration
 * @param {HTMLElement|SVGImageElement} spectrogramImage - Spectrogram image element
 * @returns {Object} Tolerance object with time and freq properties
 */
export function getModeSpecificTolerance(mode, viewport, spectrogramImage) {
  const modeConfig = MODE_TOLERANCES[mode] || DEFAULT_TOLERANCE
  return calculateDataTolerance(viewport, spectrogramImage, modeConfig)
}

/**
 * Get uniform tolerance calculation for all modes
 * @param {Object} viewport - Viewport configuration
 * @param {HTMLElement|SVGImageElement} spectrogramImage - Spectrogram image element
 * @returns {Object} Tolerance object with time and freq properties
 */
export function getUniformTolerance(viewport, spectrogramImage) {
  return calculateDataTolerance(viewport, spectrogramImage, DEFAULT_TOLERANCE)
}