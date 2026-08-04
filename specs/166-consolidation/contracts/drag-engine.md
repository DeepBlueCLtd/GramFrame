# Contract — Shared drag engine

**Module**: `src/modes/shared/BaseDragHandler.js` (extended, not replaced)
**Absorbs**: `PanMode`'s hand-rolled drag (`PanMode.js:17-21,57-134`), the
Harmonics creation machine (`HarmonicsMode.js:202-210,255-261,551-599`), the
Doppler placement machine (`DopplerMode.js:256-260,288-310,322-354`), and the
middle-button wheel-pan on `instance._wheelPan` (`events.js:115-120,208-217,
264-280,300-304,323-326`).

## Invariants

- **D1** All pointer-drag interactions run through this engine (FR-004). After
  the port, `grep -rn 'mousedown\|mousemove\|mouseup' src/modes/` returns
  matches only in the engine and the central `events.js` binding.
- **D2** Drag state has exactly one authoritative owner — the engine's
  `dragState` — and exactly one read-only projection for listeners
  (`state.drag`, see data-model.md §2).
- **D3** A mode subscribes by supplying a target resolver and lifecycle
  callbacks. It never writes drag fields into `state` (AS-3.3).
- **D4** At most one drag is active across all modes at any time.
- **D5** Thresholds, cursor changes and completion semantics are preserved
  exactly as they are today, per drag kind (AS-3.1).

## Surface

```js
new BaseDragHandler(instance, {
  /**
   * Decide whether this mousedown starts a drag, and of what kind.
   * Return null to decline (the event falls through to click handling).
   * @param {DataCoordinates} position
   * @param {MouseEvent} event
   * @returns {DragTarget|null}
   */
  resolveTarget(position, event),

  /**
   * Side-effect-free finder used for hover cursor feedback (grab vs
   * crosshair). REQUIRED when resolveTarget creates a feature on mousedown
   * (harmonics `create`, doppler `place`) — hover otherwise falls back to
   * resolveTarget, and a resolver that mints would create a feature per
   * mousemove.
   * @param {DataCoordinates} position
   * @returns {DragTarget|null}
   */
  resolveHoverTarget(position),

  /** Called once, on the mousedown that starts the drag. There is no movement
   *  threshold: a drag begins the moment the resolver returns a target. */
  onDragStart(target, position),

  /** Called per move, already frame-throttled by the dispatcher. */
  onDragMove(target, position, delta),

  /** Called on mouseup inside the surface. */
  onDragEnd(target, position),

  /** Called on mouseleave / Escape / off-image mouseup (wired centrally in
   *  `core/events.js` and the keyboard handler) — must not commit the gesture. */
  onDragCancel(target),

  /** Optional per-kind cursor; defaults to the mode's cursor. */
  cursorFor(kind),
})
```

### Drag kinds

| Kind | Today's machine | Target | Notes |
|---|---|---|---|
| `move` | `BaseDragHandler` (analysis markers), Harmonics set drag | existing feature | already here |
| `create` | Harmonics creation drag | new feature, id minted on start | resolver returns `id` of the provisionally-created set |
| `place` | Doppler placement drag | doppler marker being placed | `tempFirst`/`previewEnd` stay on `state.doppler` |
| `pan` | `PanMode` drag, `_wheelPan` | none (`id`/`type` null) | viewport pan; only meaningful at zoom > 1 |

`pan` is the kind that most stretches the engine: it has no feature target and
its `onDragMove` writes viewport state rather than feature state. The engine
accommodates this by treating `DragTarget.id`/`.type` as nullable (D2 in
data-model.md's validation rules) — it does not special-case the mode.

### Middle-button pan

The `_wheelPan` machine differs from `PanMode`'s only in its trigger
(`event.button === 1`, with `preventDefault` to suppress browser autoscroll) and
in being active in *every* mode. It becomes a `pan`-kind drag resolved centrally
in the engine's mousedown path, ahead of the mode's resolver, so mode resolvers
never see button-1 events.

## Port order and gate

Per the spec's assumption, one machine per PR, newest and least-covered last:

1. Harmonics creation (`create`)
2. Doppler placement (`place`)
3. PanMode drag (`pan`)
4. Middle-button wheel-pan (`pan`, central)

Gate for each: the corresponding Playwright spec passes **unchanged** before and
after the port (AS-3.1, Independent Test). Gate for the final PR: `state.drag`
is the only broadcast drag record; `types.js` and the data/state guide updated in
the same PR (AS-3.2, FR-010); the four in-repo test readers migrated
(data-model.md §2).
