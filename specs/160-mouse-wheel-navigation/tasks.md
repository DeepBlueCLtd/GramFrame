# Tasks: Mouse-Wheel Pan and Zoom

**Input**: Design documents from `/specs/160-mouse-wheel-navigation/`
**Prerequisites**: spec.md, plan.md

**Tests**: INCLUDED. Constitution Principle II (Test-First, NON-NEGOTIABLE)
requires Playwright coverage of all user-facing behaviour.

**Organization**: Grouped by user story. A single global input path (wheel +
middle-button in `events.js`, backed by shared `viewport.js` helpers) underlies
US1–US3; each story remains independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 / US2 / US3 / US4 (from spec.md); no label for Setup/Foundational/Polish

## Path Conventions

Single-project front-end component: `src/` and `tests/` at repository root.

---

## Phase 1: Setup

- [X] T001 Confirm baseline is green: run `yarn typecheck` and `yarn test`; record that the current suite passes so regressions are attributable.
- [X] T002 Re-confirm the interception surface and reused APIs: all mouse handlers bind to `instance.svg` (`src/core/events.js:80-105`); zoom via `setZoom`/`applyZoomTransform`; pan via centre-clamp (`src/modes/pan/PanMode.js`).

---

## Phase 2: Foundational (Shared viewport helpers) — BLOCKS all stories

**⚠️ CRITICAL**: The wheel path and the existing drag path must share one maths implementation.

- [X] T003 In `src/core/viewport.js` add `pixelDeltaToNormalizedPan(instance, dxPx, dyPx)` returning `{ normalizedDeltaX, normalizedDeltaY }`, extracting the exact conversion currently inline in `PanMode.handleMouseMove` (render size, SVG-rect scale, ÷ `zoom.level`, negated).
- [X] T004 In `src/core/viewport.js` add `panByNormalized(instance, dCx, dCy)` that clamps `centerX/centerY` to `[0,1]` and calls `setZoom`; a no-op when `zoom.level <= 1.0` (FR-007, FR-008).
- [X] T005 In `src/core/viewport.js` add `zoomAtImagePoint(instance, factor, imageX, imageY)`: `newLevel = clamp(level×factor, 1.0, 10.0)`; no-op if unchanged; reset to centre if `newLevel <= 1.0`; otherwise set centre from `imageX/renderWidth`, `imageY/renderHeight` (clamped) and `setZoom` (FR-002–FR-004).
- [X] T006 Refactor `src/modes/pan/PanMode.js` `handleMouseMove`/`panImage` to call `pixelDeltaToNormalizedPan` + `panByNormalized` (behaviour-preserving); keep drag gating and cursor handling.
- [X] T007 In `src/main.js` declare the transient `_wheelPan` class field with a JSDoc `@type` so `yarn typecheck` stays clean.

**Checkpoint**: shared zoom/pan helpers exist; drag-pan still works through them.

---

## Phase 3: User Story 1 — Ctrl+scroll zoom (Priority: P1) 🎯 MVP

**Goal**: Ctrl+scroll zooms in/out around the pointer, in every mode, bounded 1–10×.

**Independent Test**: In any mode, Ctrl+scroll up zooms in, down zooms out; both bounded; centre moves toward the pointer.

### Implementation

- [X] T008 [US1] In `src/core/events.js` add `handleWheel(instance, event)` and bind a `wheel` listener on `instance.svg` with `{ passive: false }` in `setupEventListeners`.
- [X] T009 [US1] In `handleWheel`, when `event.ctrlKey`, call `zoomAtImagePoint(instance, event.deltaY < 0 ? STEP : 1/STEP, imageX, imageY)` (from `screenToDataWithZoom`) and always `preventDefault()` (FR-010). Define `WHEEL_ZOOM_STEP` (e.g. 1.2).

### Tests

- [X] T010 [P] [US1] In `tests/helpers/gram-frame-page.js` add `wheelAtSVG(x, y, deltaY, ctrl=false)` that dispatches a `WheelEvent` on `.gram-frame-svg` with correct `clientX/clientY`, `deltaY`, `ctrlKey`.
- [X] T011 [P] [US1] In `tests/pan-zoom.spec.js`: Ctrl+scroll up increases `zoom.level` (≤ 10); Ctrl+scroll down decreases (≥ 1); works from level 1.
- [X] T012 [P] [US1] In `tests/pan-zoom.spec.js`: Ctrl+scroll at an off-centre pointer moves `centerX`/`centerY` toward the pointer's data fraction.

**Checkpoint**: US1 functional and independently testable — MVP.

---

## Phase 4: User Story 2 — Scroll to pan (Priority: P2)

**Goal**: Plain scroll pans horizontally along frequency when zoomed in; nothing when not zoomed.

**Independent Test**: Zoom in, plain scroll → `centerX` changes; at level 1 → no change, page scrolls.

### Implementation

- [X] T013 [US2] In `handleWheel`, when Ctrl is **not** held and `zoom.level > 1.0`, pan via `pixelDeltaToNormalizedPan(instance, -event.deltaY, 0)` → `panByNormalized` and `preventDefault()`; when `level <= 1.0` do nothing (no `preventDefault`).

