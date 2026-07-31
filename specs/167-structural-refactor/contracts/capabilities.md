# Contract — Mode capability interfaces

**Story 4 · FR-005 · FR-006 · FR-007 · ADR-017**

Cross-module collaborators discover what a mode can do by asking the mode, not
by naming it.

Capabilities are **duck-typed**: a mode opts in by implementing the methods.
There is no roster to keep in sync, no registration call, and no inheritance —
which matters in a JSDoc-typed codebase with no compilation step, where a
declared `capabilities` array would be a second source of truth that can drift
from the methods it describes.

Lives in `src/modes/capabilities.js`: the typedefs and their predicates
together.

---

## `PersistentFeatureProvider`

A mode that owns features surviving a mode switch.

| Member | Signature | Contract |
|---|---|---|
| `hasPersistentFeatures` | `() => boolean` | `true` iff at least one such feature currently exists. Reads this mode's own state slice. |
| `renderPersistentFeatures` | `() => void` | Draws them into `instance.cursorGroup`. Called only when `hasPersistentFeatures()` returns `true`. Must be safe to call repeatedly. |

```js
export function isPersistentFeatureProvider(mode) {
  return typeof mode?.hasPersistentFeatures === 'function'
      && typeof mode?.renderPersistentFeatures === 'function'
}
```

**Implementors**: Analysis, Harmonics, Doppler. **Not** Pan.

**`FeatureRenderer` after the change**:

```js
renderAllPersistentFeatures() {
  if (!this.instance.cursorGroup) return
  this.instance.cursorGroup.innerHTML = ''
  Object.values(this.instance.modes)
    .filter(isPersistentFeatureProvider)
    .filter(mode => mode.hasPersistentFeatures())
    .forEach(mode => mode.renderPersistentFeatures())
}
```

`hasAnalysisFeatures()`, `hasHarmonicFeatures()` and `hasDopplerFeatures()` are
deleted from `FeatureRenderer` and reimplemented as `hasPersistentFeatures()` on
the mode that owns the state each reads. That removes eight `instance.state`
reach-ins from `FeatureRenderer`, counting toward Story 5's ratchet.

---

## `PanelOwner`

A mode that owns a persistent panel in the unified layout.

| Member | Signature | Contract |
|---|---|---|
| `refreshPanel` | `() => void` | Re-renders the panel from current state. Idempotent; safe when the panel is empty or its container is absent. |

```js
export function isPanelOwner(mode) {
  return typeof mode?.refreshPanel === 'function'
}
```

**Implementors**: Analysis (today's `updateMarkersTable`), Harmonics (today's
`updateHarmonicPanel`).

**`MainUI.updatePersistentPanels` after the change**:

```js
Object.values(instance.modes).filter(isPanelOwner).forEach(mode => mode.refreshPanel())
```

replacing `MainUI.js:211,217`, which today reads:

```js
const analysisMode = /** @type {any} */ (instance.modes['analysis'])
const harmonicsMode = /** @type {any} */ (instance.modes['harmonics'])
```

Both `any` casts go. No mode-name string remains in `MainUI.js`.

---

## `ZoomConsumer` — a consumption rule, not an implemented interface

There is nothing for a mode to implement. The rule is that **every** zoom caller
goes through `core/viewport.js`:

| Caller | Today | After |
|---|---|---|
| Wheel | `viewport.js` | unchanged |
| Keyboard | `viewport.js` | unchanged |
| Public API | `main.js._zoomIn` → `viewport.js` | direct, or a documented forwarder |
| PanMode command buttons | `this.instance._zoomOut()` / `_zoomIn()` (`PanMode.js:219,225`) | `zoomOut(this.instance)` / `zoomIn(this.instance)` imported from `core/viewport.js` |

`types.js:431-434`'s `_setZoom` / `_zoomIn` / `_zoomOut` / `_zoomReset` optional
members are removed. Whether `main.js` keeps thin forwarders for the public API
is decided in PR 12, when the full call graph is visible; either way
`core/viewport.js` is the single home for zoom math (FR-007, AS-4.3).

---

## Documented exception

`viewport.js:162` reads `instance.modes.pan` to decide whether to leave pan mode
when zoom returns to 1×:

```js
if (instance.state.mode === 'pan' && instance.modes.pan && !instance.modes.pan.isEnabled() && …)
```

This is pan-specific policy, not cross-cutting coordination. A fourth capability
for one call site would be worse than the reach-in. It is recorded here as an
exception to FR-006 rather than disguised (research §R6).

---

## Rules

1. No module outside `modes/` names a mode by string or index to obtain
   behaviour — one exception, above.
2. No `any` cast is used to reach a mode method.
3. A capability with zero implementors is deleted, not kept for symmetry.
4. Every capability must be exercised by the fifth-mode spike (SC-003) before it
   counts as real.

## Verification

| Assertion | Where |
|---|---|
| `FeatureRenderer` and `MainUI` contain no mode-name string and no `any` cast to a mode | grep in PR 11; `yarn lint` |
| A fifth mode with persistent features is rendered with no edit to `FeatureRenderer` or `MainUI` | `tests/mode-registration.spec.js` + spike PR (AS-4.2, SC-003) |
| Zoom via PanMode buttons, keyboard, wheel and API all produce identical state | `tests/pan-zoom.spec.js` (existing, unchanged — that is the point) |
| Deleted `BaseMode` hooks have no callers | grep in PR 10; `tsc` under Story 1's flags |
