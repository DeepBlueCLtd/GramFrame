# State Contract: Expand Image Toggle

Additive changes to GramFrame instance state. No existing field is removed or repurposed.

## Added fields

```js
// src/core/state.js — imageDetails (extended)
imageDetails: {
  naturalWidth: 0,    // existing — unchanged; data-mapping reference + landscape test
  naturalHeight: 0,   // existing — unchanged
  renderWidth: 0,     // NEW — base render width (defaults to naturalWidth on load)
  renderHeight: 0     // NEW — base render height (defaults to naturalHeight on load)
}

// src/core/state.js — instance state (new flag)
imageExpanded: false  // NEW — in-memory only, default false, never persisted
```

## Contract rules

1. On image load, `renderWidth/renderHeight` MUST be initialised equal to
   `naturalWidth/naturalHeight`.
2. `imageExpanded` defaults to `false` and is NOT written to or read from any browser
   storage (independent of feature 155).
3. When `imageExpanded` is `true`, `renderWidth/renderHeight` hold the computed
   available-space dimensions; when `false`, they equal `naturalWidth/naturalHeight`.
4. All consumers computing data↔pixel ratios MUST read `renderWidth/renderHeight`:
   - `updateSVGLayout` (viewBox, image element, clip rects)
   - `renderAxes` (axis span)
   - `imageToDataCoordinates` (divisor)
   - `cursors.js` data→pixel placement
   - `events.js` screen→data zoom normalization (base = render size)
5. `state.zoom.level` continues to multiply the rendered size; expand and zoom compose
   and remain independent.
6. State broadcast: existing deep-copy-before-listener behaviour is preserved; the new
   fields are plain numbers/boolean and serialize trivially. External listeners may read
   `imageExpanded` and `imageDetails.renderWidth/Height`.

## Optional API surface (nice-to-have, not required for MVP)

If exposed via `src/api/`:

| Method | Behaviour |
|--------|-----------|
| `getExpandState()` | returns current `imageExpanded` boolean |
| `setExpandState(bool)` | programmatically expand/collapse (no-op for portrait images) |

These mirror the toggle button and are gated by the same landscape rule.
