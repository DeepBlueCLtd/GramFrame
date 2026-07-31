# Phase 0 Research: Symbols on Harmonic Pins

All Technical Context items were resolvable from the existing codebase and the
issue; there are no remaining NEEDS CLARIFICATION items. Decisions below record
the reasoning so Phase 1/2 can proceed unambiguously.

## Decision 1 — Symbol catalogue

**Decision**: Offer filled shapes: **circle, square, diamond, triangle,
inverted-triangle, star**. Circle is the default and the legacy fallback.

**Rationale**: The issue explicitly names circle, square, diamond and asks
"are there any other typical filled symbols we could plot?". Triangle,
inverted-triangle, and star are the standard additional filled markers used by
plotting libraries (matplotlib/plotly/d3 symbol sets) and remain distinguishable
at small (~10px) sizes rendered on a pin and in a table cell. Six shapes give
analysts enough distinct codes without crowding the drop-down or risking
shape-confusion at small sizes.

**Alternatives considered**:
- *Only the three named shapes* — rejected; the issue invites more, and three is
  limiting when many sets coexist.
- *Plus/cross/hexagon/pentagon* — deferred; plus/cross are line marks (not
  "filled"), and hexagon/pentagon read as circles at ~10px. Kept out to preserve
  at-a-glance distinctiveness. The catalogue is a data list and can be extended
  later without architectural change.

## Decision 2 — Symbol rendering technique (SVG)

**Decision**: Render each symbol as an SVG mark appended to the existing
`instance.cursorGroup`, positioned at the **top of each pin's vertical line**
(at `lineTop`, centred on `lineX`), filled with the harmonic set's colour.
Implement a pure factory `src/rendering/symbols.js` that maps `(symbolType, cx,
cy, size, color)` → an SVG element (`<circle>`, `<polygon>`, or `<path>`).

**Rationale**: Constitution Principle I mandates SVG for all overlays and use of
the established coordinate transforms. Pins are already SVG lines produced in
`HarmonicsMode.renderHarmonicSet` via `calculateZoomAwarePosition`; adding a
sibling SVG mark at `lineTop` reuses that geometry and stays zoom/expand-aware.
A shared pure factory lets the harmonics table reuse the identical shape drawing
so the on-pin mark and the table swatch match exactly.

**Alternatives considered**:
- *Canvas or Unicode/emoji glyphs in a `<text>` element* — Canvas is forbidden
  by the constitution; text glyphs render inconsistently across fonts/OSes and
  are hard to colour precisely and query in tests.
- *One symbol per pin vs one per set* — one symbol per set (drawn on every pin
  of that set) is chosen, mirroring how colour is a per-set attribute.

**Placement detail**: The pin label (harmonic number) is drawn at `lineX + 3,
lineTop + 12` (right of the line). The symbol is centred on the line at the very
top (`lineTop`, offset slightly up), so it does not overlap the label — directly
satisfying FR-006. Near the top edge of the spectrogram the mark is nudged so it
stays fully visible.

## Decision 3 — Symbol selector UI

**Decision**: A native `<select>` drop-down (`src/components/SymbolPicker.js`),
mounted in the controls column immediately after the colour picker in
`MainUI.js`. Each option shows the shape name; the selector writes the chosen
value to `state.selectedSymbol`. Optionally each option is prefixed with a small
inline-SVG/Unicode preview for recognisability.

**Rationale**: The issue asks specifically for a "drop-down". This mirrors the
existing colour-picker placement and the global-state pattern
(`state.selectedColor`), so harmonic creation can read `state.selectedSymbol`
with the same fallback logic it already uses for colour. Native `<select>` is
zero-dependency, accessible, and Playwright-friendly.

**Alternatives considered**:
- *Custom pop-over palette* — heavier, more code, no benefit over a native
  select for ~6 options.
- *Per-set editing in the table* — out of scope for this issue (which is about
  choosing the symbol for the *next* set); can be added later.

## Decision 4 — Persistence & backward compatibility

**Decision**: Add `symbol` as an **optional, additive** field on
`StoredHarmonicSet`. **Keep `SCHEMA_VERSION = 1`.** On load, when a harmonic
set has no `symbol`, apply the default `'circle'` in `_restoreAnnotations`.

**Rationale**: `loadAnnotations` in `src/core/storage.js` currently discards
stored data with a **strict** check `data.version !== SCHEMA_VERSION`. Bumping
the version to 2 would therefore *delete every existing v1 annotation* on first
load — the opposite of the issue's requirement to "display a circle marker when
we reload legacy harmonics that were persisted before this change." Because the
new field is purely additive (older builds simply ignore an unknown key, and the
new build tolerates its absence), no version bump is needed. This preserves all
existing saved work and satisfies FR-008/FR-009 and SC-004/SC-005.

**Alternatives considered**:
- *Bump SCHEMA_VERSION to 2 with a migration* — rejected: the strict-equality
  guard discards non-matching versions outright, so this would destroy legacy
  data unless the guard is also rewritten into a migration path — more code and
  more risk for no benefit over an additive field.
- *Store symbol only when non-default* — unnecessary micro-optimisation; always
  writing the field keeps save/load symmetric and simpler to reason about.

## Decision 5 — Harmonics table affordance

**Decision**: In `HarmonicPanel.js`, render the set's symbol as a small inline
SVG mark filled with the set's colour, in (or alongside) the existing colour
cell, produced by the same `src/rendering/symbols.js` factory.

**Rationale**: FR-007 / the issue's core accessibility goal — the table should
show the symbol in the harmonic colour as a colour-blind affordance. Reusing the
shared factory guarantees the table mark matches the on-pin mark.

**Alternatives considered**:
- *Separate CSS-shape implementation for the table* — rejected; risks visual
  drift from the SVG pin mark and duplicates shape logic.

## Summary of resolved unknowns

| Topic | Resolution |
|-------|------------|
| Which symbols | circle, square, diamond, triangle, inverted-triangle, star |
| Default / legacy fallback | circle |
| Render tech | SVG marks via shared pure factory (`rendering/symbols.js`) |
| Selector | native `<select>` next to colour picker → `state.selectedSymbol` |
| Persistence | additive `symbol` field, `SCHEMA_VERSION` stays 1 |
| Table affordance | inline SVG mark in set colour, same factory |
| One-per-set vs per-pin | one symbol per set, drawn on every pin |
