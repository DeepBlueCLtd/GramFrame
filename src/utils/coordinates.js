/**
 * Coordinate transformation utilities for GramFrame
 * 
 * This module provides functions to convert between different coordinate systems:
 * - Screen coordinates (relative to browser viewport)
 * - SVG coordinates (relative to SVG viewBox)  
 * - Image coordinates (relative to spectrogram image)
 * - Data coordinates (time/frequency values)
 */

/// <reference path="../types.js" />

/**
 * Convert screen coordinates to SVG coordinates
 * @param {number} screenX - Screen X coordinate
 * @param {number} screenY - Screen Y coordinate
 * @param {SVGSVGElement} svg - SVG element reference
 * @param {Object} imageDetails - Image dimensions
 * @param {number} imageDetails.naturalWidth - Natural width of image
 * @param {number} imageDetails.naturalHeight - Natural height of image
 * @returns {SVGCoordinates} SVG coordinates
 */
export function screenToSVGCoordinates(screenX, screenY, svg, imageDetails) {
  const svgRect = svg.getBoundingClientRect()
  const viewBox = svg.viewBox.baseVal
  
  // If viewBox is not set, fall back to using image natural dimensions
  if (!viewBox || viewBox.width === 0 || viewBox.height === 0) {
    if (imageDetails.naturalWidth && imageDetails.naturalHeight) {
      const scaleX = imageDetails.naturalWidth / svgRect.width
      const scaleY = imageDetails.naturalHeight / svgRect.height
      return {
        x: screenX * scaleX,
        y: screenY * scaleY
      }
    }
    // Default fallback - use screen coordinates
    return { x: screenX, y: screenY }
  }
  
  // Scale factors between screen and SVG coordinates
  const scaleX = viewBox.width / svgRect.width
  const scaleY = viewBox.height / svgRect.height
  
  return {
    x: screenX * scaleX,
    y: screenY * scaleY
  }
}


/**
 * Convert image-relative coordinates to data coordinates (time and frequency)
 * @param {number} imageX - Image X coordinate
 * @param {number} imageY - Image Y coordinate
 * @param {Object} config - Configuration object
 * @param {number} config.freqMin - Minimum frequency
 * @param {number} config.freqMax - Maximum frequency
 * @param {number} config.timeMin - Minimum time
 * @param {number} config.timeMax - Maximum time
 * @param {Object} imageDetails - Image dimensions
 * @param {number} imageDetails.naturalWidth - Natural width of image
 * @param {number} imageDetails.naturalHeight - Natural height of image
 * @param {number} rate - Rate scaling factor
 * @returns {DataCoordinates} Data coordinates
 */
export function imageToDataCoordinates(imageX, imageY, config, imageDetails, rate) {
  const { freqMin, freqMax, timeMin, timeMax } = config
  const { naturalWidth, naturalHeight } = imageDetails
  
  // Ensure coordinates are within image bounds
  const boundedX = Math.max(0, Math.min(imageX, naturalWidth))
  const boundedY = Math.max(0, Math.min(imageY, naturalHeight))
  
  // Convert to data coordinates
  const rawFreq = freqMin + (boundedX / naturalWidth) * (freqMax - freqMin)
  const time = timeMax - (boundedY / naturalHeight) * (timeMax - timeMin)
  
  // Apply rate scaling to frequency - rate acts as a frequency divider
  const freq = rawFreq / rate
  
  return { freq, time }
}

/**
 * Convert data coordinates to SVG coordinates
 * @param {number} freq - Frequency in Hz
 * @param {number} time - Time in seconds
 * @param {Object} config - Configuration object
 * @param {number} config.freqMin - Minimum frequency
 * @param {number} config.freqMax - Maximum frequency
 * @param {number} config.timeMin - Minimum time
 * @param {number} config.timeMax - Maximum time
 * @param {Object} imageDetails - Image dimensions
 * @param {number} imageDetails.naturalWidth - Natural width of image
 * @param {number} imageDetails.naturalHeight - Natural height of image
 * @param {number} rate - Rate scaling factor
 * @returns {SVGCoordinates} SVG coordinates
 */
export function dataToSVGCoordinates(freq, time, config, imageDetails, rate) {
  const { freqMin, freqMax, timeMin, timeMax } = config
  const { naturalWidth, naturalHeight } = imageDetails
  
  // Convert frequency back to raw frequency space for positioning
  const rawFreq = freq * rate
  
  const x = ((rawFreq - freqMin) / (freqMax - freqMin)) * naturalWidth
  const y = naturalHeight - ((time - timeMin) / (timeMax - timeMin)) * naturalHeight
  
  return { x, y }
}

