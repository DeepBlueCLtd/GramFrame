import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
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
    // Δf = (101-99)/2 = 1, f₀ = midpoint = 100, default c = 1500 m/s
    // (nominal seawater — the code, the JSDoc and Doppler-Calc.md agree, R9-04).
    expect(calculateDopplerSpeed(fPlus, fMinus)).toBeCloseTo(15, 10)
  })

  test('an explicit f₀ overrides the midpoint', () => {
    // Same Δf, but f₀ = 200 → half the speed of the midpoint case
    const speed = calculateDopplerSpeed(fPlus, fMinus, { time: 15, freq: 200 })
    expect(speed).toBeCloseTo(1500 / 200, 10)
  })

  test('custom speed of sound scales linearly', () => {
    // A value that is not the default, so this still proves the parameter is
    // read rather than accidentally re-asserting the default.
    expect(calculateDopplerSpeed(fPlus, fMinus, null, 1481)).toBeCloseTo(14.81, 10)
  })

  test('speed is reported as a magnitude when f⁺ and f⁻ are swapped', () => {
    const swapped = calculateDopplerSpeed(fMinus, fPlus)
    expect(swapped).toBeCloseTo(15, 10)
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


describe('the speed of sound agrees across code, JSDoc and specification (R9-04)', () => {
  // The defect this replaces was not a wrong number but three different ones:
  // 1481 in the code, 1500 in the function's own JSDoc, and 1500 in
  // Doppler-Calc.md. Whichever value the customer chooses, they must not drift
  // apart again — and only a test that reads all three can say so.
  const EXPECTED_C = 1500

  /**
   * Read a repository file.
   * @param {string} relativePath - Path relative to the repository root
   * @returns {string} File contents
   */
  const readSource = (relativePath) =>
    readFileSync(fileURLToPath(new URL(`../../${relativePath}`, import.meta.url)), 'utf8')

  test('the code constant is the agreed value', () => {
    const source = readSource('src/utils/doppler.js')
    expect(source).toContain(`const DEFAULT_SPEED_OF_SOUND = ${EXPECTED_C}`)
  })

  test('the JSDoc default matches the code constant', () => {
    const source = readSource('src/utils/doppler.js')
    // The signature must not carry a literal of its own to drift from.
    expect(source).toContain('speedOfSound = DEFAULT_SPEED_OF_SOUND')
    expect(source).toMatch(new RegExp(`@param \\{number\\} \\[speedOfSound\\][^\\n]*${EXPECTED_C}`))
  })

  test('the specification states the same value', () => {
    expect(readSource('docs/Doppler-Calc.md')).toContain(`${EXPECTED_C} m/s`)
  })

  test('the specification no longer claims the readout is in m/s', () => {
    const doc = readSource('docs/Doppler-Calc.md')
    // The LED is labelled "Speed (kts)"; the doc used to say m/s.
    expect(doc).toMatch(/Displays computed speed in \*\*knots\*\*/)
  })

  test('the behaviour matches what all three say', () => {
    // The assertions above are textual; this one is the behaviour they claim.
    // Δf = 1 over f₀ = 100 gives exactly c/100.
    expect(calculateDopplerSpeed({ time: 0, freq: 101 }, { time: 1, freq: 99 }))
      .toBeCloseTo(EXPECTED_C / 100, 10)
  })
})
