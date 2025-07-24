/**
 * Calculation utilities for GramFrame
 * 
 * This module provides utility functions for calculations and string formatting
 * used throughout the GramFrame component.
 */

/// <reference path="../types.js" />
/// <reference path="../modes/harmonics/types.js" />

/**
 * Calculate harmonic frequencies and positions for display
 * @param {number} baseFrequency - Base frequency in Hz
 * @param {Object} config - Configuration object  
 * @param {number} config.freqMin - Minimum frequency
 * @param {number} config.freqMax - Maximum frequency
 * @param {Object} displayDimensions - Display dimensions
 * @param {number} displayDimensions.width - Width of display
 * @param {Object} axes - Axis configuration
 * @param {Object} axes.margins - Margin configuration
 * @param {number} axes.margins.left - Left margin
 * @param {number} axes.margins.right - Right margin
 * @param {Function} dataToSVGCoordinates - Coordinate conversion function
 * @returns {HarmonicData[]} Array of harmonic data objects
 */
export function calculateHarmonics(baseFrequency, config, displayDimensions, axes, dataToSVGCoordinates) {
  const { freqMin, freqMax } = config
  const { width } = displayDimensions
  const harmonics = []
  
  // Start with the base frequency (1x harmonic)
  let harmonicNumber = 1
  let harmonicFreq = baseFrequency * harmonicNumber
  
  // Add harmonics while they're within the visible frequency range
  // Continue until we exceed the maximum frequency or reach the right edge of the component
  while (harmonicFreq <= freqMax) {
    if (harmonicFreq >= freqMin) {
      // Convert frequency to SVG x-coordinate
      const dataCoords = dataToSVGCoordinates(harmonicFreq, 0)
      const svgX = axes.margins.left + dataCoords.x
      
      // If we've reached the right edge of the component, stop adding harmonics
      const rightEdge = axes.margins.left + width - axes.margins.right
      if (svgX > rightEdge) {
        break
      }
      
      harmonics.push({
        number: harmonicNumber,
        frequency: harmonicFreq,
        svgX: svgX
      })
    }
    
    harmonicNumber++
    harmonicFreq = baseFrequency * harmonicNumber
  }
  
  return harmonics
}

/**
 * Capitalize the first letter of a string
 * @param {string} string - String to capitalize
 * @returns {string} String with first letter capitalized
 */
export function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}