/**
 * Viewport module for GramFrame
 * 
 * This module handles zoom and pan functionality for the spectrogram viewport,
 * including coordinate transformations and zoom state management.
 */

/// <reference path="../types.js" />

import { applyZoomTransform, updateSVGLayout } from '../components/svgLayout.js'
import { renderAxes } from '../rendering/axes.js'
import { updateCommandButtonStates, updateModeButtonStates } from '../components/ModeButtons.js'
import { dispatch } from './state.js'
import { screenToSVG, imageToData, getRenderDimensions } from '../utils/coordinates.js'
import { refreshExpandedLayout } from '../components/ExpandToggle.js'
import { isPlayerActive, clampViewTop, visibleWindowSeconds } from '../player/playerView.js'

/** The zoom range the view is held within. Region zoom clamps to it like every other path. */
const MIN_ZOOM = 1.0
const MAX_ZOOM = 10.0

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
 * Zoom in by increasing zoom level
 * @param {GramFrame} instance - GramFrame instance
 */
export function zoomIn(instance) {
  zoomAboutViewCentre(instance, Math.min(zoomLevel(instance) * 1.5, MAX_ZOOM))
}

/**
 * Zoom out by decreasing zoom level
 * @param {GramFrame} instance - GramFrame instance
 */
export function zoomOut(instance) {
  zoomAboutViewCentre(instance, Math.max(zoomLevel(instance) / 1.5, MIN_ZOOM))
}

/**
 * Change the zoom level keeping the centre of the view where it is.
 *
 * For an image the centre is `zoom.centerX/Y`, which `setZoom` already keeps.
 * For an audio-sourced gram the vertical position is a time, not a centre
 * fraction (spec 168, D7): the time at the middle of the view is held and the
 * top edge recomputed from the new window height (D11).
 * @param {GramFrame} instance - GramFrame instance
 * @param {number} newLevel - Target zoom level
 */
function zoomAboutViewCentre(instance, newLevel) {
  const { zoom, player } = instance.state
  if (isPlayerActive(instance)) {
    const centreTime = player.viewTop - visibleWindowSeconds(instance) / 2
    zoom.level = newLevel
    player.viewTop = clampViewTop(instance, centreTime + visibleWindowSeconds(instance) / 2)
  }
  setZoom(instance, newLevel, zoom.centerX, zoom.centerY)
}

/**
 * Reset zoom to 1x, from `zoomAtImagePoint` when a zoom-out lands back at 1×.
 * Module-private since spec 167; `fitView` below is the exported way out for
 * callers elsewhere, and on a player it does the extra work a reset needs.
 * @param {GramFrame} instance - GramFrame instance
 */
function zoomReset(instance) {
  setZoom(instance, MIN_ZOOM, 0.5, 0.5)
}

/**
 * Set zoom level and center point
 * @param {GramFrame} instance - GramFrame instance
 * @param {number} level - Zoom level (1.0 = no zoom)
 * @param {number} centerX - Center X (0-1 normalized)
 * @param {number} centerY - Center Y (0-1 normalized)
 */
