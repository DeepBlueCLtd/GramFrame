/**
 * Keyboard control system for fine-grained marker and harmonic positioning
 * 
 * This module provides keyboard arrow key support for fine control of
 * selected markers and harmonic sets with variable increment sizes.
 */

/// <reference path="../types.js" />

import { notifyStateListeners } from './state.js'

/**
 * Movement increments in pixels
 */
const MOVEMENT_INCREMENTS = {
  normal: 1,    // Arrow keys alone: 1-pixel increments
  fast: 5       // Shift + Arrow keys: 5-pixel increments
}

/**
 * Initialize keyboard control system for a GramFrame instance
 * @param {Object} instance - GramFrame instance
 */
export function initializeKeyboardControl(instance) {
  // Add keyboard event listener at document level
  const keyboardHandler = (event) => handleKeyboardEvent(event, instance)
  document.addEventListener('keydown', keyboardHandler)
  
  // Store handler reference for cleanup
  if (!instance.keyboardHandler) {
    instance.keyboardHandler = keyboardHandler
  }
}

/**
 * Clean up keyboard control system for a GramFrame instance
 * @param {Object} instance - GramFrame instance
 */
export function cleanupKeyboardControl(instance) {
  if (instance.keyboardHandler) {
    document.removeEventListener('keydown', instance.keyboardHandler)
    instance.keyboardHandler = null
  }
}

/**
 * Handle keyboard events for selected items
 * @param {KeyboardEvent} event - Keyboard event
 * @param {Object} instance - GramFrame instance
 */
function handleKeyboardEvent(event, instance) {
  // Only handle arrow keys for movement
  if (!isArrowKey(event.key)) {
    return
  }
  
  // Check if there's a selected item
  const selection = instance.state.selection
  if (!selection || !selection.selectedType || !selection.selectedId) {
    return // No selection
  }
  
  // Prevent default browser behavior
  event.preventDefault()
  event.stopPropagation()
  
  // Determine increment size based on modifier keys
  const baseIncrement = event.shiftKey ? MOVEMENT_INCREMENTS.fast : MOVEMENT_INCREMENTS.normal
  
  // Account for zoom level - scale movement down when zoomed in
  // This ensures 1 pixel movement on screen regardless of zoom level
  const zoomLevel = instance.state.zoom.level || 1.0
  const increment = baseIncrement / zoomLevel
  
  // Calculate movement direction
  const movement = calculateMovementFromKey(event.key, increment)
  
  // Apply movement based on selected item type
  if (selection.selectedType === 'marker') {
    moveSelectedMarker(instance, selection.selectedId, movement)
  } else if (selection.selectedType === 'harmonicSet') {
    moveSelectedHarmonicSet(instance, selection.selectedId, movement)
  }
}

/**
 * Check if the key is an arrow key
 * @param {string} key - Key value from keyboard event
 * @returns {boolean} True if arrow key
 */
function isArrowKey(key) {
  return ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)
}

/**
 * Calculate movement vector from arrow key
 * @param {string} key - Arrow key
 * @param {number} increment - Movement increment in pixels
 * @returns {Object} Movement vector {dx, dy}
 */
function calculateMovementFromKey(key, increment) {
  switch (key) {
    case 'ArrowLeft':
      return { dx: -increment, dy: 0 }
    case 'ArrowRight':
      return { dx: increment, dy: 0 }
    case 'ArrowUp':
      return { dx: 0, dy: -increment }
    case 'ArrowDown':
      return { dx: 0, dy: increment }
    default:
      return { dx: 0, dy: 0 }
  }
}

/**
 * Move a selected marker by pixel increments
 * @param {Object} instance - GramFrame instance
 * @param {string} markerId - ID of marker to move
 * @param {Object} movement - Movement vector {dx, dy}
 */
