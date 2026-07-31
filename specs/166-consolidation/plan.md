# Implementation Plan: Phase 2 — Consolidating the Interest-Accruing Seams

**Branch**: `166-consolidation` | **Date**: 2026-07-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/166-consolidation/spec.md`

## Summary

Five consolidations of duplicated machinery, each landing behind a
behaviour-pinning test written **before** the duplicates are deleted:

1. **Deterministic tests** — replace the 244 `waitForTimeout` calls with
   state-based waits (page object and helpers first, then the four heaviest
   specs), restore arrow-key movement coverage, drop CI `retries` to 0.
2. **One coordinate pipeline** — collapse four parallel implementations onto a
   single canonical module, pinned first by Vitest equivalence tests recorded
   against all four live paths.
3. **One drag engine** — port the five hand-rolled drag machines onto
   `BaseDragHandler`, and replace the three drag-state mirrors with one
   read-only projection.
4. **Batched notifications** — route all 41 `notifyStateListeners` call sites
   through a single dispatcher with microtask batching and frame-cadence
   throttling for pointer/wheel paths; clone once per dispatch, only when
   listeners exist.
5. **One diffing table** — extract the row-diffing engine shared by the
   markers table and the harmonics panel.

The ordering is load-bearing, not cosmetic. Story 1 is a hard prerequisite for
Stories 2–4: their entire safety argument is "the suite still passes", and
Story 4 in particular changes *when* the debug page's state display updates —
which is how `GramFramePage.getState()` reads state in every existing spec.

## Technical Context

**Language/Version**: JavaScript ES2020+, JSDoc-typed, no TypeScript compilation
**Primary Dependencies**: None at runtime (zero runtime deps); Vite 5 for build
**Storage**: Unchanged — Web Storage (`localStorage` trainer / `sessionStorage` student)
**Testing**: Playwright 1.54 (e2e, `yarn test`); Vitest 4 (pure-JS unit lane, `yarn test:unit`)
**Target Platform**: Modern evergreen browsers; WebKit smoke lane
**Project Type**: Single-project browser component (library, global + module export)
**Performance Goals**: Notifications bounded by animation-frame cadence under
continuous mousemove/wheel/drag input; at most one deep state clone per dispatch
**Constraints**: No behaviour change visible to end users; no new runtime
dependencies; net-negative lines of code across the phase; hygiene baselines
monotonically lowered (`circularDependencies` 11, `unusedExportModules` 5,
`waitForTimeoutOccurrences` 244 today)
**Scale/Scope**: ~14 source modules touched; 4 coordinate implementations → 1;
5 drag machines → 1; 41 notify sites → 1 dispatcher; 2 table engines → 1;
~24 spec files affected by the wait migration

No NEEDS CLARIFICATION items remain — the one open question the spec deferred to
plan stage (whether to keep the deprecated drag-state mirror fields for a
release) is resolved in [research.md](./research.md) §R4.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| **I. SVG-First Rendering** | ⚠️ Tension — resolved | Principle I names `src/utils/coordinates.js` as *the* coordinate system. The spec's stated consolidation target is `coordinateTransformations.js`. Resolved by consolidating **into `src/utils/coordinates.js`** (constitutionally-named path) while adopting the *implementation* from `coordinateTransformations.js`, which is the more complete one. No constitutional amendment needed. See research.md §R1. Nothing moves to Canvas or absolutely-positioned DOM; SVG stays DOM-queryable. |
| **II. Test-First (NON-NEGOTIABLE)** | ✅ Pass | FR-001 is strictly stronger than the principle: every consolidation lands behind a passing pin-test first. The constitution's "unit tests alone cannot catch coordinate regressions" is respected — the Vitest equivalence grid is the *pin*, and the Playwright arrow-key spec plus the full suite are the *gate*. `yarn typecheck` and `yarn test` gate every PR in the phase. |
| **III. Modular Mode Architecture** | ✅ Pass, strengthened | Story 3 removes per-mode drag machinery in favour of the shared `BaseDragHandler`, so a new mode gains drag without touching existing modes (FR-004, AS-3.3). No new mode-to-mode dependencies; `ModeFactory` stays the single entry point. |
| **IV. Declarative HTML Configuration** | ✅ Pass | Untouched. No change to `gram-config` parsing or auto-discovery. |
| **Technical Constraints** | ⚠️ Tension — justified | "State MUST be deep-copied before passing to listeners" is preserved (the clone still happens; it happens *once per dispatch* rather than once per call site, and is skipped when no listener is registered — an unobservable optimisation). HMR listener preservation is explicitly re-tested after the dispatcher change. |
| **Quality Gates** | ✅ Pass | `yarn typecheck`, `yarn test`, `yarn build` gate every PR; `yarn hygiene` and `yarn test:unit` additionally run. |

**Gate result: PASS.** One naming tension (Principle I vs. the spec's assumed
target module) is resolved in favour of the constitution. No violation requires
justification in Complexity Tracking.

**Post-Phase-1 re-check**: still PASS. The Phase 1 design introduces three new
modules (`coordinates.js` absorbing the canonical transforms, a drag-target
abstraction inside the existing `BaseDragHandler`, and `DiffingTable.js`) and
deletes four; the net module count falls and no principle is weakened.

## Project Structure

### Documentation (this feature)

```text
specs/166-consolidation/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions R1..R7
├── data-model.md        # Phase 1 — state-shape changes (drag projection)
├── quickstart.md        # Phase 1 — how to run/verify each story
├── contracts/
│   ├── coordinates.md   # Canonical coordinate module contract
│   ├── drag-engine.md   # BaseDragHandler contract
│   ├── notifications.md # Dispatcher / batching contract
│   └── diffing-table.md # Shared table component contract
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── core/
│   ├── state.js                 # + single dispatch choke-point (Story 4)
│   ├── events.js                # − inline screenToDataWithZoom (Story 2)
│   │                            # − _wheelPan machine (Story 3)
│   ├── keyboardControl.js       # − private dataToSVG/svgToData (Story 2)
│   ├── viewport.js              # notify → dispatcher (Story 4)
│   └── storage.js               # save gated on annotation-relevant change (Story 4)
├── utils/
│   ├── coordinates.js           # CANONICAL coordinate module (Story 2)
│   └── coordinateTransformations.js   # DELETED, implementation absorbed
├── modes/
│   ├── shared/BaseDragHandler.js      # + create/pan drag kinds (Story 3)
│   ├── pan/PanMode.js                 # − hand-rolled drag
│   ├── harmonics/HarmonicsMode.js     # − creation drag machine
│   ├── doppler/DopplerMode.js         # − placement drag machine
│   └── analysis/AnalysisMode.js       # − markers-table engine (Story 5)
├── components/
│   ├── DiffingTable.js          # NEW shared row-diffing table (Story 5)
│   └── HarmonicPanel.js         # − its copy of the table engine
└── types.js                     # drag mirrors → one projection (Story 3)

