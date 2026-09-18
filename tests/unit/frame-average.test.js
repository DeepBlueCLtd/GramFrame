import { describe, test, expect } from 'vitest'
import { averageFrames, averagedRowCount } from '../../src/audio/frameAverage.js'

/**
 * @fileoverview Incoherent frame averaging: the arithmetic is on power, the
 * end of the recording is never dropped, and averaging a noisy grid moves the
 * rows closer to the mean it is an estimate of — which is the whole reason the
 * control exists.
 */

describe('averagedRowCount', () => {
  test('counts a short trailing group as a row of its own', () => {
    expect(averagedRowCount(10, 4)).toBe(3)
    expect(averagedRowCount(12, 4)).toBe(3)
    expect(averagedRowCount(1, 4)).toBe(1)
  })

  test('is the identity at 1', () => {
    expect(averagedRowCount(1249, 1)).toBe(1249)
  })
})

describe('averageFrames', () => {
  test('averages in power, not in decibels', () => {
    // Two frames, 1 and 100. The power mean is 50.5 (17.03 dB); the dB mean
    // would be 10 dB. Averaging the logarithm would be a different statistic.
    const { grid, frames } = averageFrames(Float32Array.from([1, 100]), 2, 1, 2)
    expect(frames).toBe(1)
    expect(grid[0]).toBeCloseTo(50.5, 6)
  })

  test('divides a short trailing group by what it actually holds', () => {
    const { grid, frames } = averageFrames(Float32Array.from([2, 4, 9]), 3, 1, 2)
    expect(frames).toBe(2)
    expect(grid[0]).toBeCloseTo(3, 6)  // (2 + 4) / 2
    expect(grid[1]).toBeCloseTo(9, 6)  // the lone last frame, not 9 / 2
  })

  test('keeps columns independent', () => {
    const grid = Float32Array.from([1, 10, 3, 30])  // 2 frames x 2 columns
    const out = averageFrames(grid, 2, 2, 2)
    expect(Array.from(out.grid)).toEqual([2, 20])
  })

  test('returns the same array at count 1, so the default path copies nothing', () => {
    const grid = Float32Array.from([1, 2, 3, 4])
    expect(averageFrames(grid, 4, 1, 1).grid).toBe(grid)
  })

  test('cuts the spread of a noisy grid towards the mean it estimates', () => {
    // Exponentially distributed power about a mean of 1 — what a single FFT
    // frame of noise actually looks like. Averaging 16 of them should leave a
    // markedly tighter spread.
    let seed = 12345
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    }
    const frames = 1600
    const grid = Float32Array.from({ length: frames }, () => -Math.log(1 - random()))
    /** @param {Float32Array} a - Samples @returns {number} Standard deviation */
    const spread = a => {
      const mean = a.reduce((t, v) => t + v, 0) / a.length
      return Math.sqrt(a.reduce((t, v) => t + (v - mean) ** 2, 0) / a.length)
    }
    const averaged = averageFrames(grid, frames, 1, 16)
    // Variance falls as 1/N, so the standard deviation falls as 1/4.
    expect(spread(averaged.grid)).toBeLessThan(spread(grid) / 3)
  })
})
