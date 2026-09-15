import { describe, test, expect } from 'vitest'
import { powerToLevels, checkGramSize, fitGramSize } from '../../src/audio/gramImage.js'
import { levelsToPixels } from '../../src/audio/colourMap.js'

/** The caps gramImage enforces (research.md §5.2); duplicated here so the test says what it expects. */
const MAX_GRAM_ROWS = 32768
const MAX_GRAM_COLUMNS = 4096

/**
 * @fileoverview The gram image's pure half (spec 168, D5, D6): percentile
 * normalisation, the newest-row-on-top pixel layout, the colour table and the
 * size cap's advice.
 */

describe('powerToLevels', () => {
  test('maps the quietest 5 % to 0 and the loudest to 255, monotonically', () => {
    const grid = new Float32Array(1000)
    for (let i = 0; i < 1000; i++) grid[i] = Math.pow(10, i / 100) // 0 .. 100 dB
    const levels = powerToLevels(grid)
    expect(levels[0]).toBe(0)
    expect(levels[49]).toBe(0)       // still at the floor (5th percentile)
    expect(levels[999]).toBe(255)
    for (let i = 1; i < 1000; i++) expect(levels[i]).toBeGreaterThanOrEqual(levels[i - 1])
  })

  test('silence is all level 0, not NaN', () => {
    const levels = powerToLevels(new Float32Array(64))
    expect(Array.from(levels).every(v => v === 0)).toBe(true)
  })

  test('is deterministic', () => {
    const grid = Float32Array.from({ length: 500 }, (_, i) => (i * 7919) % 101 + 1)
    expect(Array.from(powerToLevels(grid))).toEqual(Array.from(powerToLevels(grid)))
  })
})

describe('the display percentiles', () => {
  /** A grid running 0 to 100 dB in even steps. @type {Float32Array} */
  const ramp = Float32Array.from({ length: 1000 }, (_, i) => Math.pow(10, i / 100))

  test('a floor of 0 brings the quietest cells back off the black', () => {
    // The default clips the bottom 5 % to level 0 — and no later control can
    // undo that, which is why the floor is worth exposing.
    expect(powerToLevels(ramp)[49]).toBe(0)
    expect(powerToLevels(ramp, { floorPercentile: 0 })[49]).toBeGreaterThan(0)
  })

  test('a lower ceiling saturates more of the top', () => {
    const tight = powerToLevels(ramp, { ceilingPercentile: 50 })
    expect(tight[600]).toBe(255)
    expect(powerToLevels(ramp)[600]).toBeLessThan(255)
  })

  test('percentiles that meet do not produce NaN', () => {
    const levels = powerToLevels(ramp, { floorPercentile: 40, ceilingPercentile: 40 })
    expect(Array.from(levels).every(Number.isFinite)).toBe(true)
  })
})

describe('normalisation through powerToLevels', () => {
  test('gives a weak line most of the colour table instead of a sliver of it', () => {
    // A recording whose noise floor falls 60 dB across the band, with a 6 dB
    // line on it. Painted plainly, those 6 dB are 6 parts in the ~60 dB the
    // display range has to cover, so the line gets a handful of levels and
    // reads as barely-there. Normalised, the floor is gone from the range and
    // the line has the table more or less to itself.
    const frames = 8; const columns = 256
    const grid = new Float32Array(frames * columns)
    for (let f = 0; f < frames; f++) {
      for (let k = 0; k < columns; k++) {
        grid[f * columns + k] = Math.pow(10, (60 - 0.23 * k + (k === 160 ? 6 : 0)) / 10)
      }
    }
    /** @param {Uint8Array} levels @returns {number} The line's height above its neighbours */
    const prominence = levels => levels[160] - levels[156]
    const plain = prominence(powerToLevels(grid))
    const normalised = prominence(powerToLevels(grid, { frames, columns, normalisation: 'split-window' }))
    expect(plain).toBeLessThan(40)
    expect(normalised).toBeGreaterThan(plain * 3)
  })
})

describe('levelsToPixels', () => {
  test('puts the last frame on the top row and the first on the bottom', () => {
    const frames = 3; const columns = 2
    const levels = new Uint8Array([0, 0, 128, 128, 255, 255]) // frame 0 quiet … frame 2 loud
    const pixels = levelsToPixels(levels, frames, columns)
    expect(pixels.length).toBe(frames * columns * 4)
    const top = Array.from(pixels.slice(0, 3))
    const bottom = Array.from(pixels.slice((frames - 1) * columns * 4, (frames - 1) * columns * 4 + 3))
    expect(top).toEqual([220, 20, 20])   // level 255: red
    expect(bottom).toEqual([0, 0, 110])  // level 0: dark blue
    expect(pixels[3]).toBe(255) // opaque
  })
})

