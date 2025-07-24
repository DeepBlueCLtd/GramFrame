/**
 * Event handling for GramFrame component
 */

/// <reference path="../types.js" />

import { 
  screenToSVGCoordinates,
  imageToDataCoordinates
} from '../utils/coordinates.js'

import { updateLEDDisplays } from '../components/UIComponents.js'
import { notifyStateListeners } from './state.js'
import { updateCursorIndicators } from '../rendering/cursors.js'
import { handleResize, handleSVGResize } from '../rendering/axes.js'
import { triggerHarmonicsDisplay } from './analysis.js'
import { updateHarmonicPanelContent } from '../components/HarmonicPanel.js'

/**
 * Set up event listeners for the GramFrame instance
 * @param {Object} instance - GramFrame instance
 */
export function setupEventListeners(instance) {
  // Bind event handlers to maintain proper 'this' context
  instance._boundHandleMouseMove = (event) => handleMouseMove(instance, event)
  instance._boundHandleMouseLeave = (event) => handleMouseLeave(instance, event)
  instance._boundHandleClick = (event) => handleClick(instance, event)
  instance._boundHandleMouseDown = (event) => handleMouseDown(instance, event)
  instance._boundHandleMouseUp = (event) => handleMouseUp(instance, event)
  instance._boundHandleResize = () => handleResize(instance)
  
  // SVG mouse events
  instance.svg.addEventListener('mousemove', instance._boundHandleMouseMove)
  instance.svg.addEventListener('mouseleave', instance._boundHandleMouseLeave)
  instance.svg.addEventListener('click', instance._boundHandleClick)
  instance.svg.addEventListener('mousedown', instance._boundHandleMouseDown)
  instance.svg.addEventListener('mouseup', instance._boundHandleMouseUp)
  
  // Add right-click handler
  instance.svg.addEventListener('contextmenu', (event) => {
    if (instance.currentMode && instance.currentMode.handleContextMenu) {
      return instance.currentMode.handleContextMenu(event)
    }
  })
  
  // Mode button events
  Object.keys(instance.modeButtons || {}).forEach(mode => {
    const button = instance.modeButtons[mode]
    if (button) {
      button.addEventListener('click', () => {
        instance._switchMode(/** @type {ModeType} */ (mode))
      })
    }
  })
  
  // Rate input events
  if (instance.rateInput) {
    instance.rateInput.addEventListener('change', () => {
      if (instance.rateInput) {
        const rate = parseFloat(instance.rateInput.value)
        if (!isNaN(rate) && rate >= 0.1) {
          instance._setRate(rate)
        } else {
          // Reset to previous valid value if invalid input
          instance.rateInput.value = String(instance.state.rate)
        }
      }
    })
  }
  
  // Also handle input events for real-time validation feedback
  if (instance.rateInput) {
    instance.rateInput.addEventListener('input', () => {
      if (instance.rateInput) {
        const rate = parseFloat(instance.rateInput.value)
        if (!isNaN(rate) && rate >= 0.1) {
          instance.rateInput.style.borderColor = '#ddd'
        } else {
          instance.rateInput.style.borderColor = '#ff6b6b'
        }
      }
    })
  }
  
  // Window resize event
  window.addEventListener('resize', instance._boundHandleResize)
}

/**
 * Set up ResizeObserver to monitor container dimensions
 * @param {Object} instance - GramFrame instance
 */
export function setupResizeObserver(instance) {
  // Use ResizeObserver to monitor SVG container dimensions
  if (typeof ResizeObserver !== 'undefined') {
    instance.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        handleSVGResize(instance, entry.contentRect)
      }
    })
    instance.resizeObserver.observe(instance.container)
  }
}

/**
 * Handle mouse move events over the SVG
 * @param {Object} instance - GramFrame instance
 * @param {MouseEvent} event - Mouse event
 */
