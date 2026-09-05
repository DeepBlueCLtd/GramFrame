/**
 * The geometry of a region-zoom selection (spec 170).
 *
 * Pure functions over the viewport: no session, no drag, no DOM beyond the
 * spectrogram image element the canonical coordinate module already reads
 * bounds from. Separated from the gesture in `core/regionZoom.js` so the
 * aspect lock and the clamp — the two rules an analyst actually feels — can be
 * read, and covered, without a browser.
 */

/// <reference path="../types.js" />

import { svgToImage, imageToData, getImageBounds, getRenderDimensions } from './coordinates.js'

/** @typedef {import('./coordinates.js').Viewport} Viewport */

/**
 * The rectangle a selection currently describes, in SVG units, plus the raw
 * pointer movement the click threshold is measured against.
 * @typedef {Object} SelectionRect
 * @property {number} x - Left edge
 * @property {number} y - Top edge
 * @property {number} width - Width
 * @property {number} height - Height
 * @property {number} movedX - Raw horizontal pointer movement since the press
 * @property {number} movedY - Raw vertical pointer movement since the press
 */

/**
 * The area a selection may cover: the axes window, less anything the image does
 * not currently reach. Zoomed in, the image is larger than its axes area and
 * clipped to it, so the axes window is the bound; on an audio-sourced gram the
 * image can be shorter than the window, so the image is. The intersection is
 * right in both cases, and is what FR-011 clamps a rectangle to.
 * @param {Viewport} viewport - Current viewport
 * @param {SVGImageElement|null} [spectrogramImage] - Spectrogram image element
 * @returns {{left: number, top: number, right: number, bottom: number}} Bounds in SVG units
 */
export function selectionBounds(viewport, spectrogramImage = null) {
  const { renderWidth, renderHeight } = getRenderDimensions(viewport)
  const { margins } = viewport
  const image = getImageBounds(viewport, spectrogramImage)
  return {
    left: Math.max(margins.left, image.left),
    top: Math.max(margins.top, image.top),
    right: Math.min(margins.left + renderWidth, image.left + image.width),
    bottom: Math.min(margins.top + renderHeight, image.top + image.height)
  }
}

/**
 * Whether a point is inside the selectable area.
 * @param {SVGCoordinates} point - Point in SVG units
 * @param {{left: number, top: number, right: number, bottom: number}} bounds - Selectable area
 * @returns {boolean} True when the point is inside
 */
export function withinBounds(point, bounds) {
  return point.x >= bounds.left && point.x <= bounds.right &&
    point.y >= bounds.top && point.y <= bounds.bottom
}

/**
 * The rectangle between two pointer positions, locked to the axes area's aspect
 * ratio and clamped to the selectable bounds.
 *
 * The pointer sets the larger of the two dimensions and the other follows
 * (FR-003), and the locked box is then shrunk — not cropped — to fit the
 * bounds, so it keeps the view's proportions right up to the edge (FR-011).
 * @param {Viewport} viewport - Current viewport
 * @param {{left: number, top: number, right: number, bottom: number}} bounds - Selectable area
 * @param {SVGCoordinates} start - Where the drag began, in SVG units
 * @param {SVGCoordinates} current - Where the pointer is now, in SVG units
 * @returns {SelectionRect} The selection, in SVG units
 */
export function aspectLockedRect(viewport, bounds, start, current) {
  const { renderWidth, renderHeight } = getRenderDimensions(viewport)
  const movedX = Math.max(bounds.left, Math.min(bounds.right, current.x)) - start.x
  const movedY = Math.max(bounds.top, Math.min(bounds.bottom, current.y)) - start.y
  const towardsRight = movedX >= 0
  const towardsBottom = movedY >= 0

  // The pointer's larger dimension, as a fraction of the axes area, sets both.
  let fraction = Math.max(Math.abs(movedX) / renderWidth, Math.abs(movedY) / renderHeight)
  const roomX = towardsRight ? bounds.right - start.x : start.x - bounds.left
  const roomY = towardsBottom ? bounds.bottom - start.y : start.y - bounds.top
  fraction = Math.max(0, Math.min(fraction, roomX / renderWidth, roomY / renderHeight))

  const width = fraction * renderWidth
  const height = fraction * renderHeight
  return {
    x: towardsRight ? start.x : start.x - width,
    y: towardsBottom ? start.y : start.y - height,
    width,
    height,
    movedX,
    movedY
  }
}

/**
 * Turn the SVG rectangle into the image-space region the viewport zooms to, and
 * the data span the readout describes.
 * @param {Viewport} viewport - Current viewport
 * @param {SVGImageElement|null} spectrogramImage - Spectrogram image element
 * @param {{x: number, y: number, width: number, height: number}} rect - Rectangle in SVG units
 * @returns {{region: {x: number, y: number, width: number, height: number}, freqSpan: number, timeSpan: number}} Region in image render pixels, and its data span
 */
export function rectToRegion(viewport, spectrogramImage, rect) {
  const topLeft = svgToImage(rect.x, rect.y, viewport, spectrogramImage)
  const bottomRight = svgToImage(rect.x + rect.width, rect.y + rect.height, viewport, spectrogramImage)
  const upper = imageToData(topLeft.x, topLeft.y, viewport)
  const lower = imageToData(bottomRight.x, bottomRight.y, viewport)
  return {
    region: {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y
    },
    freqSpan: lower.freq - upper.freq,
    // Time runs upward: the rectangle's top edge is the later time.
    timeSpan: upper.time - lower.time
  }
}
