# Phase 1 Data Model: Expand Image Toggle

This feature is UI/layout state, not persisted data. The "model" is the in-memory state
added to a GramFrame instance and the derived layout values computed at toggle/resize.

## Entities

### ImageDetails (extended)

Existing object at `state.imageDetails` (`src/core/state.js:46-50`), extended with
rendered dimensions.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `naturalWidth` | number | 0 | Load-time (capped) image width. **Data-mapping reference + landscape test.** Unchanged by expand. |
| `naturalHeight` | number | 0 | Load-time (capped) image height. Unchanged by expand. |
| `renderWidth` | number | = `naturalWidth` | Width at which the image/axes/overlay are currently drawn (base, before zoom). Set to fill-width when expanded. |
| `renderHeight` | number | = `naturalHeight` | Height at which the image/axes/overlay are currently drawn (base, before zoom). Set to fill-height when expanded. |

**Validation / invariants**:
- `renderWidth`/`renderHeight` default to the natural values and MUST be restored to them
  exactly on collapse (SC-006).
- All data↔pixel transforms use `renderWidth`/`renderHeight`; only the landscape test and
  load-time scaling use `naturalWidth`/`naturalHeight`.
- `isLandscape` is derived, not stored: `naturalWidth > naturalHeight`.

### Expand state

New per-instance flag. Lives on `state` (in-memory; NOT written to browser storage).

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `imageExpanded` | boolean | `false` | Whether the image is currently expanded. |

**State transitions**:

```text
            click toggle (landscape only)
 collapsed ───────────────────────────────▶ expanded
   ▲                                            │
   │            click toggle                     │
   └────────────────────────────────────────────┘

 collapsed: renderWidth/Height = naturalWidth/Height
 expanded:  renderWidth = availableWidth, renderHeight = availableHeight (recomputed on resize)
```

- No transition is offered for portrait/square images (toggle absent).
- `imageExpanded` is never persisted and resets to `false` on reload.

## Derived (computed, not stored)

Recomputed at toggle time and on every resize while expanded:

| Value | Formula | Source |
|-------|---------|--------|
| `isLandscape` | `naturalWidth > naturalHeight` | `imageDetails` |
| `availableWidth` | GramFrame inner image-region width (component width minus left+right axis margins) | main-panel/container bounds |
| `availableHeight` | `viewportBottom − imageRegionTop − bottomGap` (gap ≈ 16px) | `getBoundingClientRect()` + `window.innerHeight` |

## Relationships to existing state

- **`state.zoom.level`** (`state.js:67-70`): multiplies the base render size. Expand sets
  the base (`renderWidth`/`renderHeight`); zoom applies `level` on top. They compose
  multiplicatively and remain independent (FR-012).
- **`state.config`** (`freqMin/Max`, `timeMin/Max`): unchanged by expand. The data range
  maps across whatever render size is active — this is what preserves coordinate fidelity.
- **Persistent features** (markers/harmonics/doppler): store data coordinates; re-rendered
  through `FeatureRenderer` after a toggle so they re-resolve against the new render size.
