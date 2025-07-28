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
- Analysis mode persistent markers that remain visible in other modes
- Cross-mode feature visibility rules
- Feature lifecycle management (create, update, destroy)
- Integration with mode switching logic

Key methods:
- `renderPersistentFeatures()` - Render features that persist across modes
- `updateFeatureVisibility()` - Control feature visibility per mode
- `clearModeSpecificFeatures()` - Clean up when switching modes
- `coordinateFeatures()` - Resolve conflicts between features

Integration with mode system:
```javascript
// Mode switching includes feature coordination
_switchMode(newMode) {
  this.currentMode.deactivate()
  this.featureRenderer.clearModeSpecificFeatures()
  this.currentMode = this.modes[newMode]
  this.currentMode.activate()
  this.featureRenderer.renderPersistentFeatures()
}
```

## Related Decisions
- ADR-008: Modular Mode System Architecture
- ADR-004: Centralized State Management