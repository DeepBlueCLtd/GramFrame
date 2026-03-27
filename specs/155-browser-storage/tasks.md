# Tasks: Store User Contributions in Browser Storage

**Input**: Design documents from `/specs/155-browser-storage/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Included — constitution mandates Playwright tests for all user-facing behaviour.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: No new project initialisation needed — GramFrame is an existing project. This phase creates the shared storage module.

- [ ] T001 Create storage adapter module with context detection, key generation, save/load/clear operations, schema versioning, and graceful degradation (try/catch around all Web Storage calls) in `src/core/storage.js`
- [ ] T002 Add JSDoc type definitions for StoredAnnotations, AnalysisData, HarmonicsData, DopplerData, and DataCoordinates in `src/types.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Wire storage into GramFrame lifecycle — save on state change, restore on init

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Add state listener in GramFrame constructor that calls `saveAnnotations()` on every state change (filtering to only save when annotation-relevant state changes) in `src/main.js`
- [ ] T004 Add restore logic in GramFrame constructor — after mode infrastructure is initialised but before first `notifyStateListeners()` call — to load saved annotations and merge into `this.state` in `src/main.js`
- [ ] T005 Pass instance index to storage functions to support multiple GramFrame instances on the same page in `src/main.js`
- [ ] T006 Run `yarn typecheck` to validate all new JSDoc types and storage module signatures

**Checkpoint**: Foundation ready — storage saves and restores automatically. User story implementation can now begin.

---

## Phase 3: User Story 1 — Trainer Annotations Persist Across Page Reloads (Priority: P1) MVP

**Goal**: Trainers add annotations to a gram, navigate away or close the browser, and find their annotations fully restored when they return.

**Independent Test**: Add markers/harmonics/dopplers on a trainer page, reload, verify all annotations reappear in correct positions.

### Tests for User Story 1

- [ ] T007 [P] [US1] Write Playwright test: add analysis markers on a trainer page, reload, verify markers are restored with correct positions and colours in `tests/storage.spec.ts`
- [ ] T008 [P] [US1] Write Playwright test: add harmonic sets on a trainer page, reload, verify harmonic sets are restored with correct spacing and anchor positions in `tests/storage.spec.ts`
- [ ] T009 [P] [US1] Write Playwright test: add doppler curve on a trainer page, reload, verify fPlus/fMinus/fZero markers and curve are restored in `tests/storage.spec.ts`
- [ ] T010 [P] [US1] Write Playwright test: verify annotations are silently restored without any prompt or confirmation dialog in `tests/storage.spec.ts`

### Implementation for User Story 1

- [ ] T011 [US1] Create a test HTML page that includes an "ANALYSIS" link to simulate a trainer page for Playwright testing in `tests/fixtures/trainer-page.html`
- [ ] T012 [US1] Ensure `detectUserContext()` in `src/core/storage.js` correctly returns trainer context when an anchor with exact text "ANALYSIS" is present on the page
- [ ] T013 [US1] Verify that trainer context uses `localStorage` so annotations survive browser restarts — validate by running T007–T010 tests
- [ ] T014 [US1] Add GramFramePage helper methods for storage testing (e.g., `clearStorage()`, `getStorageEntry()`, `setStorageEntry()`) in `tests/helpers/gram-frame-page.js`

**Checkpoint**: Trainer persistence is fully functional and independently testable.

---

## Phase 4: User Story 2 — Student Annotations Persist Within a Session (Priority: P2)

**Goal**: Students' annotations survive in-session navigation but are automatically cleared when the browser closes, so the next student on a shared PC starts clean.

**Independent Test**: Add annotations on a student page, reload within session, verify annotations persist. Close browser context and reopen, verify annotations are gone.

### Tests for User Story 2

- [ ] T015 [P] [US2] Write Playwright test: add annotations on a student page (no "ANALYSIS" link), reload, verify annotations persist within the session in `tests/storage.spec.ts`
- [ ] T016 [P] [US2] Write Playwright test: add annotations on a student page, close browser context and open a new one, verify annotations are gone (clean slate) in `tests/storage.spec.ts`

### Implementation for User Story 2

- [ ] T017 [US2] Create a test HTML page without an "ANALYSIS" link to simulate a student page for Playwright testing in `tests/fixtures/student-page.html`
- [ ] T018 [US2] Ensure `detectUserContext()` in `src/core/storage.js` correctly returns student context when no "ANALYSIS" link is present, selecting `sessionStorage`
- [ ] T019 [US2] Verify student context behaviour by running T015–T016 tests

