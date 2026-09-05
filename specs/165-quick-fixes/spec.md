# Feature Specification: Phase 1 — Quick Correctness Fixes, Dead-Code Sweep & Documentation Truth

**Feature Branch**: `165-quick-fixes`
**Created**: 2026-07-31
**Status**: Complete — implemented and merged
**Input**: [Findings Register](../../docs/analysis/Findings-Register.md) (re-verified 2026-07-31) — GF-02, GF-04, GF-12, GF-14, GF-15, GF-16, GF-19, GF-21ᴿ, GF-22, GF-23, GF-24, GF-35, GF-36, GF-37, GF-38–GF-44.

## Context

<!--
  Phase 1 is a set of small, independent, low-risk fixes — each ≤ half a day,
  each shippable as its own PR under this umbrella spec. They share three
  themes: (a) make published state and errors truthful, (b) delete code that
  provably does nothing, and (c) make the documentation describe the system
  that exists. Nothing here changes user-visible behaviour except where the
  current behaviour is a bug (GF-02) or a silent failure (GF-04, GF-16).
  Depends on Phase 0 (spec 164) only for the unit lane used by GF-35.
-->

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Published state tells the truth (Priority: P1)

An external listener reads `cursorPosition.imageX/imageY` from a state
broadcast. Today those fields contain SVG coordinates, contradicting the
documented contract in `types.js` — the correct image-relative values are
computed and then discarded (`events.js:59-60,79` vs the destructuring at
`:222` and the mislabelled write at `:230-231`). After this story the fields
contain image-relative coordinates as documented (GF-02).

**Independent Test**: Move the mouse over a zoomed, expanded spectrogram;
assert `imageX/imageY` in the broadcast state equal the image-relative values
for that screen position, not the SVG values.

**Acceptance Scenarios**:

1. **Given** a mousemove over the image, **When** state is broadcast, **Then**
   `cursorPosition.imageX/imageY` are image-relative per `types.js:61-62`.
2. **Given** any zoom level and expand state, **When** the cursor is at the
   image's top-left corner, **Then** `imageX/imageY` report (0, 0) within
   rounding tolerance.
3. **Given** the fix, **Then** no other `cursorPosition` field changes meaning.

---

### User Story 2 - Failures are loud (Priority: P1)

Two silent-failure paths become visible (GF-04, GF-16):

- **Mode construction**: today `ModeFactory` throws only on `localhost` and in
  production returns a no-op `BaseMode` after a `console.warn` — a broken mode
  silently kills interaction in the field. After: a mode-construction failure
  surfaces via the existing `.gramframe-error-indicator` pattern regardless of
  hostname, and the hostname check is removed.
- **Storage**: save/clear failures are swallowed by bare `catch {}` and every
  caller ignores the returned booleans (`main.js:349,431`, `PinToggle.js:54`).
  After: a failed save/clear surfaces a non-blocking UI signal so an analyst
  knows annotations are not being persisted (quota, private-browsing, etc.).

**Acceptance Scenarios**:

1. **Given** a mode class that throws during construction, **When** the
   component initializes on any hostname, **Then** the error indicator is
   shown and the failure is logged with the original error.
2. **Given** storage that throws on write (e.g. quota exceeded), **When** an
   annotation save is attempted, **Then** a visible, non-blocking indication
   is shown and the session continues working in memory.
3. **Given** healthy storage, **Then** no new UI appears and save behaviour is
   unchanged.

---

### User Story 3 - Dead code deleted (Priority: P1)

The verified-dead code is removed in one sweep (GF-22, GF-21ᴿ), with the
Phase 0 unused-exports ratchet lowered accordingly: the never-called
DopplerMode methods (`detectClosestMarker`, `getMousePosition`,
`renderPreviewCurve`, plus the transitively-dead `isNearMarker` /
`getMarkerDistance` wrappers), the dead `drawDopplerPreview` path in
`cursors.js`, deprecated `zoom.panMode` in state and types, vestigial
`markersPlaced`, the unused `tests/helpers/visual-helpers.js`, and unused
exports flagged by ts-unused-exports (excluding exports documented as
test-only seams).

