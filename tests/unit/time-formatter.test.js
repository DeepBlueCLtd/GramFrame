import { describe, test, expect } from 'vitest'
import { formatTime } from '../../src/utils/timeFormatter.js'

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
