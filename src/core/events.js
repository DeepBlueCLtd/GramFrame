/**
 * Event handling for GramFrame component
 */

/// <reference path="../types.js" />

import { screenToSVGCoordinates, imageToDataCoordinates } from '../utils/coordinates.js'
import { updateCursorIndicators } from '../rendering/cursors.js'
import { notifyStateListeners } from './state.js'
import { updateUniversalCursorReadouts } from '../components/MainUI.js'
import { setFocusedInstance } from './FocusManager.js'
import { zoomAtImagePoint, pixelDeltaToNormalizedPan, panByNormalized } from './viewport.js'

/**
 * Per-notch multiplicative zoom factor for Ctrl+wheel zoom (smoother than the
 * ×1.5 button step).
 * @type {number}
 */
const WHEEL_ZOOM_STEP = 1.2

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
  
  // Convert to data coordinates (accounting for margins, expand and zoom)
  const margins = instance.state.margins
  const { naturalWidth, naturalHeight } = instance.state.imageDetails
  // Base render size (defaults to natural; grows when expanded). Zoom multiplies
  // it, so the rendered element size is renderWidth/renderHeight × zoom.
  const renderWidth = instance.state.imageDetails.renderWidth || naturalWidth
  const renderHeight = instance.state.imageDetails.renderHeight || naturalHeight

  // Get the actual rendered image position and dimensions. The element's
  // width/height attribute is the source of truth (it already reflects
  // expand × zoom), so read it whenever the image element is present.
  let imageLeft = margins.left
  let imageTop = margins.top
  let imageWidth = renderWidth
  let imageHeight = renderHeight

  if (instance.spectrogramImage) {
    imageLeft = parseFloat(instance.spectrogramImage.getAttribute('x') || String(margins.left))
    imageTop = parseFloat(instance.spectrogramImage.getAttribute('y') || String(margins.top))
    imageWidth = parseFloat(instance.spectrogramImage.getAttribute('width') || String(renderWidth))
    imageHeight = parseFloat(instance.spectrogramImage.getAttribute('height') || String(renderHeight))
  }

  // Convert SVG coordinates to image-relative coordinates in render-pixel space
  const imageX = (svgCoords.x - imageLeft) * (renderWidth / imageWidth)
  const imageY = (svgCoords.y - imageTop) * (renderHeight / imageHeight)

  // Check if within the rendered image bounds
  const withinBounds = svgCoords.x >= imageLeft && svgCoords.x <= imageLeft + imageWidth &&
                      svgCoords.y >= imageTop && svgCoords.y <= imageTop + imageHeight &&
                      imageX >= 0 && imageX <= renderWidth &&
                      imageY >= 0 && imageY <= renderHeight
  
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
 * Handle mouse-wheel events on the SVG: Ctrl+scroll zooms around the pointer,
 * plain scroll pans horizontally along frequency (only when zoomed in). Works in
 * every mode. Does nothing (and lets the page scroll) when the pointer is not over
 * the spectrogram image, or on a plain scroll while not zoomed in.
 * @param {GramFrame} instance - GramFrame instance
 * @param {WheelEvent} event - Wheel event
 */
function handleWheel(instance, event) {
  const result = screenToDataWithZoom(instance, event)
  if (!result) {
    return // Not over the spectrogram image - leave the page scroll alone
  }

  if (event.ctrlKey) {
    // Zoom around the pointer. Scroll up/away (deltaY < 0) zooms in.
    const factor = event.deltaY < 0 ? WHEEL_ZOOM_STEP : 1 / WHEEL_ZOOM_STEP
    zoomAtImagePoint(instance, factor, result.imageX, result.imageY)
    event.preventDefault() // Always consume the zoom gesture
  } else if (instance.state.zoom.level > 1.0) {
    // Horizontal pan: map vertical wheel delta to frequency panning.
    // Scroll down (deltaY > 0) moves forward in frequency.
    const { normalizedDeltaX } = pixelDeltaToNormalizedPan(instance, -event.deltaY, 0)
    panByNormalized(instance, normalizedDeltaX, 0)
    event.preventDefault()
  }
  // else: not zoomed in - nothing to pan; allow the page to scroll normally.
}

/**
 * End an in-progress wheel-button (middle) drag pan, restoring the cursor.
 * @param {GramFrame} instance - GramFrame instance
 */
function endWheelPan(instance) {
  if (instance.svg && instance._wheelPan) {
    instance.svg.style.cursor = instance._wheelPan.prevCursor || 'crosshair'
  }
  instance._wheelPan = null
}

/**
 * Set up event listeners for the GramFrame instance
 * @param {GramFrame} instance - GramFrame instance
 */
