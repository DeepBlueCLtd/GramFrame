# Feature Specification: Phase 3 — Structural Refactor & Strict Type Gate

**Feature Branch**: `167-structural-refactor`
**Created**: 2026-07-31
**Status**: Draft
**Input**: [Findings Register](../../docs/analysis/Findings-Register.md) (re-verified 2026-07-31) — GF-03, GF-05, GF-06, GF-09, GF-10, GF-11, GF-13, GF-30 (residual), GF-32.

## Context

<!--
  The long-arc phase: boundary and typing work that pays off over quarters,
  not days. It contains the audit's only High finding (GF-32, the hollowed-out
  strict gate) and the structural findings that make feature work slow:
  the state⇄modes import cycles, the 716-line table.js hub, the ~54-field
  instance surface, and named-mode reach-ins. Everything here is incremental —
  no big-bang rewrite, no long-lived branch. Each story lands as a sequence of
  small PRs that keep the suite green and ratchet a measurable number
  (cycles, strict errors, instance fields, BaseMode hooks) monotonically down.
  Depends on: spec 164 (ratchets, unit lane), spec 166 (single coordinate
  pipeline, single dispatcher — several cycles dissolve only after those land).
-->

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Strict type gate, restored per-flag (Priority: P1)

The project's only type defense is JSDoc + tsc (ADR-007), yet
`strictNullChecks`, `noImplicitAny`, and `strictPropertyInitialization` are
disabled under a nominal `strict: true` (GF-32 — the register's sole High
finding). Each flag is re-enabled via a staged burn-down: measure the error
count, hold it as a ratcheted ceiling that CI enforces, burn errors down in
small PRs, then flip the flag on permanently at zero. DOM-heavy code full of
nullable `querySelector`/`getBoundingClientRect` returns is the primary
beneficiary — null-handling bugs become compile-time findings.

**Why this priority**: Highest-severity open finding; also multiplies the
value of every other refactor in this phase, since moved code gets re-checked
under real strictness.

**Independent Test**: With `strictNullChecks` on, `yarn typecheck` passes;
introducing an unguarded `querySelector(...).classList` access fails the
build.

**Acceptance Scenarios**:

1. **Given** each disabled flag, **When** the burn-down starts, **Then** the
   current error count under that flag is recorded as a CI-enforced ceiling
   that must never rise.
2. **Given** the burn-down PRs, **When** each merges, **Then** the ceiling is
   lowered to the new count in the same PR.
3. **Given** a flag reaching zero errors, **Then** the flag is enabled in
   `tsconfig.json` and its ceiling infrastructure removed.
4. **Given** all three flags enabled, **Then** `strict: true` stands with no
   per-flag disables, and ADR-007 is annotated as fully in force.

---

### User Story 2 - State and modes decoupled (Priority: P1)

`state.js` no longer imports the four mode classes, and modes no longer
import the notifier back — today's hard cycle (GF-03: 10 of 11 madge cycles)
plus the module-level `globalStateListeners` copying (GF-06). Modes register
their initial-state slices through the factory/registration seam; state
change flows exclusively through the Phase 2 dispatcher, which modes receive
rather than import. Listener registration becomes explicit pub/sub with one
registry (per-instance, global fan-in handled by the dispatcher), so removal
no longer scrubs two lists.

**Independent Test**: `yarn hygiene` shows the state⇄modes cycles gone
(cycle baseline lowered accordingly); a mode module can be loaded in the unit
lane without importing `state.js`.

**Acceptance Scenarios**:

1. **Given** the refactor, **When** madge runs, **Then** no cycle contains
   both `core/state.js` and a `modes/` file, and the overall cycle baseline
   drops from 11 toward the residue (ExpandToggle⇄table dissolves in Story 3).
2. **Given** a new mode registered with the factory, **Then** its initial
   state appears without editing `state.js`.
3. **Given** a listener added then removed via the public API, **Then**
   exactly one registry is touched and no duplicate delivery or leak occurs
   (HMR re-registration included).

---

### User Story 3 - table.js split into what it actually is (Priority: P2)

