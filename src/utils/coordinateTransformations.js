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
  const { margins, imageDetails, config, zoom } = viewport
  const { naturalWidth, naturalHeight } = imageDetails
  const { timeMin, timeMax, freqMin, freqMax } = config
  const zoomLevel = zoom.level
  
  // Calculate ratios in data space
  const timeRatio = (dataPoint.time - timeMin) / (timeMax - timeMin)
  const freqRatio = (dataPoint.freq - freqMin) / (freqMax - freqMin)
  
  // Get current image position and dimensions (which may be zoomed)
  let imageLeft = margins.left
  let imageTop = margins.top  
  let imageWidth = naturalWidth
  let imageHeight = naturalHeight
  
  if (zoomLevel !== 1.0 && spectrogramImage) {
    imageLeft = parseFloat(spectrogramImage.getAttribute('x') || String(margins.left))
    imageTop = parseFloat(spectrogramImage.getAttribute('y') || String(margins.top))
    imageWidth = parseFloat(spectrogramImage.getAttribute('width') || String(naturalWidth))
    imageHeight = parseFloat(spectrogramImage.getAttribute('height') || String(naturalHeight))
  }
  
  return {
    x: imageLeft + freqRatio * imageWidth,
    y: imageTop + (1 - timeRatio) * imageHeight // Invert Y coordinate
  }
}

/**
 * Convert screen coordinates to data coordinates
 * @param {ScreenCoordinates} screenPoint - Screen coordinates
 * @param {Object} viewport - Current viewport state
 * @param {SVGSVGElement} svg - SVG element reference
 * @param {SVGImageElement} spectrogramImage - Spectrogram image element
 * @param {number} rate - Rate scaling factor
 * @returns {DataCoordinates} Data coordinates
 */
export function screenToDataCoordinates(screenPoint, viewport, svg, spectrogramImage = null, rate = 1) {
  const { margins, imageDetails, config, zoom } = viewport
  const { naturalWidth, naturalHeight } = imageDetails
  const { timeMin, timeMax, freqMin, freqMax } = config
  const zoomLevel = zoom.level

  // Convert screen to SVG coordinates first
  const svgRect = svg.getBoundingClientRect()
  const viewBox = svg.viewBox.baseVal
  
  let svgX, svgY
  if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
    const scaleX = viewBox.width / svgRect.width
    const scaleY = viewBox.height / svgRect.height
    svgX = (screenPoint.x * scaleX) + viewBox.x
    svgY = (screenPoint.y * scaleY) + viewBox.y
  } else {
    svgX = screenPoint.x
    svgY = screenPoint.y
  }

  // Get current image bounds (which may be zoomed)
  let imageLeft = margins.left
  let imageTop = margins.top  
  let imageWidth = naturalWidth
  let imageHeight = naturalHeight
  
  if (zoomLevel !== 1.0 && spectrogramImage) {
    imageLeft = parseFloat(spectrogramImage.getAttribute('x') || String(margins.left))
    imageTop = parseFloat(spectrogramImage.getAttribute('y') || String(margins.top))
    imageWidth = parseFloat(spectrogramImage.getAttribute('width') || String(naturalWidth))
    imageHeight = parseFloat(spectrogramImage.getAttribute('height') || String(naturalHeight))
  }

  // Convert SVG to image coordinates
  const imageX = Math.max(0, Math.min(svgX - imageLeft, imageWidth))
  const imageY = Math.max(0, Math.min(svgY - imageTop, imageHeight))

  // Convert to data coordinates
  const freqRatio = imageX / imageWidth
  const timeRatio = 1 - (imageY / imageHeight) // Invert Y coordinate
  
  const rawFreq = freqMin + freqRatio * (freqMax - freqMin)
  const time = timeMin + timeRatio * (timeMax - timeMin)
  
  // Apply rate scaling to frequency
  const freq = rawFreq / rate
  
  return { freq, time }
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
  const { timeMin, timeMax, freqMin, freqMax } = config

  // Calculate normalized coordinates
  const normalizedX = (point.freq - freqMin) / (freqMax - freqMin)
  const normalizedY = 1.0 - (point.time - timeMin) / (timeMax - timeMin)

  let currentX, currentY

  // Check if zoomed and has image element
  if (spectrogramImage) {
    const imageLeft = parseFloat(spectrogramImage.getAttribute('x') || String(margins.left))
    const imageTop = parseFloat(spectrogramImage.getAttribute('y') || String(margins.top))
    const imageWidth = parseFloat(spectrogramImage.getAttribute('width') || String(naturalWidth))
    const imageHeight = parseFloat(spectrogramImage.getAttribute('height') || String(naturalHeight))
    
    currentX = imageLeft + normalizedX * imageWidth
    currentY = imageTop + normalizedY * imageHeight
  } else {
    // Not zoomed - use natural dimensions
    currentX = margins.left + normalizedX * naturalWidth
    currentY = margins.top + normalizedY * naturalHeight
  }

  return { x: currentX, y: currentY }
}

/**
 * Check if a point is within image boundaries
 * @param {DataCoordinates} point - Data coordinates to check
 * @param {Config} config - Configuration object
 * @returns {boolean} True if point is within bounds
 */
export function isPointInImageBounds(point, config) {
  const { timeMin, timeMax, freqMin, freqMax } = config
  
  return point.time >= timeMin && point.time <= timeMax &&
         point.freq >= freqMin && point.freq <= freqMax
}

/**
 * Get image dimensions and position (zoom-aware)
 * @param {Object} viewport - Current viewport state
 * @param {SVGImageElement} spectrogramImage - Spectrogram image element
 * @returns {Object} Image bounds with left, top, width, height
 */
export function getImageBounds(viewport, spectrogramImage = null) {
  const { margins, imageDetails, zoom } = viewport
  const { naturalWidth, naturalHeight } = imageDetails
  const zoomLevel = zoom.level

  if (zoomLevel !== 1.0 && spectrogramImage) {
    return {
      left: parseFloat(spectrogramImage.getAttribute('x') || String(margins.left)),
      top: parseFloat(spectrogramImage.getAttribute('y') || String(margins.top)),
      width: parseFloat(spectrogramImage.getAttribute('width') || String(naturalWidth)),
      height: parseFloat(spectrogramImage.getAttribute('height') || String(naturalHeight))
    }
  }

  return {
    left: margins.left,
    top: margins.top,
    width: naturalWidth,
    height: naturalHeight
  }
}