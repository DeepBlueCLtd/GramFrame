# Tasks: Student Tonal Expiry (24-Hour Persistence Limit)

**Input**: Design documents from `/specs/157-student-tonal-expiry/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/storage-expiry.md, quickstart.md

**Tests**: INCLUDED. The project Constitution makes Playwright e2e coverage NON-NEGOTIABLE (Principle II), so test tasks are mandatory here, not optional.

**Organization**: Tasks are grouped by user story so each can be implemented and tested independently. Note: US1 and US3 both touch `loadAnnotations()` in `src/core/storage.js` (the student age gate and the trainer skip guard are two branches of the same edit), so they are sequenced back-to-back.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in each task

## Path Conventions

Single-project browser component: source in `src/`, Playwright tests in `tests/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the working environment before touching persistence logic.

- [X] T001 Confirm baseline is green by running `yarn typecheck` and `yarn test` (record any pre-existing failures — e.g. the `state.version === "DEV"` metadata tests — so they are not mistaken for regressions from this feature)
- [X] T002 Re-read `src/core/storage.js` and `src/main.js#_restoreAnnotations` to confirm the single read path and the existing `savedAt` write in `saveAnnotations()` (per research.md Decision 1)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the shared, pure expiry building blocks that every story depends on. No behavior change to `loadAnnotations()` yet.

**⚠️ CRITICAL**: User story work cannot begin until this phase is complete.

- [X] T003 Add `export const STUDENT_TTL_MS = 24 * 60 * 60 * 1000` constant to `src/core/storage.js` (near `SCHEMA_VERSION`), with a JSDoc comment stating it is the fixed 24-hour student persistence policy
- [X] T004 Implement and export the pure predicate `isAnnotationExpired(savedAt, nowMs)` in `src/core/storage.js` returning `true` when `savedAt` is missing/unparseable (`Date.parse` → `NaN`), in the future (`nowMs - t < 0`), or older than `STUDENT_TTL_MS`; otherwise `false` — matching the table in `contracts/storage-expiry.md`
- [X] T005 Add a JSDoc `@param`/`@returns` signature for `isAnnotationExpired` so `yarn typecheck` covers it, then run `yarn typecheck` to confirm zero errors

**Checkpoint**: Shared expiry predicate + constant exist and typecheck; ready to wire into the load path.

---

## Phase 3: User Story 1 - Old student annotations do not resurface (Priority: P1) 🎯 MVP

**Goal**: When a gram is reopened in student context more than 24 hours after its annotations were last saved, nothing is restored and the stale storage key is removed.

**Independent Test**: On a student page, backdate a stored record's `savedAt` to >24h ago, reload, and confirm no annotations render and the `gramframe::` key is gone.

### Tests for User Story 1 (write first, expect FAIL before T009)

- [X] T006 [P] [US1] Add e2e test "student annotations older than 24h are discarded on load" to `tests/storage.spec.js`: seed annotations on a student sample page, read back the app-written `gramframe::` key from `sessionStorage`, rewrite its `savedAt` to 25h ago, reload, assert no markers/harmonics/doppler restored AND the key was removed (contract T-A, SC-001, FR-003)
- [X] T007 [P] [US1] Add e2e test "student annotations within 24h are restored on load" to `tests/storage.spec.js`: seed annotations, reload without altering `savedAt` (and with a `savedAt` set to ~1h ago), assert they are restored (contract T-B, SC-002, FR-004)
- [X] T008 [P] [US1] Add e2e test "student record with missing/garbage savedAt is discarded" to `tests/storage.spec.js`: delete or corrupt `savedAt`, reload, assert discarded and key removed (contract T-D, FR-009)

### Implementation for User Story 1

- [X] T009 [US1] In `loadAnnotations()` (`src/core/storage.js`), after the existing `version` check, add the student gate: if `detectUserContext() === 'student'` (reuse the `context` already computed in the function) and `isAnnotationExpired(data.savedAt, Date.now())`, then `storage.removeItem(key)`, emit a `console.warn`/info discard message, and `return null` (research Decision 1; contract behavior matrix)
- [X] T010 [US1] Run T006–T008; confirm they now pass. Run `yarn typecheck` and the full `yarn test` to check for regressions

**Checkpoint**: Student expiry works end-to-end and is independently testable.

---

## Phase 4: User Story 3 - Trainer annotations remain permanent (Priority: P1)

**Goal**: Trainer-context annotations are never aged out; the expiry gate is a strict no-op for trainers.

**Independent Test**: On a trainer page, backdate a stored record's `savedAt` to well over 24h (e.g. 10 days), reload, and confirm annotations are still restored.

> Note: The trainer skip is guaranteed by the `context === 'student'` guard added in T009. This phase adds the regression test that locks in permanence and verifies the guard.

### Tests for User Story 3