describe('the colour table (through levelsToPixels)', () => {
  test('runs dark blue → yellow → red, so tonals read as they do on the sample grams', () => {
    /** @param {number} level */
    const rgb = level => Array.from(levelsToPixels(new Uint8Array([level]), 1, 1).slice(0, 3))
    expect(rgb(0)).toEqual([0, 0, 110])
    expect(rgb(255)).toEqual([220, 20, 20])
    const mid = rgb(173)
    expect(mid[0]).toBeGreaterThan(200); expect(mid[1]).toBeGreaterThan(190); expect(mid[2]).toBeLessThan(60)
    // Monotonic in brightness through the blue-to-yellow part
    const lum = (/** @type {number[]} */ c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
    for (let l = 1; l <= 173; l++) expect(lum(rgb(l))).toBeGreaterThanOrEqual(lum(rgb(l - 1)) - 0.5)
  })
})

describe('the grey map (through levelsToPixels)', () => {
  /** @param {number} level */
  const rgb = level => Array.from(levelsToPixels(new Uint8Array([level]), 1, 1, 'grey').slice(0, 3))

  test('is black at the quietest level and white at the loudest', () => {
    expect(rgb(0)).toEqual([0, 0, 0])
    expect(rgb(255)).toEqual([255, 255, 255])
  })

  test('is grey throughout — the three channels never differ', () => {
    for (let l = 0; l < 256; l++) {
      const [r, g, b] = rgb(l)
      expect(g).toBe(r)
      expect(b).toBe(r)
    }
  })

  test('never paints a louder point darker than a quieter one, unlike a desaturated colour table would', () => {
    for (let l = 1; l < 256; l++) expect(rgb(l)[0]).toBeGreaterThanOrEqual(rgb(l - 1)[0])
    // The opaque alpha the colour map writes is written here too
    expect(levelsToPixels(new Uint8Array([7]), 1, 1, 'grey')[3]).toBe(255)
  })

  test('inferno is dark at the quietest level, pale yellow at the loudest, and never darker for louder', () => {
    /** @param {number} level */
    const inferno = level => Array.from(levelsToPixels(new Uint8Array([level]), 1, 1, 'inferno').slice(0, 3))
    expect(inferno(0)).toEqual([0, 0, 4])
    expect(inferno(255)).toEqual([252, 255, 164])
    // matplotlib's own mid-point, so the table is theirs verbatim rather than a fit
    expect(inferno(128)).toEqual([188, 55, 84])
    const lum = (/** @type {number[]} */ c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
    for (let l = 1; l < 256; l++) expect(lum(inferno(l))).toBeGreaterThanOrEqual(lum(inferno(l - 1)))
  })

  test('the default map is still the colour table', () => {
    expect(levelsToPixels(new Uint8Array([255]), 1, 1)).toEqual(levelsToPixels(new Uint8Array([255]), 1, 1, 'colour'))
    expect(Array.from(levelsToPixels(new Uint8Array([255]), 1, 1).slice(0, 3))).toEqual([220, 20, 20])
  })
})

describe('fitGramSize (spec 171, FR-023 to FR-025)', () => {
  const plan = { fftSize: 1024, hopSize: 512, sampleRate: 44100 }
  test('a gram inside the caps is left exactly as asked for', () => {
    expect(fitGramSize(MAX_GRAM_ROWS, MAX_GRAM_COLUMNS, plan)).toBeNull()
  })
  test('a too-tall gram is offered at a coarser hop rather than refused', () => {
    expect(fitGramSize(60000, 512, plan)).toEqual({ parameter: 'hop-size', requested: 512, used: 1024 })
  })
  test('the substituted hop is the one that actually fits, however far over the cap', () => {
    const degraded = fitGramSize(600000, 512, plan)
    if (!degraded) throw new Error('600000 rows must be degraded, not accepted')
    // 600000 frames at hop 512 is 600000 x 512 samples; the hop offered must
    // bring the row count inside the cap, and be a power-of-two multiple.
    expect(Math.ceil(600000 * 512 / degraded.used)).toBeLessThanOrEqual(MAX_GRAM_ROWS)
    expect(degraded.used / 512).toBe(2 ** Math.round(Math.log2(degraded.used / 512)))
  })
  test('a too-wide gram is still refused: no hop rescues it (FR-025)', () => {
    expect(() => fitGramSize(100, 5000, plan)).toThrow(/5000 columns.*fft-size/s)
  })
})

describe('checkGramSize (spec 168, FR-007 — the refusal behind the substitution)', () => {
  const plan = { fftSize: 1024, hopSize: 512, sampleRate: 44100 }
  test('accepts a gram at the caps', () => {
    expect(() => checkGramSize(MAX_GRAM_ROWS, MAX_GRAM_COLUMNS, plan)).not.toThrow()
  })
  test('refuses too many rows and names a hop-size that fits', () => {
    expect(() => checkGramSize(60000, 512, plan)).toThrow(/60000 rows.*hop-size to 1024/s)
  })
  test('refuses too many columns and names fft-size', () => {
    expect(() => checkGramSize(100, 5000, plan)).toThrow(/5000 columns.*fft-size/s)
  })
})
