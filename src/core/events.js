/**
 * Event handling for GramFrame component
 */

/// <reference path="../types.js" />

// Old coordinate imports replaced with TransformManager usage
import { updateCursorIndicators } from '../rendering/cursors.js'

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
  
  // Use TransformManager for coordinate transformations if available
  if (instance.transformManager) {
    try {
      const coords = instance.transformManager.getAllCoordinates(screenX, screenY)
      return {
        svgCoords: { x: coords.svg.x, y: coords.svg.y },
        imageX: coords.image.x,
        imageY: coords.image.y,
        dataCoords: { freq: coords.data.x, time: coords.data.y }
      }
    } catch (error) {
      console.warn('TransformManager coordinate conversion failed:', error)
      return null
    }
  }
  
  // Fallback to simple screen coordinate handling if TransformManager not available
  console.warn('TransformManager not available, using fallback coordinate handling')
  return null
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
      // Update coordinate system container size for zoom/pan functionality
      if (instance.coordinateSystem && typeof instance.coordinateSystem.updateContainerSize === 'function') {
        instance.coordinateSystem.updateContainerSize()
      }
      
      // Trigger resize handling
      if (instance._handleResize) {
        instance._handleResize()
      }
      
      // Update axes after container resize
      if (instance._updateAxes) {
        instance._updateAxes()
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
  // Handle panning if in pan mode and dragging
  if (instance.state.zoom.panMode && instance.state.zoom.level > 1.0 && instance._panDragState?.isDragging) {
    const deltaX = event.clientX - instance._panDragState.lastX
    const deltaY = event.clientY - instance._panDragState.lastY
    
    // Convert pixel delta to normalized delta (considering zoom level)
    const { naturalWidth, naturalHeight } = instance.state.imageDetails
    const margins = instance.state.axes.margins
    const svgRect = instance.svg.getBoundingClientRect()
    
    // Scale factor based on current zoom and SVG size
    const scaleX = (naturalWidth + margins.left + margins.right) / svgRect.width
    const scaleY = (naturalHeight + margins.top + margins.bottom) / svgRect.height
    
    // Convert to normalized coordinates (adjust for zoom level)
    const normalizedDeltaX = -(deltaX * scaleX / naturalWidth) / instance.state.zoom.level
    const normalizedDeltaY = -(deltaY * scaleY / naturalHeight) / instance.state.zoom.level
    
    // Apply pan
    instance._panImage(normalizedDeltaX, normalizedDeltaY)
    
    // Update drag state
    instance._panDragState.lastX = event.clientX
    instance._panDragState.lastY = event.clientY
    
    return // Skip normal cursor handling during pan drag
  }
  
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
    if (instance.updateUniversalCursorReadouts) {
      instance.updateUniversalCursorReadouts(dataCoords)
    }
    
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
  import('./state.js').then(({ notifyStateListeners }) => {
    notifyStateListeners(instance.state, instance.stateListeners)
  })
}

/**
 * Handle mouse down events on SVG
 * @param {GramFrame} instance - GramFrame instance
 * @param {MouseEvent} event - Mouse event
 */
function handleMouseDown(instance, event) {
  // Start pan drag if in pan mode and zoomed
  if (instance.state.zoom.panMode && instance.state.zoom.level > 1.0) {
    instance._panDragState = {
      isDragging: true,
      lastX: event.clientX,
      lastY: event.clientY
    }
    
    // Change cursor to grabbing
    if (instance.svg) {
      instance.svg.style.cursor = 'grabbing'
    }
    
    // Prevent default to avoid text selection
    event.preventDefault()
    return
  }
  
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
  // End pan drag if was dragging
  if (instance._panDragState?.isDragging) {
    instance._panDragState = { isDragging: false, lastX: 0, lastY: 0 }
    
    // Restore cursor to grab (pan mode still active)
    if (instance.svg && instance.state.zoom.panMode && instance.state.zoom.level > 1.0) {
      instance.svg.style.cursor = 'grab'
    }
    
    return
  }
  
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
  // Stop pan drag if was dragging
  if (instance._panDragState?.isDragging) {
    instance._panDragState = { isDragging: false, lastX: 0, lastY: 0 }
    
    // Restore cursor to grab (pan mode still active)
    if (instance.svg && instance.state.zoom.panMode && instance.state.zoom.level > 1.0) {
      instance.svg.style.cursor = 'grab'
    }
  }
  
  // Clear cursor position
  instance.state.cursorPosition = null
  
  // Update cursor indicators
  updateCursorIndicators(instance)
  
  // Delegate to current mode
  if (instance.currentMode && typeof instance.currentMode.handleMouseLeave === 'function') {
    instance.currentMode.handleMouseLeave()
  }
  
  // Notify listeners
  import('./state.js').then(({ notifyStateListeners }) => {
    notifyStateListeners(instance.state, instance.stateListeners)
  })
}

/**
 * Handle context menu (right-click) events on SVG
 * @param {GramFrame} instance - GramFrame instance
 * @param {MouseEvent} event - Mouse event
 */
function handleContextMenu(instance, event) {
  // Delegate to current mode for mode-specific handling
  if (instance.currentMode && typeof instance.currentMode.handleContextMenu === 'function') {
    instance.currentMode.handleContextMenu(event)
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