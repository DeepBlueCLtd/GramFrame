# ADR-002: Multiple Coordinate Systems Architecture

## Status
Accepted

## Context
GramFrame operates across different coordinate spaces: screen pixels, SVG coordinates, image coordinates, and data coordinates (time/frequency). A robust transformation system was needed to maintain precision across these different coordinate systems.

## Decision
Implement a comprehensive coordinate transformation system with dedicated conversion methods between all coordinate spaces.

## Rationale
- **Precision**: Accurate positioning requires proper coordinate transformations
- **Maintainability**: Clear separation of coordinate systems prevents confusion
- **Flexibility**: Different components can work in their natural coordinate space
- **Debugging**: Explicit transformations make coordinate issues easier to trace

## Consequences
### Positive
- Clean abstraction between different coordinate spaces
- Accurate positioning across all zoom levels and screen sizes
- Easy to add new coordinate systems or modify existing ones
- Better separation of concerns between rendering and data logic

### Negative
- Additional complexity in coordinate calculations
- Performance overhead from multiple transformations
- Need to carefully track which coordinate system is being used

## Implementation
Core transformation methods implemented in main.js:
- `_screenToSVGCoordinates(screenX, screenY)` - Browser screen to SVG space
- `_svgToDataCoordinates(svgX, svgY)` - SVG space to data values
- `_imageToDataCoordinates(imageX, imageY)` - Image-relative to data values  
- `_dataToSVGCoordinates(freq, time)` - Data values to SVG space
- `_svgToScreenCoordinates(svgX, svgY)` - SVG space back to screen

Each method includes proper bounds checking and margin handling.

## Related Decisions
- ADR-001: SVG-Based Rendering Architecture
- ADR-003: Responsive Design with ResizeObserver