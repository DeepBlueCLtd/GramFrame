#!/usr/bin/env node
/**
 * Generates the synthetic demo spectrogram shipped in the release archive.
 *
 * NOT part of any build, test or workflow. It was run once and its output is
 * committed as `sample/demo-gram.png`; that committed file is what
 * `.github/workflows/release.yml` copies into the archive and what
 * `tests/unit/demo-gram.test.js` asserts against. This script exists as the
 * record of how the image was made and as the way to change it: run it by
 * hand and commit the regenerated PNG in the same diff.
 *
 *   node scripts/make-demo-gram.js sample/demo-gram.png
 *
 * Why synthetic rather than a real gram: the release archive was 561KB, of
 * which 482KB was `sample/mock-gram.png` — a photographic-noise image whose
 * only job was to make the double-click demo page render. PNG cannot compress
 * that, and a zip cannot compress a PNG, so 86% of every download was one
 * sample picture. This draws the same analytical features deliberately, and
 * lands in ~9KB.
 *
 * The size comes from respecting how PNG stores rows. GramFrame's axes are
 * x = frequency, y = time, so a constant-frequency tone is a *vertical* line
 * and each row is nearly identical to the row above it — the per-row `Up`
 * filter then zeroes almost everything. The noise floor is therefore generated
 * per column (varying with frequency, near-constant in time). Keep that
 * property if you edit this: per-pixel random noise would multiply the file
 * size several-fold for no analytical gain.
 *
 * Output is deterministic — same input, same bytes — so a regenerated file can
 * be diffed against the committed one.
 */

import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { Buffer } from 'node:buffer'

/** Image size, in pixels. Matches the size test-release.html renders at, so
 * the demo displays 1:1 rather than stretched. */
const WIDTH = 800
const HEIGHT = 400

/** Palette entries. A small palette is most of why the file is ~9KB. */
const COLOURS = 48

/** Data extents the demo page's config table declares. */
const FREQ_MAX_HZ = 50
const TIME_MAX_S = 10

/**
 * Blue -> cyan -> yellow -> red ramp, matching the look of the existing sample
 * grams so the demo reads as a familiar spectrogram.
 * @param {number} t - Position along the ramp, 0..1
 * @returns {number[]} `[r, g, b]`, each 0..255
 */
function rampColour(t) {
  /** @type {Array<[number, number[]]>} */
  const stops = [
    [0.00, [10, 30, 150]],
    [0.35, [20, 60, 210]],
    [0.55, [60, 150, 200]],
    [0.72, [230, 210, 40]],
    [0.88, [240, 140, 20]],
    [1.00, [210, 40, 30]],
  ]
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ca] = stops[i]
    const [b, cb] = stops[i + 1]
    if (t >= a && t <= b) {
      const u = (t - a) / (b - a)
      return ca.map((v, k) => Math.round(v + (cb[k] - v) * u))
    }
  }
  return stops[stops.length - 1][1]
}

const palette = Array.from({ length: COLOURS }, (_, i) => rampColour(i / (COLOURS - 1)))

/**
 * Frequency (Hz) -> column.
 * @param {number} hz - Frequency in Hz
 * @returns {number} Column, in pixels
 */
const freqToX = (hz) => (hz / FREQ_MAX_HZ) * WIDTH
/**
 * Time (s) -> row.
 * @param {number} s - Time in seconds
 * @returns {number} Row, in pixels
 */
const timeToY = (s) => (s / TIME_MAX_S) * HEIGHT

/** Intensity field, 0..1, one entry per pixel. */
const field = new Float32Array(WIDTH * HEIGHT)

/**
 * Draws a constant-frequency tone as a Gaussian-profiled vertical line.
 * `drift` optionally offsets the frequency as a function of time, which is how
 * the Doppler S-curve is drawn.
 * @param {number} hz - Centre frequency in Hz
 * @param {number} amp - Peak intensity, 0..1
 * @param {{width?: number, tStart?: number, tEnd?: number, drift?: ((t: number) => number) | null}} [options] - Profile and extent
 * @returns {void}
 */
function tonal(hz, amp, { width = 1.6, tStart = 0, tEnd = TIME_MAX_S, drift = null } = {}) {
  const yStart = Math.round(timeToY(tStart))
  const yEnd = Math.round(timeToY(tEnd))
  for (let y = yStart; y < yEnd; y++) {
    const centre = freqToX(hz + (drift ? drift((y / HEIGHT) * TIME_MAX_S) : 0))
    const from = Math.max(0, Math.floor(centre - 4 * width))
    const to = Math.min(WIDTH - 1, Math.ceil(centre + 4 * width))
    for (let x = from; x <= to; x++) {
      const d = (x - centre) / width
      const v = amp * Math.exp(-d * d)
      const i = y * WIDTH + x
      if (v > field[i]) field[i] = v
    }
  }
}

/**
 * Draws a broadband transient: a bright band across all frequencies at one time.
 * @param {number} t - Start time in seconds
 * @param {number} amp - Peak intensity, 0..1
 * @param {number} [duration] - Band duration in seconds
 * @returns {void}
 */
function broadband(t, amp, duration = 0.06) {
  const yStart = Math.round(timeToY(t))
  const yEnd = Math.min(HEIGHT - 1, Math.round(timeToY(t + duration)))
  for (let y = yStart; y <= yEnd; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const v = amp * (0.55 + 0.45 * Math.sin(x * 0.11))
      const i = y * WIDTH + x
      if (v > field[i]) field[i] = v
    }
  }
}

