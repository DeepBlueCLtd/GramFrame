# ADR-017: Mode Capability Interfaces

## Status

**Accepted** (spec 167, Story 4).

## Context

`BaseMode` gave every mode the same twenty-member surface, and the modules that
coordinated across modes did not use it. They named modes instead:

```js
// core/FeatureRenderer.js
if (this.hasAnalysisFeatures() && this.instance.modes.analysis) {
  this.instance.modes.analysis.renderPersistentFeatures()
}

// components/MainUI.js
const analysisMode = /** @type {any} */ (instance.modes['analysis'])
const harmonicsMode = /** @type {any} */ (instance.modes['harmonics'])
```

Three consequences, all recorded in the findings register as GF-10 and GF-11:

- **The predicates lived in the wrong place.** `FeatureRenderer` carried
  `hasAnalysisFeatures()`, `hasHarmonicFeatures()` and `hasDopplerFeatures()`,
  each reading into a mode's own state slice — eight `instance.state` reach-ins
  in a file that renders nothing itself.
- **The `any` casts were load-bearing.** `updateMarkersTable` and
  `updateHarmonicPanel` are not on the mode interface, so reaching them required
  casting the mode to `any` — which switches off type checking for the whole
  expression, not just the one unknown member.
- **Constitution Principle III was false in fact.** "Adding a mode must not
  modify existing modes" held, but adding a *fifth* mode with persistent features
  meant editing `FeatureRenderer`, `MainUI` and `state.js` — none of which is a
  mode.

Meanwhile `BaseMode` declared hooks nobody implemented. `renderCursor` had zero
overrides and one caller, `FeatureRenderer.renderCurrentModeCursor()`, whose
entire body was calling it — so the feature was a no-op invoking a no-op.
`getStateSnapshot` had zero overrides and zero callers.

## Decision

Cross-module collaborators discover what a mode can do **by asking the mode, not
by naming it**. Capabilities are duck-typed interfaces declared in
`src/modes/capabilities.js`, alongside the predicates that test for them.

Two capabilities, because there are two real collaborations:

| Capability | Members | Implementors |
|---|---|---|
| `PersistentFeatureProvider` | `hasPersistentFeatures()`, `renderPersistentFeatures()` | Analysis, Harmonics, Doppler |
| `PanelOwner` | `refreshPanel()` | Analysis, Harmonics |

```js
Object.values(this.instance.modes)
  .filter(isPersistentFeatureProvider)
  .filter(mode => mode.hasPersistentFeatures())
  .forEach(mode => mode.renderPersistentFeatures())
```

Zoom is a third collaboration but **not** an implemented interface — there is
nothing for a mode to implement. It is a consumption rule: every zoom caller goes
through `core/viewport.js`. Pan mode's command buttons called
`this.instance._zoomOut()` / `_zoomIn()`; they now call `zoomOut(instance)` /
`zoomIn(instance)` directly. A capability with nothing to implement would be
ceremony.

`BaseMode` keeps only hooks with a real implementation or a documented lifecycle
contract. `renderCursor` and `getStateSnapshot` are deleted, along with
`FeatureRenderer.renderCurrentModeCursor()`. `getViewport` and
`updateCursorStyle` also have zero overrides but 17 and 3 callers — they are
concrete base *helpers*, not hooks, and the class header now says so.

### Why duck-typed

The codebase is JSDoc-typed with no compilation step. A declared `capabilities`
array on each mode would be a second source of truth, free to drift from the
methods it describes, with nothing to catch the drift. A method that exists is
its own declaration.

### Why not a class hierarchy

`PersistentFeatureProvider` and `PanelOwner` cut across the modes differently:
Doppler provides features but owns no panel. Single inheritance cannot express
that without either a mixin chain or a `FeatureAndPanelMode` for each
combination. JavaScript has no interfaces to implement, so the honest encoding of
"implements this interface" is "has these methods".

### Why not a string-keyed registry

A registry — `registerCapability('panel', analysisMode)` — reintroduces the
roster the reach-ins were, just spelled differently, and adds a registration
call that can be forgotten. The predicate reads the truth directly.

## Consequences

- `core/FeatureRenderer.js` is 45 lines and names no mode. `components/MainUI.js`
  contains no mode-name string and no `any` cast.
- Eight `instance.state` reach-ins moved out of `FeatureRenderer` onto the modes
  whose state they read, counting toward Story 5's ratchet.
- A fifth mode with persistent features renders, and its panel refreshes, with
  no edit to either file. That is SC-003, and the fifth-mode spike is its
  evidence.
- Every capability must be exercised by that spike before it counts as real. A
  capability with zero implementors is deleted, not kept for symmetry.

### Documented exceptions to FR-006

Two sites still name a mode, deliberately.

**`core/viewport.js`** — `updateZoomControlStates` reads `instance.modes.pan` to
decide whether to leave pan mode when zoom returns to 1×:

```js
if (instance.state.mode === 'pan' && instance.modes.pan && !instance.modes.pan.isEnabled() && …)
```

This is pan-specific *policy*, not cross-cutting coordination: there is no
general rule here that a fifth mode would participate in. A fourth capability
for one call site would be worse than the reach-in.

**`core/initialization/ModeInitialization.js`** — `setupModeUI` calls
`createUI(container)` on the analysis and harmonics modes with *different*
containers, and falls back to `modes['pan']` for the initial mode. The
per-mode container is not something a capability can express, and this is the
same module that instantiates the modes: knowing the roster is its job.

Both are recorded here rather than disguised. Neither is `FeatureRenderer`,
`MainUI` or `state.js`, which are the files SC-003 names.

## Correction to ADR-011

[ADR-011](ADR-011-Feature-Renderer-Cross-Mode-Coordination.md) documents a
`FeatureRenderer` interface whose method names have **zero overlap** with the
ones that were ever implemented (GF-40). It should be read as a record of the
intended shape of cross-mode coordination, not as a description of the code. The
implemented surface is now one public method, `renderAllPersistentFeatures()`,
plus the two capabilities above.
