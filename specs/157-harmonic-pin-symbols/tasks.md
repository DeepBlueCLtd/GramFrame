# Tasks: Symbols on Harmonic Pins

**Input**: Design documents from `/specs/157-harmonic-pin-symbols/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: INCLUDED — the GramFrame constitution (Principle II, Test-First,
NON-NEGOTIABLE) requires Playwright coverage for all user-facing behavior, and
the spec defines explicit acceptance scenarios per story.

**Organization**: Tasks are grouped by user story so each can be implemented and
tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: US1 / US2 / US3 (from spec.md)
- Exact file paths included

## Path Conventions

Single-project front-end component: `src/` and `tests/` at repository root
(per plan.md Structure Decision).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No project initialization needed (existing repo, zero runtime
deps). Establish the shared type vocabulary the whole feature uses.

- [X] T001 Add `SymbolType` JSDoc typedef (`'circle'|'square'|'diamond'|'triangle'|'triangle-down'|'star'`) in `src/types.js`, and extend `HarmonicSet` with `symbol: SymbolType`, `StoredHarmonicSet` with optional `symbol?: SymbolType`, and the `GramFrameState` typedef with `selectedSymbol: SymbolType` (see contracts/state-shape.md)

**Checkpoint**: Types compile — `yarn typecheck` still clean.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core building blocks every user story depends on: the default
selected-symbol state and the shared SVG mark factory.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Add `selectedSymbol: 'circle'` default to the initial state in `src/core/state.js` (mirrors `selectedColor`)
- [X] T003 [P] Create shared pure SVG mark factory `src/rendering/symbols.js` exporting `createSymbolMark(symbolType, cx, cy, size, color) → SVGElement` for all catalogue shapes (circle, square, diamond, triangle, triangle-down, star), defaulting unknown/absent values to `circle`, with class `gram-frame-harmonic-symbol` and `fill = color` (see contracts/symbol-catalog.md)

**Checkpoint**: Factory returns a correct detached SVG element for every symbol
id; state exposes `selectedSymbol`.

---

## Phase 3: User Story 1 - Distinguish harmonic sets by symbol as well as colour (Priority: P1) 🎯 MVP

**Goal**: Analyst chooses a symbol from a control-panel drop-down; every new
harmonic set (click/drag or manual add) draws that filled symbol in the set's
colour at the top of each pin (clear of the pin label), and the harmonics table
shows the symbol in the set's colour.

**Independent Test**: Select a symbol, create a harmonic set, and confirm the
filled symbol of that shape/colour renders at the top of the pins and in the
harmonics-table row; verify the pin label is not obscured.

### Tests for User Story 1 ⚠️ (write first, ensure they fail before implementation)

- [X] T004 [P] [US1] Add Playwright test: symbol drop-down is present in the control panel and offers circle/square/diamond (plus the additional shapes) in `tests/harmonic-symbols.spec.js`
- [X] T005 [P] [US1] Add Playwright test: selecting a symbol + colour then creating a harmonic set by click/drag renders a filled symbol of that shape and colour at the top of each pin, and the pin-number label remains readable (right of the line) in `tests/harmonic-symbols.spec.js`
- [X] T006 [P] [US1] Add Playwright test: creating a harmonic set via the manual add dialog uses the currently selected symbol in `tests/harmonic-symbols.spec.js`
- [X] T007 [P] [US1] Add Playwright test: each harmonics-table row shows the set's symbol rendered in the set's colour in `tests/harmonic-symbols.spec.js`

### Implementation for User Story 1

- [X] T008 [P] [US1] Create `src/components/SymbolPicker.js` exporting `createSymbolPicker(state)` — a native `<select>` drop-down listing the catalogue shapes (optionally with inline-SVG previews) that writes the chosen value to `state.selectedSymbol` (follow the `src/components/ColorPicker.js` pattern)
- [X] T009 [US1] Re-export `createSymbolPicker` from `src/components/UIComponents.js` (mirrors the `createColorPicker` re-export)
- [X] T010 [US1] Mount the symbol picker in the controls column immediately after the colour picker in `src/components/MainUI.js`, label it "Symbol", and store `instance.symbolPicker` reference
- [X] T011 [US1] In `HarmonicsMode.addHarmonicSet` (`src/modes/harmonics/HarmonicsMode.js`), assign `symbol = this.instance.state.selectedSymbol || 'circle'` and include `symbol` in the created `harmonicSet` object (covers both click/drag and manual-add, which call this function)
- [X] T012 [US1] In `HarmonicsMode.renderHarmonicSet` (`src/modes/harmonics/HarmonicsMode.js`), draw the set's symbol via `createSymbolMark` at the top of each pin (centred on `lineX`, at/just above `lineTop`), filled with `harmonicSet.color`, appended to `cursorGroup` with `data-harmonic-set-id`; nudge downward if it would clip the top edge; ensure `renderPersistentFeatures` clears prior symbol marks alongside the harmonic lines
- [X] T013 [US1] In `src/components/HarmonicPanel.js`, render the set's symbol as an inline SVG mark (from `createSymbolMark`) filled with the set's colour in the row's colour cell, for both `createHarmonicRow` and the row-update path

**Checkpoint**: US1 fully functional — symbol selectable, drawn on pins and in
the table, label unobstructed. MVP deliverable.

---

## Phase 4: User Story 2 - Preserve symbols across save and reload (Priority: P2)

**Goal**: Symbols assigned to harmonic sets survive a save/reload round-trip.

**Independent Test**: Create sets with distinct symbols, persist and reload, and
confirm each set returns with its original symbol and colour.

**Depends on**: US1 (sets must carry a `symbol`). Persistence uses the additive
field with **no** `SCHEMA_VERSION` bump (see contracts/persistence-schema.md).

### Tests for User Story 2 ⚠️

- [X] T014 [P] [US2] Add Playwright test: create harmonic sets with different symbols, trigger save, reload the instance, and assert each set's symbol (on pins and in the table) is preserved in `tests/harmonic-symbols.spec.js`

### Implementation for User Story 2

- [X] T015 [US2] In `saveAnnotations` (`src/core/storage.js`), include `symbol: hs.symbol || 'circle'` in the persisted harmonic-set mapping; keep `SCHEMA_VERSION = 1` (additive field, no bump)
- [X] T016 [US2] In `_restoreAnnotations` (`src/main.js`), map restored harmonic sets to carry their persisted `symbol` (preserving explicit values)

**Checkpoint**: US1 + US2 work — symbols persist across reload.

---

## Phase 5: User Story 3 - Gracefully display legacy harmonics that predate symbols (Priority: P2)

**Goal**: Harmonic sets persisted before this feature (no `symbol`) reload
without error, each shown with a default circle.

**Independent Test**: Seed storage with a pre-feature blob (`version: 1`,
harmonic sets lacking `symbol`), reload, and confirm every set renders a circle
and nothing errors.

**Depends on**: US1 (rendering path) and shares the `_restoreAnnotations` edit
with US2. Critical constraint: the strict `version !== SCHEMA_VERSION` guard
means the version MUST stay `1` so legacy data is not discarded.

### Tests for User Story 3 ⚠️

- [X] T017 [P] [US3] Add Playwright test: seed storage with a legacy `version: 1` annotations blob whose harmonic sets have no `symbol`, reload, and assert every pin and table swatch renders `circle` with no console error in `tests/harmonic-symbols.spec.js`

### Implementation for User Story 3

- [X] T018 [US3] In `_restoreAnnotations` (`src/main.js`), apply `symbol: hs.symbol || 'circle'` when mapping restored harmonic sets so legacy sets default to circle (extends the T016 mapping)
- [X] T019 [US3] Verify `loadAnnotations`/`SCHEMA_VERSION` remain unchanged so legacy v1 blobs are not discarded; add an inline note in `src/core/storage.js` documenting that `symbol` is additive and must not trigger a version bump

**Checkpoint**: All three stories work — new symbols, persistence, and legacy
fallback.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Styling, helpers, and quality gates.

- [X] T020 [P] Add any needed CSS for the symbol picker and table swatch alignment in `src/gramframe.css` (match colour-picker/lozenge styling)
- [X] T021 [P] Add `GramFramePage` helper methods for symbol assertions (e.g. read a pin's symbol shape/fill and a table row's swatch) in `tests/helpers/`
- [X] T022 Run `yarn typecheck` — resolve all JSDoc type errors
- [X] T023 Run `yarn test` — all Playwright tests green (including `tests/harmonic-symbols.spec.js`)
- [X] T024 Run `yarn build` — clean production build
- [X] T025 [P] Verify the manual walkthrough in `specs/157-harmonic-pin-symbols/quickstart.md` matches actual behavior (selector, pins, table, reload, legacy)

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (P1: T001)** → no dependencies; do first.
- **Foundational (P2: T002–T003)** → depends on T001; **blocks all user stories**.
- **US1 (P3)** → depends on Foundational. This is the MVP.
- **US2 (P4)** → depends on US1 (sets must carry a symbol).
- **US3 (P5)** → depends on US1; shares the `_restoreAnnotations` edit with US2
  (do US2's T016 before/with US3's T018).
- **Polish (P6)** → after the targeted stories are complete.

### Story completion order

1. Foundational (T001–T003)
2. **US1** — MVP (T004–T013)
3. **US2** — persistence (T014–T016)
4. **US3** — legacy fallback (T017–T019)
5. Polish (T020–T025)

### Within-story parallelism

- **US1 tests** T004–T007 are all `[P]` (independent assertions, same new spec
  file — write as separate `test(...)` blocks).
- **US1 impl**: T008 (`SymbolPicker.js`) is `[P]` vs T012/T013 (different files);
  T009→T010 are sequential (re-export then mount). T011/T012 are in the same file
  (`HarmonicsMode.js`) so not parallel with each other.
- Cross-file impl tasks touching distinct files can proceed in parallel once
  Foundational is done.

### Parallel execution example (US1)

```
# After T001–T003:
Run T004, T005, T006, T007 (tests) in parallel — they fail initially.
Then T008 [P] (SymbolPicker) alongside starting T013 [P] (HarmonicPanel).
Then T009 → T010 (wire selector into MainUI).
Then T011 → T012 (HarmonicsMode create + render).
Re-run US1 tests → green.
```

## Implementation Strategy

- **MVP = Foundational + US1** (T001–T013): symbol selectable and rendered on
  pins and in the table. Independently demoable and valuable on its own.
- **Increment 2 = US2** (T014–T016): symbols persist across reload.
- **Increment 3 = US3** (T017–T019): legacy annotations reload with circles.
- **Finish** with Polish (T020–T025) and the three quality gates
  (`typecheck` / `test` / `build`) required by the constitution before merge.

## Notes

- Keep `SCHEMA_VERSION = 1` throughout — bumping it would delete existing v1
  annotations because of the strict version guard in `loadAnnotations`.
- All symbol rendering is SVG (constitution Principle I); no Canvas or
  absolute-positioned DOM overlays.
- Symbol handling parallels the existing colour handling end-to-end
  (`selectedColor` → `selectedSymbol`, per-set `color` → per-set `symbol`).
