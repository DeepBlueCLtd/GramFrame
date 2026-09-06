import { describe, test, expect } from 'vitest'
import { settleDisplayRange, isDefaultDisplayRange, displayTransfer, DEFAULT_DISPLAY_RANGE } from '../../src/utils/displayRange.js'

/**
 * @fileoverview The contrast controls' arithmetic (spec 171, US2): the two ends
 * never cross, the defaults reproduce the image, and the transfer the SVG
 * filter is given is the one the pair describes.
 */

describe('settleDisplayRange (FR-012)', () => {
  test('leaves a legal pair alone', () => {
    expect(settleDisplayRange(0.2, 0.8)).toEqual({ floor: 0.2, ceiling: 0.8 })
  })

  test('a floor pushed into the ceiling pushes the ceiling ahead of it', () => {
    const settled = settleDisplayRange(0.9, 0.5, 'floor')
    expect(settled.floor).toBeCloseTo(0.9, 6)
    expect(settled.ceiling).toBeGreaterThan(settled.floor)
  })

  test('a ceiling pushed into the floor pushes the floor down ahead of it', () => {
    const settled = settleDisplayRange(0.5, 0.1, 'ceiling')
    expect(settled.ceiling).toBeCloseTo(0.1, 6)
    expect(settled.floor).toBeLessThan(settled.ceiling)
  })

  test('the ends never coincide, so the image can never go blank', () => {
    for (const at of [0, 0.25, 0.5, 0.75, 1]) {
      for (const moved of /** @type {Array<'floor'|'ceiling'>} */ (['floor', 'ceiling'])) {
        const settled = settleDisplayRange(at, at, moved)
        expect(settled.ceiling - settled.floor).toBeGreaterThan(0)
        expect(settled.floor).toBeGreaterThanOrEqual(0)
        expect(settled.ceiling).toBeLessThanOrEqual(1)
      }
    }
  })

  test('a floor at the very top stops rather than pushing the ceiling off the scale', () => {
    const settled = settleDisplayRange(1, 1, 'floor')
    expect(settled.ceiling).toBe(1)
    expect(settled.floor).toBeLessThan(1)
  })

  test('positions outside the scale, and non-numbers, come back inside it', () => {
    expect(settleDisplayRange(-3, 4)).toEqual({ floor: 0, ceiling: 1 })
    expect(settleDisplayRange(NaN, NaN, 'ceiling')).toEqual(settleDisplayRange(0, 1, 'ceiling'))
  })
})

describe('isDefaultDisplayRange (FR-013)', () => {
  test('recognises the resting pair, so the image is drawn unfiltered', () => {
    expect(isDefaultDisplayRange(DEFAULT_DISPLAY_RANGE)).toBe(true)
    expect(isDefaultDisplayRange({ floor: 0, ceiling: 1 })).toBe(true)
  })

  test('anything moved is not the resting pair', () => {
    expect(isDefaultDisplayRange({ floor: 0.01, ceiling: 1 })).toBe(false)
    expect(isDefaultDisplayRange({ floor: 0, ceiling: 0.99 })).toBe(false)
  })
})

describe('displayTransfer (FR-010)', () => {
  test('the resting pair is the identity', () => {
    const { slope, intercept } = displayTransfer(DEFAULT_DISPLAY_RANGE)
    expect(slope).toBeCloseTo(1, 12)
    expect(intercept).toBeCloseTo(0, 12)
  })

  test('the floor lands at 0 and the ceiling at 1', () => {
    const range = { floor: 0.25, ceiling: 0.75 }
    const { slope, intercept } = displayTransfer(range)
    expect(slope * range.floor + intercept).toBeCloseTo(0, 12)
    expect(slope * range.ceiling + intercept).toBeCloseTo(1, 12)
  })

  test('raising the floor darkens what is below it and expands what is above', () => {
    const flat = displayTransfer({ floor: 0, ceiling: 1 })
    const raised = displayTransfer({ floor: 0.4, ceiling: 1 })
    expect(raised.slope).toBeGreaterThan(flat.slope)
    expect(raised.slope * 0.3 + raised.intercept).toBeLessThan(0)
  })

  test('an illegal pair still produces a finite transfer rather than a division by zero', () => {
    const { slope, intercept } = displayTransfer({ floor: 0.6, ceiling: 0.6 })
    expect(Number.isFinite(slope)).toBe(true)
    expect(Number.isFinite(intercept)).toBe(true)
  })
})
