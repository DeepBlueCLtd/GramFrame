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
  
  // In Harmonics mode, update harmonics during drag
  if (instance.state.mode === 'harmonics' && instance.state.dragState.isDragging) {
    triggerHarmonicsDisplay(
      instance.state, 
      () => updateLEDDisplays(instance, instance.state),
      () => updateCursorIndicators(instance), 
      notifyStateListeners, 
      instance.stateListeners
    )
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
  
  // Start drag state in Harmonics mode for harmonics
  if (instance.state.mode === 'harmonics' && instance.state.cursorPosition) {
    instance.state.dragState.isDragging = true
    instance.state.dragState.dragStartPosition = { ...instance.state.cursorPosition }
    
    // Trigger harmonics display immediately on mouse down
    triggerHarmonicsDisplay(
      instance.state, 
      () => updateLEDDisplays(instance, instance.state),
      () => updateCursorIndicators(instance), 
      notifyStateListeners, 
      instance.stateListeners
    )
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
    instance.state.dragState.isDragging = false
    instance.state.dragState.dragStartPosition = null
    
    // Clear harmonics state when drag ends
    instance.state.harmonics.baseFrequency = null
    instance.state.harmonics.harmonicData = []
    
    // Update displays and indicators
    updateLEDDisplays(instance, instance.state)
    updateCursorIndicators(instance)
    
    // Notify listeners of state change
    notifyStateListeners(instance.state, instance.stateListeners)
  }
}

/**
 * Handle click events for Doppler mode measurements
 * @param {Object} instance - GramFrame instance
 * @param {MouseEvent} event - Mouse event
 */
export function handleClick(instance, event) {
  // Only process if we have valid image details and are in Doppler mode
  if (!instance.state.imageDetails.naturalWidth || !instance.state.imageDetails.naturalHeight || instance.state.mode !== 'doppler') {
    return
  }
  
  // Only process if mouse is within the image area
  if (!instance.state.cursorPosition) {
    return
  }
  
  // Handle Doppler mode clicks
  if (instance.state.mode === 'doppler') {
    handleDopplerClick(instance)
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