# Phase 0 Research — Structural Refactor & Strict Type Gate

Decisions taken before design, each with the alternatives that were rejected.
Measurements referenced here live in [baseline.md](./baseline.md).

---

## R1 — `strictPropertyInitialization` is not an independent burn-down

**Decision**: Treat the three flags as **two** burn-downs, not three.
`noImplicitAny` (143 errors) and `strictNullChecks` (401) are burned down
separately; `strictPropertyInitialization` is enabled in the same commit as
`strictNullChecks` and contributes no errors of its own.

**Rationale**: TypeScript refuses the combination the spec assumes.
Setting `strictPropertyInitialization: true` without `strictNullChecks: true`
produces `TS5052: Option 'strictPropertyInitialization' cannot be specified
without specifying option 'strictNullChecks'` — a configuration error, not a
type error. An early probe that appeared to show "2 errors" for the flag was
counting exactly those two `TS5052` lines. With `strictNullChecks` on, adding
`strictPropertyInitialization` changes the count not at all: 401 → 401.

The reason is visible in the code: `main.js` declares its 56 fields bare
(`container;` with a JSDoc comment above), and a JS class field with no
initializer and no type annotation is not a property `strictPropertyInitialization`
can complain about — it is an *implicit any* member, which is
`noImplicitAny`'s 46 `TS7008` errors. Fixing those with `@type` annotations is
what would create `strictPropertyInitialization` work, and the spec's own
Assumptions already permit definite-assignment annotations at those sites.