function moveSelectedMarker(instance, markerId, movement) {
  if (!instance.state.analysis || !instance.state.analysis.markers) {
    return
  }
  
  const marker = instance.state.analysis.markers.find(m => m.id === markerId)
  if (!marker) {
    return
  }
  
  // Convert current marker position to SVG coordinates
  const currentSVG = dataToSVGCoordinates(
    marker.freq, 
    marker.time, 
    instance.state.config,
    instance.state.imageDetails,
    instance.state.rate
  )
  
  // Apply movement in SVG space
  const newSVG = {
    x: currentSVG.x + movement.dx,
    y: currentSVG.y + movement.dy
  }
  
  // Convert back to data coordinates
  const newData = svgToDataCoordinates(
    newSVG.x,
    newSVG.y,
    instance.state.config,
    instance.state.imageDetails,
    instance.state.rate,
    instance.state.axes.margins
  )
  
  // Update marker position
  marker.freq = newData.freq
  marker.time = newData.time
  
  // Re-render features and notify listeners
  if (instance.featureRenderer) {
    instance.featureRenderer.renderAllPersistentFeatures()
  }
  
  // Update markers table
  if (instance.currentMode && instance.currentMode.updateMarkersTable) {
    instance.currentMode.updateMarkersTable()
  }
  
  notifyStateListeners(instance.state, instance.stateListeners)
}

/**
 * Move a selected harmonic set by pixel increments  
 * @param {Object} instance - GramFrame instance
 * @param {string} harmonicSetId - ID of harmonic set to move
 * @param {Object} movement - Movement vector {dx, dy}
 */
function moveSelectedHarmonicSet(instance, harmonicSetId, movement) {
  if (!instance.state.harmonics || !instance.state.harmonics.harmonicSets) {
    return
  }
  
  const harmonicSet = instance.state.harmonics.harmonicSets.find(h => h.id === harmonicSetId)
  if (!harmonicSet) {
    return
  }
  
  // For horizontal movement (frequency/spacing adjustment)
  if (movement.dx !== 0) {
    // Convert current spacing to pixel width for one harmonic interval
    const { naturalWidth } = instance.state.imageDetails
    const { freqMin, freqMax } = instance.state.config
    const freqRange = (freqMax - freqMin) / instance.state.rate
    
    // Calculate how much frequency change one pixel represents
    const pixelToFreqRatio = freqRange / naturalWidth
    
    // Adjust spacing based on horizontal movement
    // Positive dx increases spacing, negative dx decreases spacing
    const spacingChange = movement.dx * pixelToFreqRatio
    harmonicSet.spacing = Math.max(1.0, harmonicSet.spacing + spacingChange)
  }
  
  // For vertical movement (time/anchor position adjustment)
  if (movement.dy !== 0) {
    // Convert current anchor time to SVG coordinates
    const { naturalHeight } = instance.state.imageDetails
    const { timeMin, timeMax } = instance.state.config
    const margins = instance.state.axes.margins
    
    // Calculate current anchor position in SVG space
    const normalizedTime = 1.0 - (harmonicSet.anchorTime - timeMin) / (timeMax - timeMin)
    const currentY = margins.top + normalizedTime * naturalHeight
    
    // Apply movement
    const newY = currentY + movement.dy
    
    // Convert back to time
    const newNormalizedTime = (newY - margins.top) / naturalHeight
    harmonicSet.anchorTime = timeMax - newNormalizedTime * (timeMax - timeMin)
    
    // Clamp to valid time range
    harmonicSet.anchorTime = Math.max(timeMin, Math.min(timeMax, harmonicSet.anchorTime))
  }
  
  // Re-render features and update harmonic panel
  if (instance.featureRenderer) {
    instance.featureRenderer.renderAllPersistentFeatures()
  }
  
  if (instance.currentMode && instance.currentMode.updateHarmonicPanel) {
    instance.currentMode.updateHarmonicPanel()
  }
  
  notifyStateListeners(instance.state, instance.stateListeners)
}


/**
 * Convert data coordinates to SVG coordinates
 * @param {number} freq - Frequency in Hz
 * @param {number} time - Time in seconds
 * @param {Object} config - Configuration object
 * @param {Object} imageDetails - Image dimensions
 * @param {number} rate - Rate scaling factor
 * @returns {Object} SVG coordinates {x, y}
 */
