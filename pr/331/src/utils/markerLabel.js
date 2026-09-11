/**
 * Marker label rules (feature 231).
 *
 * A marker label is free text an analyst attaches to a cross-cursor. It is
 * optional — a marker carries no label unless one is deliberately entered — so
 * "no label" is represented as `undefined`, never as an empty string, and
 * nothing downstream has to distinguish the two.
 *
 * Everything here is pure — no DOM, no state — which is what lets the unit lane
 * cover it. The dialog, the overlay renderer, the markers table and the storage
 * layer all go through these functions, so the same text is accepted, stored
 * and abbreviated everywhere, and the label lands in the same place every time.
 * Building the actual SVG element is `rendering/labels.js`'s job.
 */

/// <reference path="../types.js" />

import { labelSitsBelowSymbol, resolveSymbolType } from '../rendering/symbols.js'
import { labelPlateExtents, LABEL_PLATE_PADDING_X } from './labelPlate.js'

/**
 * Longest label accepted. Long enough for a ship name or a contact
 * designation, short enough that the on-gram text cannot swamp the image.
 * Enforced both by the dialog's `maxlength` and by `normalizeMarkerLabel`, so a
 * label arriving from storage or the API is bounded too.
 * @type {number}
 */
export const MAX_MARKER_LABEL_LENGTH = 32

/**
 * Longest label shown in full in the markers table's Label column. Above this,
 * the cell is abbreviated (see {@link formatMarkerLabelForTable}) so the column
 * keeps a predictable width.
 * @type {number}
 */
const TABLE_LABEL_FULL_LENGTH = 5

/**
 * How many leading characters survive abbreviation, before the `..` marker.
 * @type {number}
 */
const TABLE_LABEL_HEAD_LENGTH = 3

/**
 * Normalise a label from any source (dialog input, restored record, API caller)
 * to either a usable string or `undefined`.
 *
 * Whitespace-only input, empty input, and non-string values all mean "no
 * label". Surrounding whitespace is trimmed and the result is capped at
 * {@link MAX_MARKER_LABEL_LENGTH}.
 *
 * @param {unknown} raw - Candidate label of unknown integrity
 * @returns {string|undefined} The cleaned label, or `undefined` for "no label"
 */
export function normalizeMarkerLabel(raw) {
  if (typeof raw !== 'string') {
    return undefined
  }
  const trimmed = raw.trim()
  if (trimmed === '') {
    return undefined
  }
  return trimmed.slice(0, MAX_MARKER_LABEL_LENGTH)
}

/**
 * Abbreviate a label for the markers table's Label column.
 *
 * Labels of {@link TABLE_LABEL_FULL_LENGTH} characters or fewer are shown
 * whole; longer ones show their first {@link TABLE_LABEL_HEAD_LENGTH}
 * characters followed by `..`. A marker with no label yields an empty cell.
 *
 * The full text is not lost — it stays on the gram and in the edit dialog.
 *
 * @param {string|null|undefined} label - The marker's label
 * @returns {string} Text for the table cell (empty when there is no label)
 */
export function formatMarkerLabelForTable(label) {
  const normalized = normalizeMarkerLabel(label)
  if (!normalized) {
    return ''
  }
  if (normalized.length <= TABLE_LABEL_FULL_LENGTH) {
    return normalized
  }
  return `${normalized.slice(0, TABLE_LABEL_HEAD_LENGTH)}..`
}

/**
 * Gap in px between a crosshair's arms and the label sitting in the upper-right
 * quadrant. Clears the crosshair's 3px centre dot without pushing the text away
 * from the point it annotates. Measured to the edge of the label's plate, not
 * to the glyphs, so the white rectangle stays out of the crosshair.
 * @type {number}
 */
const QUADRANT_GAP = 5

/**
 * Gap in px between a shaped symbol's edge and the nearest edge of the label's
 * plate. Scales with nothing: the symbol's own size is already in the sum.
 * @type {number}
 */
const ABOVE_SYMBOL_GAP = 4

/**
 * Label font size in px. It also fixes how far the label's plate reaches above
 * and below the baseline, which is what the placement gaps below are measured
 * to.
 *
 * Lives here rather than in `rendering/labels.js` so the placement rule and the
 * element that obeys it read the same number; the renderer imports it back.
 * @type {number}
 */
export const MARKER_LABEL_FONT_SIZE = 12

/**
 * Where a marker's label goes, given what the marker draws.
 *
 * The legacy system's rule, and the reason placement depends on the symbol:
 *   - a `cross` (symbol-less) marker draws a crosshair, whose arms leave four
 *     empty quadrants — the label goes in the upper-right one, clear of both
 *     arms;
 *   - a marker with a shaped symbol has no free quadrant, so the label is
 *     centred above the symbol;
 *   - except an upward-pointing triangle, which is drawn to point at whatever
 *     sits above it (issue #242). A label there covers the very data the
 *     analyst aimed the apex at, so it is centred BELOW the symbol instead.
 *
 * Pure: takes numbers, returns numbers.
 *
 * @param {SymbolType|string|null|undefined} symbol - The marker's symbol style
 * @param {number} cx - Marker centre X in SVG overlay space
 * @param {number} cy - Marker centre Y in SVG overlay space
 * @param {number} symbolSize - Drawn diameter of the marker's symbol in px (ignored for `cross`)
 * @returns {{x: number, y: number, textAnchor: 'start'|'middle'}} Text position and anchor
 */
export function markerLabelPlacement(symbol, cx, cy, symbolSize) {
  // The label sits on a white plate (issue #243), which reaches past the text
  // on every side; every gap below is measured to the plate's edge so the
  // rectangle clears the mark by as much as the bare glyphs used to.
  const plate = labelPlateExtents(MARKER_LABEL_FONT_SIZE)

  if (resolveSymbolType(symbol) === 'cross') {
    // Upper-right quadrant of the crosshair: right of the vertical arm, above
    // the horizontal one. `start` anchoring grows the text away from the arms.
    return {
      x: cx + QUADRANT_GAP + LABEL_PLATE_PADDING_X,
      y: cy - QUADRANT_GAP - plate.below,
      textAnchor: 'start'
    }
  }

  if (labelSitsBelowSymbol(symbol)) {
    // Centred below the symbol, the top of the plate clear of its bottom edge.
    const y = cy + symbolSize / 2 + ABOVE_SYMBOL_GAP + plate.above
    return { x: cx, y, textAnchor: 'middle' }
  }

  // Centred above the symbol, the bottom of the plate clear of its top edge.
  return { x: cx, y: cy - symbolSize / 2 - ABOVE_SYMBOL_GAP - plate.below, textAnchor: 'middle' }
}
