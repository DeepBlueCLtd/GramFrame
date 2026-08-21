import { describe, it, expect } from 'vitest'
import {
  MAX_MARKER_LABEL_LENGTH,
  normalizeMarkerLabel,
  formatMarkerLabelForTable,
  markerLabelPlacement
} from '../../src/utils/markerLabel.js'
import { labelSitsBelowSymbol, SYMBOL_CATALOG } from '../../src/rendering/symbols.js'

/**
 * @fileoverview Unit coverage for feature 231 — cross-cursor labels.
 *
 * Two pure rules live behind the feature and are tested here without a browser:
 * what counts as a label ({@link normalizeMarkerLabel}, and its table
 * abbreviation), and where a label goes relative to the marker it annotates
 * ({@link markerLabelPlacement}). The DOM wiring — the dialog, the table
 * column, the overlay element — is covered in tests/marker-labels.spec.js.
 */

describe('normalizeMarkerLabel', () => {
  it('keeps ordinary text as-is', () => {
    expect(normalizeMarkerLabel('Contact A')).toBe('Contact A')
  })

  it('trims surrounding whitespace', () => {
    expect(normalizeMarkerLabel('  Contact A  ')).toBe('Contact A')
  })

  it('treats empty and whitespace-only input as "no label"', () => {
    expect(normalizeMarkerLabel('')).toBeUndefined()
    expect(normalizeMarkerLabel('   ')).toBeUndefined()
    expect(normalizeMarkerLabel('\t\n ')).toBeUndefined()
  })

  it('treats absent and non-string values as "no label"', () => {
    expect(normalizeMarkerLabel(undefined)).toBeUndefined()
    expect(normalizeMarkerLabel(null)).toBeUndefined()
    expect(normalizeMarkerLabel(42)).toBeUndefined()
    expect(normalizeMarkerLabel({ label: 'x' })).toBeUndefined()
    expect(normalizeMarkerLabel(['x'])).toBeUndefined()
  })

  it('caps an over-long label rather than rejecting it', () => {
    const long = 'x'.repeat(MAX_MARKER_LABEL_LENGTH + 20)
    const result = normalizeMarkerLabel(long)
    expect(result).toHaveLength(MAX_MARKER_LABEL_LENGTH)
    expect(result).toBe('x'.repeat(MAX_MARKER_LABEL_LENGTH))
  })

  it('trims before capping, so padded input is not truncated by its padding', () => {
    const padded = `   ${'a'.repeat(MAX_MARKER_LABEL_LENGTH)}   `
    expect(normalizeMarkerLabel(padded)).toBe('a'.repeat(MAX_MARKER_LABEL_LENGTH))
  })
})

describe('formatMarkerLabelForTable', () => {
  it('yields an empty cell for a marker with no label', () => {
    expect(formatMarkerLabelForTable(undefined)).toBe('')
    expect(formatMarkerLabelForTable(null)).toBe('')
    expect(formatMarkerLabelForTable('   ')).toBe('')
  })

  it('shows a label of five characters or fewer in full', () => {
    expect(formatMarkerLabelForTable('A')).toBe('A')
    expect(formatMarkerLabelForTable('AB12')).toBe('AB12')
    expect(formatMarkerLabelForTable('ABCDE')).toBe('ABCDE')
  })

  it('abbreviates a longer label to its first three characters plus ".."', () => {
    expect(formatMarkerLabelForTable('ABCDEF')).toBe('ABC..')
    expect(formatMarkerLabelForTable('Contact Alpha')).toBe('Con..')
  })

  it('abbreviates on the trimmed length, not the raw one', () => {
    // Five characters once trimmed: shown whole, despite the raw string being longer.
    expect(formatMarkerLabelForTable('  ABCDE  ')).toBe('ABCDE')
  })
})

