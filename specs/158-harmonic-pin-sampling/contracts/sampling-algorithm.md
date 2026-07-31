# Contract: Harmonic Pin Sampling

**Feature**: `158-harmonic-pin-sampling` | **Date**: 2026-07-17

This is the internal contract for the new pure helper module
`src/utils/harmonicSampling.js` and its integration point in
`src/modes/harmonics/HarmonicsMode.js`. It is not an external/authored API — the
`gram-config` HTML contract is unchanged.

## Module: `src/utils/harmonicSampling.js`

### Constants

```js
export const MAX_VISIBLE_PINS = 25
export const NICE_STEPS = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000]
```

### `chooseSamplingStep(minHarmonic, maxHarmonic, max = MAX_VISIBLE_PINS) → number`

Returns the smallest step `S` from `NICE_STEPS` such that the number of multiples
of `S` in the inclusive range `[minHarmonic, maxHarmonic]` is ≤ `max`.

- Multiple-count formula: `floor(maxHarmonic / S) − floor((minHarmonic − 1) / S)`.
- If the range already fits (`count ≤ max`), returns `1`.
- If even the largest member of `NICE_STEPS` does not bring the count ≤ `max`,
  returns the largest member (renderer still hard-caps output length; see below).

**Guarantees**
- Return value is always a member of `NICE_STEPS`.
- Monotonic: for a fixed `max`, shrinking the range (fewer harmonics) never
  returns a larger step; growing it never returns a smaller step.

### `sampledHarmonics(minHarmonic, maxHarmonic, max = MAX_VISIBLE_PINS) → { step, harmonics }`

- Computes `step = chooseSamplingStep(minHarmonic, maxHarmonic, max)`.
- Emits ascending harmonic numbers that are multiples of `step` and lie within
  `[minHarmonic, maxHarmonic]`, i.e. starting at
  `ceil(minHarmonic / step) × step`, stepping by `step`, up to `maxHarmonic`.
- Generates directly (≤ `max` iterations); does **not** allocate the full range.
- Defensive hard cap: the returned `harmonics` array length never exceeds `max`.

**Guarantees**
- `harmonics.length ≤ max`.
- `step === 1` ⇔ every harmonic in the range is returned (no thinning).
- Every returned value is a multiple of `step` (pan-stable, evenly spaced).
- Empty array when `maxHarmonic < minHarmonic` (nothing visible).

### Pre-conditions

- `minHarmonic ≥ 1`, integers; `maxHarmonic` integer. Caller supplies these from
  the visible harmonic range (see integration).

## Integration: `HarmonicsMode.getVisibleHarmonics()`

Current (full-range, uncapped):

```js
getVisibleHarmonics(harmonicSet, config) {
  const { freqMin, freqMax } = config           // FULL data range, ignores zoom
  const minHarmonic = Math.max(1, Math.ceil(freqMin / harmonicSet.spacing))
  const maxHarmonic = Math.floor(freqMax / harmonicSet.spacing)
  const harmonics = []
  for (let h = minHarmonic; h <= maxHarmonic; h++) harmonics.push(h)  // no cap
  return harmonics
}
```

New (visible-range, sampled):

```js
getVisibleHarmonics(harmonicSet) {
  // VISIBLE range for the current zoom/pan (full range at zoom 1.0)
  const { freqMin, freqMax } = calculateVisibleDataRange(this.instance)
  const minHarmonic = Math.max(1, Math.ceil(freqMin / harmonicSet.spacing))
  const maxHarmonic = Math.floor(freqMax / harmonicSet.spacing)
  return sampledHarmonics(minHarmonic, maxHarmonic).harmonics
}
```

- `renderHarmonicSet()` is unchanged below the call: it still maps each returned
  harmonic number to `n × spacing`, transforms via `calculateZoomAwarePosition`,
  and appends one line + one label.
- The `config` parameter is dropped (or ignored) since the visible range now
  comes from the instance; callers within `HarmonicsMode` are updated
  accordingly.

## Behavioural contract (maps to spec requirements)

| Scenario | Expected | Spec |
|----------|----------|------|
| Visible harmonics ≤ 25 | All drawn, `step = 1` | FR-005, SC-007 |
| Visible harmonics > 25 | ≤ 25 drawn, `step` from `NICE_STEPS` | FR-001..FR-004, SC-001 |
| Zoom in (span narrows) | Same-or-more pins, same-or-smaller step | FR-007, SC-003 |
| Zoom out / pan wider | Same-or-fewer pins, same-or-larger step | FR-007, SC-004 |
| Pan without zoom | Same step; drawn pins are the multiples now in view | Edge cases |
| Each drawn pin | Has its own label; no orphan labels | FR-008 |
| Multiple sets | Cap applied per set independently | FR-011 |
| Selecting/adjusting a set | Unchanged (hit-test over full series) | FR-010, US3 |
