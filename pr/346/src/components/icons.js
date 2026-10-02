/**
 * The button glyphs.
 *
 * Two jobs. In the mode rail a glyph rides *beside* the mode's word, so the
 * five tools are told apart at a glance before the word is read. In the rail's
 * footer — zoom out, zoom in, fit — the glyph stands *instead of* the word,
 * because three controls do not fit across the column with words among them
 * (issue #310).
 *
 * Drawn as inline SVG rather than set as emoji or a font glyph: emoji render at
 * the platform's whim (colour on one OS, monochrome on another, absent on a
 * third), where these inherit `currentColor` and so follow the button through
 * its normal, active and disabled states like text does.
 *
 * A button whose glyph replaces its word still carries the word, in a visually
 * hidden span, so the accessible name is unchanged and a screen reader still
 * hears "Fit".
 */

/** SVG namespace for element creation */
const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * The two grids the catalogue is drawn on.
 *
 * The filled marks (the pan hand, the fit brackets) were drawn on a 24-unit
 * grid and are reproduced from this file's first version unchanged. The mode
 * glyphs added with the control-panel redesign are line drawings on a 16-unit
 * grid at stroke 1.3, which is the weight they were specified at; scaling them
 * onto 24 would round the stroke to something else.
 * @type {number}
 */
const ICON_BOX = 24

/**
 * The grid the stroked mode glyphs are drawn on.
 * @type {number}
 */
const LINE_BOX = 16

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
 * A stroked path on the 16-unit grid, in the button's own colour.
 * @param {string} d - Path data
 * @returns {SVGElement} The path
 */
function line(d) {
  const path = document.createElementNS(SVG_NS, 'path')
  path.setAttribute('d', d)
  path.setAttribute('fill', 'none')
  path.setAttribute('stroke', 'currentColor')
  path.setAttribute('stroke-width', String(LINE_STROKE))
  path.setAttribute('stroke-linecap', 'round')
  path.setAttribute('stroke-linejoin', 'round')
  return path
}

/**
 * A filled path on the 16-unit grid.
 * @param {string} d - Path data
 * @returns {SVGElement} The path
 */
function solid(d) {
  const path = document.createElementNS(SVG_NS, 'path')
  path.setAttribute('d', d)
  path.setAttribute('fill', 'currentColor')
  return path
}

/**
 * A dot, filled in the button's own colour.
 * @param {number} cx - Centre X
 * @param {number} cy - Centre Y
 * @param {number} r - Radius
 * @returns {SVGElement} The dot
 */
function dot(cx, cy, r) {
  const shape = document.createElementNS(SVG_NS, 'circle')
  shape.setAttribute('cx', String(cx))
  shape.setAttribute('cy', String(cy))
  shape.setAttribute('r', String(r))
  shape.setAttribute('fill', 'currentColor')
  return shape
}

/**
 * The weight the stroked glyphs are drawn at.
 * @type {number}
 */
const LINE_STROKE = 1.3

/**
 * A ringed crosshair: the Cross Cursor mode.
 *
 * The four arms with a gap at the centre are what the mode draws on the gram,
 * so the button is a miniature of its own output.
 * @returns {SVGElement[]} The crosshair's shapes
 */
function crossCursorShapes() {
  const ring = document.createElementNS(SVG_NS, 'circle')
  ring.setAttribute('cx', '8')
  ring.setAttribute('cy', '8')
  ring.setAttribute('r', '3.4')
  ring.setAttribute('fill', 'none')
  ring.setAttribute('stroke', 'currentColor')
  ring.setAttribute('stroke-width', String(LINE_STROKE))
  return [ring, line('M8 .8v3.4M8 11.8v3.4M.8 8h3.4M11.8 8h3.4')]
}

/**
 * Four vertical lines of unequal height: a harmonic set.
 * @returns {SVGElement[]} The pins
 */
function harmonicsShapes() {
  return [line('M2 3v10M5.5 5v8M9 2v11M12.5 6v7')]
}

