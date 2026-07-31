# Tasks: Phase 3 — Structural Refactor & Strict Type Gate

**Input**: Design documents from `/specs/167-structural-refactor/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [baseline.md](./baseline.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: REQUIRED but asymmetric. Stories 1–4 are refactors whose gate is **the
existing suite passing unchanged** — a spec that needed editing means the move
was not a move. New test tasks appear only where the spec demands new coverage:
US2's registration unit tests (AS-2.2), US5's public-API spec (FR-010, SC-006),
and the fifth-mode spike that is SC-003's evidence.

**Organization**: Grouped by user story. Unlike a typical spec-kit feature these
stories are only partly parallelisable — see the ordering table below.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US5, mapping to the spec's user stories

## Path Conventions

Single project: `src/`, `tests/` at repository root (per plan.md Structure Decision).

---

## ⚠️ Story ordering is load-bearing

| Constraint | Reason |
|---|---|
| **Phase 2 → US1** | The ceiling must exist before it can fall. T003–T005 block every burn-down task. |
| **US2 → US4 is a hard dependency** | Capability interfaces are declared at the registration seam US2 creates, and SC-003's fifth-mode test is meaningless while `state.js` still imports the mode roster. T027+ must not start before T017. |
| **US1 runs continuously alongside US2–US5** | The ceiling is established first and falls as a side effect of every PR that touches a strict-unclean file. T014 (the flag flip) is deliberately sequenced *after* US3 and US4 so moved code is written strict-clean once rather than fixed twice. |
| **US3 tasks are strictly ordered** | T021 → T022 → T023. `table.js`'s importers are rewired incrementally; the scaffold shrinks last. |
| **US3 is otherwise independent** | It shares no file with US2 or US4 and can proceed in parallel with them. |
| US5 | Last. Its ratchet target depends on US4 having removed its eight `FeatureRenderer` reach-ins. |

US1 is the MVP: it is the phase's only High-severity finding, and it is what
makes `yarn typecheck` mean what the Quality Gates claim.

---

## Standing gate (every task that changes code)

```bash
yarn typecheck && yarn test && yarn build && yarn hygiene && yarn lint && yarn test:unit
```

No task may raise a hygiene baseline (FR-011). When a task lowers a count, lower
the baseline in `hygiene-baseline.json` **in the same commit**.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Nothing to scaffold — the project, the Vitest lane and the ratchet
machinery all exist. These tasks fix the reference point every later task is
measured against.

- [x] T001 Record the phase-start reference in `specs/167-structural-refactor/baseline.md`: append the actual `git rev-parse HEAD` at phase start and confirm each measurement in that file still reproduces (strict count 540, madge 11, reach-ins 243, constructor fields 56)
- [x] T002 [P] Verify the standing gate passes on a clean tree before any change: `yarn typecheck && yarn lint && yarn test:unit && yarn hygiene && yarn build`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The three ratchets this phase burns down. Establishing all of them
up front — rather than at the head of each story — means a story that
accidentally *raises* another story's number is caught the same day.

**⚠️ CRITICAL**: T003–T005 block all of US1; T006 blocks US5's acceptance.

- [x] T003 Create `tsconfig.strict.json` at the repo root extending `./tsconfig.json` with `noImplicitAny`, `strictNullChecks` and `strictPropertyInitialization` all `true`, per [contracts/strict-ratchet.md](./contracts/strict-ratchet.md). It must live at the repo root — from anywhere else it cannot resolve `node_modules/@types` and reports ~46 phantom errors
- [x] T004 Add the `strictTypeErrors: 540` ratchet to `scripts/hygiene.js` and `hygiene-baseline.json`: run `tsc -p tsconfig.strict.json`, count `error TS` lines, print per-flag sub-counts (143 / 401) and top offending files as detail; skip the ratchet silently when `tsconfig.strict.json` is absent so the check disappears after T014
- [x] T005 Add the config-error guard to the `strictTypeErrors` ratchet in `scripts/hygiene.js`: output containing `TS5052`, `TS6046` or `TS5023` means the overlay is malformed and the count is meaningless — fail loudly, mirroring the existing madge `moduleCount < 10` guard
- [x] T006 [P] Add `instanceStateReachIns: 243` and `instanceFields: 56` ratchets to `scripts/hygiene.js` and `hygiene-baseline.json`, counting `instance.state` occurrences under `src/` and class-field declarations between `export class GramFrame` and `constructor` in `src/main.js` (commands in [quickstart.md](./quickstart.md))
- [x] T007 Verify all four new ratchets in `scripts/hygiene.js` bite: introduce a deliberate `+1` to each in `src/main.js` (an unguarded `querySelector(...).classList`, an extra `instance.state` read, an extra class field), confirm `yarn hygiene` exits non-zero for each, then revert

**Checkpoint**: Four ratchets live and proven to fail on regression. Every story
below now has a measurable, monotone target.

---

## Phase 3: User Story 1 — Strict type gate, restored per-flag (Priority: P1) 🎯 MVP

**Goal**: All three strict flags enabled in `tsconfig.json`, 540 errors burned to
zero, with a CI-enforced non-increasing ceiling at every intermediate step.

**Independent Test**: With the flags on, adding `document.querySelector('.nope').classList`
to any `src/` file fails `yarn typecheck`. Before the phase it passed.

**Burn-down rule (research §R2)**: A task here may add `@type` annotations,
definite-assignment annotations (documented per site), null guards that preserve
the current runtime path, and non-null assertions where the invariant is
genuinely established. It may **not** add `@ts-expect-error`, `@ts-ignore`, or an
`any` cast to silence an error. Any site where the honest fix would *change*
behaviour is split into its own task with a test, and its error is left standing.

**Every task in this phase lowers `strictTypeErrors` in `hygiene-baseline.json`
in the same commit** (AS-1.2).

### noImplicitAny burn-down (143 errors)

- [ ] T008 [US1] Annotate the 46 `TS7008` class-field declarations in `src/main.js` (lines ~80–165) with `@type` JSDoc — the single largest concentrated fix in the phase, and the one that makes the US5 grouping legible
- [x] T009 [P] [US1] Fix the 14 `TS7006` implicit-`any` parameters and 7 `TS7053` implicit index accesses across `src/`, adding `@param` types
- [ ] T010 [US1] Fix the remaining `TS7005` implicit-`any` variables, then enable `noImplicitAny: true` in `tsconfig.json` and remove it from `tsconfig.strict.json` — the one flag that can be flipped independently (AS-1.3)

### strictNullChecks burn-down (401 errors, tranched by directory)

- [ ] T011 [US1] Tranche A — `src/core/`: `state.js` (21), `viewport.js` (28), `events.js` (15), `FeatureRenderer.js` (16), `initialization/UISetup.js` (20), `FocusManager.js` (6), `configuration.js` (5), and the ≤2-error files. Fix the 20 `TS2783` errors at `src/core/state.js:38-39` properly — `version`/`timestamp` are set and then spread over by `buildModeInitialState()`, so a mode returning either key silently wins. This is a latent bug, not a cast site; it is fixed for real in T017
- [ ] T012 [US1] Tranche B — `src/components/` and the post-split `table.js` family (65 errors, re-attributed across T021–T023): `ExpandToggle.js` (21), `HarmonicPanel.js` (11), `SymbolPicker.js` (7), `ColorPicker.js` (7), `ModeButtons.js` (6), `MainUI.js`, `PinToggle.js`, `LEDDisplay.js`
- [ ] T013 [US1] Tranche C — `src/modes/` and `src/core/keyboardControl.js`: `HarmonicsMode.js` (51), `DopplerMode.js` (47), `keyboardControl.js` (46), `AnalysisMode.js` (45), `PanMode.js` (8), `BaseMode.js` (5), `shared/BaseDragHandler.js` (3), plus `src/utils/tolerance.js` (15) and `src/main.js`'s remaining null errors

### Close the gate

- [ ] T014 [US1] With the count at zero, enable `strictNullChecks` and `strictPropertyInitialization` in `tsconfig.json`; delete `tsconfig.strict.json`, the `strictTypeErrors` entry from `hygiene-baseline.json`, and the ratchet block from `scripts/hygiene.js`; verify `tsconfig.json` contains no strict-family disable (AS-1.3, SC-001). Sequence this **after** T030 so US3/US4's moved code is written strict-clean once
- [ ] T015 [P] [US1] Annotate `docs/ADRs/ADR-007-JSDoc-TypeScript-Integration.md` recording that the strict gate is now fully in force, with the burn-down's start and end numbers (AS-1.4)

**Checkpoint**: `yarn typecheck` gates real strictness. SC-001 met.

---

## Phase 4: User Story 2 — State and modes decoupled (Priority: P1)

**Goal**: `core/state.js` imports no mode; mode initial state arrives through the
factory; listener registration touches one registry.

**Independent Test**: `yarn hygiene` shows no cycle containing both
`core/state.js` and a `modes/` file; a mode module loads in the Vitest lane
without importing `state.js`.

### Pin before changing

- [x] T016 [US2] Write `tests/unit/mode-registration.test.js` **before** any source change: freeze the composed initial state produced by today's `createInitialState()` as a snapshot, so T017's rewiring is provably shape-preserving (plan Risks)

### The registration seam

- [ ] T017 [US2] Add `ModeFactory.getModeInitialStates()` to `src/modes/ModeFactory.js` merging the four `static getInitialState()` slices in fixed order (analysis, harmonics, doppler, pan); change `createInitialState(modeStates = {})` in `src/core/state.js` to receive them; delete the four `import … from '../modes/…'` lines from `state.js`; update the call site in `src/main.js` to `createInitialState(ModeFactory.getModeInitialStates())`. Spread mode slices **first** and write core keys after, fixing the `TS2783` collision — see [contracts/mode-registration.md](./contracts/mode-registration.md)
- [ ] T018 [US2] Add a development-time collision assertion in `src/modes/ModeFactory.js` that lists any mode slice key colliding with a core state key rather than silently resolving it
- [ ] T019 [US2] Extend `tests/unit/mode-registration.test.js`: `createInitialState()` with no argument returns a valid core state, and the module imports no mode (AS-2.2)
- [ ] T020 [US2] Lower `circularDependencies` in `hygiene-baseline.json` from 11 to the measured residue (expected 1 — only `ExpandToggle ⇄ table`, which T022 removes) and verify no cycle contains both `core/state.js` and a `modes/` file (AS-2.1)

### One listener registry

- [ ] T021 [US2] Remove the global-listener copy loop from `setupStateListeners` in `src/core/initialization/EventBindings.js` and the per-instance splice loop from `removeStateListener` in `src/api/GramFrameAPI.js`; change `deliverToListeners` in `src/core/state.js` to walk the de-duplicated union of `instance.stateListeners` and `globalStateListeners`, preserving `addStateListener`'s immediate call-with-current-state — see [data-model.md](./data-model.md) §2
- [ ] T022 [US2] Add assertions to `tests/state-listener.spec.js`: add-then-remove via the public API touches one registry with no duplicate delivery and no leak, and global listeners survive the HMR re-registration path at `src/main.js:663-666` (AS-2.3)

**Checkpoint**: 10 of 11 cycles gone. A mode can be loaded without `state.js`.

---

## Phase 5: User Story 3 — table.js split into what it actually is (Priority: P2)

**Goal**: 713 lines and six responsibilities become five modules, none over ~350
lines, with the axes engine in `rendering/` where CLAUDE.md has long claimed it.

**Independent Test**: `yarn hygiene` shows the ExpandToggle⇄table cycle gone and
no new cycle; the full suite passes with no spec file edited.

**Move discipline**: T023–T025 are **pure moves**. The diff is relocation plus
import rewiring; `git diff -M` must show renames. Any behaviour change is a
separate task. AS-3.1 requires zero behavioural diff — a spec that needed editing
means the move was not a move.

- [ ] T023 [US3] Create `src/rendering/axes.js`: move `renderAxes` (`table.js:326-358`) and the 8 private helpers (`table.js:412-687` — `renderTimeAxis`, `renderFrequencyAxis`, `calculateAxisTicks`, `formatFrequencyLabels`, `renderAxisLine`, `renderAxisTicks`, `renderAxisLabels`) verbatim; export only `renderAxes`; rewire `src/core/viewport.js` and `src/components/ExpandToggle.js` — see [contracts/axes.md](./contracts/axes.md)
- [ ] T024 [US3] Create `src/components/spectrogramImage.js` (`setupSpectrogramImage` from `table.js:140-205`, `getRenderDimensions` from `table.js:22-34`) and `src/components/svgLayout.js` (`updateSVGLayout` from `table.js:206-265`); rewire `src/core/initialization/UISetup.js`, `src/components/ExpandToggle.js`, `src/modes/harmonics/HarmonicsMode.js` and `src/core/viewport.js`
- [ ] T025 [US3] Move `applyZoomTransform` (`table.js:266-325`) and `calculateVisibleDataRange` (`table.js:359-411`) into `src/core/viewport.js`, giving zoom math one home for wheel, keyboard, PanMode and API callers (FR-007, AS-3.4); rewire `src/modes/harmonics/HarmonicsMode.js` and `src/modes/harmonics/ManualHarmonicModal.js`
- [ ] T026 [US3] Verify `src/components/table.js` is scaffold-only (~135 lines: `setupComponentTable`, private `createComponentStructure` and `replaceConfigTable`) and imported by exactly one module, `src/core/initialization/DOMSetup.js`; confirm all five modules are under 350 lines
- [ ] T027 [US3] Lower `circularDependencies` in `hygiene-baseline.json` to 0 and confirm no new cycle appeared (AS-3.3, SC-002)

**Checkpoint**: SC-002 met at 0. `rendering/axes.js` exists, closing part of GF-38.

---

## Phase 6: User Story 4 — Narrow mode contract, capability seams (Priority: P2)

**Goal**: `BaseMode` contains only hooks with real implementations; no module
outside `modes/` names a mode to obtain behaviour.

**Independent Test**: `grep` finds no mode-name reach-in outside `modes/` (bar
one documented exception) and no `any` cast to a mode; adding a fifth mode with
persistent features requires no edit to `FeatureRenderer` or `MainUI`.

**⚠️ Depends on US2 (T017).**

- [ ] T028 [US4] Delete `renderCursor` (0 overrides) and `getStateSnapshot` (0 overrides, 0 callers) from `src/modes/BaseMode.js`; delete `renderCurrentModeCursor` from `src/core/FeatureRenderer.js` — its only job was calling the deleted `renderCursor` no-op — and its call sites; remove both from the mode interface in `src/types.js`; verify by grep that no caller remains (AS-4.1). Keep `getViewport` and `updateCursorStyle`: zero overrides but 17 and 3 callers, so they are concrete base helpers, and document the distinction in `BaseMode`'s header
- [ ] T029 [US4] Create `src/modes/capabilities.js` with the `PersistentFeatureProvider` and `PanelOwner` typedefs and their `isPersistentFeatureProvider` / `isPanelOwner` predicates, per [contracts/capabilities.md](./contracts/capabilities.md)
- [ ] T030 [P] [US4] Move `hasAnalysisFeatures` / `hasHarmonicFeatures` / `hasDopplerFeatures` off `src/core/FeatureRenderer.js` onto the modes that own the state each reads, as `hasPersistentFeatures()` on `AnalysisMode`, `HarmonicsMode` and `DopplerMode`; rewrite `renderAllPersistentFeatures` to filter `Object.values(this.instance.modes)` by capability. This also deletes 8 `instance.state` reach-ins toward US5's ratchet (AS-4.2)
- [ ] T031 [P] [US4] Add `refreshPanel()` to `AnalysisMode` (wrapping `updateMarkersTable`) and `HarmonicsMode` (wrapping `updateHarmonicPanel`, absorbing the panel-reference resolution currently done from outside at `MainUI.js:219-226`); rewrite `updatePersistentPanels` in `src/components/MainUI.js` to `Object.values(instance.modes).filter(isPanelOwner).forEach(m => m.refreshPanel())`, removing both `/** @type {any} */` casts (AS-4.2)
- [ ] T032 [US4] Replace `this.instance._zoomOut()` / `_zoomIn()` in `getCommandButtons` at `src/modes/pan/PanMode.js:219,225` with `zoomOut(this.instance)` / `zoomIn(this.instance)` imported from `src/core/viewport.js`; decide whether `main.js`'s `_zoomIn`/`_zoomOut`/`_zoomReset`/`_setZoom` remain as public-API forwarders or are removed, and delete the `_setZoom`/`_zoomIn`/`_zoomOut`/`_zoomReset` typedefs at `src/types.js:431-434` (AS-4.3, FR-007)
- [ ] T033 [US4] Record the one FR-006 exception in `docs/ADRs/ADR-017-Mode-Capability-Interfaces.md`: `src/core/viewport.js:162` reads `instance.modes.pan` for a pan-specific policy decision (leave pan mode when zoom returns to 1×), which is not cross-cutting coordination and does not warrant a fourth capability (research §R6)

**Checkpoint**: `FeatureRenderer` and `MainUI` are mode-agnostic. Constitution
Principle III's "adding a mode must not modify existing modes" holds in fact.

---

## Phase 7: User Story 5 — Shrunk instance surface & explicit initialization (Priority: P3)

**Goal**: 56 flat instance fields become 12 behind four cohesive sub-objects;
initialization dependencies are explicit; the public API is behaviourally tested.

**Independent Test**: `yarn hygiene` shows both instance ratchets below baseline;
reordering two constructor steps produces a loud failure, not a silent
`undefined`; `tests/public-api.spec.js` passes against a non-debug page.

**Depends on US4 (T030) for its eight-reach-in head start. Benefits from US1
(T008) having typed the fields being grouped.**

- [ ] T034 [US5] Group the 30 DOM element handles into `instance.ui` in `src/main.js` (list in [baseline.md](./baseline.md) §6), creating the sub-object in the constructor before any initialization step runs; update every reach-in across `src/` — `tsc` under US1's flags catches misses; lower `instanceFields` in `hygiene-baseline.json`
- [ ] T035 [US5] Group the remaining 18 fields into `instance.interaction` (14), `instance.viewport` (2) and `instance.persistence` (2) in `src/main.js`; leave `state`, `configTable`, `stateListeners`, `instanceId`, `modes`, `currentMode`, `featureRenderer` and `_unsupportedBrowser` ungrouped; lower `instanceFields` to ≤ 33 (SC-005)
- [ ] T036 [US5] Make initialization explicit in `src/main.js` and `src/core/initialization/`: each of the ten steps declares what it needs as parameters and returns what it built (table in [data-model.md](./data-model.md) §6); remove the double-nulling at `src/core/initialization/DOMSetup.js:88-95` where `modes`, `currentMode` and `featureRenderer` are nulled and later re-created by `initializeModeInfrastructure` (FR-009)
- [ ] T037 [US5] Verify AS-5.2 by experiment: swap two initialization calls in the `src/main.js` constructor and confirm the failure is a `tsc` error for a missing required argument or an immediate explicit throw — never a silent `undefined` surfacing later; revert, and record the outcome in the PR description
- [ ] T038 [US5] Lower `instanceStateReachIns` in `hygiene-baseline.json` to ≤ 185 (SC-005's endpoint, per research §R7 — the spec's "50% of 371", not 50% of today's 243)
- [ ] T039 [P] [US5] Create `tests/public-api.spec.js` with behavioural (not `typeof`) assertions for `init`, `detectAndReplaceConfigTables`, `addStateListener`, `removeStateListener`, `getExpandState` and `setExpandState`, per research §R8; run it against a fixture page that does **not** set `window.GRAMFRAME_DEBUG`, proving the API works without `__test__` hooks and catching those hooks leaking onto a production page (FR-010, SC-006)

**Checkpoint**: Both instance ratchets met. The public API is tested as an API.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: The evidence, the decision records, and the documentation this
phase's claims depend on. ADRs land in the PR that implements them where
practical; these tasks catch what did not.

- [ ] T040 [P] Write `docs/ADRs/ADR-014-Mode-State-Registration-Seam.md` filling the numbering gap GF-43 flags: why `ModeFactory` composes initial state and `core/state.js` receives it (research §R9)
- [ ] T041 [P] Write `docs/ADRs/ADR-017-Mode-Capability-Interfaces.md`: duck-typed capabilities over named-mode reach-ins, why not a class hierarchy or a string-keyed registry, plus a note correcting ADR-011, whose documented `FeatureRenderer` method names have zero overlap with the real ones (GF-40)
- [ ] T042 [P] Write `docs/ADRs/ADR-018-Table-Split.md`: one responsibility per module, and why the axis engine belongs in `rendering/` beside `cursors.js` and `symbols.js`
- [ ] T043 Build the fifth-mode spike as SC-003's evidence: add a throwaway mode under `src/modes/` implementing `static getInitialState()`, `hasPersistentFeatures()` and `renderPersistentFeatures()`, registered only in `src/modes/ModeFactory.js`; add `tests/mode-registration.spec.js` asserting its initial state appears and its features render with **no** edit to `src/core/state.js`, `src/components/MainUI.js` or `src/core/FeatureRenderer.js` (AS-2.2, AS-4.2, SC-003)
- [ ] T044 [P] Update the File Structure section of `CLAUDE.md` for the four new modules (`rendering/axes.js`, `components/spectrogramImage.js`, `components/svgLayout.js`, `modes/capabilities.js`) and `table.js`'s narrowed role — the list is required to stay in step with `src/`
- [ ] T045 [P] Record the SC-004 documented exceptions in `hygiene-baseline.json`'s comment block: the seven modules still over ~350 lines that no story in this spec touches (`HarmonicsMode.js` 1016, `DopplerMode.js` 657, `AnalysisMode.js` 612, `keyboardControl.js` 561, `GramFrameAPI.js` 413, `events.js` 395), with `types.js` exempt as declarations, and the three mode files flagged as candidates for a later phase
- [ ] T046 Add a Phase 3 resolutions section to `docs/analysis/Findings-Register.md` (mirroring §7's format) recording GF-32, GF-03, GF-05, GF-06, GF-09, GF-10, GF-11, GF-13 and GF-30's residual as resolved, each with the test that fails if it returns
- [ ] T047 Run the full [quickstart.md](./quickstart.md) validation end to end and confirm every success criterion: SC-001 (no strict disables, `yarn typecheck` green), SC-002 (cycles ≤ 1), SC-003 (spike scope), SC-004 (`table.js` scaffold-only, exceptions documented), SC-005 (reach-ins ≤ 185, fields ≤ 33), SC-006 (public API behaviourally covered)

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (Setup)**: no dependencies
- **Phase 2 (Foundational)**: depends on Phase 1 — **blocks US1 entirely and US5's acceptance**
- **US1 (Phase 3)**: starts immediately after Phase 2 and runs continuously; T014 is deliberately last
- **US2 (Phase 4)**: independent of US1; **blocks US4**
- **US3 (Phase 5)**: independent of US2 and US4
- **US4 (Phase 6)**: requires T017 (US2)
- **US5 (Phase 7)**: requires T030 (US4) for its ratchet head start; benefits from T008 (US1)
- **Phase 8 (Polish)**: T040 after US2, T041 after US4, T042 after US3, T043 after both US2 and US4, T047 after everything

### Critical path

```text
T001-T002 → T003-T007 → T016 → T017 → T028 → T029 → T030 → T034 → T035 → T036 → T038 → T043 → T047
                      ↘ T008 … T013 ─────────────────────────────────→ T014 ↗
                      ↘ T023 → T024 → T025 → T026 → T027 ─────────────────↗
