# ADR-004: Centralized State Management with Listener Pattern

## Status
Accepted

## Context
GramFrame needs to coordinate state between multiple UI components (LEDs, diagnostics, mode buttons) and external systems. A clear state management approach was needed to prevent inconsistencies and enable external integration.

## Decision
Implement centralized state management with a listener pattern for state change notifications.

## Rationale
- **Single Source of Truth**: Centralized state prevents inconsistencies
- **External Integration**: Listener pattern allows external systems to react to state changes  
- **Debugging**: All state changes flow through a single point
- **Maintainability**: Clear separation between state management and UI updates
- **Extensibility**: Easy to add new listeners without modifying core logic

## Consequences
### Positive
- Consistent state across all UI components
- Easy integration with external systems (debug panels, analytics)
- Clear data flow and debugging capabilities
- Loose coupling between state and UI components

### Negative
- Additional complexity in state update logic
- Need to manage listener lifecycle properly
- Potential performance impact with many listeners

## Implementation
Core state management implemented in src/core/state.js — free functions over an
explicit listener array, not methods on a store object:

```javascript
// src/core/state.js (abridged)
export function createInitialState() {
  return JSON.parse(JSON.stringify(initialState))
}

export function notifyStateListeners(state, listeners) {
  // Deep copy so a listener cannot mutate component state
  const stateCopy = JSON.parse(JSON.stringify(state))
  listeners.forEach(listener => {
    try {
      listener(stateCopy)
    } catch (error) {
      console.error('Error in state listener:', error)
    }
  })
}
```

Each instance owns a `stateListeners` array. Listeners added through the public
API (`GramFrame.addStateListener`) are also held in a module-level global
registry so they attach to instances created later.

State structure includes:
- Component metadata (version, timestamp, instance id)
- Current mode, previous mode and rate
- Cursor position, selection and drag state
- Image details, display dimensions, margins, zoom and expand state
- Mode-specific slices contributed by each mode's `getInitialState()`
  (analysis, harmonics, doppler, pan)

## Related Decisions
- ADR-006: Hot Module Reload Support
- ADR-008: Modular Mode System Architecture