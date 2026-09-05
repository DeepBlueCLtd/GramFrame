/**
 * SVG layout and zoom transform for the spectrogram.
 *
 * Sizes the SVG and its clip rects to the axes area, positions the image
 * within it, and applies the current zoom transform to the image element.
 * Split out of `components/table.js` (spec 167, FR-004).
 *
 * `applyZoomTransform` lives here rather than in `core/viewport.js` because it
 * *applies* a transform to the DOM rather than deciding one: `viewport.js`
 * remains the single home for zoom math — `zoomIn`/`zoomOut`/`zoomReset`/
 * `setZoom`/`zoomAtImagePoint`/`panByNormalized` — and calls into here to
 * render the result (FR-007, AS-3.4). Keeping it in `viewport.js` would have
 * made `viewport.js` and this module mutually dependent, since
 * `updateSVGLayout` finishes by applying the transform.
 */

/// <reference path="../types.js" />

import { getRenderDimensions } from '../utils/coordinates.js'
import { renderAxes } from '../rendering/axes.js'

/**
 * Update SVG layout and viewBox based on image dimensions and margins
 * @param {GramFrame} instance - GramFrame instance
 */
export function updateSVGLayout(instance) {
  const viewport = instance.state
  const { naturalWidth, naturalHeight } = viewport.imageDetails
  const margins = viewport.margins

  if (!naturalWidth || !naturalHeight) {
    return
  }

  // Use the base render dimensions (which default to natural, but grow when the
  // image is expanded) as the axes area. This way each image fills its axes
  // completely at whatever rendered size is currently active.
  const { renderWidth, renderHeight } = getRenderDimensions(viewport)
  const axesWidth = renderWidth
  const axesHeight = renderHeight
  
  // Calculate total container dimensions = image + decorations (margins)
  const totalWidth = axesWidth + margins.left + margins.right
  const totalHeight = axesHeight + margins.top + margins.bottom
  
  // Let the container size naturally, but ensure SVG is properly sized
  instance.ui.container.style.width = 'auto'
  instance.ui.container.style.height = 'auto'
  instance.ui.container.style.aspectRatio = 'unset' // Remove aspect ratio constraint
  
  // Set SVG to explicit dimensions so container wraps around it naturally
  instance.ui.svg.style.width = `${totalWidth}px`
  instance.ui.svg.style.height = `${totalHeight}px`
  instance.ui.svg.setAttribute('viewBox', `0 0 ${totalWidth} ${totalHeight}`)
  instance.ui.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  
  // Position image to fill the axes area completely
  instance.ui.spectrogramImage.setAttribute('x', String(margins.left))
  instance.ui.spectrogramImage.setAttribute('y', String(margins.top))
  instance.ui.spectrogramImage.setAttribute('width', String(axesWidth))
  instance.ui.spectrogramImage.setAttribute('height', String(axesHeight))
  
  // Set up clipping rectangle to match axes area
  if (instance.ui.imageClipRect) {
    instance.ui.imageClipRect.setAttribute('x', String(margins.left))
    instance.ui.imageClipRect.setAttribute('y', String(margins.top))
    instance.ui.imageClipRect.setAttribute('width', String(axesWidth))
    instance.ui.imageClipRect.setAttribute('height', String(axesHeight))
  }
  
  // Update cursor clipping rectangle with identical dimensions
  if (instance.ui.cursorClipRect) {
    instance.ui.cursorClipRect.setAttribute('x', String(margins.left))
    instance.ui.cursorClipRect.setAttribute('y', String(margins.top))
    instance.ui.cursorClipRect.setAttribute('width', String(axesWidth))
    instance.ui.cursorClipRect.setAttribute('height', String(axesHeight))
  }
  
  // Apply zoom if needed
  applyZoomTransform(instance)
}

/**
 * Apply zoom transformation to spectrogram image only
 * @param {GramFrame} instance - GramFrame instance
 */
