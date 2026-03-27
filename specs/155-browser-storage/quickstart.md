# Quickstart: Store User Contributions in Browser Storage

**Feature**: 155-browser-storage
**Date**: 2026-03-27

## What This Feature Does

GramFrame automatically saves and restores user annotations (analysis markers, harmonic sets, and doppler curves) using the browser's built-in storage. Trainers get permanent persistence; students get session-scoped persistence that clears when the browser closes.

## Key Implementation Points

### 1. New Module: `src/core/storage.js`

Single new file responsible for all persistence logic:
- `detectUserContext()` — checks for "ANALYSIS" link to determine trainer vs student
- `getStorage()` — returns `localStorage` or `sessionStorage` based on context
- `buildStorageKey(instanceIndex)` — constructs namespaced key from pathname
- `saveAnnotations(state, instanceIndex)` — extracts and serialises annotation data
- `loadAnnotations(instanceIndex)` — deserialises and validates stored data
- `clearAnnotations(instanceIndex)` — removes storage entry for current page

### 2. Integration in `src/main.js`

Two integration points in the GramFrame constructor:
- **Restore**: After mode infrastructure is initialised, load saved state and merge into `this.state` before the first render
- **Save**: Register a state listener that calls `saveAnnotations()` on every state change

### 3. Clear Gram Button in `src/components/UIComponents.js`

- Rendered only on trainer pages (same "ANALYSIS" link detection)
- Calls `clearAnnotations()` and resets component state
- Positioned in the existing button/controls area

### 4. Tests in `tests/storage.spec.ts`

Playwright tests covering:
- Annotations persist across page reload (trainer context)
- Annotations cleared on new session (student context)
- Clear gram button removes stored data
- Graceful degradation when storage unavailable
- Schema version mismatch handling

## What NOT to Change

- No changes to mode implementations (AnalysisMode, HarmonicsMode, DopplerMode)
- No changes to FeatureRenderer
- No changes to the HTML config table format
- No changes to coordinate systems or SVG rendering
- No changes to the state structure (annotations are extracted for storage, not the full state)

## Development Workflow

```bash
yarn dev          # Start dev server, test manually with debug.html
yarn typecheck    # Validate JSDoc types
yarn test         # Run all Playwright tests
yarn build        # Verify production build
```
