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
Core state management implemented in src/core/state.js:
```javascript
const stateListeners = []

// State listener registration
addStateListener(listener) {
  stateListeners.push(listener)
}

// State change notification
_notifyStateListeners() {
  const stateSnapshot = { ...this.state }
  stateListeners.forEach(listener => {
    try {
      listener(stateSnapshot)
    } catch (error) {
      console.error('State listener error:', error)
    }
  })
}
```

State structure includes:
- Component metadata (version, timestamp)
- Current mode and rate settings
- Cursor position and interaction state
- Image details and display dimensions
- Mode-specific state (harmonics, drag state)

## Related Decisions
- ADR-006: Hot Module Reload Support
- ADR-008: Modular Mode System Architecture