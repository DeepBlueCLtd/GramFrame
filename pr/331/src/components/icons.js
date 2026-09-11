/**
 * The button glyphs.
 *
 * The control row is a fixed-width column beside the gram, and every mode's
 * buttons share that width. Words fit where a row holds one button; they do not
 * where a row holds four, and Pan's row — the mode button plus zoom out, zoom in
 * and fit — was squeezing "PAN" down to "PA" (issue #310). A glyph says the same
 * thing in a quarter of the width.
 *
 * Drawn as inline SVG rather than set as emoji or a font glyph: emoji render at
 * the platform's whim (colour on one OS, monochrome on another, absent on a
 * third), where these inherit `currentColor` and so follow the button through
 * its normal, active and disabled states like text does.
 *
 * Every icon button still carries its word, in a visually hidden span, so the
 * accessible name is unchanged and a screen reader still hears "Pan".
 */

/** SVG namespace for element creation */
const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * The box every icon is drawn in. One size for all of them, so a glyph's
 * optical weight is a property of the drawing rather than of its viewBox.
 * @type {number}
 */
const ICON_BOX = 24

/**
 * An open hand: pan.
 *
 * The hand is the settled idiom for dragging a viewport — it is what the
 * cursor already becomes over a pannable gram (`utils/cursors.js`), so the
 * button and the pointer now say the same thing.
 *
 * Built from a palm, a thumb and four finger bars rather than one path: at this
 * size the shape is all proportion, and separate primitives are far easier to
 * adjust than the arcs of a combined outline would be.
 * @returns {SVGElement[]} The hand's shapes
 */
function handShapes() {
  const fingers = [
    { x: 7.1, y: 4.5, height: 8.5 },   // index
    { x: 10.2, y: 2.8, height: 10.2 }, // middle
    { x: 13.3, y: 3.8, height: 9.2 },  // ring
    { x: 16.4, y: 6.2, height: 6.8 }   // little
  ]
  const shapes = fingers.map(({ x, y, height }) => rect(x, y, 2.7, height, 1.35))

  // The thumb, angled out of the palm's lower left.
  const thumb = rect(2.6, 11.4, 2.7, 7.6, 1.35)
  thumb.setAttribute('transform', 'rotate(-38 4 15)')
  shapes.push(thumb)

  // The palm last, so it sits over the roots of the fingers and the thumb.
  shapes.push(rect(7.1, 10, 12, 10.6, 4))
  return shapes
}

/**
 * Four corner brackets: fit the whole gram in the view.
 *
 * The frame-with-corners mark is what viewers and editors use for "show it
 * all", and it reads at this size where a word does not.
 * @returns {SVGElement[]} The bracket paths
 */
function fitShapes() {
  return [
    'M4 9V6a2 2 0 0 1 2-2h3',
    'M15 4h3a2 2 0 0 1 2 2v3',
    'M20 15v3a2 2 0 0 1-2 2h-3',
    'M9 20H6a2 2 0 0 1-2-2v-3'
  ].map(d => {
    const path = document.createElementNS(SVG_NS, 'path')
    path.setAttribute('d', d)
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', 'currentColor')
    path.setAttribute('stroke-width', '2.2')
    path.setAttribute('stroke-linecap', 'round')
    path.setAttribute('stroke-linejoin', 'round')
    return path
  })
}

/**
 * A rounded rectangle, filled in the button's own colour.
 * @param {number} x - Left edge
 * @param {number} y - Top edge
 * @param {number} width - Width
 * @param {number} height - Height
 * @param {number} radius - Corner radius
 * @returns {SVGElement} The rectangle
 */
function rect(x, y, width, height, radius) {
  const shape = document.createElementNS(SVG_NS, 'rect')
  shape.setAttribute('x', String(x))
  shape.setAttribute('y', String(y))
  shape.setAttribute('width', String(width))
  shape.setAttribute('height', String(height))
  shape.setAttribute('rx', String(radius))
  shape.setAttribute('fill', 'currentColor')
  return shape
}

/**
 * The catalogue. A name that is not here draws nothing, which is what lets a
 * caller ask for an icon unconditionally and get a word instead.
 * @type {Object<string, function(): SVGElement[]>}
 */
const ICONS = {
  hand: handShapes,
  fit: fitShapes
}

/**
 * Build one icon, or null when the name is not in the catalogue.
 * @param {string|undefined} name - Icon name
 * @returns {SVGSVGElement|null} The icon, ready to append
 */
export function createIcon(name) {
  const build = name ? ICONS[name] : undefined
  if (!build) {
    return null
  }
  const svg = /** @type {SVGSVGElement} */ (document.createElementNS(SVG_NS, 'svg'))
  svg.setAttribute('class', 'gram-frame-icon')
  svg.setAttribute('viewBox', `0 0 ${ICON_BOX} ${ICON_BOX}`)
  // The word beside it is the accessible name; the drawing is decoration.
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  build().forEach(shape => svg.appendChild(shape))
  return svg
}

/**
 * The word an icon stands for, hidden from the page but not from the
 * accessibility tree — or from a test selecting the button by its name.
 * @param {string} text - The button's word
 * @returns {HTMLSpanElement} The hidden label
 */
export function createIconLabel(text) {
  const label = document.createElement('span')
  label.className = 'gram-frame-visually-hidden'
  label.textContent = text
  return label
}
