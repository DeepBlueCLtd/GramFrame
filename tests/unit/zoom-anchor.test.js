// @vitest-environment node
/**
 * Unit lane for the zoom anchor arithmetic.
 *
 * "The point under the mouse does not move" is a property, not an example, and
 * it is pure arithmetic over the anchor and the level — so it is pinned here
 * across a sweep of positions and levels rather than by a browser drag at one
 * of them. The lurch this replaced was invisible from 1×, where the old
 * assignment happened to be right: only the second notch showed it.
 */
import { describe, it, expect } from 'vitest'
import {
  screenFraction,
  anchorHoldingPoint,
  viewCentre,
  anchorForCentre
} from '../../src/utils/zoomAnchor.js'

/** Anchor/level pairs whose view still lies inside the image at both levels. */
const LEVELS = [1, 1.2, 1.5, 2, 3.6, 10]

describe('anchorHoldingPoint', () => {
  it('keeps the point exactly where it is on screen, at every level pair', () => {
    for (const level of LEVELS) {
      for (const newLevel of LEVELS.filter((l) => l > 1)) {
        for (const anchor of [0, 0.25, 0.5, 0.75, 1]) {
          for (const point of [0.1, 0.3, 0.5, 0.7, 0.9]) {
            const before = screenFraction(point, anchor, level)
            // Only a point that stays reachable can be held: at the gram's edge
            // the clamp wins, and that is asserted separately below.
            if (before < 0 || before > 1) {
              continue
            }
            const held = anchorHoldingPoint(point, anchor, level, newLevel)
            if (held <= 0 || held >= 1) {
              continue
            }
            expect(screenFraction(point, held, newLevel)).toBeCloseTo(before, 10)
          }
        }
      }
    }
  })

  it('anchors on the point itself from 1x, where every point is unzoomed', () => {
    expect(anchorHoldingPoint(0.2, 0.5, 1, 1.2)).toBeCloseTo(0.2, 10)
    expect(anchorHoldingPoint(0.85, 0.5, 1, 4)).toBeCloseTo(0.85, 10)
  })

  it('does not drift when the pointer sits on the current anchor', () => {
    expect(anchorHoldingPoint(0.3, 0.3, 2, 4)).toBeCloseTo(0.3, 10)
  })

  it('holds the second notch after the pointer has moved, where the old rule jumped', () => {
    // One notch at 0.25, then the pointer moves to 0.6 and notches again. The
    // gram under 0.6 must stay put; assigning 0.6 as the anchor instead snaps
    // it back to where it would sit unzoomed, which is the lurch.
    const first = anchorHoldingPoint(0.25, 0.5, 1, 1.2)
    const before = screenFraction(0.6, first, 1.2)
    const second = anchorHoldingPoint(0.6, first, 1.2, 1.44)
    expect(screenFraction(0.6, second, 1.44)).toBeCloseTo(before, 10)
    expect(screenFraction(0.6, 0.6, 1.44)).not.toBeCloseTo(before, 2)
  })

  it('stays within the anchor range, so no blank space shows beside the gram', () => {
    expect(anchorHoldingPoint(0.02, 0.9, 8, 10)).toBeGreaterThanOrEqual(0)
    expect(anchorHoldingPoint(0.98, 0.1, 8, 10)).toBeLessThanOrEqual(1)
  })

  it('recentres at 1x, where the anchor positions nothing', () => {
    expect(anchorHoldingPoint(0.2, 0.8, 1.2, 1)).toBe(0.5)
  })
})

describe('viewCentre and anchorForCentre', () => {
  it('are inverses', () => {
    for (const level of LEVELS.filter((l) => l > 1)) {
      for (const anchor of [0, 0.3, 0.5, 0.8, 1]) {
        expect(anchorForCentre(viewCentre(anchor, level), level)).toBeCloseTo(anchor, 10)
      }
    }
  })

  it('puts the named point at the middle of the view, where that is reachable', () => {
    for (const level of LEVELS.filter((l) => l > 1)) {
      for (const centre of [0.2, 0.5, 0.6, 0.9]) {
        const anchor = anchorForCentre(centre, level)
        // A centre nearer the edge than half a view cannot be centred without
        // blank space beside it; the clamp is the right answer there, not a
        // miss, so the property is asserted on the unclamped cases.
        if (anchor <= 0 || anchor >= 1) {
          continue
        }
        expect(screenFraction(centre, anchor, level)).toBeCloseTo(0.5, 10)
      }
    }
  })

  it('holds the middle across a button step, which the old pass-through did not', () => {
    const anchor = 0.2
    const centre = viewCentre(anchor, 2)
    const stepped = anchorForCentre(centre, 3)
    expect(viewCentre(stepped, 3)).toBeCloseTo(centre, 10)
    // Carrying the anchor through unchanged pulled the middle towards it.
    expect(viewCentre(anchor, 3)).not.toBeCloseTo(centre, 3)
  })

  it('reports the whole image as centred at 1x', () => {
    expect(viewCentre(0.1, 1)).toBe(0.5)
    expect(anchorForCentre(0.1, 1)).toBe(0.5)
  })
})