```

### Within US1

Tranches are independent of each other and may be reordered, but `noImplicitAny`
(T008–T010) should precede `strictNullChecks` (T011–T013): fixing 143 implicit-any
errors first leaves 397 null errors rather than 401, and avoids null-checking code
whose types are still implicitly `any` (research §R1).

### Within US3

Strictly ordered T023 → T024 → T025 → T026 → T027. No parallelism — every task
rewires importers of the same shrinking module.

### Parallel opportunities

- T002 alongside T001; T006 alongside T003–T005
- **US2, US3 and US1's tranches can proceed concurrently** — they share no file
  once T011's `core/` tranche is done (T011 touches `viewport.js`, which T025
  also touches; sequence those two)
- T030 and T031 (different files, both after T029)
- T039 alongside T034–T038 (new file, no source dependency)
- T040, T041, T042, T044, T045 all [P] once their stories land

---

## Parallel Example: User Story 4

```bash
# After T029 creates the capability predicates, these two are independent:
Task: "T030 — FeatureRenderer iterates by capability; hasPersistentFeatures moves onto the modes"
Task: "T031 — MainUI iterates by capability; refreshPanel added to Analysis and Harmonics"
```

## Parallel Example: Polish

```bash
# Once their stories have landed, the three ADRs and two doc updates are independent:
Task: "T040 — ADR-014 mode state registration seam"
Task: "T041 — ADR-017 mode capability interfaces"
Task: "T042 — ADR-018 table.js split"
Task: "T044 — CLAUDE.md File Structure update"
Task: "T045 — SC-004 documented exceptions"
```

---

## Implementation Strategy

### MVP first (User Story 1 only)

1. Phase 1 → Phase 2 (ratchets live and proven to bite)
2. Phase 3: burn 540 → 0, flip the flags
3. **STOP and VALIDATE**: `yarn typecheck` now fails on an unguarded
   `querySelector`. The register's only High finding is closed, and every later
   refactor is protected by real type checking.

US1 alone is a shippable, defensible increment — which is why it is P1 despite
touching the most files.

### Incremental delivery

1. Setup + Foundational → four ratchets live
2. US1 → strict gate real → **MVP**
3. US2 → 10 cycles gone, mode registration seam
4. US3 → `table.js` split, last cycle gone, SC-002 at 0
5. US4 → capability seams, Principle III true in fact
6. US5 → instance surface halved, public API tested
7. Polish → ADRs, register resolutions, full quickstart validation

Each step lands on `main` green (FR-011). No long-lived integration branch.

### Parallel team strategy

With three developers after Phase 2:

- **Developer A**: US1 continuously (the largest, most mechanical body of work)
- **Developer B**: US2 → US4 → US5 (the dependency chain)
- **Developer C**: US3 (fully independent) → Phase 8 ADRs

Coordinate on `src/core/viewport.js`, the one file two chains touch (T011 and
T025), and on the shared `hygiene-baseline.json`, which every chain lowers.

---

## Notes

- **Baselines only go down.** If a count rises, the fix is the diff, not the baseline.
- **Refactor PRs never carry behaviour changes.** US2–US4 are move-and-rewire;
  US1 is annotations and behaviour-preserving guards. Anything else gets its own
  task and its own test (research §R2).
- **A spec file edited during US3 means the move was not a move** (AS-3.1).
- `strictPropertyInitialization` is not an independent burn-down — TypeScript
  rejects it without `strictNullChecks` (`TS5052`) and it adds zero errors once
  that flag is on. It flips with `strictNullChecks` in T014 (research §R1).
- Commit after each task or logical group; stop at any checkpoint to validate a
  story independently.
