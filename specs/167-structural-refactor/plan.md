# Implementation Plan: Phase 3 — Structural Refactor & Strict Type Gate

**Branch**: `167-structural-refactor` | **Date**: 2026-07-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/167-structural-refactor/spec.md`

## Summary

Five structural changes, each landing as a sequence of small PRs that keep the
suite green and ratchet a measured number monotonically down:

1. **Strict type gate restored** — `noImplicitAny` then `strictNullChecks`
   (+ `strictPropertyInitialization`, which rides along for free) burned down
   from a measured **540** errors to zero behind a committed overlay tsconfig
   and a CI-enforced ceiling, then folded into `tsconfig.json` permanently.
2. **State ⇄ modes decoupled** — `core/state.js` stops importing the four mode
   classes; mode initial-state slices arrive through the factory registration
   seam. 10 of the 11 madge cycles dissolve. The global/per-instance listener
   double-registry collapses to one.
3. **`table.js` split** — 713 lines and six responsibilities become a
   135-line scaffold plus `rendering/axes.js`, `components/spectrogramImage.js`,
   `components/svgLayout.js`, and zoom/visible-range math merged into
   `core/viewport.js`. The 11th cycle (ExpandToggle ⇄ table) dissolves.
4. **Narrow mode contract, capability seams** — `BaseMode` sheds the hooks with
   zero overrides; `FeatureRenderer`, `MainUI` and `PanMode` stop reaching into
   named modes, `any`-casts and underscore-prefixed instance internals.
5. **Shrunk instance surface & explicit initialization** — 56 constructor
   fields and 243 `instance.state` reach-ins ratcheted down behind cohesive
   sub-objects; the 10-call order-sensitive constructor becomes explicit; the
   public API gains behavioural Playwright coverage.

The ordering is load-bearing. Story 1's ceiling is established **first** and
burns down continuously in the background, so every module moved by Stories
2–5 is re-checked under real strictness as it moves. Story 2 precedes Story 4
because capability interfaces are declared at the registration seam Story 2
creates. Story 3 is independent. Story 5 is last because it is the only story
whose ratchet target depends on all the others having landed.

## Technical Context

**Language/Version**: JavaScript ES2020+, JSDoc-typed, no TypeScript compilation
**Primary Dependencies**: None at runtime (zero runtime deps); Vite 5 for build
**Storage**: Unchanged — Web Storage (`localStorage` trainer / `sessionStorage` student). No persisted-shape change in this phase.
**Testing**: Playwright 1.54 (e2e, `yarn test`); Vitest 4 (pure-JS unit lane, `yarn test:unit`); `yarn hygiene` ratchets; `yarn lint`
**Target Platform**: Modern evergreen browsers; WebKit smoke lane
**Project Type**: Single-project browser component (library, global + module export)
**Performance Goals**: Unchanged from Phase 2 — no new work on hot paths; the phase must not regress the frame-bounded notification cadence
**Constraints**: No behaviour change visible to end users; no new runtime dependencies; every PR keeps `yarn typecheck`/`yarn test`/`yarn build` green and raises no hygiene baseline; no long-lived integration branch
**Scale/Scope**: 540 strict errors across 32 files; 11 madge cycles → ≤1; `table.js` 713 lines → 5 modules; 20 `BaseMode` hooks → ~14; 56 instance fields; 243 `instance.state` reach-ins across 22 files

**No NEEDS CLARIFICATION items remain.** Three questions the spec left implicit
are resolved in [research.md](./research.md): the per-flag ceiling mechanism
(§R1, where a TypeScript constraint forces a change to the spec's stated
approach), the mode-registration seam shape (§R3), and the re-baselining of
Story 5's counters against post-Phase-2 reality (§R7).

### Measurements taken for this plan

All figures below are measured at `7115a8a` (post-Phase-2 `main`), not carried
over from the audit. Full detail in [baseline.md](./baseline.md).

| Quantity | Spec/audit says | Measured now | Used as |
|---|---|---|---|
| Strict-flag errors (all three on) | not stated | **540** | Story 1 ceiling |
| — `noImplicitAny` alone | not stated | 143 | sub-count |
| — `strictNullChecks` alone | not stated | 401 | sub-count |
| — `strictPropertyInitialization` | "a flag to burn down" | **0 additional** | rides with `strictNullChecks` |
| madge cycles | 11 | **11** | Stories 2–3 |
| `table.js` lines | 716 | **713** | Story 3 |
| `BaseMode` hooks with zero overrides | `renderCursor`, `getStateSnapshot` | **confirmed both** | Story 4 |
| `instance.state` reach-ins | 371 / 21 files | **243 / 22 files** | Story 5 (re-baselined) |
| Constructor fields | ~54 | **56** | Story 5 |

Two of these change the plan materially and are called out here rather than
buried: `strictPropertyInitialization` is **not** an independent burn-down
(§R1), and the `instance.state` count is **243, not 371** — Phase 2's drag and
coordinate consolidation already removed 128 reach-ins (§R7).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| **I. SVG-First Rendering** | ✅ Pass | Nothing moves to Canvas or absolutely-positioned DOM. Story 3 moves the axes engine into `rendering/axes.js` — still SVG, still DOM-queryable, and it puts the axis code beside `cursors.js`/`symbols.js` where the principle's rendering family already lives. Principle I names `src/utils/coordinates.js` as the coordinate system; Story 3 does not touch it (Phase 2 already consolidated there), and the zoom/visible-range math merged into `core/viewport.js` consumes it rather than duplicating it. |
| **II. Test-First (NON-NEGOTIABLE)** | ✅ Pass, strengthened | Story 5 adds the behavioural Playwright coverage of the public API that GF-30's residual calls for (FR-010), reducing `__test__`-hook reliance. Stories 2–4 are move-and-rewire refactors whose gate is the existing suite passing unchanged — the constitution's "tests must pass before merging" is the phase's core safety argument (FR-011). |
| **III. Modular Mode Architecture** | ✅ Pass, materially strengthened | This is the principle the phase most directly serves. "Adding a new mode MUST NOT require modifications to existing modes" is today violated in spirit by `state.js` importing all four modes and by `FeatureRenderer`/`MainUI` naming them; SC-003 makes the fifth-mode test explicit. `ModeFactory` remains and *gains* responsibility as the single registration point (FR-002). Cross-mode concerns stay in `FeatureRenderer` — it just stops naming the modes it coordinates (FR-006). |
| **IV. Declarative HTML Configuration** | ✅ Pass | Untouched. `setupComponentTable`/`replaceConfigTable` keep the `table.js` name through the Story 3 split precisely so the `gram-config` contract stays where readers expect it. |
| **Technical Constraints** | ⚠️ Tension — resolved | "State management: Centralized in `src/core/state.js` with listener pattern" — Story 2 keeps state centralized there and keeps the listener pattern; what moves out is the *import of mode classes*, so `state.js` composes slices handed to it instead of reaching for them. The deep-copy-before-listeners contract is unchanged (Phase 2's dispatcher owns it). HMR listener preservation is re-tested after the listener-registry unification (AS-2.3 names it explicitly). |
| **Quality Gates** | ✅ Pass, strengthened | `yarn typecheck`, `yarn test`, `yarn build` gate every PR, plus `yarn hygiene`, `yarn lint`, `yarn test:unit`. Story 1 makes gate 1 mean what it claims: today `yarn typecheck` passes with three strict flags off. |

**Gate result: PASS.** One tension (Technical Constraints' "centralized in
`state.js`") is resolved by preserving centralization and removing only the
inverted dependency — no constitutional amendment needed, no entry required in
Complexity Tracking.

**Post-Phase-1 re-check: still PASS.** The Phase 1 design adds four modules
(`rendering/axes.js`, `components/spectrogramImage.js`,
`components/svgLayout.js`, `modes/capabilities.js`) and one committed config
overlay (`tsconfig.strict.json`, deleted at the end of Story 1); it deletes no
principle-bearing code. Module count rises by four while the largest module
falls from 713 to ~310 lines — the trade SC-004 asks for.

## Project Structure

### Documentation (this feature)

```text
specs/167-structural-refactor/
├── plan.md              # This file
├── baseline.md          # Measured starting numbers (all ratchet sources)
├── research.md          # Phase 0 — decisions R1..R9
├── data-model.md        # Phase 1 — structural entities; no persisted-shape change
├── quickstart.md        # Phase 1 — how to run/verify each story
├── contracts/
│   ├── strict-ratchet.md      # tsconfig.strict.json + hygiene ceiling contract
│   ├── mode-registration.md   # How a mode contributes initial state
│   ├── capabilities.md        # Capability interfaces modes opt into
│   └── axes.md                # rendering/axes.js public interface
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── core/
│   ├── state.js                 # − imports of the 4 mode classes (Story 2)
│   │                            # − globalStateListeners copy-out (Story 2)
│   ├── viewport.js              # + applyZoomTransform, calculateVisibleDataRange
│   │                            #   from table.js — one zoom seam (Story 3, FR-007)
│   ├── FeatureRenderer.js       # named modes → capability iteration (Story 4)
│   └── initialization/
│       ├── DOMSetup.js          # steps return what they built (Story 5)
│       ├── UISetup.js           #   "
│       ├── EventBindings.js     # − global-listener copy loop (Story 2)
│       └── ModeInitialization.js#   "
├── modes/
│   ├── BaseMode.js              # − renderCursor, − getStateSnapshot (Story 4)
│   ├── ModeFactory.js           # + getModeInitialStates(), + capability roster
│   ├── capabilities.js          # NEW — capability predicates & typedefs
│   └── pan/PanMode.js           # instance._zoomIn/_zoomOut → viewport seam
├── components/
│   ├── table.js                 # scaffold + config-table replacement ONLY (~135)
│   ├── spectrogramImage.js      # NEW — setupSpectrogramImage, getRenderDimensions
│   ├── svgLayout.js             # NEW — updateSVGLayout
│   ├── MainUI.js                # − 2 any-casts to named modes (Story 4)
│   └── ExpandToggle.js          # imports layout/axes, not table.js — cycle gone
├── rendering/
│   └── axes.js                  # NEW — renderAxes + 8 private helpers (~310)
├── main.js                      # 56 fields → cohesive sub-objects (Story 5)
└── types.js                     # − _zoomIn/_zoomOut/_setZoom/_zoomReset typedefs

