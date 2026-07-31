/**
 * Enhanced coordinate transformation utilities for GramFrame
 * 
 * This module provides functions to convert between different coordinate systems
 * with zoom awareness and boundary checking:
 * - Data coordinates (time/frequency values) to SVG coordinates
 * - Screen coordinates to data coordinates
 * - Zoom-aware positioning calculations
 * - Boundary validation utilities
 */

/// <reference path="../types.js" />

/**
 * Convert data coordinates to SVG coordinates (zoom-aware)
 * @param {DataCoordinates} dataPoint - Data point with time and frequency
 * @param {Object} viewport - Current viewport state
 * @param {Object} viewport.margins - SVG margins
 * @param {ImageDetails} viewport.imageDetails - Image dimensions
 * @param {Config} viewport.config - Configuration object
 * @param {Object} viewport.zoom - Zoom state
 * @param {SVGImageElement} spectrogramImage - Spectrogram image element
 * @returns {SVGCoordinates} SVG coordinates with x, y
 */
export function dataToSVG(dataPoint, viewport, spectrogramImage = null) {
  const { margins, imageDetails, config } = viewport
  const { naturalWidth, naturalHeight } = imageDetails
  const renderWidth = imageDetails.renderWidth || naturalWidth
  const renderHeight = imageDetails.renderHeight || naturalHeight
  const { timeMin, timeMax, freqMin, freqMax } = config

  // Calculate ratios in data space
  const timeRatio = (dataPoint.time - timeMin) / (timeMax - timeMin)
  const freqRatio = (dataPoint.freq - freqMin) / (freqMax - freqMin)

  // Get current image position and dimensions. The element's attributes are the
  // source of truth (they reflect expand × zoom), so read them whenever present.
  let imageLeft = margins.left
  let imageTop = margins.top
  let imageWidth = renderWidth
  let imageHeight = renderHeight

  if (spectrogramImage) {
    imageLeft = parseFloat(spectrogramImage.getAttribute('x') || String(margins.left))
    imageTop = parseFloat(spectrogramImage.getAttribute('y') || String(margins.top))
    imageWidth = parseFloat(spectrogramImage.getAttribute('width') || String(renderWidth))
    imageHeight = parseFloat(spectrogramImage.getAttribute('height') || String(renderHeight))
  }
  
  return {
    x: imageLeft + freqRatio * imageWidth,
    y: imageTop + (1 - timeRatio) * imageHeight // Invert Y coordinate
  }
}

/**
 * Calculate zoom-aware position for rendering elements
 * @param {DataCoordinates} point - Data coordinates
 * @param {Object} viewport - Current viewport state
 * @param {SVGImageElement} spectrogramImage - Spectrogram image element
 * @returns {SVGCoordinates} Zoom-aware SVG coordinates
 */
export function calculateZoomAwarePosition(point, viewport, spectrogramImage = null) {
  const { margins, imageDetails, config } = viewport
  const { naturalWidth, naturalHeight } = imageDetails
  const renderWidth = imageDetails.renderWidth || naturalWidth
  const renderHeight = imageDetails.renderHeight || naturalHeight
  const { timeMin, timeMax, freqMin, freqMax } = config

  // Calculate normalized coordinates
  const normalizedX = (point.freq - freqMin) / (freqMax - freqMin)
  const normalizedY = 1.0 - (point.time - timeMin) / (timeMax - timeMin)

  let currentX, currentY

  // Use the element's actual bounds when present (reflects expand × zoom)
  if (spectrogramImage) {
    const imageLeft = parseFloat(spectrogramImage.getAttribute('x') || String(margins.left))
    const imageTop = parseFloat(spectrogramImage.getAttribute('y') || String(margins.top))
    const imageWidth = parseFloat(spectrogramImage.getAttribute('width') || String(renderWidth))
    const imageHeight = parseFloat(spectrogramImage.getAttribute('height') || String(renderHeight))

    currentX = imageLeft + normalizedX * imageWidth
    currentY = imageTop + normalizedY * imageHeight
  } else {
    // No image element - use base render dimensions
    currentX = margins.left + normalizedX * renderWidth
    currentY = margins.top + normalizedY * renderHeight
  }

  return { x: currentX, y: currentY }
}

/**
 * Get image dimensions and position (zoom-aware)
 * @param {Object} viewport - Current viewport state
 * @param {SVGImageElement} spectrogramImage - Spectrogram image element
 * @returns {Object} Image bounds with left, top, width, height
 */
export function getImageBounds(viewport, spectrogramImage = null) {
  const { margins, imageDetails } = viewport
  const { naturalWidth, naturalHeight } = imageDetails
  const renderWidth = imageDetails.renderWidth || naturalWidth
  const renderHeight = imageDetails.renderHeight || naturalHeight

  // The element's attributes reflect expand × zoom, so prefer them when present.
  if (spectrogramImage) {
    return {
      left: parseFloat(spectrogramImage.getAttribute('x') || String(margins.left)),
      top: parseFloat(spectrogramImage.getAttribute('y') || String(margins.top)),
      width: parseFloat(spectrogramImage.getAttribute('width') || String(renderWidth)),
      height: parseFloat(spectrogramImage.getAttribute('height') || String(renderHeight))
    }
  }

  return {
    left: margins.left,
    top: margins.top,
    width: renderWidth,
    height: renderHeight
  }
}
