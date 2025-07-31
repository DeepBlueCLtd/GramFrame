/**
 * UI Components for GramFrame
 * 
 * This module provides functions for creating and managing UI elements
 * including LED displays, mode switching buttons, and rate input controls.
 */

/// <reference path="../types.js" />

import { createColorPicker } from './ColorPicker.js'
import { createLEDDisplay, updateLEDDisplays } from './LEDDisplay.js'
import { createModeSwitchingUI } from './ModeButtons.js'


// Re-export LED display functions from LEDDisplay module
export { createLEDDisplay, updateLEDDisplays }




// Re-export mode switching functions from ModeButtons module
export { createModeSwitchingUI }

// Rate input UI component removed - backend rate functionality preserved

// Re-export color picker function from ColorPicker module
export { createColorPicker }


/**
 * Creates a flex layout container with standard styling
 * @param {string} className - CSS class name for the container
 * @param {string} gap - Gap between flex items (default: '10px')
 * @param {string} direction - Flex direction (default: 'row')
 * @returns {HTMLElement} The created flex container
 */
export function createFlexLayout(className, gap = '10px', direction = 'row') {
  const container = document.createElement('div')
  container.className = className
  container.style.display = 'flex'
  container.style.flexDirection = direction
  container.style.gap = gap
  return container
}

/**
 * Creates a full-size flex layout container (100% width and height)
 * @param {string} className - CSS class name for the container
 * @param {string} gap - Gap between flex items (default: '10px')
 * @returns {HTMLElement} The created full-size flex container
 */
export function createFullFlexLayout(className, gap = '10px') {
  const container = createFlexLayout(className, gap)
  container.style.width = '100%'
  container.style.height = '100%'
  return container
}

/**
 * Creates a flex column container with standard styling
 * @param {string} className - CSS class name for the container
 * @param {string} gap - Gap between flex items (default: '10px')
 * @returns {HTMLElement} The created flex column container
 */
export function createFlexColumn(className, gap = '10px') {
  return createFlexLayout(className, gap, 'column')
}