tests/
├── public-api.spec.js           # NEW — behavioural coverage (Story 5, FR-010)
├── mode-registration.spec.js    # NEW — fifth-mode spike evidence (SC-003)
└── unit/
    └── mode-registration.test.js# NEW — mode loads without importing state.js

tsconfig.strict.json             # NEW, TEMPORARY — deleted when Story 1 hits 0
hygiene-baseline.json            # + strictTypeErrors, instanceStateReachIns,
                                 #   instanceFields
scripts/hygiene.js               # + three new ratchets
```

**Structure Decision**: Single-project layout, unchanged. The phase adds one
directory member (`src/modes/capabilities.js`) and populates the long-claimed
`src/rendering/axes.js` that CLAUDE.md has documented and GF-38 flagged as
phantom. No new top-level directories.

## Sequencing & PR Breakdown

Each row is one PR with its own green gate. Story 1's rows interleave with the
others in wall-clock time — the ceiling is established in PR 1 and every
subsequent PR lowers it as a side effect of touching strict-unclean files.

| # | Story | Content | Gate |
|---|---|---|---|
| 1 | S1 | `tsconfig.strict.json` overlay + `strictTypeErrors: 540` ratchet in `hygiene.js`; no source change | `yarn hygiene` reports 540/540; CI fails a deliberate +1 |
| 2 | S1 | `noImplicitAny` burn-down: the 46 `TS7008` member declarations in `main.js` + `TS7006`/`TS7053` params | Ceiling lowered in the same PR (AS-1.2) |
| 3 | S1 | `strictNullChecks` burn-down, tranche A: `core/` (`state.js` 21, `viewport.js` 28, `events.js` 15, `FeatureRenderer.js` 16, `UISetup.js` 20, `FocusManager.js` 6) | Ceiling lowered |
| 4 | S2 | `ModeFactory.getModeInitialStates()`; `createInitialState(modeStates)` takes slices; `state.js` drops the four mode imports | madge: no cycle contains `state.js` + a `modes/` file; baseline lowered 11 → ~1 (AS-2.1) |
| 5 | S2 | Listener registry unification: instances stop copying `globalStateListeners`; delivery walks one union; HMR re-registration re-tested | AS-2.3 — add-then-remove touches one registry, no duplicate delivery |
| 6 | S3 | Extract `rendering/axes.js` (renderAxes + 8 helpers) — pure move | Suite unchanged; reviewed as a move (AS-3.1, AS-3.2) |
| 7 | S3 | Extract `spectrogramImage.js` + `svgLayout.js`; `ExpandToggle` rewired | ExpandToggle⇄table cycle gone, no new cycle (AS-3.3) |
| 8 | S3 | Merge `applyZoomTransform` + `calculateVisibleDataRange` into `core/viewport.js`; `table.js` is scaffold-only | One zoom home for wheel/keyboard/API (AS-3.4, FR-007) |
| 9 | S1 | `strictNullChecks` burn-down, tranche B: `components/` + the now-split `table.js` family (65 errors, re-attributed across PRs 6–8) | Ceiling lowered |
| 10 | S4 | Delete `renderCursor` and `getStateSnapshot` from `BaseMode`; audit every remaining hook against §R6's table | AS-4.1 — no deleted hook has a caller |
| 11 | S4 | `modes/capabilities.js`; `FeatureRenderer` iterates by capability; `MainUI`'s two `any`-casts removed | AS-4.2 — no mode-name string, no `any` cast |
| 12 | S4 | PanMode uses the `core/viewport.js` seam; `_zoomIn/_zoomOut/_zoomReset/_setZoom` typedefs removed from `types.js` | AS-4.3, FR-007 |
| 13 | S1 | `strictNullChecks` burn-down, tranche C: `modes/` (143 errors across the four modes + `BaseMode` + `BaseDragHandler`) | Ceiling lowered |
| 14 | S1 | Final burn-down; flip all three flags in `tsconfig.json`; delete `tsconfig.strict.json` and the ratchet entry; annotate ADR-007 | **SC-001** — `strict: true`, zero disables, `yarn typecheck` green |
| 15 | S5 | `instanceStateReachIns: 243` + `instanceFields: 56` ratchets; no source change | Ratchets live before the refactor that moves them (AS-5.1) |
| 16 | S5 | Group DOM handles into `instance.ui`; accessors; reach-ins ratcheted down | Ratchet lowered; suite green |
| 17 | S5 | Group `viewport` / `interaction` / `persistence` fields; explicit initialization — each step returns what it built, double-nulling removed | AS-5.2 — reordering two steps errors explicitly, not silently |
| 18 | S5 | `tests/public-api.spec.js`: behavioural assertions for `addStateListener`, `removeStateListener`, `detectAndReplaceConfigTables`, `init`, `getExpandState`, `setExpandState` | **SC-006** — every documented method has a non-`typeof` assertion |
| 19 | S3/S4 | Fifth-mode spike as SC-003 evidence + the three ADRs (§R9) | SC-003 — spike touches only `modes/` + factory registration |

**Hard dependencies**

- PR 1 before PRs 2–3, 9, 13, 14 (the ceiling must exist before it can fall).
- PR 4 before PRs 10–12: capability interfaces are declared at the registration
  seam PR 4 creates, and the fifth-mode test (SC-003) is meaningless while
  `state.js` still imports the mode roster.
- PRs 6–8 in that order: `table.js`'s remaining importers are rewired
  incrementally, so the scaffold is the last thing to shrink.
- PR 15 before PRs 16–17 (same reason as PR 1).
- PR 14 should land **after** PRs 6–8 and 10–12 where practical, so moved code
  is written strict-clean once rather than fixed twice. It is sequenced last in
  Story 1 for exactly this reason.

## Scope observations

Two items in the spec's Success Criteria are not fully reachable from the
spec's own stories. Both are surfaced here rather than silently reinterpreted;
neither blocks the phase.

- **SC-004** ("no source module exceeds ~350 lines except by documented
  exception") — Story 3 fixes `table.js`, and Story 5 shrinks `main.js`. That
  leaves seven modules over 350 lines that no story in this spec touches:
  `HarmonicsMode.js` (1016), `DopplerMode.js` (657), `types.js` (617),
  `AnalysisMode.js` (612), `keyboardControl.js` (561), `GramFrameAPI.js` (413),
  `events.js` (395). The spec itself calls SC-004 "a review heuristic, not a
  hard gate" (Assumptions), so the plan treats it as: **table.js and main.js
  are brought under the line; the remaining seven are recorded as documented
  exceptions** in the hygiene baseline file, with the three mode files noted as
  candidates for a later phase. `types.js` is a declaration file and is
  exempted on its face.
- **SC-005** ("reduce `instance.state` reach-ins ≥ 50% from the 371 baseline")
  — the 371 figure predates Phase 2; the count today is 243. §R7 resolves this
  in favour of the spec's *endpoint* (≤ 185) rather than its *percentage*,
  which would demand a further 50% cut from an already-halved number.

## Risks

| Risk | Mitigation |
|---|---|
| A 540-error burn-down stalls half-done and the overlay lives forever | The ceiling is a ratchet, not a deadline: it can only fall, so a stalled burn-down is visible and harmless. PR 14 is gated on zero, and PRs 6–13 lower the count as a side effect of code they already touch. |
| Strict fixes silently change runtime behaviour (a `?.` where a throw was intended) | Every burn-down PR is reviewed against the rule in §R2: null-guards preserve existing behaviour, and any site where the correct fix is a *behaviour* change is split into its own PR with a test. |
| Removing the mode imports from `state.js` breaks initial-state composition order | `createInitialState` keeps its merge order (analysis, harmonics, doppler, pan) explicitly in `ModeFactory`; a unit test in the Vitest lane pins the composed shape against a frozen snapshot before PR 4 changes anything. |
| Listener-registry unification drops HMR-preserved listeners | AS-2.3 names HMR explicitly; `main.js:663-666` is the one HMR re-registration site and gets a dedicated assertion in `tests/state-listener.spec.js`. |
| The `table.js` split changes behaviour under the guise of a move | PRs 6–8 are reviewed as pure moves (AS-3.1): the diff must be import-rewiring plus relocation, with `git diff -M` showing the rename. Any behaviour change is a separate PR. |
| Capability interfaces become a second, weaker naming scheme | §R6 fixes the roster at three capabilities and requires each to be exercised by the fifth-mode spike (SC-003) before it is considered real. |
| Grouping instance fields breaks the `__test__` hooks and the debug page | Story 5's PRs land after Story 1's typing work on `main.js`, so `tsc` catches every renamed reach-in; the debug page is in the suite. |

## Complexity Tracking

> No Constitution Check violations require justification. The single tension
> (Technical Constraints' "state centralized in `src/core/state.js`") is
> resolved by keeping state centralized there and removing only the inverted
> import direction — an exception is not needed.
