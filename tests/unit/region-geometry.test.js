// @vitest-environment node
/**
 * Unit lane for the region-zoom geometry (spec 170).
 *
 * The rules an analyst actually feels — a free selection (FR-003), the clamp to
 * the gram's edge (FR-011) and the `contain` fit that decides what the view
 * ends up showing — are pure arithmetic over the viewport, so they are pinned
 * here rather than only through a browser drag.
 */
import { describe, it, expect } from 'vitest'
import {
  selectionBounds,
  withinBounds,
  selectionRect,
  containedView,
  rectToRegion
} from '../../src/utils/regionGeometry.js'

/** The zoom range the component holds the view within. */
const LIMITS = { min: 1, max: 10 }

/** A 1x zoomed 800x400 gram spanning 0-60s and 0-1000Hz, with the usual margins. */
const viewport = {
  margins: { left: 60, bottom: 50, right: 15, top: 15 },
  imageDetails: { url: 'gram.png', naturalWidth: 800, naturalHeight: 400, renderWidth: 800, renderHeight: 400 },
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

describe('selectionRect', () => {
  it('follows the pointer exactly, whatever the proportions', () => {
    // 400 across but only 20 down: a long thin band, and it stays one.
    const rect = selectionRect(bounds, { x: 100, y: 50 }, { x: 500, y: 70 })
    expect(rect).toMatchObject({ x: 100, y: 50, width: 400, height: 20 })
  })

  it('grows up and to the left when the drag does', () => {
    const rect = selectionRect(bounds, { x: 500, y: 300 }, { x: 300, y: 200 })
    expect(rect).toMatchObject({ x: 300, y: 200, width: 200, height: 100 })
  })

  it('clamps to the gram’s edge rather than running past it (FR-011)', () => {
    const rect = selectionRect(bounds, { x: 700, y: 100 }, { x: 2000, y: 2000 })
    expect(rect.x + rect.width).toBe(bounds.right)
    expect(rect.y + rect.height).toBe(bounds.bottom)
  })

  it('reports the raw pointer movement the click threshold reads (FR-008)', () => {
    const rect = selectionRect(bounds, { x: 400, y: 200 }, { x: 402, y: 199 })
    expect(rect.movedX).toBeCloseTo(2, 6)
    expect(rect.movedY).toBeCloseTo(-1, 6)
  })
})

describe('containedView', () => {
  it('is the selection itself when the shapes already match', () => {
    // Quarter of the axes area, in the axes area's own proportions.
    const rect = { x: 260, y: 115, width: 200, height: 100 }
    const view = containedView(viewport, bounds, rect, LIMITS)
    expect(view.width).toBeCloseTo(200, 6)
    expect(view.height).toBeCloseTo(100, 6)
    expect(view.x).toBeCloseTo(260, 6)
    expect(view.y).toBeCloseTo(115, 6)
  })

  it('grows the slack axis, so a wide band shows extra above and below', () => {
    // 400 x 20 in an 800 x 400 view: width needs 2x, height would need 20x.
    // 2x wins, so the view is 400 x 200 — the band plus 90px of gram each side.
    const rect = { x: 260, y: 205, width: 400, height: 20 }
    const view = containedView(viewport, bounds, rect, LIMITS)
    expect(view.width).toBeCloseTo(400, 6)
    expect(view.height).toBeCloseTo(200, 6)
    // Centred on the band.
    expect(view.x + view.width / 2).toBeCloseTo(rect.x + rect.width / 2, 6)
    expect(view.y + view.height / 2).toBeCloseTo(rect.y + rect.height / 2, 6)
  })

  it('grows sideways for a tall narrow selection', () => {
    // 20 x 200: height needs 2x, width would need 40x. 2x wins.
    const rect = { x: 450, y: 115, width: 20, height: 200 }
    const view = containedView(viewport, bounds, rect, LIMITS)
    expect(view.width).toBeCloseTo(400, 6)
    expect(view.height).toBeCloseTo(200, 6)
    expect(view.x + view.width / 2).toBeCloseTo(rect.x + rect.width / 2, 6)
  })

  it('never shows space the gram does not cover: it slides, not shrinks', () => {
    // Hard against the left edge; the view keeps its size and slides inside.
    const rect = { x: 60, y: 15, width: 200, height: 20 }
    const view = containedView(viewport, bounds, rect, LIMITS)
    expect(view.width).toBeCloseTo(200, 6)
    expect(view.x).toBeGreaterThanOrEqual(bounds.left)
    expect(view.y).toBeGreaterThanOrEqual(bounds.top)
    expect(view.x + view.width).toBeLessThanOrEqual(bounds.right)
    expect(view.y + view.height).toBeLessThanOrEqual(bounds.bottom)
  })

  it('shows the 10x cap arriving: a tiny box previews a bigger view', () => {
    const rect = { x: 400, y: 200, width: 4, height: 2 }
    const view = containedView(viewport, bounds, rect, LIMITS)
    // Capped at 10x, so the view is a tenth of the axes area, not the 4x2 box.
    expect(view.width).toBeCloseTo(80, 6)
    expect(view.height).toBeCloseTo(40, 6)
  })

  it('is the whole gram for an empty selection', () => {
    const view = containedView(viewport, bounds, { x: 400, y: 200, width: 0, height: 0 }, LIMITS)
    expect(view.width).toBeCloseTo(800, 6)
    expect(view.height).toBeCloseTo(400, 6)
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