**Impact on the spec**: AS-1.1 ("for each disabled flag, record the current
error count under that flag as a ceiling") cannot be satisfied literally for
the third flag. FR-001's substance — all three enabled at the end, with
CI-enforced non-increasing ceilings at every intermediate step — is satisfied
in full by §R3's single-ceiling mechanism.

**Alternatives rejected**:
- *Three separate ceilings, one per flag* — impossible for the third flag, and
  for the other two it creates a re-baselining problem: enabling `noImplicitAny`
  permanently changes the `strictNullChecks` count (401 → 397), so a per-flag
  ceiling would have to be re-measured mid-phase, and a re-measurement that
  moves a ratchet is exactly the thing a ratchet exists to prevent.
- *Enable `strictNullChecks` first, `noImplicitAny` second* — legal, but wastes
  work: null-checking code whose types are still implicitly `any` produces
  errors that change once real types arrive. Fixing 143 implicit-any errors
  first leaves 397 rather than 401 null errors — a small win, and a larger one
  in avoided rework.

---

## R2 — Burn-down rule: null-guards preserve behaviour; behaviour changes are separate PRs

**Decision**: A strict-fix PR may only add type annotations, null guards that
preserve the current runtime path, and non-null assertions where the invariant
is genuinely established. Any site where the honest fix would *change*
behaviour — a missing early return, a swallowed undefined that should throw —
is split out into its own PR with a test, and the strict error is left standing
until then.

**Rationale**: 314 of the 540 errors (58%) are `possibly undefined`/`possibly
null` on DOM and state access. Each is a fork: the guard that silences the
compiler (`if (!x) return`) may or may not be what the code should do. Bundling
those judgements into a 50-file burn-down PR is how a refactor phase ships a
regression under cover of "type-only changes". Keeping them separable is what
lets PRs 2, 3, 9 and 13 be reviewed quickly and honestly.

The concrete tell that this matters: `TS2783` (20 errors) reports
`src/core/state.js:38-39` setting `version` and `timestamp` and then spreading
`buildModeInitialState()` over them. That is a latent bug — a mode returning a
`version` key would silently win — and it deserves a fix and a test, not a
cast.

**Alternatives rejected**:
- *`// @ts-expect-error` sweep to reach zero fast* — reaches SC-001's letter
  while destroying its point, and leaves comments that must later be found and
  removed.
- *`any`-cast at each error site* — same objection, and it would fight
  `noImplicitAny` on the way back.

---

## R3 — The ceiling mechanism: one committed overlay tsconfig, one ratchet number

**Decision**: Add `tsconfig.strict.json` at the repo root — a temporary,
committed file that extends `tsconfig.json` and turns the three flags on — plus
a `strictTypeErrors: 540` entry in `hygiene-baseline.json` that
`scripts/hygiene.js` enforces by running `tsc -p tsconfig.strict.json` and
counting `error TS` lines. Both are deleted in PR 14 when the count reaches
zero and the flags move into `tsconfig.json` proper.

**Rationale**: It reuses the ratchet machinery spec 164 already built and the
team already reads. `yarn hygiene` fails on a rise, prints the improvement
reminder on a fall, and the baseline file already carries the "these only ever
go down" comment. One number, measured under the end-state configuration, is
monotone by construction — which is precisely what the per-flag alternative in
§R1 could not offer.

The per-flag sub-counts (143 / 401) are still printed in the ratchet's detail
output, so the burn-down's shape stays visible without becoming a gate.

**Two implementation details worth pinning down**:

1. The probe tsconfig **must live at the repo root**. A tsconfig written to a
   temp directory cannot resolve `node_modules/@types` and silently reports ~46
   extra errors — an inflated ceiling that would then never be reachable. The
   hygiene script uses the committed root-level file, so this is structural
   rather than a caution.
2. `hygiene.js` must distinguish a *type* error from a *config* error. A
   `TS5052`/`TS6046` in the output means the overlay is malformed; the script
   should fail loudly rather than report a count, for the same reason it
   already errors when madge resolves fewer than 10 modules.

**Alternatives rejected**:
- *A separate `scripts/strict-ratchet.js`* — a second script with a second
  baseline file, for one number that the existing script is already shaped to
  hold.
- *Per-directory tsconfigs enabling strictness incrementally by folder* — finer
  control, but it fragments the build config and the phase's file-by-file
  tranches (PRs 3, 9, 13) already give directory-shaped increments without it.
- *`typescript-strict-plugin` or a `// @ts-strict` per-file pragma* — a new dev
  dependency and a second dialect of strictness for a burn-down expected to
  take one phase.

---

## R4 — Mode registration: the factory composes initial state, `state.js` receives it

**Decision**: `ModeFactory` gains `getModeInitialStates()`, returning the four
slices in a fixed order. `createInitialState()` takes them as an argument:

```js
// core/state.js — no mode imports
export function createInitialState(modeStates = {}) { … }

// modes/ModeFactory.js — already imports all four classes
static getModeInitialStates() {
  return Object.assign({},
    AnalysisMode.getInitialState(),
    HarmonicsMode.getInitialState(),
    DopplerMode.getInitialState(),
    PanMode.getInitialState())
}

// main.js — composes at the call site
this.state = createInitialState(ModeFactory.getModeInitialStates())
```

**Rationale**: It is the smallest cut that severs 10 of the 11 cycles.
`ModeFactory` already imports all four mode classes and is already the
constitution's "single entry point for mode instantiation" — extending it to be
the single entry point for mode *state* is the same idea, and requires no new
module. `state.js` keeps its role as the centralized state module (Technical
Constraints) and simply stops reaching downward for the roster.

The static-method shape (`static getInitialState()`) is untouched, so no mode
file changes in PR 4 — the whole cycle-cutting PR is three files.

`createInitialState()` keeping a default `{}` argument means the Vitest lane can
import `state.js` and build a core state without loading any mode — which is
AS-2.2's independent test, expressible as a unit test rather than an
integration one.

**Alternatives rejected**:
- *Side-effect registration* (`registerMode(AnalysisMode)` at module load) —
  makes the composed state depend on import order, which is exactly the
  load-order fragility GF-03 is about.
- *A new `modes/registry.js`* — a fifth module doing what `ModeFactory` already
  exists to do, and it would need the same four imports.
- *Modes push their slice during construction* — initial state must exist
  before the first mode is constructed (the modes read `instance.state`), so
  this inverts a real dependency.

---

## R5 — One listener registry: instances stop copying the global list

**Decision**: `globalStateListeners` remains the storage for API-registered
listeners. Instances stop copying it into `instance.stateListeners` at
construction (`EventBindings.js:46`) and stop splicing it on removal
(`GramFrameAPI.js:283-289`). Delivery in `deliverToListeners` walks the union of
`instance.stateListeners` (per-instance listeners only) and the global list,
de-duplicated. `addStateListener` writes to one place; `removeStateListener`
removes from one place.

**Rationale**: GF-06 is a *copying* bug, not a two-lists bug — the same callback
lives in N+1 arrays, so removal must find and splice N+1 times and any missed
instance leaks a live listener. Removing the copy step leaves two arrays with
genuinely different lifetimes (global: survives instance destruction; instance:
does not) and one write path into each. That satisfies AS-2.3's "exactly one
registry is touched" for any given call, without inventing a subscription
manager.

The immediate-call-with-current-state behaviour of `addStateListener`
(`GramFrameAPI.js:237-244`) is preserved — it is observable API behaviour and
`tests/state-listener.spec.js` asserts it.

**HMR**: `main.js:663-666` reads the global list, recreates instances, then
clears it. With the copy gone, the recreated instances pick up global listeners
through delivery rather than through a copy, so the clear-and-reregister dance
simplifies. AS-2.3 names HMR explicitly, so this gets its own assertion.

**Alternatives rejected**:
- *Collapse to a single global list, dropping per-instance listeners* — the
  per-instance list is what makes `flushDispatch(instance)` and Phase 2's
  no-listener fast path work; and multi-instance pages (Principle IV) need
  per-instance delivery.
- *A `Set` instead of arrays* — would give free de-duplication, but delivery
  order becomes insertion order across two sets and the existing specs assert
  ordering in places. Not worth coupling to this change.

---

## R6 — Three capability interfaces, duck-typed, exercised by the fifth-mode spike

**Decision**: Add `src/modes/capabilities.js` declaring three capabilities as
JSDoc typedefs plus a predicate each. A mode opts in by implementing the
methods; nothing registers, nothing inherits.

| Capability | Methods | Replaces |
|---|---|---|
| `PersistentFeatureProvider` | `hasPersistentFeatures(): boolean`, `renderPersistentFeatures(): void` | `FeatureRenderer.js:32-44` naming three modes and owning three `hasXFeatures()` predicates |
| `PanelOwner` | `refreshPanel(): void` | `MainUI.js:211,217` `any`-casting to `modes['analysis']` / `modes['harmonics']` |
| `ZoomConsumer` | — (consumes, does not implement) | `PanMode.js:219,225` calling `instance._zoomIn/_zoomOut` |

`FeatureRenderer.renderAllPersistentFeatures()` becomes:

```js
Object.values(this.instance.modes)
  .filter(isPersistentFeatureProvider)
  .filter(mode => mode.hasPersistentFeatures())
  .forEach(mode => mode.renderPersistentFeatures())
```

The three `hasXFeatures()` predicates move onto the modes that own the state
they inspect — which is where they always belonged; `FeatureRenderer` currently
reads `state.analysis.markers`, `state.harmonics.harmonicSets` and three
`state.doppler.*` fields directly, so removing them also deletes eight
`instance.state` reach-ins toward Story 5's ratchet.

**Rationale for duck typing over a class hierarchy or a declared roster**: the
project is JSDoc-typed JavaScript with no compilation step. A `capabilities`
array on each mode would be a second thing to keep in sync with the methods it
describes. `typeof mode.renderPersistentFeatures === 'function'` is checkable at
runtime, expressible as a JSDoc typedef for `tsc`, and impossible to get out of
sync with the implementation.

**On `ZoomConsumer`**: there is nothing for a mode to implement — the fix is
that PanMode imports `zoomIn`/`zoomOut` from `core/viewport.js` like every other
caller, rather than calling `instance._zoomIn()`. FR-007's "one shared seam" is
`core/viewport.js`, and `main.js`'s `_zoomIn`/`_zoomOut`/`_zoomReset`/`_setZoom`
become thin forwarders retained only for the public API's benefit — or are
removed outright if the API can call viewport directly. That decision is
deferred to PR 12, where the call graph is visible.

**One reach-in stays**: `viewport.js:162` reads `instance.modes.pan` to decide
whether to leave pan mode when zoom returns to 1×. That is a genuine
pan-specific policy, not a cross-cutting concern, and inventing a fourth
capability for one call site would be worse than the reach-in. It is recorded
as a documented exception to FR-006 rather than dressed up.

**Alternatives rejected**:
- *An abstract `PersistentFeatureMode` subclass* — forces single inheritance in
  a system where Doppler is plausibly both a feature provider and a panel owner.
- *A capability registry keyed by string* — reintroduces exactly the mode-name
  strings FR-006 exists to remove.

---

## R7 — Story 5's ratchets are re-baselined to measured reality

**Decision**: Baseline `instanceStateReachIns` at **243** (not the spec's 371)
and `instanceFields` at **56** (not ~54). Interpret SC-005 by its **endpoints**:
reach-ins ≤ **185**, constructor fields ≤ **33**.

**Rationale**: The 371 figure was measured at `edfc549`, before Phase 2. The
coordinate and drag consolidations removed 128 reach-ins as a by-product, so
the count today is 243 across 22 files. Two readings of SC-005 are available and
they differ by a lot:

- *"≥ 50% below 371"* → target ≤ 185. A further 24% cut from today. Achievable
  by the four sub-object groupings, and it delivers the absolute number the
  spec author wrote down.
- *"≥ 50% below whatever it is when the story starts"* → target ≤ 121. A 50%
  cut on top of a 34% cut already taken — a much larger job, and one the spec
  had no way of scoping since Phase 2 had not landed when it was written.

The first reading is adopted: the spec's number is the commitment, and Phase 2
having done some of the work early is not a reason to demand more. The same
logic gives constructor fields 56 → ≤ 33 (the spec's "≥ 40% from ~54" endpoint
is 32.4; measured against 56 the same percentage gives 33.6 — ≤ 33 satisfies
both readings).

Baseline.md §6 shows the grouping arithmetic reaches 12 constructor fields, so
the field target has substantial headroom. The reach-in target is the binding
one.

**Alternatives rejected**:
- *Keep 371 as the ratchet baseline* — a ratchet that starts 128 above the
  current value cannot fail, which makes it decoration.
- *Silently retarget to ≤ 121* — a harder goal than the spec asked for,
  adopted without the author's say-so.

---

## R8 — Public API coverage: one spec, behavioural assertions, no new debug hooks

**Decision**: `tests/public-api.spec.js` exercises the six documented methods as
a consumer would, from a fixture page that does **not** set
`window.GRAMFRAME_DEBUG`. Each gets at least one assertion about an effect, not
about a type.

| Method | Behavioural assertion |
|---|---|
| `init()` | on a page with two `gram-config` tables, returns 2 instances and both tables are replaced by `.gram-frame-container` |
| `detectAndReplaceConfigTables(el)` | scoped to a subtree, replaces only tables inside it; a table outside is untouched |
| `addStateListener(cb)` | `cb` fires immediately with current state, then again after a mode switch, with `state.mode` changed |
| `removeStateListener(cb)` | after removal, a mode switch produces no further call; returns `true` for a known listener and `false` for an unknown one |
| `getExpandState()` | reflects the expanded state after `setExpandState(true)` |
| `setExpandState(true/false)` | the image element's rendered width changes; `getExpandState()` agrees |

**Rationale**: FR-010 and SC-006 are about the API being *tested as an API*.
Running against a non-debug page is what makes that real — it proves the public
surface works without the `__test__` hooks, which is precisely GF-30's residual
finding ("interactions still route through `__test__` hooks and the public API
surface remains untested"). It also guards the debug-gating itself: if
`__test__*` ever leaks onto a production page, this spec is where it shows up.

The existing `auto-detection.spec.js:88,96` `typeof` checks stay — they are
cheap smoke assertions — but they stop being the only coverage.

**Alternatives rejected**:
- *Extend `auto-detection.spec.js`* — mixes auto-discovery (Principle IV)
  assertions with API-contract assertions in one file.
- *Unit-test the API against a jsdom stub* — `setExpandState` measures rendered
  image geometry; the constitution's "unit tests alone cannot catch rendering
  regressions" applies directly.

---

## R9 — ADRs: fill the ADR-014 gap, add two, annotate one

**Decision**: three new ADRs and one annotation.

| ADR | Subject | Story |
|---|---|---|
| **ADR-014** (fills the numbering gap noted in GF-43) | Mode state registration seam — why `ModeFactory` composes initial state and `state.js` receives it | 2 |
| **ADR-017** | Mode capability interfaces — duck-typed capabilities over named-mode reach-ins | 4 |
| **ADR-018** | The `table.js` split — one responsibility per module, and why `rendering/axes.js` is where the axis engine belongs | 3 |
| **ADR-007** (annotate) | JSDoc/TypeScript integration — record that the strict gate is fully in force, per AS-1.4 | 1 |

**Rationale**: The spec's Assumptions call for exactly this, and GF-43 flags the
ADR-014 gap as worth reusing. ADR-011 (Feature Renderer cross-mode coordination)
also needs a note in ADR-017, since GF-40 records that ADR-011's documented
method names have zero overlap with `FeatureRenderer`'s actual ones — the
capability refactor rewrites those methods anyway, so ADR-017 is the natural
place to correct the record.

Each ADR lands in the PR that implements it, not in a documentation sweep at the
end.
