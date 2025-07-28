# ADR-003: Responsive Design with ResizeObserver

## Status
Accepted

## Context
GramFrame components need to adapt to container size changes dynamically. Traditional window resize events are insufficient as containers can change size without window resizing (e.g., sidebar collapse, flexbox changes).

## Decision
Use ResizeObserver API for responsive behavior rather than window resize events.

## Rationale
- **Container-Aware**: ResizeObserver monitors the actual component container, not just the window
- **Performance**: More efficient than polling or window resize event handling
- **Accurate**: Detects container changes that don't trigger window resize events
- **Modern Standard**: Well-supported browser API designed for this use case

## Consequences
### Positive
- Components respond accurately to container size changes
- Better performance than alternative approaches
- Works in complex layouts (flexbox, grid, nested containers)
- Maintains aspect ratio and coordinate accuracy during resize

### Negative
- Requires polyfill for older browsers (though well-supported now)
- Additional complexity in setup and cleanup
- Need to handle rapid resize events properly

## Implementation
Implemented in Phase 3 with proper lifecycle management:
```javascript
// Setup in constructor
this._setupResizeObserver()

// ResizeObserver setup with debouncing
_setupResizeObserver() {
  this.resizeObserver = new ResizeObserver(entries => {
    // Handle resize with coordinate system updates
    this._handleResize()
  })
  this.resizeObserver.observe(this.container)
}

// Cleanup in destroy method
destroy() {
  if (this.resizeObserver) {
    this.resizeObserver.disconnect()
  }
}
```

## Related Decisions
- ADR-001: SVG-Based Rendering Architecture
- ADR-002: Multiple Coordinate Systems
- ADR-004: Centralized State Management