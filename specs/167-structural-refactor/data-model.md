# Phase 1 Data Model — Structural Refactor

**No persisted-state change.** Nothing in this phase alters the shape of a
stored annotation, the storage schema version, or the broadcast
`GramFrameState`. Saved work from before the phase loads unchanged after it, and
no migration is written. `specs/155-browser-storage`'s schema stands.

What follows is the *structural* model: the entities the refactor introduces or
reshapes, and the invariants each must hold.

---

## 1. `ModeInitialStates` — the registration seam (Story 2)

The composed object handed to `createInitialState()`, replacing the four mode
imports inside `state.js`.

| Field | Type | Source |
|---|---|---|
| `analysis` | `AnalysisState` | `AnalysisMode.getInitialState()` |
| `harmonics` | `HarmonicsState` | `HarmonicsMode.getInitialState()` |
| `doppler` | `DopplerState` | `DopplerMode.getInitialState()` |
| *(pan contributes no slice today)* | — | `PanMode.getInitialState()` returns `{}` |

**Producer**: `ModeFactory.getModeInitialStates()` — the only module importing
all four mode classes.
**Consumer**: `createInitialState(modeStates)` in `core/state.js`.

**Invariants**

1. `createInitialState()` called with no argument returns a valid core state
   with no mode slices. This is what lets a unit test build state without
   loading a mode (AS-2.2).
2. Merge order is fixed and explicit: analysis, harmonics, doppler, pan. A
   frozen-snapshot unit test pins the composed shape before PR 4 changes
   anything.
3. A mode slice must not collide with a core key. Today `TS2783` reports
   `version` and `timestamp` being set and then spread over — the composition
   must set core keys **after** the spread, or reject colliding keys outright.
   PR 4 owns this fix.
4. Adding a fifth mode adds one line to `getModeInitialStates()` and touches no
   other file (SC-003, AS-2.2).

**State shape**: unchanged. The same keys appear in the same places; only the
module that assembles them moves.

---

## 2. Listener registries (Story 2)

Two arrays with genuinely different lifetimes, each with exactly one write path.

| Registry | Lives in | Holds | Lifetime |
|---|---|---|---|
| `globalStateListeners` | `core/state.js` (module scope) | listeners added via `GramFrame.addStateListener()` | survives instance destruction; cleared only by `clearGlobalStateListeners()` (HMR, tests) |
| `instance.stateListeners` | per instance | listeners scoped to one instance | dies with the instance |

**Change**: instances stop *copying* the global list into their own at
construction (`EventBindings.js:46`), and `removeStateListener` stops splicing
every instance's copy (`GramFrameAPI.js:283-289`).

**Invariants**

1. A given callback appears in **at most one** registry. Delivery walks the
   union and de-duplicates, so a callback in both is delivered once.
2. `addStateListener(cb)` writes to `globalStateListeners` only; the immediate
   call-with-current-state per live instance is preserved (observable API
   behaviour, asserted by `state-listener.spec.js`).
3. `removeStateListener(cb)` removes from `globalStateListeners` only, and
   returns `true` iff something was removed.
4. After add-then-remove, no instance holds a reference to `cb` — no leak, no
   duplicate delivery (AS-2.3).
5. HMR re-registration (`main.js:663-666`) preserves global listeners across a
   hot reload (Technical Constraints; AS-2.3 names it).

---

## 3. Mode capabilities (Story 4)

Duck-typed interfaces in `src/modes/capabilities.js`. A mode opts in by
implementing the methods; there is no registration list and no inheritance.

### `PersistentFeatureProvider`

| Member | Signature | Contract |
|---|---|---|
| `hasPersistentFeatures` | `() => boolean` | `true` iff this mode owns at least one feature that must survive a mode switch |
| `renderPersistentFeatures` | `() => void` | Draws them into `instance.cursorGroup`; called only when `hasPersistentFeatures()` is `true` |

Implemented by: Analysis, Harmonics, Doppler. Not Pan.
Predicate: `isPersistentFeatureProvider(mode)`.

The three `hasXFeatures()` predicates currently on `FeatureRenderer` move onto
the modes whose state they read — deleting eight `instance.state` reach-ins from
`FeatureRenderer` toward Story 5's ratchet.

### `PanelOwner`

| Member | Signature | Contract |
|---|---|---|
| `refreshPanel` | `() => void` | Re-renders this mode's persistent panel (markers table / harmonics panel) from current state; idempotent, safe to call when the panel is empty |

Implemented by: Analysis (`updateMarkersTable`), Harmonics (`updateHarmonicPanel`).
Predicate: `isPanelOwner(mode)`.

### `ZoomConsumer`

