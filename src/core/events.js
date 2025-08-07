/**
 * Event handling for GramFrame component
 */

/// <reference path="../types.js" />

import { screenToSVGCoordinates, imageToDataCoordinates } from '../utils/coordinates.js'
import { updateCursorIndicators } from '../rendering/cursors.js'
import { notifyStateListeners } from './state.js'
import { updateUniversalCursorReadouts } from '../components/MainUI.js'

/**
 * Convert screen coordinates to data coordinates, accounting for zoom
 * @param {GramFrame} instance - GramFrame instance
 * @param {MouseEvent} event - Mouse event
 * @returns {ScreenToDataResult|null} Object with svgCoords, imageX, imageY, dataCoords, and bounds check
 */
function screenToDataWithZoom(instance, event) {
  const svgRect = instance.svg.getBoundingClientRect()
  const screenX = event.clientX - svgRect.left
  const screenY = event.clientY - svgRect.top
  
  // Convert to SVG coordinates
  const svgCoords = screenToSVGCoordinates(screenX, screenY, instance.svg, instance.state.imageDetails)
  
  // Convert to data coordinates (accounting for margins and zoom)
  const margins = instance.state.axes.margins
  const zoomLevel = instance.state.zoom.level
  const { naturalWidth, naturalHeight } = instance.state.imageDetails
  
  // Get current image position and dimensions (which may be zoomed)
  let imageLeft = margins.left
  let imageTop = margins.top
  let imageWidth = naturalWidth
  let imageHeight = naturalHeight
  
  if (zoomLevel !== 1.0 && instance.spectrogramImage) {
    imageLeft = parseFloat(instance.spectrogramImage.getAttribute('x') || String(margins.left))
    imageTop = parseFloat(instance.spectrogramImage.getAttribute('y') || String(margins.top))
    imageWidth = parseFloat(instance.spectrogramImage.getAttribute('width') || String(naturalWidth))
    imageHeight = parseFloat(instance.spectrogramImage.getAttribute('height') || String(naturalHeight))
  }
  
  // Convert SVG coordinates to image-relative coordinates
  const imageX = (svgCoords.x - imageLeft) * (naturalWidth / imageWidth)
  const imageY = (svgCoords.y - imageTop) * (naturalHeight / imageHeight)
  
  // Check if within zoomed image bounds
  const withinBounds = svgCoords.x >= imageLeft && svgCoords.x <= imageLeft + imageWidth &&
                      svgCoords.y >= imageTop && svgCoords.y <= imageTop + imageHeight &&
                      imageX >= 0 && imageX <= naturalWidth &&
                      imageY >= 0 && imageY <= naturalHeight
  
  if (!withinBounds) {
    return null
  }
  
  const dataCoords = imageToDataCoordinates(
    imageX, imageY,
    instance.state.config,
    instance.state.imageDetails,
    instance.state.rate
  )
  
  return { svgCoords, imageX, imageY, dataCoords }
}

/**
 * Set up event listeners for the GramFrame instance
 * @param {GramFrame} instance - GramFrame instance
 */
export function setupEventListeners(instance) {
  // Mouse event listeners for SVG interaction
  if (instance.svg) {
    // Mouse move for cursor tracking
    instance.svg.addEventListener('mousemove', (event) => {
      handleMouseMove(instance, event)
    })
    
    // Mouse down for starting drag operations
    instance.svg.addEventListener('mousedown', (event) => {
      handleMouseDown(instance, event)
    })
    
    // Mouse up for ending drag operations
    instance.svg.addEventListener('mouseup', (event) => {
      handleMouseUp(instance, event)
    })
    
    // Mouse leave to clear cursor position
    instance.svg.addEventListener('mouseleave', () => {
      handleMouseLeave(instance)
    })
    
    // Context menu (right-click) for reset operations
    instance.svg.addEventListener('contextmenu', (event) => {
      handleContextMenu(instance, event)
    })
  }
  
  // Bind resize handler
  instance._boundHandleResize = () => {
    if (instance._handleResize) {
      instance._handleResize()
    }
  }
  
  // Mode button events
  Object.keys(instance.modeButtons || {}).forEach(mode => {
    const button = instance.modeButtons[mode]
    if (button) {
      button.addEventListener('click', () => {
        instance._switchMode(/** @type {ModeType} */ (mode))
      })
    }
  })
  
  // Rate input UI events removed - backend rate functionality preserved
  
  // Window resize event
  window.addEventListener('resize', instance._boundHandleResize)
}

