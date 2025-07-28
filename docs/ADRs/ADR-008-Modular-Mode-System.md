# ADR-008: Modular Mode System Architecture

## Status
Accepted

## Context
GramFrame needed to support multiple analysis modes (Analysis, Harmonics, Doppler) with different behaviors, interactions, and rendering requirements. The initial monolithic approach was becoming unwieldy.

## Decision
Implement a modular mode system using polymorphic mode classes with a common BaseMode interface and factory pattern for mode instantiation.

## Rationale
- **Separation of Concerns**: Each mode handles its own logic independently
- **Extensibility**: Easy to add new modes without modifying existing code
- **Maintainability**: Mode-specific code is isolated and easier to debug
- **Polymorphism**: Common interface allows uniform mode switching
- **Factory Pattern**: Centralized mode creation with error handling

## Consequences
### Positive
- Clean separation between different analysis modes
- Easy to extend with new modes
- Better code organization and maintainability
- Uniform mode interface simplifies main component logic

### Negative
- Additional architectural complexity
- More files and classes to manage
- Need to coordinate state between modes

## Implementation
BaseMode interface in src/modes/BaseMode.js:
```javascript
export class BaseMode {
  // Lifecycle methods
  activate() {}
  deactivate() {}
  
  // Event handling
  handleClick(event, coords) {}
  handleMouseDown(event, coords) {}
  handleMouseMove(event, coords) {}
  handleMouseUp(event, coords) {}
  handleContextMenu(event, coords) {}
  
  // Rendering
  render(svg) {}
  updateCursor(coords) {}
  updateReadout(coords) {}
  updateLEDs(coords) {}
  
  // State management
  resetState() {}
  getStateSnapshot() {}
}
```

Mode implementations:
- `src/modes/analysis/AnalysisMode.js` - Cross-hair analysis and drag-based harmonics
- `src/modes/harmonics/HarmonicsMode.js` - Harmonic frequency analysis  
- `src/modes/doppler/DopplerMode.js` - Doppler speed calculation

Factory pattern in src/modes/ModeFactory.js:
- Centralized mode instantiation
- Error handling with fallback to BaseMode
- Mode validation and available modes enumeration

## Related Decisions
- ADR-004: Centralized State Management
- ADR-011: Feature Renderer for Cross-Mode Coordination