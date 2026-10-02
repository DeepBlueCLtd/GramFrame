/**
 * Region zoom: Shift + left-drag a box to zoom into it (spec 170).
 *
 * A cross-mode navigation gesture, here for the same reason Ctrl+wheel, the
 * wheel pan and the middle-button pan are: `core/events.js` resolves it *ahead*
 * of mode delegation, so no part of the gesture — press, move or release — can
 * reach a mode and place, move or delete a feature (FR-002).
 *
 * The selection is transient by construction: its two corners live in the
 * module-private session below and nowhere else. Nothing is written to `state`,
 * so nothing is broadcast, stored or restored (FR-019); the only durable result
 * is a change to the zoom level and centre — or, on a player, to the time
 * window — through `core/viewport.js`.
 *
 * Two shapes of the design look arbitrary from the outside and are not:
 *
 * - **The box is free, and the view *contains* it.** Zoom is a single isotropic
 *   level plus a centre, so an arbitrary rectangle cannot become the view
 *   exactly. Rather than constrain the rubber band to the view's proportions —
 *   which made it lurch in width as the pointer moved down — the selection is
 *   drawn freely and the view is scaled by whichever axis is the tighter fit,
 *   showing more of the gram beside it. The overlay draws that resulting view
 *   as a second, dashed outline, so what-you-draw-is-what-you-get survives: one
 *   box is what you asked for, the other is what comes with it.
 * - **A release over the axis margins completes the zoom** (FR-011), where a
 *   feature drag would be cancelled. Selecting right up to the edge of a gram
 *   is a normal thing to want; a feature released off-image has no position.
 */

/// <reference path="../types.js" />

import { BaseDragHandler, hasActiveDrag } from '../modes/shared/BaseDragHandler.js'
import { screenToSVG } from '../utils/coordinates.js'
import { selectionBounds, withinBounds, selectionRect, containedView, rectToRegion } from '../utils/regionGeometry.js'
import { zoomToRegion, MIN_ZOOM, MAX_ZOOM } from './viewport.js'
import { createRegionOverlay, renderRegionOverlay } from '../rendering/regionOverlay.js'
import { isPlaying } from '../player/playerView.js'

/**
 * Pointer movement, in rendered pixels on both axes, below which the gesture is
 * a click rather than a selection (FR-008). Without it a stray Shift-click
 * zooms straight to the 10x cap.
 * @type {number}
 */
const CLICK_THRESHOLD_PX = 5

/**
 * Class put on the SVG while Shift is held over the gram, so the cursor can
 * advertise that a region selection is available (FR-021).
 *
 * A class rather than an inline `style.cursor`, because the active mode writes
 * that property on every mousemove: a stylesheet rule marked `!important`
 * outranks the mode's inline value whatever order the two run in, and needs no
 * save-and-restore bookkeeping when Shift is let go.
 * @type {string}
 */
const REGION_READY_CLASS = 'gram-frame-region-ready'

/**
 * The zoom range the resulting-view preview is capped by, so the overlay shows
 * the 10x cap arriving rather than springing it on release.
 * @type {{min: number, max: number}}
 */
const ZOOM_LIMITS = { min: MIN_ZOOM, max: MAX_ZOOM }

/**
 * One instance's in-progress selection.
 * @typedef {Object} RegionSession
 * @property {BaseDragHandler} handler - The drag engine entry this gesture runs on
 * @property {SVGCoordinates} start - Where the drag began, in SVG units
 * @property {SVGCoordinates} current - Where the pointer is now, in SVG units
 * @property {SVGGElement|null} overlay - The rectangle, dimming and readout, while drawn
 */

/**
 * Per-instance selection sessions. Not `state`: a selection must not outlive
 * the mouse button (FR-019), and must belong to the instance under the pointer
 * and no other (FR-020).
 * @type {WeakMap<object, RegionSession>}
 */
const sessions = new WeakMap()

/**
 * The viewport bundle the canonical coordinate module takes.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {GramFrameState} The instance's state
 */
function viewportOf(instance) {
  return instance.state
}

/**
 * Where a pointer event lands, in SVG units.
 * @param {GramFrame} instance - GramFrame instance
 * @param {MouseEvent} event - The pointer event
 * @returns {SVGCoordinates} Point in SVG space
 */
function svgPointOf(instance, event) {
  const svg = instance.ui.svg
  const rect = svg.getBoundingClientRect()
  return screenToSVG(event.clientX - rect.left, event.clientY - rect.top, svg)
}

/**
 * Draw the rectangle, the dimmed surround and the span readout for the current
 * pointer position (FR-003 – FR-005).
 * @param {GramFrame} instance - GramFrame instance
 * @param {RegionSession} session - The selection in progress
 */
function drawSelection(instance, session) {
  if (!session.overlay) {
    return
  }
  const bounds = boundsFor(instance)
  const rect = selectionRect(bounds, session.start, session.current)
  const { freqSpan, timeSpan } = regionOf(instance, rect)
  const view = containedView(viewportOf(instance), bounds, rect, ZOOM_LIMITS)
  renderRegionOverlay(session.overlay, { rect, view, bounds, freqSpan, timeSpan })
}

/**
 * The selectable area for an instance.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {{left: number, top: number, right: number, bottom: number}} Bounds in SVG units
 */
function boundsFor(instance) {
  return selectionBounds(viewportOf(instance), instance.ui.spectrogramImage)
}

/**
 * The image-space region and data span a drawn rectangle describes.
 * @param {GramFrame} instance - GramFrame instance
 * @param {{x: number, y: number, width: number, height: number}} rect - Rectangle in SVG units
 * @returns {{region: {x: number, y: number, width: number, height: number}, freqSpan: number, timeSpan: number}} Region and span
 */