// --- 1. Noise floor --------------------------------------------------------
// Per-column, so it varies with frequency but stays near-constant in time.
// A fixed-seed LCG keeps the output byte-identical between runs.
let seed = 12345
const columnNoise = new Float32Array(WIDTH)
for (let x = 0; x < WIDTH; x++) {
  seed = (Math.imul(1103515245, seed) + 12345) & 0x7fffffff
  columnNoise[x] = 0.06 + 0.09 * (((seed >>> 16) % 1000) / 1000)
}
for (let y = 0; y < HEIGHT; y++) {
  const band = 0.02 * Math.sin(y * 0.017)
  for (let x = 0; x < WIDTH; x++) field[y * WIDTH + x] = columnNoise[x] + band
}

// --- 2. Harmonic stack, f0 = 6 Hz (Harmonics mode) -------------------------
for (let n = 1; n <= 8; n++) {
  tonal(6 * n, 0.92 - 0.05 * n, { width: 1.5 + 0.1 * n })
}

// --- 3. Carrier + symmetric sidebands (Sidebands mode) ---------------------
const CARRIER_HZ = 33.5
const SIDEBAND_HZ = 1.2
tonal(CARRIER_HZ, 0.98, { width: 1.3 })
tonal(CARRIER_HZ - SIDEBAND_HZ, 0.62, { width: 1.1 })
tonal(CARRIER_HZ + SIDEBAND_HZ, 0.62, { width: 1.1 })

// --- 4. Doppler S-curve, inflection at t = 5 s (Doppler mode) --------------
tonal(20, 0.95, { width: 1.8, drift: (t) => -2.6 * Math.tanh((t - 5) * 1.1) })

// --- 5. Short isolated tonals (Analysis-mode markers) ----------------------
tonal(44.2, 0.85, { width: 1.4, tStart: 1.2, tEnd: 2.9 })
tonal(11.0, 0.80, { width: 1.4, tStart: 6.4, tEnd: 8.1 })

// --- 6. Broadband transients ----------------------------------------------
broadband(3.1, 0.70)
broadband(7.6, 0.55)

// --- Quantise to palette indices -------------------------------------------
const indices = Buffer.alloc(WIDTH * HEIGHT)
for (let i = 0; i < field.length; i++) {
  indices[i] = Math.max(0, Math.min(COLOURS - 1, Math.round(field[i] * (COLOURS - 1))))
}

// --- PNG encoding ----------------------------------------------------------

/**
 * The PNG Paeth predictor: whichever of left, above and upper-left is closest
 * to their linear estimate.
 * @param {number} a - Byte to the left
 * @param {number} b - Byte above
 * @param {number} c - Byte above-left
 * @returns {number} The predicted byte
 */
function paeth(a, b, c) {
  const pa = Math.abs(b - c)
  const pb = Math.abs(a - c)
  const pc = Math.abs(a + b - 2 * c)
  if (pa <= pb && pa <= pc) return a
  return pb <= pc ? b : c
}

/**
 * Applies the PNG row filter with the lowest sum-of-absolute-differences, the
 * heuristic the spec recommends. On this image the `Up` filter wins nearly
 * everywhere, which is what makes the result small.
 * @param {Buffer} raw - Unfiltered palette indices, one byte per pixel
 * @param {number} width - Image width in pixels
 * @param {number} height - Image height in pixels
 * @returns {Buffer} Filtered rows, each preceded by its filter type
 */
function filterRows(raw, width, height) {
  const out = Buffer.alloc(height * (width + 1))
  let prev = Buffer.alloc(width)
  const candidate = Buffer.alloc(width)
  for (let y = 0; y < height; y++) {
    const row = raw.subarray(y * width, (y + 1) * width)
    let bestType = 0
    let bestCost = Infinity
    let best = null
    for (let type = 0; type < 5; type++) {
      let cost = 0
      for (let x = 0; x < width; x++) {
        const a = x >= 1 ? row[x - 1] : 0
        const b = prev[x]
        const c = x >= 1 ? prev[x - 1] : 0
        let predictor = 0
        if (type === 1) predictor = a
        else if (type === 2) predictor = b
        else if (type === 3) predictor = (a + b) >> 1
        else if (type === 4) predictor = paeth(a, b, c)
        const v = (row[x] - predictor) & 0xff
        candidate[x] = v
        cost += Math.min(v, 256 - v)
      }
      if (cost < bestCost) {
        bestCost = cost
        bestType = type
        best = Buffer.from(candidate)
      }
    }
    out[y * (width + 1)] = bestType
    if (!best) {
      throw new Error(`filterRows: no filter chosen for row ${y}`)
    }
    best.copy(out, y * (width + 1) + 1)
    prev = Buffer.from(row)
  }
  return out
}

/**
 * PNG's CRC-32, over a chunk's type and data.
 * @param {Buffer} buf - Bytes to checksum
 * @returns {number} The unsigned CRC
 */
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return (c ^ 0xffffffff) >>> 0
}

/**
 * Wrap data as a PNG chunk: length, type, data, CRC.
 * @param {string} type - Four-character chunk type
 * @param {Buffer} data - Chunk payload
 * @returns {Buffer} The encoded chunk
 */
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(WIDTH, 0)
ihdr.writeUInt32BE(HEIGHT, 4)
ihdr[8] = 8   // bit depth
ihdr[9] = 3   // colour type 3 = indexed
ihdr[10] = 0  // compression: deflate
ihdr[11] = 0  // filter method 0
ihdr[12] = 0  // non-interlaced

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('PLTE', Buffer.from(palette.flat())),
  chunk('IDAT', deflateSync(filterRows(indices, WIDTH, HEIGHT), { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
])

const target = process.argv[2]
if (!target) {
  console.error('usage: node scripts/make-demo-gram.js <output.png>')
  process.exit(1)
}
writeFileSync(target, png)
console.log(`${target}: ${WIDTH}x${HEIGHT}, ${COLOURS} colours, ${png.length} bytes`)
