/**
 * In-gram text labels for analysis markers (feature 231).
 *
 * A marker's label is drawn as black glyphs on a white rounded plate — the same
 * treatment the harmonic numbers use (issue #243) — so it reads over both dark
 * and light spectrogram pixels. Marker identity is still carried by the
 * crosshair or symbol colour; the label text deliberately is not colour-coded.
 *
 * Where the label goes is `markerLabelPlacement`'s decision (see
 * `utils/markerLabel.js`, where it stays pure and unit-testable) — including
 * the drop below an upward-pointing triangle, whose apex points at the data
 * above it (issue #242). This module only builds the element, at the font size
 * that rule sizes its gaps from.
 */

/// <reference path="../types.js" />

import { plateLabel } from '../utils/labelPlate.js'
import { MARKER_LABEL_FONT_SIZE, markerLabelPlacement } from '../utils/markerLabel.js'

/** SVG namespace for element creation */
const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * Build a marker's label as a detached SVG group: the white plate and the
 * text drawn on it.
 *
 * Returns `null` when the marker carries no label, so the caller draws nothing
 * — labels are absent by default. Callers MUST handle a `null` return.
 *
 * @param {AnalysisMarker} marker - The marker being rendered
 * @param {number} cx - Marker centre X in SVG overlay space
 * @param {number} cy - Marker centre Y in SVG overlay space
 * @param {number} symbolSize - Drawn diameter of the marker's symbol in px
 * @returns {SVGGElement|null} Detached plate-and-text group, or `null` when unlabelled
 */
export function createMarkerLabel(marker, cx, cy, symbolSize) {
  if (!marker.label) {
    return null
  }

  const { x, y, textAnchor } = markerLabelPlacement(marker.symbol, cx, cy, symbolSize)

  const text = /** @type {SVGTextElement} */ (document.createElementNS(SVG_NS, 'text'))
  text.setAttribute('class', 'gram-frame-marker-label')
  text.setAttribute('data-marker-id', marker.id)
  text.setAttribute('x', String(x))
  text.setAttribute('y', String(y))
  text.setAttribute('text-anchor', textAnchor)
  text.setAttribute('font-size', String(MARKER_LABEL_FONT_SIZE))
  text.setAttribute('font-weight', 'bold')
  text.setAttribute('font-family', 'Arial, sans-serif')
  text.textContent = marker.label
  // Plated last, once the text carries everything the plate is sized from.
  return plateLabel(text)
}
