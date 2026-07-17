# Implementation Plan: Symbols on Harmonic Pins

**Branch**: `157-harmonic-pin-symbols` | **Date**: 2026-07-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/157-harmonic-pin-symbols/spec.md`

## Summary

Add a per-harmonic-set **symbol** (a filled shape: circle, square, diamond, and
additional shapes) as a colour-blind-friendly visual code that complements the
existing per-set colour. A symbol drop-down is added next to the colour picker
in the main control panel; the currently selected symbol is applied to each new
harmonic set (created via click/drag or the manual add dialog). Each pin renders
a filled, colour-coded symbol at the top of its vertical line (clear of the pin
label, which sits to the right of the line), and the harmonics table shows the
symbol in the set's colour. The symbol is persisted with each harmonic set;
legacy records saved before this feature reload with a default circle.

Technical approach: extend the harmonic-set data shape with a `symbol` field,
add a `selectedSymbol` field to global state fed by a new symbol-selector UI
component, render symbols as SVG `<path>`/`<polygon>` marks in the existing
harmonic cursor group, mirror the mark in the harmonics table (inline SVG), and
extend the persistence layer with an **additive, backward-compatible** `symbol`
field (no schema-version bump, so existing v1 data still loads).

## Technical Context

**Language/Version**: JavaScript ES2020+, JSDoc-typed (no TS compilation)
**Primary Dependencies**: None at runtime (zero runtime deps); Vite for build
**Storage**: Browser Web Storage (localStorage for trainers / sessionStorage for
students), via `src/core/storage.js`; `StoredHarmonicSet` gains an optional
`symbol` field. Schema version stays `1` (additive, backward-compatible).
**Testing**: Playwright end-to-end (`yarn test`), `GramFramePage` helper class
**Target Platform**: Modern evergreen browsers (SVG-based overlay component)
**Project Type**: Single-project front-end library/component (Option 1)
**Performance Goals**: Interactive 60fps overlay; symbol rendering must not add
perceptible lag during click/drag creation or re-render of persistent features
**Constraints**: SVG-only overlays (no Canvas/absolute-DOM for overlays);
`yarn typecheck` + `yarn test` + `yarn build` must all pass; state deep-copied
before listener notification; HMR preserves listeners
**Scale/Scope**: ~6–8 filled symbol shapes; unbounded harmonic sets per instance
(practically a handful); one new UI component; edits to ~8 existing files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**I. SVG-First Rendering** — PASS. Symbols are rendered as SVG marks
(`<path>`/`<polygon>`/`<circle>`) appended to the existing `cursorGroup`, using
the established `calculateZoomAwarePosition` coordinate transform. No Canvas or
absolute-positioned DOM overlays. The harmonics-table symbol swatch is inline
SVG inside the existing table cell (table is normal DOM UI, not a spectrogram
overlay — consistent with the current colour swatch `<div>`). Marks carry
`data-*` attributes for Playwright queryability.

**II. Test-First (NON-NEGOTIABLE)** — PASS (with obligation). New Playwright
coverage will be added for: symbol selector presence/options, symbol on pin
after click/drag creation, symbol on pin after manual-add, symbol shown in the
harmonics table in set colour, persistence round-trip of the symbol, and legacy
(no-symbol) reload defaulting to circle. `yarn typecheck` and `yarn test` must
pass before merge.

**III. Modular Mode Architecture** — PASS. Harmonic-specific rendering stays in
`src/modes/harmonics/`. The symbol selector is a shared UI component (like the
colour picker) writing to global `state.selectedSymbol`; harmonic set creation
reads it exactly as it already reads `state.selectedColor`. No mode-to-mode
dependencies introduced; no changes required to other modes.

**IV. Declarative HTML Configuration** — PASS / N/A. No change to the
`gram-config` table contract; the symbol is a runtime interaction attribute, not
authored configuration.

**Technical Constraints** — PASS. JSDoc types updated for `HarmonicSet`,
`StoredHarmonicSet`, and `selectedSymbol`; state remains centralized and
deep-copied; persistence remains backward-compatible.

**Result**: No violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/157-harmonic-pin-symbols/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── symbol-catalog.md      # Available symbols + default/legacy contract
│   ├── state-shape.md         # selectedSymbol + HarmonicSet.symbol contract
│   └── persistence-schema.md  # StoredHarmonicSet.symbol backward-compat contract
├── checklists/
│   └── requirements.md  # Spec quality checklist (already created by /speckit.specify)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── SymbolPicker.js          # NEW — drop-down symbol selector (writes state.selectedSymbol)
│   ├── ColorPicker.js           # unchanged (sibling reference for placement/pattern)
│   ├── MainUI.js                # EDIT — mount SymbolPicker next to the colour picker
│   ├── HarmonicPanel.js         # EDIT — render symbol swatch (in set colour) in table row
│   └── UIComponents.js          # EDIT — re-export createSymbolPicker (mirrors color picker)
├── core/
│   ├── state.js                 # EDIT — add selectedSymbol default ('circle')
│   └── storage.js               # EDIT — persist hs.symbol (additive; SCHEMA_VERSION stays 1)
├── modes/
│   └── harmonics/
│       ├── HarmonicsMode.js     # EDIT — set symbol on create; render symbol mark at pin top
│       └── ManualHarmonicModal.js # (no UI change; symbol taken from global state on create)
├── rendering/
│   └── symbols.js               # NEW — pure SVG mark factory (shape → SVG element/path)
├── main.js                      # EDIT — _restoreAnnotations applies default 'circle' when symbol absent
└── types.js                     # EDIT — HarmonicSet.symbol, StoredHarmonicSet.symbol, selectedSymbol, SymbolType

tests/
├── harmonic-symbols.spec.js     # NEW — selector, pin render, table swatch, persistence, legacy default
└── helpers/                     # EDIT if needed — GramFramePage helpers for symbol assertions
```

**Structure Decision**: Single-project front-end component (constitution
Option 1). New symbol rendering lives in a small pure module `src/rendering/
symbols.js` (shape→SVG), consumed by both the harmonic pin renderer and the
harmonics-table swatch so the two stay visually identical. The selector follows
the existing `ColorPicker.js` → `MainUI.js` → global-state pattern exactly,
keeping symbol handling parallel to colour handling throughout.

## Complexity Tracking

> No constitution violations — section intentionally empty.