function regionOf(instance, rect) {
  return rectToRegion(viewportOf(instance), instance.ui.spectrogramImage, rect)
}

/**
 * Remove the overlay and the cursor hint. Called on release and on every
 * cancellation path alike, so no selection is ever left stranded on screen.
 * @param {GramFrame} instance - GramFrame instance
 * @param {RegionSession} session - The selection being torn down
 */
function teardown(instance, session) {
  if (session.overlay && session.overlay.parentNode) {
    session.overlay.parentNode.removeChild(session.overlay)
  }
  session.overlay = null
  setRegionHint(instance, false)
}

/**
 * Apply the finished selection: zoom to it, unless the pointer barely moved.
 * @param {GramFrame} instance - GramFrame instance
 * @param {RegionSession} session - The selection being released
 */
function finishSelection(instance, session) {
  const rect = selectionRect(boundsFor(instance), session.start, session.current)
  teardown(instance, session)
  // Below the threshold this was a click, not a selection: leave both the view
  // and the annotations exactly as they were (FR-008).
  if (Math.abs(rect.movedX) < CLICK_THRESHOLD_PX && Math.abs(rect.movedY) < CLICK_THRESHOLD_PX) {
    return
  }
  zoomToRegion(instance, regionOf(instance, rect).region)
}

/**
 * The session for an instance, created on first use.
 *
 * The handler is a `BaseDragHandler` so this gesture inherits the engine's
 * one-drag-per-instance rule and its cancellation points — Escape and the
 * pointer leaving the component both reach `cancelActiveDrag`, which unwinds
 * whichever drag is running (FR-009, FR-010).
 * @param {GramFrame} instance - GramFrame instance
 * @returns {RegionSession} The instance's session
 */
function sessionFor(instance) {
  const existing = sessions.get(instance)
  if (existing) {
    return existing
  }
  const origin = { x: 0, y: 0 }
  // The callbacks close over `created`, which exists by the time any of them
  // runs — the alternative is a session field typed as a handler and holding
  // null until the constructor returns.
  /** @type {RegionSession} */
  const created = {
    handler: new BaseDragHandler(instance, {
      resolveTarget: () => ({ kind: 'region', id: null, type: null }),
      onDragStart: () => {
        created.overlay = instance.ui.svg.appendChild(createRegionOverlay())
        setRegionHint(instance, true)
        drawSelection(instance, created)
      },
      onDragMove: () => drawSelection(instance, created),
      onDragEnd: () => finishSelection(instance, created),
      onDragCancel: () => teardown(instance, created)
    }, null),
    start: origin,
    current: origin,
    overlay: null
  }
  sessions.set(instance, created)
  return created
}

/**
 * Show or hide the "a region selection is available here" cursor.
 * @param {GramFrame} instance - GramFrame instance
 * @param {boolean} ready - Whether the gesture is available under the pointer
 */
function setRegionHint(instance, ready) {
  if (instance.ui.svg) {
    instance.ui.svg.classList.toggle(REGION_READY_CLASS, ready)
  }
}

/**
 * Whether a region selection is being drawn on this instance right now.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {boolean} True while the box is being dragged
 */
function isSelectingRegion(instance) {
  const session = sessions.get(instance)
  return !!(session && session.handler.isDragging())
}

/**
 * Begin a region selection, if this mousedown asks for one (FR-001).
 *
 * Called from `core/events.js` ahead of mode delegation, after that module's
 * own guards have established that this is a left-button press on a gram that
 * is not playing and has no other drag running.
 * @param {GramFrame} instance - GramFrame instance
 * @param {MouseEvent} event - The mousedown
 * @returns {boolean} True when a selection started and the event is spent
 */
export function startRegionSelection(instance, event) {
  const point = svgPointOf(instance, event)
  if (!withinBounds(point, boundsFor(instance))) {
    return false // Started on the axes or the chrome: not ours
  }
  const session = sessionFor(instance)
  session.start = point
  session.current = point
  if (!session.handler.startDrag(null, event)) {
    return false
  }
  event.preventDefault() // No text selection while the box is dragged
  return true
}

/**
 * Update an in-progress selection, or offer the cursor hint when Shift is held.
 * @param {GramFrame} instance - GramFrame instance
 * @param {MouseEvent} event - The mousemove
 * @returns {boolean} True when a selection consumed the event
 */
export function handleRegionPointerMove(instance, event) {
  if (isSelectingRegion(instance)) {
    const session = /** @type {RegionSession} */ (sessions.get(instance))
    session.current = svgPointOf(instance, event)
    drawSelection(instance, session)
    return true
  }
  // Short-circuited on `shiftKey`, so the resting path — this runs on every
  // mousemove — does no extra geometry. Never offered while the recording
  // plays, where the gesture is inert (FR-012) and the cursor would lie.
  setRegionHint(instance, event.shiftKey && !hasActiveDrag(instance) && !isPlaying(instance) &&
    withinBounds(svgPointOf(instance, event), boundsFor(instance)))
  return false
}

/**
 * Complete a region selection on release (FR-006), wherever in the component
 * the pointer happens to be (FR-011).
 * @param {GramFrame} instance - GramFrame instance
 * @param {MouseEvent} event - The mouseup
 * @returns {boolean} True when a selection consumed the event
 */
export function finishRegionSelection(instance, event) {
  if (!isSelectingRegion(instance)) {
    return false
  }
  const session = /** @type {RegionSession} */ (sessions.get(instance))
  session.current = svgPointOf(instance, event)
  session.handler.endDrag(null, event)
  return true
}
