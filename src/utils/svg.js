/**
 * SVG utility functions for creating common elements
 */

/**
 * Creates an SVG line element with the specified coordinates and class
 * @param {number} x1 - Starting x coordinate
 * @param {number} y1 - Starting y coordinate
 * @param {number} x2 - Ending x coordinate
 * @param {number} y2 - Ending y coordinate
 * @param {string} className - CSS class name
 * @returns {SVGLineElement} The created line element
 */
export function createSVGLine(x1, y1, x2, y2, className) {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  line.setAttribute('x1', String(x1))
  line.setAttribute('y1', String(y1))
  line.setAttribute('x2', String(x2))
  line.setAttribute('y2', String(y2))
  line.setAttribute('class', className)
  return line
}

/**
 * Creates an SVG text element with the specified position, content, and styling
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {string} textContent - Text content
 * @param {string} className - CSS class name
 * @param {string} [textAnchor='start'] - Text anchor position
 * @returns {SVGTextElement} The created text element
 */
export function createSVGText(x, y, textContent, className, textAnchor = 'start') {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  text.setAttribute('x', String(x))
  text.setAttribute('y', String(y))
  text.setAttribute('text-anchor', textAnchor)
  text.setAttribute('class', className)
  text.textContent = textContent
  return text
}


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
export const TEXT_HALO = {
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


/**
 * Creates an SVG circle element with the specified coordinates and class
 * @param {number} cx - Center x coordinate
 * @param {number} cy - Center y coordinate
 * @param {number} r - Radius
 * @param {string} className - CSS class name
 * @returns {SVGCircleElement} The created circle element
 */
export function createSVGCircle(cx, cy, r, className) {
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  circle.setAttribute('cx', String(cx))
  circle.setAttribute('cy', String(cy))
  circle.setAttribute('r', String(r))
  circle.setAttribute('class', className)
  return circle
}


