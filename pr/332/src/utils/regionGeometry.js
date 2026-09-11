/**
 * The geometry of a region-zoom selection (spec 170).
 *
 * Pure functions over the viewport: no session, no drag, no DOM beyond the
 * spectrogram image element the canonical coordinate module already reads
 * bounds from. Separated from the gesture in `core/regionZoom.js` so the rules
 * an analyst actually feels can be read, and covered, without a browser.
 *
 * The selection is a free rectangle of any proportions, and the view that
 * results **contains** it: scaled by whichever axis is the tighter fit, so the
 * whole selection is visible and the slack axis shows more of the gram than was
 * asked for. That is `object-fit: contain` — letterboxing, except the bars are
 * more gram rather than blank. The alternative, `cover`, would fill the view
 * from the looser axis and crop the selection, which is the wrong way to fail
 * for a measurement tool: it would hide something the analyst deliberately
 * framed.
 *
 * This replaced an aspect-locked marquee, which constrained the rubber band to
 * the view's proportions as it was drawn. That kept what-you-draw-is-what-you-
 * get, but the box lurched in width as the pointer moved down, which read as
 * broken rather than as deliberate.
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
 * The rectangle between two pointer positions: any proportions the analyst
 * likes, clamped to the selectable bounds (FR-003, FR-011).
 *
 * The pointer is followed exactly. What the zoom then does with a rectangle
 * that is not the view's shape is {@link containedView}'s business, not this
 * one's.
 * @param {{left: number, top: number, right: number, bottom: number}} bounds - Selectable area
 * @param {SVGCoordinates} start - Where the drag began, in SVG units
 * @param {SVGCoordinates} current - Where the pointer is now, in SVG units
 * @returns {SelectionRect} The selection, in SVG units
 */
export function selectionRect(bounds, start, current) {
  const x = Math.max(bounds.left, Math.min(bounds.right, current.x))
  const y = Math.max(bounds.top, Math.min(bounds.bottom, current.y))
  const movedX = x - start.x
  const movedY = y - start.y
  return {
    x: Math.min(start.x, x),
    y: Math.min(start.y, y),
    width: Math.abs(movedX),
    height: Math.abs(movedY),
    movedX,
    movedY
  }
}

/**
 * How much the view magnifies if it is to contain a rectangle of this shape.
 *
 * The tighter axis wins: fitting the selection's width might need 6x and its
 * height only 2x, and at 6x the selection's top and bottom would be off-screen.
 * So 2x, and the width comes out wider than was asked for. Expressed as a
 * factor on the *current* level, since the rectangle is measured in the SVG
 * units of the view it was drawn in.
 * @param {Viewport} viewport - Current viewport
 * @param {{width: number, height: number}} rect - The selection, in SVG units
 * @returns {number} Magnification factor, 1 when the rectangle is empty
 */
function containFactor(viewport, rect) {
  const { renderWidth, renderHeight } = getRenderDimensions(viewport)
  if (!(rect.width > 0) || !(rect.height > 0)) {
    return 1
  }
  return Math.min(renderWidth / rect.width, renderHeight / rect.height)
}

/**
 * The area that will actually be visible once a selection is zoomed to.
 *
 * With `contain` the view is the selection grown, about its own centre, until
 * one axis fills — so the analyst is shown more than they framed on the other.
 * Drawing this alongside the selection is what keeps the gesture honest: the
 * box you drew is still the box you drew, and the second outline says what will
 * come with it.
 *
 * It also shows the 10x cap arriving, since the cap is applied here: a
 * selection finer than the cap allows produces a view visibly larger than it.
 * @param {Viewport} viewport - Current viewport
 * @param {{left: number, top: number, right: number, bottom: number}} bounds - Selectable area
 * @param {{x: number, y: number, width: number, height: number}} rect - The selection, in SVG units
 * @param {{min: number, max: number}} limits - The zoom level range
 * @returns {{x: number, y: number, width: number, height: number}} The resulting view, in SVG units
 */
export function containedView(viewport, bounds, rect, limits) {
  const { renderWidth, renderHeight } = getRenderDimensions(viewport)
  const level = viewport.zoom.level
  const capped = Math.max(limits.min, Math.min(level * containFactor(viewport, rect), limits.max))
  // Back to a factor on the current view, so the extent is in the SVG units the
  // selection was drawn in.
  const factor = capped / level
  const width = renderWidth / factor
  const height = renderHeight / factor

  // Centred on the selection, then slid — not shrunk — back inside the gram, so
  // the view never includes space the gram does not cover. This is the same
  // decision `viewport.js:anchorForCentre` makes when it clamps the anchor.
  const centreX = rect.x + rect.width / 2
  const centreY = rect.y + rect.height / 2
  return {
    x: slideInside(centreX - width / 2, width, bounds.left, bounds.right),
    y: slideInside(centreY - height / 2, height, bounds.top, bounds.bottom),
    width,
    height
  }
}

/**
 * Move a span of the given length so it lies within [min, max], or centre it
 * when it is longer than the range.
 * @param {number} start - Where the span would begin
 * @param {number} length - Its length
 * @param {number} min - Lower bound
 * @param {number} max - Upper bound
 * @returns {number} The adjusted start
 */
function slideInside(start, length, min, max) {
  if (length >= max - min) {
    return min + (max - min - length) / 2
  }
  return Math.max(min, Math.min(start, max - length))
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
