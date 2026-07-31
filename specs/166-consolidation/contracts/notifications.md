# Contract — State notification dispatcher

**Module**: `src/core/state.js`
**Replaces**: 41 direct `notifyStateListeners` references across 12 files.

## Invariants

- **N1** Exactly one dispatch choke-point. `notifyStateListeners` is no longer
  exported to modes; an ESLint `no-restricted-imports` rule fails `yarn lint` if
  a mode imports it (FR-005, AS-4.4).
- **N2** At most one deep clone per dispatch, and none at all when
  `listeners.length === 0` (FR-005). The constitution's "state MUST be
  deep-copied before passing to listeners" is preserved — the copy moves, it
  does not disappear.
- **N3** One settled gesture ⇒ one notification (AS-4.1).
- **N4** High-frequency paths never notify more often than animation-frame
  cadence (FR-006, AS-4.2).
- **N5** No listener ever observes intermediate, half-updated state (SC-004).
- **N6** No notification is lost on teardown — `flushDispatch` runs
  synchronously on destroy.

## Surface

```js
/**
 * Request a notification. Coalesces; safe to call from anywhere in src/.
 * @param {GramFrame} instance
 * @param {DispatchOptions} [options]
 */
export function dispatch(instance, options)

/**
 * Deliver any pending notification synchronously. Teardown/destroy only.
 * @param {GramFrame} instance
 */
export function flushDispatch(instance)
```

### Coalescing tiers

| Tier | Trigger | Callers |
|---|---|---|
| microtask (default) | `queueMicrotask` | mode switch, marker add/delete, colour/symbol change, config parse, rate change, storage load |
| frame (`{frame: true}`) | `requestAnimationFrame` | mousemove readouts, wheel zoom/pan (`viewport.js:setZoom`), drag-move frames |

**Priority rule**: a pending frame-tier dispatch is *upgraded* to microtask tier
by any subsequent default-tier dispatch, never downgraded. A mode switch during
a drag is therefore never delayed to the next frame.

## Observable timing change

This is the only listener-visible behaviour change in the phase. The
compatibility bar (spec Assumptions) is **same-frame final-state equivalence**:
after the frame settles, the state a listener has seen is identical to today's.

Concretely, `GramFramePage.getState()` reads the debug page's state display,
which is written by a state listener. Once dispatch is asynchronous, any spec
that performs an action and immediately reads that display is racing the
dispatcher. This is why Story 1 (state-based waits) is a hard prerequisite for
Story 4 — see plan.md §Sequencing.

DOM rendering is **not** batched. Cursor overlays, LED readouts, markers table
and harmonics panel continue to update synchronously within their handlers.
Only *listener notification* is coalesced.

## Storage listener gate (AS-4.3)

The annotation-save listener registered at `src/main.js:447` currently
re-serializes on every notification, including pure cursor moves. It gains an
early return keyed on an annotation-relevance signature (marker count,
harmonic-set count, doppler marker identity, and a mutation counter bumped by
the annotation-mutating paths). Cursor moves, mode switches and zoom changes no
longer trigger a save.

## Verification

| Assertion | How |
|---|---|
| AS-4.1 — one mode switch ⇒ exactly 1 notification | Playwright spec with a counting listener registered via the public API |
| AS-4.2 — 60-event mousemove/wheel burst ⇒ count bounded by elapsed frames, not events | same spec; assert `count <= frames + 1` and final state matches the unbatched value |
| AS-4.3 — save only on annotation-relevant change | spy on `saveAnnotations` via storage writes; move the cursor 20× ⇒ zero writes |
| AS-4.4 — no bypass | `yarn lint` fails on a mode importing `notifyStateListeners` |
| N2 — single clone, skipped with no listeners | Vitest unit test on the dispatcher with a clone counter |
| N6 / HMR | existing HMR listener-preservation coverage plus an explicit destroy-flush assertion |
