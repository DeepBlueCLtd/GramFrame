# ADR-007: JSDoc TypeScript Integration for Type Safety

## Status
Accepted — **and, since spec 167, actually in force.**

For most of this ADR's life `strict: true` stood in `tsconfig.json` beside
`"noImplicitAny": false`, `"strictNullChecks": false` and
`"strictPropertyInitialization": false`. The three flags that catch the bugs a
DOM-heavy codebase actually has were the three that were off, so `yarn typecheck`
passing said considerably less than the Quality Gates claimed (GF-32, the
findings register's only High-severity item).

All three are now enabled and `tsconfig.json` carries no strict-family disable.
The burn-down, measured under a temporary root overlay with all three on:

| Stage | Errors |
|---|---|
| Start (commit `b98d3f2`) | **540** |
| After the implicit-any parameters, variables and index accesses | 517 |
| After the mode/state registration seam (20 × `TS2783`) | 491 |
| After the `table.js` split | 469 |
| After the mode capability seams | 455 |
| After typing the 46 class fields — `noImplicitAny` **on** | 400 |
| After explicit initialization (43 × `TS2564` → 0) | 332 |
| After collapsing the duplicate `GramFrame` typedef | 32 |
| End — `strictNullChecks` and `strictPropertyInitialization` **on** | **0** |

Two of those steps did most of the work, and neither was a typing exercise:

- **Explicit initialization.** `strictPropertyInitialization` was unreachable
  while `initializeDOMProperties(this)` assigned the fields from inside a helper
  and the constructor could return early. Each step now returns what it built
  and the constructor adopts it.
- **Collapsing the duplicate `GramFrame` typedef.** `types.js` restated the
  class as ~70 optional, nullable members, prefaced "this interface may be
  partially initialized during startup". That single second source of truth
  accounted for 300 of the 332 remaining errors. `GramFrame` now resolves to the
  class.

A no-cast rule held throughout: no `@ts-expect-error`, no `@ts-ignore`, and no
`any` introduced to silence a diagnostic. Where a non-null assertion was used,
the invariant that justifies it is stated at the site.

**What this now catches.** Adding `document.querySelector('.nope').classList` to
any `src/` file fails `yarn typecheck`. Before the phase, it passed.

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

As shipped, with no strict-family disables (spec 167, SC-001):

```json
{
  "compilerOptions": {
    "checkJs": true,
    "allowJs": true,
    "noEmit": true,
    "strict": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src/**/*.js", "src/**/*.d.ts"]
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