**Checkpoint**: Student session-scoped persistence is fully functional and independently testable.

---

## Phase 5: User Story 3 — Trainer Clears Stored Annotations (Priority: P3)

**Goal**: Trainers can click a "Clear gram" button to remove all stored annotations for the current page and reset the display.

**Independent Test**: Add annotations on a trainer page, verify they persist, click "Clear gram", verify annotations are removed and do not reappear on reload.

### Tests for User Story 3

- [ ] T020 [P] [US3] Write Playwright test: on a trainer page with stored annotations, click "Clear gram" button, verify annotations are removed from display and storage in `tests/storage.spec.ts`
- [ ] T021 [P] [US3] Write Playwright test: after clearing a gram, reload the page and verify no annotations are restored in `tests/storage.spec.ts`
- [ ] T022 [P] [US3] Write Playwright test: on a student page, verify no "Clear gram" button is visible in `tests/storage.spec.ts`

### Implementation for User Story 3

- [ ] T023 [US3] Add "Clear gram" button rendering (trainer pages only) in the existing controls area in `src/components/UIComponents.js`
- [ ] T024 [US3] Wire "Clear gram" button click handler to call `clearAnnotations()` from storage module and reset component state (analysis markers, harmonic sets, doppler data) in `src/main.js`
- [ ] T025 [US3] Style "Clear gram" button to match existing UI controls in `src/gramframe.css`
- [ ] T026 [US3] Verify "Clear gram" behaviour by running T020–T022 tests

**Checkpoint**: Clear gram functionality is complete and independently testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, degradation, and final validation

- [ ] T027 [P] Write Playwright test: verify graceful degradation when storage is unavailable (annotations work but are not persisted, no errors shown) in `tests/storage.spec.ts`
- [ ] T028 [P] Write Playwright test: verify stored data with unrecognised schema version is discarded with console warning on page load in `tests/storage.spec.ts`
- [ ] T029 [P] Write Playwright test: verify no storage entry is created until the user makes their first annotation in `tests/storage.spec.ts`
- [ ] T030 Run `yarn typecheck` — zero errors
- [ ] T031 Run `yarn test` — all Playwright tests green (existing + new storage tests)
- [ ] T032 Run `yarn build` — clean production build

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T001, T002) — BLOCKS all user stories
- **User Stories (Phases 3–5)**: All depend on Phase 2 completion
  - US1, US2, US3 can proceed in parallel after Phase 2
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 — No dependencies on other stories
- **User Story 2 (P2)**: Can start after Phase 2 — Independent of US1 (same storage module, different storage type)
- **User Story 3 (P3)**: Can start after Phase 2 — Independent of US1/US2 (additive UI, uses same storage API)

### Within Each User Story

- Tests written first (must fail before implementation)
- Test fixtures before test cases
- Core implementation before integration verification
- Story complete before moving to next priority

### Parallel Opportunities

- T001 and T002 can run in parallel (different files)
- T007–T010 can run in parallel (independent test cases)
- T015–T016 can run in parallel (independent test cases)
- T020–T022 can run in parallel (independent test cases)
- T027–T029 can run in parallel (independent edge case tests)
- US1, US2, US3 can run in parallel after Phase 2

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Write Playwright test: add analysis markers, reload, verify restored in tests/storage.spec.ts"
Task: "Write Playwright test: add harmonic sets, reload, verify restored in tests/storage.spec.ts"
Task: "Write Playwright test: add doppler curve, reload, verify restored in tests/storage.spec.ts"
Task: "Write Playwright test: verify silent restoration without prompt in tests/storage.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T006)
3. Complete Phase 3: User Story 1 (T007–T014)
4. **STOP and VALIDATE**: Test trainer persistence independently
5. This alone delivers the core value — trainers no longer lose annotations

### Incremental Delivery

1. Setup + Foundational → Storage infrastructure ready
2. Add User Story 1 → Trainer persistence works → MVP
3. Add User Story 2 → Student session scoping works → Shared PC safety
4. Add User Story 3 → Clear gram button works → Full feature complete
5. Polish → Edge cases covered, all quality gates pass

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Constitution requires: `yarn typecheck`, `yarn test`, `yarn build` all pass before merge
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
