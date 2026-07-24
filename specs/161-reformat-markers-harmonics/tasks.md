# Tasks: Reformat Existing Markers & Harmonics, with a "Cross" (Symbol-less) Style

**Branch**: `161-reformat-markers-harmonics` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Tasks are grouped by phase. `[P]` marks tasks that touch independent files and
could be done in parallel. Each task lists the functional requirements it
satisfies.

## Phase 0 — The "cross" (symbol-less) style

- [x] **T001** In `src/rendering/symbols.js`, export `DEFAULT_SYMBOL = 'cross'`,
  add `'cross'` as the first entry of `SYMBOL_CATALOG`, and add its
  `SYMBOL_DISPLAY_NAMES` entry. (FR-001, FR-002)
- [x] **T002** In `createSymbolMark()`, resolve unknown/absent symbols to
  `DEFAULT_SYMBOL` and return `null` for `cross` (draw no shape). Update the
  return type and doc. (FR-003)
- [x] **T003** Add `createColorIndicator(symbol, color, size)` to
  `src/rendering/symbols.js`: symbol swatch for a shape, filled colour rectangle
  for `cross`. (FR-010)
- [x] **T004** In `src/core/state.js`, change `selectedSymbol` default from
  `'circle'` to `'cross'`. (FR-002)
- [x] **T005 [P]** In `src/types.js`, add `'cross'` to `SymbolType`; document the
  default. (FR-001)

## Phase 1 — Selection drives the style controls; restyle in place

- [x] **T006** In `src/core/keyboardControl.js`, add `getSelectedFeature()`,
  `getActiveStyle()`, `applyColorToSelectedFeature()`,
  `applySymbolToSelectedFeature()` (mutate the selected feature, re-render
  overlay + affected table, notify listeners). (FR-005, FR-006, FR-007)
- [x] **T007** In `setSelection()` and `clearSelection()`, call
  `instance.syncStyleControls?.()` so the controls reflect the selection (or
  next-feature defaults when cleared). (FR-004, FR-013)
- [x] **T008** In `src/core/initialization/EventBindings.js`, bind
  `applyColorToSelectedFeature` / `applySymbolToSelectedFeature` onto the
  instance. (FR-005, FR-006)
- [x] **T009** In `src/components/SymbolPicker.js`, take the `instance`; on
  change route to `applySymbolToSelectedFeature`, else set
  `state.selectedSymbol`; add the `cross` glyph; register `instance._symbolControl`
  (`setValue` / `setTint`). (FR-006, FR-008)
- [x] **T010** In `src/components/ColorPicker.js`, take the `instance`; on canvas
  click route to `applyColorToSelectedFeature`, else set `state.selectedColor`;
  define `instance.syncStyleControls()` from `getActiveStyle()`. (FR-004, FR-005,
  FR-008)
- [x] **T011 [P]** In `src/components/MainUI.js`, pass `instance` to
  `createColorPicker`. (FR-004)

## Phase 2 — Markers carry a symbol

- [x] **T012** In `src/modes/analysis/AnalysisMode.js`, set `marker.symbol` from
  `state.selectedSymbol` on creation; add `MARKER_SYMBOL_SIZE`. (FR-009)
- [x] **T013** In `renderMarker()`, draw the colour-coded symbol when the marker
  has a shaped symbol, else the crosshair (cross). (FR-009)
- [x] **T014** In the markers table, build the colour cell via
  `createColorIndicator()` and refresh it in `updateMarkerRow()` so an in-place
  restyle shows immediately. (FR-010)
- [x] **T015 [P]** In `src/components/HarmonicPanel.js`, build the harmonics-table
  colour cell via `createColorIndicator()` (rectangle for `cross`). (FR-010)
- [x] **T016 [P]** In `src/modes/harmonics/HarmonicsMode.js`, default new sets to
  `cross`; skip the `null` symbol mark while still drawing the line and label.
  (FR-002, FR-003)

## Phase 3 — Persistence & legacy

- [x] **T017** In `src/core/storage.js`, persist `marker.symbol` (default
  `cross`) and change the harmonic-set save/restore default to `cross`; keep it
  additive (no `SCHEMA_VERSION` bump). (FR-011, FR-012)
- [x] **T018** In `src/main.js` `_restoreAnnotations()`, default restored marker
  and harmonic symbols to `cross`; add the new instance fields. (FR-011, FR-012)
- [x] **T019 [P]** In `src/types.js`, add `symbol` to `AnalysisMarker` and
  `StoredMarker`, and the new instance method properties. (FR-009, FR-011)

## Phase 4 — Tests & gates

- [x] **T020** New `tests/reformat-markers-harmonics.spec.js` — US2 (cross is the
  default, symbol-less), US1 (select → controls reflect; restyle colour/symbol in
  place; only selected changes; cross keeps lines/labels; nothing-selected sets
  next feature), US3 (assign a marker a symbol; revert to cross; colour restyle
  affects only the selected marker). (SC-001…SC-006)
- [x] **T021** Update `tests/harmonic-symbols.spec.js` US3 — legacy no-symbol set
  now loads as `cross` (no pin symbol, rectangle table indicator). (FR-012)
- [x] **T022** Update `tests/harmonic-labels.spec.js` `beforeEach` to select a
  shaped symbol (the default is now `cross`).
- [x] **T023** `yarn typecheck`, `yarn test`, `yarn build` all pass. (SC-007)

## Coverage

Every functional requirement FR-001…FR-013 is covered: FR-001/002/003 (T001–T005,
T016); FR-004 (T007, T010, T011); FR-005/006/007 (T006, T008, T009, T010);
FR-008 (T009, T010); FR-009 (T012, T013); FR-010 (T003, T014, T015); FR-011
(T017, T018, T019); FR-012 (T017, T018, T021); FR-013 (T007). Success criteria
SC-001…SC-007 are exercised by T020–T023.
