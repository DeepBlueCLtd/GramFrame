# Tasks: Enrich Repository Documentation

**Input**: Design documents from `/specs/154-enrich-docs/`
**Prerequisites**: plan.md (required), spec.md (required), research.md

**Tests**: No automated tests for this documentation-only feature. Validation is manual: file paths accurate, ADR cross-references valid, content matches current codebase.

**Organization**: Tasks are grouped by user story to enable independent implementation and review of each document.

## Phase 1: Setup

**Purpose**: Read existing documentation to understand current state before enriching or creating new docs.

- [X] T001 [P] Read existing docs/Tech-Architecture.md and note gaps per research.md findings
- [X] T002 [P] Read existing docs/HTML-Integration-Guide.md and note gaps per research.md findings
- [X] T003 [P] Read existing README.md and identify where documentation index section will go

**Checkpoint**: Existing doc state understood — enrichment and creation can begin.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Audit the current source code to ensure documentation will be accurate. Each task produces bullet-point notes (inline or scratch) capturing the key facts, API surface, and patterns found — these notes feed directly into the writing tasks in Phases 3-8.

**CRITICAL**: Documentation accuracy depends on understanding the current codebase. Complete this before writing any guides.

- [X] T004 [P] Audit src/core/state.js — produce notes on: state shape, listener registration API, deep-copy contract, key state fields
- [X] T005 [P] Audit src/modes/BaseMode.js and src/modes/ModeFactory.js — produce notes on: mode lifecycle, required overrides, factory registration, error handling
- [X] T006 [P] Audit src/utils/coordinates.js — produce notes on: each transform function, input/output types, the screen → SVG → image → data chain
- [X] T007 [P] Audit src/core/configuration.js — produce notes on: parsing flow (HTML table → config object), supported parameters, validation
- [X] T008 [P] Audit src/core/FeatureRenderer.js — produce notes on: cross-mode coordination API, feature lifecycle, rendering triggers
- [X] T009 [P] Audit src/rendering/cursors.js and src/rendering/axes.js — produce notes on: SVG element creation patterns, positioning logic, update triggers
- [X] T010 [P] Audit src/core/events.js — produce notes on: event binding strategy, ResizeObserver setup, mode-specific delegation

**Checkpoint**: Codebase audit complete — all doc content can now be written accurately.

---

## Phase 3: User Story 1 - Architecture Overview (Priority: P1) MVP

**Goal**: Enrich docs/Tech-Architecture.md into a comprehensive architecture guide covering all major subsystems and their interactions.

**Independent Test**: A new developer can answer "Where does cursor rendering happen?", "How do modes communicate?", and "How does config get parsed?" from this document alone.

- [X] T011 [US1] Enrich docs/Tech-Architecture.md — add system diagram (ASCII) showing subsystem relationships (GramFrame → modes, rendering, state, events, configuration, coordinates) (FR-004)
- [X] T012 [US1] Enrich docs/Tech-Architecture.md — add Mode System section: BaseMode contract, ModeFactory registration, mode directory convention, FeatureRenderer coordination
- [X] T013 [US1] Enrich docs/Tech-Architecture.md — add Rendering Pipeline section: SVG overlay strategy, cursor/axis rendering, coordinate transform chain
- [X] T014 [US1] Enrich docs/Tech-Architecture.md — add State Management section: state.js structure, listener pattern, deep-copy contract, HMR preservation
- [X] T015 [US1] Enrich docs/Tech-Architecture.md — add Event Handling section: event flow, ResizeObserver, mode-specific event delegation
- [X] T016 [US1] Enrich docs/Tech-Architecture.md — add Configuration section: HTML table parsing, parameter types, auto-discovery on DOMContentLoaded
- [X] T017 [US1] Enrich docs/Tech-Architecture.md — add ADR cross-references (ADR-001, ADR-002, ADR-004, ADR-005, ADR-008, ADR-011) and date stamp

**Checkpoint**: Architecture guide complete and independently useful.

---

## Phase 4: User Story 2 - Getting Started Guide (Priority: P2)

**Goal**: Create docs/Getting-Started.md so a new contributor can go from clone to running dev server and passing tests.

**Independent Test**: Developer with Node.js can follow guide from clone to `yarn dev` + `yarn test` with zero undocumented steps.

- [X] T018 [US2] Create docs/Getting-Started.md — prerequisites section (Node.js version, Yarn, browser for Playwright)
- [X] T019 [US2] Enrich docs/Getting-Started.md — clone, install, and first-run instructions (`yarn install`, `yarn dev`, opening browser)
- [X] T020 [US2] Enrich docs/Getting-Started.md — development workflow section (hot reload with Vite, debug.html usage, sample/ directory)
- [X] T021 [US2] Enrich docs/Getting-Started.md — testing section (`yarn test`, `yarn typecheck`, `yarn build`, running individual tests with Playwright)
- [X] T022 [US2] Enrich docs/Getting-Started.md — tooling overview (Vite for build, Playwright for e2e, JSDoc for types) with cross-references to Testing-Strategy.md and ADR-010

**Checkpoint**: Getting-started guide complete and independently useful.

---

## Phase 5: User Story 3 - Integration Guide (Priority: P3)

**Goal**: Enrich docs/HTML-Integration-Guide.md with parameter reference, multi-instance examples, and troubleshooting.

**Independent Test**: A content author with HTML knowledge can embed a working GramFrame instance using only this guide.

