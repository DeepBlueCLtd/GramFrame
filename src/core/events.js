/**
 * Event handling for GramFrame component
 */

/// <reference path="../types.js" />

import { screenToDataWithZoom, acceptsOffImageDrag, unboundedDataCoords } from './pointerScope.js'
import { hasActiveDrag, cancelActiveDrag } from '../modes/shared/BaseDragHandler.js'
import { dispatch } from './state.js'
import { updateUniversalCursorReadouts } from '../components/MainUI.js'
import { setFocusedInstance } from './FocusManager.js'
import { zoomAtImagePoint, pixelDeltaToNormalizedPan, panByNormalized, isZoomedIn } from './viewport.js'
import { isPlaying, isPlayerActive, seekFromTimeAxisClick } from '../player/playerView.js'
import { startRegionSelection, handleRegionPointerMove, finishRegionSelection } from './regionZoom.js'
import { startDragSeek, endDragSeek, isDragSeeking } from '../player/dragSeek.js'
import { wheelPanHandler } from './wheelPan.js'

/**
 * Per-notch multiplicative zoom factor for Ctrl+wheel zoom (smoother than the
 * ×1.5 button step).
 * @type {number}
 */
const WHEEL_ZOOM_STEP = 1.2

/**
 * Handle mouse-wheel events on the SVG: Ctrl+scroll zooms around the pointer,
 * plain scroll pans horizontally along frequency (only when zoomed in). Works in
 * every mode. Does nothing (and lets the page scroll) when the pointer is not over
 * the spectrogram image, or on a plain scroll while not zoomed in.
 * @param {GramFrame} instance - GramFrame instance
 * @param {WheelEvent} event - Wheel event
 */
function handleWheel(instance, event) {
  // Zooming while the recording plays is deliberate (spec 171, FR-018): the
  // follow loop keeps the playhead at the top edge, so the analyst is choosing
  // how much history to see rather than moving the view off the audio.
  const result = screenToDataWithZoom(instance, event)
  if (!result) {
    return // Not over the spectrogram image - leave the page scroll alone
  }

  if (event.ctrlKey) {
    // Zoom around the pointer. Scroll up/away (deltaY < 0) zooms in.
    const factor = event.deltaY < 0 ? WHEEL_ZOOM_STEP : 1 / WHEEL_ZOOM_STEP
    zoomAtImagePoint(instance, factor, result.imageX, result.imageY)
    event.preventDefault() // Always consume the zoom gesture
  } else if (isZoomedIn(instance)) {
    // Horizontal pan: map vertical wheel delta to frequency panning.
    // Scroll down (deltaY > 0) moves forward in frequency.
    const { normalizedDeltaX } = pixelDeltaToNormalizedPan(instance, -event.deltaY, 0)
    panByNormalized(instance, normalizedDeltaX, 0)
    event.preventDefault()
  }
  // else: not zoomed in - nothing to pan; allow the page to scroll normally.
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
  if (instance.ui.svg) {
    // Mouse move for cursor tracking
    listen(instance.ui.svg, 'mousemove', (event) => {
      handleMouseMove(instance, /** @type {MouseEvent} */ (event))
    })

    // Mouse down for starting drag operations
    listen(instance.ui.svg, 'mousedown', (event) => {
      handleMouseDown(instance, /** @type {MouseEvent} */ (event))
    })

    // Mouse up for ending drag operations
    listen(instance.ui.svg, 'mouseup', (event) => {
      handleMouseUp(instance, /** @type {MouseEvent} */ (event))
    })

    // Mouse leave to clear cursor position
    listen(instance.ui.svg, 'mouseleave', () => {
      handleMouseLeave(instance)
    })

    // Context menu (right-click) for reset operations
    listen(instance.ui.svg, 'contextmenu', (event) => {
      handleContextMenu(instance, /** @type {MouseEvent} */ (event))
    })

    // Mouse wheel for global zoom (Ctrl+scroll) and horizontal pan (scroll).
    // passive:false so the handler can preventDefault() to stop the host page
    // from scrolling during a zoom/pan gesture.
    listen(instance.ui.svg, 'wheel', (event) => {
      handleWheel(instance, /** @type {WheelEvent} */ (event))
    }, { passive: false })
  }

  // Bind resize handler
  instance.viewport._boundHandleResize = () => {
    if (instance._handleResize) {
      instance._handleResize()
    }
  }

  // Mode button events
  Object.keys(instance.ui.modeButtons || {}).forEach(mode => {
    const button = instance.ui.modeButtons[mode]
    if (button) {
      listen(button, 'click', () => {
        instance._switchMode(/** @type {ModeType} */ (mode))
      })
    }
  })

  // Frequency-rate input UI events removed - the backend frequencyRate is preserved

  // Window resize event
  listen(window, 'resize', instance.viewport._boundHandleResize)

  instance.interaction._registeredListeners = registered
}

