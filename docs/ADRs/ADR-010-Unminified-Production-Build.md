# ADR-010: Unminified Production Build for Field Debugging

## Status
Accepted

## Context
GramFrame is deployed in field environments where debugging production issues is critical. Minified code makes troubleshooting extremely difficult for field engineers.

## Decision
Configure build system to output unminified code in production builds using `minify: false` in vite.config.js.

## Rationale
- **Field Debugging**: Engineers need readable code for troubleshooting in production
- **Error Diagnosis**: Stack traces and console errors are more meaningful with unminified code
- **Support Efficiency**: Faster issue resolution with readable production code
- **Educational Value**: Field engineers can learn from readable implementation

## Consequences
### Positive
- Significantly easier debugging in production environments
- More useful error messages and stack traces
- Better support experience for field engineers
- Reduced time to resolve production issues

### Negative
- Larger bundle size (though acceptable for the benefits)
- Slightly slower load times
- Production code is easier to reverse engineer

## Implementation
Vite configuration in vite.config.js:
```javascript
export default defineConfig({
  build: {
    minify: false,  // Keep code readable for field debugging
    rollupOptions: {
      output: {
        format: 'es'
      }
    }
  }
})
```

This ensures that:
- Variable names are preserved
- Code structure remains readable
- Comments may be preserved (depending on other settings)
- Stack traces point to meaningful line numbers

## Related Decisions
- ADR-006: Hot Module Reload Support
- ADR-007: JSDoc TypeScript Integration