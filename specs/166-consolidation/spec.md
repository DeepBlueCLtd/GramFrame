# Feature Specification: Phase 2 — Consolidating the Interest-Accruing Seams

**Feature Branch**: `166-consolidation`
**Created**: 2026-07-31
**Status**: Complete — implemented and merged
**Input**: [Findings Register](../../docs/analysis/Findings-Register.md) (re-verified 2026-07-31) — GF-01ᴿ, GF-07, GF-08, GF-17, GF-18, GF-20, GF-26ᴺ, GF-27, GF-28ᴿ.

## Context

<!--
  These are the findings the re-verification showed to be accruing interest
  fastest: waitForTimeout grew 142→249 in a week; a fourth hand-rolled drag
  machine appeared (wheel-pan); wheel navigation added a full-state clone per
  wheel notch; and feature-156/160 render-size support was copy-pasted into
  all four coordinate pipelines. Each consolidation follows the same rule:
  PIN CURRENT BEHAVIOUR WITH TESTS FIRST, then collapse the duplicates, then
  delete. Test stability (Story 1) comes first because the refactors in
  Stories 2-4 are validated by the suite it stabilizes.
  Depends on: spec 164 (unit lane, ratchets); benefits from spec 165's dead-code
  sweep having already removed the dead halves of some duplications.
-->

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Deterministic tests & restored keyboard coverage (Priority: P1)

A developer runs the Playwright suite twice and gets the same result twice.
The 249 `waitForTimeout` calls are replaced with state-based waits —
`expect.poll` / `waitForFunction` against broadcast state, or DOM conditions —
starting with the page object and helpers (used everywhere), then the heaviest
specs (`reformat-markers-harmonics` 43, `storage` 30, `harmonic-pin-toggle`
19, `harmonic-pin-sampling` 16). CI `retries` drops to 0 once the suite is
stable (GF-27). The two disabled `keyboard-focus*` specs are replaced by an
active spec asserting arrow-key marker/harmonic movement — the coverage that
protects Story 2's refactor of `keyboardControl.js` (GF-26ᴺ). Opportunistic
POM adoption in the ~6-8 small specs that duplicate selectors (GF-28ᴿ).

**Why this priority**: Every other story in this phase is a refactor whose
safety argument is "the suite still passes". A flaky suite makes that argument
worthless, and the arrow-key gap sits exactly where Story 2 operates.

**Independent Test**: Run the full suite 5× locally with `retries: 0`; zero
flakes. New keyboard spec fails if arrow-key movement breaks.

**Acceptance Scenarios**:

1. **Given** the refactored helpers and heavy specs, **When** the suite runs
   5 consecutive times with retries disabled, **Then** all runs pass.
2. **Given** a selected marker at a known data position, **When** an arrow key
   is pressed, **Then** the new spec asserts the marker's data coordinates
   changed by the expected increment (per zoom level), not merely that
   elements are visible.
3. **Given** the waitForTimeout ratchet baseline, **Then** it is lowered to
   match each batch of replacements (target ≤ 20 remaining, each with an
   inline justification comment).
4. **Given** the stabilized suite, **Then** `playwright.config.ts` sets
   `retries: 0` in CI.

---

### User Story 2 - One coordinate pipeline (Priority: P1)

A developer changing coordinate behaviour (e.g. adding a render-size feature
like 156/160) edits exactly one module. The four parallel implementations —
`utils/coordinates.js`, `utils/coordinateTransformations.js`, the private
non-zoom-aware functions in `keyboardControl.js`, and the inline
`screenToDataWithZoom` in `events.js` (GF-01ᴿ) — are consolidated onto a
single canonical module. Before any deletion, unit tests (Phase 0 lane) pin
the equivalence of all four current implementations across zoom levels,
expand states, render sizes, and margins; those tests then become the
regression suite for the canonical module.

**Why this priority**: The re-verification caught the predicted failure mode
in the act — feature-156/160 support was copy-pasted into all four sites. The
keyboard implementation is additionally NOT zoom/expand-aware internally
(it compensates externally), so the next edit there is the likeliest silent
divergence.

**Independent Test**: Unit tests assert, for a grid of (zoom, expand,
render-size, margin) cases, that screen→data and data→SVG round-trips through
the canonical module match the recorded outputs of each legacy path within
float tolerance.

**Acceptance Scenarios**:

1. **Given** the equivalence unit tests written against all four live paths,
   **When** they run before any consolidation, **Then** they pass — proving
   the pin is faithful (any pre-existing divergence found here is triaged
   before proceeding).
2. **Given** the canonical module, **When** the three duplicate paths are
   deleted and their callers rewired, **Then** the equivalence tests, the
   arrow-key spec (Story 1), and the full Playwright suite pass.
3. **Given** the consolidation, **Then** madge cycle count does not increase
   and the hygiene baselines are lowered where the deletions allow.
4. **Given** mouse, keyboard, wheel-zoom, and expand interactions on the same
   point, **Then** all report identical data coordinates.

---

### User Story 3 - One drag engine (Priority: P2)

