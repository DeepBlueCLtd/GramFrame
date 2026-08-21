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
 * @property {number} pixelRadius - Drag/click radius, in rendered image pixels
 * @property {DataTolerance} fallbackDataTolerance - Used only when the viewport
 *   is missing or degenerate and no pixel-derived value can be computed
 */

/**
 * Default tolerance configuration.
 *
 * `pixelRadius` is the whole policy: a feature is grabbable within 8 rendered
 * pixels of its position, on either axis, at any zoom and for any data range.
 *
 * There are deliberately no absolute data-space clamps. There used to be
 * (`maxDataTolerance: { time: 0.5, freq: 50 }`), and because a gram's data
 * range per pixel varies enormously between configs, that ceiling silently
 * shrank the hotspot to a fraction of its intended size on ordinary material:
 * on a 237px-tall gram spanning 60s, 0.5s is under 2px, so the grab band down
 * the time axis was *narrower than the marker glyph drawn on it* (issue: a
 * Doppler marker that could not be picked up). A ceiling expressed in seconds
 * and hertz cannot express "8 pixels"; the pixel radius already does.
 * @type {ToleranceConfig}
 */
const DEFAULT_TOLERANCE = {
  // Hit radius in rendered image pixels, applied to both axes
  pixelRadius: 8,

  // Only reached when the viewport cannot be read at all
  fallbackDataTolerance: {
    time: 0.01,
    freq: 1.0
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
    return config.fallbackDataTolerance
  }

  const { config: dataConfig, imageDetails, zoom } = viewport
  const { naturalWidth, naturalHeight } = imageDetails
  // Base render size (defaults to natural; grows when expanded)
  const renderWidth = imageDetails.renderWidth || naturalWidth
  const renderHeight = imageDetails.renderHeight || naturalHeight

  if (!dataConfig || !renderWidth || !renderHeight) {
    return config.fallbackDataTolerance
  }

  // Calculate pixel-to-data conversion factors
  const timeRange = dataConfig.timeMax - dataConfig.timeMin
  const freqRange = dataConfig.freqMax - dataConfig.freqMin

  // Zooming in draws the same data over more pixels, so the same on-screen
  // radius covers proportionally less data. Dividing by the zoom level is what
  // keeps the grab radius a constant *visual* size at every zoom.
  const effectiveZoom = zoom?.level || 1.0

  return {
    time: (config.pixelRadius / renderHeight) * timeRange / effectiveZoom,
    freq: (config.pixelRadius / renderWidth) * freqRange / effectiveZoom
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
 * Get uniform tolerance calculation for all modes.
 *
 * Every mode's hit test goes through here, so "how close counts as on it" is
 * one answer rather than four.
 * @param {Viewport} viewport - Viewport configuration
 * @param {HTMLElement|SVGImageElement} spectrogramImage - Spectrogram image element
 * @returns {DataTolerance} Tolerance object with time and freq properties
 */
export function getUniformTolerance(viewport, spectrogramImage) {
  return calculateDataTolerance(viewport, spectrogramImage, DEFAULT_TOLERANCE)
}