# Contract: Harmonic Line Width Rendering

**Feature**: 158-harmonic-line-width
**Type**: UI rendering contract (SVG DOM output)

GramFrame is a browser UI component, not a service; its "contract" is the DOM it
produces. This document specifies the observable output contract for harmonic
line stroke widths — the surface tests assert against.

## Producer

`HarmonicsMode.createHarmonicLine(harmonicNumber, harmonicSet, lineX, lineTop, lineHeight)`
in `src/modes/harmonics/HarmonicsMode.js`.

## Contract

For each visible harmonic in each rendered harmonic set, the producer MUST emit
one SVG `<line>` element with:

| Attribute              | Guarantee                                             |
|------------------------|-------------------------------------------------------|
| `class`                | equals `gram-frame-harmonic-line`                     |
| `data-harmonic-number` | the harmonic's integer number as a string             |
| `stroke-width`         | `"2"` when the harmonic number is **odd**; `"1"` when **even** |

### Formal rule

```text
given a line L with data-harmonic-number = n (integer ≥ 1):
  n is odd  ⇒ L.stroke-width == "2"
  n is even ⇒ L.stroke-width == "1"
```

### Invariants

- **C-1 (allowed values)**: `stroke-width` is exactly `"1"` or `"2"` for every
  `.gram-frame-harmonic-line`. No other value appears.
- **C-2 (determinism)**: Re-rendering the same harmonic set (after drag, zoom,
  expand, mode switch, or reload) yields the same `stroke-width` for each
  `data-harmonic-number`.
- **C-3 (alternation)**: For any two consecutive visible harmonics n and n+1,
  their lines' `stroke-width` values differ.
- **C-4 (isolation)**: Only `.gram-frame-harmonic-line` elements are affected.
  Doppler (`DopplerMode`) and Analysis (`AnalysisMode`) line widths are
  unchanged, as are harmonic labels, colours, positions, and heights.

## Consumer expectations (tests)

A Playwright test acts as the consumer:

1. Enter Harmonics mode and create a harmonic set with ≥ 2 visible harmonics.
2. Query all `.gram-frame-harmonic-line` elements.
3. For each, read `data-harmonic-number` and `stroke-width` and assert the
   formal rule above (C-1, C-3) and that no other stroke-width values appear.

## Non-goals

- No JSON/HTTP schema (not a service).
- No new configuration attribute in the `gram-config` table.
- No persisted field; width is derived, never stored.
