# Implementation Plan: Store User Contributions in Browser Storage

**Branch**: `155-browser-storage` | **Date**: 2026-03-27 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/155-browser-storage/spec.md`

## Summary

Persist user annotations (cursors, harmonics, dopplers) in browser storage so they survive page navigation and reloads. Trainers get permanent storage (localStorage) while students get session-scoped storage (sessionStorage). Storage type is auto-detected by checking for an "ANALYSIS" link on the page. A "Clear gram" button is provided on trainer pages to reset annotations.

## Technical Context

**Language/Version**: JavaScript (ES2020+, JSDoc-typed, no compilation)
**Primary Dependencies**: None (zero runtime dependencies, Vite for build)
**Storage**: Browser Web Storage API (localStorage / sessionStorage)
**Testing**: Playwright end-to-end tests
**Target Platform**: Browser (file:// and http:// deployments)
**Project Type**: JavaScript library/component (SVG-based spectrogram overlay)
**Performance Goals**: Save within 1 second of annotation change; restore before first paint of annotations
**Constraints**: Must degrade gracefully when storage is unavailable; no external dependencies allowed
**Scale/Scope**: Single-page component, multiple independent instances per page possible

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. SVG-First Rendering | PASS | Storage feature does not affect rendering — annotations are restored into state and rendered via existing SVG pipeline |
| II. Test-First (NON-NEGOTIABLE) | PASS | Playwright tests required for all persistence scenarios (save, restore, clear, degradation) |
| III. Modular Mode Architecture | PASS | Storage module will be a new core utility, not embedded in any mode. State changes flow through existing state management |
| IV. Declarative HTML Configuration | PASS | No changes to HTML config tables. Storage is transparent to page authors |

No gate violations. No complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/155-browser-storage/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── core/
│   ├── state.js              # Existing - state management (add save trigger)
│   ├── FeatureRenderer.js    # Existing - cross-mode rendering (no changes)
│   └── storage.js            # NEW - browser storage adapter
├── modes/
│   ├── analysis/AnalysisMode.js   # Existing - marker state (no changes to mode)
│   ├── harmonics/HarmonicsMode.js # Existing - harmonic sets (no changes to mode)
│   └── doppler/DopplerMode.js     # Existing - doppler state (no changes to mode)
├── components/
│   └── UIComponents.js       # Existing - add Clear gram button
├── main.js                   # Existing - integrate restore on init, save on state change
└── index.js                  # Existing - no changes

tests/
├── storage.spec.ts           # NEW - storage persistence tests
└── helpers/
    └── gram-frame-page.js    # Existing - add storage helpers
```

**Structure Decision**: Single project layout. One new file (`src/core/storage.js`) plus modifications to existing files (`main.js`, `UIComponents.js`). Follows the established `src/core/` pattern for cross-cutting concerns.
