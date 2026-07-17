# Tasks: Sample Harmonic Pins to Keep Them Legible

**Input**: Design documents from `/specs/158-harmonic-pin-sampling/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/sampling-algorithm.md, quickstart.md

**Tests**: INCLUDED. Constitution Principle II (Test-First, NON-NEGOTIABLE) requires
Playwright coverage of all user-facing behaviour, so test tasks are mandatory here.

**Organization**: Tasks are grouped by user story. Note that a single production
change (viewport-aware, sampled `getVisibleHarmonics`) underlies all three
stories; each story remains **independently testable** via its own Playwright
assertions.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 / US2 / US3 (from spec.md); no label for Setup/Foundational/Polish
- Exact file paths are included in each task

## Path Conventions

Single-project front-end component: `src/` and `tests/` at repository root
(constitution Option 1, per plan.md).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish a known-good baseline before changing behaviour

- [X] T001 Confirm baseline is green: run `yarn typecheck` and `yarn test` and record that the current `harmonics-mode` suite passes, so regressions from this feature are attributable
- [X] T002 Re-read the current pin path in `src/modes/harmonics/HarmonicsMode.js` (`getVisibleHarmonics` ≈L634, `renderHarmonicSet` ≈L714) and confirm `calculateVisibleDataRange` is exported from `src/components/table.js` for import

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The pure sampling helper and test tooling that ALL user stories depend on

**⚠️ CRITICAL**: No user story can be completed until Phase 2 is done.

- [X] T003 Create the pure sampling module `src/utils/harmonicSampling.js` exporting `MAX_VISIBLE_PINS = 50` and `NICE_STEPS = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000]`, per contracts/sampling-algorithm.md
- [X] T004 In `src/utils/harmonicSampling.js` implement `chooseSamplingStep(minHarmonic, maxHarmonic, max = MAX_VISIBLE_PINS)` returning the smallest `NICE_STEPS` member whose multiple-count `floor(maxHarmonic/S) − floor((minHarmonic−1)/S)` is ≤ `max` (returns 1 when the range already fits; returns the largest member if none fits)
- [X] T005 In `src/utils/harmonicSampling.js` implement `sampledHarmonics(minHarmonic, maxHarmonic, max = MAX_VISIBLE_PINS)` returning `{ step, harmonics }`, generating only the in-range multiples of `step` (start at `ceil(minHarmonic/step)×step`), never allocating the full range, with a defensive length cap of `max` and `[]` when `maxHarmonic < minHarmonic`
- [X] T006 [P] Add JSDoc typedefs for the helper's inputs/output (e.g. `SamplingResult`) in `src/utils/harmonicSampling.js` (and `src/types.js` if a shared type is warranted) so `yarn typecheck` stays clean
- [X] T007 [P] Add a Playwright unit-style spec `tests/harmonic-sampling-unit.spec.js` that imports the pure helper directly (no browser) and asserts: count == cap → step 1 (all pins); count == cap+1 → step advances; every result is a multiple of `step`; results are within range; anchor-on-multiples is stable when the range is shifted (pan); empty range → `[]`
- [X] T008 [P] Extend `tests/helpers/gram-frame-page.js` with helpers to (a) count `.gram-frame-harmonic-line` elements for a set and (b) read their `data-harmonic-number` values in order, for use by all story specs

**Checkpoint**: Pure sampling logic exists, is unit-tested, and test helpers are ready.

---

## Phase 3: User Story 1 - Keep a dense harmonic set legible (Priority: P1) 🎯 MVP

**Goal**: A dense harmonic set (e.g. 0.5 Hz spacing) renders as a bounded,
readable subset of pins instead of a solid block.

**Independent Test**: Add a 0.5 Hz harmonic set over a wide span; assert ≤ 50
pins are drawn, the drawn `data-harmonic-number`s are a regular series, and a
sparse set still draws every pin.

### Implementation

- [X] T009 [US1] Rewrite `getVisibleHarmonics()` in `src/modes/harmonics/HarmonicsMode.js` to import `sampledHarmonics` (from `../../utils/harmonicSampling.js`) and `calculateVisibleDataRange` (from `../../components/table.js`), derive `{freqMin, freqMax}` from `calculateVisibleDataRange(this.instance)`, compute `minHarmonic`/`maxHarmonic`, and return `sampledHarmonics(minHarmonic, maxHarmonic).harmonics`
- [X] T010 [US1] Update the caller in `renderHarmonicSet()` (`src/modes/harmonics/HarmonicsMode.js` ≈L720) so it no longer passes `state.config` to `getVisibleHarmonics`; confirm labels are still created per drawn harmonic (one label per drawn line)
- [X] T011 [US1] Run `yarn typecheck` and fix any JSDoc/param signature fallout from the changed `getVisibleHarmonics` signature

### Tests

- [X] T012 [P] [US1] In `tests/harmonic-pin-sampling.spec.js`, add a test: dense 0.5 Hz set over a wide span draws ≤ 50 `.gram-frame-harmonic-line` elements
- [X] T013 [P] [US1] In `tests/harmonic-pin-sampling.spec.js`, add a test: the drawn `data-harmonic-number`s form a constant-step arithmetic series whose step is a member of `NICE_STEPS`
- [X] T014 [P] [US1] In `tests/harmonic-pin-sampling.spec.js`, add a test: a sparse set (large spacing, ≤ 50 harmonics in view) draws every pin (no thinning; step 1)

**Checkpoint**: US1 fully functional and independently testable — this is the MVP.

---

## Phase 4: User Story 2 - Reveal finer detail by zooming in (Priority: P2)

**Goal**: Zooming in narrows the visible span and reveals more pins; zooming out
/ panning thins again, recomputed on every view change.

**Independent Test**: With a dense set displayed, zoom in and assert the pin
count increases (never decreases) and stays ≤ 50; zoom out/reset and assert it
thins back.

**Note**: The production behaviour is delivered by the US1 change (visible-range
sourcing) combined with the existing `applyZoomTransform → renderAllPersistentFeatures`
re-render path. US2 primarily adds verification/coverage; add code only if a gap
is found in T015.

### Implementation

- [X] T015 [US2] Verify in `src/components/table.js` / `src/core/viewport.js` that `applyZoomTransform()` (both the `level === 1.0` reset branch and the zoomed branch) and `handleResize()` call `featureRenderer.renderAllPersistentFeatures()`; if any zoom/pan path does not re-render harmonic pins, add the missing re-render call

### Tests

- [X] T016 [P] [US2] In `tests/harmonic-pin-sampling.spec.js`, add a test: zooming in on a dense set increases the drawn pin count (≥ pre-zoom count) while staying ≤ 50
- [X] T017 [P] [US2] In `tests/harmonic-pin-sampling.spec.js`, add a test: zooming in far enough that ≤ 50 harmonics remain in view shows every pin (step 1)
- [X] T018 [P] [US2] In `tests/harmonic-pin-sampling.spec.js`, add a test: zoom out / reset returns the overlay to the thinned (≤ 50) state; a pan at fixed zoom keeps the same step

**Checkpoint**: US2 independently testable; progressive disclosure verified.

---

## Phase 5: User Story 3 - Consistent labels and interaction on the shown pins (Priority: P3)

**Goal**: Every visible label belongs to a drawn pin, and selecting/adjusting a
harmonic set still works on a thinned overlay.

**Independent Test**: On a thinned overlay, assert label↔line correspondence, and
confirm the dense set can still be selected and its spacing adjusted.

**Note**: Label-per-drawn-pin is inherent to the US1 render loop, and hit-testing
is intentionally left over the full harmonic series (research §6), so US3 is
chiefly guard-rail coverage; add code only if T019 reveals a mismatch.

### Implementation

- [X] T019 [US3] Confirm `findHarmonicSetAtFrequency()` (`src/modes/harmonics/HarmonicsMode.js` ≈L436) still operates over the full harmonic series so a set remains selectable in sampling gaps; leave behaviour unchanged (record the optional O(1) nearest-harmonic optimisation from research §6 as out of scope)

### Tests

- [X] T020 [P] [US3] In `tests/harmonic-pin-sampling.spec.js`, add a test: on a thinned overlay every `.gram-frame-harmonic-number` label matches the `data-harmonic-number` of a rendered line (no orphan labels)
- [X] T021 [P] [US3] In `tests/harmonic-pin-sampling.spec.js`, add a test: on a thinned dense set, selecting the set and adjusting its spacing behaves as before (set stays selectable/draggable)

**Checkpoint**: US3 independently testable; no interaction regression.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all stories

- [X] T022 Run the full gate: `yarn typecheck`, `yarn test`, and `yarn build` — all must be clean/green (constitution Quality Gates)
- [X] T023 [P] Execute the manual verification steps in `specs/158-harmonic-pin-sampling/quickstart.md` against `yarn dev` (0.5 Hz dense set → thinned; zoom reveals; second sparse set unaffected; selection works)
- [X] T024 [P] Confirm no unrelated regressions in `tests/harmonics-mode.spec.js` and that the new specs are named/located consistently with the suite

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3–5)**: All depend on Foundational (the helper + test helpers)
  - US1 (P1) is the MVP and should land first
  - US2 (P2) and US3 (P3) depend on US1's production change (T009/T010) because
    they assert against the same viewport-aware, sampled render path; their test
    tasks can then run in parallel
- **Polish (Phase 6)**: Depends on all targeted stories being complete

### Within Each User Story

- US1: T009 → T010 → T011 (sequential, same file) → then tests T012–T014 [P]
- US2: T015 (verify/patch) → tests T016–T018 [P]
- US3: T019 (verify) → tests T020–T021 [P]

### Parallel Opportunities

- Phase 2: T006, T007, T008 can run in parallel (different files) after T003–T005
- US1 tests T012–T014 run in parallel once T009–T011 land
- US2 tests T016–T018 run in parallel; US3 tests T020–T021 run in parallel
- After T009/T010, the US2 and US3 test tasks are mutually independent and can be
  authored together

---

## Parallel Example: User Story 1

```bash
# After the production change (T009–T011) lands, launch US1 tests together:
Task: "Dense set draws <= 50 lines in tests/harmonic-pin-sampling.spec.js"          # T012
Task: "Drawn harmonic numbers form a NICE_STEPS series in ...spec.js"               # T013
Task: "Sparse set draws every pin (step 1) in ...spec.js"                           # T014
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: Setup (baseline green)
2. Phase 2: Foundational (pure helper + unit test + test helpers) — CRITICAL
3. Phase 3: US1 — wire helper into `getVisibleHarmonics` via the visible range
4. **STOP and VALIDATE**: dense 0.5 Hz set renders ≤ 50 evenly-spaced, legible pins
5. Demo the fix for issue #183

### Incremental Delivery

1. Setup + Foundational → sampling logic proven in isolation
2. US1 → dense sets legible (MVP, closes the core of #183)
3. US2 → zoom/pan progressive disclosure verified
4. US3 → label/interaction consistency guaranteed
5. Polish → full gate + quickstart + regression sweep

### Scope note

This is a small, well-contained feature: one new pure module and one rewritten
method drive all three stories. Most of US2/US3 is verification and test coverage
rather than new production code, reflecting that the viewport-aware render path
already re-runs on zoom/pan.