- [X] T023 [US3] Enrich docs/HTML-Integration-Guide.md — add complete parameter reference table (time-start, time-end, freq-start, freq-end, and any other supported parameters)
- [X] T024 [US3] Enrich docs/HTML-Integration-Guide.md — add multi-instance example showing two independent GramFrame instances on one page
- [X] T025 [US3] Enrich docs/HTML-Integration-Guide.md — add troubleshooting section (common mistakes, missing image, wrong parameter names) and cross-references to ADR-005 and ADR-013

**Checkpoint**: Integration guide complete and independently useful.

---

## Phase 6: User Story 4 - Adding Graphical Features Guide (Priority: P4)

**Goal**: Create docs/Adding-Graphical-Features.md as a code area guide for developers adding new visual features.

**Independent Test**: A developer can identify the 3-5 source files to modify for a new SVG overlay within 5 minutes.

- [X] T026 [P] [US4] Create docs/Adding-Graphical-Features.md — code area map listing key files: src/rendering/ (cursors, axes), src/utils/coordinates.js, src/utils/svg.js, src/core/events.js, src/core/FeatureRenderer.js
- [X] T027 [US4] Enrich docs/Adding-Graphical-Features.md — coordinate transform guide: explain screen → SVG → image → data chain with file pointers
- [X] T028 [US4] Enrich docs/Adding-Graphical-Features.md — mode extension tips: BaseMode contract, ModeFactory registration, directory convention, cross-references to ADR-001, ADR-002, ADR-008, ADR-011

**Checkpoint**: Graphical features guide complete and independently useful.

---

## Phase 7: User Story 5 - Data and State Guide (Priority: P5)

**Goal**: Create docs/Data-and-State-Guide.md covering all persistence surfaces and the state management pattern.

**Independent Test**: A developer can trace storage location and data flow for any piece of runtime state using this guide alone.

- [X] T029 [P] [US5] Create docs/Data-and-State-Guide.md — state.js section: state shape, listener registration, deep-copy contract, common state fields
- [X] T030 [US5] Enrich docs/Data-and-State-Guide.md — configuration parsing section: HTML table → config object flow, parameter validation, DOMContentLoaded lifecycle
- [X] T031 [US5] Enrich docs/Data-and-State-Guide.md — persistence overview: what is persisted (if anything) across sessions, what is ephemeral, cross-reference to ADR-004

**Checkpoint**: Data and state guide complete and independently useful.

---

## Phase 8: User Story 6 - Rendering Troubleshooting Guide (Priority: P6)

**Goal**: Create docs/Rendering-Troubleshooting.md with a rendering code area map and practical SVG debugging tips.

**Independent Test**: A developer investigating a mispositioned annotation can narrow the issue to the correct subsystem within 10 minutes.

- [X] T032 [P] [US6] Create docs/Rendering-Troubleshooting.md — rendering pipeline map: which files handle cursor rendering, axis rendering, overlay positioning, feature persistence
- [X] T033 [US6] Enrich docs/Rendering-Troubleshooting.md — common failure points: coordinate transform mismatches, SVG viewBox issues, resize/redraw timing, state-rendering sync
- [X] T034 [US6] Enrich docs/Rendering-Troubleshooting.md — debugging tips: browser devtools SVG inspection, debug.html usage, coordinate logging, cross-references to ADR-001, ADR-002, Component-Strategy.md

**Checkpoint**: Troubleshooting guide complete and independently useful.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: README update, cross-document consistency, final validation.

- [X] T035 Update README.md — add "Developer Documentation" section with links to all 6 guides (Tech-Architecture, Getting-Started, HTML-Integration-Guide, Adding-Graphical-Features, Data-and-State-Guide, Rendering-Troubleshooting)
- [X] T036 Cross-document consistency check — verify all file path references are accurate, all ADR cross-references link to real files, no contradictions between guides
- [X] T037 Add date stamps to all new and enriched documents (Last updated: YYYY-MM-DD)
- [X] T038 Run `yarn test` and `yarn typecheck` and `yarn build` to confirm zero regressions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - US1 (architecture) can inform US4, US5, US6 but is not blocking
  - US2-US6 are fully independent of each other
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Independent — no dependencies on other stories
- **US2 (P2)**: Independent — no dependencies on other stories
- **US3 (P3)**: Independent — no dependencies on other stories
- **US4 (P4)**: Independent — benefits from US1 being done first but not required
- **US5 (P5)**: Independent — benefits from US1 being done first but not required
- **US6 (P6)**: Independent — benefits from US1 being done first but not required

### Parallel Opportunities

- All Phase 1 tasks (T001-T003) can run in parallel
- All Phase 2 tasks (T004-T010) can run in parallel
- After Phase 2, all 6 user stories can be worked in parallel
- Within each user story, first task creates the file, subsequent tasks enrich it (sequential)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational audit
3. Complete Phase 3: Architecture Guide (US1)
4. **STOP and VALIDATE**: Can a new developer navigate the system using only this doc?
5. Proceed to remaining stories

### Incremental Delivery

1. Setup + Foundational → Codebase understood
2. US1 (Architecture) → System map available
3. US2 (Getting Started) → Onboarding path complete
4. US3 (Integration Guide) → Embedding documented
5. US4-US6 (Task Guides) → Developer workflows documented
6. Polish → README links, consistency, date stamps

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story produces one independent document
- No code changes — all tasks are Markdown authoring
- Commit after each completed user story phase
- Verify file path accuracy after each document is written