export function setZoom(instance, level, centerX, centerY) {
  // Update state
  const zoom = instance.state.zoom
  zoom.level = level
  zoom.centerX = centerX
  zoom.centerY = centerY
  
  // Apply zoom transform
  if (instance.ui.svg) {
    applyZoomTransform(instance)
  }
  
  // Update zoom control states
  updateZoomControlStates(instance)
  
  // Notify listeners
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
 * Zoom by a multiplicative factor, centred on a point given in image render-pixel
 * space (e.g. the `imageX`/`imageY` returned by the events coordinate helper). The
 * point under the cursor becomes the zoom anchor. Clamped to the 1.0-10.0 range;
 * a no-op at the limit. Returning to level 1 recentres the view.
 * @param {GramFrame} instance - GramFrame instance
 * @param {number} factor - Multiplicative zoom factor (>1 zooms in, <1 zooms out)
 * @param {number} imageX - Pointer X in render-pixel space (0..renderWidth)
 * @param {number} imageY - Pointer Y in render-pixel space (0..renderHeight)
 */
export function zoomAtImagePoint(instance, factor, imageX, imageY) {
  const state = instance.state
  const { zoom, player, imageDetails } = state
  const currentLevel = zoom.level
  const newLevel = Math.max(MIN_ZOOM, Math.min(currentLevel * factor, MAX_ZOOM))
  if (newLevel === currentLevel) {
    return // Already at the min/max limit
  }
  const { naturalWidth, naturalHeight } = imageDetails
  const renderWidth = imageDetails.renderWidth || naturalWidth
  const renderHeight = imageDetails.renderHeight || naturalHeight

  if (isPlayerActive(instance)) {
    // Hold the time under the pointer at the same fraction of the view while
    // the window's height in seconds changes (spec 168, D11).
    const pointerTime = imageToData(imageX, imageY, state).time
    const fraction = (player.viewTop - pointerTime) / visibleWindowSeconds(instance)
    zoom.level = newLevel
    player.viewTop = clampViewTop(instance, pointerTime + fraction * visibleWindowSeconds(instance))
    const centerX = newLevel <= MIN_ZOOM ? 0.5 : Math.max(0, Math.min(1, imageX / renderWidth))
    setZoom(instance, newLevel, centerX, 0.5)
    return
  }

  if (newLevel <= MIN_ZOOM) {
    zoomReset(instance)
    return
  }
  const centerX = Math.max(0, Math.min(1, imageX / renderWidth))
  const centerY = Math.max(0, Math.min(1, imageY / renderHeight))
  setZoom(instance, newLevel, centerX, centerY)
}

/**
 * Zoom so a selected region of the gram fills the visible area (spec 170, FR-006).
 *
 * The region arrives in image render-pixel space, already locked to the axes
 * area's aspect ratio by the gesture that drew it — which is what makes a
 * single isotropic level able to honour both of its dimensions at once.
 *
 * `zoom.centerX/centerY` are not the view's centre but its *anchor*: the
 * image point that keeps its unzoomed screen position through the transform
 * (see `applyZoomTransform`). Putting the selection's centre at the centre of
 * the axes area therefore means solving for the anchor rather than assigning
 * the centre, which is what {@link anchorForCentre} does.
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

  // Clamped rather than refused: a selection finer than 10x shows more than was
  // drawn, which is the safe direction to fail (FR-007).
  const level = Math.max(MIN_ZOOM, Math.min(renderWidth / region.width, MAX_ZOOM))
  const centreX = (region.x + region.width / 2) / renderWidth

  if (isPlayerActive(instance)) {
    // Vertically a player's view is a time window, not a normalised centre
    // (spec 168, D7). Hold the selection's mid-time at the middle of the new
    // window; the clamp keeps unplayed time out of view (FR-013).
    const centreTime = imageToData(0, region.y + region.height / 2, state).time
    zoom.level = level
    player.viewTop = clampViewTop(instance, centreTime + visibleWindowSeconds(instance) / 2)
    setZoom(instance, level, anchorForCentre(centreX, level), 0.5)
    return
  }

  const centreY = (region.y + region.height / 2) / renderHeight
  setZoom(instance, level, anchorForCentre(centreX, level), anchorForCentre(centreY, level))
}

/**
 * The zoom anchor that puts a given normalised image position at the centre of
 * the visible area.
 *
 * At level L the view spans 1/L of the image starting at `anchor · (1 − 1/L)`,
 * so wanting `centre` in the middle fixes the anchor. Clamped to [0, 1] — the
 * range that keeps the view inside the image, as `panByNormalized` does.
 * @param {number} centre - Desired centre, normalized (0-1) against the base render size
 * @param {number} level - Target zoom level
 * @returns {number} Anchor for `setZoom`
 */
function anchorForCentre(centre, level) {
  if (level <= MIN_ZOOM) {
    return 0.5
  }
  const visibleFraction = 1 / level
  return Math.max(0, Math.min(1, (centre - visibleFraction / 2) / (1 - visibleFraction)))
}

/**
 * Show the whole gram again in one action (spec 170, FR-014).
 *
 * On an audio-sourced gram "the whole gram" is the configured `window-seconds`
 * window rather than the entire recording, so this returns the zoom to 1x and
 * leaves the window where it is, re-clamped (AS-3.3).
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
 * Update zoom control button states based on current zoom level.
 *
 * Module-private since the dead `_setRate`/`_updateAxes`/`_updateZoomControlStates`
 * forwarder chain in main.js was deleted (L1): its only caller is `setZoom` above.
 * @param {GramFrame} instance - GramFrame instance
 */
function updateZoomControlStates(instance) {
  // Update command button states for all modes (zoom buttons are now in pan mode)
  if (instance.ui.commandButtons && instance.modes) {
    updateCommandButtonStates(instance.ui.commandButtons, instance.modes)
  }
  
  // Update mode button states (enabled/disabled)
  if (instance.ui.modeButtons && instance.modes) {
    updateModeButtonStates(instance.ui.modeButtons, instance.modes)
    
    // Switch away from pan mode if currently active but now disabled
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
