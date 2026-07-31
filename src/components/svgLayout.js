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
  instance.container.style.width = 'auto'
  instance.container.style.height = 'auto'
  instance.container.style.aspectRatio = 'unset' // Remove aspect ratio constraint
  
  // Set SVG to explicit dimensions so container wraps around it naturally
  instance.svg.style.width = `${totalWidth}px`
  instance.svg.style.height = `${totalHeight}px`
  instance.svg.setAttribute('viewBox', `0 0 ${totalWidth} ${totalHeight}`)
  instance.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  
  // Position image to fill the axes area completely
  instance.spectrogramImage.setAttribute('x', String(margins.left))
  instance.spectrogramImage.setAttribute('y', String(margins.top))
  instance.spectrogramImage.setAttribute('width', String(axesWidth))
  instance.spectrogramImage.setAttribute('height', String(axesHeight))
  
  // Set up clipping rectangle to match axes area
  if (instance.imageClipRect) {
    instance.imageClipRect.setAttribute('x', String(margins.left))
    instance.imageClipRect.setAttribute('y', String(margins.top))
    instance.imageClipRect.setAttribute('width', String(axesWidth))
    instance.imageClipRect.setAttribute('height', String(axesHeight))
  }
  
  // Update cursor clipping rectangle with identical dimensions
  if (instance.cursorClipRect) {
    instance.cursorClipRect.setAttribute('x', String(margins.left))
    instance.cursorClipRect.setAttribute('y', String(margins.top))
    instance.cursorClipRect.setAttribute('width', String(axesWidth))
    instance.cursorClipRect.setAttribute('height', String(axesHeight))
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

  if (!instance.spectrogramImage) {
    return
  }

  if (level === 1.0) {
    // No zoom - reset to axes position and size
    instance.spectrogramImage.setAttribute('x', String(margins.left))
    instance.spectrogramImage.setAttribute('y', String(margins.top))
    instance.spectrogramImage.setAttribute('width', String(renderWidth))
    instance.spectrogramImage.setAttribute('height', String(renderHeight))
    instance.spectrogramImage.removeAttribute('transform')
    
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
  instance.spectrogramImage.setAttribute('x', String(newX))
  instance.spectrogramImage.setAttribute('y', String(newY))
  instance.spectrogramImage.setAttribute('width', String(zoomedWidth))
  instance.spectrogramImage.setAttribute('height', String(zoomedHeight))
  
  // Update axes to reflect the new visible data range
  renderAxes(instance)
  
  // Re-render all persistent features to update positions for zoom/pan
  if (instance.featureRenderer) {
    instance.featureRenderer.renderAllPersistentFeatures()
  }
}
