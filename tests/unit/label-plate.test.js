import { describe, it, expect } from 'vitest'
import {
  LABEL_PLATE_PADDING_X,
  labelPlateExtents,
  labelPlateRect,
  measureLabelWidth
} from '../../src/utils/labelPlate.js'

/**
 * @fileoverview Unit coverage for the label plate's geometry (issue #243).
 *
 * The white rounded rectangle behind every on-gram label is sized by pure
 * arithmetic, which is what lets both placement rules that must leave room for
 * it — `markerLabelPlacement` and `PinSetMode.labelStackPositions` — measure
 * their gaps to the plate's edge rather than to the baseline. That arithmetic
 * is tested here; the drawn element is covered in tests/harmonic-label-plate.spec.js
 * and tests/marker-labels.spec.js.
 */

const FONT_SIZE = 12

describe('labelPlateExtents', () => {
  it('reaches further above the baseline than below it', () => {
    const { above, below } = labelPlateExtents(FONT_SIZE)

    // Glyphs hang above their baseline; only descenders drop past it.
    expect(above).toBeGreaterThan(below)
    expect(below).toBeGreaterThan(0)
  })

  it('clears the cap height of the font, and the descenders', () => {
    const { above, below } = labelPlateExtents(FONT_SIZE)

    // Bold Arial: cap height ~0.72 em, descenders ~0.21 em.
    expect(above).toBeGreaterThan(FONT_SIZE * 0.72)
    expect(below).toBeGreaterThan(FONT_SIZE * 0.21)
    // ...without the plate growing taller than a line of text needs
    expect(above + below).toBeLessThan(FONT_SIZE * 1.5)
  })

  it('scales with the font size', () => {
    const small = labelPlateExtents(10)
    const large = labelPlateExtents(20)

    expect(large.above).toBeCloseTo(small.above * 2)
    expect(large.below).toBeCloseTo(small.below * 2)
  })
})

describe('labelPlateRect', () => {
  const WIDTH = 20
  const base = { x: 100, y: 80, width: WIDTH, fontSize: FONT_SIZE }

  it('pads the text horizontally on both sides', () => {
    const rect = labelPlateRect({ ...base, textAnchor: 'start' })

    expect(rect.width).toBe(WIDTH + LABEL_PLATE_PADDING_X * 2)
    expect(rect.x).toBe(base.x - LABEL_PLATE_PADDING_X)
  })

  it('is as tall as the plate reaches either side of the baseline', () => {
    const { above, below } = labelPlateExtents(FONT_SIZE)
    const rect = labelPlateRect({ ...base, textAnchor: 'middle' })

    expect(rect.y).toBe(base.y - above)
    expect(rect.height).toBeCloseTo(above + below)
  })

  it('centres on the anchor for middle-anchored text', () => {
    const rect = labelPlateRect({ ...base, textAnchor: 'middle' })

    expect(rect.x + rect.width / 2).toBeCloseTo(base.x)
  })

  it('ends at the anchor for end-anchored text', () => {
    const rect = labelPlateRect({ ...base, textAnchor: 'end' })

    expect(rect.x + rect.width).toBe(base.x + LABEL_PLATE_PADDING_X)
  })

  it('covers the text whatever the anchor, with room to spare', () => {
    for (const textAnchor of ['start', 'middle', 'end']) {
      const rect = labelPlateRect({ ...base, textAnchor })
      const textLeft = textAnchor === 'start'
        ? base.x
        : textAnchor === 'middle' ? base.x - WIDTH / 2 : base.x - WIDTH

      expect(rect.x).toBeLessThan(textLeft)
      expect(rect.x + rect.width).toBeGreaterThan(textLeft + WIDTH)
    }
  })

  it('follows the label when it moves', () => {
    const moved = labelPlateRect({ ...base, x: base.x + 25, y: base.y - 10, textAnchor: 'middle' })
    const rect = labelPlateRect({ ...base, textAnchor: 'middle' })

    expect(moved.x - rect.x).toBe(25)
    expect(moved.y - rect.y).toBe(-10)
  })
})

describe('measureLabelWidth', () => {
  // No canvas in the Node lane, so these exercise the character-count fallback
  // the browser path falls back to when measurement is unavailable.
  it('grows with the number of characters', () => {
    expect(measureLabelWidth('12', FONT_SIZE)).toBeGreaterThan(measureLabelWidth('1', FONT_SIZE))
  })

  it('grows with the font size', () => {
    expect(measureLabelWidth('12', 24)).toBeGreaterThan(measureLabelWidth('12', 12))
  })

  it('is zero-width for no text, and survives an absent one', () => {
    expect(measureLabelWidth('', FONT_SIZE)).toBe(0)
    // The signature says `string`; these cases exist because callers pass a
    // marker's optional label straight through, so the cast is the point of
    // the test rather than a way around the checker.
    expect(measureLabelWidth(/** @type {any} */ (null), FONT_SIZE)).toBe(0)
    expect(measureLabelWidth(/** @type {any} */ (undefined), FONT_SIZE)).toBe(0)
  })

  it('estimates a plausible width for bold Arial digits', () => {
    // Roughly 0.6 em per digit — enough that a plate sized from it holds them.
    const width = measureLabelWidth('123', FONT_SIZE)

    expect(width).toBeGreaterThan(FONT_SIZE)
    expect(width).toBeLessThan(FONT_SIZE * 3)
  })
})
