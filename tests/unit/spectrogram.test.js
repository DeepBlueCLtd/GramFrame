import { describe, test, expect } from 'vitest'
import { planAnalysis, analyse } from '../../src/audio/spectrogram.js'

/**
 * Analyse in one unbounded slice — the synchronous reference the sliced runs
 * are compared against.
 * @param {Float32Array} samples - Mono samples
 * @param {import('../../src/audio/spectrogram.js').AnalysisPlan} plan - Geometry
 * @returns {Promise<Float32Array>} The grid
 */
function analyseSync(samples, plan) {
  return analyse(samples, plan, { sliceMs: Infinity, yieldToLoop: async () => { throw new Error('should not yield') } })
}

/**
 * @fileoverview The analysis planner and frame loop (spec 168, SC-007): a
 * known tone at a known frequency lands in the expected bin, the sliced and
 * synchronous paths agree exactly, and the plan maths matches data-model §4.
 */

/**
 * A mono tone.
 * @param {number} hz - Frequency
 * @param {number} seconds - Length
 * @param {number} rate - Sample rate
 * @returns {Float32Array} Samples
 */
function tone(hz, seconds, rate) {
  const n = Math.round(seconds * rate)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) out[i] = Math.sin(2 * Math.PI * hz * i / rate)
  return out
}

describe('planAnalysis (data-model §4)', () => {
  test('defaults: frames, bin width and the full 0..Nyquist bin range', () => {
    const plan = planAnalysis({ sampleRate: 8000, sampleCount: 8000 * 20, fftSize: 1024, hopSize: 512, freqStart: 0, freqEnd: null })
    expect(plan.frames).toBe(Math.floor((160000 - 1024) / 512) + 1)
    expect(plan.binWidth).toBeCloseTo(7.8125, 6)
    expect(plan.firstBin).toBe(0)
    expect(plan.lastBin).toBe(512)
    expect(plan.columns).toBe(513)
    expect(plan.freqStart).toBe(0)
    expect(plan.freqEnd).toBe(4000)
    expect(plan.clamped).toBe(false)
  })

  test('a frequency crop keeps only whole bins inside the range', () => {
    const plan = planAnalysis({ sampleRate: 8000, sampleCount: 80000, fftSize: 1024, hopSize: 512, freqStart: 100, freqEnd: 1000 })
    expect(plan.firstBin).toBe(13) // ceil(100 / 7.8125) = 13 → 101.5625 Hz
    expect(plan.lastBin).toBe(128) // floor(1000 / 7.8125) = 128 → exactly 1000 Hz
    expect(plan.columns).toBe(116)
    expect(plan.freqStart).toBeCloseTo(101.5625, 6)
    expect(plan.freqEnd).toBe(1000)
  })

  test('freq-end above Nyquist is clamped and flagged', () => {
    const plan = planAnalysis({ sampleRate: 8000, sampleCount: 80000, fftSize: 256, hopSize: 128, freqStart: 0, freqEnd: 20000 })
    expect(plan.clamped).toBe(true)
    expect(plan.freqEnd).toBe(4000)
    expect(plan.lastBin).toBe(128)
  })

  test('refuses a file shorter than one frame, a bad fft-size, a bad hop and an empty range', () => {
    const base = { sampleRate: 8000, sampleCount: 80000, fftSize: 1024, hopSize: 512, freqStart: 0, freqEnd: null }
    expect(() => planAnalysis({ ...base, sampleCount: 1000 })).toThrow(/shorter than one analysis frame/)
    expect(() => planAnalysis({ ...base, fftSize: 1000 })).toThrow(/power of two/)
    expect(() => planAnalysis({ ...base, hopSize: 0 })).toThrow(/hop-size/)
    expect(() => planAnalysis({ ...base, freqStart: 500, freqEnd: 400 })).toThrow(/freq-start/)
    expect(() => planAnalysis({ ...base, freqStart: -1 })).toThrow(/negative/)
    expect(() => planAnalysis({ ...base, freqStart: 100, freqEnd: 101 })).toThrow(/no whole bin/)
  })
})

describe('analyse — a known tone lands in the expected bin (SC-007)', () => {
  test('300 Hz at 8 kHz / 1024 peaks in bin 38 on every frame', async () => {
    const rate = 8000
    const plan = planAnalysis({ sampleRate: rate, sampleCount: rate * 2, fftSize: 1024, hopSize: 512, freqStart: 0, freqEnd: null })
    const grid = await analyseSync(tone(300, 2, rate), plan)
    expect(grid.length).toBe(plan.frames * plan.columns)
    const expectedBin = Math.round(300 / plan.binWidth)
    expect(expectedBin).toBe(38)
    for (let f = 0; f < plan.frames; f++) {
      let best = -1; let bestK = -1
      for (let k = 0; k < plan.columns; k++) {
        const v = grid[f * plan.columns + k]
        if (v > best) { best = v; bestK = k }
      }
      expect(bestK).toBe(expectedBin)
    }
  })

  test('the crop shifts the bin index by firstBin', async () => {
    const rate = 8000
    const plan = planAnalysis({ sampleRate: rate, sampleCount: rate, fftSize: 1024, hopSize: 512, freqStart: 200, freqEnd: 1000 })
    const grid = await analyseSync(tone(300, 1, rate), plan)
    let bestK = -1; let best = -1
    for (let k = 0; k < plan.columns; k++) if (grid[k] > best) { best = grid[k]; bestK = k }
    expect(bestK + plan.firstBin).toBe(38)
  })

  test('silence gives an all-zero grid', async () => {
    const plan = planAnalysis({ sampleRate: 8000, sampleCount: 4096, fftSize: 256, hopSize: 128, freqStart: 0, freqEnd: null })
    const grid = await analyseSync(new Float32Array(4096), plan)
    expect(grid.every(v => v === 0)).toBe(true)
  })
})

describe('analyse — the sliced path', () => {
  test('matches analyseSync exactly and reports monotonic progress ending at 1', async () => {
    const rate = 8000
    const samples = tone(440, 3, rate)
    const plan = planAnalysis({ sampleRate: rate, sampleCount: samples.length, fftSize: 512, hopSize: 256, freqStart: 0, freqEnd: null })
    /** @type {number[]} */
    const progress = []
    let yields = 0
    const sliced = await analyse(samples, plan, {
      sliceMs: 0, // force a yield after every batch
      onProgress: p => progress.push(p),
      yieldToLoop: async () => { yields++ }
    })
    const sync = await analyseSync(samples, plan)
    expect(Array.from(sliced)).toEqual(Array.from(sync))
    expect(yields).toBeGreaterThan(0)
    expect(progress[progress.length - 1]).toBe(1)
    for (let i = 1; i < progress.length; i++) expect(progress[i]).toBeGreaterThanOrEqual(progress[i - 1])
  })
})
