/**
 * White rounded-rectangle plates behind in-gram text labels (issue #243).
 *
 * Every label drawn over the spectrogram — a harmonic or sideband pin number, a
 * cross-cursor's text label — sits on an opaque white plate with rounded
 * corners, and is drawn in black on top of it. This replaces the halo (a white
 * outline stroked behind the glyphs) the labels used to carry: the legacy
 * spectrogram viewer plates its harmonic numbers, and side by side the plate is
 * the easier of the two to read. A halo only whitens the pixels immediately
 * around each stroke, so a noisy gram still shows through the counters of the
 * digits and between them; a plate clears one contiguous rectangle, so the
 * contrast is the same everywhere in the label.
 *
 * Label identity is still NOT colour-coded: the plate is white and the text
 * black whatever colour the feature is, because a coloured label is only legible
 * over part of a gram. The pin's line and symbol carry the colour.
 *
 * The geometry here is pure (numbers in, numbers out) so the placement rules
 * that have to leave room for a plate — `utils/markerLabel.js` and
 * `PinSetMode.labelStackPositions` — can size their gaps from the same
 * constants the renderer draws with, and so the unit lane can cover it without
 * a browser. Only {@link plateLabel} and {@link measureLabelWidth} touch the DOM.
 */

/** SVG namespace for element creation */
const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * Class on the plate rectangle drawn behind a label.
 * @type {string}
 */
const LABEL_PLATE_CLASS = 'gram-frame-label-plate'

/**
 * Class on the group holding a plate and its text.
 * @type {string}
 */
const LABEL_PLATE_GROUP_CLASS = 'gram-frame-label-plated'

/**
 * Plate fill. Opaque white — a translucent plate lets the noise it is there to
 * hide back through, which is the halo's weakness all over again.
 * @type {string}
 */
const LABEL_PLATE_FILL = '#fff'

/**
 * Text colour drawn on the plate.
 * @type {string}
 */
const LABEL_TEXT_FILL = '#000'

/**
 * Horizontal padding (px) between the text's ends and the plate's edges.
 * @type {number}
 */
export const LABEL_PLATE_PADDING_X = 3

/**
 * Corner radius (px) of the plate.
 * @type {number}
 */
const LABEL_PLATE_RADIUS = 3

/**
 * How far the plate rises above the text's baseline, as a fraction of the font
 * size. Bold Arial's cap height is ~0.72 em and its ascent — the top of the box
 * the browser lays the characters out in — is ~0.92 em, so 0.95 em keeps every
 * character a label can hold, digits and accented capitals alike, wholly on the
 * plate rather than clipping the tallest of them at the edge.
 * @type {number}
 */
const PLATE_ABOVE_RATIO = 0.95

/**
 * How far the plate drops below the text's baseline, as a fraction of the font
 * size — enough for the descenders of `g`, `p` and `y` (~0.21 em) plus a hair
 * of padding. Fixed rather than measured per label so every plate in a stack is
 * the same height whatever characters it happens to hold.
 * @type {number}
 */
const PLATE_BELOW_RATIO = 0.3

/**
 * Fallback width of one character as a fraction of the font size, used when the
 * text cannot be measured (no canvas — the unit lane runs in Node). Bold Arial
 * digits are ~0.6 em wide.
 * @type {number}
 */
const FALLBACK_CHAR_WIDTH_RATIO = 0.6

/**
 * How far a plate extends above and below the baseline of the text it carries.
 *
 * Placement rules use this to leave room for the plate rather than for the bare
 * glyphs, so a label still clears the symbol or crosshair it annotates by the
 * gap its author intended.
 *
 * @param {number} fontSize - Label font size in px
 * @returns {{above: number, below: number}} Plate extents in px from the baseline
 */
export function labelPlateExtents(fontSize) {
  // Rounded to half a pixel: the plate's edges land on tidy coordinates, and
  // the placement rules that subtract these from a gap stay free of the
  // floating-point dust that `12 * 0.3` would otherwise leave in every label
  // position.
  return {
    above: roundToHalfPixel(fontSize * PLATE_ABOVE_RATIO),
    below: roundToHalfPixel(fontSize * PLATE_BELOW_RATIO)
  }
}

/**
 * Round a length to the nearest half pixel.
 * @param {number} value - Length in px
 * @returns {number} The length, snapped to a half pixel
 */
function roundToHalfPixel(value) {
  return Math.round(value * 2) / 2
}

/**
 * The plate rectangle for a label, in the same SVG coordinates as the text.
 *
 * @param {Object} label - The label being plated
 * @param {number} label.x - Text anchor X
 * @param {number} label.y - Text baseline Y
 * @param {string} label.textAnchor - SVG `text-anchor` of the text (`start`, `middle` or `end`)
 * @param {number} label.width - Rendered width of the text in px
 * @param {number} label.fontSize - Label font size in px
 * @returns {{x: number, y: number, width: number, height: number}} Plate rectangle
 */