export function handleMouseMove(instance, event) {
  const coords = calculateEventCoordinates(instance, event)
  
  if (!coords) {
    // Clear cursor position when mouse is outside image bounds
    instance.state.cursorPosition = null
    updateLEDDisplays(instance, instance.state)
    
    // Update mode-specific LEDs
    if (instance.currentMode && instance.currentMode.updateModeSpecificLEDs) {
      instance.currentMode.updateModeSpecificLEDs()
    }
    
    notifyStateListeners(instance.state, instance.stateListeners)
    return
  }

  // Calculate screen coordinates for state (relative to SVG)
  const rect = instance.svg.getBoundingClientRect()
  const screenX = event.clientX - rect.left
  const screenY = event.clientY - rect.top

  // Update cursor position in state with normalized coordinates
  instance.state.cursorPosition = { 
    x: Math.round(screenX), 
    y: Math.round(screenY), 
    svgX: coords.svgCoords.x,
    svgY: coords.svgCoords.y,
    imageX: coords.imageCoords.x,
    imageY: coords.imageCoords.y,
    time: coords.dataCoords.time, 
    freq: coords.dataCoords.freq
  }
  
  // Update LED displays
  updateLEDDisplays(instance, instance.state)
  
  // Update mode-specific LEDs
  if (instance.currentMode && instance.currentMode.updateModeSpecificLEDs) {
    instance.currentMode.updateModeSpecificLEDs()
  }
  
  // Update visual cursor indicators
  updateCursorIndicators(instance)
  
  // Handle mode-specific dragging interactions
  if (instance.currentMode && instance.currentMode.handleMouseMove) {
    instance.currentMode.handleMouseMove(event, coords)
  }
  
  // Notify listeners
  notifyStateListeners(instance.state, instance.stateListeners)
}

/**
 * Handle mouse leave events
 * @param {Object} instance - GramFrame instance
 * @param {MouseEvent} event - Mouse event
 */
export function handleMouseLeave(instance, event) {
  // Clear cursor position when mouse leaves the SVG area
  instance.state.cursorPosition = null
  
  // Update LED displays to show no position
  updateLEDDisplays(instance, instance.state)
  
  // Update mode-specific LEDs
  if (instance.currentMode && instance.currentMode.updateModeSpecificLEDs) {
    instance.currentMode.updateModeSpecificLEDs()
  }
  
  // Clear visual cursor indicators
  updateCursorIndicators(instance)
  
  // Notify listeners
  notifyStateListeners(instance.state, instance.stateListeners)
}

/**
 * Handle mouse down events for drag interactions
 * @param {Object} instance - GramFrame instance
 * @param {MouseEvent} event - Mouse event
 */
export function handleMouseDown(instance, event) {
  // Calculate coordinates from the event
  const coords = calculateEventCoordinates(instance, event)
  if (!coords) return
  
  // Handle mode-specific interactions
  if (instance.currentMode && instance.currentMode.handleMouseDown) {
    instance.currentMode.handleMouseDown(event, coords)
  }
}

/**
 * Handle mouse up events to end drag interactions
 * @param {Object} instance - GramFrame instance
 * @param {MouseEvent} event - Mouse event
 */
export function handleMouseUp(instance, event) {
  // Calculate coordinates from the event
  const coords = calculateEventCoordinates(instance, event)
  
  // Handle mode-specific mouse up interactions
  if (instance.currentMode && instance.currentMode.handleMouseUp) {
    // Use calculated coordinates if available, otherwise use fallback coordinates
    const eventCoords = coords || {
      svgCoords: { x: instance.state.cursorPosition?.svgX || 0, y: instance.state.cursorPosition?.svgY || 0 },
      dataCoords: { time: instance.state.cursorPosition?.time || 0, freq: instance.state.cursorPosition?.freq || 0 },
      imageCoords: { x: instance.state.cursorPosition?.imageX || 0, y: instance.state.cursorPosition?.imageY || 0 }
    }
    instance.currentMode.handleMouseUp(event, eventCoords)
  }
  // Legacy drag state cleanup for other modes
  else if (instance.state.dragState.isDragging) {
    const wasDraggingHarmonicSet = !!instance.state.dragState.draggedHarmonicSetId
    
    // Clear drag state
    instance.state.dragState.isDragging = false
    instance.state.dragState.dragStartPosition = null
    instance.state.dragState.draggedHarmonicSetId = null
    instance.state.dragState.originalSpacing = null
    instance.state.dragState.originalAnchorTime = null
    instance.state.dragState.clickedHarmonicNumber = null
    instance.state.dragState.isCreatingNewHarmonicSet = false
    
    // Clear old harmonics system state (for backward compatibility)
    instance.state.harmonics.baseFrequency = null
    instance.state.harmonics.harmonicData = []
    
    // Update displays and indicators
    updateLEDDisplays(instance, instance.state)
    updateCursorIndicators(instance)
    
    // Update harmonic panel
    updateHarmonicPanel(instance)
    
    // Notify listeners of state change
    notifyStateListeners(instance.state, instance.stateListeners)
  }
}

/**
 * Handle click events for mode-specific actions
 * @param {Object} instance - GramFrame instance
 * @param {MouseEvent} event - Mouse event
 */
