# Tasks: Phase 2 — Consolidating the Interest-Accruing Seams

**Input**: Design documents from `/specs/166-consolidation/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: REQUIRED, and non-negotiable here. FR-001 — "Every consolidation MUST
land behind a behaviour-pinning test written and passing BEFORE the duplicate
paths are removed" — plus constitution Principle II. Test tasks are not optional
decoration in this feature; in US1 they *are* the deliverable.

**Organization**: Grouped by user story. Each story is independently
implementable and testable, with one exception recorded explicitly below.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US5, mapping to the spec's user stories

## Path Conventions

Single project: `src/`, `tests/` at repository root (per plan.md Structure Decision).

## ⚠️ Story ordering is load-bearing

Unlike a typical spec-kit feature, these stories are **not** freely parallelisable:

| Constraint | Reason |
|---|---|
| **US1 → US4 is a hard dependency** | `GramFramePage.getState()` reads the debug page's state display, written by a state listener. Once dispatch is asynchronous, every `waitForTimeout`-based read of that display is a race. US4 must not start before T023. |
| **US1 → US2 strongly recommended** | US2's safety argument is "the full suite still passes". T017 (arrow-key spec) is the specific coverage protecting US2's rewire of `keyboardControl.js`. |
| US3, US5 | Independent of each other and of US2/US4 once US1 lands. |

US1 is therefore both the MVP *and* the gate.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Nothing to scaffold — the project, the Vitest lane (spec 164) and
the ratchets already exist. These tasks establish the measurement baseline every
later task is checked against.

- [ ] T001 Record the phase-start baseline in `specs/166-consolidation/baseline.md`: output of `grep -ro waitForTimeout tests/ | wc -l` (expect 244), `yarn hygiene`, and `git rev-parse HEAD` — the reference point for SC-005 and SC-006
- [ ] T002 [P] Verify the gate commands all pass on a clean tree before any change: `yarn typecheck && yarn lint && yarn test:unit && yarn hygiene && yarn build`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared test vocabulary US1 spends 200+ call sites using. Writing
these first is what stops the wait migration becoming 200 ad-hoc `expect.poll`
snippets.

**⚠️ CRITICAL**: T003–T004 block all of US1.

- [ ] T003 Add state-wait helpers to `tests/helpers/gram-frame-page.js`: `waitForState(predicate, opts)` (polls `getState()`), `waitForMarkerCount(n)`, `waitForHarmonicSetCount(n)`, `waitForMode(mode)`, `waitForZoomLevel(level)` — each built on `expect.poll` with the config timeout, no fixed sleeps
- [ ] T004 [P] Add DOM-condition helpers to `tests/helpers/gram-frame-page.js`: `waitForTableRowCount(table, n)` and `waitForSelectedRow(table, key)` using `expect(locator).toHaveCount()` / `toHaveClass()`

**Checkpoint**: Helpers exist and are unit-exercised by at least one migrated call site.

---

## Phase 3: User Story 1 — Deterministic tests & restored keyboard coverage (Priority: P1) 🎯 MVP

**Goal**: The suite gives the same answer twice. 244 `waitForTimeout` → ≤ 20
justified, CI `retries: 0`, and arrow-key movement covered by assertions on data
coordinates rather than visibility.

**Independent Test**: Run the full suite 5× with `--retries=0`; zero flakes. The
new keyboard spec fails if arrow-key movement breaks.

### Migration — helpers first (used everywhere)

- [ ] T005 [US1] Replace all 15 `waitForTimeout` calls in `tests/helpers/interaction-helpers.js` with the T003/T004 helpers
- [ ] T006 [US1] Replace all 7 `waitForTimeout` calls in `tests/helpers/mode-helpers.js` with the T003/T004 helpers
- [ ] T007 [US1] Replace the 3 `waitForTimeout` calls in `tests/helpers/gram-frame-page.js` (lines ~337, ~481, ~493 per GF-27) with state-based waits
- [ ] T008 [US1] Run the full suite 3× and lower `waitForTimeoutOccurrences` in `hygiene-baseline.json` to the measured count (FR-011)

### Migration — the four heaviest specs

- [ ] T009 [P] [US1] Replace all 43 `waitForTimeout` calls in `tests/reformat-markers-harmonics.spec.js`
- [ ] T010 [P] [US1] Replace all 30 `waitForTimeout` calls in `tests/storage.spec.js`
- [ ] T011 [P] [US1] Replace all 19 `waitForTimeout` calls in `tests/harmonic-pin-toggle.spec.js`
- [ ] T012 [P] [US1] Replace all 16 `waitForTimeout` calls in `tests/harmonic-pin-sampling.spec.js`
- [ ] T013 [US1] Lower `waitForTimeoutOccurrences` in `hygiene-baseline.json` to the measured count after T009–T012 (expect ≈ 111)

### Migration — the remaining specs, down to the justified residue

- [ ] T014 [P] [US1] Replace `waitForTimeout` in the mid-weight specs: `tests/doppler-mode.spec.js` (11), `tests/keyboard-simple.spec.js` (9), `tests/harmonic-labels.spec.js` (9), `tests/harmonic-hotspot.spec.js` (9), `tests/analysis-mode.spec.js` (9), `tests/harmonic-symbols.spec.js` (8)
- [ ] T015 [P] [US1] Replace `waitForTimeout` in the light specs: `tests/harmonic-pin-height.spec.js` (6), `tests/focus-interaction.spec.js` (6), `tests/basic-functionality.spec.js` (6), `tests/harmonic-label-halo.spec.js` (5), `tests/harmonics-mode.spec.js` (4), `tests/image-scaling.spec.js` (3), `tests/focus-simple.spec.js` (3), `tests/table-scroll.spec.js` (2), `tests/tab-navigation.spec.js` (2), `tests/expand-image.spec.js` (2), `tests/advanced-interactions.spec.js` (2), `tests/mode-integration.spec.js` (1)
- [ ] T016 [US1] Add an inline justification comment above each surviving `waitForTimeout` explaining why no state or DOM condition expresses the wait; confirm the total is ≤ 20 and lower `hygiene-baseline.json` to it (FR-007, SC-005, AS-1.3)

### Restored keyboard coverage

- [ ] T017 [US1] Create `tests/keyboard-movement.spec.js` asserting arrow-key **data-coordinate deltas**: select a marker at a known position, press each arrow key, assert `state.analysis.markers[i].freq`/`.time` changed by the expected increment; repeat for a selected harmonic set's spacing and anchor time; run each at zoom 1.0 and at a zoomed level where the rendered movement must stay constant (FR-008, AS-1.2)
- [ ] T018 [US1] Delete `tests/keyboard-focus.spec.js.disabled` and `tests/keyboard-focus-simple.spec.js.disabled` — their FocusManager coverage is already active in `tests/focus-simple.spec.js` and `tests/tab-navigation.spec.js` (research.md §R3); lower the ratchet by the 14 occurrences they contained

### Determinism gate

- [ ] T019 [US1] Run `for i in 1 2 3 4 5; do npx playwright test --retries=0 || break; done` — five consecutive green runs required (AS-1.1, SC-001)
- [ ] T020 [US1] Triage any flake T019 exposes: identify the racing condition and replace the wait; do not paper over it by restoring a timeout
- [ ] T021 [US1] Set `retries: 0` unconditionally in `playwright.config.ts:15` (currently `process.env.CI ? 2 : 0`) (FR-007, AS-1.4)
- [ ] T022 [P] [US1] Opportunistic POM adoption in the ~6–8 small specs that duplicate selectors instead of using `GramFramePage` (GF-28ᴿ) — scope-limited, skip any spec where the change is not mechanical
- [ ] T023 [US1] Confirm CI is green with `retries: 0` on a pushed branch — **this is the gate that unblocks US4**

**Checkpoint**: Suite is deterministic. US2 and US4 may now proceed.

---

## Phase 4: User Story 2 — One coordinate pipeline (Priority: P1)

**Goal**: One module owns every screen/SVG/image/data conversion, and it is
zoom-, expand-, render-size- and margin-aware so no caller compensates externally.

**Independent Test**: The Vitest equivalence grid passes against the canonical
module for every (zoom, expand, render-size, margin) case.

### Pin FIRST — no source changes in this group (FR-001, AS-2.1)

- [ ] T024 [US2] Create `tests/unit/coordinate-equivalence.test.js` importing **all four live implementations** — `src/utils/coordinates.js`, `src/utils/coordinateTransformations.js`, and test-only re-exports of the private functions in `src/core/keyboardControl.js` and the inline `screenToDataWithZoom` in `src/core/events.js` — with a `{getAttribute}` stub standing in for the SVG image element
- [ ] T025 [US2] Implement the grid from research.md §R2 in `tests/unit/coordinate-equivalence.test.js`: zoom ∈ {1, 1.5, 2, 4} × expand ∈ {off, on} × render size ∈ {natural, 2×, non-uniform} × margins ∈ {default, zero, asymmetric} × rate ∈ {1, 2}, sampling image corners, centre, and points just outside each edge
- [ ] T026 [US2] Assert equivalences E1–E6 from `contracts/coordinates.md` at 1e-9 relative tolerance, with E3 narrowed to zoom 1 / expand off and replaced elsewhere by the rendered-pixels-per-keypress equivalence
- [ ] T027 [US2] Run `yarn test:unit` — **if any cell fails, STOP**: the pin is not faithful. Raise the divergence as its own issue, triage it, and do not begin T028 until the grid is green (spec Assumptions, AS-2.1)

### Consolidate — only after T027 is green

- [ ] T028 [US2] Move the zoom-aware implementations from `src/utils/coordinateTransformations.js` into `src/utils/coordinates.js` under the surface in `contracts/coordinates.md`: `screenToSVG`, `svgToImage`, `imageToData`, `dataToSVG`, `screenToData`, `getImageBounds`, `isWithinImage` — canonical path per constitution Principle I (research.md §R1)
- [ ] T029 [US2] Delete `src/utils/coordinateTransformations.js` and rewire its importers to `src/utils/coordinates.js`
- [ ] T030 [US2] Delete the private `dataToSVGCoordinates` and `svgToDataCoordinates` from `src/core/keyboardControl.js` (lines ~308–360) and route `moveSelectedMarker`/`moveSelectedHarmonicSet` through the canonical module
- [ ] T031 [US2] Remove the external zoom compensation in `src/core/keyboardControl.js` (the `increment / zoomLevel` division) now that the canonical module is zoom-aware (FR-003, I2)
- [ ] T032 [US2] Delete the inline `screenToDataWithZoom` from `src/core/events.js` (lines ~27–86) and call `screenToData` + `isWithinImage` instead, preserving the current out-of-bounds `null` semantics at the call site
- [ ] T033 [US2] Repoint `tests/unit/coordinate-equivalence.test.js` at the canonical module alone, keeping the grid as the regression suite; remove the test-only re-exports added in T024
- [ ] T034 [US2] Verify no transform maths survives outside the canonical module: `grep -rn 'renderWidth' src/ | grep -v 'utils/coordinates.js'` returns no positioning arithmetic (FR-002)
- [ ] T035 [US2] Run `yarn test:unit && npx playwright test tests/keyboard-movement.spec.js && yarn test`; confirm `git diff --stat tests/` shows zero spec diffs from this group (SC-002, AS-2.2)
- [ ] T036 [US2] Run `yarn hygiene`: madge cycle count must not increase (AS-2.3); lower `circularDependencies` and `unusedExportModules` baselines where the deletions allow (FR-011)
- [ ] T037 [US2] Add a Playwright assertion that mouse, keyboard, wheel-zoom and expand report identical data coordinates for the same physical point across zoom/expand combinations (AS-2.4, SC-003)

**Checkpoint**: One coordinate module. Three implementations deleted.

---

## Phase 5: User Story 3 — One drag engine (Priority: P2)

**Goal**: Five drag machines become one, and drag state has a single owner with
one read-only projection.

**Independent Test**: Each of the five interactions has a Playwright spec passing
before and after the port; `grep` shows one `isDragging` owner in `src/`.

### Engine extension

- [ ] T038 [US3] Extend `src/modes/shared/BaseDragHandler.js` with the four drag kinds and the `resolveTarget` callback from `contracts/drag-engine.md`; make `DragTarget.id`/`.type` nullable so pan drags need no feature target
- [ ] T039 [P] [US3] Add `DragKind`, `DragTarget` and `DragProjection` typedefs to `src/types.js` per data-model.md §2–3

### Port one machine per PR — newest and least-covered last

- [ ] T040 [US3] Port the Harmonics creation drag (`src/modes/harmonics/HarmonicsMode.js:202-210,255-261,551-599`) to a `create`-kind drag; gate on `tests/harmonics-mode.spec.js` passing **unchanged**
- [ ] T041 [US3] Port the Doppler placement drag (`src/modes/doppler/DopplerMode.js:256-260,288-310,322-354`) to a `place`-kind drag, leaving `tempFirst`/`previewEnd` on `state.doppler` as renderer geometry; gate on `tests/doppler-mode.spec.js` passing unchanged
- [ ] T042 [US3] Port the PanMode drag (`src/modes/pan/PanMode.js:17-21,57-134`) to a `pan`-kind drag; gate on `tests/pan-zoom.spec.js` passing unchanged
- [ ] T043 [US3] Port the middle-button wheel-pan (`instance._wheelPan` in `src/core/events.js:115-120,208-217,264-280,300-304,323-326`) to a centrally-resolved `pan`-kind drag ahead of mode resolvers, preserving `preventDefault` autoscroll suppression; gate on `tests/pan-zoom.spec.js` (US3 of feature 160) passing unchanged

### Collapse the mirrors (FR-004, AS-3.2)

- [ ] T044 [US3] Add the `state.drag` read-only projection, rebuilt from the owning handler on each dispatch, always present with `active: false` when idle (data-model.md §2)
- [ ] T045 [US3] Remove `isDragging`/`draggedMarkerId`/`dragStartPosition` from `state.analysis`, the whole `state.dragState` slot, and `isDragging`/`draggedMarker`/`isPlacingMarkers`/`isPreviewDrag` from `state.doppler`; update `AnalysisState`, `DopplerState` and `DragState` in `src/types.js` (FR-010)
- [ ] T046 [P] [US3] Migrate the four in-repo readers to `state.drag`: `tests/doppler-mode.spec.js:674,702`, `tests/mode-integration.spec.js:320,321`, and the `'dragState'` entry in `tests/state-hygiene.spec.js:63`
- [ ] T047 [US3] Update the data/state documentation in `docs/` to describe `state.drag` and record the removed mirror fields, in the same PR as T045 (FR-010)
- [ ] T048 [US3] Verify the single owner: `grep -rn 'isDragging' src/ | grep -v shared/BaseDragHandler.js` shows only reads of `state.drag`; `grep -rn '_wheelPan\|state.dragState' src/` returns nothing
- [ ] T049 [US3] Add a `state-hygiene.spec.js` assertion that at most one drag is active across all modes at any time (data-model.md §2 validation rules)

**Checkpoint**: One drag engine, one drag record.

---

## Phase 6: User Story 4 — Batched, throttled notifications (Priority: P2)

**Goal**: One gesture, one notification. One clone per dispatch, and none when no
listener is registered.

**⚠️ BLOCKED until T023.** Asynchronous dispatch makes every
`waitForTimeout`-based read of the debug state display racy.

**Independent Test**: A counting listener sees exactly one notification per mode
switch, and a frame-bounded count under a 60-event burst.

### Pin FIRST (FR-001)

- [ ] T050 [US4] Create `tests/unit/notification-batching.test.js` pinning today's behaviour: clone count per notification, and the fact that a mode switch currently fires ≥ 2
- [ ] T051 [P] [US4] Add a Playwright counting-listener spec to `tests/state-listener.spec.js` recording today's notification counts for a mode switch, a 60-event mousemove burst and a wheel burst — the "before" side of the compatibility comparison

### Dispatcher

- [ ] T052 [US4] Implement `dispatch(instance, options)` and `flushDispatch(instance)` in `src/core/state.js` per `contracts/notifications.md`: microtask coalescing by default, `{frame: true}` for animation-frame cadence, frame-tier upgraded (never downgraded) by a default-tier dispatch
- [ ] T053 [US4] Move the single deep clone inside `dispatch` and skip it entirely when `listeners.length === 0` (FR-005, N2)
- [ ] T054 [US4] Convert the default-tier call sites to `dispatch(instance)`: `src/main.js` (5), `src/core/keyboardControl.js` (7), `src/components/table.js` (2), `src/components/SymbolPicker.js` (2), `src/components/ExpandToggle.js` (2), `src/api/GramFrameAPI.js` (2)
- [ ] T055 [US4] Convert the high-frequency call sites to `dispatch(instance, {frame: true})`: `src/core/events.js` (3, incl. mousemove), `src/core/viewport.js` (2, incl. the per-notch `setZoom`), and the drag-move paths in `src/modes/doppler/DopplerMode.js` (7), `src/modes/harmonics/HarmonicsMode.js` (4), `src/modes/analysis/AnalysisMode.js` (4) (FR-006)
- [ ] T056 [US4] Stop exporting `notifyStateListeners` to modes and add an ESLint `no-restricted-imports` rule in `eslint.config.js` failing any `src/modes/**` import of it (FR-005, AS-4.4)
- [ ] T057 [US4] Call `flushDispatch` on instance destroy/teardown so no notification is lost on unmount (N6)

### Storage listener gate

- [ ] T058 [US4] Gate the annotation-save listener at `src/main.js:447` on an annotation-relevance signature (marker count, harmonic-set count, doppler marker identity, mutation counter), returning early when unchanged (AS-4.3, research.md §R6)
- [ ] T059 [US4] Add a mutation counter bumped by the annotation-mutating paths in `src/core/state.js` and the modes

### Verify

- [ ] T060 [US4] Extend `tests/state-listener.spec.js`: one mode switch → exactly 1 notification (AS-4.1)
- [ ] T061 [US4] Assert a 60-event mousemove/wheel burst yields a count bounded by elapsed frames, and that the settled state matches the T051 "before" value (AS-4.2, SC-004)
- [ ] T062 [US4] Assert 20 cursor moves with no annotation change produce zero storage writes (AS-4.3)
- [ ] T063 [US4] Verify HMR listener preservation still holds after the dispatcher change (constitution Technical Constraints)
- [ ] T064 [US4] Run the full suite 5× with `retries: 0` — the batching change must not reintroduce flakes (SC-001)

**Checkpoint**: One dispatcher, batched and frame-bounded.

---

## Phase 7: User Story 5 — One diffing-table component (Priority: P3)

**Goal**: One row-diffing engine serves both the markers table and the harmonics panel.

**Independent Test**: Existing markers-table and harmonics-panel specs pass unchanged.

- [ ] T065 [US5] Create `src/components/DiffingTable.js` exporting `createDiffingTable(container, spec)` per `contracts/diffing-table.md`, owning the scroll wrapper, header construction, update-in-place, rebuild-from-index, trailing-row removal, click-to-select and delete-button propagation
- [ ] T066 [P] [US5] Add the `TableSpec` typedef to `src/types.js` (data-model.md §3)
- [ ] T067 [US5] Adopt `DiffingTable` in the markers table, deleting the engine at `src/modes/analysis/AnalysisMode.js:577-717` and the scroll wrapper at `:373-377`; keep rendered DOM structure and class names identical (T2)
- [ ] T068 [US5] Adopt `DiffingTable` in the harmonics panel, deleting the engine at `src/components/HarmonicPanel.js:62-232` and the scroll wrapper at `:32-36`
- [ ] T069 [US5] Verify `tests/analysis-mode.spec.js`, `tests/harmonics-mode.spec.js`, `tests/reformat-markers-harmonics.spec.js` and `tests/table-scroll.spec.js` pass **unchanged** across add, update, remove, select and delete in both tables (AS-5.1)
- [ ] T070 [US5] Demonstrate AS-5.2: make one mechanism change (selected-row styling) in `src/components/DiffingTable.js` alone and confirm it appears in both tables

**Checkpoint**: One table engine.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T071 Lower every `hygiene-baseline.json` count to its final measured value and confirm none was raised at any point in the phase (FR-011)
- [ ] T072 [P] Update `CLAUDE.md`'s File Structure list: remove `src/utils/coordinateTransformations.js`, add `src/components/DiffingTable.js` — the project instructions require this list to stay in step with `src/`
- [ ] T073 [P] Update `docs/` architecture notes to describe the single coordinate module, the single drag engine and the dispatcher
- [ ] T074 Mark GF-01ᴿ, GF-07, GF-08, GF-17, GF-18, GF-20, GF-26ᴺ, GF-27 and GF-28ᴿ as resolved in `docs/analysis/Findings-Register.md`, citing the PRs
- [ ] T075 Verify SC-006: `git diff --shortstat main...HEAD` is net-negative in lines across the phase
- [ ] T076 Run the full `quickstart.md` validation — every phase exit criterion SC-001 through SC-006

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: after Setup — blocks US1 only
- **US1 (Phase 3)**: after Foundational — **gates US2 and US4**
- **US2 (Phase 4)**: after T023 (strongly recommended; T017 is its protective coverage)
- **US3 (Phase 5)**: after Foundational; independent of US2/US4/US5
- **US4 (Phase 6)**: **hard-blocked on T023**
- **US5 (Phase 7)**: after Foundational; independent of all others
- **Polish (Phase 8)**: after all desired stories

### Within-story ordering

- Pin tests before deletions, always (T024–T027 before T028; T050–T051 before T052)
- Engine extension before ports (T038 before T040–T043)
- All ports before mirror collapse (T043 before T044)
- Component before adoption (T065 before T067–T068)

### Parallel Opportunities

- T009–T012 — four independent spec files, no shared state
- T014, T015 — disjoint spec-file sets
- T039, T046, T066, T072, T073 — independent files
- **Across stories**: once T023 lands, US3 and US5 can run alongside US2 by different developers; US4 should not overlap US2 (both touch `events.js` and the mode files heavily)

---

## Parallel Example: User Story 1, heaviest specs

```bash
# After T005–T008, launch the four heavy-spec migrations together:
Task: "Replace all 43 waitForTimeout calls in tests/reformat-markers-harmonics.spec.js"
Task: "Replace all 30 waitForTimeout calls in tests/storage.spec.js"
Task: "Replace all 19 waitForTimeout calls in tests/harmonic-pin-toggle.spec.js"
Task: "Replace all 16 waitForTimeout calls in tests/harmonic-pin-sampling.spec.js"
```

---

## Implementation Strategy

### MVP: User Story 1 only

1. Phase 1 Setup → Phase 2 Foundational → Phase 3 US1
2. **STOP and VALIDATE**: five consecutive green runs at `retries: 0`
3. US1 has standalone value even if the phase ends here — a deterministic suite
   and restored keyboard coverage are the deliverable, not scaffolding

### Incremental delivery

1. US1 → deterministic suite (MVP, and the gate)
2. US2 → one coordinate pipeline (the fastest-accruing finding)
3. US3 → one drag engine
4. US4 → batched notifications (only after US1 is merged)
5. US5 → one diffing table

### If the phase must be cut short

Ship US1 + US2. Those two carry SC-001, SC-002, SC-003 and SC-005, and they
close the finding the re-verification caught actively worsening (feature-156/160
support copy-pasted into all four coordinate pipelines). US3–US5 are real debt
but are not compounding at the same rate.

---

## Notes

- Every task's exit is `yarn typecheck && yarn test && yarn build` green — the
  constitution's Quality Gates, no exceptions
- FR-001 is a hard rule, not a preference: if a pin test cannot be written for a
  deletion, the deletion does not happen
- T027 has a genuine STOP condition. A red grid means the four implementations
  already disagree; that is a bug to triage, not an obstacle to route around
- Commit after each task or logical group; one PR per plan.md sequencing row
