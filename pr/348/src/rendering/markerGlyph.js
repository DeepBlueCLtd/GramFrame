/// <reference path="../types.js" />

import { createSymbolMark, resolveSymbolScale, isSymbolLess } from './symbols.js'

const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * Half-length of each crosshair arm, in SVG pixels.
 *
 * Exported because the hit test needs the same number the drawing uses: the
 * grab region drifting from the drawn glyph is exactly the defect this module
 * was pulled out to prevent recurring (issue #273).
 * @type {number}
 */
export const CROSSHAIR_SIZE = 15

/**
 * Base pixel size of a marker's symbol mark when it carries a shaped symbol
 * (feature 161). Roughly matches the crosshair's visual weight. Module-private:
 * callers want the *drawn* size, which is this scaled by the "Large" toggle, so
 * they ask {@link markerSymbolSize} instead.
 * @type {number}
 */
const MARKER_SYMBOL_SIZE = 14

/**
 * Does this marker draw crosshair arms?
 *
 * Only the symbol-less `cross` style does; a circle, square, diamond, triangle
 * or star draws none, so nothing may hit-test against arms that are not there.
 * @param {AnalysisMarker} marker - The marker
 * @returns {boolean} True when the marker renders as a crosshair
 */
export function drawsCrosshair(marker) {
  return isSymbolLess(marker.symbol)
}

/**
 * The drawn size of a marker's symbol mark, honouring the "Large" toggle.
 * @param {AnalysisMarker} marker - The marker
 * @returns {number} Symbol size in SVG pixels
 */
export function markerSymbolSize(marker) {
  return MARKER_SYMBOL_SIZE * resolveSymbolScale(marker)
}

/**
 * Draw a marker's crosshair: two arms and a centre dot.
 * @param {AnalysisMarker} marker - The marker, for its colour
 * @param {number} cx - Centre X in SVG space
 * @param {number} cy - Centre Y in SVG space
 * @returns {SVGElement[]} The arms and the centre dot, detached
 */
function createCrosshair(marker, cx, cy) {
  /**
   * One arm of the crosshair.
   * @param {number} x1 - Start X
   * @param {number} y1 - Start Y
   * @param {number} x2 - End X
   * @param {number} y2 - End Y
   * @returns {SVGElement} The line
   */
  const arm = (x1, y1, x2, y2) => {
    const line = document.createElementNS(SVG_NS, 'line')
    line.setAttribute('x1', String(x1))
    line.setAttribute('y1', String(y1))
    line.setAttribute('x2', String(x2))
    line.setAttribute('y2', String(y2))
    line.setAttribute('stroke', marker.color)
    line.setAttribute('stroke-width', '2')
    line.setAttribute('stroke-linecap', 'round')
    return line
  }

  const circle = document.createElementNS(SVG_NS, 'circle')
  circle.setAttribute('cx', String(cx))
  circle.setAttribute('cy', String(cy))
  circle.setAttribute('r', '3')
  circle.setAttribute('fill', marker.color)
  circle.setAttribute('stroke', '#fff')
  circle.setAttribute('stroke-width', '1')

  return [
    arm(cx - CROSSHAIR_SIZE, cy, cx + CROSSHAIR_SIZE, cy),
    arm(cx, cy - CROSSHAIR_SIZE, cx, cy + CROSSHAIR_SIZE),
    circle
  ]
}

/**
 * The marks a marker is drawn with, detached and in paint order.
 *
 * A marker carrying a shaped symbol is drawn as that colour-coded symbol
 * (feature 161, FR-009); one with the `cross` (symbol-less) style renders as
 * the crosshair. {@link drawsCrosshair} answers which, so the hit test can ask
 * the same question without drawing anything.
 * @param {AnalysisMarker} marker - The marker
 * @param {number} cx - Centre X in SVG space
 * @param {number} cy - Centre Y in SVG space
 * @returns {SVGElement[]} The marks, detached
 */
export function createMarkerMarks(marker, cx, cy) {
  const symbolMark = createSymbolMark(marker.symbol, cx, cy, markerSymbolSize(marker), marker.color)

  if (!symbolMark) {
    return createCrosshair(marker, cx, cy)
  }

  // A marker-specific class, so the harmonics renderer's symbol cleanup (which
  // clears `.gram-frame-harmonic-symbol` from the overlay) never removes a
  // marker's symbol. `data-symbol`/fill from createSymbolMark are preserved.
  symbolMark.setAttribute('class', 'gram-frame-marker-symbol')
  symbolMark.setAttribute('data-marker-id', marker.id)
  return [symbolMark]
}
