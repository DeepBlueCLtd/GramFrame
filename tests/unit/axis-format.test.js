// @vitest-environment node
/**
 * Unit lane for the shared axis formatting (issue #259, spec 170 FR-005).
 *
 * The rule is that the tick interval decides the precision. It is stated once
 * in `utils/axisFormat.js` and used by both axes and by the region-zoom span
 * readout, so a change to it moves all three together.
 */
import { describe, it, expect } from 'vitest'
import {
  decimalsForInterval,
  formatFrequencyLabel,
  precisionIntervalFor
} from '../../src/utils/axisFormat.js'

describe('decimalsForInterval', () => {
  it('uses whole numbers only when the interval is one', () => {
    expect(decimalsForInterval(1)).toBe(0)
    expect(decimalsForInterval(100)).toBe(0)
  })

  it('keeps a decimal an interval greater than one still needs', () => {
    expect(decimalsForInterval(2.5)).toBe(1)
  })

  it('caps at three, so an interval that never terminates cannot run away', () => {
    expect(decimalsForInterval(1 / 3)).toBe(3)
    expect(decimalsForInterval(0.001)).toBe(3)
  })

  it('treats a missing or nonsensical interval as whole numbers', () => {
    expect(decimalsForInterval(0)).toBe(0)
    expect(decimalsForInterval(NaN)).toBe(0)
  })
})

describe('formatFrequencyLabel', () => {
  it('never prints finer than its tick', () => {
    expect(formatFrequencyLabel(1234.56, 100)).toBe('1235Hz')
    expect(formatFrequencyLabel(3.24, 0.1)).toBe('3.2Hz')
  })
})

describe('precisionIntervalFor', () => {
  it('gives a span two significant figures below its own magnitude', () => {
    expect(precisionIntervalFor(1500)).toBe(100)
    expect(precisionIntervalFor(3.2)).toBeCloseTo(0.1, 12)
  })

  it('falls back to whole units for an empty span', () => {
    expect(precisionIntervalFor(0)).toBe(1)
  })

  it('reads a span at a precision that distinguishes it', () => {
    expect(formatFrequencyLabel(1500, precisionIntervalFor(1500))).toBe('1500Hz')
    expect(formatFrequencyLabel(3.24, precisionIntervalFor(3.24))).toBe('3.2Hz')
  })
})
