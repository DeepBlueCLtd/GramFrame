import { describe, test, expect } from 'vitest'
import { getModeDisplayName } from '../../src/utils/calculations.js'

/**
 * @fileoverview Unit tests for the mode → display-name map. Pins the full
 * roster (notably that the analysis mode is presented to users as
 * "Cross Cursor") and the capitalise-the-internal-name fallback an unknown
 * mode falls through to.
 */

describe('getModeDisplayName', () => {
  test('maps every built-in mode', () => {
    expect(getModeDisplayName('analysis')).toBe('Cross Cursor')
    expect(getModeDisplayName('harmonics')).toBe('Harmonics')
    expect(getModeDisplayName('sideband')).toBe('Sidebands')
    expect(getModeDisplayName('doppler')).toBe('Doppler')
    expect(getModeDisplayName('pan')).toBe('Pan')
  })

  test('falls back to capitalising an unknown mode name', () => {
    expect(getModeDisplayName('waterfall')).toBe('Waterfall')
  })

  test('case-sensitive lookup: a capitalised internal name misses the map', () => {
    // Internal mode names are lower-case everywhere; this documents that the
    // map does not normalise case.
    expect(getModeDisplayName('Analysis')).toBe('Analysis')
  })
})
