/**
 * Shared SVG symbol mark factory for GramFrame harmonic sets.
 *
 * A single source of truth used by the symbol selector, the pin renderer, and
 * the harmonics-table swatch so every place draws the same shape for a given
 * symbol id. All marks are filled (no stroke) SVG elements returned detached —
 * the caller appends them.
 *
 * Adding a symbol = adding one branch here plus listing its id in the catalogue
 * (see specs/157-harmonic-pin-symbols/contracts/symbol-catalog.md). No changes
 * to state, persistence, or selector wiring beyond listing the new id.
 */

/// <reference path="../types.js" />

/** SVG namespace for element creation */
const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * Canonical list of available symbol ids, in selector display order.
 * @type {SymbolType[]}
 */
export const SYMBOL_CATALOG = ['circle', 'square', 'diamond', 'triangle', 'triangle-down', 'star']

/**
 * Human-readable display names for each symbol id (used by the selector).
 * @type {Record<SymbolType, string>}
 */
export const SYMBOL_DISPLAY_NAMES = {
  'circle': 'Circle',
  'square': 'Square',
  'diamond': 'Diamond',
  'triangle': 'Triangle',
  'triangle-down': 'Triangle (down)',
  'star': 'Star'
}

/**
 * Build a `points` attribute string from an array of [x, y] pairs.
 * @param {Array<[number, number]>} pts - Point pairs
 * @returns {string} Space-separated "x,y" points
 */
function toPoints(pts) {
  return pts.map(([x, y]) => `${x},${y}`).join(' ')
}

/**
 * Compute the outer/inner alternating vertices of a 5-point star.
 * @param {number} cx - Centre X
 * @param {number} cy - Centre Y
 * @param {number} outerR - Outer radius
 * @param {number} innerR - Inner radius
 * @returns {Array<[number, number]>} Ten vertices, outer/inner alternating
 */
function starPoints(cx, cy, outerR, innerR) {
  /** @type {Array<[number, number]>} */
  const pts = []
  // 10 vertices: alternate outer and inner, starting from the top point.
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const angle = -Math.PI / 2 + (i * Math.PI) / 5
    pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)])
  }
  return pts
}

/**
 * Create a filled SVG mark for a harmonic-set symbol.
 *
 * Pure: performs no DOM insertion and reads no state. Returns a detached SVG
 * element the caller appends. Any unknown/null/undefined `symbolType` falls
 * back to `circle`.
 *
 * @param {SymbolType|string|null|undefined} symbolType - Symbol id (falls back to `circle`)
 * @param {number} cx - Centre X coordinate in the SVG overlay space
 * @param {number} cy - Centre Y coordinate in the SVG overlay space
 * @param {number} size - Nominal diameter in px (radius = size / 2)
 * @param {string} color - Fill colour (the harmonic set's hex colour)
 * @returns {SVGElement} A detached, filled SVG element
 */
export function createSymbolMark(symbolType, cx, cy, size, color) {
  const r = size / 2

  // Resolve unknown/absent values to the default so both the drawn shape and the
  // recorded `data-symbol` reflect the actual fallback.
  const resolved = SYMBOL_CATALOG.includes(/** @type {SymbolType} */ (symbolType))
    ? /** @type {SymbolType} */ (symbolType)
    : 'circle'

  /** @type {SVGElement} */
  let el

  switch (resolved) {
    case 'square': {
      el = document.createElementNS(SVG_NS, 'rect')
      el.setAttribute('x', String(cx - r))
      el.setAttribute('y', String(cy - r))
      el.setAttribute('width', String(2 * r))
      el.setAttribute('height', String(2 * r))
      break
    }
    case 'diamond': {
      el = document.createElementNS(SVG_NS, 'polygon')
      el.setAttribute('points', toPoints([
        [cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]
      ]))
      break
    }
    case 'triangle': {
      el = document.createElementNS(SVG_NS, 'polygon')
      el.setAttribute('points', toPoints([
        [cx, cy - r], [cx + r, cy + r], [cx - r, cy + r]
      ]))
      break
    }
    case 'triangle-down': {
      el = document.createElementNS(SVG_NS, 'polygon')
      el.setAttribute('points', toPoints([
        [cx, cy + r], [cx + r, cy - r], [cx - r, cy - r]
      ]))
      break
    }
    case 'star': {
      el = document.createElementNS(SVG_NS, 'polygon')
      el.setAttribute('points', toPoints(starPoints(cx, cy, r, r * 0.5)))
      break
    }
    case 'circle':
    default: {
      // Default and legacy fallback: circle.
      el = document.createElementNS(SVG_NS, 'circle')
      el.setAttribute('cx', String(cx))
      el.setAttribute('cy', String(cy))
      el.setAttribute('r', String(r))
      break
    }
  }

  el.setAttribute('class', 'gram-frame-harmonic-symbol')
  el.setAttribute('data-symbol', resolved)
  el.setAttribute('fill', color)
  return el
}
