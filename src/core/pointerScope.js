/**
 * Which pointer events reach the active mode.
 *
 * One question, asked on every press, move and release: is the pointer over the
 * gram? For almost every mode the answer decides whether the event is delivered
 * at all — a marker has to land on the gram, so an off-image pointer is a
 * mistake, and a running drag is cancelled rather than followed out there.
 *
 * Panning an audio-sourced gram is the exception, and it is why this is a
 * module rather than three lines in `events.js`: scrolling back to the start of
 * a recording *means* bringing blank space into view, so the pan has to keep
 * working over it.
 */

/// <reference path="../types.js" />

import { screenToData, isWithinImage } from '../utils/coordinates.js'

/**
 * Convert a pointer event to data coordinates, or null when it is not over the
 * spectrogram image.
 *
 * The transformation itself lives in the canonical coordinate module, which is
 * already zoom-, expand-, render-size- and margin-aware (FR-002, FR-003). What
 * stays here is only the local convention every caller below relies on: an
 * off-image pointer reads as `null` rather than as an out-of-range point.
 *
 * @param {GramFrame} instance - GramFrame instance
 * @param {MouseEvent} event - Mouse event
 * @returns {ScreenToDataResult|null} Object with svgCoords, imageX, imageY and dataCoords, or null when off-image
 */
export function screenToDataWithZoom(instance, event) {
  const point = screenToData(
    event.clientX,
    event.clientY,
    instance.ui.svg,
    instance.state,
    instance.ui.spectrogramImage
  )

  if (!isWithinImage(point.svg, instance.state, instance.ui.spectrogramImage)) {
    return null
  }

  return {
    svgCoords: point.svg,
    imageX: point.image.x,
    imageY: point.image.y,
    dataCoords: point.data
  }
}

/**
 * Whether the active mode wants pointer events that fall outside the gram.
 *
 * Only panning an audio-sourced gram does. Everything else places or moves a
 * feature, and a feature has to land on the gram — so for those an off-image
 * pointer stays what it has always been: nothing to deliver, and a running drag
 * to cancel.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {boolean} True when off-image pointer events should still be delivered
 */
export function acceptsOffImageDrag(instance) {
  const mode = instance.currentMode
  return !!mode && typeof mode.acceptsOffImageDrag === 'function' && mode.acceptsOffImageDrag()
}

/**
 * The data coordinates under the pointer, with no bounds check.
 *
 * For the one caller that wants a point off the gram: a pan drag reads the
 * pointer's screen delta, not the data under it, so the coordinates are passed
 * for the mode interface's sake rather than used. They are honest values —
 * outside the recording's range, which is exactly where the pointer is.
 * @param {GramFrame} instance - GramFrame instance
 * @param {MouseEvent} event - Mouse event
 * @returns {DataCoordinates} The unclamped data coordinates
 */
export function unboundedDataCoords(instance, event) {
  return screenToData(
    event.clientX,
    event.clientY,
    instance.ui.svg,
    instance.state,
    instance.ui.spectrogramImage
  ).data
}