Not an implemented interface — a *consumption* rule. Every zoom caller (wheel,
keyboard, PanMode's command buttons, the public API) goes through
`core/viewport.js`. No caller reaches for `instance._zoomIn` and friends
(FR-007).

**Invariants**

1. No module outside `modes/` names a mode by string or index to obtain
   behaviour (FR-006). One documented exception: `viewport.js:162`'s
   pan-specific policy check (research §R6).
2. No `any` cast is used to reach a mode method.
3. A fifth mode implementing `PersistentFeatureProvider` is rendered by
   `FeatureRenderer` with no edit to `FeatureRenderer` (AS-4.2, SC-003).
4. A capability with zero implementors is deleted, not kept "for symmetry".

---

## 4. `BaseMode` after pruning (Story 4)

| Category | Members |
|---|---|
| **Lifecycle hooks** (kept) | `activate`, `deactivate`, `resetState`, `cleanup`, `createUI`, `destroyUI` |
| **Event hooks** (kept) | `handleMouseMove`, `handleMouseDown`, `handleMouseUp`, `handleMouseLeave` |
| **Presentation hooks** (kept) | `updateLEDs`, `getGuidanceText`, `getCommandButtons`, `isEnabled` |
| **Registration** (kept) | `static getInitialState` |
| **Concrete helpers** (kept, not hooks) | `getViewport` (17 callers), `updateCursorStyle` (3 callers) |
| **Capability methods** (kept, moved out of the base contract) | `renderPersistentFeatures` — now a capability, not a hook every mode inherits as a no-op |
| **Deleted** | `renderCursor` (0 overrides, 1 caller that always hits the no-op), `getStateSnapshot` (0 overrides, 0 callers) |

20 members → 18, of which 2 are concrete helpers and 1 moves to a capability.

**Invariants**

1. Every remaining hook has ≥ 1 real override or a documented lifecycle
   contract explaining why the base implementation is the whole contract
   (FR-005, AS-4.1).
2. Deleted hooks have zero callers after PR 10 — verified by grep in the PR, and
   by `tsc` once Story 1's flags are on.
3. `FeatureRenderer.renderCurrentModeCursor()` — whose only job was calling the
   deleted `renderCursor` — is removed with it, along with its call sites.

---

## 5. Instance sub-objects (Story 5)

56 flat fields become 12, with 44 grouped behind four cohesive sub-objects. Full
field lists in [baseline.md](./baseline.md) §6.

| Sub-object | Fields | Contents |
|---|---|---|
| `instance.ui` | 30 | Every DOM element handle: containers, columns, LEDs, SVG groups, clip rects, the image, the toggles |
| `instance.interaction` | 14 | Selection functions, restyle functions, control handles, registered listeners, wheel-pan transients |
| `instance.viewport` | 2 | `resizeObserver`, `_boundHandleResize` |
| `instance.persistence` | 2 | `_storageInstanceIndex`, `_isTrainerContext` |
| *(ungrouped)* | 8 | `state`, `configTable`, `stateListeners`, `instanceId`, `modes`, `currentMode`, `featureRenderer`, `_unsupportedBrowser` |

**Invariants**

1. The grouping is a *move*, not a redesign: no field changes meaning, type, or
   lifetime. `tsc` under Story 1's flags catches every missed reach-in.
2. Sub-objects are created in the constructor before any initialization step
   runs, so no step sees a partially-formed instance.
3. `instance.state` remains ungrouped and directly accessible — it is the
   broadcast state and the constitution names it. Story 5 reduces the *number
   of reach-ins*, not the accessibility of the field.
4. Ratchets `instanceStateReachIns` (243 → ≤ 185) and `instanceFields`
   (56 → ≤ 33) fall monotonically (FR-008, AS-5.1).

---

## 6. Initialization steps (Story 5)

Today: ten calls in a fixed order, each mutating the instance
(`main.js:203-212`), with `DOMSetup.js:100-106` nulling fields another step
re-creates.

After: each step declares what it needs as parameters and returns what it built.

| Step | Needs | Returns |
|---|---|---|
| `initializeDOMProperties` | `configTable` | `{ ui: {…} }` seed |
| `setupSpectrogramComponents` | `ui.container` | `{ svg, cursorGroup, axesGroup, clipRects }` |
| `createUnifiedLayoutStructure` | `ui.container` | column handles |
| `setupPersistentContainers` | column handles | `{ markersContainer, harmonicsContainer }` |
| `setupSpectrogramIfAvailable` | `configTable`, `ui.svg` | `{ spectrogramImage }` or nothing |
| `initializeModeInfrastructure` | `state`, instance | `{ modes, featureRenderer }` |
| `setupModeUI` | `modes`, column handles | `{ modesContainer, modeButtons }` |
| `updateModeUIWithCommands` | `modes`, `currentMode` | `{ commandButtons, guidancePanel }` |
| `setupAllEventListeners` | `ui`, `modes` | `{ registeredListeners }` |
| `setupStateListeners` | instance | — |

**Invariants**

1. **FR-009**: no step relies on a field another step nulls and re-creates. The
   `DOMSetup.js:100-106` double-nulling is removed.
2. **AS-5.2**: reordering two steps produces a compile-time error (a required
   parameter is missing) or an immediate explicit throw — never a silent
   `undefined` surfacing later at runtime.
3. The public construction contract is unchanged: `new GramFrame(configTable)`
   yields a fully initialized instance, and the legacy-browser early return
   (`main.js:196-201`) still short-circuits before any DOM work.

---

## 7. Type definitions removed (`types.js`)

| Removed | Story | Reason |
|---|---|---|
| `_setZoom`, `_zoomIn`, `_zoomOut`, `_zoomReset` optional members (`types.js:431-434`) | 4 | Zoom flows through `core/viewport.js`; no caller reaches for the underscore members (FR-007) |
| `getStateSnapshot` on the mode interface | 4 | Deleted hook |
| `renderCursor` on the mode interface | 4 | Deleted hook |

**Added**: the three capability typedefs, in `modes/capabilities.js` rather than
`types.js`, so the interface lives beside its predicate.