export function handleClick(instance, event) {
  // Only process if we have valid image details
  if (!instance.state.imageDetails.naturalWidth || !instance.state.imageDetails.naturalHeight) {
    return
  }
  
  // Only process if mouse is within the image area
  if (!instance.state.cursorPosition) {
    return
  }
  
  // Handle mode-specific clicks
  if (instance.currentMode && instance.currentMode.handleClick) {
    instance.currentMode.handleClick(event, {
      svgCoords: { x: instance.state.cursorPosition.svgX, y: instance.state.cursorPosition.svgY },
      dataCoords: { time: instance.state.cursorPosition.time, freq: instance.state.cursorPosition.freq },
      imageCoords: { x: instance.state.cursorPosition.imageX, y: instance.state.cursorPosition.imageY }
    })
  }
}


/**
 * Update harmonic management panel
 * @param {Object} instance - GramFrame instance
 */
function updateHarmonicPanel(instance) {
  if (instance.harmonicPanel) {
    updateHarmonicPanelContent(instance.harmonicPanel, instance)
  }
}

/**
 * Calculate coordinates from mouse event
 * @param {Object} instance - GramFrame instance
 * @param {MouseEvent} event - Mouse event
 * @returns {{svgCoords: {x: number, y: number}, dataCoords: {time: number, freq: number}, imageCoords: {x: number, y: number}} | null} Calculated coordinates or null if outside bounds
 */
function calculateEventCoordinates(instance, event) {
  // Only process if we have valid image details
  if (!instance.state.imageDetails.naturalWidth || !instance.state.imageDetails.naturalHeight) return null
  
  // Use SVG's built-in coordinate transformation for accurate positioning
  let svgCoords
  try {
    const pt = instance.svg.createSVGPoint()
    pt.x = event.clientX
    pt.y = event.clientY
    const transformedPt = pt.matrixTransform(instance.svg.getScreenCTM().inverse())
    svgCoords = { x: transformedPt.x, y: transformedPt.y }
  } catch (e) {
    // Fallback to manual calculation
    const rect = instance.svg.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    svgCoords = screenToSVGCoordinates(x, y, instance.svg, instance.state.imageDetails)
  }
  
  // Get coordinates relative to image (image is now positioned at margins.left, margins.top)
  const margins = instance.state.axes.margins
  const imageRelativeX = svgCoords.x - margins.left
  const imageRelativeY = svgCoords.y - margins.top
  
  // Check if mouse is within the image area - for drag operations, allow slightly outside bounds
  const tolerance = 10 // pixel tolerance for drag operations
  if (imageRelativeX < -tolerance || imageRelativeY < -tolerance || 
      imageRelativeX > instance.state.imageDetails.naturalWidth + tolerance || 
      imageRelativeY > instance.state.imageDetails.naturalHeight + tolerance) {
    return null
  }
  
  // Clamp coordinates to image bounds for data calculation
  const clampedImageX = Math.max(0, Math.min(instance.state.imageDetails.naturalWidth, imageRelativeX))
  const clampedImageY = Math.max(0, Math.min(instance.state.imageDetails.naturalHeight, imageRelativeY))
  
  // Convert image-relative coordinates to data coordinates
  const dataCoords = imageToDataCoordinates(clampedImageX, clampedImageY, instance.state.config, instance.state.imageDetails, instance.state.rate)
  
  return {
    svgCoords: { x: Math.round(svgCoords.x), y: Math.round(svgCoords.y) },
    dataCoords: { time: parseFloat(dataCoords.time.toFixed(2)), freq: parseFloat(dataCoords.freq.toFixed(2)) },
    imageCoords: { x: Math.round(imageRelativeX), y: Math.round(imageRelativeY) }
  }
}

/**
 * Clean up event listeners (called when component is destroyed)
 * @param {Object} instance - GramFrame instance
 */
export function cleanupEventListeners(instance) {
  if (instance.svg) {
    if (instance._boundHandleMouseMove) {
      instance.svg.removeEventListener('mousemove', instance._boundHandleMouseMove)
    }
    if (instance._boundHandleMouseLeave) {
      instance.svg.removeEventListener('mouseleave', instance._boundHandleMouseLeave)
    }
    if (instance._boundHandleClick) {
      instance.svg.removeEventListener('click', instance._boundHandleClick)
    }
    if (instance._boundHandleMouseDown) {
      instance.svg.removeEventListener('mousedown', instance._boundHandleMouseDown)
    }
    if (instance._boundHandleMouseUp) {
      instance.svg.removeEventListener('mouseup', instance._boundHandleMouseUp)
    }
  }
  
  if (instance._boundHandleResize) {
    window.removeEventListener('resize', instance._boundHandleResize)
  }
  
  // Clean up ResizeObserver
  if (instance.resizeObserver) {
    instance.resizeObserver.disconnect()
    instance.resizeObserver = null
  }
}