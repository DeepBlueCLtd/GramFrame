import { describe, test, expect } from 'vitest'
import { calculateMidpoint, calculateDopplerSpeed } from '../../src/utils/doppler.js'

/**
 * @fileoverview Unit tests for the Doppler speed math (docs/Doppler-Calc.md).
 * Until now this module was exercised only through the Playwright e2e suite;
 * these tests pin the formula itself: v = (c / f₀) × Δf with Δf = (f⁺ − f⁻)/2,
 * f₀ defaulting to the f⁺/f⁻ midpoint, and the result reported as a magnitude.
 */

describe('calculateMidpoint', () => {
  test('averages time and frequency independently', () => {
    const mid = calculateMidpoint({ time: 10, freq: 200 }, { time: 20, freq: 100 })
    expect(mid).toEqual({ time: 15, freq: 150 })
  })

  test('midpoint of coincident points is the point itself', () => {
    const mid = calculateMidpoint({ time: 5, freq: 300 }, { time: 5, freq: 300 })
    expect(mid).toEqual({ time: 5, freq: 300 })
  })
})

describe('calculateDopplerSpeed', () => {
  const fPlus = { time: 10, freq: 101 }
  const fMinus = { time: 20, freq: 99 }

  test('known value: Δf=1 around f₀=100 at the default c gives c/100', () => {
    // Δf = (101-99)/2 = 1, f₀ = midpoint = 100, default c = 1481 m/s
    // (the JSDoc default of 1500 is stale — the code uses 1481).
    expect(calculateDopplerSpeed(fPlus, fMinus)).toBeCloseTo(14.81, 10)
  })

  test('an explicit f₀ overrides the midpoint', () => {
    // Same Δf, but f₀ = 200 → half the speed of the midpoint case
    const speed = calculateDopplerSpeed(fPlus, fMinus, { time: 15, freq: 200 })
    expect(speed).toBeCloseTo(1481 / 200, 10)
  })

  test('custom speed of sound scales linearly', () => {
    expect(calculateDopplerSpeed(fPlus, fMinus, null, 1500)).toBeCloseTo(15, 10)
  })

  test('speed is reported as a magnitude when f⁺ and f⁻ are swapped', () => {
    const swapped = calculateDopplerSpeed(fMinus, fPlus)
    expect(swapped).toBeCloseTo(14.81, 10)
    expect(swapped).toBeGreaterThan(0)
  })

  test('zero shift gives zero speed', () => {
    const speed = calculateDopplerSpeed({ time: 0, freq: 100 }, { time: 1, freq: 100 })
    expect(speed).toBe(0)
  })

  test('f₀ = 0 is unguarded and yields a non-finite speed', () => {
    // Documents current behaviour: nothing prevents division by zero, so a
    // degenerate placement (f⁺ = −f⁻, or an explicit zero f₀) produces
    // Infinity/NaN rather than an error. If a guard is ever added, this test
    // should change deliberately with it.
    const speed = calculateDopplerSpeed(fPlus, fMinus, { time: 0, freq: 0 })
    expect(Number.isFinite(speed)).toBe(false)
  })
})
