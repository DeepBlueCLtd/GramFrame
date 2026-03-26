# Adding Graphical Features

**Last updated**: 2026-03-26

This guide helps developers identify the key source files and patterns involved when adding new visual features (overlays, annotations, indicators) to GramFrame.

## Code Area Map

When adding a new graphical feature, you will likely need to work with these files:

| File | Purpose | When to Touch |
|------|---------|---------------|
| `src/rendering/cursors.js` | Main render entry point; clears and redraws all features | Adding a new visual element type |
| `src/utils/svg.js` | SVG element creation helpers (`createSVGLine`, `createSVGText`, `createSVGCircle`) | Creating new SVG shapes |
| `src/utils/coordinates.js` | Coordinate transforms (screen → SVG → image → data) | Positioning elements on the spectrogram |
| `src/core/FeatureRenderer.js` | Cross-mode feature visibility coordinator | Feature needs to persist across mode switches |
| `src/core/events.js` | Mouse event handling and coordinate conversion | Feature responds to mouse interactions |
| `src/modes/BaseMode.js` | Mode lifecycle and render hooks | Feature is mode-specific |
| `src/modes/ModeFactory.js` | Mode registration | Adding an entirely new mode |

## Coordinate Transform Guide

GramFrame uses four coordinate systems. Understanding the chain is essential for correct positioning. See [ADR-002](ADRs/ADR-002-Multiple-Coordinate-Systems.md).

```
Screen Coords ──→ SVG Coords ──→ Image Coords ──→ Data Coords
(browser pixels)   (viewBox)      (natural pixels)  (time/freq)
```

### The Transform Chain

1. **Screen → SVG** (`src/utils/coordinates.js` → `screenToSVGCoordinates`)
   - Input: pixel position relative to the SVG element's bounding rect
   - Output: position in SVG viewBox coordinate space
   - Uses `viewBox` width/height ratio for scaling

2. **SVG → Image** (`src/core/events.js` → `screenToDataWithZoom`)
   - Subtracts margin offsets (`margins.left`, `margins.top`)
   - Accounts for zoom level (scaled image position and dimensions)
   - Output: position relative to the spectrogram image's natural dimensions

3. **Image → Data** (`src/utils/coordinates.js` → `imageToDataCoordinates`)
   - Input: pixel position on the natural image
   - Output: `{freq, time}` in domain units
   - X-axis maps to frequency, Y-axis maps to time (inverted: Y=0 is top)
   - Rate acts as a frequency divider: `freq = rawFreq / rate`

### Converting Data Coords Back to SVG

For rendering, you often need the reverse: data → SVG. This pattern appears in `src/rendering/cursors.js`:

```javascript
const margins = instance.state.margins
const { naturalWidth, naturalHeight } = instance.state.imageDetails
const { timeMin, timeMax, freqMin, freqMax } = instance.state.config

// Data → SVG position
const timeRatio = (point.time - timeMin) / (timeMax - timeMin)
const freqRatio = (point.freq - freqMin) / (freqMax - freqMin)
const svgX = margins.left + freqRatio * naturalWidth
const svgY = margins.top + (1 - timeRatio) * naturalHeight
```

Note the `(1 - timeRatio)` — time increases upward in data space but Y increases downward in SVG space.

## Adding a Feature to an Existing Mode

If your feature belongs to an existing mode (e.g., a new annotation type in Analysis mode):

1. **Store state** — Add fields to the mode's `static getInitialState()` method
2. **Handle interaction** — Override `handleMouseDown`/`handleMouseMove`/`handleMouseUp` to capture user input
3. **Render** — Add drawing logic to `renderPersistentFeatures()` (for saved features) or `renderCursor()` (for live indicators)
4. **Create SVG elements** using utilities from `src/utils/svg.js`, and append them to `instance.cursorGroup`

### Example Pattern (from Doppler mode)

```javascript
// In renderPersistentFeatures():
const circle = createSVGCircle(svgX, svgY, 3, 'my-feature-class')
circle.setAttribute('fill', color)
instance.cursorGroup.appendChild(circle)
```

## Adding a New Mode

To add an entirely new mode:

1. **Create directory**: `src/modes/mymode/MyMode.js`
2. **Extend BaseMode**: Override lifecycle methods (`activate`, `deactivate`, `handleMouseMove`, etc.)
3. **Define initial state**: Implement `static getInitialState()` returning your mode's state fields
4. **Register in ModeFactory**: Add a `case` in `ModeFactory.createMode()` switch statement
5. **Import in state.js**: Add your mode's `getInitialState()` call in `buildModeInitialState()`
6. **Add mode button**: Update UI components to include the new mode button

See [ADR-008](ADRs/ADR-008-Modular-Mode-System.md) for the mode system rationale.

## Cross-Mode Feature Persistence

If your feature should remain visible when the user switches to a different mode (like analysis markers visible in harmonics mode):

1. Add a feature check in `FeatureRenderer` (e.g., `hasMyFeatures()`)
2. Call your mode's `renderPersistentFeatures()` from `FeatureRenderer.renderAllPersistentFeatures()`

See [ADR-011](ADRs/ADR-011-Feature-Renderer-Cross-Mode-Coordination.md).

## SVG Rendering Tips

- All SVG elements go into `instance.cursorGroup` — this group is cleared and redrawn on every render cycle
- Use CSS classes (not inline styles where possible) for consistent appearance
- The SVG viewBox matches the image's natural dimensions plus margins
- Margins: left=60px, top=15px, right=15px, bottom=50px (from `state.margins`)

## Related Documentation

- [Tech-Architecture.md](Tech-Architecture.md) — Full system architecture
- [ADR-001: SVG-Based Rendering](ADRs/ADR-001-SVG-Based-Rendering.md)
- [ADR-002: Multiple Coordinate Systems](ADRs/ADR-002-Multiple-Coordinate-Systems.md)
- [ADR-008: Modular Mode System](ADRs/ADR-008-Modular-Mode-System.md)
- [ADR-011: Feature Renderer Cross-Mode Coordination](ADRs/ADR-011-Feature-Renderer-Cross-Mode-Coordination.md)