export function labelPlateRect({ x, y, textAnchor, width, fontSize }) {
  const { above, below } = labelPlateExtents(fontSize)
  // Where the text starts, given how it grows from its anchor.
  let left = x
  if (textAnchor === 'middle') {
    left = x - width / 2
  } else if (textAnchor === 'end') {
    left = x - width
  }

  return {
    x: left - LABEL_PLATE_PADDING_X,
    y: y - above,
    width: width + LABEL_PLATE_PADDING_X * 2,
    height: above + below
  }
}

/**
 * Canvas 2D context kept for text measurement, or `null` once we know there is
 * none to be had. `undefined` means "not looked for yet".
 * @type {CanvasRenderingContext2D|null|undefined}
 */
let measurementContext

/**
 * The shared canvas context used to measure label text, if this environment has
 * one.
 * @returns {CanvasRenderingContext2D|null} Context for measuring, or null
 */
function textMeasurementContext() {
  if (measurementContext === undefined) {
    try {
      measurementContext = document.createElement('canvas').getContext('2d')
    } catch {
      measurementContext = null
    }
  }
  return measurementContext
}

/**
 * Width in px of a label's text at the font it is drawn in.
 *
 * Measured with a canvas, which gives the same advance widths the SVG text is
 * laid out with, so a plate fits its characters rather than an average of them
 * — a label of capitals is wider than one of digits. Falls back to a
 * character-count estimate where no canvas exists (the Node unit lane) or the
 * measurement comes back empty.
 *
 * @param {string} content - The label text
 * @param {number} fontSize - Font size in px
 * @param {Object} [font] - Font overrides
 * @param {string} [font.fontFamily] - CSS font family the text is drawn in
 * @param {string} [font.fontWeight] - CSS font weight the text is drawn in
 * @returns {number} Text width in px
 */
export function measureLabelWidth(content, fontSize, font = {}) {
  const { fontFamily = 'Arial, sans-serif', fontWeight = 'bold' } = font
  const text = content || ''
  const context = textMeasurementContext()
  if (context) {
    context.font = `${fontWeight} ${fontSize}px ${fontFamily}`
    const measured = context.measureText(text).width
    if (measured > 0) {
      return measured
    }
  }
  return text.length * fontSize * FALLBACK_CHAR_WIDTH_RATIO
}

/**
 * Put an SVG text element on a white rounded plate.
 *
 * Call this LAST, once the text carries its `x`, `y`, `text-anchor`,
 * `font-size` and content: the plate is sized from those, and the text keeps
 * every attribute (and its class) so selectors, tests and CSS still find it
 * where they did before. The returned group is what the caller appends —
 * plate first, text second, so the characters sit on top.
 *
 * @param {SVGTextElement} text - Fully-attributed text element (mutated: fill and stroke)
 * @param {Object} [options] - Plate overrides
 * @param {string} [options.fill] - Plate colour
 * @param {string} [options.textFill] - Glyph colour
 * @returns {SVGGElement} Group holding the plate and the text
 */
export function plateLabel(text, options = {}) {
  const { fill = LABEL_PLATE_FILL, textFill = LABEL_TEXT_FILL } = options

  const fontSize = Number(text.getAttribute('font-size'))
  const width = measureLabelWidth(text.textContent || '', fontSize, {
    fontFamily: text.getAttribute('font-family') || undefined,
    fontWeight: text.getAttribute('font-weight') || undefined
  })
  const box = labelPlateRect({
    x: Number(text.getAttribute('x')),
    y: Number(text.getAttribute('y')),
    textAnchor: text.getAttribute('text-anchor') || 'start',
    width,
    fontSize
  })

  // Black glyphs, and no stroke: the plate behind them is the contrast now, and
  // a leftover halo stroke would thicken the digits over it.
  text.setAttribute('fill', textFill)
  text.removeAttribute('stroke')
  text.removeAttribute('stroke-width')
  text.removeAttribute('paint-order')

  const plate = document.createElementNS(SVG_NS, 'rect')
  plate.setAttribute('class', LABEL_PLATE_CLASS)
  plate.setAttribute('x', String(box.x))
  plate.setAttribute('y', String(box.y))
  plate.setAttribute('width', String(box.width))
  plate.setAttribute('height', String(box.height))
  plate.setAttribute('rx', String(LABEL_PLATE_RADIUS))
  plate.setAttribute('ry', String(LABEL_PLATE_RADIUS))
  plate.setAttribute('fill', fill)

  const group = /** @type {SVGGElement} */ (document.createElementNS(SVG_NS, 'g'))
  group.setAttribute('class', LABEL_PLATE_GROUP_CLASS)
  group.appendChild(plate)
  group.appendChild(text)
  return group
}
