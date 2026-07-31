/**
 * Viewport module for GramFrame
 * 
 * This module handles zoom and pan functionality for the spectrogram viewport,
 * including coordinate transformations and zoom state management.
 */

/// <reference path="../types.js" />

import { applyZoomTransform, updateSVGLayout, renderAxes } from '../components/table.js'
import { updateCommandButtonStates, updateModeButtonStates } from '../components/ModeButtons.js'
import { dispatch } from './state.js'
import { screenToSVG } from '../utils/coordinates.js'
import { refreshExpandedLayout } from '../components/ExpandToggle.js'

/**
 * Zoom in by increasing zoom level
 * @param {GramFrame} instance - GramFrame instance
 */
export function zoomIn(instance) {
  const currentLevel = instance.state.zoom.level
  const newLevel = Math.min(currentLevel * 1.5, 10.0) // Max 10x zoom
  setZoom(instance, newLevel, instance.state.zoom.centerX, instance.state.zoom.centerY)
}

/**
 * Zoom out by decreasing zoom level
 * @param {GramFrame} instance - GramFrame instance
 */
export function zoomOut(instance) {
  const currentLevel = instance.state.zoom.level
  const newLevel = Math.max(currentLevel / 1.5, 1.0) // Min 1x zoom
  setZoom(instance, newLevel, instance.state.zoom.centerX, instance.state.zoom.centerY)
}

/**
 * Reset zoom to 1x
 * @param {GramFrame} instance - GramFrame instance
 */
export function zoomReset(instance) {
  setZoom(instance, 1.0, 0.5, 0.5)
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
  instance.state.zoom.level = level
  instance.state.zoom.centerX = centerX
  instance.state.zoom.centerY = centerY
  
  // Apply zoom transform
  if (instance.svg) {
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
  const { naturalWidth, naturalHeight } = instance.state.imageDetails
  // Base render size (defaults to natural; grows when expanded)
  const renderWidth = instance.state.imageDetails.renderWidth || naturalWidth
  const renderHeight = instance.state.imageDetails.renderHeight || naturalHeight

  // Screen pixels to SVG units, via the canonical module. The transform is
  // affine, so converting the delta means converting both ends and taking the
  // difference. Reading the live viewBox this way is what stops this becoming a
  // fifth place that re-derives the screen scale (FR-002).
  const origin = screenToSVG(0, 0, instance.svg)
  const shifted = screenToSVG(dxPx, dyPx, instance.svg)
  const svgDeltaX = shifted.x - origin.x
  const svgDeltaY = shifted.y - origin.y

  // Convert to normalized coordinates (adjust for zoom level); negate so content
  // follows the drag.
  return {
    normalizedDeltaX: -(svgDeltaX / renderWidth) / instance.state.zoom.level,
    normalizedDeltaY: -(svgDeltaY / renderHeight) / instance.state.zoom.level
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
  if (instance.state.zoom.level <= 1.0) {
    return // No panning when not zoomed
  }
  const newCenterX = Math.max(0, Math.min(1, instance.state.zoom.centerX + deltaX))
  const newCenterY = Math.max(0, Math.min(1, instance.state.zoom.centerY + deltaY))
  setZoom(instance, instance.state.zoom.level, newCenterX, newCenterY)
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
  const currentLevel = instance.state.zoom.level
  const newLevel = Math.max(1.0, Math.min(currentLevel * factor, 10.0))
  if (newLevel === currentLevel) {
    return // Already at the min/max limit
  }
  if (newLevel <= 1.0) {
    zoomReset(instance)
    return
  }
  const { naturalWidth, naturalHeight } = instance.state.imageDetails
  const renderWidth = instance.state.imageDetails.renderWidth || naturalWidth
  const renderHeight = instance.state.imageDetails.renderHeight || naturalHeight
  const centerX = Math.max(0, Math.min(1, imageX / renderWidth))
  const centerY = Math.max(0, Math.min(1, imageY / renderHeight))
  setZoom(instance, newLevel, centerX, centerY)
}

/**
 * Update zoom control button states based on current zoom level
 * @param {GramFrame} instance - GramFrame instance
 */
export function updateZoomControlStates(instance) {
  // Update command button states for all modes (zoom buttons are now in pan mode)
  if (instance.commandButtons && instance.modes) {
    updateCommandButtonStates(instance.commandButtons, instance.modes)
  }
  
  // Update mode button states (enabled/disabled)
  if (instance.modeButtons && instance.modes) {
    updateModeButtonStates(instance.modeButtons, instance.modes)
    
    // Switch away from pan mode if currently active but now disabled
    if (instance.state.mode === 'pan' && instance.modes.pan && !instance.modes.pan.isEnabled() && instance.state.previousMode) {
      instance._switchMode(instance.state.previousMode)
    }
  }
}

/**
 * Handle resize events
 * @param {GramFrame} instance - GramFrame instance
 */
export function handleResize(instance) {
  if (instance.svg) {
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

/**
 * Update axes when rate changes
 * @param {GramFrame} instance - GramFrame instance
 */
export function updateAxes(instance) {
  if (instance.axesGroup) {
    renderAxes(instance)
  }
}