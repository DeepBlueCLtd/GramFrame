# Implementation Plan: Show All Harmonic Pins, Label Only the Major Subset

**Feature Branch**: `159-harmonic-pin-labels`
**Spec**: [spec.md](./spec.md)
**Status**: Ready for implementation

## Summary

Spec 158 kept dense harmonic sets legible by *sampling the pins* — drawing only
every Nth pin (default max 25) and dropping the rest entirely (line + label +
symbol). Review feedback (GH #198) is that dropping the lines loses the harmonic
structure analysts read. This feature keeps the sampling maths but re-targets it:

1. **Every pin line** in the visible frequency span is drawn (US1 / FR-001).
2. Only a **thinned "major" subset** (the same `sampledHarmonics()` result,
   ≤ 25) gets a **number label + symbol** (US1 / FR-002–FR-008).
3. Each drawn label is **centred horizontally on its pin** and stacked **above
   its symbol** — vertical order label → symbol → pin line — clamped to stay
   on-screen at the top edge (US2 / FR-009–FR-011).

The pure sampling utility (`src/utils/harmonicSampling.js`) is unchanged; only
its consumer (`HarmonicsMode`) changes what it applies the sample to.

## Technical Context

- **Language**: JavaScript (ES2020+, JSDoc-typed, no compilation), Vite build.
- **Rendering**: SVG overlay in `HarmonicsMode.renderHarmonicSet()`.
- **Viewport awareness**: visible span comes from `calculateVisibleDataRange()`,
  so the drawn range and the labelled subset both recompute on every zoom/pan
  (FR-006, FR-007) — no extra wiring needed.

## Design

### Pin lines (all) vs labels/symbols (thinned)

`renderHarmonicSet()` derives the visible harmonic range
`[minHarmonic, maxHarmonic]` and:

- draws a `.gram-frame-harmonic-line` for **every** harmonic in the range;
- computes the labelled subset once via
  `sampledHarmonics(minHarmonic, maxHarmonic).harmonics` (a `Set`), and draws a
  `.gram-frame-harmonic-symbol` + `.gram-frame-harmonic-number` only for those.

Because the sampled subset is always a set of harmonics inside the drawn range,
every label maps to a drawn pin (FR-008). When the range already fits under the
cap, the sample is the whole range so every pin is labelled (FR-005).

Lines are appended first, then symbols + labels, so labels/symbols paint on top
of the (possibly dense) block of lines.

### Label stack geometry (US2)

A single per-set vertical layout is computed from the pin-line top and the image
top edge (`calculateLabelStackPositions`):

```
label  (text-anchor=middle, x = pin lineX, baseline = labelY)   ← top
symbol (centred at lineX, cy = symbolCy)
pin line top (lineTop)                                          ← bottom
```

- symbol caps the line: `symbolCy = lineTop - r`
- label baseline sits just above the symbol: `labelY = symbolCy - r - gap`
- if the label's top would clip above the image top, the whole stack (label +
  symbol) is nudged down by the overflow so it stays visible (FR-011).

Labels gain `data-harmonic-set-id` + `data-harmonic-number` so tests can verify
one-label-per-drawn-pin correspondence (FR-008).

## Files Changed

- `src/modes/harmonics/HarmonicsMode.js` — draw-all-lines / thin-labels logic,
  centred-above-symbol label placement, shared stack geometry.
- `tests/helpers/gram-frame-page.js` — scope `getHarmonicLabelNumbers()` to a set
  and read the label's `data-harmonic-number`.
- `tests/harmonic-pin-sampling.spec.js` — re-target 158's sampling assertions
  from *drawn lines* to *drawn labels* (158's pin-dropping is superseded).
- `tests/harmonic-labels.spec.js` — new E2E coverage for US1 (all lines drawn,
  labels thinned) and US2 (label centred above symbol, clamped at top).
- `tests/harmonic-symbols.spec.js` — flip the label-vs-symbol vertical-order
  assertion to label-above-symbol.

## Testing Strategy

- Unit (`harmonic-sampling-unit.spec.js`): unchanged — util is untouched.
- E2E US1: dense 0.5 Hz set → every line in span drawn (> cap), labels ≤ cap on a
  regular step; sparse set → every pin drawn and labelled; zoom in refines the
  label step down to 1; every label matches a drawn line.
- E2E US2: label horizontally centred on its pin line and above its symbol;
  near-top-edge stack stays within the image.

## Out of Scope

- Symbol catalogue / default symbol (specs 157/158).
- Harmonic-set data model, colour, persistence, selection (unchanged; FR-012/13).
