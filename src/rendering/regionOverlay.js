/**
 * The region-zoom selection overlay (spec 170, FR-003 – FR-005).
 *
 * Draws the rubber-band rectangle, the dimmed surround that makes the target
 * read as the subject, and the live span readout. Like every module in this
 * family it draws and nothing else: the geometry is decided in
 * `utils/regionGeometry.js` and arrives here already clamped, so this file
 * holds no idea of what a drag is.
 *
 * Two rectangles, not one. The solid one is the box the analyst is drawing; the
 * dashed one is the view it will produce, which is larger on whichever axis is
 * the looser fit (`contain` — see `regionGeometry.js`). The dimming follows the
 * *view*, because that is the honest boundary between what will be on screen
 * and what will not. When the selection happens to match the view's shape the
 * two coincide and only one outline is drawn.
 */

/// <reference path="../types.js" />

import { formatAxisTime } from '../utils/timeFormatter.js'
import { formatFrequencyLabel, precisionIntervalFor } from '../utils/axisFormat.js'
import { plateLabel } from '../utils/labelPlate.js'

/** SVG namespace for element creation */
const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * Font size of the live span readout, in SVG units.
 * @type {number}
 */
const READOUT_FONT_SIZE = 12

/**
 * A rectangle in SVG units.
 * @typedef {Object} OverlayRect
 * @property {number} x - Left edge
 * @property {number} y - Top edge
 * @property {number} width - Width
 * @property {number} height - Height
 */

/**
 * What the overlay needs to draw itself.
 * @typedef {Object} RegionOverlayView
 * @property {OverlayRect} rect - The selection, in SVG units
 * @property {OverlayRect} view - What will actually be visible after the zoom, in SVG units
 * @property {{left: number, top: number, right: number, bottom: number}} bounds - The selectable area, in SVG units
 * @property {number} freqSpan - Selected frequency span in Hz
 * @property {number} timeSpan - Selected time span in seconds
 */

/**
 * The live span readout's text, in the units and to the precision the axes use
 * (FR-005).
 * @param {number} freqSpan - Selected frequency span in Hz
 * @param {number} timeSpan - Selected time span in seconds
 * @returns {string} Readout text
 */
function regionSpanText(freqSpan, timeSpan) {
  const freq = formatFrequencyLabel(freqSpan, precisionIntervalFor(freqSpan))
  const time = formatAxisTime(timeSpan, precisionIntervalFor(timeSpan))
  return `${freq} × ${time}`
}

/**
 * Build an empty selection overlay, ready to be appended to the SVG.
 * @returns {SVGGElement} The overlay group
 */
export function createRegionOverlay() {
  const overlay = /** @type {SVGGElement} */ (document.createElementNS(SVG_NS, 'g'))
  overlay.setAttribute('class', 'gram-frame-region-selection')

  const dim = document.createElementNS(SVG_NS, 'path')
  dim.setAttribute('class', 'gram-frame-region-dim')
  dim.setAttribute('fill-rule', 'evenodd')
  overlay.appendChild(dim)

  const resulting = document.createElementNS(SVG_NS, 'rect')
  resulting.setAttribute('class', 'gram-frame-region-view')
  overlay.appendChild(resulting)

  const box = document.createElementNS(SVG_NS, 'rect')
  box.setAttribute('class', 'gram-frame-region-box')
  overlay.appendChild(box)

  return overlay
}

/**
 * Redraw an overlay for the current selection.
 * @param {SVGGElement} overlay - Group from {@link createRegionOverlay}
 * @param {RegionOverlayView} view - The selection to draw
 */
export function renderRegionOverlay(overlay, view) {
  const { rect, bounds } = view

  // One path holding the selectable area and the resulting view, filled
  // even-odd, so the surround dims in a single element and what will be on
  // screen stays clear.
  const outer = `M${bounds.left} ${bounds.top}H${bounds.right}V${bounds.bottom}H${bounds.left}Z`
  overlay.children[0].setAttribute('d', `${outer}${boxPath(view.view)}`)

  sizeRect(/** @type {SVGRectElement} */ (overlay.children[1]), view.view)
  sizeRect(/** @type {SVGRectElement} */ (overlay.children[2]), rect)
  // Nothing to say when the selection already is the view.
  overlay.children[1].setAttribute('visibility', sameRect(rect, view.view) ? 'hidden' : 'visible')

  // The readout is rebuilt rather than edited: its plate is sized from the text
  // it carries, so a changed span changes the plate too.
  while (overlay.children.length > 3 && overlay.lastChild) {
    overlay.removeChild(overlay.lastChild)
  }
  overlay.appendChild(plateLabel(readoutText(view)))
}

/**
 * The closed path of a rectangle, for the even-odd dimming.
 * @param {OverlayRect} rect - The rectangle
 * @returns {string} Path data
 */
function boxPath(rect) {
  return `M${rect.x} ${rect.y}H${rect.x + rect.width}V${rect.y + rect.height}H${rect.x}Z`
}

/**
 * Put a rectangle element where a rectangle says.
 * @param {SVGRectElement} element - The element to place
 * @param {OverlayRect} rect - Where it goes
 */
function sizeRect(element, rect) {
  element.setAttribute('x', String(rect.x))
  element.setAttribute('y', String(rect.y))
  element.setAttribute('width', String(rect.width))
  element.setAttribute('height', String(rect.height))
}

/**
 * Whether two rectangles are the same to within a pixel — close enough that
 * drawing both would only look like a doubled line.
 * @param {OverlayRect} a - One rectangle
 * @param {OverlayRect} b - The other
 * @returns {boolean} True when they coincide
 */
function sameRect(a, b) {
  return Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1 &&
    Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1
}

/**
 * The span readout — of the selection, which is what the analyst is choosing —
 * placed above the resulting view, or below it when that is hard against the
 * top edge of the gram.
 * @param {RegionOverlayView} view - The selection being drawn
 * @returns {SVGTextElement} The readout text element
 */
function readoutText({ rect, view, bounds, freqSpan, timeSpan }) {
  const text = /** @type {SVGTextElement} */ (document.createElementNS(SVG_NS, 'text'))
  const above = view.y - 6
  text.setAttribute('class', 'gram-frame-region-readout')
  text.setAttribute('x', String(rect.x + rect.width / 2))
  text.setAttribute('y', String(above - READOUT_FONT_SIZE < bounds.top
    ? view.y + view.height + READOUT_FONT_SIZE + 4
    : above))
  text.setAttribute('text-anchor', 'middle')
  text.setAttribute('font-size', String(READOUT_FONT_SIZE))
  text.setAttribute('font-family', 'Arial, sans-serif')
  text.setAttribute('font-weight', 'bold')
  text.textContent = regionSpanText(freqSpan, timeSpan)
  return text
}
