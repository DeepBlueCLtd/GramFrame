import { describe, test, expect } from 'vitest'
import {
  MAX_VISIBLE_PINS,
  NICE_STEPS,
  chooseSamplingStep,
  sampledHarmonics
} from '../../src/utils/harmonicSampling.js'

/**
 * @fileoverview Unit tests for the pure harmonic sampling helper, exercising
 * the boundary counts, step progression, multiple-anchoring, range bounds, and
 * pan stability described in
 * specs/158-harmonic-pin-sampling/contracts/sampling-algorithm.md.
 * Ported from the retired Playwright-lane copy (spec 164, GF-25).
 */

describe('harmonicSampling pure helper', () => {
  test('exposes the documented constants', () => {
    expect(MAX_VISIBLE_PINS).toBe(25)
    expect(NICE_STEPS).toEqual([1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000])
  })

  test('count exactly at the cap returns step 1 (all pins drawn)', () => {
    // Range [1, 50] contains exactly 50 harmonics == cap.
    const step = chooseSamplingStep(1, MAX_VISIBLE_PINS)
    expect(step).toBe(1)

    const { step: s, harmonics } = sampledHarmonics(1, MAX_VISIBLE_PINS)
    expect(s).toBe(1)
    expect(harmonics.length).toBe(MAX_VISIBLE_PINS)
    expect(harmonics[0]).toBe(1)
    expect(harmonics[harmonics.length - 1]).toBe(MAX_VISIBLE_PINS)
  })

  test('count one past the cap advances the step', () => {
    // Range [1, 51] contains 51 harmonics == cap + 1 -> step must advance.
    const step = chooseSamplingStep(1, MAX_VISIBLE_PINS + 1)
    expect(step).toBeGreaterThan(1)
    expect(NICE_STEPS).toContain(step)

    const { harmonics } = sampledHarmonics(1, MAX_VISIBLE_PINS + 1)
    expect(harmonics.length).toBeLessThanOrEqual(MAX_VISIBLE_PINS)
  })

  test('every drawn harmonic is a multiple of the chosen step and within range', () => {
    const minHarmonic = 1
    const maxHarmonic = 400 // 400 > cap -> thinning required
    const { step, harmonics } = sampledHarmonics(minHarmonic, maxHarmonic)

    expect(step).toBeGreaterThan(1)
    expect(harmonics.length).toBeLessThanOrEqual(MAX_VISIBLE_PINS)
    for (const h of harmonics) {
      expect(h % step).toBe(0)
      expect(h).toBeGreaterThanOrEqual(minHarmonic)
      expect(h).toBeLessThanOrEqual(maxHarmonic)
    }
  })

  test('drawn harmonics form a constant-step arithmetic series', () => {
    const { step, harmonics } = sampledHarmonics(1, 1000)
    expect(harmonics.length).toBeGreaterThan(1)
    for (let i = 1; i < harmonics.length; i++) {
      expect(harmonics[i] - harmonics[i - 1]).toBe(step)
    }
  })

  test('anchoring on multiples is pan-stable across a shifted range', () => {
    // Two ranges wide enough to force the same step; the retained pins in their
    // overlap must be identical (they are anchored on multiples of the step, not
    // on the range start), so panning does not shuffle the pins.
    const a = sampledHarmonics(1, 500)
    const b = sampledHarmonics(101, 600)
    expect(a.step).toBe(b.step)

    const overlapLow = 101
    const overlapHigh = 500
    const inOverlap = (h) => h >= overlapLow && h <= overlapHigh
    const aOverlap = a.harmonics.filter(inOverlap)
    const bOverlap = b.harmonics.filter(inOverlap)
    expect(aOverlap).toEqual(bOverlap)
  })

  test('empty range returns no harmonics', () => {
    const { harmonics } = sampledHarmonics(5, 4)
    expect(harmonics).toEqual([])
  })

  test('a sparse range under the cap draws every harmonic (no thinning)', () => {
    // [3, 12] -> 10 harmonics, well under the cap.
    const { step, harmonics } = sampledHarmonics(3, 12)
    expect(step).toBe(1)
    expect(harmonics).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  test('length never exceeds the cap even for an enormous range', () => {
    const { harmonics } = sampledHarmonics(1, 1_000_000)
    expect(harmonics.length).toBeLessThanOrEqual(MAX_VISIBLE_PINS)
  })
})