**Independent Test**: Full Playwright suite and typecheck pass after the
sweep; the ts-unused-exports baseline drops from 17 modules.

**Acceptance Scenarios**:

1. **Given** the sweep, **When** `yarn test` and `yarn typecheck` run, **Then**
   both pass with no behavioural diff in any spec.
2. **Given** the sweep, **Then** the hygiene baseline for unused-export modules
   is lowered in the same PR (ratchet tightened, not just satisfied).
3. **Given** Doppler mode after the sweep, **When** an analyst places and drags
   markers, **Then** behaviour is unchanged (the live path never used the
   deleted code).

---

### User Story 4 - Small mechanical consistency fixes (Priority: P2)

Four independent one-file fixes:

- **GF-12**: `_clearGram` rebuilds cleared state from `createInitialState()` /
  the modes' initial-state contributions instead of hand-resetting 12 nested
  fields, so a future persisted field cannot survive a "Clear gram" by
  omission.
- **GF-15**: the arrow-key path's dynamic `import()` with an empty
  `.catch(() => {})` is replaced by the static import that already exists at
  the top of the same file; errors surface.
- **GF-19**: DopplerMode's two triplicated hit-test blocks are replaced with
  the existing unused `tolerance.js` helpers (`isWithinDataTolerance`,
  `findClosestTarget`).
- **GF-24**: `GramFrameAPI` keeps exactly one instance registry; the DOM-scan
  path and `_instances` array are unified so every API method operates on the
  same set (including the post-audit `getExpandState`/`setExpandState`).

**Acceptance Scenarios**:

1. **Given** annotations in every mode plus a selection, **When** "Clear gram"
   runs, **Then** resulting state deep-equals a freshly initialized state with
   config/imageDetails preserved.
2. **Given** a selected harmonic set, **When** arrow keys move it, **Then**
   the panel updates synchronously and any update error is no longer
   swallowed.
3. **Given** Doppler hit-testing via the tolerance helpers, **When** the
   Doppler Playwright specs run, **Then** marker grab behaviour is unchanged.
4. **Given** two instances where one's container was detached, **When** any
   API method enumerates instances, **Then** all methods agree on the same
   registry.

---

### User Story 5 - Documentation describes the real system (Priority: P1)

A new contributor (human or AI agent) reads the docs and is not lied to
(GF-38–GF-44). One sweep:

- **CLAUDE.md**: four modes listed; File Structure regenerated from the actual
  `src/` tree (no phantom `src/rendering/axes.js`; real modules present);
  real test-file names; no visual-testing claim (or real snapshot tests added
  — see Assumptions).
- **ADR-015** rewritten or superseded to describe the shipped image-resize
  zoom (the "rejected" approach is what `applyZoomTransform` and the new
  `viewport.js` actually do).
- **ADR-011** corrected to the real FeatureRenderer API (zero of its listed
  method names exist).
- **Gram-Modes.md** covers all four modes or is folded into
  Tech-Architecture.md.
- **Testing-Strategy.md** rewritten to describe the real strategy (Playwright
  E2E + Phase 0 unit lane), with aspirations labelled as targets.
- **Mode-list sweep**: README, ADR-008, the `state-assertions.js` display-name
  map include pan; the ADR-014 numbering gap gets an explanatory note;
  ADR-004's example code matches the implemented state API.
- **GF-44**: the completed-refactor planning doc gets a "historical —
  completed" banner.

**Acceptance Scenarios**:

1. **Given** CLAUDE.md's File Structure section, **When** compared against
   `src/`, **Then** every listed path exists and every `src` module of
   comparable significance is listed.
2. **Given** any doc statement about mode count, **Then** it says four
   (analysis, harmonics, doppler, pan).
3. **Given** ADR-011 and ADR-015, **When** compared to the code, **Then**
   named APIs exist and described mechanisms match the implementation.
4. **Given** Testing-Strategy.md, **Then** no tool is prescribed that is not
   installed and running in CI.

---

### User Story 6 - Repo & workflow hygiene (Priority: P3)

Cleanups that touch no behaviour (GF-35, GF-36, GF-37, GF-23, GF-14):

