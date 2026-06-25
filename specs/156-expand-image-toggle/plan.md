# Implementation Plan: Expand Image Toggle

**Branch**: `156-expand-image-toggle` (developing on `claude/affectionate-euler-1a44hu`) | **Date**: 2026-06-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/156-expand-image-toggle/spec.md`

## Summary

Add a per-instance toggle that lets an analyst expand a **landscape** spectrogram so
the image fills the GramFrame component's width and grows downward to consume most of
the available viewport height, while navigation, title, and the control panel stay
visible. The core technical approach is to **decouple the rendered image size from the
image's natural size**: a new `renderWidth`/`renderHeight` drives `updateSVGLayout`,
axis rendering, and the coordinate transforms, so cursors and persistent features stay
locked to their data coordinates at any rendered size. Aspect ratio is not locked; only
the image region grows (axis-label text and the control panel keep their normal size).
State is in-memory, default off, not persisted. Portrait `verniers` get no toggle.

## Technical Context

**Language/Version**: JavaScript (ES2020+), JSDoc-typed, no compilation
**Primary Dependencies**: None at runtime (zero runtime deps); Vite for build
**Storage**: N/A — expand state is in-memory only (explicitly NOT browser storage)
**Testing**: Playwright e2e (`yarn test`); `GramFramePage` helper class
**Target Platform**: Modern browsers (SVG + ResizeObserver), embedded in DITA-OT/Oxygen WebHelp pages
**Project Type**: Single-project browser component (library)
**Performance Goals**: Toggle + re-layout visually instant (<1 frame perceptible); no regression to 60fps drag interactions
**Constraints**: Must preserve coordinate fidelity across render-size changes; only the image expands (axis text unchanged); reuse existing ResizeObserver
**Scale/Scope**: One contained feature — ~1 state field, `updateSVGLayout` + 2 coordinate divisors, 1 toggle control, 1 landscape guard; multiple instances per page supported

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment |
|-----------|------------|
| **I. SVG-First Rendering** | PASS. Image, axes, cursors, and all features continue to render as SVG and flow through `src/utils/coordinates.js`. The render-size decoupling is applied *inside* the existing coordinate system (transforms switch divisor from natural to rendered dims) — it does not bypass it. The expand **toggle is a UI control, not a data overlay**; like the existing `ModeButtons` and `ColorPicker` it is an HTML control, positioned in the `position: relative` main-panel cell. Principle I governs data overlays (cursors/axes/markers/harmonics/doppler), which remain SVG. No Canvas; no absolutely-positioned DOM rendering of *data*. |
| **II. Test-First (NON-NEGOTIABLE)** | PASS. New Playwright coverage for all seven success criteria (SC-001..007) added via `GramFramePage` helpers before/with implementation. `yarn typecheck`, `yarn test`, `yarn build` are the merge gates. |
| **III. Modular Mode Architecture** | PASS. Expand is a cross-mode layout concern, not a mode. It lives in core rendering/layout (`table.js`/`updateSVGLayout`, `coordinates.js`, a small UI control) and is coordinated through the existing render path; it does NOT modify any mode and does NOT add a mode. Feature re-render on toggle goes through `FeatureRenderer`, not mode-to-mode calls. |
| **IV. Declarative HTML Configuration** | PASS. No config-table contract change. The toggle is a runtime control discovered per instance; the landscape guard reads the already-parsed `imageDetails`. Multiple independent instances per page remain supported (each computes its own available space). |

**Result**: PASS — no violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/156-expand-image-toggle/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (state + UI-control contracts)
│   ├── state-shape.md
│   └── expand-toggle-ui.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── core/
│   └── state.js                 # add expand flag + renderWidth/renderHeight to imageDetails
├── components/
│   ├── table.js                 # updateSVGLayout: compute render dims; axes span render dims
│   └── ExpandToggle.js          # NEW: floating expand/collapse control (landscape-only)
├── utils/
│   └── coordinates.js           # imageToDataCoordinates / inverse: divide by render dims
├── rendering/
│   └── (cursors.js, axes.js)    # follow render dims via updated transforms (no logic rewrite)
├── api/                         # optional: expose getExpandState/setExpandState on the API
└── gramframe.css                # toggle styling + expanded main-panel/container rules

sample/
└── pub10-gram1.html             # NEW: demonstrator rebuilt from published Pub-10 shell
                                 #      (+ mirrored oxygen-webhelp CSS/JS assets, local bundle)

tests/
├── expand-image.spec.ts         # NEW: SC-001..007 acceptance tests
└── helpers/                     # extend GramFramePage with expand helpers
```

**Structure Decision**: Single-project browser component (Option 1). The feature
touches core layout (`table.js`/`updateSVGLayout`), the coordinate utilities
(`coordinates.js`), state (`state.js`), one new UI control component
(`ExpandToggle.js`), CSS, a new `sample/` demonstrator, and Playwright tests. No new
top-level structure is introduced.

## Complexity Tracking

> No constitution violations — section intentionally empty.
