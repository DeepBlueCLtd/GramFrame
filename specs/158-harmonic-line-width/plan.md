# Implementation Plan: Width of Harmonic Lines (Trial)

**Branch**: `158-harmonic-line-width` | **Date**: 2026-07-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/158-harmonic-line-width/spec.md`

## Summary

Harmonic vertical lines currently render at a fixed `stroke-width: 2`. The issue
asks for a trial where every other line is thinner (1px) so a reviewer can
compare thinner vs current width side by side. The technical approach is a
minimal, deterministic change in `HarmonicsMode.createHarmonicLine()`: derive the
stroke width from the harmonic number (odd → 2px, even → 1px) instead of the
hard-coded `'2'`. No state, config, persistence, or UI changes are required.

## Technical Context

**Language/Version**: JavaScript (ES2020+), JSDoc-typed, no compilation step  
**Primary Dependencies**: None at runtime (zero runtime dependencies); Vite for build  
**Storage**: N/A — no persisted field changes (line width is a pure render-time attribute)  
**Testing**: Playwright end-to-end (`yarn test`); type checking via `yarn typecheck`  
**Target Platform**: Modern browsers (SVG overlay rendered in the spectrogram container)  
**Project Type**: Single-project browser component (SVG-based interactive overlay)  
**Performance Goals**: No change — same number of SVG line elements; one extra modulo per line  
**Constraints**: SVG-first rendering (Constitution I); width must be a fixed pixel stroke that does not scale with zoom/expand  
**Scale/Scope**: Single function change (`createHarmonicLine`) plus one Playwright test; ~1 file of source impact

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. SVG-First Rendering**: PASS. The change only alters the `stroke-width`
  attribute of the existing `<line>` SVG element created in `createHarmonicLine`.
  No Canvas, no absolute-positioned DOM. Coordinate transforms are untouched. SVG
  remains DOM-queryable (the `stroke-width` attribute is assertable in tests).
- **II. Test-First (NON-NEGOTIABLE)**: PASS. A new Playwright assertion verifies
  the alternating 1px/2px widths on rendered `.gram-frame-harmonic-line`
  elements. `yarn test` and `yarn typecheck` must pass before merge.
- **III. Modular Mode Architecture**: PASS. The change is confined to
  `src/modes/harmonics/HarmonicsMode.js`. No cross-mode coupling; Doppler and
  Analysis modes are untouched. No `ModeFactory` change.
- **IV. Declarative HTML Configuration**: PASS. No configuration surface is
  added or altered; the trial is a fixed render behaviour with no new
  `gram-config` parameter.

**Result**: No violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/158-harmonic-line-width/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── harmonic-line-width.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created here)
```

### Source Code (repository root)

```text
src/
└── modes/
    └── harmonics/
        └── HarmonicsMode.js     # createHarmonicLine(): derive stroke-width from harmonic number

tests/
└── harmonics-mode.spec.js       # add assertion for alternating 1px/2px line widths
```

**Structure Decision**: Single-project browser component. The feature touches
exactly one production source file (`HarmonicsMode.js`) and one test file
(`harmonics-mode.spec.js`). No new modules, directories, or build changes are
introduced. This respects the modular mode architecture — all harmonic rendering
logic already lives in `src/modes/harmonics/`.

## Implementation Approach

1. In `HarmonicsMode.createHarmonicLine(harmonicNumber, ...)`, replace the
   literal `line.setAttribute('stroke-width', '2')` with a width derived from the
   harmonic number: `const strokeWidth = harmonicNumber % 2 === 0 ? 1 : 2`.
   Odd harmonics (1, 3, 5, …) keep 2px; even harmonics (2, 4, 6, …) render 1px —
   yielding the alternating "every other line is 1px" trial.
2. `harmonicNumber` is already a parameter of `createHarmonicLine`, so no
   plumbing is needed. The derivation is deterministic per harmonic (FR-002),
   applies to every set (FR-003), and leaves labels, colour, position, and
   height untouched (FR-004, FR-005).
3. Add a Playwright assertion in `tests/harmonics-mode.spec.js` that creates a
   harmonic set with multiple visible harmonics and verifies the rendered
   `.gram-frame-harmonic-line` elements alternate between `stroke-width="1"` and
   `stroke-width="2"` by harmonic number (read via `data-harmonic-number`).
4. Run `yarn typecheck`, `yarn test`, and `yarn build` (Quality Gates).

## Complexity Tracking

> No Constitution Check violations. This section intentionally left empty.
