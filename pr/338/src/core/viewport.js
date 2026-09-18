/**
 * Zoom and pan for the spectrogram viewport: the levels, the centres, and the
 * conversions between them. It decides transforms; `components/svgLayout.js`
 * applies them.
 */

/// <reference path="../types.js" />

import { applyZoomTransform, updateSVGLayout } from '../components/svgLayout.js'
import { renderAxes } from '../rendering/axes.js'
import { updateCommandButtonStates, updateModeButtonStates } from '../components/ModeButtons.js'
import { dispatch } from './state.js'
import { screenToSVG, imageToData, getRenderDimensions } from '../utils/coordinates.js'
import { anchorHoldingPoint, anchorForCentre, viewCentre } from '../utils/zoomAnchor.js'
import { refreshExpandedLayout } from '../components/ExpandToggle.js'
import { isPlayerActive, clampViewTop, visibleWindowSeconds } from '../player/playerView.js'

/** The zoom range the view is held within. Every zoom path clamps to it. */
export const MIN_ZOOM = 1.0
export const MAX_ZOOM = 10.0

/**
 * The current zoom level. One reader, rather than the five copies of
 * `instance.state.zoom.level` that had accumulated across this module,
 * `core/events.js` and `PanMode`.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {number} Zoom level, 1.0 when not zoomed
 */
export function zoomLevel(instance) {
  return instance.state.zoom.level
}

/**
 * Whether the view is zoomed in, and so has something to pan.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {boolean} True above 1x
 */
export function isZoomedIn(instance) {
  return zoomLevel(instance) > MIN_ZOOM
}

/**
 * Zoom in one step.
 * @param {GramFrame} instance - GramFrame instance
 */
export function zoomIn(instance) {
  zoomAboutViewCentre(instance, Math.min(zoomLevel(instance) * 1.5, MAX_ZOOM))
}

/**
 * Zoom out one step.
 * @param {GramFrame} instance - GramFrame instance
 */
export function zoomOut(instance) {
  zoomAboutViewCentre(instance, Math.max(zoomLevel(instance) / 1.5, MIN_ZOOM))
}

/**
 * Change the zoom level keeping the centre of the view where it is — what the
 * `+`/`−` buttons do, having no pointer on the gram to follow. The centre is
 * read off the current anchor and re-solved into an anchor for the new level;
 * passing `zoom.centerX/Y` through unchanged held the *anchor* still instead,
 * letting the middle creep towards it press by press.
 *
 * For an audio-sourced gram the vertical position is a time, not a centre
 * fraction (spec 168, D7): the time at the middle of the view is held and the
 * top edge recomputed from the new window height (D11).
 * @param {GramFrame} instance - GramFrame instance
 * @param {number} newLevel - Target zoom level
 */
function zoomAboutViewCentre(instance, newLevel) {
  const { zoom, player } = instance.state
  // What is in the middle of the view now, before the level changes under it.
  const centreX = viewCentre(zoom.centerX, zoom.level)
  const centreY = viewCentre(zoom.centerY, zoom.level)

  if (isPlayerActive(instance)) {
    const centreTime = player.viewTop - visibleWindowSeconds(instance) / 2
    zoom.level = newLevel
    player.viewTop = clampViewTop(instance, centreTime + visibleWindowSeconds(instance) / 2)
  }

  // At 1x the whole image is visible, so the centre positions nothing -- but it
  // is still state, and the next zoom-in reads it back. Keeping a corner centre
  // here is what made `-` to 1x then `+` jump to wherever the wheel last zoomed
  // into. `fitView` is the one recentring rule, on every path (issue #270).
  if (newLevel <= MIN_ZOOM) {
    fitView(instance)
    return
  }

  // A player's vertical position is `viewTop`, set above; its anchor stays 0.5.
  const anchorY = isPlayerActive(instance) ? 0.5 : anchorForCentre(centreY, newLevel)
  setZoom(instance, newLevel, anchorForCentre(centreX, newLevel), anchorY)
}

