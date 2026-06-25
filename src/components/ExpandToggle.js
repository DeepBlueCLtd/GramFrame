/**
 * Expand/collapse toggle control for the spectrogram image.
 *
 * A small floating button at the top-left of the image region that expands a
 * landscape gram to fill the available space and restores it. Portrait/square
 * images (verniers) receive no toggle. Expand state is in-memory only.
 */

/// <reference path="../types.js" />

import { updateSVGLayout, renderAxes } from './table.js'
import { notifyStateListeners } from '../core/state.js'

// Small gap left between the expanded image and the viewport bottom (px).
const BOTTOM_GAP = 16

/**
 * Whether the instance's image is landscape (strictly wider than tall).
 * Square images are treated as non-landscape.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {boolean} True if the image is landscape
 */
export function isLandscape(instance) {
  const { naturalWidth, naturalHeight } = instance.state.imageDetails
  return naturalWidth > 0 && naturalHeight > 0 && naturalWidth > naturalHeight
}

/**
 * Compute the render dimensions that fill the available space.
 *
 * Width: the GramFrame component's inner image-region width (the main-panel
 * content width minus its padding, the SVG border, and the left/right axis
 * margins). Height: from the image region's top edge down to near the viewport
 * bottom, leaving the bottom axis and a small gap visible.
 *
 * @param {GramFrame} instance - GramFrame instance
 * @returns {{width: number, height: number}} Available render dimensions
 */
export function computeAvailableRenderSize(instance) {
  const margins = instance.state.margins
  const { naturalWidth, naturalHeight } = instance.state.imageDetails

  const cell = instance.mainCell
  const svg = instance.svg
  if (!cell || !svg) {
    return { width: naturalWidth, height: naturalHeight }
  }

  const cellStyle = window.getComputedStyle(cell)
  const padL = parseFloat(cellStyle.paddingLeft) || 0
  const padR = parseFloat(cellStyle.paddingRight) || 0

  const svgStyle = window.getComputedStyle(svg)
  const svgBorderX =
    (parseFloat(svgStyle.borderLeftWidth) || 0) +
    (parseFloat(svgStyle.borderRightWidth) || 0)

  // Inner image-region width in SVG units (1 unit == 1px at this render size).
  const width = cell.clientWidth - padL - padR - svgBorderX - margins.left - margins.right

  // Image region top in viewport coordinates (the image sits at y = margins.top).
  const svgRect = svg.getBoundingClientRect()
  const imageTopViewport = svgRect.top + margins.top
  const height = window.innerHeight - imageTopViewport - margins.bottom - BOTTOM_GAP

  // Never shrink below the natural size — expand only ever grows the image.
  return {
    width: Math.max(naturalWidth, Math.round(width)),
    height: Math.max(naturalHeight, Math.round(height))
  }
}

/**
 * Apply the current expand state to the layout: set render dims, relayout,
 * re-render axes and persistent features, and notify listeners.
 * @param {GramFrame} instance - GramFrame instance
 */
function applyExpandLayout(instance) {
  if (instance.state.imageExpanded) {
    // Two-pass: expanding a tall image can introduce a page scrollbar which
    // narrows the available width. Lay out once, then recompute against the
    // settled layout so the final fill is accurate (SC-001/SC-002).
    let { width, height } = computeAvailableRenderSize(instance)
    instance.state.imageDetails.renderWidth = width
    instance.state.imageDetails.renderHeight = height
    updateSVGLayout(instance)

    const settled = computeAvailableRenderSize(instance)
    if (Math.abs(settled.width - width) > 1 || Math.abs(settled.height - height) > 1) {
      instance.state.imageDetails.renderWidth = settled.width
      instance.state.imageDetails.renderHeight = settled.height
    }
  } else {
    instance.state.imageDetails.renderWidth = instance.state.imageDetails.naturalWidth
    instance.state.imageDetails.renderHeight = instance.state.imageDetails.naturalHeight
  }

  updateSVGLayout(instance)
  renderAxes(instance)

  // Re-resolve all persistent features through the render-aware transforms so
  // markers/harmonics/doppler stay locked to their data coordinates.
  if (instance.featureRenderer) {
    instance.featureRenderer.renderAllPersistentFeatures()
  }

  notifyStateListeners(instance.state, instance.stateListeners)
}

/**
 * Update the toggle button's visual/ARIA state to reflect expand state.
 * @param {HTMLButtonElement} button - Toggle button
 * @param {boolean} expanded - Whether the image is expanded
 */
function updateToggleButton(button, expanded) {
  button.setAttribute('aria-pressed', expanded ? 'true' : 'false')
  button.setAttribute('aria-label', expanded ? 'Collapse image' : 'Expand image')
  button.title = expanded ? 'Collapse image' : 'Expand image'
  // ⤢ (expand) / ⤡ (collapse)
  button.textContent = expanded ? '⤢' : '⤡'
}

/**
 * Programmatically set the expand state (no-op for non-landscape images).
 * @param {GramFrame} instance - GramFrame instance
 * @param {boolean} expanded - Desired expand state
 */
export function setImageExpanded(instance, expanded) {
  if (!isLandscape(instance)) {
    return
  }
  instance.state.imageExpanded = !!expanded
  applyExpandLayout(instance)
  if (instance.expandToggleButton) {
    updateToggleButton(instance.expandToggleButton, instance.state.imageExpanded)
  }
}

/**
 * Recompute the expanded layout to keep filling the available space. Called
 * from the resize path; a no-op when the image is not expanded.
 * @param {GramFrame} instance - GramFrame instance
 */
export function refreshExpandedLayout(instance) {
  if (!instance.state.imageExpanded) {
    return
  }
  const { width, height } = computeAvailableRenderSize(instance)
  instance.state.imageDetails.renderWidth = width
  instance.state.imageDetails.renderHeight = height
}

/**
 * Create and mount the expand toggle for a landscape instance. Does nothing for
 * portrait/square images, so no toggle exists in the DOM for verniers.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {HTMLButtonElement|null} The created button, or null if not landscape
 */
export function createExpandToggle(instance) {
  if (!isLandscape(instance)) {
    return null
  }

  const button = document.createElement('button')
  button.className = 'gram-frame-expand-toggle'
  button.type = 'button'
  updateToggleButton(button, instance.state.imageExpanded)

  button.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    setImageExpanded(instance, !instance.state.imageExpanded)
  })

  // The main panel is position: relative, so the button positions relative to it.
  instance.mainCell.appendChild(button)
  instance.expandToggleButton = button
  return button
}
