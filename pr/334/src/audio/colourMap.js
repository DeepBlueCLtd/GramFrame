/**
 * The spectrogram's colours (spec 168, D5).
 *
 * Three 256-entry lookups from display level to RGB — the colour table, a
 * grey ramp for an analyst comparing the picture with a legacy renderer that
 * only ever drew grey shades, and inferno, a perceptually uniform map — and
 * the pixel layout that applies one of them with the newest frame on the top
 * row. Pure, and split from `gramImage.js` so all of it can be pinned in the
 * unit lane without a canvas.
 */

/**
 * The colour maps a gram can be painted with, as named by the `colour-map`
 * config row and `player.analysis.colourMap`. `colour` is the default and the
 * painting the player always did.
 * @type {ReadonlyArray<ColourMapName>}
 */
export const COLOUR_MAPS = Object.freeze(['colour', 'grey', 'inferno'])

/** @typedef {'colour'|'grey'|'inferno'} ColourMapName */

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
 * Inferno: matplotlib's perceptually uniform map, verbatim — black through
 * purple and orange to pale yellow, 256 entries as 8-bit RGB. It keeps what
 * the colour table has over grey (hue boundaries the eye reads as extra
 * contours, so more features stand out) while its brightness rises
 * strictly with level, which the colour table's does not: there, yellow is
 * lighter than the red above it, so "brighter" does not always mean
 * "louder". Data: matplotlib `_cm_listed.py`, `_inferno_data`, CC0
 * (Stéfan van der Walt and Nathaniel Smith).
 * @type {Uint8Array} Flat `[r, g, b, …]`, 768 bytes
 */
const INFERNO_LUT = fromHex(
  '00000401000501010601010802010a02020c02020e03021004031204031405041706041907051b08051d09061f0a0722' +
  '0b07240c08260d08290e092b10092d110a30120a32140b34150b37160b39180c3c190c3e1b0c411c0c431e0c451f0c48' +
  '210c4a230c4c240c4f260c51280b53290b552b0b572d0b592f0a5b310a5c320a5e340a5f3609613809623909633b0964' +
  '3d09653e0966400a67420a68440a68450a69470b6a490b6a4a0c6b4c0c6b4d0d6c4f0d6c510e6c520e6d540f6d550f6d' +
  '57106e59106e5a116e5c126e5d126e5f136e61136e62146e64156e65156e67166e69166e6a176e6c186e6d186e6f196e' +
  '71196e721a6e741a6e751b6e771c6d781c6d7a1d6d7c1d6d7d1e6d7f1e6c801f6c82206c84206b85216b87216b88226a' +
  '8a226a8c23698d23698f24699025689225689326679526679727669827669a28659b29649d29649f2a63a02a63a22b62' +
  'a32c61a52c60a62d60a82e5fa92e5eab2f5ead305dae305cb0315bb1325ab3325ab43359b63458b73557b93556ba3655' +
  'bc3754bd3853bf3952c03a51c13a50c33b4fc43c4ec63d4dc73e4cc83f4bca404acb4149cc4248ce4347cf4446d04545' +
  'd24644d34743d44842d54a41d74b3fd84c3ed94d3dda4e3cdb503bdd513ade5238df5337e05536e15635e25734e35933' +
  'e45a31e55c30e65d2fe75e2ee8602de9612bea632aeb6429eb6628ec6726ed6925ee6a24ef6c23ef6e21f06f20f1711f' +
  'f1731df2741cf3761bf37819f47918f57b17f57d15f67e14f68013f78212f78410f8850ff8870ef8890cf98b0bf98c0a' +
  'f98e09fa9008fa9207fa9407fb9606fb9706fb9906fb9b06fb9d07fc9f07fca108fca309fca50afca60cfca80dfcaa0f' +
  'fcac11fcae12fcb014fcb216fcb418fbb61afbb81dfbba1ffbbc21fbbe23fac026fac228fac42afac62df9c72ff9c932' +
  'f9cb35f8cd37f8cf3af7d13df7d340f6d543f6d746f5d949f5db4cf4dd4ff4df53f4e156f3e35af3e55df2e661f2e865' +
  'f2ea69f1ec6df1ed71f1ef75f1f179f2f27df2f482f3f586f3f68af4f88ef5f992f6fa96f8fb9af9fc9dfafda1fcffa4'
)

/**
 * Decode a hex string into bytes.
 * @param {string} hex - An even-length hex string
 * @returns {Uint8Array} Its bytes
 */
function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return bytes
}

/**
 * The lookup a named map paints with.
 * @param {ColourMapName} map - `colour`, `grey` or `inferno`
 * @returns {Uint8Array} 768 bytes
 */
function lutFor(map) {
  if (map === 'grey') return GREY_LUT
  if (map === 'inferno') return INFERNO_LUT
  return COLOUR_LUT
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

