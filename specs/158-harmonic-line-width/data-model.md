# Data Model: Width of Harmonic Lines (Trial)

**Feature**: 158-harmonic-line-width
**Phase**: 1 (Design & Contracts)

This feature introduces **no new persisted data and no state-shape changes**.
Line width is a derived, render-time property. This document records the single
entity touched and the derivation rule, for completeness.

## Entities

### Harmonic Line (existing — no schema change)

The vertical SVG line rendered for one harmonic of a harmonic set. Created in
`HarmonicsMode.createHarmonicLine()`.

| Attribute            | Source                         | Changed by this feature? |
|----------------------|--------------------------------|--------------------------|
| `class`              | `gram-frame-harmonic-line`     | No                       |
| `data-harmonic-set-id` | `harmonicSet.id`             | No                       |
| `data-harmonic-number` | `harmonicNumber`             | No                       |
| `x1`/`x2`            | zoom-aware X position          | No                       |
| `y1`/`y2`            | `lineTop` … `lineTop+lineHeight` | No                     |
| `stroke`             | `harmonicSet.color`            | No                       |
| **`stroke-width`**   | **derived from `harmonicNumber`** | **Yes (was fixed `'2'`)** |
| `stroke-linecap`     | `round`                        | No                       |
| `opacity`            | `0.9`                          | No                       |

### Derivation rule (new)

```text
strokeWidth(harmonicNumber) = (harmonicNumber mod 2 == 0) ? 1 : 2
```

- Odd harmonic numbers (1, 3, 5, …) → **2px** (current width, kept for comparison)
- Even harmonic numbers (2, 4, 6, …) → **1px** (thinner, the trial variant)
- Domain: `harmonicNumber` is a positive integer ≥ 1 (from `getVisibleHarmonics`)
- Deterministic: pure function of `harmonicNumber`; no state, no time, no index

## State / Persistence

- **State (`src/core/state.js`)**: unchanged. No new field on `harmonicSets` or
  anywhere in `GramFrameState`.
- **Persistence (localStorage / sessionStorage)**: unchanged. No stored
  harmonic-set record gains or loses a field; reloaded data renders with the same
  derivation. Backward/forward compatible by construction.
- **Listeners**: unchanged. No new broadcast payload.

## Relationships

- A **Harmonic Set** has many **Harmonic Lines** (one per visible harmonic).
  This feature changes only how each line's `stroke-width` is computed at render
  time; the set→line relationship, spacing, colour, and labels are untouched.

## Validation Rules

- **INV-1**: Every rendered harmonic line has `stroke-width` ∈ {1, 2} (SC-002).
- **INV-2**: For a fixed `harmonicNumber`, `stroke-width` is constant across all
  re-renders (SC-003).
- **INV-3**: In any set with ≥ 2 consecutive visible harmonics, adjacent lines
  differ in width (SC-001).