/**
 * Set zoom level and center point
 * @param {GramFrame} instance - GramFrame instance
 * @param {number} level - Zoom level (1.0 = no zoom)
 * @param {number} centerX - Center X (0-1 normalized)
 * @param {number} centerY - Center Y (0-1 normalized)
 */
export function setZoom(instance, level, centerX, centerY) {
  const zoom = instance.state.zoom
  zoom.level = level
  zoom.centerX = centerX
  zoom.centerY = centerY

  if (instance.ui.svg) {
    applyZoomTransform(instance)
  }
  updateZoomControlStates(instance)
  dispatch(instance, { frame: true })
}

/**
 * Convert a screen-pixel delta into a normalized centre delta, accounting for the
 * render size, the SVG element's on-screen scale, and the current zoom level. The
 * result is negated so the image content follows the drag direction. This is the
 * exact conversion the Pan-mode drag uses; it is shared so wheel-pan and drag-pan
 * can never diverge.
 * @param {GramFrame} instance - GramFrame instance
 * @param {number} dxPx - Horizontal delta in screen pixels
 * @param {number} dyPx - Vertical delta in screen pixels
 * @returns {{ normalizedDeltaX: number, normalizedDeltaY: number }} Normalized centre delta
 */
export function pixelDeltaToNormalizedPan(instance, dxPx, dyPx) {
  const imageDetails = instance.state.imageDetails
  const { naturalWidth, naturalHeight } = imageDetails
  // Base render size (defaults to natural; grows when expanded)
  const renderWidth = imageDetails.renderWidth || naturalWidth
  const renderHeight = imageDetails.renderHeight || naturalHeight

  // Screen pixels to SVG units, via the canonical module. The transform is
  // affine, so converting the delta means converting both ends and taking the
  // difference. Reading the live viewBox this way is what stops this becoming a
  // fifth place that re-derives the screen scale (FR-002).
  const origin = screenToSVG(0, 0, instance.ui.svg)
  const shifted = screenToSVG(dxPx, dyPx, instance.ui.svg)
  const svgDeltaX = shifted.x - origin.x
  const svgDeltaY = shifted.y - origin.y

  // Convert to normalized coordinates (adjust for zoom level); negate so content
  // follows the drag.
  const level = zoomLevel(instance)
  return {
    normalizedDeltaX: -(svgDeltaX / renderWidth) / level,
    normalizedDeltaY: -(svgDeltaY / renderHeight) / level
  }
}

/**
 * Pan the view by a normalized centre delta, clamped to the data edges. No-op when
 * not zoomed in (there is nothing off-screen to reveal).
 * @param {GramFrame} instance - GramFrame instance
 * @param {number} deltaX - Change in centre X (normalized)
 * @param {number} deltaY - Change in centre Y (normalized)
 */
export function panByNormalized(instance, deltaX, deltaY) {
  const { zoom, player } = instance.state
  if (isPlayerActive(instance)) {
    // Vertically the view is a time window: a normalised delta of the render
    // height is `window-seconds`, at any zoom level, and the clamp keeps the
    // window inside what has been played (spec 168, FR-016). Horizontally the
    // frequency axis pans as an image does, once zoomed in.
    //
    // `deltaY` is a centre delta in image-pixel space, where y runs downwards;
    // time runs *upwards* (the newest frame is the top row), so moving the
    // centre up the image — a negative `deltaY` — moves `viewTop` later. Hence
    // the negation: without it a downward drag scrolled back in time while the
    // content moved up, the opposite of every other axis (issue #286).
    player.viewTop = clampViewTop(instance, player.viewTop - deltaY * player.windowSeconds)
    const newCenterX = zoom.level > 1.0 ? Math.max(0, Math.min(1, zoom.centerX + deltaX)) : zoom.centerX
    setZoom(instance, zoom.level, newCenterX, zoom.centerY)
    return
  }
  if (zoom.level <= 1.0) {
    return // No panning when not zoomed
  }
  const newCenterX = Math.max(0, Math.min(1, zoom.centerX + deltaX))
  const newCenterY = Math.max(0, Math.min(1, zoom.centerY + deltaY))
  setZoom(instance, zoom.level, newCenterX, newCenterY)
}

