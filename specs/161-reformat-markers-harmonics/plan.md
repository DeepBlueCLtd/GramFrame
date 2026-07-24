# Implementation Plan: Reformat Existing Markers & Harmonics, with a "Cross" (Symbol-less) Style

**Branch**: `161-reformat-markers-harmonics` | **Date**: 2026-07-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/161-reformat-markers-harmonics/spec.md` (GH issue #198, bullets 4 & 5)

## Summary

Two capabilities ship together:

1. **A "cross" (symbol-less) style**, added to the shared symbol catalogue and
   made the **default**. `cross` means "no drawn symbol shape". A feature with
   this style renders without a filled mark — a harmonic set keeps its pin lines
   and number labels but draws no symbol; a marker keeps its crosshair. `cross`
   becomes the value the style controls show for symbol-less features and the
   state a feature returns to when its symbol is removed.

2. **In-place reformatting** of an already-placed marker or harmonic set.
   Selecting a feature (via its table row or the overlay) now drives the colour
   and symbol controls to that feature's current values, and changing a control
   restyles the selected feature instantly — on the overlay and in its table —
   affecting only that feature. When nothing is selected, the controls keep the
   existing behaviour: they set the style for the **next** created feature.

Markers gain a `symbol` attribute for the first time (default `cross`). A marker
with a shaped symbol is drawn as that colour-coded symbol; a marker with `cross`
draws the crosshair. A marker's table colour indicator is symbol-dependent: a
shaped symbol shows the colour-coded symbol, `cross` shows a filled colour
rectangle.

### Technical approach

This is a small, contained set of edits building on infrastructure that already
exists: the shared symbol factory (`src/rendering/symbols.js`, feature 157) and
the shared selection system (`src/core/keyboardControl.js`: `setSelection` /
`clearSelection` / `updateSelectionVisuals`, used today for keyboard nudging).

- **`cross` as a symbol id**: add `'cross'` to `SYMBOL_CATALOG` (first, so it is
  the default option), add its display name and drop-down glyph, and export a
  `DEFAULT_SYMBOL = 'cross'`. `createSymbolMark()` resolves unknown/absent
  symbols to the default and returns **`null`** for `cross` (draws nothing).
  Callers that append a mark handle the `null`.
- **Shared colour indicator**: a new `createColorIndicator(symbol, color, size)`
  helper returns the symbol swatch for a shape, or a filled colour rectangle for
  `cross`. Both the markers table and the harmonics table use it, so the colour
  stays visible even when no symbol is drawn.
- **Selection drives the controls**: the colour/symbol picker takes the
  `instance` (not just `state`), routes a change to the selected feature when one
  is selected (`applyColorToSelectedFeature` / `applySymbolToSelectedFeature`)
  and otherwise to `state.selectedColor` / `state.selectedSymbol`. It registers
  `instance.syncStyleControls()`, which `setSelection` / `clearSelection` call so
  the controls always reflect the active style (selected feature, or next-feature
  defaults).
- **Markers carry a symbol**: marker creation reads `state.selectedSymbol`;
  `renderMarker` draws the symbol mark when shaped, else the crosshair; the
  markers table uses the shared colour indicator and refreshes it on update so an
  in-place restyle shows immediately.
- **Persistence**: `symbol` is added to the stored marker record and defaults to
  `cross` on restore; the harmonic-set restore default changes from `circle` to
  `cross`. Both are **additive** — no `SCHEMA_VERSION` bump — so legacy records
  load without error (absent symbol → `cross`).

## Technical Context

**Language/Version**: JavaScript ES2020+, JSDoc-typed (no TS compilation)
**Primary Dependencies**: None at runtime (zero runtime deps); Vite for build
**Storage**: Browser Web Storage (existing adapter). `symbol` is an additive
field on the stored marker record; the harmonic restore default changes to
`cross`. No `SCHEMA_VERSION` change; legacy records remain loadable.
**Testing**: Playwright end-to-end (`yarn test`) with the `GramFramePage` helper
**Target Platform**: Modern evergreen browsers (SVG-based overlay component)
**Project Type**: Single-project front-end library/component
**Constraints**: `yarn typecheck` + `yarn test` + `yarn build` must all pass;
state deep-copied before listener notification; HMR preserves listeners; no
change to the `gram-config` HTML contract
**Scale/Scope**: ~10 existing files touched + 2 test files updated + 1 new test
file; no new modules

## Constitution Check

- **Zero runtime dependencies**: preserved — only DOM/SVG and existing helpers.
- **JSDoc-typed, no compilation**: preserved — types updated in `types.js`.
- **Backward-compatible persistence**: preserved — additive field, no version
  bump, legacy records default to `cross`.
- **Separation of concerns**: rendering stays in `symbols.js` / mode renderers;
  selection/restyle logic lives with the selection system in
  `keyboardControl.js`; the picker only wires UI to those.
- **All gates green**: `yarn typecheck`, `yarn test`, `yarn build` must pass.

## Project Structure (files touched)

```
src/
  rendering/symbols.js          # +cross, DEFAULT_SYMBOL, null for cross, createColorIndicator()
  core/state.js                 # selectedSymbol default 'circle' -> 'cross'
  core/storage.js               # persist marker.symbol; harmonic/marker default -> 'cross'
  core/keyboardControl.js       # getSelectedFeature/getActiveStyle/apply*ToSelectedFeature; sync on (set|clear)Selection
  core/initialization/EventBindings.js  # bind apply*ToSelectedFeature onto instance
  components/SymbolPicker.js     # take instance; route to selection or next; register _symbolControl
  components/ColorPicker.js      # take instance; route colour; define syncStyleControls
  components/MainUI.js           # pass instance to createColorPicker
  components/HarmonicPanel.js    # table indicator via createColorIndicator (rectangle for cross)
  modes/analysis/AnalysisMode.js # marker.symbol; render symbol-or-crosshair; table indicator + refresh
  modes/harmonics/HarmonicsMode.js # default 'cross'; skip null symbol mark (keep line + label)
  main.js                        # restore marker/harmonic symbol default 'cross'; new instance fields
  types.js                       # SymbolType +cross; AnalysisMarker/StoredMarker.symbol; instance methods
tests/
  reformat-markers-harmonics.spec.js  # NEW — US1/US2/US3 coverage
  harmonic-symbols.spec.js       # US3 legacy default updated circle -> cross
  harmonic-labels.spec.js        # beforeEach selects a shaped symbol (default is now cross)
```

## Phasing

- **Phase 0 — cross style**: symbol catalogue, default, `null` render, shared
  colour indicator. (FR-001, FR-002, FR-003)
- **Phase 1 — selection drives controls**: picker takes the instance;
  `syncStyleControls`; route changes to selection or next-feature. (FR-004,
  FR-005, FR-006, FR-007, FR-008, FR-013)
- **Phase 2 — markers carry symbols**: marker `symbol`, render, table indicator.
  (FR-009, FR-010)
- **Phase 3 — persistence**: additive marker `symbol`; restore defaults to
  `cross`; legacy loads clean. (FR-011, FR-012)
- **Phase 4 — tests & gates**: new spec; adapt the two default-dependent specs;
  typecheck / test / build green.
