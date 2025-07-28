# ADR-006: Hot Module Reload Support with State Preservation

## Status
Accepted

## Context
During development, developers need rapid feedback cycles. Traditional page reloads lose component state, making development of interactive features time-consuming and frustrating.

## Decision
Implement Hot Module Reload (HMR) support using Vite's `import.meta.hot` API with state preservation across reloads.

## Rationale
- **Developer Experience**: Preserve component state during code changes
- **Rapid Iteration**: Faster development cycles for interactive features
- **State Debugging**: Maintain complex state during development
- **Modern Tooling**: Leverage Vite's built-in HMR capabilities

## Consequences
### Positive
- Significantly faster development cycles
- Ability to test complex state scenarios without manual recreation
- Better developer experience and productivity
- Preserved state listeners across reloads

### Negative
- Additional complexity in module initialization
- HMR-specific code in production bundle (though minimal)
- Potential edge cases with state preservation

## Implementation
HMR implementation in src/index.js:
```javascript
// HMR support with state preservation
if (import.meta.hot) {
  import.meta.hot.accept('./main.js', (newModule) => {
    // Preserve existing state listeners during hot reload
    console.log('🔥 Hot reloading GramFrame with state preservation')
    
    // Re-initialize components while preserving state
    const instances = GramFrame.getInstances()
    instances.forEach(instance => {
      const currentState = instance.getState()
      // Preserve and restore state across reload
    })
  })
}
```

Features:
- State listener preservation across reloads
- Component re-initialization with existing state
- Console logging for development feedback
- Graceful fallback for production builds

## Related Decisions
- ADR-004: Centralized State Management with Listener Pattern
- ADR-010: Unminified Production Build