All pointer-drag interactions run through `BaseDragHandler`: analysis marker
drags (already there), harmonic-set creation drag, Doppler placement drag,
PanMode click-drag, and the middle-button wheel-pan added by feature 160 —
five machines today (GF-18). Drag state has a single owner: the mirrors into
`state.analysis.*`, `state.dragState.*`, and `state.doppler.*` ("backward
compatibility") are replaced by one read-only projection for listeners
(GF-17). External state shape changes are coordinated with `types.js` and
documented in the data guide.

**Independent Test**: Each interaction (marker drag, harmonic create, doppler
place, pan drag, middle-button pan) has a Playwright spec passing before and
after; grep shows one `isDragging` owner in state.

**Acceptance Scenarios**:

1. **Given** each of the five drag interactions, **When** exercised after the
   port, **Then** behaviour (thresholds, cursors, completion semantics) is
   unchanged per existing specs.
2. **Given** a drag in progress, **When** state is broadcast, **Then** drag
   info appears in exactly one documented place; legacy mirror fields are
   removed from `types.js` or explicitly deprecated for one release.
3. **Given** a new mode needing drag, **Then** it can subscribe to
   `BaseDragHandler` without writing mousedown/mousemove/mouseup handling.

---

### User Story 4 - Batched, throttled notifications (Priority: P2)

State listeners are notified through a single dispatch choke-point with
microtask batching: one gesture (mode switch, wheel notch, drag frame)
produces at most one notification per settled state, instead of the current
~29 direct `notifyStateListeners` sites firing unbatched (GF-08) with a full
`JSON.parse(JSON.stringify)` clone each time (GF-07) — a cost the wheel-zoom
feature now incurs per notch, compounded by the storage listener
re-serializing annotations inside every notification. High-frequency paths
(mousemove, wheel, drag) are throttled to animation-frame cadence; cloning
happens once per dispatch, only when external listeners exist.

**Independent Test**: A counting listener in a Playwright spec asserts: one
mode-switch → one notification; a continuous 60-event mousemove/wheel burst →
notifications bounded by frame cadence, not event count.

**Acceptance Scenarios**:

1. **Given** a mode switch (which today fires ≥2 notifications), **When** it
   completes, **Then** listeners receive exactly one notification with final
   state.
2. **Given** a wheel-zoom burst, **When** it settles, **Then** notification
   count is bounded by elapsed frames and the final state matches today's.
3. **Given** the storage save listener, **Then** it re-serializes only when
   annotation-relevant state changed (not on every cursor move).
4. **Given** internal callers, **Then** none can bypass the choke-point (the
   direct notify function is no longer exported to modes).

---

### User Story 5 - One diffing-table component (Priority: P3)

The markers table and harmonics panel share one row-diffing table engine
(update-in-place, rebuild-from-index, trailing-row removal, click-to-select,
delete-button propagation, fixed-height scroll wrapper) instead of two
parallel implementations that have already diverged once and duplicated the
post-audit scroll wrapper (GF-20).

**Acceptance Scenarios**:

1. **Given** the shared component, **When** markers/harmonics are added,
   updated, removed, selected, and deleted in both tables, **Then** existing
   specs pass unchanged.
2. **Given** a future table behaviour change (e.g. styling a selected row),
   **Then** it is made in one module and appears in both tables.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every consolidation MUST land behind a behaviour-pinning test
  written and passing BEFORE the duplicate paths are removed.
- **FR-002**: Exactly one coordinate-transform module MUST remain; all
  screen/SVG/image/data conversions in `src/` MUST route through it.
- **FR-003**: The coordinate module MUST be zoom-, expand-, render-size- and
  margin-aware; callers MUST NOT compensate externally.
- **FR-004**: All drag interactions MUST run through the shared drag engine;
  drag state MUST have a single authoritative owner with at most one
  read-only projection for listeners.
- **FR-005**: Listener notification MUST flow through one dispatcher with
  batching; per-dispatch cloning MUST occur at most once and only when
  listeners are registered.
- **FR-006**: High-frequency input paths MUST NOT notify more often than
  animation-frame cadence.
- **FR-007**: `waitForTimeout` usage MUST be reduced to a justified residue
  (≤ 20) and the ratchet baseline lowered accordingly; CI retries MUST be 0.
- **FR-008**: An active spec MUST assert arrow-key movement deltas for markers
  and harmonic sets; the `.disabled` specs MUST be deleted or restored.
- **FR-009**: One table engine MUST serve both the markers table and the
  harmonics panel.
- **FR-010**: Public state shape changes (removed mirror fields) MUST be
  reflected in `types.js` and the data/state guide in the same PR.
- **FR-011**: Hygiene baselines (cycles, unused exports, waitForTimeout) MUST
  be monotonically lowered across this phase, never raised.

## Success Criteria *(mandatory)*

- **SC-001**: Suite passes 5 consecutive full runs with retries 0, locally and
  in CI.
- **SC-002**: A single-module edit is sufficient to change coordinate
  behaviour everywhere — demonstrated by the consolidation PR itself deleting
  three implementations with zero spec diffs.
- **SC-003**: Mouse, keyboard, and wheel report identical data coordinates for
  the same physical point at every tested zoom/expand combination.
- **SC-004**: One gesture → one notification (mode switch); frame-bounded
  notifications under continuous input; no listener observes intermediate
  half-updated state.
- **SC-005**: `grep -c waitForTimeout tests/` ≤ 20, each with a justification.
- **SC-006**: Lines-of-code net negative for the phase (duplication removed
  exceeds infrastructure added).

## Assumptions

- Consolidation target for coordinates is `coordinateTransformations.js` (the
  most complete implementation), but the pinning tests are authoritative — if
  they reveal it diverges from the majority behaviour, the target inherits the
  majority behaviour and the divergence is triaged as a bug.
- Throttling to frame cadence is a listener-observable timing change;
  same-frame final-state equivalence is the compatibility bar. Debug overlays
  and the diagnostics panel are internal listeners and may be updated in-repo.
- Removing the "backward compatibility" mirror fields is acceptable because
  the register found no in-repo external consumer; if a downstream training
  system is known to read them, the read-only projection keeps the old paths
  populated for one deprecation release (decision to be confirmed at plan
  stage).
- The five drag machines are ported one per PR, PanMode/wheel-pan last (newest
  and least test-covered until Story 1's pan specs are trusted).
