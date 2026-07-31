/**
 * Event handling for GramFrame component
 */

/// <reference path="../types.js" />

import { screenToData, isWithinImage } from '../utils/coordinates.js'
import { BaseDragHandler } from '../modes/shared/BaseDragHandler.js'
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
 * Convert a pointer event to data coordinates, or null when it is not over the
 * spectrogram image.
 *
 * The transformation itself lives in the canonical coordinate module, which is
 * already zoom-, expand-, render-size- and margin-aware (FR-002, FR-003). What
 * stays here is only the local convention every caller below relies on: an
 * off-image pointer reads as `null` rather than as an out-of-range point.
 *
 * @param {GramFrame} instance - GramFrame instance
 * @param {MouseEvent} event - Mouse event
 * @returns {ScreenToDataResult|null} Object with svgCoords, imageX, imageY and dataCoords, or null when off-image
 */
function screenToDataWithZoom(instance, event) {
  const point = screenToData(
    event.clientX,
    event.clientY,
    instance.svg,
    instance.state,
    instance.spectrogramImage
  )

  if (!isWithinImage(point.svg, instance.state, instance.spectrogramImage)) {
    return null
  }

  return {
    svgCoords: point.svg,
    imageX: point.image.x,
    imageY: point.image.y,
    dataCoords: point.data
  }
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
 * The middle-button pan, as a `pan`-kind drag on the shared engine.
 *
 * It differs from PanMode's drag only in its trigger (button 1, with
 * preventDefault to suppress browser autoscroll) and in being available in
 * *every* mode. Resolving it centrally, ahead of the mode's own handlers, is
 * what stops a middle-click ever reaching a mode and placing something
 * (contract: drag-engine.md, "Middle-button pan").
 * @param {GramFrame} instance - GramFrame instance
 * @returns {BaseDragHandler} The instance's wheel-pan handler
 */
function wheelPanHandler(instance) {
  if (!instance._wheelPanHandler) {
    let previousCursor = ''

    instance._wheelPanHandler = new BaseDragHandler(instance, {
      resolveTarget: () => (
        instance.state.zoom.level > 1.0 ? { kind: 'pan', id: null, type: null } : null
      ),
      onDragStart: (_target, _position, event) => {
        previousCursor = instance.svg ? instance.svg.style.cursor : ''
        if (event) {
          instance._wheelPanLast = { x: event.clientX, y: event.clientY }
        }
      },
      onDragMove: (_target, _position, _startPosition, event) => {
        if (!event || !instance._wheelPanLast) return
        const dx = event.clientX - instance._wheelPanLast.x
        const dy = event.clientY - instance._wheelPanLast.y
        const { normalizedDeltaX, normalizedDeltaY } = pixelDeltaToNormalizedPan(instance, dx, dy)
        panByNormalized(instance, normalizedDeltaX, normalizedDeltaY)
        instance._wheelPanLast = { x: event.clientX, y: event.clientY }
      },
      onDragEnd: () => { instance._wheelPanLast = null },
      onDragCancel: () => { instance._wheelPanLast = null },
      updateCursor: (style) => {
        if (instance.svg) {
          instance.svg.style.cursor = style
        }
      },
      // Restore whatever cursor the mode had, rather than forcing a crosshair
      cursorFor: (_kind, fallback) => (
        fallback === 'grabbing' ? 'grabbing' : (previousCursor || 'crosshair')
      )
    }, null)
  }
  return instance._wheelPanHandler
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
  const wheelPan = wheelPanHandler(instance)
  if (wheelPan.isDragging()) {
    wheelPan.handleMouseMove(null, event)
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
    wheelPanHandler(instance).startDrag(null, event)
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
  const wheelPan = wheelPanHandler(instance)
  if (wheelPan.isDragging()) {
    wheelPan.endDrag(null, event)
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
  wheelPanHandler(instance).cancelDrag()

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