/**
 * Set up ResizeObserver to monitor container dimensions
 * @param {GramFrame} instance - GramFrame instance
 */
export function setupResizeObserver(instance) {
  // Use ResizeObserver to monitor SVG container dimensions
  if (typeof ResizeObserver !== 'undefined') {
    instance.resizeObserver = new ResizeObserver(_entries => {
      // Trigger resize handling
      if (instance._handleResize) {
        instance._handleResize()
      }
    })
    instance.resizeObserver.observe(instance.container)
  }
}

/**
 * Handle mouse move events on SVG
 * @param {GramFrame} instance - GramFrame instance
 * @param {MouseEvent} event - Mouse event
 */
function handleMouseMove(instance, event) {
  const result = screenToDataWithZoom(instance, event)
  
  if (result) {
    const { svgCoords, dataCoords } = result
    
    // Update cursor position in state
    instance.state.cursorPosition = {
      x: event.clientX - instance.svg.getBoundingClientRect().left,
      y: event.clientY - instance.svg.getBoundingClientRect().top,
      svgX: svgCoords.x,
      svgY: svgCoords.y,
      imageX: svgCoords.x, // Simplified - would need proper image coordinate calculation
      imageY: svgCoords.y, // Simplified - would need proper image coordinate calculation
      freq: dataCoords.freq,
      time: dataCoords.time
    }
    
    // Update universal cursor readouts (time/freq LEDs) regardless of mode
    updateUniversalCursorReadouts(instance, dataCoords)
    
    // Delegate to current mode for mode-specific handling
    if (instance.currentMode && typeof instance.currentMode.handleMouseMove === 'function') {
      instance.currentMode.handleMouseMove(event, dataCoords)
    }
  } else {
    // Clear cursor position if outside image bounds
    instance.state.cursorPosition = null
  }
  
  // Update cursor indicators
  updateCursorIndicators(instance)
  
  // Notify listeners of cursor position change
  notifyStateListeners(instance.state, instance.stateListeners)
}

/**
 * Handle mouse down events on SVG
 * @param {GramFrame} instance - GramFrame instance
 * @param {MouseEvent} event - Mouse event
 */
function handleMouseDown(instance, event) {
  const result = screenToDataWithZoom(instance, event)
  
  if (result) {
    const { dataCoords } = result
    
    // Delegate to current mode for mode-specific handling
    if (instance.currentMode && typeof instance.currentMode.handleMouseDown === 'function') {
      instance.currentMode.handleMouseDown(event, dataCoords)
    }
  }
}

/**
 * Handle mouse up events on SVG
 * @param {GramFrame} instance - GramFrame instance
 * @param {MouseEvent} event - Mouse event
 */
function handleMouseUp(instance, event) {
  const result = screenToDataWithZoom(instance, event)
  
  if (result) {
    const { dataCoords } = result
    
    // Delegate to current mode for mode-specific handling
    if (instance.currentMode && typeof instance.currentMode.handleMouseUp === 'function') {
      instance.currentMode.handleMouseUp(event, dataCoords)
    }
  }
}

/**
 * Handle mouse leave events on SVG
 * @param {GramFrame} instance - GramFrame instance
 */
function handleMouseLeave(instance) {
  // Clear cursor position
  instance.state.cursorPosition = null
  
  // Update cursor indicators
  updateCursorIndicators(instance)
  
  // Delegate to current mode
  if (instance.currentMode && typeof instance.currentMode.handleMouseLeave === 'function') {
    instance.currentMode.handleMouseLeave()
  }
  
  // Notify listeners
  notifyStateListeners(instance.state, instance.stateListeners)
}

/**
 * Handle context menu (right-click) events on SVG
 * @param {GramFrame} instance - GramFrame instance
 * @param {MouseEvent} event - Mouse event
 */
function handleContextMenu(instance, event) {
  const result = screenToDataWithZoom(instance, event)
  
  if (result) {
    const { dataCoords } = result
    
    // Delegate to current mode for mode-specific handling
    if (instance.currentMode && typeof instance.currentMode.handleContextMenu === 'function') {
      instance.currentMode.handleContextMenu(event, dataCoords)
    }
  }
}

/**
 * Clean up event listeners (called when component is destroyed)
 * @param {GramFrame} instance - GramFrame instance
 */
export function cleanupEventListeners(instance) {
  // Clean up SVG event listeners
  if (instance.svg) {
    // SVG events are cleaned up automatically when SVG is removed from DOM
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