The 716-line `components/table.js` (GF-09) is split along its six existing
responsibilities: component scaffold / config-table replacement (keeps the
name), spectrogram image setup & scaling, SVG layout, zoom transform &
visible-range math (merged with `core/viewport.js`, which already delegates
to it), and the axes engine (~8 private helpers → `rendering/axes.js`,
finally making CLAUDE.md's long-claimed module real). The mutual
ExpandToggle⇄table cycle dissolves as a side effect.

**Acceptance Scenarios**:

1. **Given** the split, **When** the suite and typecheck run, **Then** all
   pass with zero behavioural diff (pure move-and-rewire, enforced by
   reviewing each PR as moves).
2. **Given** the axes engine, **Then** it lives in `rendering/` beside
   `cursors.js`/`symbols.js` and exposes a documented interface.
3. **Given** madge after the split, **Then** the ExpandToggle⇄table cycle is
   gone and no new cycle appeared.
4. **Given** zoom math, **Then** it has exactly one home shared by wheel,
   keyboard, and API zoom paths.

---

### User Story 4 - Narrow mode contract, capability seams (Priority: P2)

`BaseMode` shrinks to the hooks subclasses actually implement (GF-10:
`renderCursor` and `getStateSnapshot` have zero meaningful overrides; several
overrides are empty), and cross-module collaborators stop reaching into named
modes (GF-11): `MainUI`'s `any`-cast calls to `updateMarkersTable` /
`updateHarmonicPanel`, `FeatureRenderer`'s `instance.modes.analysis/...`
access, and PanMode's `instance._zoomIn/_zoomOut` calls are replaced by
declared capability interfaces (e.g. "has persistent features to render",
"owns a panel to refresh", "consumes zoom controls") that modes opt into.

**Acceptance Scenarios**:

1. **Given** the pruned BaseMode, **Then** every remaining hook is overridden
   by at least one mode or documented as a required lifecycle point; deleted
   hooks have no callers.
2. **Given** FeatureRenderer and MainUI, **Then** they iterate modes by
   capability with no mode-name string or `any` cast; adding a fifth mode
   with persistent features requires no edits to either file.
3. **Given** PanMode, **Then** zoom actions go through the same public seam
   the API/keyboard use, not underscore-prefixed instance internals.

---

### User Story 5 - Shrunk instance surface & explicit initialization (Priority: P3)

The GramFrame instance stops being a ~54-field god object accessed 371×
across 21 files (GF-05): related fields group into cohesive sub-objects
(ui, viewport, interaction, persistence) exposed through deliberate
accessors, ratcheting `instance.state`/field reach-ins down; the constructor's
order-sensitive 10-call initialization (GF-13) becomes explicit —
each step returns what it built and declares what it needs, with the
double-nulling between setup modules removed. The public API surface gains
direct Playwright coverage (GF-30 residual): specs exercise
`GramFrame.addStateListener` / `detectAndReplaceConfigTables` / expand-state
methods as a consumer would, reducing reliance on `__test__` hooks.

**Acceptance Scenarios**:

1. **Given** the grouping refactor, **Then** a committed ratchet tracks the
   `instance.state` reach-in count (371 baseline) and the constructor field
   count (~54 baseline), both monotonically decreasing.
2. **Given** initialization, **Then** reordering two steps produces a
   compile-time or immediate explicit error, not a silent undefined at
   runtime.
3. **Given** the API specs, **Then** every documented public method has at
   least one behavioural (not typeof) assertion.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `strictNullChecks`, `noImplicitAny`, and
  `strictPropertyInitialization` MUST end the phase enabled, with CI-enforced
  non-increasing error ceilings at every intermediate step.
- **FR-002**: No import cycle may include both `core/state.js` and any
  `modes/` module; mode initial state MUST be contributed via registration.
- **FR-003**: Listener registration/removal MUST operate on a single registry
  through the Phase 2 dispatcher.
- **FR-004**: No module outside `components/` may exceed one responsibility
  from the table.js split list; axes rendering MUST live under `rendering/`.
- **FR-005**: `BaseMode` MUST contain only hooks with at least one real
  implementation or a documented lifecycle contract.
- **FR-006**: Cross-module collaboration MUST use capability interfaces;
  mode-name reach-ins and `any` casts to modes MUST be eliminated.
- **FR-007**: Zoom operations MUST flow through one shared seam for all
  callers (wheel, keyboard, pan mode, public API).
- **FR-008**: Instance-surface and reach-in counts MUST be ratcheted and
  monotonically reduced across the phase.
- **FR-009**: Initialization dependencies MUST be explicit (returned values /
  parameters), with no step relying on a field another step nulls and
  re-creates.
- **FR-010**: Public API methods MUST have behavioural Playwright coverage.
- **FR-011**: Every PR in this phase MUST keep the full suite green and MUST
  NOT raise any hygiene baseline; no long-lived integration branch.

## Success Criteria *(mandatory)*

- **SC-001**: `tsconfig.json` reads `strict: true` with zero strict-family
  disables, and `yarn typecheck` passes.
- **SC-002**: madge circular-dependency count ≤ 1 (from 11), with any residue
  documented and justified in the hygiene baseline file.
- **SC-003**: Adding a hypothetical fifth mode (spike PR acceptable as
  evidence) touches only `modes/` and the factory registration — not
  `state.js`, `MainUI`, or `FeatureRenderer`.
- **SC-004**: No source module exceeds ~350 lines except by documented
  exception; `table.js` is scaffold-only.
- **SC-005**: `instance.state` reach-ins reduced ≥ 50% from the 371 baseline;
  constructor fields reduced ≥ 40% from ~54.
- **SC-006**: All documented public API methods behaviourally tested; the
  `__test__` hooks are no longer the only interaction route for zoom/expand
  in specs.

## Assumptions

- Order within the phase: Story 1 (flag ceilings) starts first and runs
  continuously in the background of the others; Story 2 precedes Story 4
  (capability seams build on the registration seam); Story 3 is independent
  after Phase 2's zoom/notification work.
- ADR updates accompany the work: the state/mode registration seam,
  capability interfaces, and the table.js split each get a short ADR (the
  numbering gap at ADR-014 may be used, per the GF-43 note).
- The ~350-line module guideline (SC-004) is a review heuristic, not a hard
  gate; the hygiene ratchet does not enforce it.
- `strictPropertyInitialization` may be satisfied via definite-assignment
  annotations where construction is legitimately deferred (documented per
  site), rather than restructuring initialization beyond FR-009.
- If capability interfaces require touching persisted state shape, changes
  remain additive and schema-versioned per the storage layer's existing
  design; no migration of stored annotations is expected in this phase.
