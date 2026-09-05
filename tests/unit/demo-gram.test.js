/**
 * The demo gram shipped in the release archive (sample/demo-gram.png).
 *
 * The archive was 561KB, 86% of it one photographic sample spectrogram. It is
 * now ~88KB because that asset is a small synthetic gram instead. These
 * assertions hold that line from both sides: a size ceiling so a large image
 * cannot creep back in, and feature checks so "make it smaller" cannot quietly
 * degrade the demo into a blank rectangle.
 *
 * Asserted against the committed PNG — the file that actually ships — rather
 * than a fresh run of scripts/make-demo-gram.js, which is a manual tool.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { present } from './helpers/present.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const png = readFileSync(join(repoRoot, 'sample', 'demo-gram.png'))

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const MAX_BYTES = 20000
const WIDTH = 800
const HEIGHT = 400

/** Walks the PNG chunk stream, returning each chunk's type and payload. */
function readChunks(/** @type {any} */ buffer) {
  const chunks = []
  let offset = PNG_SIGNATURE.length
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('latin1', offset + 4, offset + 8)
    chunks.push({ type, data: buffer.subarray(offset + 8, offset + 8 + length) })
    offset += 12 + length
  }
  return chunks
}

const chunks = readChunks(png)
const chunkOfType = (/** @type {any} */ type) => chunks.find((c) => c.type === type)

/** Undoes the per-row PNG filters, returning one palette index per pixel. */
function decodeIndices() {
  const raw = inflateSync(present(chunkOfType('IDAT'), 'an IDAT chunk').data)
  const out = Buffer.alloc(WIDTH * HEIGHT)
  let prev = Buffer.alloc(WIDTH)
  for (let y = 0; y < HEIGHT; y++) {
    const filterType = raw[y * (WIDTH + 1)]
    const row = raw.subarray(y * (WIDTH + 1) + 1, (y + 1) * (WIDTH + 1))
    const decoded = Buffer.alloc(WIDTH)
    for (let x = 0; x < WIDTH; x++) {
      const a = x >= 1 ? decoded[x - 1] : 0
      const b = prev[x]
      const c = x >= 1 ? prev[x - 1] : 0
      let predictor = 0
      if (filterType === 1) predictor = a
      else if (filterType === 2) predictor = b
      else if (filterType === 3) predictor = (a + b) >> 1
      else if (filterType === 4) {
        const pa = Math.abs(b - c)
        const pb = Math.abs(a - c)
        const pc = Math.abs(a + b - 2 * c)
        predictor = pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      decoded[x] = (row[x] + predictor) & 0xff
    }
    decoded.copy(out, y * WIDTH)
    prev = decoded
  }
  return out
}

describe('sample/demo-gram.png', () => {
  it('is a valid PNG at the size the demo page renders', () => {
    expect(png.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true)
    const ihdr = present(chunkOfType('IHDR'), 'an IHDR chunk')
    expect(ihdr.data.readUInt32BE(0)).toBe(WIDTH)
    expect(ihdr.data.readUInt32BE(4)).toBe(HEIGHT)
    expect(ihdr.data[8]).toBe(8) // bit depth
    expect(ihdr.data[9]).toBe(3) // colour type 3 = indexed
  })

  it('is palette-indexed, which is most of why it is small', () => {
    const plte = present(chunkOfType('PLTE'), 'a PLTE chunk')
    expect(plte.data.length % 3).toBe(0)
    expect(plte.data.length / 3).toBeLessThanOrEqual(256)
  })

  it('stays inside the release size budget', () => {
    expect(png.length).toBeLessThan(MAX_BYTES)
  })

  it('shows analytical features, not a flat wash', () => {
    const indices = decodeIndices()
    const distinct = new Set(indices)
    expect(distinct.size).toBeGreaterThan(8)

    // The noise floor quantises to the low end of the 48-entry palette; the
    // tonals, sidebands, Doppler curve and transients sit well above it.
    const bright = indices.reduce((n, v) => (v > 12 ? n + 1 : n), 0)
    expect(bright / indices.length).toBeGreaterThan(0.05)
  })
})
