# ADR-012: Scale-Adjusted Font Sizing for Axis Labels

## Status
Accepted

## Context
Axis text labels were using fixed SVG font-size values that scaled with the SVG viewBox. When the component was resized, labels became unreadably small or disappeared entirely, compromising usability.

## Decision
Implement scale-adjusted font sizing that maintains consistent visual text size regardless of SVG scaling by calculating font size based on the viewBox-to-display size ratio.

## Rationale
- **Usability**: Text labels must remain readable at all zoom levels
- **Accessibility**: Consistent text size improves accessibility
- **Professional Appearance**: Maintains visual quality across different display sizes
- **Responsive Design**: Essential for proper responsive behavior

## Consequences
### Positive
- Text labels remain readable during component resize operations
- Consistent visual appearance across different screen sizes and zoom levels
- Better user experience with reliable axis labeling
- Professional appearance maintained at all scales

### Negative
- Additional complexity in font size calculations
- Performance overhead from dynamic font size computation
- Need to handle edge cases with invalid dimensions

## Implementation
Scale calculation function in src/rendering/axes.js:
```javascript
function calculateScaleAdjustedFontSize(instance) {
  const baseFontSize = 10
  const viewBox = instance.svg.getAttribute('viewBox')
  if (!viewBox) return baseFontSize
  
  const [, , viewBoxWidth] = viewBox.split(' ').map(Number)
  const displayWidth = parseFloat(instance.svg.getAttribute('width') || '0')
  
  if (displayWidth === 0 || viewBoxWidth === 0) return baseFontSize
  
  // Scale factor: if viewBox is larger than display, text would be smaller
  const scaleFactor = viewBoxWidth / displayWidth
  
  // Adjust font size inversely to maintain visual consistency
  return baseFontSize * scaleFactor
}
```

Applied to both time axis (vertical labels) and frequency axis (horizontal labels):
- Dynamic font size calculation on each render
- Proper error handling for edge cases
- Integration with existing axis rendering system

## Related Decisions
- ADR-001: SVG-Based Rendering Architecture
- ADR-003: Responsive Design with ResizeObserver
- ADR-002: Multiple Coordinate Systems