- [X] T011 [P] [US3] Add e2e test "trainer annotations survive beyond 24h" to `tests/storage.spec.js`: on a trainer sample page (with a `.gf-persistent` flag or `ANALYSIS` anchor, using `localStorage`), seed annotations, backdate `savedAt` to 10 days ago, reload, assert annotations are STILL restored and the key remains (contract T-C, SC-003, FR-006)
- [X] T012 [P] [US3] Add e2e test "trainer record with missing savedAt is NOT discarded" to `tests/storage.spec.js`: on a trainer page, remove `savedAt`, reload, assert annotations still restored (contract behavior matrix, FR-006)

### Implementation for User Story 3

- [X] T013 [US3] Verify the `context === 'student'` guard in `loadAnnotations()` (T009) correctly bypasses expiry for trainer context; adjust only if T011/T012 reveal a gap. Run `yarn test` to confirm both trainer tests pass

**Checkpoint**: Trainer permanence proven; no regression to the trainer workflow.

---

## Phase 5: User Story 2 - Instructors can force an immediate reset (Priority: P2)

**Goal**: Starting a fresh browser session yields no restored student annotations, giving instructors an immediate override.

**Independent Test**: With student annotations present, start a fresh session (new `sessionStorage` context) and confirm nothing is restored.

> Note: This behavior is provided by the existing `sessionStorage` scoping (feature 155) and is unchanged by this feature. This phase adds/asserts explicit coverage so the override is guarded against future regressions.

### Tests for User Story 2

- [X] T014 [P] [US2] Add (or confirm existing in `tests/storage.spec.js`) an e2e test "fresh browser session restores no student annotations": seed student annotations, simulate a fresh session (new browser context / cleared `sessionStorage`) per the Playwright pattern already used in `tests/storage.spec.js`, reload, assert nothing restored (contract T-E, US2, FR-008). If already covered by a feature-155 test, reference it here instead of duplicating

### Implementation for User Story 2

- [X] T015 [US2] No production code change expected. Run `yarn test` to confirm the fresh-session test passes with the new expiry gate in place (the gate must not break the existing session-scope behavior)

**Checkpoint**: Instructor fresh-session override verified alongside the 24h cap.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, type safety, and final quality-gate verification.

- [X] T016 [P] Update the JSDoc header block at the top of `src/core/storage.js` to document the 24-hour student expiry (mention trainer permanence and the fail-safe on malformed `savedAt`)
- [X] T017 [P] If any student sample page lacks annotations tooling for the tests, add/verify a suitable student and trainer sample under `sample/` (only if T006/T011 need a dedicated fixture; otherwise skip)
- [X] T018 Run the full quality-gate trio required by the Constitution: `yarn typecheck`, `yarn test`, `yarn build` — all must be green (excluding any pre-existing failures recorded in T001)
- [X] T019 Walk through `quickstart.md` steps 1–5 manually against `yarn dev` to confirm the observable behavior matches the spec's success criteria

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)** → no dependencies.
- **Foundational (Phase 2)** → depends on Setup. **BLOCKS all user stories** (T009/T013 require `isAnnotationExpired` + `STUDENT_TTL_MS`).
- **US1 (Phase 3)** → depends on Foundational. Delivers the MVP.
- **US3 (Phase 4)** → depends on T009 (shares the `loadAnnotations()` edit). Sequence after US1.
- **US2 (Phase 5)** → depends on Foundational; independent of US1/US3 code but should run after T009 to confirm no regression.
- **Polish (Phase 6)** → after all stories.

### Story independence notes

- US1 and US3 are two branches of the same `loadAnnotations()` change; implement US1's T009 first, then US3's tests assert the trainer branch. Their tests are independent.
- US2 requires no new production code — it guards existing session scoping.

### Within-phase parallel opportunities

- Foundational: T003 and T004 touch the same file → sequential; T005 after both.
- US1 tests T006, T007, T008 are `[P]` (independent test cases, same spec file — coordinate to avoid edit collisions; can be authored together).
- US3 tests T011, T012 are `[P]`.
- Polish T016 and T017 are `[P]`.

### Parallel execution example

```
# After Phase 2 is complete, author the US1 test cases together:
T006, T007, T008  (all target tests/storage.spec.js — same file, so land as one coordinated edit)
# Then implement:
T009 → T010
# Then US3:
T011, T012 (author together) → T013
```

## Implementation Strategy

- **MVP = User Story 1** (Phase 1 → 2 → 3). This alone delivers the core assessment-integrity value: old student tonals stop resurfacing.
- **Increment 2 = User Story 3** (Phase 4): lock in trainer permanence (guards against regression; same edit).
- **Increment 3 = User Story 2** (Phase 5): explicit coverage of the instructor fresh-session override.
- **Finish** with Phase 6 quality gates and the quickstart walkthrough.

Total scope is intentionally small: one production file changed (`src/core/storage.js`), one test file extended (`tests/storage.spec.js`), no schema change or migration.

## Task count summary

- Setup: 2 (T001–T002)
- Foundational: 3 (T003–T005)
- US1 (P1, MVP): 5 (T006–T010)
- US3 (P1): 3 (T011–T013)
- US2 (P2): 2 (T014–T015)
- Polish: 4 (T016–T019)
- **Total: 19 tasks**