tests/
├── helpers/
│   ├── gram-frame-page.js       # state-based waits (Story 1)
│   ├── interaction-helpers.js   # 15 waitForTimeout → 0
│   └── mode-helpers.js          # 7 waitForTimeout → 0
├── unit/
│   ├── coordinate-equivalence.test.js   # NEW pin grid (Story 2)
│   └── notification-batching.test.js    # NEW (Story 4)
├── keyboard-movement.spec.js    # NEW, replaces the two .disabled specs
└── keyboard-focus*.spec.js.disabled     # DELETED
```

**Structure Decision**: Single-project layout, unchanged. This feature adds no
directories; it moves code between existing ones and deletes more than it adds
(SC-006).

## Sequencing & PR Breakdown

Each row is one PR with its own green gate. FR-001 means the pin-test row always
precedes the deletion row it protects.

| # | Story | Content | Gate |
|---|---|---|---|
| 1 | S1 | Page object + `interaction-helpers` + `mode-helpers` → state-based waits (22 sites) | Suite 5× green, retries 0 locally |
| 2 | S1 | Four heaviest specs (reformat 43, storage 30, pin-toggle 19, pin-sampling 16) | ratchet lowered to ≤ 136 |
| 3 | S1 | Remaining specs to ≤ 20 justified residue; `retries: 0` in CI; delete `.disabled` specs; new `keyboard-movement.spec.js` asserting data-coordinate deltas | SC-001, SC-005, FR-008 |
| 4 | S2 | Vitest equivalence grid against **all four live paths** (no source change) | Grid green ⇒ pin is faithful (AS-2.1) |
| 5 | S2 | Canonical `coordinates.js`; delete the three duplicates; rewire callers | Grid + keyboard spec + full suite; baselines lowered |
| 6 | S3 | `BaseDragHandler` gains create/pan drag kinds; port Harmonics creation + Doppler placement | Existing mode specs unchanged |
| 7 | S3 | Port PanMode drag and the `_wheelPan` machine; collapse drag mirrors to one projection; update `types.js` + data guide | FR-004, FR-010 |
| 8 | S4 | Single dispatcher + microtask batching; unexport direct notify from modes | Counting-listener spec: one mode switch → one notify |
| 9 | S4 | Frame-cadence throttling on mousemove/wheel/drag; storage listener gated on annotation-relevant change | SC-004 |
| 10 | S5 | Extract `DiffingTable.js`; adopt in markers table and harmonics panel | Existing table specs unchanged |

**Hard dependency**: PRs 8–9 must not land before PR 3. `GramFramePage.getState()`
reads the debug page's state display, which is written by a state listener — the
moment notification becomes asynchronous, every `waitForTimeout`-based read of
that display becomes a race. Story 1 is what makes Story 4 safe to attempt.

## Risks

| Risk | Mitigation |
|---|---|
| The coordinate pin grid reveals the four paths already diverge | Spec's own escape hatch: majority behaviour wins, divergence is triaged as a bug in its own issue before PR 5 proceeds (AS-2.1) |
| Throttling breaks specs that read state immediately after an action | Sequencing (PR 3 before PR 8); dispatcher exposes a synchronous flush used at teardown; DOM rendering stays synchronous — only *listener notification* is batched |
| Removing drag mirrors breaks in-repo readers | Four known readers, all in `tests/` (`doppler-mode.spec.js` ×2, `mode-integration.spec.js` ×2, `state-hygiene.spec.js` key list) — migrated in PR 7 |
| Madge cycle count rises when modules merge | `yarn hygiene` fails on any rise; AS-2.3 requires it not increase |

## Complexity Tracking

> No Constitution Check violations require justification. The single tension
> (Principle I's named coordinate module vs. the spec's assumed target) is
> resolved by adopting the constitution's path name, not by an exception.
