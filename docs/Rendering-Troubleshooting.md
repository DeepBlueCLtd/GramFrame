# Rendering Troubleshooting

**Last updated**: 2026-03-26

This guide helps developers diagnose and fix rendering issues in GramFrame — mispositioned elements, missing overlays, coordinate mismatches, and SVG problems.

## Rendering Pipeline Map

Understanding which files handle what is the first step in narrowing down a rendering bug:

| Subsystem | File | Handles |
|-----------|------|---------|
| Render entry point | `src/rendering/cursors.js` | `updateCursorIndicators()` — clears and redraws all features |
| Feature coordination | `src/core/FeatureRenderer.js` | Cross-mode visibility; delegates to each mode's renderer |
| SVG element creation | `src/utils/svg.js` | `createSVGLine`, `createSVGText`, `createSVGCircle` |
| Coordinate transforms | `src/utils/coordinates.js` | `screenToSVGCoordinates`, `imageToDataCoordinates` |
| Zoom-aware conversion | `src/core/events.js` | `screenToDataWithZoom()` — full pipeline with zoom |
| Viewport and axes | `src/core/viewport.js` | `handleResize()`, `updateAxes()`, zoom operations |
| Mode-specific rendering | `src/modes/*/` | Each mode's `renderPersistentFeatures()` and `renderCursor()` |
| Event triggering | `src/core/events.js` | Mouse handlers that trigger re-renders |

### Render Cycle

Every mouse event or mode switch triggers this sequence:

```
Mouse event / mode switch
    │
    ▼
updateCursorIndicators(instance)
    │
    ├─ cursorGroup.innerHTML = ''    (clear all SVG features)
    │
    └─ featureRenderer.renderAllPersistentFeatures()
         │
         ├─ analysis mode → renderPersistentFeatures()   (markers)
         ├─ harmonics mode → renderPersistentFeatures()  (harmonic sets)
         └─ doppler mode → renderPersistentFeatures()    (curves/markers)
```

## Common Failure Points

### 1. Coordinate Transform Mismatches

**Symptom**: Elements appear in the wrong position — shifted, stretched, or mirrored.

**Likely causes**:

- **Forgetting the Y-axis inversion**: In SVG, Y=0 is at the top. In data space, time=0 is at the bottom. The conversion uses `(1 - timeRatio)`:
  ```javascript
  svgY = margins.top + (1 - timeRatio) * naturalHeight
  ```
  If you see elements vertically flipped, check for a missing `1 -` in the Y calculation.

- **Not accounting for margins**: SVG elements are positioned relative to the viewBox, which includes margin space. Image coordinates start at `(margins.left, margins.top)`, not `(0, 0)`.

- **Rate not applied**: Frequency values are divided by `rate`. If you're computing frequency positions, ensure you use the rate-adjusted value from `imageToDataCoordinates`, or apply `/ rate` yourself.

- **Zoom not accounted for**: When zoomed, the image position and dimensions change. `screenToDataWithZoom()` in `events.js` handles this, but if you're doing manual coordinate math, you need to account for the zoomed image's `x`, `y`, `width`, and `height` attributes.

### 2. SVG ViewBox Issues

**Symptom**: Elements are clipped, invisible, or at wrong scale.

**Likely causes**:

- **ViewBox mismatch**: The SVG viewBox should match the image's natural dimensions plus margins. If the viewBox is wrong, all coordinate math breaks.
- **Elements outside viewBox**: Features rendered outside the viewBox bounds are clipped. Check that computed SVG coordinates fall within the expected range.

### 3. Resize/Redraw Timing

**Symptom**: Elements are correct initially but wrong after resize, or elements briefly appear in wrong positions.

**Likely causes**:

- **Missing ResizeObserver handling**: `setupResizeObserver()` triggers `_handleResize()` when the container changes size. If your feature caches positions, they need to be recalculated on resize.
- **Stale cached dimensions**: If you read `getBoundingClientRect()` once and cache it, the values will be wrong after a resize. Always read dimensions fresh or listen for resize events.

### 4. State-Rendering Sync

**Symptom**: Feature appears to lag, shows stale data, or doesn't update.

