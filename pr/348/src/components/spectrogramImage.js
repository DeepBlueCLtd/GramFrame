/**
 * Spectrogram image setup and scaling.
 *
 * Loads the configured image, records its natural (post-downscale) dimensions,
 * seeds the render dimensions from them, and triggers the first layout, axis
 * render and expand-toggle mount. Split out of `components/table.js`
 * (spec 167, FR-004).
 */

/// <reference path="../types.js" />

import { dispatch } from '../core/state.js'
import { renderAxes } from '../rendering/axes.js'
import { createExpandToggle } from './ExpandToggle.js'
import { updateSVGLayout } from './svgLayout.js'
import { sizeLoadedImage } from './imageSizing.js'


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
  instance.state.imageDetails.url = imageUrl
  
  // Load image to get natural dimensions
  const tempImg = new Image()
  tempImg.onload = function() {
    // Dimensions are known, so the panel is about to render for real
    instance.ui.container.classList.remove('gram-frame-loading')

    // The image file's own size; how big it is drawn is the sizing's call
    // (issue #345). Natural and render size are both set from it — expand
    // updates the render size to fill available space, collapse restores it.
    sizeLoadedImage(instance, instance.state, { width: tempImg.naturalWidth, height: tempImg.naturalHeight })

    // Update SVG layout
    updateSVGLayout(instance)

    // Render axes
    renderAxes(instance)

    // Mount the expand toggle now that natural dimensions (and thus the
    // landscape test) are known. No-op for portrait/square images.
    createExpandToggle(instance)

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
