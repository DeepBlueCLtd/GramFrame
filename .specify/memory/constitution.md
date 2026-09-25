<!-- Sync Impact Report
  Version change: 1.0.0 → 1.0.1 (corrections of fact, from the 2026-09 prompt audit)
  Modified principles:
    - III. Modular Mode Architecture — names all five modes (Pan and Sidebands
      were missing) and points at modeRoster.js as the one list
    - IV. Declarative HTML Configuration — the first row holds the source: an
      <img>, or the <audio> element of an audio-sourced instance (spec 168)
  Modified sections: Quality Gates — the list CI actually runs (lint, hygiene,
    coverage, smoke, standalone build, bundle floor, site checks), not three of it
  Added sections: none
  Removed sections: none
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ updated in the same change (Technical
      Context and Source Code now state the repository's constants)
    - .specify/templates/spec-template.md ✅ no changes needed
    - .specify/templates/tasks-template.md ✅ no changes needed
    - .specify/templates/checklist-template.md ✅ no changes needed
  Follow-up TODOs: none

  1.0.0 (2026-03-26): initial ratification — Core Principles (4), Technical
  Constraints, Quality Gates, Governance.
-->

# GramFrame Constitution

## Core Principles

### I. SVG-First Rendering

All visual overlays — cursors, axes, markers, harmonic lines, Doppler indicators —
MUST be rendered as SVG elements within the spectrogram container.

- Canvas API MUST NOT be used for overlay rendering
- Absolute-positioned DOM elements MUST NOT be used for visual overlays
- Coordinate transforms (screen → SVG → image → data) MUST flow through
  the established coordinate system in `src/utils/coordinates.js`
- SVG structure MUST remain DOM-queryable for testability

**Rationale**: SVG provides precise coordinate math, native scalability,
and DOM-queryable elements that enable reliable Playwright assertions.

### II. Test-First (NON-NEGOTIABLE)

All features MUST have Playwright end-to-end tests. Tests MUST pass before
merging. Skipping tests to ship a feature is never acceptable.

- Every user-facing behavior MUST have corresponding Playwright coverage
- `yarn test` MUST pass on the main branch at all times
- `yarn typecheck` MUST pass before committing
- Test utilities belong in the `GramFramePage` helper class for reuse

**Rationale**: E2E tests against real browser rendering are the only reliable
way to validate an interactive SVG component. Unit tests alone cannot catch
coordinate, event, or rendering regressions.

### III. Modular Mode Architecture

Each interaction mode — Pan, Analysis, Harmonics, Sidebands and Doppler, with
`src/modes/modeRoster.js` as the one list — MUST extend `BaseMode`.
New modes MUST be registered via `ModeFactory`. Modes MUST NOT directly
depend on each other.

- Mode-specific logic MUST live in `src/modes/<modeName>/`
- Cross-mode concerns (e.g., feature persistence) MUST be coordinated
  through `FeatureRenderer`, not direct mode-to-mode calls
- Adding a new mode MUST NOT require modifications to existing modes
- `ModeFactory` is the single entry point for mode instantiation

**Rationale**: Decoupled modes allow independent development and testing.
The factory pattern centralizes error handling and makes the mode roster
discoverable.

### IV. Declarative HTML Configuration

GramFrame instances MUST be configured via HTML tables with class `gram-config`.
The component auto-discovers and replaces these tables on `DOMContentLoaded`.

- Configuration MUST be parsed from 2-column table rows (`parameter | value`)
- The first row MUST hold the source: the spectrogram `<img>`, or the `<audio>`
  element of an audio-sourced instance (spec 168)
- JavaScript object configuration MUST NOT be required for basic usage
- Multiple independent instances on a single page MUST be supported

**Rationale**: HTML-table config enables zero-JS setup for sonar training
materials. Authors can embed spectrograms with only HTML knowledge, and
existing deployments rely on this contract.

## Technical Constraints

- **Build tool**: Vite (unminified output for field debugging)
- **Type checking**: JSDoc annotations validated by `yarn typecheck`
- **Testing**: Playwright for all e2e tests
- **State management**: Centralized in `src/core/state.js` with listener pattern;
  state MUST be deep-copied before passing to listeners
- **HMR**: Hot module reload MUST preserve state listeners across reloads

## Quality Gates

All of the following MUST pass before any merge to main:

1. `yarn typecheck` — zero errors
2. `yarn lint` and `yarn hygiene` — the lint rules and the debt ratchets
3. `yarn coverage` — the Vitest unit lane, with coverage
4. `yarn test` — all Playwright tests green, plus the WebKit smoke config
5. `yarn build`, `yarn build:standalone` and `yarn check:bundle-floor` — clean
   builds inside the bundle floor
6. `yarn build:site` and `yarn check:site` — no dead local link, no page
   unreachable from `index.html`

## Governance

This constitution supersedes conflicting guidance in other project documents.
Amendments require:

1. A description of the change and its rationale
2. Version bump following semver (MAJOR: principle removed/redefined,
   MINOR: principle added or materially expanded, PATCH: clarification)
3. Update to the Sync Impact Report at the top of this file
4. Propagation check across `.specify/templates/` for consistency

**Version**: 1.0.1 | **Ratified**: 2026-03-26 | **Last Amended**: 2026-09-25
