import { describe, test, expect } from 'vitest'
import {
  IDLE_CURSOR,
  PAN_IDLE_CURSOR,
  PAN_DRAG_CURSOR,
  featureCursor
} from '../../src/utils/cursors.js'

/** The module's public surface is the phase accessor, so test through it. */
const FEATURE_HOVER_CURSOR = featureCursor('hover')
const FEATURE_DRAG_CURSOR = featureCursor('drag')

/**
 * @fileoverview Unit coverage for the feature-drag cursors.
 *
 * The whole point of these cursors is what they *do not* paint: the centre row
 * and centre column of the artwork must stay clear, so a tonal or a time line
 * running under the hotspot is still readable and the marker being dragged is
 * not hidden by the thing dragging it. That is a geometric property, and the
 * tests below check it against the artwork rather than trusting the constants,
 * because it is exactly what a well-meaning tweak to the path data would break.
 */

/** Where the hotspot sits, and the size of the box the artwork is drawn in. */
const CENTRE = 16
const BOX = 32

/**
 * Pull the SVG source back out of a CSS cursor value.
 * @param {string} value - A CSS `cursor` value produced by the module
 * @returns {string} The decoded SVG source
 */
function decodeSvg(value) {
  const match = /^url\("data:image\/svg\+xml,(.*)"\) (\d+) (\d+), (\w+)$/.exec(value)
  if (!match) throw new Error(`not a data-URI cursor value: ${value}`)
  return decodeURIComponent(match[1])
}

/**
 * Parse the module's path data into absolute line segments.
 *
 * Deliberately supports only the commands the artwork uses (M/L/H/V and their
 * relative forms) and throws on anything else, so a path written with an
 * unsupported command fails loudly rather than being silently skipped — a
 * skipped segment would make the clearance assertions below vacuously pass.
 * @param {string} d - SVG path data
 * @returns {Array<{x1: number, y1: number, x2: number, y2: number}>} Segments
 */
function pathSegments(d) {
  const tokens = d.match(/[A-Za-z]|-?\d+(?:\.\d+)?/g) || []
  const segments = []
  let x = 0
  let y = 0
  let i = 0

  while (i < tokens.length) {
    const command = tokens[i++]
    const num = () => parseFloat(tokens[i++])
    const from = { x, y }

    switch (command) {
      case 'M': x = num(); y = num(); continue
      case 'm': x += num(); y += num(); continue
      case 'L': x = num(); y = num(); break
      case 'l': x += num(); y += num(); break
      case 'H': x = num(); break
      case 'h': x += num(); break
      case 'V': y = num(); break
      case 'v': y += num(); break
      default: throw new Error(`unsupported path command "${command}" in "${d}"`)
    }

    segments.push({ x1: from.x, y1: from.y, x2: x, y2: y })
  }

  return segments
}

/**
 * Every segment in a cursor's artwork, with the stroke width it is painted at.
 *
 * Both the halo group and the core group are returned, so the clearance check
 * covers the widest ink actually laid down — the halo, which is what would
 * encroach on the centre lines first.
 * @param {string} svg - SVG source
 * @returns {Array<{x1: number, y1: number, x2: number, y2: number, width: number}>} Painted segments
 */
function paintedSegments(svg) {
  const groups = svg.match(/<g stroke="[^"]*"[^>]*>.*?<\/g>/g) || []
  expect(groups.length).toBe(2)

  return groups.flatMap((group) => {
    const width = parseFloat(/stroke-width="([\d.]+)"/.exec(group)[1])
    const paths = group.match(/ d="([^"]+)"/g) || []
    return paths.flatMap((attr) =>
      pathSegments(attr.slice(4, -1)).map((seg) => ({ ...seg, width }))
    )
  })
}

/**
 * The band of the artwork a segment lays ink on, along one axis, including the
 * stroke's half-width. Conservative: round caps paint slightly less than this.
 * @param {number} a - One endpoint's coordinate
 * @param {number} b - The other endpoint's coordinate
 * @param {number} width - Stroke width
 * @returns {{lo: number, hi: number}} Painted extent along that axis
 */
