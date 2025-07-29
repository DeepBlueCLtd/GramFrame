# ADR-015: Viewport-Based Zoom Architecture

## Status
Accepted

## Context

During implementation of zoom functionality for the GramFrame spectrogram viewer, we encountered significant challenges with our initial approach of using SVG transforms to scale and position the image. The core problem was maintaining synchronization between three different coordinate spaces:

1. **Data coordinates** (frequency/time values)
2. **Image coordinates** (pixel positions on the spectrogram image) 
3. **SVG coordinates** (screen positions for rendering)

### Issues with Transform-Based Approach

Our initial implementation used SVG transforms on the image element while keeping axes and overlays in the original coordinate system. This created several problems:

- **Coordinate Misalignment**: Analysis markers placed at specific frequencies (e.g., 28.6 Hz) would no longer align with the corresponding image features after zoom
- **Complex Transform Math**: Required intricate calculations to synchronize transformed image coordinates with untransformed overlay coordinates
- **Event Handling Conflicts**: Pan mode interactions conflicted with mode-specific behaviors (e.g., marker creation in Analysis mode)
- **Increasing Complexity**: Each fix revealed new edge cases, creating exponential complexity growth

### Root Cause Analysis

The fundamental issue was that we were retrofitting zoom functionality onto a mature codebase that wasn't designed for coordinate space transformations. The architecture assumed a 1:1 mapping between data coordinates and screen coordinates, which broke when we introduced image scaling.

## Decision

We will implement zoom using a **viewport-based approach** that treats zoom as a window into the data coordinate space, rather than as image transformation.

### Core Principles

1. **Single Coordinate System**: All elements (image, axes, overlays) use the same coordinate system
2. **ViewBox-Based Zoom**: Zoom is achieved by modifying the SVG viewBox to show a smaller portion of the coordinate space
3. **No Image Transforms**: The spectrogram image remains in its original coordinate system
4. **Unified Rendering**: All rendering elements automatically stay aligned since they share the same coordinate space

### Implementation Approach

```javascript
// Original (full view):
svg.setAttribute('viewBox', '0 0 1000 600')

// Zoomed 2x (center portion):
svg.setAttribute('viewBox', '250 150 500 300')
```

## Consequences

### Positive

- **Automatic Alignment**: Image features and overlays stay perfectly synchronized automatically
- **Simplified Coordinate Math**: No complex transform calculations needed
- **Natural SVG Behavior**: Leverages SVG's built-in viewport capabilities
- **Reduced Complexity**: Eliminates the need for coordinate space translations
- **Consistent Event Handling**: Mouse events map directly to data coordinates at any zoom level
- **Maintainable**: Easier to understand, test, and debug

### Negative

- **Implementation Restart**: Requires rewriting the visual zoom logic entirely
- **ViewBox Complexity**: Need to carefully manage viewBox calculations for different zoom levels
- **Clipping Considerations**: Must handle proper clipping of content to axis boundaries
- **Short-term Development Cost**: Time investment to implement the new approach

### Risks and Mitigations

- **Risk**: ViewBox manipulation might affect axis rendering
  - **Mitigation**: Axes will be redrawn for the visible coordinate range, similar to current approach

- **Risk**: Performance implications of frequent viewBox changes
  - **Mitigation**: Modern browsers handle SVG viewBox changes efficiently

## Implementation Notes

1. **Coordinate Transform Functions**: The existing coordinate transformation utilities can remain largely unchanged, as they already handle zoom state properly
2. **State Management**: The zoom state management system can be retained
3. **UI Components**: Pan/zoom buttons and controls can remain as-is
4. **Mode Compatibility**: All modes should continue working without modification since they use the coordinate transformation utilities

## Alternatives Considered

1. **Continue Transform-Based Approach**: Rejected due to increasing complexity and architectural conflicts
2. **Wrapper Component**: Rejected because CSS transforms would not provide proper axis re-rendering
3. **Coordinate System Refactor**: Rejected due to high risk and extensive breaking changes
4. **Accept Limitations**: Rejected as it would not meet functional requirements

## References

- Initial zoom implementation attempts in Phase 6
- [ADR-002-Multiple-Coordinate-Systems](ADR-002-Multiple-Coordinate-Systems.md) - Original coordinate system design
- [Zoom-Requirements.md](../Zoom-Requirements.md) - Functional requirements for zoom feature