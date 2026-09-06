/**
 * Spectrogram image setup and scaling.
 *
 * Loads the configured image, records its natural (post-downscale) dimensions,
 * seeds the render dimensions from them, and triggers the first layout, axis
 * render, expand-toggle mount and contrast bar. Split out of
 * `components/table.js` (spec 167, FR-004).
 */

/// <reference path="../types.js" />

import { dispatch } from '../core/state.js'
import { renderAxes } from '../rendering/axes.js'
import { createExpandToggle } from './ExpandToggle.js'
import { mountDisplayRangeBar } from './DisplayRangeControls.js'
import { updateSVGLayout } from './svgLayout.js'

// Maximum image width in pixels - images wider than this will be scaled down
const MAX_IMAGE_WIDTH = 1200

/**
 * Set up spectrogram image display within SVG container
 * @param {GramFrame} instance - GramFrame instance
 * @param {string} imageUrl - URL of the spectrogram image
 */
export function setupSpectrogramImage(instance, imageUrl) {
  if (!instance.ui.spectrogramImage || !imageUrl) {
    return
  }
  
  // Set image source
  instance.ui.spectrogramImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imageUrl)
  
  // Store URL in state
  const state = instance.state
  state.imageDetails.url = imageUrl
  
  // Load image to get natural dimensions
  const tempImg = new Image()
  tempImg.onload = function() {
    // Dimensions are known, so the panel is about to render for real
    instance.ui.container.classList.remove('gram-frame-loading')

    // Get original dimensions
    let imageWidth = tempImg.naturalWidth
    let imageHeight = tempImg.naturalHeight
    
    // Apply automatic scaling for images wider than the maximum allowed width
    if (imageWidth > MAX_IMAGE_WIDTH) {
      const scaleFactor = MAX_IMAGE_WIDTH / imageWidth
      imageWidth = MAX_IMAGE_WIDTH
      imageHeight = Math.round(imageHeight * scaleFactor)
      
      console.log(`GramFrame: Scaling down large image from ${tempImg.naturalWidth}x${tempImg.naturalHeight} to ${imageWidth}x${imageHeight} (scale factor: ${scaleFactor.toFixed(3)})`)
    }
    
    // Store scaled dimensions as natural dimensions
    const imageDetails = state.imageDetails
    imageDetails.naturalWidth = imageWidth
    imageDetails.naturalHeight = imageHeight

    // Initialise render dimensions to natural dimensions. Expand updates these
    // to fill available space; collapse restores them to natural exactly.
    imageDetails.renderWidth = imageWidth
    imageDetails.renderHeight = imageHeight

    // Update SVG layout
    updateSVGLayout(instance)

    // Render axes
    renderAxes(instance)

    // Mount the expand toggle now that natural dimensions (and thus the
    // landscape test) are known. No-op for portrait/square images.
    createExpandToggle(instance)

    // The contrast controls, on their own bar under the gram (#324). Mounted
    // once the image has loaded, like the toggle: before that there is nothing
    // for them to act on.
    mountDisplayRangeBar(instance, state.display)

    // Notify listeners of updated dimensions
    dispatch(instance)
  }
  tempImg.onerror = function() {
    // Without dimensions nothing can be rendered, so replace the loading
    // caption with a failure one instead of leaving it spinning forever
    console.error(`GramFrame: Failed to load spectrogram image: ${imageUrl}`)
    instance.ui.container.classList.remove('gram-frame-loading')
    instance.ui.container.classList.add('gram-frame-image-error')
  }
  tempImg.src = imageUrl
}