/**
 * Zoom by a multiplicative factor about a point in image render-pixel space
 * (the `imageX`/`imageY` of the events coordinate helper) — the wheel zoom,
 * where that point is the gram under the pointer and the whole purpose is that
 * it does not move.
 *
 * Holding it still is a solve for the anchor ({@link anchorHoldingPoint}), not
 * an assignment to it: `centerX/Y` is the point kept at its *unzoomed* screen
 * position, so assigning the pointer's point snapped it back there — right from
 * 1×, a lurch on every notch after. At the gram's edge the clamp wins and the
 * point drifts, rather than blank space showing beside it.
 *
 * Clamped to the 1.0-10.0 range; a no-op at the limit. Level 1 recentres.
 * @param {GramFrame} instance - GramFrame instance
 * @param {number} factor - Multiplicative zoom factor (>1 zooms in, <1 zooms out)
 * @param {number} imageX - Pointer X in render-pixel space (0..renderWidth)
 * @param {number} imageY - Pointer Y in render-pixel space (0..renderHeight)
 */
export function zoomAtImagePoint(instance, factor, imageX, imageY) {
  const state = instance.state
  const { zoom, player } = state
  const currentLevel = zoom.level
  const newLevel = Math.max(MIN_ZOOM, Math.min(currentLevel * factor, MAX_ZOOM))
  if (newLevel === currentLevel) {
    return // Already at the min/max limit
  }
  const { renderWidth, renderHeight } = getRenderDimensions(state)

  if (isPlayerActive(instance)) {
    // Hold the time under the pointer at the same fraction of the view while
    // the window's height in seconds changes (spec 168, D11).
    const pointerTime = imageToData(imageX, imageY, state).time
    const fraction = (player.viewTop - pointerTime) / visibleWindowSeconds(instance)
    zoom.level = newLevel
    player.viewTop = clampViewTop(instance, pointerTime + fraction * visibleWindowSeconds(instance))
    setZoom(instance, newLevel, anchorHoldingPoint(imageX / renderWidth, zoom.centerX, currentLevel, newLevel), 0.5)
    return
  }

  if (newLevel <= MIN_ZOOM) {
    fitView(instance)
    return
  }
  setZoom(
    instance,
    newLevel,
    anchorHoldingPoint(imageX / renderWidth, zoom.centerX, currentLevel, newLevel),
    anchorHoldingPoint(imageY / renderHeight, zoom.centerY, currentLevel, newLevel)
  )
}

/**
 * Zoom so a selected region of the gram is centred and wholly visible
 * (spec 170, FR-006).
 *
 * The region arrives in image render-pixel space, in whatever proportions the
 * analyst drew. Zoom is one isotropic level, so the level is the *smaller* of
 * what each axis would need — `contain` — and the slack axis then shows more of
 * the gram than was framed, beside the selection or above and below it. The
 * larger factor (`cover`) would crop away part of what was deliberately
 * selected, the wrong way for a measurement tool to fail.
 *
 * `zoom.centerX/centerY` are not the view's centre but its *anchor* — the image
 * point that keeps its unzoomed screen position through the transform — so
 * centring the selection means solving for it, as {@link anchorForCentre} does.
 * @param {GramFrame} instance - GramFrame instance
 * @param {{x: number, y: number, width: number, height: number}} region - Region in image render pixels
 */
