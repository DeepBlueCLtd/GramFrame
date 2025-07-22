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
import { calculateDopplerMeasurements, triggerHarmonicsDisplay } from './analysis.js'
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
  
  // In Harmonics mode, handle dragging interactions
  if (instance.state.mode === 'harmonics' && instance.state.dragState.isDragging) {
    if (instance.state.dragState.draggedHarmonicSetId) {
      // Update dragged harmonic set
      handleHarmonicSetDrag(instance)
    } else {
      // No dragging of harmonic sets - just regular cursor tracking during drag
      // Old harmonics system is disabled in favor of click-to-create approach
    }
  }
  
  // Notify listeners
  notifyStateListeners(instance.state, instance.stateListeners)
}

/**
 * Handle dragging of harmonic sets
 * @param {Object} instance - GramFrame instance
 */
function handleHarmonicSetDrag(instance) {
  if (!instance.state.cursorPosition || !instance.state.dragState.dragStartPosition) return

  const currentPos = instance.state.cursorPosition
  const startPos = instance.state.dragState.dragStartPosition
  const setId = instance.state.dragState.draggedHarmonicSetId

  if (!setId) return

  const harmonicSet = instance.state.harmonics.harmonicSets.find(set => set.id === setId)
  if (!harmonicSet) return

  // Calculate changes from drag start
  const deltaFreq = currentPos.freq - startPos.freq
  const deltaTime = currentPos.time - startPos.time

  // Update spacing based on horizontal drag
  // The dragged harmonic should stay under cursor
  const clickedHarmonicNumber = instance.state.dragState.clickedHarmonicNumber || 1
  const newSpacing = (instance.state.dragState.originalSpacing + deltaFreq / clickedHarmonicNumber)
  
  // Update anchor time based on vertical drag  
  // Note: deltaTime is positive when dragging up, but we want up to decrease anchor time
  // to move the lines up on screen, so we subtract deltaTime
  const newAnchorTime = instance.state.dragState.originalAnchorTime - deltaTime

  // Apply updates
  const updates = {}
  if (newSpacing > 0) {
    updates.spacing = newSpacing
  }
  updates.anchorTime = newAnchorTime

  instance._updateHarmonicSet(setId, updates)
  
  // Update harmonic management panel
  updateHarmonicPanel(instance)
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
  
  // Handle Harmonics mode drag interactions
  if (instance.state.mode === 'harmonics' && instance.state.cursorPosition) {
    const cursorFreq = instance.state.cursorPosition.freq
    
    // Check if we're clicking on an existing harmonic set
    const existingSet = instance._findHarmonicSetAtFrequency(cursorFreq)
    
    if (existingSet) {
      // Start dragging existing harmonic set
      instance.state.dragState.isDragging = true
      instance.state.dragState.dragStartPosition = { ...instance.state.cursorPosition }
      instance.state.dragState.draggedHarmonicSetId = existingSet.id
      instance.state.dragState.originalSpacing = existingSet.spacing
      instance.state.dragState.originalAnchorTime = existingSet.anchorTime
      
      // Find which harmonic number was clicked
      const harmonicNumber = Math.round(cursorFreq / existingSet.spacing)
      instance.state.dragState.clickedHarmonicNumber = harmonicNumber
    } else {
      // Don't use old harmonics system - just set dragging for now
      // This could be enhanced later to create harmonic sets while dragging
      instance.state.dragState.isDragging = true
      instance.state.dragState.dragStartPosition = { ...instance.state.cursorPosition }
    }
  }
}

/**
 * Handle mouse up events to end drag interactions
 * @param {Object} instance - GramFrame instance
 * @param {MouseEvent} event - Mouse event
 */
export function handleMouseUp(instance, event) {
  // End drag state
  if (instance.state.dragState.isDragging) {
    const wasDraggingHarmonicSet = !!instance.state.dragState.draggedHarmonicSetId
    
    // Clear drag state
    instance.state.dragState.isDragging = false
    instance.state.dragState.dragStartPosition = null
    instance.state.dragState.draggedHarmonicSetId = null
    instance.state.dragState.originalSpacing = null
    instance.state.dragState.originalAnchorTime = null
    instance.state.dragState.clickedHarmonicNumber = null
    
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
  if (instance.state.mode === 'doppler') {
    handleDopplerClick(instance)
  } else if (instance.state.mode === 'harmonics') {
    handleHarmonicsClick(instance, event)
  }
}

/**
 * Process Doppler mode click to set measurement points
 * @param {Object} instance - GramFrame instance
 */
export function handleDopplerClick(instance) {
  // Create point data from current cursor position
  if (!instance.state.cursorPosition) return
  
  const clickPoint = {
    time: instance.state.cursorPosition.time,
    freq: instance.state.cursorPosition.freq,
    svgX: instance.state.cursorPosition.svgX,
    svgY: instance.state.cursorPosition.svgY
  }
  
  if (!instance.state.doppler.startPoint) {
    // Set start point
    instance.state.doppler.startPoint = clickPoint
    instance.state.doppler.endPoint = null
    instance.state.doppler.deltaTime = null
    instance.state.doppler.deltaFrequency = null
    instance.state.doppler.speed = null
  } else if (!instance.state.doppler.endPoint) {
    // Set end point and calculate measurements
    instance.state.doppler.endPoint = clickPoint
    calculateDopplerMeasurements(instance.state)
  } else {
    // Both points are set, start a new measurement
    instance.state.doppler.startPoint = clickPoint
    instance.state.doppler.endPoint = null
    instance.state.doppler.deltaTime = null
    instance.state.doppler.deltaFrequency = null
    instance.state.doppler.speed = null
  }
  
  // Update displays and indicators
  updateLEDDisplays(instance, instance.state)
  updateCursorIndicators(instance)
  
  // Notify listeners of state change
  notifyStateListeners(instance.state, instance.stateListeners)
}

/**
 * Process Harmonics mode click to create new harmonic sets
 * @param {Object} instance - GramFrame instance
 * @param {MouseEvent} event - Mouse event
 */
export function handleHarmonicsClick(instance, event) {
  if (!instance.state.cursorPosition) return

  const cursorFreq = instance.state.cursorPosition.freq
  const cursorTime = instance.state.cursorPosition.time

  // Check if we clicked on an existing harmonic line for dragging
  const existingSet = instance._findHarmonicSetAtFrequency(cursorFreq)
  if (existingSet) {
    // We clicked on an existing harmonic line - this will be handled by mouse down for dragging
    return
  }

  // Create a new harmonic set
  // Determine initial spacing: cursor represents 10th harmonic if freq origin > 0, else 5th harmonic
  const freqOrigin = instance.state.config.freqMin
  const initialHarmonicNumber = freqOrigin > 0 ? 10 : 5
  const spacing = cursorFreq / initialHarmonicNumber

  // Create the harmonic set
  instance._addHarmonicSet(cursorTime, spacing)

  // Update the harmonic management panel if it exists
  updateHarmonicPanel(instance)
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