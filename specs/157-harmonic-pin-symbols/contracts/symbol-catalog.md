# Contract: Symbol Catalogue

Defines the canonical set of symbols, their identifiers, and the SVG mark each
produces. This is the single source of truth shared by the selector, the pin
renderer, and the harmonics-table swatch.

## Catalogue

| id | Display name | SVG primitive (centred at `cx,cy`, radius `r`) |
|----|--------------|------------------------------------------------|
| `circle` | Circle | `<circle cx cy r>` |
| `square` | Square | `<rect x=cx-r y=cy-r width=2r height=2r>` |
| `diamond` | Diamond | `<polygon>` points (cx,cy-r)(cx+r,cy)(cx,cy+r)(cx-r,cy) |
| `triangle` | Triangle | `<polygon>` points (cx,cy-r)(cx+r,cy+r)(cx-r,cy+r) |
| `triangle-down` | Triangle (down) | `<polygon>` points (cx,cy+r)(cx+r,cy-r)(cx-r,cy-r) |
| `star` | Star | `<polygon>` 5-point star, outer `r`, inner `~0.5r` |

## Factory contract — `src/rendering/symbols.js`

```
createSymbolMark(symbolType, cx, cy, size, color) → SVGElement
```

- **Inputs**:
  - `symbolType`: one of the catalogue ids; any unknown/`null`/`undefined`
    value MUST fall back to `circle`.
  - `cx`, `cy`: centre coordinates in the SVG overlay coordinate space.
  - `size`: nominal diameter in px (default target ~10–12px on a pin).
  - `color`: fill colour (the harmonic set's hex colour).
- **Output**: a single SVG element, `fill = color`, no stroke required (filled
  marks). The element MUST carry a class (e.g. `gram-frame-harmonic-symbol`) so
  it is removable/queryable, and — for pin marks — `data-harmonic-set-id`.
- **Purity**: no DOM insertion, no state reads; returns a detached element the
  caller appends. Same factory is used for the table swatch (small fixed size).

## Default & legacy fallback

- The default selected symbol is `circle`.
- Any harmonic set with an absent/unrecognised symbol renders as `circle`.

## Extensibility

Adding a symbol = adding one catalogue row + one branch in the factory. No
changes to state, persistence, or the selector wiring beyond listing the new id.
