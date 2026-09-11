import { describe, test, expect } from 'vitest'
import {
  powerToDecibels,
  normaliseDecibels,
  NORMALISATION_MODES,
  SPLIT_WINDOW_BINS
} from '../../src/audio/normalise.js'

/**
 * @fileoverview The background normalisers. The properties asserted here are
 * the ones an analyst would be comparing them on: whether a line reads the same
 * wherever in the band it lies, and what each estimator does to a tonal that
 * runs the whole length of the recording.
 */

/**
 * A grid with a steep noise floor and tones placed on it.
 * @param {number} frames - Rows
 * @param {number} columns - Columns
 * @param {number[]} toneBins - Where to put a tone
 * @param {number} toneDb - How far above the floor each tone sits
 * @returns {Float32Array} Power grid
 */
function slopedGrid(frames, columns, toneBins, toneDb) {
  const grid = new Float32Array(frames * columns)
  for (let f = 0; f < frames; f++) {
    for (let k = 0; k < columns; k++) {
      const floorDb = 60 - 0.2 * k // 20 dB of tilt across 100 bins
      const boost = toneBins.includes(k) ? toneDb : 0
      grid[f * columns + k] = Math.pow(10, (floorDb + boost) / 10)
    }
  }
  return grid
}

describe('powerToDecibels', () => {
  test('is 10 log10, with a floor that keeps zero finite', () => {
    const db = powerToDecibels(Float32Array.from([1, 100, 0]))
    expect(db[0]).toBeCloseTo(0, 6)
    expect(db[1]).toBeCloseTo(20, 6)
    expect(Number.isFinite(db[2])).toBe(true)
    expect(db[2]).toBeLessThan(-100)
  })
})

describe('split-window normalisation', () => {
  const columns = 256
  const frames = 4
  const toneDb = 6

  test('reads a tone at its true height above the local background, anywhere in the band', () => {
    const db = powerToDecibels(slopedGrid(frames, columns, [100, 200], toneDb))
    const out = normaliseDecibels(db, frames, columns, 'split-window')
    // Raw, the two tones differ by the 20 dB of tilt between them.
    expect(db[100] - db[200]).toBeGreaterThan(15)
    // Normalised, both read the same height above their own background.
    expect(out[100]).toBeCloseTo(toneDb, 1)
    expect(out[200]).toBeCloseTo(toneDb, 1)
  })

  test('flattens the noise floor to zero away from the edges', () => {
    const db = powerToDecibels(slopedGrid(frames, columns, [100], toneDb))
    const out = normaliseDecibels(db, frames, columns, 'split-window')
    for (let k = SPLIT_WINDOW_BINS + 5; k < columns - SPLIT_WINDOW_BINS - 5; k++) {
      if (k === 100) continue
      expect(Math.abs(out[k])).toBeLessThan(0.5)
    }
  })

  test('keeps a tonal that runs the whole recording — the case per-bin loses', () => {
    const db = powerToDecibels(slopedGrid(frames, columns, [128], toneDb))
    const split = normaliseDecibels(db, frames, columns, 'split-window')
    const perBin = normaliseDecibels(db, frames, columns, 'per-bin')
    expect(split[128]).toBeCloseTo(toneDb, 1)
    expect(perBin[128]).toBeCloseTo(0, 1)
  })

  test('a strong neighbour does not bury a weak line beside it', () => {
    // Without the second pass the loud tone raises the background its
    // neighbour is measured against, and the weak line reads low.
    const db = powerToDecibels(slopedGrid(frames, columns, [120], 40))
    const withWeak = Float32Array.from(db)
    for (let f = 0; f < frames; f++) withWeak[f * columns + 132] += 5
    const out = normaliseDecibels(withWeak, frames, columns, 'split-window')
    expect(out[132]).toBeGreaterThan(4)
  })

  test('does not fall over on a gram narrower than the window', () => {
    const narrow = powerToDecibels(slopedGrid(2, 5, [2], 6))
    const out = normaliseDecibels(narrow, 2, 5, 'split-window')
    expect(out.length).toBe(10)
    expect(Array.from(out).every(Number.isFinite)).toBe(true)
  })
})

describe('per-bin normalisation', () => {
  test('removes the spectral tilt and keeps an event that is not always there', () => {
    const frames = 64
    const columns = 32
    const grid = slopedGrid(frames, columns, [], 0)
    // One loud frame, across the whole band: a transient, not a tonal.
    for (let k = 0; k < columns; k++) grid[10 * columns + k] *= 100
    const out = normaliseDecibels(powerToDecibels(grid), frames, columns, 'per-bin')
    expect(Math.abs(out[0])).toBeLessThan(0.001)              // tilt gone
    expect(Math.abs(out[columns - 1])).toBeLessThan(0.001)
    expect(out[10 * columns + 5]).toBeCloseTo(20, 1)          // transient intact
  })
})

describe('normaliseDecibels', () => {
  test('hands back the very same array for `none`, so the default path copies nothing', () => {
    const db = powerToDecibels(Float32Array.from([1, 2, 3, 4]))
    expect(normaliseDecibels(db, 2, 2, 'none')).toBe(db)
  })

  test('names the modes the config parser validates against', () => {
    expect(NORMALISATION_MODES).toEqual(['none', 'split-window', 'per-bin'])
  })
})