/**
 * A tall centre line flanked by shorter pairs: a sideband set about its
 * fundamental. The symmetry is the whole point of the mode, so it is the whole
 * point of the glyph.
 * @returns {SVGElement[]} The lines
 */
function sidebandsShapes() {
  return [line('M8 1.5v13M4.5 5v6M1.5 6.5v3M11.5 5v6M14.5 6.5v3')]
}

/**
 * A falling curve between two marked ends: the doppler shift from f+ to f−.
 * @returns {SVGElement[]} The curve and its endpoints
 */
function dopplerShapes() {
  return [line('M3 14c0-5 10-7 10-12'), dot(3, 14, 1.1), dot(13, 2, 1.1)]
}

/**
 * A bookmark flag.
 * @returns {SVGElement[]} The flag
 */
function bookmarkShapes() {
  const path = line('M4 2h8v12l-4-3.2L4 14z')
  path.setAttribute('stroke-width', '1.4')
  return [path]
}

/**
 * A speaker with two waves: audio output.
 * @returns {SVGElement[]} The speaker
 */
function volumeShapes() {
  return [line('M8 2.5 4.5 5.5H2v5h2.5L8 13.5zM11 5.5a3.4 3.4 0 0 1 0 5M13 3.5a6 6 0 0 1 0 9')]
}

/**
 * The same speaker, crossed through: muted.
 * @returns {SVGElement[]} The muted speaker
 */
function mutedShapes() {
  return [line('M8 2.5 4.5 5.5H2v5h2.5L8 13.5z'), line('M11 6l4 4M15 6l-4 4')]
}

/**
 * A right-pointing triangle: play.
 * @returns {SVGElement[]} The triangle
 */
function playShapes() {
  return [solid('M4 2.5 13 8l-9 5.5z')]
}

/**
 * Two bars: pause.
 * @returns {SVGElement[]} The bars
 */
function pauseShapes() {
  return [solid('M3.5 2.5h3.2v11H3.5zM9.3 2.5h3.2v11H9.3z')]
}

/**
 * A bar with a triangle running back into it: restart.
 * @returns {SVGElement[]} The mark
 */
function restartShapes() {
  return [solid('M4 3h1.6v10H4zM13 3v10L6.4 8z')]
}

/**
 * The catalogue. A name that is not here draws nothing, which is what lets a
 * caller ask for an icon unconditionally and get a word instead.
 *
 * Each entry says which grid it was drawn on, because the two halves of the
 * catalogue were drawn on different ones — see {@link ICON_BOX}.
 * @type {Object<string, {box: number, build: function(): SVGElement[]}>}
 */
const ICONS = {
  hand: { box: ICON_BOX, build: handShapes },
  fit: { box: ICON_BOX, build: fitShapes },
  'cross-cursor': { box: LINE_BOX, build: crossCursorShapes },
  harmonics: { box: LINE_BOX, build: harmonicsShapes },
  sidebands: { box: LINE_BOX, build: sidebandsShapes },
  doppler: { box: LINE_BOX, build: dopplerShapes },
  bookmark: { box: LINE_BOX, build: bookmarkShapes },
  volume: { box: LINE_BOX, build: volumeShapes },
  muted: { box: LINE_BOX, build: mutedShapes },
  play: { box: LINE_BOX, build: playShapes },
  pause: { box: LINE_BOX, build: pauseShapes },
  restart: { box: LINE_BOX, build: restartShapes }
}

/**
 * Build one icon, or null when the name is not in the catalogue.
 * @param {string|undefined} name - Icon name
 * @returns {SVGSVGElement|null} The icon, ready to append
 */
export function createIcon(name) {
  const entry = name ? ICONS[name] : undefined
  if (!entry) {
    return null
  }
  const svg = /** @type {SVGSVGElement} */ (document.createElementNS(SVG_NS, 'svg'))
  svg.setAttribute('class', 'gram-frame-icon')
  svg.setAttribute('viewBox', `0 0 ${entry.box} ${entry.box}`)
  // The word beside it is the accessible name; the drawing is decoration.
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  entry.build().forEach(shape => svg.appendChild(shape))
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
