/**
 * In-gram text labels for analysis markers (feature 231).
 *
 * A marker's label is drawn as black glyphs inside a white halo — the same
 * treatment the harmonic numbers use — so it reads over both dark and light
 * spectrogram pixels. Marker identity is still carried by the crosshair or
 * symbol colour; the label text deliberately is not colour-coded.
 *
 * Where the label goes is `markerLabelPlacement`'s decision (see
 * `utils/markerLabel.js`, where it stays pure and unit-testable) — including
 * the drop below an upward-pointing triangle, whose apex points at the data
 * above it (issue #242). This module only builds the element, at the font size
 * that rule sizes its gaps from.
 */

/// <reference path="../types.js" />

import { applyTextHalo } from '../utils/svg.js'
import { MARKER_LABEL_FONT_SIZE, markerLabelPlacement } from '../utils/markerLabel.js'

/** SVG namespace for element creation */
const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * Build a marker's label as a detached SVG text element.
 *
 * Returns `null` when the marker carries no label, so the caller draws nothing
 * — labels are absent by default. Callers MUST handle a `null` return.
 *
 * @param {AnalysisMarker} marker - The marker being rendered
 * @param {number} cx - Marker centre X in SVG overlay space
 * @param {number} cy - Marker centre Y in SVG overlay space
 * @param {number} symbolSize - Drawn diameter of the marker's symbol in px
 * @returns {SVGTextElement|null} Detached label element, or `null` when unlabelled
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
  applyTextHalo(text)
  text.textContent = marker.label
  return text
}