**Likely causes**:

- **State modified but `notifyStateListeners` not called**: After changing state, you must call `notifyStateListeners(instance.state, instance.stateListeners)` to broadcast the change.
- **State modified after render**: If state is updated after `updateCursorIndicators` runs, the rendered SVG won't reflect the new state until the next render cycle.
- **Deep-copy timing**: Listeners receive a deep copy of state. If a listener triggers further state changes, those happen on the copy, not on the real state.

### 5. Feature Not Visible Across Modes

**Symptom**: A feature renders in its own mode but disappears when switching to another mode.

**Fix**: Register the feature check in `FeatureRenderer`:
1. Add a `hasMyFeatures()` method
2. Call your mode's `renderPersistentFeatures()` in `renderAllPersistentFeatures()`

See [ADR-011](ADRs/ADR-011-Feature-Renderer-Cross-Mode-Coordination.md).

## Debugging Tips

### Browser DevTools SVG Inspection

1. Right-click on the spectrogram → **Inspect Element**
2. Navigate to the `<svg>` element in the Elements panel
3. Expand `<g>` groups — look for `cursorGroup` containing your features
4. Hover over SVG elements to see their bounding boxes highlighted
5. Check element attributes (`x`, `y`, `cx`, `cy`, `x1`, `y1`, etc.) against expected values

### Using debug.html

The `debug.html` page (served at `/debug.html` during `yarn dev`) provides:

- A live **state display** panel showing the full JSON state
- Real-time updates as you interact with the spectrogram
- Useful for verifying that state changes are happening correctly

To check a rendering issue:
1. Open `debug.html` in the browser
2. Interact with the spectrogram
3. Watch the state JSON update — verify `cursorPosition`, `markers`, etc. have expected values
4. If state is correct but rendering is wrong → the bug is in rendering code
5. If state is wrong → the bug is in event handling or mode logic

### Coordinate Logging

Add temporary logging to trace coordinate transforms:

```javascript
// In events.js → screenToDataWithZoom():
console.log('Screen:', { screenX, screenY })
console.log('SVG:', svgCoords)
console.log('Image:', { imageX, imageY })
console.log('Data:', dataCoords)
```

This shows exactly where in the pipeline a coordinate goes wrong.

### Checking SVG ViewBox

In the browser console:

```javascript
const svg = document.querySelector('.gram-frame-container svg')
console.log('viewBox:', svg.getAttribute('viewBox'))
console.log('bounding rect:', svg.getBoundingClientRect())
```

Compare the viewBox dimensions with the image's natural dimensions + margins.

### Common Margin Values

These are the default margins (from `state.margins`):

| Margin | Value | Purpose |
|--------|-------|---------|
| `left` | 60px | Space for time axis labels |
| `bottom` | 50px | Space for frequency axis labels |
| `right` | 15px | Small right padding |
| `top` | 15px | Small top padding |

All SVG feature positions must account for these offsets.

## Quick Diagnostic Flowchart

```
Feature renders in wrong position?
    │
    ├─ Check: Are coordinates correct in state? (use debug.html)
    │   ├─ No → Bug in event handling (src/core/events.js)
    │   └─ Yes → Bug in rendering (src/rendering/ or mode's render method)
    │
    ├─ Check: Is Y-axis inverted?
    │   └─ Missing (1 - timeRatio) in Y calculation
    │
    ├─ Check: Are margins included?
    │   └─ Missing margins.left / margins.top offset
    │
    └─ Check: Is zoom active?
        └─ Not using zoomed image dimensions from spectrogramImage attributes
```

## Related Documentation

- [Tech-Architecture.md](Tech-Architecture.md) — Full system architecture
- [Adding-Graphical-Features.md](Adding-Graphical-Features.md) — Guide to adding new visual features
- [Component-Strategy.md](Component-Strategy.md) — Component resize and lifecycle strategy
- [ADR-001: SVG-Based Rendering](ADRs/ADR-001-SVG-Based-Rendering.md)
- [ADR-002: Multiple Coordinate Systems](ADRs/ADR-002-Multiple-Coordinate-Systems.md)