describe('markerLabelPlacement', () => {
  const CX = 100
  const CY = 80
  const SYMBOL_SIZE = 14

  it('puts a cross marker\'s label in the upper-right quadrant', () => {
    const placement = markerLabelPlacement('cross', CX, CY, SYMBOL_SIZE)

    expect(placement.x).toBeGreaterThan(CX) // right of the vertical arm
    expect(placement.y).toBeLessThan(CY)    // above the horizontal arm
    // `start` anchoring grows the text rightwards, away from the crosshair.
    expect(placement.textAnchor).toBe('start')
  })

  it('centres a shaped marker\'s label above the symbol', () => {
    const placement = markerLabelPlacement('circle', CX, CY, SYMBOL_SIZE)

    expect(placement.x).toBe(CX)
    expect(placement.y).toBeLessThan(CY - SYMBOL_SIZE / 2) // clear of the symbol's top edge
    expect(placement.textAnchor).toBe('middle')
  })

  it('places every shaped symbol above, bar the up-pointing triangle', () => {
    const shaped = ['circle', 'square', 'diamond', 'triangle-down', 'star']
    const expected = markerLabelPlacement('circle', CX, CY, SYMBOL_SIZE)

    for (const symbol of shaped) {
      expect(markerLabelPlacement(symbol, CX, CY, SYMBOL_SIZE)).toEqual(expected)
    }
  })

  // Issue #242: an up-pointing triangle is aimed at the gram above it, so a
  // label there covers the data the analyst was marking.
  it('centres an up-triangle marker\'s label BELOW the symbol', () => {
    const placement = markerLabelPlacement('triangle', CX, CY, SYMBOL_SIZE)

    expect(placement.x).toBe(CX)
    expect(placement.textAnchor).toBe('middle')
    // A whole line of text below the symbol's bottom edge, so the glyphs —
    // which hang above their baseline — start clear of the mark.
    expect(placement.y).toBeGreaterThan(CY + SYMBOL_SIZE / 2 + 12)
  })

  it('leaves the down-pointing triangle\'s label above it', () => {
    // Only the UP triangle points at the space a label would occupy.
    const down = markerLabelPlacement('triangle-down', CX, CY, SYMBOL_SIZE)

    expect(down.y).toBeLessThan(CY - SYMBOL_SIZE / 2)
  })

  it('drops the up-triangle\'s label further for a larger symbol', () => {
    const small = markerLabelPlacement('triangle', CX, CY, 14)
    const large = markerLabelPlacement('triangle', CX, CY, 28)

    expect(large.y).toBeGreaterThan(small.y)
    expect(large.y - small.y).toBe((28 - 14) / 2)
  })

  it('lifts the label further for a larger symbol', () => {
    const small = markerLabelPlacement('square', CX, CY, 14)
    const large = markerLabelPlacement('square', CX, CY, 28)

    expect(large.y).toBeLessThan(small.y)
    expect(small.y - large.y).toBe((28 - 14) / 2)
  })

  it('treats an unknown, null or absent symbol as a cross', () => {
    const cross = markerLabelPlacement('cross', CX, CY, SYMBOL_SIZE)

    expect(markerLabelPlacement('pentagon', CX, CY, SYMBOL_SIZE)).toEqual(cross)
    expect(markerLabelPlacement(null, CX, CY, SYMBOL_SIZE)).toEqual(cross)
    expect(markerLabelPlacement(undefined, CX, CY, SYMBOL_SIZE)).toEqual(cross)
  })

  it('ignores the symbol size for a cross, whose geometry is fixed', () => {
    expect(markerLabelPlacement('cross', CX, CY, 14))
      .toEqual(markerLabelPlacement('cross', CX, CY, 40))
  })

  it('follows the marker when it moves', () => {
    const moved = markerLabelPlacement('cross', CX + 25, CY - 10, SYMBOL_SIZE)
    const base = markerLabelPlacement('cross', CX, CY, SYMBOL_SIZE)

    expect(moved.x - base.x).toBe(25)
    expect(moved.y - base.y).toBe(-10)
  })
})

describe('labelSitsBelowSymbol', () => {
  it('is true for the up-pointing triangle alone', () => {
    // The rule the pin stack and the marker label share (issue #242): one
    // symbol points at the space above it, so only that one gives it up.
    const below = SYMBOL_CATALOG.filter(labelSitsBelowSymbol)

    expect(below).toEqual(['triangle'])
  })

  it('treats an unknown, null or absent symbol as the default (above)', () => {
    expect(labelSitsBelowSymbol('pentagon')).toBe(false)
    expect(labelSitsBelowSymbol(null)).toBe(false)
    expect(labelSitsBelowSymbol(undefined)).toBe(false)
  })
})
