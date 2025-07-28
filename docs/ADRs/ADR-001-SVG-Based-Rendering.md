# ADR-001: SVG-Based Rendering Architecture

## Status
Accepted

## Context
GramFrame needed a rendering system for precise positioning and scaling of cursors and overlays on spectrograms. The initial consideration was between HTML5 Canvas and SVG for the rendering layer.

## Decision
Use SVG for all visual overlays and interactions rather than HTML5 Canvas.

## Rationale
- **Precise Positioning**: SVG provides exact coordinate control needed for spectrogram analysis
- **Scalability**: Vector graphics scale without quality loss across different display sizes
- **DOM Integration**: SVG elements can be styled with CSS and manipulated with standard DOM APIs
- **Responsive Design**: SVG viewBox system naturally supports responsive layouts
- **Interactive Elements**: SVG elements can receive mouse events individually
- **Accessibility**: SVG provides better screen reader support than Canvas

## Consequences
### Positive
- Clean separation between static spectrogram image and interactive overlays
- CSS styling capabilities for visual elements (crosshairs, markers, harmonics)
- Individual event handling per visual element
- Seamless integration with responsive design patterns
- Better performance for complex overlays with many interactive elements

### Negative
- More complex coordinate transformation logic required
- Need to handle SVG namespace properly (`setAttribute` instead of `className`)
- Additional complexity in managing SVG DOM elements

## Implementation
Implemented in Phase 3 (Task 3.1) with comprehensive coordinate transformation system:
- `_screenToSVGCoordinates()` - screen pixels to SVG coordinates  
- `_svgToDataCoordinates()` - SVG coordinates to data space
- `_dataToSVGCoordinates()` - data coordinates to SVG space

## Related Decisions
- ADR-002: Multiple Coordinate Systems
- ADR-003: Responsive Design with ResizeObserver