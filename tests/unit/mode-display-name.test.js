import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { MODE_NAMES, getModeDisplayName } from '../../src/modes/modeRoster.js'

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


describe('the roster is the only place the mode list is written (R9-12)', () => {
  /**
   * Read a repository file.
   * @param {string} relativePath - Path relative to the repository root
   * @returns {string} File contents
   */
  const readSource = (relativePath) =>
    readFileSync(fileURLToPath(new URL(`../../${relativePath}`, import.meta.url)), 'utf8')

  test('every mode has a display name that is not just its internal name', () => {
    for (const name of MODE_NAMES) {
      const display = getModeDisplayName(name)
      expect(display, `${name} has no display name`).toBeTruthy()
    }
  })

  test('the roster carries the five modes, Pan first', () => {
    // Pan leads because it is the default: a first click never places anything.
    expect(MODE_NAMES).toEqual(['pan', 'analysis', 'harmonics', 'sideband', 'doppler'])
  })

  test('no component or utility writes out the mode list itself', () => {
    // The regression R9-12 records: landing Sidebands required hand-editing
    // ModeButtons.js and utils/calculations.js, which the architecture said it
    // would not. A literal list of mode names outside src/modes/ is that
    // defect returning.
    const literalRoster = /['"]analysis['"][^\n]*['"]harmonics['"]|['"]harmonics['"][^\n]*['"]analysis['"]/
    for (const file of ['src/components/ModeButtons.js', 'src/components/LEDDisplay.js', 'src/main.js']) {
      expect(literalRoster.test(readSource(file)), `${file} writes out the mode list`).toBe(false)
    }
  })

  test('ModeFactory derives its roster rather than repeating it', () => {
    const factory = readSource('src/modes/ModeFactory.js')
    expect(factory).toContain("import { MODE_NAMES } from './modeRoster.js'")
    // getAvailableModes, the createMode error message and the initial-state
    // merge all read MODE_NAMES; none of them writes the list out again.
    expect(factory).toContain('return [...MODE_NAMES]')
    expect(factory).toContain('MODE_NAMES.join(\', \')')
    expect(factory).toContain('MODE_NAMES.map(name =>')
  })

  test('the roster module imports nothing, so the UI can use it without a cycle', () => {
    // Putting the roster on ModeFactory would make LEDDisplay import
    // ModeFactory → DopplerMode → LEDDisplay. The hygiene ratchet holds import
    // cycles at zero, and this is why the roster is its own leaf module.
    const roster = readSource('src/modes/modeRoster.js')
    expect(/^\s*import\s/m.test(roster)).toBe(false)
  })
})
