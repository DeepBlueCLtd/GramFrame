# ADR-007: JSDoc TypeScript Integration for Type Safety

## Status
Accepted

## Context
GramFrame needed type safety for better development experience and maintainability without the complexity of TypeScript compilation or build process changes.

## Decision
Use JSDoc annotations with TypeScript's `checkJs` mode for type checking without transpilation.

## Rationale
- **Type Safety**: Get TypeScript's type checking benefits
- **No Build Changes**: No transpilation or compilation step required
- **IDE Support**: Enhanced IntelliSense and autocomplete
- **Documentation**: JSDoc comments serve as inline documentation
- **Gradual Adoption**: Can be applied incrementally to existing codebase

## Consequences
### Positive
- Enhanced IDE support with autocomplete and type checking
- Better maintainability with documented interfaces
- Type safety without runtime overhead
- Self-documenting code with comprehensive JSDoc annotations

### Negative
- Additional annotation overhead during development
- Some TypeScript strict mode limitations
- Need to maintain type definitions alongside code

## Implementation
TypeScript configuration in tsconfig.json:
```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "noEmit": true,
    "strict": true,
    "target": "ES2017",
    "moduleResolution": "node"
  }
}
```

Comprehensive type definitions in src/types.js:
- 20+ JSDoc `@typedef` definitions
- Core data structures (GramFrameState, CursorPosition, HarmonicData)
- Configuration objects (Config, ImageDetails, AxesConfig)
- Coordinate systems (DataCoordinates, SVGCoordinates)
- Function types (StateListener, MouseEventHandler)

Method-level annotations throughout codebase:
```javascript
/**
 * Convert screen coordinates to SVG coordinates
 * @param {number} screenX - Screen X coordinate
 * @param {number} screenY - Screen Y coordinate  
 * @returns {SVGCoordinates} SVG coordinates
 */
_screenToSVGCoordinates(screenX, screenY) {
  // Implementation...
}
```

## Related Decisions
- ADR-004: Centralized State Management
- ADR-008: Modular Mode System Architecture