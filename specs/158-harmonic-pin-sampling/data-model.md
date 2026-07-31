# Phase 1 Data Model: Sample Harmonic Pins to Keep Them Legible

**Feature**: `158-harmonic-pin-sampling` | **Date**: 2026-07-17

This feature is **presentational**: it introduces **no new persisted data and no
new global state fields**. The "entities" below are the existing data structures
it reads plus the ephemeral, per-render values the sampling computes. Nothing
here is stored in `state.harmonics.harmonicSets`, in `StoredHarmonicSet`, or in
Web Storage.

## Existing entities (read, not modified)

### HarmonicSet (`src/types.js`, `state.harmonics.harmonicSets[]`)

| Field        | Type   | Role in this feature                                              |
|--------------|--------|------------------------------------------------------------------|
| `id`         | string | Carried onto each pin's `data-harmonic-set-id` (unchanged)        |
| `color`      | string | Pin line/label colour (unchanged)                                |
| `anchorTime` | number | Vertical placement of the pins (unchanged)                       |
| `spacing`    | number | **Input** — harmonic interval in Hz; pin *n* sits at `n×spacing` |

The harmonic set is **not mutated**. Sampling never changes `spacing`, `anchorTime`,
`color`, or `id` (FR-009).

### Visible data range (`calculateVisibleDataRange(instance)` → DataRange)

| Field     | Type   | Role in this feature                                    |
|-----------|--------|---------------------------------------------------------|
| `freqMin` | number | **Input** — low edge (Hz) of the currently visible span |
| `freqMax` | number | **Input** — high edge (Hz) of the currently visible span |
| `timeMin` | number | unused by sampling                                      |
| `timeMax` | number | unused by sampling                                      |

Derived from `state.zoom` + the zoomed image geometry; equals the full
`state.config` range at zoom level 1.0.

## Ephemeral values (computed per render, not stored)

### VisibleHarmonicRange

Derived from a `HarmonicSet.spacing` and a visible `{freqMin, freqMax}`:

| Field         | Type   | Definition                                            |
|---------------|--------|-------------------------------------------------------|
| `minHarmonic` | number | `max(1, ceil(freqMin / spacing))`                     |
| `maxHarmonic` | number | `floor(freqMax / spacing)`                            |
| `count`       | number | `max(0, maxHarmonic − minHarmonic + 1)` (uncapped)    |

### SamplingResult (output of the new pure helper)

| Field       | Type      | Definition                                                      |
|-------------|-----------|-----------------------------------------------------------------|
| `step`      | number    | Chosen nice-series step `S` (`1` when no thinning needed)        |
| `harmonics` | number[]  | The harmonic numbers to draw, in ascending order, length ≤ cap  |

**Invariants**:
- `harmonics.length ≤ MAX_VISIBLE_PINS` (default 25) — FR-001, SC-001
- If `count ≤ MAX_VISIBLE_PINS` then `step === 1` and `harmonics` is every
  harmonic in `[minHarmonic, maxHarmonic]` — FR-005, SC-007
- Every value in `harmonics` is a multiple of `step` and lies in
  `[minHarmonic, maxHarmonic]` — FR-003, FR-004
- `harmonics` is a subsequence of the full harmonic range (no invented pins) —
  each drawn label corresponds to a real, drawn pin (FR-008, US3)
- Monotonic density: narrowing `[freqMin, freqMax]` (zoom in) never increases
  `step` and never decreases the number of drawn pins for the same set; widening
  never decreases `step` — FR-007, SC-003/SC-004

## Constants

| Name               | Value | Meaning                                                    |
|--------------------|-------|------------------------------------------------------------|
| `MAX_VISIBLE_PINS` | `25`  | Max pins drawn per harmonic set within the visible span    |
| `NICE_STEPS`       | `[1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000]` | Ascending nice-number step series; extend by ×10 if a set ever exceeds the largest member |

## Relationships

```text
HarmonicSet.spacing ┐
                    ├─► VisibleHarmonicRange ─► SamplingResult ─► drawn SVG pins
visible {freqMin,   ┘         (per render)         (per render)     (line + label)
         freqMax}
   ▲
   └─ calculateVisibleDataRange(instance)  ◄─ state.zoom (level, centerX/Y) + image geometry
```

No entity in this diagram is persisted; the entire chain is recomputed on each
`renderPersistentFeatures()` call (i.e. on every zoom, pan, reset, and resize).
