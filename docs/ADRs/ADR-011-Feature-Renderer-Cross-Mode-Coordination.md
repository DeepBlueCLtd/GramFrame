# ADR-011: Feature Renderer for Cross-Mode Coordination

## Status
Accepted

## Context
GramFrame modes needed to coordinate persistent features that should remain visible across mode switches, while maintaining mode-specific rendering independence.

## Decision
Implement a FeatureRenderer class in src/core/FeatureRenderer.js to coordinate cross-mode feature visibility and persistence.

## Rationale
- **Separation of Concerns**: Mode-specific rendering stays in mode classes
- **Feature Persistence**: Some features should persist across mode changes
- **Coordination**: Central coordination of overlapping visual elements
- **Flexibility**: Easy to add new persistent features without modifying all modes

## Consequences
### Positive
- Clean separation between mode-specific and persistent features
- Easy to manage cross-mode feature visibility
- Extensible architecture for new persistent features
- Better user experience with consistent feature persistence

### Negative
- Additional architectural layer to manage
- Need to coordinate between FeatureRenderer and mode classes
- Potential for conflicts between persistent and mode-specific features

## Implementation
FeatureRenderer coordinates:
- Analysis markers, harmonic sets and doppler curves, all of which stay visible
  in every mode once placed
- A single clear-and-redraw pass over the shared cursor group, so modes never
  fight over what is on screen
- Redrawing after mode switches, restyling, keyboard moves and viewport changes

Key methods (as implemented in `src/core/FeatureRenderer.js`):

- `renderAllPersistentFeatures()` — clear the cursor group, then ask each mode
  that has features to draw its own
- `hasAnalysisFeatures()` / `hasHarmonicFeatures()` / `hasDopplerFeatures()` —
  whether that mode currently has anything to draw
- `renderCurrentModeCursor()` — delegate transient cursor rendering to the
  active mode

The renderer holds no feature state of its own: it reads component state to
decide who has something to draw, and each mode implements
`renderPersistentFeatures()`. There is no per-mode visibility filtering — every
feature is drawn in every mode, which is the point of the cross-mode
coordination.

Integration with mode switching:

```javascript
// _switchMode (src/main.js), abridged
this.currentMode.cleanup()
this.currentMode.deactivate()
this.currentMode = this.modes[mode]
this.currentMode.activate()
this.featureRenderer.renderAllPersistentFeatures()
```

## Related Decisions
- ADR-008: Modular Mode System Architecture
- ADR-004: Centralized State Management