export function applyZoomTransform(instance) {
  const viewport = instance.state
  const { level, centerX, centerY } = viewport.zoom
  const margins = viewport.margins
  // Base render size (defaults to natural); zoom multiplies it so expand × zoom compose.
  const { renderWidth, renderHeight } = getRenderDimensions(viewport)

  if (!instance.ui.spectrogramImage) {
    return
  }

  if (viewport.imageDetails.timeStretch !== undefined) {
    applyStretchedTransform(instance, viewport, renderWidth, renderHeight)
    return
  }

  if (level === 1.0) {
    // No zoom - reset to axes position and size
    instance.ui.spectrogramImage.setAttribute('x', String(margins.left))
    instance.ui.spectrogramImage.setAttribute('y', String(margins.top))
    instance.ui.spectrogramImage.setAttribute('width', String(renderWidth))
    instance.ui.spectrogramImage.setAttribute('height', String(renderHeight))
    instance.ui.spectrogramImage.removeAttribute('transform')
    
    // Update axes to show full data range
    renderAxes(instance)
    
    // Re-render all persistent features to update positions for reset zoom
    if (instance.featureRenderer) {
      instance.featureRenderer.renderAllPersistentFeatures()
    }
    
    return
  }
  
  // Calculate zoom center in image coordinates (0-1 normalized to render pixels)
  const centerImageX = centerX * renderWidth
  const centerImageY = centerY * renderHeight

  // Calculate new image dimensions (base render size multiplied by zoom level)
  const zoomedWidth = renderWidth * level
  const zoomedHeight = renderHeight * level
  
  // Calculate new position to keep zoom center in the same place
  const newX = margins.left + centerImageX - (centerImageX * level)
  const newY = margins.top + centerImageY - (centerImageY * level)
  
  // Apply zoom to image only
  instance.ui.spectrogramImage.setAttribute('x', String(newX))
  instance.ui.spectrogramImage.setAttribute('y', String(newY))
  instance.ui.spectrogramImage.setAttribute('width', String(zoomedWidth))
  instance.ui.spectrogramImage.setAttribute('height', String(zoomedHeight))
  
  // Update axes to reflect the new visible data range
  renderAxes(instance)
  
  // Re-render all persistent features to update positions for zoom/pan
  if (instance.featureRenderer) {
    instance.featureRenderer.renderAllPersistentFeatures()
  }
}

/**
 * Place a time-stretched (audio-sourced) gram (spec 168, D7; contracts/player-api.md).
 *
 * The image is the whole recording. Vertically it is drawn `timeStretch`
 * times the axes height so the unzoomed view spans `window-seconds`, and
 * positioned so `player.viewTop` — the time at the view's top edge — lands on
 * `margins.top`. Zoom multiplies both axes as it does for an image, and the
 * horizontal placement is the ordinary centre-anchored one. Time before the
 * recording began is blank space above the image's bottom edge, and time not
 * yet played is clipped off above the playhead (FR-010, FR-011).
 * @param {GramFrame} instance - GramFrame instance
 * @param {GramFrameState} viewport - The instance's state
 * @param {number} renderWidth - Base render width
 * @param {number} renderHeight - Base render height (the axes height)
 */
function applyStretchedTransform(instance, viewport, renderWidth, renderHeight) {
  const { zoom, margins, config, player, imageDetails } = viewport
  const { level, centerX } = zoom
  const stretch = imageDetails.timeStretch || 1
  const image = instance.ui.spectrogramImage

  const width = renderWidth * level
  const height = renderHeight * stretch * level
  const x = margins.left + centerX * renderWidth - centerX * renderWidth * level

  const span = config.timeMax - config.timeMin
  // Fraction of the image above the view's top edge; the image's own top is
  // `timeMax`, so `viewTop === timeMax` puts it exactly at margins.top.
  const aboveView = span > 0 ? (config.timeMax - player.viewTop) / span : 1
  const y = margins.top - aboveView * height

  image.setAttribute('x', String(x))
  image.setAttribute('y', String(y))
  image.setAttribute('width', String(width))
  image.setAttribute('height', String(height))
  image.removeAttribute('transform')

  // Nothing above the playhead may show, even though the view's top edge is
  // never above it: the clip makes the guarantee structural rather than a
  // property of the clamp.
  if (instance.ui.imageClipRect) {
    const playheadY = span > 0
      ? y + ((config.timeMax - player.playhead) / span) * height
      : margins.top
    const top = Math.max(margins.top, playheadY)
    const bottom = margins.top + renderHeight
    instance.ui.imageClipRect.setAttribute('y', String(top))
    instance.ui.imageClipRect.setAttribute('height', String(Math.max(0, bottom - top)))
  }

  renderAxes(instance)
  if (instance.featureRenderer) {
    instance.featureRenderer.renderAllPersistentFeatures()
  }
}