function dataToSVGCoordinates(freq, time, config, imageDetails, rate) {
  const { freqMin, freqMax, timeMin, timeMax } = config
  const { naturalWidth, naturalHeight } = imageDetails
  const margins = { left: 60, top: 15 } // Use default margins
  
  // Convert frequency back to raw frequency space for positioning
  const rawFreq = freq * rate
  
  // Calculate position within image bounds
  const normalizedX = (rawFreq - freqMin) / (freqMax - freqMin)
  const normalizedY = 1.0 - (time - timeMin) / (timeMax - timeMin) // Invert Y
  
  return {
    x: margins.left + normalizedX * naturalWidth, 
    y: margins.top + normalizedY * naturalHeight
  }
}

/**
 * Convert SVG coordinates to data coordinates
 * @param {number} svgX - SVG X coordinate
 * @param {number} svgY - SVG Y coordinate
 * @param {Object} config - Configuration object
 * @param {Object} imageDetails - Image dimensions
 * @param {number} rate - Rate scaling factor
 * @param {Object} margins - Axes margins
 * @returns {Object} Data coordinates {freq, time}
 */
function svgToDataCoordinates(svgX, svgY, config, imageDetails, rate, margins) {
  const { freqMin, freqMax, timeMin, timeMax } = config
  const { naturalWidth, naturalHeight } = imageDetails
  
  // Convert SVG coordinates to image-relative coordinates
  const imageX = svgX - margins.left
  const imageY = svgY - margins.top
  
  // Ensure coordinates are within image bounds
  const boundedX = Math.max(0, Math.min(imageX, naturalWidth))
  const boundedY = Math.max(0, Math.min(imageY, naturalHeight))
  
  // Convert to data coordinates
  const rawFreq = freqMin + (boundedX / naturalWidth) * (freqMax - freqMin)
  const time = timeMax - (boundedY / naturalHeight) * (timeMax - timeMin)
  
  // Apply rate scaling to frequency
  const freq = rawFreq / rate
  
  return { freq, time }
}

/**
 * Set selection state for an item
 * @param {Object} instance - GramFrame instance
 * @param {string} type - Type of item ('marker' | 'harmonicSet')
 * @param {string} id - ID of selected item
 * @param {number} index - Index in table for display purposes
 */
export function setSelection(instance, type, id, index) {
  instance.state.selection.selectedType = type
  instance.state.selection.selectedId = id
  instance.state.selection.selectedIndex = index
  
  // Update visual feedback
  updateSelectionVisuals(instance)
  
  notifyStateListeners(instance.state, instance.stateListeners)
}

/**
 * Clear current selection
 * @param {Object} instance - GramFrame instance
 */
export function clearSelection(instance) {
  instance.state.selection.selectedType = null
  instance.state.selection.selectedId = null
  instance.state.selection.selectedIndex = null
  
  // Update visual feedback
  updateSelectionVisuals(instance)
  
  notifyStateListeners(instance.state, instance.stateListeners)
}


/**
 * Update visual feedback for current selection
 * @param {Object} instance - GramFrame instance
 */
export function updateSelectionVisuals(instance) {
  // Clear existing selection highlights
  const existingHighlights = document.querySelectorAll('.gram-frame-selected-row')
  existingHighlights.forEach(el => {
    el.classList.remove('gram-frame-selected-row')
  })
  
  // Apply selection highlight if there's a selection
  const selection = instance.state.selection
  if (selection.selectedType && selection.selectedId) {
    if (selection.selectedType === 'marker') {
      // Find marker table row by data attribute
      const selector = `tr[data-marker-id="${selection.selectedId}"]`
      const row = document.querySelector(selector)
      if (row) {
        row.classList.add('gram-frame-selected-row')
      }
    } else if (selection.selectedType === 'harmonicSet') {
      // Find harmonic table row by data attribute
      const selector = `tr[data-harmonic-id="${selection.selectedId}"]`
      const row = document.querySelector(selector)
      if (row) {
        row.classList.add('gram-frame-selected-row')
      }
    }
  }
}