- Untrack `playwright-report/`, `.obsidian/`, `Memory/`, `Memory_Bank.md`,
  `Implementation_Plan.md`; archive or delete `prompts/` (404K) and
  `zoom-demonstrator/` (276K) after confirming nothing references them.
- `generate-version` writes an untracked/generated file so builds and tests
  stop dirtying the working tree.
- Pre-push hook becomes `typecheck + lint + unit lane` (fast); the full
  Playwright suite remains CI's job.
- `__test__*` API methods are gated behind a debug/test flag rather than
  always shipping (coordinated with the test helpers that consume them).
- Global keydown handler is uninstalled when the last instance is destroyed;
  SVG/mode-button listeners use bound refs so `cleanupEventListeners`
  actually removes them.

**Acceptance Scenarios**:

1. **Given** a fresh clone, **When** `yarn test` then `git status` run,
   **Then** the tree is clean.
2. **Given** the last instance is destroyed, **When** a key is pressed,
   **Then** no GramFrame handler executes.
3. **Given** production API surface, **Then** `__test__*` members are absent
   unless the debug flag is set — and the Playwright helpers still pass by
   enabling it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `cursorPosition.imageX/imageY` MUST contain image-relative
  coordinates matching the `types.js` contract at every zoom/expand state.
- **FR-002**: Mode-construction failure MUST surface via the standard error
  indicator on all hostnames; the localhost special case MUST be removed.
- **FR-003**: Failed annotation save/clear MUST produce a visible non-blocking
  signal; in-memory behaviour MUST continue unaffected.
- **FR-004**: All code verified dead in the register (GF-21ᴿ/GF-22 evidence
  list) MUST be deleted; the unused-exports ratchet baseline MUST be lowered
  in the same change.
- **FR-005**: `_clearGram` MUST derive cleared state from the initial-state
  builders, preserving only config, image details, viewport, and mode.
- **FR-006**: The dynamic import in the arrow-key path MUST be replaced by the
  existing static import, with errors no longer swallowed.
- **FR-007**: Doppler hit-testing MUST use the shared tolerance helpers; the
  triplicated blocks MUST be removed.
- **FR-008**: `GramFrameAPI` MUST use a single instance registry for all
  methods.
- **FR-009**: The documentation set MUST contain no claim contradicted by the
  codebase (modes, file structure, APIs, testing tools, zoom mechanism).
- **FR-010**: Tracked non-project artefacts (GF-36 list) MUST be untracked or
  moved to an explicit archive location, and `.gitignore` MUST prevent their
  return.
- **FR-011**: Build/test runs MUST NOT modify tracked files (version
  generation included).
- **FR-012**: Each user story MUST be independently shippable as its own PR
  referencing this spec and its finding IDs.

## Success Criteria *(mandatory)*

- **SC-001**: A listener consuming `imageX/imageY` gets documented semantics —
  verified by a new assertion in an existing Playwright spec.
- **SC-002**: No silent failure path remains for mode construction or storage
  writes (grep: zero bare `catch {}` in `storage.js`; no hostname check in
  `ModeFactory`).
- **SC-003**: Unused-export baseline strictly lower than 17; madge cycle count
  not increased.
- **SC-004**: A doc-vs-code audit re-run (GF-38–44 checks) finds zero
  discrepancies.
- **SC-005**: `git status` is clean after any build or test run.
- **SC-006**: Full Playwright suite green after every constituent PR — no
  user-visible behaviour change except those specified (error surfacing).

## Assumptions

- For GF-29/GF-38's visual-testing claim, the default resolution is to remove
  the claim; adding real `toHaveScreenshot` coverage is deferred unless
  trivially cheap during the docs sweep.
- `prompts/` and `zoom-demonstrator/` are development-history artefacts; if the
  team wants them kept, "archive" means moving under `docs/archive/` (or a
  separate branch), not deletion — either satisfies FR-010.
- Gating `__test__*` methods must not break the Playwright helpers; the test
  fixtures will set the debug flag. If that coupling proves noisy, the
  fallback is documenting the methods as test-only and excluding them from the
  unused-export ratchet, deferring removal.
- GF-14's keydown uninstall is bounded: per-document handler removed at zero
  instances; no attempt to refactor the broader listener architecture (that is
  Phase 3 territory).
