import { describe, test, expect } from 'vitest'
import {
  isWithinDataTolerance,
  isWithinToleranceRadius,
  findClosestTarget,
  getUniformTolerance
} from '../../src/utils/tolerance.js'
import { present } from './helpers/present.js'

/**
 * @fileoverview Unit tests for the shared hit-test tolerances. Pins the three
 * geometric contracts (box test, circle test, closest-within-circle) and the
 * zoom-aware data-space tolerance derivation.
 */

/** An arbitrary tolerance of 0.5s × 50Hz, for the pure geometric tests */
const TOL = { time: 0.5, freq: 50 }

describe('isWithinDataTolerance (box test)', () => {
  test('inside on both axes', () => {
    expect(isWithinDataTolerance({ time: 10.4, freq: 1020 }, { time: 10, freq: 1000 }, TOL)).toBe(true)
  })

  test('exactly on the boundary is within (<=)', () => {
    expect(isWithinDataTolerance({ time: 10.5, freq: 1050 }, { time: 10, freq: 1000 }, TOL)).toBe(true)
  })

  test('outside on one axis only is outside', () => {
    expect(isWithinDataTolerance({ time: 10.6, freq: 1000 }, { time: 10, freq: 1000 }, TOL)).toBe(false)
    expect(isWithinDataTolerance({ time: 10, freq: 1051 }, { time: 10, freq: 1000 }, TOL)).toBe(false)
  })
})

describe('isWithinToleranceRadius (circle test)', () => {
  test('the box corner is inside the box but outside the circle', () => {
    // At (1.0, 1.0) in normalized units the box test passes but the
    // normalized Euclidean distance is √2 — the two tests genuinely differ.
    const corner = { time: 10.5, freq: 1050 }
    expect(isWithinDataTolerance(corner, { time: 10, freq: 1000 }, TOL)).toBe(true)
    expect(isWithinToleranceRadius(corner, { time: 10, freq: 1000 }, TOL)).toBe(false)
  })

  test('a point at the radius along one axis is within', () => {
    expect(isWithinToleranceRadius({ time: 10.5, freq: 1000 }, { time: 10, freq: 1000 }, TOL)).toBe(true)
  })
})

describe('findClosestTarget', () => {
  const targets = [
    { id: 'far', position: { time: 10.4, freq: 1000 }, data: { n: 1 } },
    { id: 'near', position: { time: 10.1, freq: 1000 }, data: { n: 2 } },
    { id: 'outside', position: { time: 99, freq: 9999 }, data: { n: 3 } }
  ]

  test('returns the nearest target within the tolerance circle', () => {
    const hit = present(findClosestTarget({ time: 10, freq: 1000 }, targets, TOL), 'a hit')
    expect(hit.id).toBe('near')
    expect(hit.data).toEqual({ n: 2 })
  })

  test('returns null when nothing is within tolerance', () => {
    expect(findClosestTarget({ time: 50, freq: 5000 }, targets, TOL)).toBeNull()
    expect(findClosestTarget({ time: 10, freq: 1000 }, [], TOL)).toBeNull()
  })
})

describe('getUniformTolerance', () => {
  /**
   * Build a viewport of a known size and span:
   * time: (8 / 1000px) × 30s = 0.24s, freq: (8 / 800px) × 2000Hz = 20Hz.
   * @param {number} zoomLevel - Zoom level for the viewport
   * @returns {any} Viewport for getUniformTolerance
   */
  function makeViewport(zoomLevel) {
    return {
      config: { timeMin: 0, timeMax: 30, freqMin: 0, freqMax: 2000 },
      imageDetails: { naturalWidth: 800, naturalHeight: 1000, renderWidth: 800, renderHeight: 1000 },
      zoom: { level: zoomLevel }
    }
  }

  const image = /** @type {any} */ ({})

  /**
   * Convert a viewport's tolerance back into the rendered pixel radius it
   * represents on each axis. This is the contract the constant states: eight
   * pixels, whatever the gram's span or the zoom level.
   * @param {any} viewport - Viewport to measure
   * @returns {{time: number, freq: number}} Radius in rendered pixels per axis
   */
  function pixelRadiusOf(viewport) {
    const { config, imageDetails, zoom } = viewport
    const tolerance = getUniformTolerance(viewport, image)
    const height = imageDetails.renderHeight || imageDetails.naturalHeight
    const width = imageDetails.renderWidth || imageDetails.naturalWidth
    return {
      time: tolerance.time / (config.timeMax - config.timeMin) * height * zoom.level,
      freq: tolerance.freq / (config.freqMax - config.freqMin) * width * zoom.level
    }
  }

  test('derives data-space tolerance from the rendered size at zoom 1', () => {
    expect(getUniformTolerance(makeViewport(1), image)).toEqual({ time: 0.24, freq: 20 })
  })

  test('doubling zoom halves the data-space tolerance', () => {
    expect(getUniformTolerance(makeViewport(2), image)).toEqual({ time: 0.12, freq: 10 })
  })

  test('the grab radius stays 8 rendered pixels at every zoom level', () => {
    for (const level of [0.5, 1, 2, 10, 1000]) {
      const radius = pixelRadiusOf(makeViewport(level))
      expect(radius.time).toBeCloseTo(8, 6)
      expect(radius.freq).toBeCloseTo(8, 6)
    }
  })

  test('a tiny render of a huge range still grabs across 8 pixels', () => {
    // Formerly clamped to a 0.5s / 50Hz ceiling, which on this viewport is
    // 0.08px of time — a hotspot far narrower than any glyph drawn on it.
    const viewport = {
      config: { timeMin: 0, timeMax: 600, freqMin: 0, freqMax: 100000 },
      imageDetails: { naturalWidth: 100, naturalHeight: 100, renderWidth: 100, renderHeight: 100 },
      zoom: { level: 1 }
    }
    expect(getUniformTolerance(/** @type {any} */ (viewport), image)).toEqual({ time: 48, freq: 8000 })
    const radius = pixelRadiusOf(/** @type {any} */ (viewport))
    expect(radius.time).toBeCloseTo(8, 6)
    expect(radius.freq).toBeCloseTo(8, 6)
  })

  test('the grab radius does not depend on how much data a gram spans', () => {
    // The bug this replaced: two grams of the same pixel size, differing only
    // in the span they cover, had wildly different grab regions on screen.
    const narrow = {
      config: { timeMin: 0, timeMax: 10, freqMin: 0, freqMax: 100 },
      imageDetails: { naturalWidth: 902, naturalHeight: 237, renderWidth: 902, renderHeight: 237 },
      zoom: { level: 1 }
    }
    const wide = {
      ...narrow,
      config: { timeMin: 0, timeMax: 600, freqMin: 0, freqMax: 20000 }
    }
    expect(pixelRadiusOf(narrow).time).toBeCloseTo(pixelRadiusOf(wide).time, 6)
    expect(pixelRadiusOf(narrow).freq).toBeCloseTo(pixelRadiusOf(wide).freq, 6)
  })

  test('missing viewport falls back to a nominal tolerance', () => {
    expect(getUniformTolerance(/** @type {any} */ (null), image)).toEqual({ time: 0.01, freq: 1.0 })
  })

  test('missing render size falls back to the natural size', () => {
    const viewport = makeViewport(1)
    viewport.imageDetails = { naturalWidth: 800, naturalHeight: 1000 }
    expect(getUniformTolerance(viewport, image)).toEqual({ time: 0.24, freq: 20 })
  })
})
