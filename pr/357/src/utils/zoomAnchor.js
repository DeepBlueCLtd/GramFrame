/**
 * The zoom anchor arithmetic.
 *
 * `zoom.centerX/centerY` are not the centre of the view but the *anchor*: the
 * normalised image point that keeps its **unzoomed** screen position through
 * the transform (`components/svgLayout.js`). At level L an image point p sits
 * at `c + (p − c)·L`, measured from the axes origin in units of the base render
 * size. Every zoom question an analyst has is really a question about which
 * point to hold still, so each one is a solve for the anchor — and those solves
 * live here, pure, rather than inline in `core/viewport.js` where they can only
 * be exercised through a browser.
 */

/**
 * Where a normalised image point is drawn, in units of the base render size
 * from the axes origin. The one statement of the transform the solves below
 * invert.
 * @param {number} point - Normalized image position (0-1) along one axis
 * @param {number} anchor - Current zoom anchor for that axis
 * @param {number} level - Current zoom level
 * @returns {number} Screen position, 0 at the axes origin and 1 at its far edge
 */
export function screenFraction(point, anchor, level) {
  return anchor + (point - anchor) * level
}

/**
 * The anchor that keeps `point` exactly where it is on screen while the zoom
 * level changes — a zoom centred on the mouse, in other words, when `point` is
 * the image point under the pointer.
 *
 * Setting the anchor straight to `point` is only right from 1×, where every
 * point already sits at its unzoomed position. Zoomed in, the point under the
 * cursor is generally somewhere else, and assigning it as the anchor snaps it
 * back to where it *would* be unzoomed: the lurch that made a second wheel
 * notch throw away the first one's aim.
 *
 * Clamped to [0, 1], the range that keeps the view inside the image; at the
 * gram's edge the pointer cannot be held still, and showing blank space beside
 * it would be the worse answer.
 * @param {number} point - Normalized image position (0-1) to hold still
 * @param {number} anchor - Current zoom anchor
 * @param {number} level - Current zoom level
 * @param {number} newLevel - Target zoom level (must be above 1)
 * @returns {number} Anchor for the new level
 */
export function anchorHoldingPoint(point, anchor, level, newLevel) {
  if (newLevel <= 1) {
    return 0.5
  }
  return clamp01((anchor * (1 - level) + point * (level - newLevel)) / (1 - newLevel))
}

/**
 * The normalized image point currently at the middle of the view — the inverse
 * of {@link anchorForCentre}.
 * @param {number} anchor - Current zoom anchor
 * @param {number} level - Current zoom level
 * @returns {number} Normalized image position at the centre of the view
 */
export function viewCentre(anchor, level) {
  if (level <= 1) {
    return 0.5
  }
  return anchor + (0.5 - anchor) / level
}

/**
 * The zoom anchor that puts a given normalised image position at the centre of
 * the visible area.
 *
 * At level L the view spans 1/L of the image starting at `anchor · (1 − 1/L)`,
 * so wanting `centre` in the middle fixes the anchor.
 * @param {number} centre - Desired centre, normalized (0-1) against the base render size
 * @param {number} level - Target zoom level
 * @returns {number} Anchor for `setZoom`
 */
export function anchorForCentre(centre, level) {
  if (level <= 1) {
    return 0.5
  }
  const visibleFraction = 1 / level
  return clamp01((centre - visibleFraction / 2) / (1 - visibleFraction))
}

/**
 * Clamp to the [0, 1] anchor range.
 * @param {number} value - Value to clamp
 * @returns {number} Clamped value
 */
function clamp01(value) {
  return Math.max(0, Math.min(1, value))
}
