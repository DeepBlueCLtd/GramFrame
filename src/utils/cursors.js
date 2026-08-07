/**
 * The cursors the pointer takes over the gram.
 *
 * A spectrogram is read *through* the pointer: the analyst is judging the pixel
 * under the hotspot, so anything opaque drawn there defeats the interaction it
 * is meant to support. The platform `grab`/`grabbing` hands are ~32px opaque
 * bitmaps whose hotspot sits in the middle of the palm, which put the glyph on
 * exactly the marker, pin or tonal being aimed at.
 *
 * Feature drags therefore use a corner-bracket cursor instead: four L-shaped
 * marks framing empty space, with nothing drawn on the horizontal or vertical
 * through the hotspot. Those are the two directions a gram carries signal in —
 * tonals and time lines run straight through the cursor uninterrupted, and the
 * marker under it stays visible while it is dragged.
 *
 * Hovering a grabbable feature opens the brackets; dragging closes them in and
 * thickens them, so the gesture reads as gripping without a colour change that
 * could collide with a marker's own colour (markers can be any colour, green
 * and yellow included).
 *
 * Panning keeps the hand: there is no target under the pointer to obscure, and
 * the hand is the honest metaphor for dragging the whole viewport.
 */

/**
 * Which cursor a drag phase calls for.
 *
 * - `idle` — over the gram with nothing grabbable under the pointer
 * - `hover` — over a grabbable feature, no button down
 * - `drag` — a drag is running
 * @typedef {'idle'|'hover'|'drag'} CursorPhase
 */

/**
 * Corner brackets framing a clear 20px square, in a 32x32 box.
 *
 * The arms run along the edges of that square and stop well short of its
 * mid-points, so the centre row and centre column are unpainted across the
 * cursor's full width and height.
 * @type {string[]}
 */
const HOVER_BRACKETS = [
  'M6 12V6h6',
  'M26 12V6h-6',
  'M6 20v6h6',
  'M26 20v6h-6'
]

/**
 * The same brackets closed in to a 14px square, for a drag in progress.
 *
 * The arms are a pixel shorter than the hover set's, not for looks: the drag
 * stroke is thicker, and at equal length its round caps reached across the
 * centre column, clipping any tonal running through the hotspot.
 * @type {string[]}
 */
const DRAG_BRACKETS = [
  'M9 13V9h4',
  'M23 13V9h-4',
  'M9 19v4h4',
  'M23 19v4h-4'
]

/**
 * Build the cursor artwork.
 *
 * Each shape is stroked twice — black underneath, white on top — the halo idiom
 * already used for marker text (`applyTextHalo` in `svg.js`). It is what keeps
 * the cursor legible over the blue field and over a saturated yellow tonal
 * alike, neither of which a single-colour cursor survives.
 * @param {string[]} shapes - Path data for the brackets
 * @param {number} coreWidth - Stroke width of the white core
 * @param {number} haloWidth - Stroke width of the black halo beneath it
 * @returns {string} SVG document source
 */
function bracketSvg(shapes, coreWidth, haloWidth) {
  const body = shapes.map((d) => `<path d="${d}"/>`).join('')
  return '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' +
    '<g fill="none" stroke-linecap="round" stroke-linejoin="round">' +
    `<g stroke="#000000" stroke-opacity="0.9" stroke-width="${haloWidth}">${body}</g>` +
    `<g stroke="#ffffff" stroke-width="${coreWidth}">${body}</g>` +
    '</g></svg>'
}

/**
 * Wrap SVG source as a CSS cursor value with the hotspot at the artwork's
 * centre.
 *
 * The trailing keyword is not decoration: Safari has never reliably accepted
 * SVG data-URI cursors, and a `url()` cursor with no fallback leaves it showing
 * the default arrow. `move` degrades to a platform four-arrow, which is still
 * hollow-centred and still a visible change from the resting crosshair.
 * @param {string} svg - SVG document source, 32x32
 * @returns {string} A CSS `cursor` value
 */
function cursorValue(svg) {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 16 16, move`
}

/**
 * The resting cursor over the gram.
 * @type {string}
 */
export const IDLE_CURSOR = 'crosshair'

/**
 * Over a grabbable feature: open corner brackets.
 *
 * Private, along with its drag counterpart: `featureCursor` is the whole
 * public surface, so callers pick a cursor by naming the phase they are in
 * rather than by knowing which constant goes with which moment.
 * @type {string}
 */
const FEATURE_HOVER_CURSOR = cursorValue(bracketSvg(HOVER_BRACKETS, 2, 4.4))

/**
 * Dragging a feature: the brackets closed in.
 * @type {string}
 */
const FEATURE_DRAG_CURSOR = cursorValue(bracketSvg(DRAG_BRACKETS, 2.6, 5))

/**
 * Pan mode at rest, when there is something to pan.
 * @type {string}
 */
export const PAN_IDLE_CURSOR = 'grab'

/**
 * A pan in progress.
 * @type {string}
 */
export const PAN_DRAG_CURSOR = 'grabbing'

/**
 * The cursor a feature drag takes in a given phase.
 *
 * This is the default every mode gets; a mode with its own opinion supplies a
 * `cursorFor` callback to the drag engine (pan does, to keep the hand).
 * @param {CursorPhase} phase - Which phase the pointer is in
 * @returns {string} A CSS `cursor` value
 */
export function featureCursor(phase) {
  if (phase === 'drag') return FEATURE_DRAG_CURSOR
  if (phase === 'hover') return FEATURE_HOVER_CURSOR
  return IDLE_CURSOR
}