function paintedBand(a, b, width) {
  const radius = width / 2
  return { lo: Math.min(a, b) - radius, hi: Math.max(a, b) + radius }
}

/**
 * Assert that no ink lands on the centre row or the centre column.
 * @param {string} value - A CSS cursor value from the module
 */
function expectClearCentreLines(value) {
  const segments = paintedSegments(decodeSvg(value))
  expect(segments.length).toBeGreaterThan(0)

  for (const seg of segments) {
    const across = paintedBand(seg.x1, seg.x2, seg.width)
    const down = paintedBand(seg.y1, seg.y2, seg.width)

    // Crossing the centre column would clip a vertical tonal; crossing the
    // centre row would clip a time line. Either one, anywhere in the box.
    expect(across.lo <= CENTRE && across.hi >= CENTRE).toBe(false)
    expect(down.lo <= CENTRE && down.hi >= CENTRE).toBe(false)
  }
}

describe('feature drag cursors', () => {
  test('the hover cursor leaves both centre lines unpainted', () => {
    expectClearCentreLines(FEATURE_HOVER_CURSOR)
  })

  test('the drag cursor leaves both centre lines unpainted', () => {
    expectClearCentreLines(FEATURE_DRAG_CURSOR)
  })

  test('both are 32x32 with the hotspot at the centre and a keyword fallback', () => {
    for (const value of [FEATURE_HOVER_CURSOR, FEATURE_DRAG_CURSOR]) {
      const [, , hotspotX, hotspotY, fallback] =
        /^url\("data:image\/svg\+xml,(.*)"\) (\d+) (\d+), (\w+)$/.exec(value)

      expect(Number(hotspotX)).toBe(CENTRE)
      expect(Number(hotspotY)).toBe(CENTRE)

      // Safari does not accept SVG data-URI cursors; without the keyword it
      // would fall all the way back to the default arrow.
      expect(fallback).toBe('move')

      const svg = decodeSvg(value)
      expect(svg).toContain(`width="${BOX}" height="${BOX}"`)
      expect(svg).toContain(`viewBox="0 0 ${BOX} ${BOX}"`)
    }
  })

  test('each shape is haloed, so it reads on blue field and yellow tonal alike', () => {
    const svg = decodeSvg(FEATURE_HOVER_CURSOR)
    const halo = /<g stroke="#000000"[^>]*stroke-width="([\d.]+)"/.exec(svg)
    const core = /<g stroke="#ffffff"[^>]*stroke-width="([\d.]+)"/.exec(svg)

    expect(halo).not.toBeNull()
    expect(core).not.toBeNull()
    expect(parseFloat(halo[1])).toBeGreaterThan(parseFloat(core[1]))
  })

  test('hover and drag are distinguishable from each other and from idle', () => {
    expect(FEATURE_HOVER_CURSOR).not.toBe(FEATURE_DRAG_CURSOR)
    expect(FEATURE_HOVER_CURSOR).not.toBe(IDLE_CURSOR)
    expect(FEATURE_DRAG_CURSOR).not.toBe(IDLE_CURSOR)
  })

  test('no feature cursor is a hand — that is what obscured the gram', () => {
    for (const value of [FEATURE_HOVER_CURSOR, FEATURE_DRAG_CURSOR]) {
      expect(value).not.toContain(PAN_IDLE_CURSOR)
      expect(value).not.toContain(PAN_DRAG_CURSOR)
    }
  })
})

describe('featureCursor', () => {
  test('the resting phase is the plain crosshair', () => {
    expect(featureCursor('idle')).toBe(IDLE_CURSOR)
  })

  test('an unrecognised phase rests at idle rather than sticking', () => {
    expect(featureCursor(/** @type {any} */ ('nonsense'))).toBe(IDLE_CURSOR)
  })
})
