/**
 * Event handling for GramFrame component
 */

/// <reference path="../types.js" />

import { 
  screenToSVGCoordinates,
  imageToDataCoordinates
} from '../utils/coordinates.js'

import { 
  calculateDopplerSpeed,
  screenToDopplerData,
  isNearMarker,
  dopplerDataToSVG
} from '../utils/doppler.js'

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
  
  // Add right-click handler for Doppler mode reset
  instance.svg.addEventListener('contextmenu', (event) => {
    if (instance.state.mode === 'doppler') {
      event.preventDefault()
      instance._resetDoppler()
      return false
    }
  })
  
  // Mode button events
  Object.keys(instance.modeButtons || {}).forEach(mode => {
    const button = instance.modeButtons[mode]
    if (button) {
      button.addEventListener('click', () => {
        instance._switchMode(/** @type {'analysis'|'harmonics'|'doppler'} */ (mode))
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
  // Only process if we have valid image details
  if (!instance.state.imageDetails.naturalWidth || !instance.state.imageDetails.naturalHeight) return
  
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
  
  // Only process if mouse is within the image area
  if (imageRelativeX < 0 || imageRelativeY < 0 || 
      imageRelativeX > instance.state.imageDetails.naturalWidth || 
      imageRelativeY > instance.state.imageDetails.naturalHeight) {
    // Clear cursor position when mouse is outside image bounds
    instance.state.cursorPosition = null
    updateLEDDisplays(instance, instance.state)
    notifyStateListeners(instance.state, instance.stateListeners)
    return
  }
  
  // Convert image-relative coordinates to data coordinates
  const dataCoords = imageToDataCoordinates(imageRelativeX, imageRelativeY, instance.state.config, instance.state.imageDetails, instance.state.rate)
  
  // Calculate screen coordinates for state (relative to SVG)
  const rect = instance.svg.getBoundingClientRect()
  const screenX = event.clientX - rect.left
  const screenY = event.clientY - rect.top

  // Update cursor position in state with normalized coordinates
  instance.state.cursorPosition = { 
    x: Math.round(screenX), 
    y: Math.round(screenY), 
    svgX: Math.round(svgCoords.x),
    svgY: Math.round(svgCoords.y),
    imageX: Math.round(imageRelativeX),
    imageY: Math.round(imageRelativeY),
    time: parseFloat(dataCoords.time.toFixed(2)), 
    freq: parseFloat(dataCoords.freq.toFixed(2))
  }
  
  // Update LED displays
  updateLEDDisplays(instance, instance.state)
  
  // Update visual cursor indicators
  updateCursorIndicators(instance)
  
  // In Doppler mode, handle dragging interactions
  if (instance.state.mode === 'doppler' && instance.state.doppler.isDragging) {
    handleDopplerMarkerDrag(instance)
  }
  // In Doppler mode, handle preview drag
  else if (instance.state.mode === 'doppler' && instance.state.doppler.isPreviewDrag) {
    handleDopplerPreviewDrag(instance)
  }
  // In Harmonics mode, handle dragging interactions using new mode pattern
  else if (instance.state.mode === 'harmonics' && instance.state.dragState.isDragging) {
    if (instance.currentMode && instance.currentMode.handleMouseMove) {
      instance.currentMode.handleMouseMove(event, {
        svgCoords: { x: instance.state.cursorPosition.svgX, y: instance.state.cursorPosition.svgY },
        dataCoords: { time: instance.state.cursorPosition.time, freq: instance.state.cursorPosition.freq },
        imageCoords: { x: instance.state.cursorPosition.imageX, y: instance.state.cursorPosition.imageY }
      })
    }
  }
  
  // Live rate displays are now handled by the HarmonicsMode class
  
  // Notify listeners
  notifyStateListeners(instance.state, instance.stateListeners)
}

// updateHarmonicRatesLive function removed - now handled by HarmonicsMode class

// handleHarmonicSetDrag function removed - now handled by HarmonicsMode.handleHarmonicSetDrag()

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
  // Only process if we have valid image details
  if (!instance.state.imageDetails.naturalWidth || !instance.state.imageDetails.naturalHeight) return
  
  // Handle Doppler mode drag interactions
  if (instance.state.mode === 'doppler' && instance.state.cursorPosition) {
    handleDopplerMouseDown(instance, event)
  } 
  // Handle Harmonics mode drag interactions using new mode pattern
  else if (instance.state.mode === 'harmonics' && instance.state.cursorPosition) {
    if (instance.currentMode && instance.currentMode.handleMouseDown) {
      instance.currentMode.handleMouseDown(event, {
        svgCoords: { x: instance.state.cursorPosition.svgX, y: instance.state.cursorPosition.svgY },
        dataCoords: { time: instance.state.cursorPosition.time, freq: instance.state.cursorPosition.freq },
        imageCoords: { x: instance.state.cursorPosition.imageX, y: instance.state.cursorPosition.imageY }
      })
    }
  }
}

/**
 * Handle mouse up events to end drag interactions
 * @param {Object} instance - GramFrame instance
 * @param {MouseEvent} event - Mouse event
 */
export function handleMouseUp(instance, event) {
  // End Doppler preview drag and place markers
  if (instance.state.mode === 'doppler' && instance.state.doppler.isPreviewDrag) {
    const firstMarker = instance.state.doppler.tempFirst
    const secondMarker = instance.state.doppler.previewEnd
    
    // Assign f- and f+ based on time order (f- = earlier, f+ = later)
    if (firstMarker.time < secondMarker.time) {
      instance.state.doppler.fMinus = firstMarker  // earlier time = f-
      instance.state.doppler.fPlus = secondMarker  // later time = f+
    } else {
      instance.state.doppler.fMinus = secondMarker  // earlier time = f-
      instance.state.doppler.fPlus = firstMarker   // later time = f+
    }
    
    // Calculate initial f₀ as midpoint
    instance.state.doppler.fZero = {
      time: (instance.state.doppler.fMinus.time + instance.state.doppler.fPlus.time) / 2,
      frequency: (instance.state.doppler.fMinus.frequency + instance.state.doppler.fPlus.frequency) / 2
    }
    
    // Calculate initial speed
    calculateAndUpdateDopplerSpeed(instance)
    
    // Clean up preview state
    instance.state.doppler.isPreviewDrag = false
    instance.state.doppler.tempFirst = null
    instance.state.doppler.previewEnd = null
    instance.state.doppler.markersPlaced = 2
    
    // Update displays
    updateCursorIndicators(instance)
    notifyStateListeners(instance.state, instance.stateListeners)
  }
  // End Doppler drag state
  else if (instance.state.mode === 'doppler' && instance.state.doppler.isDragging) {
    instance.state.doppler.isDragging = false
    instance.state.doppler.draggedMarker = null
    notifyStateListeners(instance.state, instance.stateListeners)
  }
  
  // End harmonics drag state using new mode pattern
  if (instance.state.mode === 'harmonics' && instance.state.dragState.isDragging) {
    if (instance.currentMode && instance.currentMode.handleMouseUp) {
      instance.currentMode.handleMouseUp(event, {
        svgCoords: { x: instance.state.cursorPosition?.svgX || 0, y: instance.state.cursorPosition?.svgY || 0 },
        dataCoords: { time: instance.state.cursorPosition?.time || 0, freq: instance.state.cursorPosition?.freq || 0 },
        imageCoords: { x: instance.state.cursorPosition?.imageX || 0, y: instance.state.cursorPosition?.imageY || 0 }
      })
    }
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
  
  // Handle mode-specific clicks using new mode pattern for harmonics
  if (instance.state.mode === 'harmonics') {
    if (instance.currentMode && instance.currentMode.handleClick) {
      instance.currentMode.handleClick(event, {
        svgCoords: { x: instance.state.cursorPosition.svgX, y: instance.state.cursorPosition.svgY },
        dataCoords: { time: instance.state.cursorPosition.time, freq: instance.state.cursorPosition.freq },
        imageCoords: { x: instance.state.cursorPosition.imageX, y: instance.state.cursorPosition.imageY }
      })
    }
  } else if (instance.state.mode === 'doppler') {
    handleDopplerClick(instance, event)
  }
}


// handleHarmonicsClick function removed - now handled by HarmonicsMode.handleClick()

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
 * Handle Doppler mode clicks for marker placement
 * @param {Object} instance - GramFrame instance
 * @param {MouseEvent} event - Mouse event
 */
export function handleDopplerClick(instance, event) {
  const doppler = instance.state.doppler
  
  // If we're placing markers
  if (doppler.markersPlaced < 2) {
    const dataCoords = {
      time: instance.state.cursorPosition.time,
      frequency: instance.state.cursorPosition.freq
    }
    
    if (doppler.markersPlaced === 0) {
      // Start drag preview mode - don't place marker yet
      instance.state.doppler.tempFirst = dataCoords
      instance.state.doppler.isPreviewDrag = true
      instance.state.doppler.previewEnd = dataCoords
    } else if (doppler.markersPlaced === 1) {
      // Place second marker and determine which is f+ vs f- based on time
      const firstMarker = instance.state.doppler.tempFirst
      const secondMarker = dataCoords
      
      // Assign f- and f+ based on time order (f- = earlier, f+ = later)
      if (firstMarker.time < secondMarker.time) {
        instance.state.doppler.fMinus = firstMarker  // earlier time = f-
        instance.state.doppler.fPlus = secondMarker  // later time = f+
      } else {
        instance.state.doppler.fMinus = secondMarker  // earlier time = f-
        instance.state.doppler.fPlus = firstMarker   // later time = f+
      }
      
      // Clean up temporary marker
      instance.state.doppler.tempFirst = null
      instance.state.doppler.markersPlaced = 2
      
      // Calculate initial f₀ as midpoint
      instance.state.doppler.fZero = {
        time: (instance.state.doppler.fMinus.time + instance.state.doppler.fPlus.time) / 2,
        frequency: (instance.state.doppler.fMinus.frequency + instance.state.doppler.fPlus.frequency) / 2
      }
      
      // Calculate initial speed
      calculateAndUpdateDopplerSpeed(instance)
    }
    
    // Update displays
    updateCursorIndicators(instance)
    notifyStateListeners(instance.state, instance.stateListeners)
  }
}

/**
 * Handle Doppler mouse down events for marker dragging
 * @param {Object} instance - GramFrame instance
 * @param {MouseEvent} event - Mouse event
 */
function handleDopplerMouseDown(instance, event) {
  const doppler = instance.state.doppler
  const cursorPos = { 
    x: instance.state.cursorPosition.svgX,
    y: instance.state.cursorPosition.svgY 
  }
  
  // Check if we're clicking near any existing markers for dragging
  if (doppler.fPlus) {
    const fPlusSVG = dopplerDataToSVG(doppler.fPlus, instance)
    if (isNearMarker(cursorPos, fPlusSVG, 15)) {
      instance.state.doppler.isDragging = true
      instance.state.doppler.draggedMarker = 'fPlus'
      return
    }
  }
  
  if (doppler.fMinus) {
    const fMinusSVG = dopplerDataToSVG(doppler.fMinus, instance)
    if (isNearMarker(cursorPos, fMinusSVG, 15)) {
      instance.state.doppler.isDragging = true
      instance.state.doppler.draggedMarker = 'fMinus'
      return
    }
  }
  
  if (doppler.fZero) {
    const fZeroSVG = dopplerDataToSVG(doppler.fZero, instance)
    if (isNearMarker(cursorPos, fZeroSVG, 15)) {
      instance.state.doppler.isDragging = true
      instance.state.doppler.draggedMarker = 'fZero'
      return
    }
  }
  
  // If not near any markers, handle normal click for placement
  handleDopplerClick(instance, event)
}

/**
 * Handle dragging of Doppler markers
 * @param {Object} instance - GramFrame instance
 */
function handleDopplerMarkerDrag(instance) {
  const doppler = instance.state.doppler
  const draggedMarker = doppler.draggedMarker
  
  if (!draggedMarker || !instance.state.cursorPosition) return
  
  // Convert current cursor position to data coordinates
  const newDataCoords = {
    time: instance.state.cursorPosition.time,
    frequency: instance.state.cursorPosition.freq
  }
  
  // Update the dragged marker
  instance.state.doppler[draggedMarker] = newDataCoords
  
  // If dragging f+ or f-, update f₀ to midpoint
  if (draggedMarker === 'fPlus' || draggedMarker === 'fMinus') {
    if (doppler.fPlus && doppler.fMinus) {
      instance.state.doppler.fZero = {
        time: (doppler.fPlus.time + doppler.fMinus.time) / 2,
        frequency: (doppler.fPlus.frequency + doppler.fMinus.frequency) / 2
      }
    }
  }
  
  // Recalculate speed
  calculateAndUpdateDopplerSpeed(instance)
  
  // Update display
  updateCursorIndicators(instance)
}

/**
 * Handle Doppler preview drag during initial line drawing
 * @param {Object} instance - GramFrame instance
 */
function handleDopplerPreviewDrag(instance) {
  if (!instance.state.cursorPosition) return
  
  // Update preview end point to current cursor position
  instance.state.doppler.previewEnd = {
    time: instance.state.cursorPosition.time,
    frequency: instance.state.cursorPosition.freq
  }
  
  // Update display
  updateCursorIndicators(instance)
}

/**
 * Calculate and update Doppler speed
 * @param {Object} instance - GramFrame instance
 */
function calculateAndUpdateDopplerSpeed(instance) {
  const doppler = instance.state.doppler
  
  if (doppler.fPlus && doppler.fMinus && doppler.fZero) {
    const speed = calculateDopplerSpeed(doppler.fPlus, doppler.fMinus, doppler.fZero)
    instance.state.doppler.speed = speed
    
    // Update LED displays with speed
    updateDopplerDisplays(instance)
    notifyStateListeners(instance.state, instance.stateListeners)
  }
}

/**
 * Update LED displays with Doppler-specific information
 * @param {Object} instance - GramFrame instance
 */
function updateDopplerDisplays(instance) {
  // Speed display is now handled by the standard LED display system
  updateLEDDisplays(instance, instance.state)
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