export function setupEventListeners(instance) {
  // Every listener is kept as a bound reference so cleanupEventListeners can
  // actually remove it (GF-14). Anonymous inline handlers were unremovable, so
  // "cleanup" relied entirely on the SVG being dropped from the DOM.
  /** @type {Array<{target: EventTarget, type: string, handler: EventListener, options?: AddEventListenerOptions}>} */
  const registered = []

  /**
   * Attach a listener and remember it for cleanup.
   * @param {EventTarget} target - Element to listen on
   * @param {string} type - Event name
   * @param {EventListener} handler - Listener function
   * @param {AddEventListenerOptions} [options] - addEventListener options
   */
  const listen = (target, type, handler, options) => {
    target.addEventListener(type, handler, options)
    registered.push({ target, type, handler, options })
  }

  // Mouse event listeners for SVG interaction
  if (instance.svg) {
    // Mouse move for cursor tracking
    listen(instance.svg, 'mousemove', (event) => {
      handleMouseMove(instance, /** @type {MouseEvent} */ (event))
    })

    // Mouse down for starting drag operations
    listen(instance.svg, 'mousedown', (event) => {
      handleMouseDown(instance, /** @type {MouseEvent} */ (event))
    })

    // Mouse up for ending drag operations
    listen(instance.svg, 'mouseup', (event) => {
      handleMouseUp(instance, /** @type {MouseEvent} */ (event))
    })

    // Mouse leave to clear cursor position
    listen(instance.svg, 'mouseleave', () => {
      handleMouseLeave(instance)
    })

    // Context menu (right-click) for reset operations
    listen(instance.svg, 'contextmenu', (event) => {
      handleContextMenu(instance, /** @type {MouseEvent} */ (event))
    })

    // Mouse wheel for global zoom (Ctrl+scroll) and horizontal pan (scroll).
    // passive:false so the handler can preventDefault() to stop the host page
    // from scrolling during a zoom/pan gesture.
    listen(instance.svg, 'wheel', (event) => {
      handleWheel(instance, /** @type {WheelEvent} */ (event))
    }, { passive: false })
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
      listen(button, 'click', () => {
        instance._switchMode(/** @type {ModeType} */ (mode))
      })
    }
  })

  // Rate input UI events removed - backend rate functionality preserved

  // Window resize event
  listen(window, 'resize', instance._boundHandleResize)

  instance._registeredListeners = registered
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
  // Wheel-button drag pan takes precedence over any mode interaction.
  if (instance._wheelPan && instance._wheelPan.active) {
    const dx = event.clientX - instance._wheelPan.lastX
    const dy = event.clientY - instance._wheelPan.lastY
    const { normalizedDeltaX, normalizedDeltaY } = pixelDeltaToNormalizedPan(instance, dx, dy)
    panByNormalized(instance, normalizedDeltaX, normalizedDeltaY)
    instance._wheelPan.lastX = event.clientX
    instance._wheelPan.lastY = event.clientY
    return
  }

  const result = screenToDataWithZoom(instance, event)

  if (result) {
    const { svgCoords, imageX, imageY, dataCoords } = result

    // Update cursor position in state
    instance.state.cursorPosition = {
      x: event.clientX - instance.svg.getBoundingClientRect().left,
      y: event.clientY - instance.svg.getBoundingClientRect().top,
      svgX: svgCoords.x,
      svgY: svgCoords.y,
      imageX,
      imageY,
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
  // Set focus when user interacts with this instance
  setFocusedInstance(instance)

  // Middle (wheel) button starts a global pan and is never delegated to a mode,
  // so it can never place a cursor/marker/harmonic/doppler point.
  if (event.button === 1) {
    event.preventDefault() // Suppress browser middle-click autoscroll
    if (instance.state.zoom.level > 1.0) {
      instance._wheelPan = {
        active: true,
        lastX: event.clientX,
        lastY: event.clientY,
        prevCursor: instance.svg ? instance.svg.style.cursor : ''
      }
      if (instance.svg) {
        instance.svg.style.cursor = 'grabbing'
      }
    }
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
  // End a wheel-button drag pan without delegating to the mode.
  if (instance._wheelPan && instance._wheelPan.active) {
    endWheelPan(instance)
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
  // End a wheel-button drag pan cleanly if the pointer leaves the component.
  if (instance._wheelPan && instance._wheelPan.active) {
    endWheelPan(instance)
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
  // Remove every listener registered in setupEventListeners — SVG, mode
  // buttons and the window resize handler alike.
  const registered = instance._registeredListeners || []
  registered.forEach(({ target, type, handler, options }) => {
    target.removeEventListener(type, handler, options)
  })
  instance._registeredListeners = []

  // Clean up ResizeObserver
  if (instance.resizeObserver) {
    instance.resizeObserver.disconnect()
    instance.resizeObserver = null
  }
}