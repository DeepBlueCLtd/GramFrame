# Phase 1 Data Model — Spec 166 Consolidation

This feature adds no persisted data and does not touch the storage schema. It
changes one thing observable to state listeners: **drag bookkeeping collapses
from three mirrored places into one read-only projection** (FR-004, FR-010,
research.md §R4). Everything else here is internal structure.

## 1. Drag state — before

Three parallel records, all written by hand by the modes, all broadcast:

| Location | Contributed by | Fields |
|---|---|---|
| `state.analysis` | `AnalysisMode` (`types.js:80-83`) | `isDragging`, `draggedMarkerId`, `dragStartPosition` |
| `state.dragState` | `HarmonicsMode` initial state (`HarmonicsMode.js:1031`, `types.js:126-133`) | `isDragging`, `dragStartPosition`, `draggedHarmonicSetId`, `originalSpacing`, `originalAnchorTime`, `clickedHarmonicNumber`, `isCreatingNewHarmonicSet` |
| `state.doppler` | `DopplerMode` (`types.js:18-22`) | `isDragging`, `draggedMarker`, `isPlacingMarkers`, `isPreviewDrag`, `previewEnd`, `tempFirst` |

Authoritative truth already lives in `BaseDragHandler.dragState`
(`BaseDragHandler.js:51-57`): `{ isDragging, draggedTargetId, draggedTargetType,
dragStartPosition, originalData }`. The three records above are copies kept in
sync by hand — the double bookkeeping GF-17 records. `PanMode` keeps a fourth,
private, un-broadcast flag (`PanMode.js:17`), and `events.js` keeps a fifth on
`instance._wheelPan`.

## 2. Drag state — after

A single projection, written only by the dispatcher path from the active
handler, never by a mode:

```js
/**
 * Read-only projection of the active drag, derived from the owning
 * BaseDragHandler. Modes MUST NOT write this; it is rebuilt on each dispatch.
 * @typedef {Object} DragProjection
 * @property {boolean} active           - Whether a drag is in progress
 * @property {DragKind|null} kind       - What kind of drag
 * @property {ModeType|null} mode       - Mode that owns the drag
 * @property {string|null} targetId     - Id of the dragged feature, if any
 * @property {string|null} targetType   - 'marker' | 'harmonicSet' | 'dopplerMarker' | null
 * @property {DataCoordinates|null} startPosition - Where the drag began, in data coordinates
 */

/**
 * @typedef {'move'|'create'|'place'|'pan'} DragKind
 */
```

`state.drag` is present at all times with `active: false` and null fields when
idle, so listeners never have to null-check the container.

### Field mapping

| Old | New |
|---|---|
| `state.analysis.isDragging` | `state.drag.active && state.drag.mode === 'analysis'` |
| `state.analysis.draggedMarkerId` | `state.drag.targetId` (when `targetType === 'marker'`) |
| `state.analysis.dragStartPosition` | `state.drag.startPosition` |
| `state.dragState.isDragging` | `state.drag.active && state.drag.kind === 'move'` |
| `state.dragState.isCreatingNewHarmonicSet` | `state.drag.active && state.drag.kind === 'create'` |
| `state.dragState.draggedHarmonicSetId` | `state.drag.targetId` |
| `state.dragState.dragStartPosition` | `state.drag.startPosition` |
| `state.dragState.originalSpacing` / `.originalAnchorTime` / `.clickedHarmonicNumber` | Handler-internal (`dragState.originalData`); **not** broadcast |
| `state.doppler.isDragging` | `state.drag.active && state.drag.mode === 'doppler'` |
| `state.doppler.draggedMarker` | `state.drag.targetId` |
| `state.doppler.isPlacingMarkers` / `.isPreviewDrag` | `state.drag.kind === 'place'` |
| `PanMode.isDragging` (private) | `state.drag.kind === 'pan'` |
| `instance._wheelPan` (private) | `state.drag.kind === 'pan'` |

`state.doppler.tempFirst` and `.previewEnd` are **not** drag bookkeeping — they
are placement geometry the renderer needs. They stay on `state.doppler`.

### Validation rules

- `active === false` ⟹ every other field is `null`.
- `active === true` ⟹ `kind` and `mode` are non-null.
- `kind === 'pan'` ⟹ `targetId` and `targetType` are `null` (a pan drags the
  viewport, not a feature).
- At most one drag is active across all modes at any time — enforced by the
  single owning handler, and asserted by `state-hygiene.spec.js`.

### State transitions

```
idle ──mousedown on hit target──> active(kind, target)
  ▲                                      │
  │                                      ├─ mousemove ──> active (position updates, frame-throttled dispatch)
  │                                      │
  └── mouseup / mouseleave / Escape ─────┘
```

The threshold and cursor semantics of each transition are unchanged from the
machine being ported (AS-3.1); only the owner changes.

### Consumers to migrate (in PR 7)

All in-repo readers are tests — there are no `src/`-external, `debug.html` or
`sample/` readers (research.md §R4):

- `tests/doppler-mode.spec.js:674,702` — `state.doppler.isDragging`
- `tests/mode-integration.spec.js:320` — `state.harmonics?.dragState?.isDragging`
- `tests/mode-integration.spec.js:321` — `state.doppler?.isDragging`
- `tests/state-hygiene.spec.js:63` — the key list containing `'dragState'`

`types.js` loses `DragState`'s broadcast role (it stays as the handler-internal
type) and gains `DragProjection` + `DragKind`. `AnalysisState`, `DopplerState`
and the `dragState` slot in the harmonics initial state lose the mirrored
fields. The data/state documentation is updated in the same PR (FR-010).

## 3. Non-state structures introduced

These are internal shapes, not part of the broadcast state.

### `DragTarget` (BaseDragHandler)

Lets one engine serve move, create, place and pan drags. Returned by a mode's
target resolver on mousedown; `null` means "not a drag".

```js
/**
 * @typedef {Object} DragTarget
 * @property {DragKind} kind
 * @property {string|null} id          - Feature id for move/place; null for create/pan
 * @property {string|null} type        - Feature type; null for pan
 * @property {any} originalData        - Snapshot the mode needs to compute deltas
 */
```

### `TableSpec` (DiffingTable)

```js
/**
 * @typedef {Object} TableSpec
 * @property {string[]} columns                 - Header labels, in order
 * @property {(row: any, index: number) => string} rowKey  - Stable identity for diffing
 * @property {(row: any, index: number) => (string|Node)[]} cells - Cell content per column
 * @property {(key: string) => void} [onSelect] - Row click
 * @property {(key: string) => void} [onDelete] - Delete-button click
 * @property {(key: string) => boolean} [isSelected]
 * @property {number} [maxHeightPx]             - Fixed-height scroll wrapper
 */
```

### `DispatchOptions` (state dispatcher)

```js
/**
 * @typedef {Object} DispatchOptions
 * @property {boolean} [frame] - Coalesce at animation-frame cadence instead of
 *                               microtask cadence. For mousemove/wheel/drag paths.
 */
```

## 4. What does not change

- The persisted annotation schema — no version bump, no migration.
- `Config`, `ImageDetails` (including `renderWidth`/`renderHeight`),
  `AnalysisMarker`, `HarmonicSet`, `CursorPosition`, `zoom`, `margins`,
  `selection`.
- Storage keys, TTL semantics, and trainer/student context detection.
