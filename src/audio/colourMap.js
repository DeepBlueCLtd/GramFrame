/**
 * The spectrogram's colours (spec 168, D5).
 *
 * Two 256-entry lookups from display level to RGB — the colour table, and a
 * grey ramp for an analyst comparing the picture with a legacy renderer that
 * only ever drew grey shades — and the pixel layout that applies one of them
 * with the newest frame on the top row. Pure, and split from `gramImage.js`
 * so all of it can be pinned in the unit lane without a canvas.
 */

/**
 * The colour maps a gram can be painted with, as named by the `colour-map`
 * config row and `player.analysis.colourMap`. `colour` is the default and the
 * painting the player always did.
 * @type {ReadonlyArray<ColourMapName>}
 */
export const COLOUR_MAPS = Object.freeze(['colour', 'grey'])

/** @typedef {'colour'|'grey'} ColourMapName */

/**
 * The colour lookup: 256 entries, level 0 (quietest) to 255 (loudest).
 *
 * Piecewise-linear through five stops chosen against `sample/mock-gram.png`:
 * a blue field, tonals rising through yellow to orange, the strongest red.
 * @type {Uint8Array} Flat `[r, g, b, r, g, b, …]`, 768 bytes
 */
const COLOUR_LUT = buildLut([
  [0.00, [0, 0, 110]],
  [0.45, [30, 70, 210]],
  [0.68, [225, 215, 40]],
  [0.88, [255, 140, 0]],
  [1.00, [220, 20, 20]]
])

/**
 * The grey ramp: black at level 0, white at 255, and nothing in between but
 * the level itself. A straight ramp rather than a desaturation of the colour
 * table, because that table's brightness is not monotonic — yellow is lighter
 * than the red above it — and a grey gram must never paint a louder point
 * darker than a quieter one.
 * @type {Uint8Array} Flat `[r, g, b, …]`, 768 bytes
 */
const GREY_LUT = buildLut([
  [0.00, [0, 0, 0]],
  [1.00, [255, 255, 255]]
])

/**
 * The lookup a named map paints with.
 * @param {ColourMapName} map - `colour` or `grey`
 * @returns {Uint8Array} 768 bytes
 */
function lutFor(map) {
  return map === 'grey' ? GREY_LUT : COLOUR_LUT
}

/**
 * Interpolate colour stops into a 256-entry table.
 * @param {Array<[number, [number, number, number]]>} stops - `[position 0..1, [r, g, b]]`, ascending
 * @returns {Uint8Array} 768 bytes
 */
function buildLut(stops) {
  const lut = new Uint8Array(256 * 3)
  for (let i = 0; i < 256; i++) {
    const t = i / 255
    let s = 0
    while (s < stops.length - 2 && t > stops[s + 1][0]) s++
    const [p0, c0] = stops[s]
    const [p1, c1] = stops[s + 1]
    const f = p1 === p0 ? 0 : Math.max(0, Math.min(1, (t - p0) / (p1 - p0)))
    for (let ch = 0; ch < 3; ch++) {
      lut[i * 3 + ch] = Math.round(c0[ch] + (c1[ch] - c0[ch]) * f)
    }
  }
  return lut
}

/**
 * Write the levels into RGBA pixels, newest frame at the top.
 *
 * Row 0 of the image is the *last* analysis frame: time increases upward in
 * every GramFrame gram, and `imageToData` maps the image's top row to
 * `timeMax`. Split from {@link paintGram} so the pixel layout is unit-testable
 * without a canvas.
 * @param {Uint8Array} levels - From {@link powerToLevels}
 * @param {number} frames - Rows
 * @param {number} columns - Columns
 * @param {ColourMapName} [map='colour'] - Which lookup to paint with
 * @returns {Uint8ClampedArray} RGBA, `columns × frames × 4`
 */
export function levelsToPixels(levels, frames, columns, map = 'colour') {
  const lut = lutFor(map)
  const pixels = new Uint8ClampedArray(frames * columns * 4)
  for (let f = 0; f < frames; f++) {
    const y = frames - 1 - f
    const rowIn = f * columns
    const rowOut = y * columns * 4
    for (let k = 0; k < columns; k++) {
      const level = levels[rowIn + k] * 3
      const p = rowOut + k * 4
      pixels[p] = lut[level]
      pixels[p + 1] = lut[level + 1]
      pixels[p + 2] = lut[level + 2]
      pixels[p + 3] = 255
    }
  }
  return pixels
}