### Tests

- [X] T014 [P] [US2] In `tests/pan-zoom.spec.js`: at zoom 2×, plain scroll changes `centerX`.
- [X] T015 [P] [US2] In `tests/pan-zoom.spec.js`: at level 1, plain scroll leaves `zoom` unchanged (level 1, centre 0.5); repeated scroll-pan clamps at the data edge (centre stays in `[0,1]`).

**Checkpoint**: US2 independently testable.

---

## Phase 5: User Story 3 — Wheel-button drag pan (Priority: P3)

**Goal**: Middle-button drag pans when zoomed in and never triggers the mode's left-button action.

**Independent Test**: Zoom in, middle-drag → centre changes; in Analysis mode no marker is placed; release ends the pan.

### Implementation

- [X] T016 [US3] In `src/core/events.js` `handleMouseDown`, intercept `event.button === 1` before mode delegation: `preventDefault()`, and if `zoom.level > 1.0` start `instance._wheelPan` (lastX/lastY, cursor → grabbing); always `return` (never delegate) (FR-009).
- [X] T017 [US3] In `handleMouseMove`, when `_wheelPan.active`, pan via the shared helpers and `return` before mode delegation; add `endWheelPan(instance)` and call it from `handleMouseUp` and `handleMouseLeave` when active (restore cursor) (FR-011).

### Tests

- [X] T018 [P] [US3] In `tests/helpers/gram-frame-page.js` add `middleDragSVG(x1, y1, x2, y2)` using `page.mouse` with `{ button: 'middle' }`.
- [X] T019 [P] [US3] In `tests/pan-zoom.spec.js`: at zoom 2× a middle-drag changes the centre; at level 1 it does not.
- [X] T020 [P] [US3] In `tests/pan-zoom.spec.js`: in Analysis mode a middle-drag places no marker (`analysis.markers` stays empty) while a normal click still adds one.

**Checkpoint**: US3 independently testable; no marker side effects.

---

## Phase 6: User Story 4 — Discover via guidance (Priority: P2)

**Goal**: Every mode's guidance describes the three wheel interactions.

**Independent Test**: Guidance panel lists scroll-pan, Ctrl+scroll-zoom and wheel-drag-pan, with the zoom-in precondition, in each mode.

### Implementation

- [X] T021 [US4] Add `src/utils/wheelGuidance.js` exporting `WHEEL_NAV_GUIDANCE` (three lines: Ctrl+scroll zoom around pointer; scroll to pan when zoomed in; wheel-button drag to pan when zoomed in).
- [X] T022 [US4] Spread `...WHEEL_NAV_GUIDANCE` into `getGuidanceText().items` in `AnalysisMode`, `HarmonicsMode`, `DopplerMode` and `PanMode` (FR-012).

### Tests

- [X] T023 [P] [US4] In `tests/pan-zoom.spec.js`: `.gram-frame-guidance` text contains the wheel-interaction phrases in Analysis mode and Pan mode.

**Checkpoint**: US4 independently testable.

---

## Phase 7: Polish & Cross-Cutting

- [X] T024 Regression test in `tests/pan-zoom.spec.js`: the +/− Pan-mode buttons and click-drag pan still change `zoom.level`/centre as before.
- [X] T024a Robustness fix: the wheel guidance grows each mode's guidance panel, which pushes the component down. `tests/harmonic-symbols.spec.js` (T005) hardcodes an absolute raw-mouse drag that then fell below the default 720px viewport; added `svg.scrollIntoViewIfNeeded()` before that drag so it stays in view.
- [X] T025 Run the full gate: `yarn typecheck`, `yarn test`, `yarn build` — all clean/green (constitution Quality Gates).
- [X] T026 [P] Manual smoke on `yarn dev`: Ctrl+scroll zoom around pointer; scroll-pan when zoomed; middle-drag pan; guidance visible; page scrolls normally when not zoomed and over surrounding panels.

---

## Dependencies & Execution Order

- **Setup (P1)** → **Foundational (P2, T003–T007)** blocks all stories.
- **US1 (P1)** is the MVP and lands first (needs T003/T005 + T007).
- **US2 (P2)** needs T003/T004 + T008 (the wheel listener from US1).
- **US3 (P3)** needs T003/T004 + T007.
- **US4 (P2)** is independent of the input code and can proceed in parallel.
- **Polish (P7)** after all stories.

### Parallel Opportunities

- T010, T018 (test helpers) and T021 (guidance constant) can be authored in parallel.
- Within each story the test tasks ([P]) run in parallel once that story's implementation lands.
- US4 (T021–T023) is fully parallel with the input-layer work.

## Implementation Strategy

1. Setup + Foundational — shared helpers, drag-pan routed through them.
2. US1 — Ctrl+scroll zoom (MVP): the highest-value gesture, works from level 1.
3. US2 — scroll-pan, US4 — guidance (parallel), US3 — wheel-drag pan.
4. Polish — regression + full gate + manual smoke.
