/**
 * The size an image-backed gram is drawn at, as arithmetic (issue #345). Pure,
 * so the unit lane covers every sizing; `components/imageSizing.js` measures
 * the room and applies the answer.
 */

// The legacy cap: images wider than this are scaled down to it.
const LEGACY_MAX_WIDTH = 1200

/**
 * The size an image is drawn at, before zoom and expand.
 *
 * `legacy` keeps one image pixel per CSS pixel and caps the width at 1200,
 * whatever room there is. `native` keeps one image pixel per CSS pixel and
 * `screen` one per screen pixel; both only ever shrink, aspect kept, to fit the
 * available width.
 * @param {{width: number, height: number}} source - The image file's pixel size
 * @param {string} sizing - `legacy`, `native` or `screen`
 * @param {{availableWidth: number, pixelRatio: number}} room - The width the
 *   image area has, in CSS pixels (0 when unmeasurable), and the screen pixels
 *   per CSS pixel
 * @returns {{width: number, height: number}} The base size, in CSS pixels
 */
export function fitImageSize(source, sizing, room) {
  const { width, height } = source
  if (sizing === 'legacy') {
    if (width <= LEGACY_MAX_WIDTH) return { width, height }
    return { width: LEGACY_MAX_WIDTH, height: Math.round(height * LEGACY_MAX_WIDTH / width) }
  }
  const ratio = sizing === 'screen' && room.pixelRatio > 0 ? room.pixelRatio : 1
  const fits = !(room.availableWidth > 0) || width / ratio <= room.availableWidth
  const scale = fits ? 1 / ratio : room.availableWidth / width
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  }
}
