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

/**
 * Creates rate input control
 * @param {HTMLElement} container - Container element for rate input
 * @param {GramFrameState} state - Current state object
 * @param {Function} rateChangeCallback - Callback function for rate changes
 * @returns {HTMLInputElement} The rate input element
 */
export function createRateInput(container, state, rateChangeCallback) {
  // Create rate input container
  const rateContainer = document.createElement('div')
  rateContainer.className = 'gram-frame-rate'
  
  // Create label
  const label = document.createElement('label')
  label.textContent = 'Rate:'
  rateContainer.appendChild(label)
  
  // Create input
  const rateInput = document.createElement('input')
  rateInput.type = 'number'
  rateInput.min = '0.1'
  rateInput.step = '0.1'
  rateInput.value = String(state.rate)
  rateInput.title = 'Rate value affects frequency calculations'
  
  // Add change handler
  rateInput.addEventListener('change', () => {
    const rate = parseFloat(rateInput.value)
    if (!isNaN(rate) && rate >= 0.1) {
      rateChangeCallback(rate)
    } else {
      // Reset to previous valid value if invalid input
      rateInput.value = String(state.rate)
    }
  })
  
  rateContainer.appendChild(rateInput)
  
  // Create unit indicator
  const unit = document.createElement('span')
  unit.textContent = 'Hz/s'
  unit.className = 'gram-frame-rate-unit'
  rateContainer.appendChild(unit)
  
  // Hide rate input for now (not in mockup design)
  rateContainer.style.display = 'none'
  container.appendChild(rateContainer)
  
  return rateInput
}

// Re-export color picker function from ColorPicker module
export { createColorPicker }

/**
 * Creates simple zoom controls with transform-based zoom
 * @param {HTMLElement} container - Container element for zoom controls
 * @param {Object} instance - GramFrame instance
 * @returns {Object} Object containing zoom control elements
 */
export function createZoomControls(container, instance) {
  // Create zoom controls container
  const zoomContainer = document.createElement('div')
  zoomContainer.className = 'gram-frame-zoom-controls'
  
  // Create zoom out button
  const zoomOutBtn = document.createElement('button')
  zoomOutBtn.className = 'gram-frame-zoom-btn'
  zoomOutBtn.textContent = '−'
  zoomOutBtn.title = 'Zoom Out'
  zoomOutBtn.addEventListener('click', () => {
    const newLevel = Math.max(0.5, instance.state.zoom.level / 1.5)
    instance.setZoomLevel(newLevel)
  })
  
  // Create zoom level display
  const zoomDisplay = document.createElement('span')
  zoomDisplay.className = 'gram-frame-zoom-display'
  zoomDisplay.textContent = '100%'
  
  // Create zoom in button
  const zoomInBtn = document.createElement('button')
  zoomInBtn.className = 'gram-frame-zoom-btn'
  zoomInBtn.textContent = '+'
  zoomInBtn.title = 'Zoom In'
  zoomInBtn.addEventListener('click', () => {
    const newLevel = Math.min(5.0, instance.state.zoom.level * 1.5)
    instance.setZoomLevel(newLevel)
  })
  
  // Create reset zoom button
  const resetZoomBtn = document.createElement('button')
  resetZoomBtn.className = 'gram-frame-zoom-btn gram-frame-zoom-reset'
  resetZoomBtn.textContent = '1:1'
  resetZoomBtn.title = 'Reset Zoom'
  resetZoomBtn.addEventListener('click', () => {
    instance.setZoomLevel(1.0)
  })
  
  // Update zoom display when state changes
  const updateZoomDisplay = (state) => {
    if (state.zoom && state.zoom.level) {
      zoomDisplay.textContent = `${Math.round(state.zoom.level * 100)}%`
    }
  }
  
  // Add state listener for zoom level updates
  if (instance.stateListeners) {
    instance.stateListeners.push(updateZoomDisplay)
  }
  
  // Assemble controls
  zoomContainer.appendChild(zoomOutBtn)
  zoomContainer.appendChild(zoomDisplay)
  zoomContainer.appendChild(zoomInBtn)
  zoomContainer.appendChild(resetZoomBtn)
  
  container.appendChild(zoomContainer)
  
  return {
    zoomContainer,
    zoomInBtn,
    zoomOutBtn,
    resetZoomBtn,
    zoomDisplay
  }
}

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