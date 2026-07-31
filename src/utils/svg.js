/**
 * SVG text styling utilities.
 */

/**
 * Default halo geometry/colours for in-gram text labels.
 *
 * A halo (also "text casing" or, in GIS, a label buffer) is a contrasting
 * outline drawn behind the glyphs so a label stays legible over an unknown
 * background: the white ring carries the digits over dark spectrogram pixels,
 * the black core carries them over light ones. This replaces colour-coded label
 * text, which is only readable over part of a gram.
 *
 * `width` is ~25% of the 12px label font — thick enough to survive over noisy
 * pixels without closing up the counters of the digits.
 * @type {{fill: string, haloColor: string, width: number}}
 */
const TEXT_HALO = {
  fill: '#000',
  haloColor: '#fff',
  width: 3
}

/**
 * Apply a halo (contrasting outline) to an SVG text element so it reads against
 * any background.
 *
 * The stroke is painted BEHIND the fill via `paint-order`; without that the
 * stroke straddles the glyph outline and eats half of each letterform. All
 * current browsers support `paint-order` on text (Chrome 35+, Firefox 60+,
 * Safari 8+); older engines still show the text, just with thinner-looking
 * glyphs, so no duplicate-text-node fallback is drawn.
 *
 * Set as presentation attributes (not CSS) so the halo travels with the element
 * wherever it is rendered, while remaining overridable by a stylesheet.
 *
 * @param {SVGTextElement} text - Text element to style (mutated in place)
 * @param {Object} [options] - Halo overrides
 * @param {string} [options.fill] - Glyph colour (the halo's core)
 * @param {string} [options.haloColor] - Outline colour drawn behind the glyphs
 * @param {number} [options.width] - Outline width in px (total, centred on the glyph outline)
 * @returns {SVGTextElement} The same element, for chaining
 */
export function applyTextHalo(text, options = {}) {
  const { fill = TEXT_HALO.fill, haloColor = TEXT_HALO.haloColor, width = TEXT_HALO.width } = options
  text.setAttribute('fill', fill)
  text.setAttribute('stroke', haloColor)
  text.setAttribute('stroke-width', String(width))
  // Round joins keep the outline smooth at sharp glyph corners.
  text.setAttribute('stroke-linejoin', 'round')
  // Paint the halo behind the glyphs so the letterforms stay full-weight.
  text.setAttribute('paint-order', 'stroke fill')
  return text
}


