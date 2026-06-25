---
description: "Task list for feature 156 — Expand Image Toggle"
---

# Tasks: Expand Image Toggle

**Input**: Design documents from `/specs/156-expand-image-toggle/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: INCLUDED. Per the project constitution (Principle II — Test-First, NON-NEGOTIABLE)
and the spec's acceptance-testing approach, every user story has Playwright tests written
before its implementation.

**Organization**: Tasks are grouped by user story (P1→P3) for independent implementation
and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 / US2 / US3 (maps to spec.md user stories)
- Exact file paths included in each task

## Path Conventions

Single-project browser component: source in `src/`, tests in `tests/`, demonstrator in
`sample/`. Mirrored Pub-10 assets staged in scratchpad during research need importing.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Stage the demonstrator assets and test scaffolding shared by all stories.

- [X] T001 Import mirrored Pub-10 demonstrator assets into the repo under `sample/pub10-assets/` (the oxygen-webhelp CSS/JS shell + `gram-1.png`, 902×237) from the research mirror, keeping relative paths intact
- [X] T002 Create demonstrator page `sample/pub10-gram1.html` reproducing the published Pub-10 shell (COMMERCIAL IN CONFIDENCE banner, nav bar, title, `gram-config` table with time 0–40 / freq 100–300, Related-information sidebar, Question/Theory table), loading the locally built GramFrame bundle instead of the published bundle
- [X] T003 [P] Add a portrait test fixture image (taller than wide) under `sample/pub10-assets/` for the US3 vernier case, plus a minimal portrait `gram-config` demonstrator `sample/pub10-vernier.html`

**Checkpoint**: Demonstrator pages load the local bundle and render the existing gram.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Decouple rendered image size from natural size as a **no-op refactor**
(render dims default to natural, so rendering is unchanged) and extend the test helper.
This blocks all user stories.

**⚠️ CRITICAL**: No user-story work begins until this phase is complete and the existing
suite is still green.

- [X] T004 Add `renderWidth` and `renderHeight` to `imageDetails` and add `imageExpanded: false` to instance state in `src/core/state.js` (per contracts/state-shape.md), with JSDoc types updated in `src/types.js`
- [X] T005 Initialise `renderWidth`/`renderHeight` to `naturalWidth`/`naturalHeight` on image load in `src/components/table.js` (image `onload`, near lines 148-149)
- [X] T006 Refactor `updateSVGLayout` in `src/components/table.js` to compute viewBox, image element, and clip rects from `renderWidth`/`renderHeight` instead of `naturalWidth`/`naturalHeight` (lines ~177-214)
- [X] T007 Refactor `renderAxes`/visible-range calc in `src/components/table.js` to span `renderWidth`/`renderHeight` (lines ~292-342), keeping axis-label rendering size independent of image size
- [X] T008 Refactor `imageToDataCoordinates` in `src/utils/coordinates.js` to divide by render dims (lines 53-63); update the `ImageDetails` JSDoc to document `renderWidth`/`renderHeight`
- [X] T009 Refactor data→pixel placement in `src/rendering/cursors.js` to use render dims (lines 66-69)
- [X] T010 Refactor the screen→data zoom normalization in `src/core/events.js` (lines 25-59) so zoom `level` is applied on top of the **base render** size, ensuring expand × zoom composes (research.md Decision 2)
- [X] T011 [P] Extend the `GramFramePage` helper in `tests/helpers/` with expand utilities: `getRenderedImageSize()`, `getAxisLabelFontSize()`, `clickExpandToggle()`, `isExpandToggleVisible()`, `readDataAtPixel(x,y)`
- [X] T012 Run `yarn typecheck` and `yarn test` to confirm the refactor is a no-op (existing tests green, image renders identically at default size)

**Checkpoint**: Render-size decoupling in place and proven inert; transforms are render-aware.

---

## Phase 3: User Story 1 - Expand a Landscape Gram to Fill Available Space (Priority: P1) 🎯 MVP

**Goal**: A landscape gram gains a top-left toggle that expands the image to fill the
component width and available viewport height (only the image grows), and restores it.

**Independent Test**: On `sample/pub10-gram1.html`, click the toggle and assert the image
fills the component width and available height with nav/title/panel still visible and axis
text unchanged; click again to restore exactly.

### Tests for User Story 1 ⚠️ (write first, must fail before implementation)

- [X] T013 [P] [US1] Test SC-001/SC-002 in `tests/expand-image.spec.ts`: at a fixed viewport, expanded image width == component inner image-region width ±2px and height == computed available height ±2px
- [X] T014 [P] [US1] Test SC-003 in `tests/expand-image.spec.ts`: axis tick-label font size identical before and after expand
- [X] T015 [P] [US1] Test SC-006 in `tests/expand-image.spec.ts`: collapse restores exact original natural image dimensions

### Implementation for User Story 1

- [X] T016 [US1] Add available-space computation in `src/components/table.js` (or a small helper): `availableWidth` = component inner image-region width; `availableHeight` = `viewportBottom − imageRegionTop − ~16px`, using `getBoundingClientRect()` + `window.innerHeight`
- [X] T017 [US1] Create `src/components/ExpandToggle.js`: a landscape-gated (`naturalWidth > naturalHeight`) `<button class="gram-frame-expand-toggle">` appended to `.gram-frame-main-panel`, absolutely positioned top-left clear of the time-axis labels, with `aria-pressed`/`aria-label` and ⤢/⤡ affordance (per contracts/expand-toggle-ui.md)
- [X] T018 [US1] Implement the toggle click handler: set `imageExpanded`, compute render dims (expand → available space; collapse → natural), call `updateSVGLayout` + `renderAxes`, and update button state/aria
- [X] T019 [US1] Wire the existing `ResizeObserver`/window-resize path in `src/core/events.js` to recompute available space and relayout while `imageExpanded === true` (no new observer)
- [X] T020 [P] [US1] Add CSS in `src/gramframe.css` for `.gram-frame-expand-toggle` (semi-transparent, top-left, z-index above SVG) and any expanded main-panel/container rules
- [X] T021 [US1] Mount the toggle during instance construction (wherever `ModeButtons`/main UI are wired) so each landscape instance gets one; run T013–T015 to green

**Checkpoint**: MVP — landscape grams expand/collapse correctly; US1 tests pass.

---

## Phase 4: User Story 2 - Existing Annotations Stay Locked to Their Data Points (Priority: P2)

**Goal**: Markers, harmonics, and doppler stay pinned to their data coordinates across
expand/collapse, with coordinate fidelity preserved (including under zoom).

**Independent Test**: Place a feature at a known data point, toggle expand on/off, and
assert it returns to the same screen position and reports the same data values.

### Tests for User Story 2 ⚠️ (write first, must fail before implementation)

- [X] T022 [P] [US2] Test SC-004 in `tests/expand-image.spec.ts`: a known pixel reports the same freq/time before and after expand, and again with a zoom level applied (expand × zoom composition)
- [X] T023 [P] [US2] Test SC-007 in `tests/expand-image.spec.ts`: an Analysis marker placed before expanding returns to its original screen position and data coordinates after expand→collapse

### Implementation for User Story 2

- [X] T024 [US2] In the toggle handler (`src/components/ExpandToggle.js`), after relayout call `FeatureRenderer.renderAllPersistentFeatures()` (`src/core/FeatureRenderer.js`) so all persistent features re-resolve through the render-aware transforms
- [X] T025 [US2] Validate and, if needed, fix the expand × zoom composition in `src/core/events.js` so coordinate fidelity holds when both are active (the research-flagged risk); make T022 pass
- [X] T026 [US2] Run T022–T023 to green; verify harmonics and doppler (not just analysis markers) reposition correctly via a manual quickstart pass

**Checkpoint**: US1 + US2 both work; annotations are trustworthy across expand.

---

## Phase 5: User Story 3 - Portrait Verniers Are Not Expandable (Priority: P3)

**Goal**: Portrait (and square) images get no toggle at all.

**Independent Test**: Load the portrait demonstrator and assert no toggle exists; load the
landscape one and assert it does.

### Tests for User Story 3 ⚠️ (write first, must fail before implementation)

- [X] T027 [P] [US3] Test SC-005 in `tests/expand-image.spec.ts`: no `.gram-frame-expand-toggle` present on `sample/pub10-vernier.html` (portrait); present on `sample/pub10-gram1.html` (landscape)

### Implementation for User Story 3

- [X] T028 [US3] Confirm/strengthen the landscape guard in `src/components/ExpandToggle.js` so the toggle is only created when `naturalWidth > naturalHeight` (square treated as non-landscape); make T027 pass

**Checkpoint**: All three stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Quality gates and optional surface area.

- [X] T029 [P] [Polish] (Optional) Expose `getExpandState()` / `setExpandState(bool)` on the external API in `src/api/` (landscape-gated), per contracts/state-shape.md
- [X] T030 [P] [Polish] Update `debug.html` and docs to mention the expand toggle and the demonstrator
- [X] T031 [Polish] Run `yarn typecheck`, `yarn test`, and `yarn build` — all must be clean (Quality Gates)
- [X] T032 [Polish] Execute `specs/156-expand-image-toggle/quickstart.md` manual verification end-to-end on both demonstrators

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: depends on Setup — **BLOCKS all user stories**. The refactor must be proven inert (T012) before any story.
- **User Story 1 (Phase 3)**: depends on Foundational. Delivers the MVP.
- **User Story 2 (Phase 4)**: depends on Foundational; builds on US1's toggle handler (adds the feature re-render call). Independently testable.
- **User Story 3 (Phase 5)**: depends on US1's toggle component existing (it guards that control). Independently testable.
- **Polish (Phase 6)**: depends on all desired stories complete.

### Within Each User Story

- Tests written first and FAIL before implementation.
- Available-space + state before the toggle component; toggle component before its handler; handler before resize wiring.
- Story complete and green before moving to the next priority.

### Parallel Opportunities

- Setup: T003 [P] alongside T001/T002.
- Foundational: T011 [P] (helper) alongside the source refactors; T004–T010 mostly touch different files but T006/T007 share `table.js` (sequential).
- US1 tests T013/T014/T015 [P] together; T020 [P] (CSS) alongside component work.
- US2 tests T022/T023 [P] together.
- Different stories can proceed in parallel once Foundational is done (US3 needs US1's component).

---

## Parallel Example: User Story 1

```bash
# Write all US1 tests together (they must fail first):
Task: "T013 SC-001/002 expand fill dimensions in tests/expand-image.spec.ts"
Task: "T014 SC-003 axis label size unchanged in tests/expand-image.spec.ts"
Task: "T015 SC-006 collapse restores natural dims in tests/expand-image.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: Setup (demonstrator).
2. Phase 2: Foundational (render-size decoupling, proven inert).
3. Phase 3: User Story 1 (toggle + expand/collapse).
4. **STOP and VALIDATE**: US1 tests + quickstart on the landscape demonstrator.
5. Demo for stakeholder feedback (this is an experiment).

### Incremental Delivery

1. Setup + Foundational → render-size decoupling ready (no behaviour change).
2. US1 → expand/collapse works → demo (MVP).
3. US2 → annotations stay locked → demo.
4. US3 → portrait guard → demo.

---

## Notes

- The Foundational refactor (T004–T012) is the heart of the feature; keeping render dims
  defaulted to natural means it ships as a no-op and is verified by the existing suite
  before any visible change.
- The single highest-risk task is T025 (expand × zoom coordinate composition) — guarded by
  T022.
- `imageExpanded` is in-memory only; do NOT route it through the feature-155 storage layer.
- Commit after each task or logical group; keep `yarn typecheck` clean throughout.
