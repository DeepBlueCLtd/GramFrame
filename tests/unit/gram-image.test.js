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
