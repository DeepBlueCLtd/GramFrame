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
 * Default symbol style. `cross` means "no drawn symbol shape" (feature 161):
 * a feature with this style renders without a filled mark. It is the default so
 * a newly created harmonic set or marker carries no symbol unless the analyst
 * deliberately picks one.
 * @type {SymbolType}
 */
export const DEFAULT_SYMBOL = 'cross'

/**
 * Canonical list of available symbol ids, in selector display order. `cross`
 * (the symbol-less default) leads the list so it is the first/default option.
 * @type {SymbolType[]}
 */
export const SYMBOL_CATALOG = ['cross', 'circle', 'square', 'diamond', 'triangle', 'triangle-down', 'star']

/**
 * Human-readable display names for each symbol id (used by the selector).
 * @type {Record<SymbolType, string>}
 */
export const SYMBOL_DISPLAY_NAMES = {
  'cross': 'Cross (no symbol)',
  'circle': 'Circle',
  'square': 'Square',
  'diamond': 'Diamond',
  'triangle': 'Triangle',
  'triangle-down': 'Triangle (down)',
  'star': 'Star'
}

/**
 * EXPERIMENT (temporary — feature-feedback trial): multiplier applied to the
 * on-image symbol marks when the "Large" toggle in the style panel is
 * on. It exists only so analysts can compare the two sizes and tell us which to
 * keep; once a size is chosen, fold the winner into the base sizes and delete
 * both this constant and the toggle.
 * @type {number}
 */
export const LARGE_SYMBOL_SCALE = 2

/**
 * Resolve the symbol size multiplier carried by a feature.
 *
 * The flag is per-feature (a marker or a harmonic set), so sets drawn at both
 * sizes can be compared side by side on the same gram. Passing the GramFrame
 * state instead yields the default for the NEXT created feature, which is how
 * the toggle behaves when nothing is selected.
 *
 * Applies to the overlay marks only (harmonic pins and analysis markers) — the
 * table swatches keep their fixed box size so row heights do not jump.
 *
 * @param {{largeSymbols?: boolean}|null|undefined} source - Feature (or state) carrying the flag
 * @returns {number} `LARGE_SYMBOL_SCALE` when large symbols are on, else 1
 */
export function resolveSymbolScale(source) {
  return source && source.largeSymbols ? LARGE_SYMBOL_SCALE : 1
}

/**
 * Resolve any candidate symbol value to a known symbol id.
 *
 * Unknown, null and undefined values all resolve to {@link DEFAULT_SYMBOL} —
 * the same fallback the mark factory applies — so callers that need to branch
 * on the *effective* symbol (label placement, for one) agree with what is drawn.
 *
 * Pure: no DOM, no state.
 *
 * @param {SymbolType|string|null|undefined} symbolType - Candidate symbol id
 * @returns {SymbolType} A member of {@link SYMBOL_CATALOG}
 */
export function resolveSymbolType(symbolType) {
  return SYMBOL_CATALOG.includes(/** @type {SymbolType} */ (symbolType))
    ? /** @type {SymbolType} */ (symbolType)
    : DEFAULT_SYMBOL
}

/**
 * Whether a symbol's text label belongs BELOW the mark rather than above it.
 *
 * Every other symbol is symmetric about its centre, or points downwards, so the
 * space above it is free and the label goes there. An upward-pointing triangle
 * is the exception (issue #242): it is drawn to point AT something above it, so
 * a label stacked over its apex sits exactly on the data the analyst placed it
 * against. For that one symbol the label drops to the underside, where the
 * triangle's own base — and, on a pin, the line hanging from it — already
 * covers the gram.
 *
 * Callers that lay out a label MUST also move the label's grab region to match,
 * or the hotspot parts company with the drawn text.
 *
 * Pure: no DOM, no state. Unknown/absent values resolve through
 * {@link resolveSymbolType} first, so they follow the default (`cross`, above).
 *
 * @param {SymbolType|string|null|undefined} symbolType - Candidate symbol id
 * @returns {boolean} True when the label is drawn beneath the symbol
 */
export function labelSitsBelowSymbol(symbolType) {
  return resolveSymbolType(symbolType) === 'triangle'
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
 * Does this symbol draw no shape at all?
 *
 * True exactly when {@link createSymbolMark} returns null -- the symbol-less
 * `cross` style. Callers that need to know what was drawn without drawing it
 * (marker hit-testing, for one) ask here rather than re-deriving the rule and
 * drifting from it (issue #273).
 * @param {SymbolType|string|null|undefined} symbolType - Candidate symbol id
 * @returns {boolean} True when nothing is drawn for this symbol
 */
export function isSymbolLess(symbolType) {
  return resolveSymbolType(symbolType) === 'cross'
}

/**
 * Create a filled SVG mark for a harmonic-set symbol.
 *
 * Pure: performs no DOM insertion and reads no state. Returns a detached SVG
 * element the caller appends. Any unknown/null/undefined `symbolType` falls
 * back to the default (`cross`).
 *
 * The `cross` style is symbol-less: it returns `null` so the caller draws no
 * shape (the pin still keeps its line and label; a table cell falls back to a
 * plain colour swatch). Callers MUST handle a `null` return.
 *
 * @param {SymbolType|string|null|undefined} symbolType - Symbol id (falls back to `cross`)
 * @param {number} cx - Centre X coordinate in the SVG overlay space
 * @param {number} cy - Centre Y coordinate in the SVG overlay space
 * @param {number} size - Nominal diameter in px (radius = size / 2)
 * @param {string} color - Fill colour (the feature's hex colour)
 * @returns {SVGElement|null} A detached, filled SVG element, or `null` for `cross`
 */
export function createSymbolMark(symbolType, cx, cy, size, color) {
  const r = size / 2

  // Resolve unknown/absent values to the default so both the drawn shape and the
  // recorded `data-symbol` reflect the actual fallback.
  const resolved = resolveSymbolType(symbolType)

  // The symbol-less `cross` style draws nothing.
  if (resolved === 'cross') {
    return null
  }

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

/**
 * Build a colour indicator for a feature's table row (markers or harmonic sets).
 *
 * The indicator is symbol-dependent (feature 161, FR-010):
 *   - a feature with a shaped symbol → the symbol drawn in the feature's colour,
 *     inside a small inline SVG swatch;
 *   - a feature with the `cross` (symbol-less) style → a plain filled rectangle
 *     of the feature's colour, so the colour stays visible when no shape is drawn.
 *
 * Pure: builds and returns a detached element; performs no DOM insertion.
 *
 * @param {SymbolType|string|null|undefined} symbol - The feature's symbol style
 * @param {string} color - The feature's hex colour
 * @param {number} [size=16] - Indicator box size in px
 * @returns {SVGSVGElement|HTMLDivElement} The detached indicator element
 */
export function createColorIndicator(symbol, color, size = 16) {
  const mark = createSymbolMark(symbol, size / 2, size / 2, size * 0.75, color)

  if (mark) {
    const svg = document.createElementNS(SVG_NS, 'svg')
    svg.setAttribute('class', 'gram-frame-symbol-swatch')
    svg.setAttribute('width', String(size))
    svg.setAttribute('height', String(size))
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`)
    svg.appendChild(mark)
    return svg
  }

  // Cross (symbol-less): a plain filled colour rectangle.
  const div = document.createElement('div')
  div.className = 'gram-frame-color-swatch'
  div.style.backgroundColor = color
  div.style.width = `${size}px`
  div.style.height = `${size}px`
  div.style.borderRadius = '3px'
  div.style.border = '1px solid #ccc'
  return div
}