export function zoomToRegion(instance, region) {
  const state = instance.state
  const { zoom, player } = state
  const { renderWidth, renderHeight } = getRenderDimensions(state)
  if (!(region.width > 0) || !(region.height > 0)) {
    return
  }

  const centreX = (region.x + region.width / 2) / renderWidth
  // The tighter axis wins, and the result is clamped rather than refused: a
  // selection finer than 10x shows more than was drawn (FR-007).
  const across = renderWidth / region.width

  if (isPlayerActive(instance)) {
    // Vertically a player's view is a time window rather than a fraction of an
    // image (spec 168, D7), so its magnification is a ratio of seconds: the
    // window it would take to hold the selection's own span.
    const topTime = imageToData(0, region.y, state).time
    const bottomTime = imageToData(0, region.y + region.height, state).time
    const seconds = topTime - bottomTime
    const through = seconds > 0 ? player.windowSeconds / seconds : across
    const level = Math.max(MIN_ZOOM, Math.min(across, through, MAX_ZOOM))

    // Hold the selection's mid-time at the middle of the new window; the clamp
    // keeps unplayed time out of view (FR-013).
    zoom.level = level
    player.viewTop = clampViewTop(instance, (topTime + bottomTime) / 2 + visibleWindowSeconds(instance) / 2)
    setZoom(instance, level, anchorForCentre(centreX, level), 0.5)
    return
  }

  const level = Math.max(MIN_ZOOM, Math.min(across, renderHeight / region.height, MAX_ZOOM))
  const centreY = (region.y + region.height / 2) / renderHeight
  setZoom(instance, level, anchorForCentre(centreX, level), anchorForCentre(centreY, level))
}


/**
 * Show the whole gram again: the Fit button (spec 170, FR-014), and the
 * recentring `zoomAtImagePoint` and `zoomAboutViewCentre` both do when a
 * zoom-out lands back at 1× — one rule on every path (issue #270). It was a
 * separate private `zoomReset` until the merge bringing #270 in showed the two
 * were the same function bar the player clamp.
 *
 * On an audio-sourced gram "the whole gram" is the configured `window-seconds`
 * window, not the whole recording, so this returns to 1x and leaves the window
 * where it is, re-clamped (AS-3.3).
 * @param {GramFrame} instance - GramFrame instance
 */
export function fitView(instance) {
  const { zoom, player } = instance.state
  if (isPlayerActive(instance)) {
    zoom.level = MIN_ZOOM
    player.viewTop = clampViewTop(instance, player.viewTop)
  }
  setZoom(instance, MIN_ZOOM, 0.5, 0.5)
}

/**
 * Update zoom control button states based on current zoom level. Module-private
 * since the dead `_setFrequencyRate`/`_updateAxes`/`_updateZoomControlStates` forwarder
 * chain in main.js was deleted (L1): its only caller is `setZoom` above.
 * @param {GramFrame} instance - GramFrame instance
 */
function updateZoomControlStates(instance) {
  if (instance.ui.commandButtons && instance.modes) {
    updateCommandButtonStates(instance.ui.commandButtons, instance.modes)
  }
  if (instance.ui.modeButtons && instance.modes) {
    updateModeButtonStates(instance.ui.modeButtons, instance.modes)

    // Leave pan mode if the zoom change has just disabled it.
    const { mode, previousMode } = instance.state
    if (mode === 'pan' && instance.modes.pan && !instance.modes.pan.isEnabled() && previousMode) {
      instance._switchMode(previousMode)
    }
  }
}

/**
 * Handle resize events
 * @param {GramFrame} instance - GramFrame instance
 */
export function handleResize(instance) {
  if (instance.ui.svg) {
    // When expanded, recompute the available space so the image keeps filling it.
    refreshExpandedLayout(instance)
    updateSVGLayout(instance)
    renderAxes(instance)
    // Keep persistent features locked to their data coordinates after relayout.
    if (instance.featureRenderer) {
      instance.featureRenderer.renderAllPersistentFeatures()
    }
  }
}
