# Implementation Plan: Sample Harmonic Pins to Keep Them Legible

**Branch**: `158-harmonic-pin-sampling` | **Date**: 2026-07-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/158-harmonic-pin-sampling/spec.md`

## Summary

When a harmonic set is placed with a small spacing (e.g. 0.5 Hz), the current
renderer draws one pin (vertical SVG line + number label) for **every** harmonic
across the whole data frequency range, with no cap — producing a solid,
illegible block. This feature caps the number of pins drawn per harmonic set to
a maximum (default **50**) within the **currently visible** frequency span, and
when a set would exceed that cap it draws a regularly sampled subset (every Nth
harmonic, N chosen from a "nice" step series: 1, 2, 5, 10, 25, 50, 100, 250, …).
Because the calculation is driven by the visible span, zooming in narrows the
span, lowers the pin count, and reveals finer pins; zooming out / panning thins
them again.

Technical approach: two small, contained changes in
`src/modes/harmonics/HarmonicsMode.js`, plus one new pure helper module.

1. Make pin generation **viewport-aware**: replace the use of the full-range
   `state.config` `{freqMin, freqMax}` in `getVisibleHarmonics()` with the
   already-existing **visible** range from `calculateVisibleDataRange(instance)`
   (in `src/components/table.js`), which returns `{freqMin, freqMax, …}` for the
   current zoom/pan.
2. Add **nice-step sampling**: a new pure module `src/utils/harmonicSampling.js`
   computes the sampling step from the harmonic count and the cap, and yields the
   sampled harmonic numbers directly (anchored on multiples of the step so pins
   stay stable while panning) without ever materialising the full array.

Re-rendering on zoom/pan already happens: `setZoom()` → `applyZoomTransform()`
(`src/components/table.js`) calls `featureRenderer.renderAllPersistentFeatures()`
on every zoom and reset, so no new event wiring is required. The cap makes the
overlay legible and also bounds the number of SVG nodes created per re-render.

## Technical Context

**Language/Version**: JavaScript ES2020+, JSDoc-typed (no TS compilation)
**Primary Dependencies**: None at runtime (zero runtime deps); Vite for build
**Storage**: N/A — this feature is purely presentational. No change to
`state.harmonics.harmonicSets`, to `StoredHarmonicSet`, or to any persisted data.
The sampling is recomputed on each render from the harmonic set's `spacing` and
the current visible range; nothing about the sampling is persisted.
**Testing**: Playwright end-to-end (`yarn test`) with the `GramFramePage` helper;
the pure sampling helper is additionally unit-testable in isolation
**Target Platform**: Modern evergreen browsers (SVG-based overlay component)
**Project Type**: Single-project front-end library/component (Option 1)
**Performance Goals**: No perceptible lag on zoom/pan re-render; per-set SVG node
count bounded to ≤ 2 × cap (one line + one label per drawn pin, ≤ 25 pins), down
from potentially thousands today
**Constraints**: SVG-only overlays; `yarn typecheck` + `yarn test` + `yarn build`
must all pass; state deep-copied before listener notification; HMR preserves
listeners; no change to the `gram-config` HTML contract
**Scale/Scope**: Default cap 25 pins/set; nice-step series covering steps up to
several thousand; edits to ~2 existing files + 1 new pure helper + tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**I. SVG-First Rendering** — PASS. Pins remain SVG `<line>` + `<text>` marks
appended to the existing `cursorGroup` via the established
`calculateZoomAwarePosition` transform. The feature only changes *which* and *how
many* pins are created; no Canvas, no absolute-positioned DOM overlays. The
visible-range source (`calculateVisibleDataRange`) is the same helper the axes
renderer already uses, so pins and axes stay consistent. Marks keep their
existing `data-harmonic-set-id` / `data-harmonic-number` attributes for
Playwright queryability.

**II. Test-First (NON-NEGOTIABLE)** — PASS (with obligation). New Playwright
coverage will assert: a dense set (0.5 Hz over a wide range) draws ≤ 25 pins;
drawn pins are regularly spaced (step from the nice series); a sparse set draws
all pins unchanged; zooming in increases the number of drawn pins (never
decreases); zooming out thins again; every drawn label corresponds to a drawn
pin. The pure helper gets focused unit-style assertions via a small test too.
`yarn typecheck` and `yarn test` must pass before merge.

**III. Modular Mode Architecture** — PASS. All behavioural change stays inside
`src/modes/harmonics/`. The new `src/utils/harmonicSampling.js` is a pure,
mode-agnostic utility (like the existing `src/utils/calculations.js`), imported
only by `HarmonicsMode`. No mode-to-mode dependencies; no other mode is touched.
Cross-mode re-render already flows through `FeatureRenderer`.

**IV. Declarative HTML Configuration** — PASS / N/A. No change to the
`gram-config` table contract. The cap is an internal constant, not authored
configuration, so zero-JS setup is unaffected.

**Technical Constraints** — PASS. JSDoc types added for the sampling helper;
state remains centralized and untouched (no new state fields, no persistence
change); re-render path is the existing one. `yarn typecheck` / `yarn test` /
`yarn build` remain the gates.

**Result**: No violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/158-harmonic-pin-sampling/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── sampling-algorithm.md  # Nice-step sampling + visible-range contract
├── checklists/
│   └── requirements.md  # Spec quality checklist (created by /speckit.specify)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── modes/
│   └── harmonics/
│       └── HarmonicsMode.js     # EDIT — getVisibleHarmonics() uses the VISIBLE
│                                #   range + nice-step sampling; renderHarmonicSet
│                                #   unchanged below the sampling call
├── utils/
│   ├── harmonicSampling.js      # NEW — pure: chooseSamplingStep() + sampledHarmonics()
│   └── calculations.js          # unchanged (sibling reference for a pure util)
├── components/
│   └── table.js                 # unchanged — reuse exported calculateVisibleDataRange()
└── types.js                     # EDIT — JSDoc typedefs for the sampling helper (optional)

tests/
├── harmonic-pin-sampling.spec.ts  # NEW — cap, regular spacing, sparse pass-through,
│                                  #   zoom reveals more, zoom-out thins, label↔pin match
└── helpers/                       # EDIT if needed — GramFramePage helpers to count
                                   #   visible harmonic lines / read their numbers
```

**Structure Decision**: Single-project front-end component (constitution
Option 1). The decision logic (step selection + which harmonics to keep) lives in
a pure, dependency-free `src/utils/harmonicSampling.js` so it is trivially
unit-testable and free of DOM/zoom concerns; `HarmonicsMode` supplies it the
visible range and the set's spacing and renders whatever it returns. This mirrors
the existing separation between `src/utils/*` (pure math) and the mode classes.

## Complexity Tracking

> No constitution violations — section intentionally empty.
