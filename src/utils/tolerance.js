/**
 * Tolerance utilities for consistent mouse interaction handling across modes
 * 
 * Provides standardized tolerance calculations that balance precision with usability
 * across different zoom levels and coordinate systems.
 */

/// <reference path="../types.js" />

/** @typedef {import('./coordinates.js').Viewport} Viewport */

/**
 * Tolerance in data space, as produced by `calculateDataTolerance` below.
 * @typedef {Object} DataTolerance
 * @property {number} time - Tolerance along the time axis, in seconds
 * @property {number} freq - Tolerance along the frequency axis, in Hz
 */

/**
 * The tunable constants behind `calculateDataTolerance`.
 * @typedef {Object} ToleranceConfig
 * @property {number} pixelRadius - Drag/click radius in SVG coordinate space
 * @property {DataTolerance} minDataTolerance - Floor, so high zoom does not make interactions hair-trigger
 * @property {DataTolerance} maxDataTolerance - Ceiling, so low zoom does not make them insensitive
 */

/**
 * Default tolerance configuration
 * @type {Object}
 */
/** @type {ToleranceConfig} */
const DEFAULT_TOLERANCE = {
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
 * @param {Viewport} viewport - Viewport configuration
 * @param {HTMLElement|SVGImageElement} spectrogramImage - Spectrogram image element for scaling
 * @param {Partial<ToleranceConfig>} [customTolerance] - Custom tolerance overrides
 * @returns {DataTolerance} Tolerance object with time and freq properties
 */
function calculateDataTolerance(viewport, spectrogramImage, customTolerance = {}) {
  const config = { ...DEFAULT_TOLERANCE, ...customTolerance }
  
  if (!viewport || !spectrogramImage) {
    // Fallback to minimum tolerance if viewport/image unavailable
    return config.minDataTolerance
  }
  
  const { config: dataConfig, imageDetails, zoom } = viewport
  const { naturalWidth, naturalHeight } = imageDetails
  // Base render size (defaults to natural; grows when expanded)
  const renderWidth = imageDetails.renderWidth || naturalWidth
  const renderHeight = imageDetails.renderHeight || naturalHeight

  if (!dataConfig || !renderWidth || !renderHeight) {
    return config.minDataTolerance
  }

  // Calculate pixel-to-data conversion factors
  const timeRange = dataConfig.timeMax - dataConfig.timeMin
  const freqRange = dataConfig.freqMax - dataConfig.freqMin

  // Account for zoom level - higher zoom means smaller pixel tolerance in data space
  const effectiveZoom = zoom?.level || 1.0

  // Convert pixel tolerance to data space (relative to the rendered image size)
  const timeToleranceFromPixels = (config.pixelRadius / renderHeight) * timeRange / effectiveZoom
  const freqToleranceFromPixels = (config.pixelRadius / renderWidth) * freqRange / effectiveZoom
  
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
 * @param {DataTolerance} tolerance - Tolerance object with time and freq properties
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
 * @param {DataTolerance} tolerance - Tolerance object for scaling
 * @returns {number} Normalized distance (1.0 = at tolerance boundary)
 */
function calculateNormalizedDistance(pos1, pos2, tolerance) {
  const timeDiff = Math.abs(pos1.time - pos2.time) / tolerance.time
  const freqDiff = Math.abs(pos1.freq - pos2.freq) / tolerance.freq
  
  return Math.sqrt(timeDiff * timeDiff + freqDiff * freqDiff)
}

/**
 * Check if position is within tolerance using Euclidean distance
 * @param {DataCoordinates} position - Position to check
 * @param {DataCoordinates} targetPosition - Target position
 * @param {DataTolerance} tolerance - Tolerance object with time and freq properties
 * @returns {boolean} True if within tolerance circle
 */
export function isWithinToleranceRadius(position, targetPosition, tolerance) {
  return calculateNormalizedDistance(position, targetPosition, tolerance) <= 1.0
}

/**
 * Find closest target within tolerance from a list of targets
 * @template {{position: DataCoordinates, id: string, data?: any}} T
 * @param {DataCoordinates} position - Position to check
 * @param {T[]} targets - Array of targets
 * @param {DataTolerance} tolerance - Tolerance object with time and freq properties
 * @returns {T|null} Closest target within tolerance, or null if none found
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
 * Get uniform tolerance calculation for all modes
 * @param {Viewport} viewport - Viewport configuration
 * @param {HTMLElement|SVGImageElement} spectrogramImage - Spectrogram image element
 * @returns {DataTolerance} Tolerance object with time and freq properties
 */
export function getUniformTolerance(viewport, spectrogramImage) {
  return calculateDataTolerance(viewport, spectrogramImage, DEFAULT_TOLERANCE)
}