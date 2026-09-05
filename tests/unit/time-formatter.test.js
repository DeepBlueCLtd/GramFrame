import { describe, test, expect } from 'vitest'
import { formatTime, formatAxisTime } from '../../src/utils/timeFormatter.js'

/**
 * @fileoverview Unit tests for mm:ss time formatting. Pins the two decisions
 * the implementation makes: fractional seconds are floored (never rounded up,
 * so a cursor at 59.9s reads 00:59, not the impossible 00:60), and minutes do
 * not roll over into hours (an hour-long gram reads 60:00).
 */

describe('formatTime', () => {
  test('zero', () => {
    expect(formatTime(0)).toBe('00:00')
  })

  test('pads single-digit seconds and minutes', () => {
    expect(formatTime(7)).toBe('00:07')
    expect(formatTime(65)).toBe('01:05')
  })

  test('minute boundary', () => {
    expect(formatTime(59)).toBe('00:59')
    expect(formatTime(60)).toBe('01:00')
  })

  test('fractional seconds floor rather than round', () => {
    expect(formatTime(59.999)).toBe('00:59')
    expect(formatTime(90.5)).toBe('01:30')
  })

  test('minutes exceed 59 rather than rolling into hours', () => {
    expect(formatTime(3599)).toBe('59:59')
    expect(formatTime(3600)).toBe('60:00')
    expect(formatTime(7325)).toBe('122:05')
  })
})


describe('formatAxisTime (R9-07)', () => {
  test('a whole-second interval keeps the familiar mm:ss', () => {
    expect(formatAxisTime(0, 1)).toBe('00:00')
    expect(formatAxisTime(65, 5)).toBe('01:05')
    expect(formatAxisTime(3600, 10)).toBe('60:00')
  })

  test('a 2.5 s interval keeps the half-second instead of flooring it away', () => {
    // The exact defect: a 0-10 s gram divided into five ticks, three of which
    // read `00:02`, `00:05`, `00:07` for times 2.5, 5, 7.5.
    expect(formatAxisTime(2.5, 2.5)).toBe('00:02.5')
    expect(formatAxisTime(7.5, 2.5)).toBe('00:07.5')
    expect(formatAxisTime(5, 2.5)).toBe('00:05.0')
  })

  test('sub-second intervals get exactly the precision they need', () => {
    expect(formatAxisTime(4.5, 0.5)).toBe('00:04.5')
    expect(formatAxisTime(0.2, 0.2)).toBe('00:00.2')
    expect(formatAxisTime(65.25, 0.25)).toBe('01:05.25')
    expect(formatAxisTime(63.75, 0.05)).toBe('01:03.75')
  })

  test('floating-point noise does not inflate the precision', () => {
    // 0.1 + 0.2 is 0.30000000000000004, but three tenths is exactly what it
    // means: one decimal place, not seventeen.
    expect(formatAxisTime(1.2, 0.1 + 0.2)).toBe('00:01.2')
  })

  test('precision is capped at milliseconds', () => {
    // An interval that genuinely cannot be written in three places stops
    // there rather than running to the end of the float.
    expect(formatAxisTime(1.23456, 1 / 3)).toBe('00:01.235')
  })

  test('seconds are padded to two digits, decimals and all', () => {
    expect(formatAxisTime(4, 0.5)).toBe('00:04.0')
    expect(formatAxisTime(0, 0.5)).toBe('00:00.0')
  })

  test('negative times keep their sign, as an audio gram before play needs', () => {
    expect(formatAxisTime(-5, 1)).toBe('-00:05')
    expect(formatAxisTime(-0.5, 0.5)).toBe('-00:00.5')
    expect(formatAxisTime(-65.5, 0.5)).toBe('-01:05.5')
  })

  test('a degenerate interval falls back to whole seconds rather than throwing', () => {
    expect(formatAxisTime(7, 0)).toBe('00:07')
    expect(formatAxisTime(7, NaN)).toBe('00:07')
    expect(formatAxisTime(7, -1)).toBe('00:07')
  })
})
