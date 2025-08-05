/**
 * Calculation utilities for GramFrame
 * 
 * This module provides utility functions for calculations and string formatting
 * used throughout the GramFrame component.
 */

/// <reference path="../types.js" />


/**
 * Capitalize the first letter of a string
 * @param {string} string - String to capitalize
 * @returns {string} String with first letter capitalized
 */
export function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

/**
 * Get display name for mode (maps internal mode names to user-friendly display names)
 * @param {string} mode - Internal mode name
 * @returns {string} User-friendly display name
 */
export function getModeDisplayName(mode) {
  const displayNames = {
    'analysis': 'Cross Cursor',
    'harmonics': 'Harmonics', 
    'doppler': 'Doppler',
    'pan': 'Pan',
    'zoom': 'Zoom'
  }
  
  return displayNames[mode] || capitalizeFirstLetter(mode)
}