# Quickstart: Sample Harmonic Pins to Keep Them Legible

**Feature**: `158-harmonic-pin-sampling` | **Date**: 2026-07-17

A short guide to implementing, running, and manually verifying this feature.

## What changes

- **New**: `src/utils/harmonicSampling.js` — pure `chooseSamplingStep()` and
  `sampledHarmonics()` plus `MAX_VISIBLE_PINS` (25) and `NICE_STEPS`.
- **Edit**: `src/modes/harmonics/HarmonicsMode.js` — `getVisibleHarmonics()` now
  reads the **visible** frequency range (`calculateVisibleDataRange`) and returns
  a sampled, capped list of harmonic numbers.
- **New**: `tests/harmonic-pin-sampling.spec.ts` — Playwright coverage.

No state, persistence, or `gram-config` changes.

## Implement

1. Create `src/utils/harmonicSampling.js` per
   [contracts/sampling-algorithm.md](./contracts/sampling-algorithm.md).
2. In `HarmonicsMode.js`, import `sampledHarmonics` and
   `calculateVisibleDataRange` (from `../../components/table.js`); rewrite
   `getVisibleHarmonics()` to use the visible range and return
   `sampledHarmonics(minHarmonic, maxHarmonic).harmonics`. Update the one caller
   in `renderHarmonicSet()` (it no longer needs to pass `config`).
3. `yarn typecheck`.

## Run

```bash
yarn dev          # http://localhost:5173 — use debug.html for state inspection
yarn typecheck    # must be clean
yarn test         # Playwright — all green (Constitution Gate II)
yarn build        # clean production build (Constitution Gate)
```

## Manual verification

1. Open the app and switch to **Harmonics** mode.
2. Add a harmonic set and set its **spacing to 0.5 Hz** over a wide-frequency
   spectrogram.
   - **Before**: a solid block of overlapping lines and unreadable labels.
   - **After**: at most 25 pins, evenly spaced (e.g. every 5th/10th/25th
     harmonic), with legible, non-overlapping labels.
3. **Zoom in** on a region of interest.
   - More pins appear (a finer step) as the visible span narrows; keep zooming
     and eventually every pin in view is shown.
4. **Zoom out** / **pan** to a wider view.
   - The overlay thins again and stays ≤ 25 pins; panning keeps the same step,
     with the visible multiples updating for the new position.
5. Add a **second** harmonic set with a large spacing (few pins).
   - It shows all of its pins unchanged; the cap is applied per set.
6. **Select / drag** the dense set.
   - Selection and adjustment behave exactly as before the change.

## Automated checks (Playwright)

Assert against `.gram-frame-harmonic-line` elements and their
`data-harmonic-number` attributes:

- Dense 0.5 Hz set → line count ≤ 25.
- Drawn `data-harmonic-number`s form a regular arithmetic series (constant step
  from `NICE_STEPS`).
- Sparse set → all harmonics drawn (no thinning).
- After a zoom-in step → line count is ≥ the pre-zoom count (never fewer) and
  still ≤ 25.
- After zoom-out/reset → line count returns to the thinned (≤ 25) state.
- Every `.gram-frame-harmonic-number` label matches a rendered line's number.

## Rollback

Revert the two source files and delete the new util + spec. No data migration is
involved because nothing is persisted.