/**
 * Set up ResizeObserver to monitor container dimensions
 * @param {GramFrame} instance - GramFrame instance
 */
export function setupResizeObserver(instance) {
  // Use ResizeObserver to monitor SVG container dimensions
  if (typeof ResizeObserver !== 'undefined') {
    instance.viewport.resizeObserver = new ResizeObserver(_entries => {
      // Trigger resize handling
      if (instance._handleResize) {
        instance._handleResize()
      }
    })
    instance.viewport.resizeObserver.observe(instance.ui.container)
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

  // A region selection owns the pointer while it is being drawn, and offers its
  // cursor hint when Shift is held (spec 170, FR-003, FR-021). Ahead of the
  // readouts because it stays live over the axis margins, where they cannot.
  if (handleRegionPointerMove(instance, event)) {
    return
  }

  const { state } = instance
  const result = screenToDataWithZoom(instance, event)

  if (result) {
    const { svgCoords, imageX, imageY, dataCoords } = result

    // Update cursor position in state (one rect read — this is the hot path)
    const svgRect = instance.ui.svg.getBoundingClientRect()
    state.cursorPosition = {
      x: event.clientX - svgRect.left,
      y: event.clientY - svgRect.top,
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
    // Clear cursor position if outside image bounds: there is no reading to
    // show for a pointer that is not over the gram.
    state.cursorPosition = null

    // A pan already under way keeps following the pointer out there, though —
    // it is moving the view, not measuring anything (see `acceptsOffImageDrag`).
    if (acceptsOffImageDrag(instance) && instance.currentMode &&
        typeof instance.currentMode.handleMouseMove === 'function') {
      instance.currentMode.handleMouseMove(event, unboundedDataCoords(instance, event))
    }
  }

  // No feature re-render here (H3): persistent features do not change on
  // hover. Every path that DOES change them — drags, zoom, pan, resize,
  // add/remove/restyle — re-renders through FeatureRenderer itself, so the
  // full SVG teardown/rebuild this used to do per mousemove was pure waste.

  // Notify listeners of cursor position change
  dispatch(instance, { frame: true })
}

/**
 * Handle mouse down events on SVG
 * @param {GramFrame} instance - GramFrame instance
 * @param {MouseEvent} event - Mouse event
 */
function handleMouseDown(instance, event) {
  // Set focus when user interacts with this instance
  setFocusedInstance(instance)

  // A click on the time axis of an audio-sourced gram seeks there
  // (spec 168, FR-020), whether playing or paused: it is a transport action,
  // not an annotation one.
  if (event.button === 0 && isPlayerActive(instance) && seekFromTimeAxisClick(instance, event)) {
    event.preventDefault()
    return
  }

  // A press on a playing gram is a drag-seek: playback pauses under the hand
  // and resumes where the view is released (spec 171, FR-015). Anything else a
  // pointer could do while playing — placing, moving, deleting — stays inert
  // (FR-017), and is stopped here so no mode has to know about the player.
  if (isPlaying(instance)) {
    startDragSeek(instance, event)
    return
  }

  // Middle (wheel) button starts a global pan and is never delegated to a mode,
  // so it can never place a cursor/marker/harmonic/doppler point.
  if (event.button === 1) {
    event.preventDefault() // Suppress browser middle-click autoscroll
    wheelPanHandler(instance).startDrag(null, event)
    return
  }

  // Only the left button starts mode interactions. Right mousedown used to
  // reach the modes — starting a pan the context menu then wedged (BH-7), or a
  // doppler placement (BH-31); right-click behaviour belongs to contextmenu.
  if (event.button !== 0) {
    return
  }

  // While a drag is active (e.g. a middle-button pan), a second mousedown must
  // not reach the mode: the engine would refuse it (D4), and a mode that
  // treats "refused" as "no target here" mints a spurious feature (BH-4).
  if (hasActiveDrag(instance)) {
    return
  }

  // Shift + left-drag selects a region to zoom to, in every mode (spec 170,
  // FR-001). Resolved here, so it never reaches a mode (FR-002).
  if (event.shiftKey && startRegionSelection(instance, event)) {
    return
  }

  const result = screenToDataWithZoom(instance, event)
  // A pan on an audio-sourced gram starts anywhere in the component, including
  // the blank above the recording's start: that blank is where the analyst has
  // to press to drag the opening seconds up to the playhead.
  const dataCoords = result ? result.dataCoords
    : (acceptsOffImageDrag(instance) ? unboundedDataCoords(instance, event) : null)

  if (dataCoords) {
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
  // End a wheel-button drag pan without delegating to the mode — but only on
  // the release of the button that started it. Releasing the LEFT button
  // mid-pan used to end the pan (and a middle release used to end a left-drag
  // at the wrong moment): a mouseup only concludes its own button's drag (BH-12).
  const wheelPan = wheelPanHandler(instance)
  if (wheelPan.isDragging()) {
    if (event.button === 1) {
      wheelPan.endDrag(null, event)
    }
    return
  }

  // Mode drags are started by the left button only (see handleMouseDown), so
  // only a left-button release may end one (BH-12).
  if (event.button !== 0) {
    return
  }

  // The window-level release ends a drag-seek (spec 171, FR-016); the SVG's
  // own copy of that release must not go on to reach a mode.
  if (isPlaying(instance) || isDragSeeking(instance)) {
    return
  }

  // A release anywhere in the component completes a region selection, including
  // over the axis margins, where a feature drag would be cancelled (FR-011).
  if (finishRegionSelection(instance, event)) {
    return
  }

  const result = screenToDataWithZoom(instance, event)
  const upCoords = result ? result.dataCoords
    : (acceptsOffImageDrag(instance) ? unboundedDataCoords(instance, event) : null)

  if (upCoords) {
    // Delegate to current mode for mode-specific handling
    if (instance.currentMode && typeof instance.currentMode.handleMouseUp === 'function') {
      instance.currentMode.handleMouseUp(event, upCoords)
    }
  } else if (hasActiveDrag(instance)) {
    // Released off-image (over the axis margins or component chrome) while a
    // drag was running. Without this, the engine still reported `isDragging`
    // and the feature chased the cursor, buttonless, when the pointer
    // re-entered — the drag-engine contract promises cancellation here (H2).
    cancelActiveDrag(instance)
  }
}

/**
 * Handle mouse leave events on SVG
 * @param {GramFrame} instance - GramFrame instance
 */
function handleMouseLeave(instance) {
  // Cancel whichever drag is running — wheel-pan, feature move, create or
  // placement alike. Feature drags used to survive the pointer leaving the
  // SVG, resuming buttonless when it re-entered (H2).
  cancelActiveDrag(instance)

  // Clear cursor position
  instance.state.cursorPosition = null

  // Delegate to current mode
  if (instance.currentMode && typeof instance.currentMode.handleMouseLeave === 'function') {
    instance.currentMode.handleMouseLeave()
  }

  // Notify listeners
  dispatch(instance, { frame: true })
}

/**
 * Handle context menu (right-click) events on SVG
 * @param {GramFrame} instance - GramFrame instance
 * @param {MouseEvent} event - Mouse event
 */
function handleContextMenu(instance, event) {
  // No context menu during a drag. Letting it open swallowed the mouseup and
  // left the dragged feature glued to the cursor (BH-11), and Analysis's
  // delete-on-right-click was a guaranteed hit on the marker being dragged —
  // deleting it mid-drag (BH-10).
  if (hasActiveDrag(instance)) {
    event.preventDefault()
    return
  }

  if (isPlaying(instance)) {
    return // Deleting is an annotation action; inert while playing (spec 168, FR-013)
  }

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
  // A drag-seek in flight owns two window listeners of its own; abandoned
  // rather than resumed, since the instance is going away.
  endDragSeek(instance, false)

  // Remove every listener registered in setupEventListeners — SVG, mode
  // buttons and the window resize handler alike.
  const registered = instance.interaction._registeredListeners || []
  registered.forEach(({ target, type, handler, options }) => {
    target.removeEventListener(type, handler, options)
  })
  instance.interaction._registeredListeners = []

  // Clean up ResizeObserver
  if (instance.viewport.resizeObserver) {
    instance.viewport.resizeObserver.disconnect()
    instance.viewport.resizeObserver = null
  }
}