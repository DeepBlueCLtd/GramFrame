// @vitest-environment node
/**
 * Unit lane for the region-zoom geometry (spec 170).
 *
 * The two rules an analyst actually feels — the aspect lock (FR-003) and the
 * clamp to the gram's edge (FR-011) — are pure arithmetic over the viewport, so
 * they are pinned here rather than only through a browser drag.
 */
import { describe, it, expect } from 'vitest'
import {
  selectionBounds,
  withinBounds,
  aspectLockedRect,
  rectToRegion
} from '../../src/utils/regionGeometry.js'

/** A 1x zoomed 800x400 gram spanning 0-60s and 0-1000Hz, with the usual margins. */
const viewport = {
  margins: { left: 60, bottom: 50, right: 15, top: 15 },
  imageDetails: { naturalWidth: 800, naturalHeight: 400, renderWidth: 800, renderHeight: 400 },
  config: { timeMin: 0, timeMax: 60, freqMin: 0, freqMax: 1000 },
  rate: 1,
  zoom: { level: 1, centerX: 0.5, centerY: 0.5 }
}

const bounds = selectionBounds(viewport)

describe('selectionBounds', () => {
  it('is the axes area when the image fills it', () => {
    expect(bounds).toEqual({ left: 60, top: 15, right: 860, bottom: 415 })
  })

  it('excludes the axis margins', () => {
    expect(withinBounds({ x: 30, y: 200 }, bounds)).toBe(false)
    expect(withinBounds({ x: 400, y: 200 }, bounds)).toBe(true)
  })
})

describe('aspectLockedRect', () => {
  it('keeps the gram’s proportions when the pointer does not', () => {
    // 400 across but only 20 down: the larger dimension wins and the height follows.
    const rect = aspectLockedRect(viewport, bounds, { x: 100, y: 50 }, { x: 500, y: 70 })
    expect(rect.width / rect.height).toBeCloseTo(800 / 400, 6)
    expect(rect.width).toBeCloseTo(400, 6)
    expect(rect.height).toBeCloseTo(200, 6)
  })

  it('grows up and to the left when the drag does', () => {
    const rect = aspectLockedRect(viewport, bounds, { x: 500, y: 300 }, { x: 300, y: 200 })
    expect(rect.x).toBeCloseTo(300, 6)
    expect(rect.y).toBeCloseTo(200, 6)
    expect(rect.width).toBeCloseTo(200, 6)
    expect(rect.height).toBeCloseTo(100, 6)
  })

  it('shrinks rather than crops when it would leave the gram (FR-011)', () => {
    // Pointer well past the right edge: the box stops at it, still in proportion.
    const rect = aspectLockedRect(viewport, bounds, { x: 700, y: 100 }, { x: 2000, y: 2000 })
    expect(rect.x + rect.width).toBeLessThanOrEqual(bounds.right + 1e-9)
    expect(rect.y + rect.height).toBeLessThanOrEqual(bounds.bottom + 1e-9)
    expect(rect.width / rect.height).toBeCloseTo(800 / 400, 6)
    expect(rect.width).toBeCloseTo(160, 6)
  })

  it('reports the raw pointer movement the click threshold reads (FR-008)', () => {
    const rect = aspectLockedRect(viewport, bounds, { x: 400, y: 200 }, { x: 402, y: 199 })
    expect(rect.movedX).toBeCloseTo(2, 6)
    expect(rect.movedY).toBeCloseTo(-1, 6)
  })
})

describe('rectToRegion', () => {
  it('reads the selection as image pixels and as a data span', () => {
    // The middle quarter of the gram: 200-600 across, 100-300 down.
    const rect = { x: 260, y: 115, width: 400, height: 200 }
    const { region, freqSpan, timeSpan } = rectToRegion(viewport, null, rect)
    expect(region).toEqual({ x: 200, y: 100, width: 400, height: 200 })
    expect(freqSpan).toBeCloseTo(500, 6) // half of 1000Hz
    expect(timeSpan).toBeCloseTo(30, 6) // half of 60s
  })

  it('reads time upward: the top edge is the later time', () => {
    const { timeSpan } = rectToRegion(viewport, null, { x: 60, y: 15, width: 800, height: 400 })
    expect(timeSpan).toBeCloseTo(60, 6)
  })
})
