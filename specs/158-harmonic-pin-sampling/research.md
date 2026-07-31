# Phase 0 Research: Sample Harmonic Pins to Keep Them Legible

**Feature**: `158-harmonic-pin-sampling` | **Date**: 2026-07-17

This document resolves the open questions from the spec and Technical Context by
inspecting the current implementation. There were no `NEEDS CLARIFICATION`
markers in the spec; the items below capture the design decisions that ground the
plan.

## 1. Where pins are generated today (and why they overflow)

**Finding**: `src/modes/harmonics/HarmonicsMode.js`

- `renderPersistentFeatures()` (≈L613) clears `.gram-frame-harmonic-line` and
  calls `renderHarmonicSet()` per set.
- `getVisibleHarmonics(harmonicSet, config)` (≈L634) computes
  `minHarmonic = ceil(freqMin / spacing)`, `maxHarmonic = floor(freqMax / spacing)`
  and pushes **every** integer in `[minHarmonic, maxHarmonic]` into an array —
  with **no cap**.
- `renderHarmonicSet()` (≈L714) iterates that array and appends one `<line>`
  (`createHarmonicLine`) and one `<text>` label (`createHarmonicLabel`, text =
  the harmonic number) per harmonic.

With `spacing = 0.5 Hz` over a wide `freqMin..freqMax`, this is thousands of
lines + labels → the reported "solid block".

**Decision**: Add a cap and sampling at the point where the harmonic list is
built (`getVisibleHarmonics`), leaving `renderHarmonicSet` to render whatever it
receives. Keeps the change surgical.

## 2. Source of the "visible frequency span"

**Finding**: Zoom is a **visual transform**, not a data-range change.
`getVisibleHarmonics` currently reads `state.config.freqMin/freqMax`, which is the
**full** data range set once in `src/core/configuration.js` — so it ignores zoom
entirely and always generates pins across the whole spectrum.

However, `src/components/table.js` already exports
**`calculateVisibleDataRange(instance)`**, which returns
`{ freqMin, freqMax, timeMin, timeMax }` for the **currently visible** window,
derived from `state.zoom.level` and the zoomed image's `x`/`width` attributes. It
is the same helper `renderAxes()` uses to label the axes for the zoomed view.

**Decision**: Drive sampling from `calculateVisibleDataRange(instance)` instead of
`state.config`. This makes the pin density viewport-aware for free and keeps pins
consistent with the frequency axis. At zoom 1.0 the helper returns the full range,
so un-zoomed behaviour is a strict superset of today's (just capped).

**Rationale**: Reuses a tested, already-consistent source of truth; avoids
duplicating zoom math in the harmonics mode.

**Alternatives considered**:
- *Derive span as `fullRange / zoomLevel`*: rejected — ignores pan offset and
  duplicates logic that already exists and is axis-consistent.
- *Introduce a new stored "visible range" state field*: rejected — unnecessary
  state; the value is cheap to compute on each render.

## 3. Recompute-on-zoom/pan wiring

**Finding**: `setZoom()` (`src/core/viewport.js`) → `applyZoomTransform()`
(`src/components/table.js`) calls
`instance.featureRenderer.renderAllPersistentFeatures()` on both the zoomed and
the `level === 1.0` reset paths. `handleResize()` also re-renders persistent
features.

**Decision**: No new event wiring needed. Because sampling is recomputed inside
`getVisibleHarmonics` on every render, and every zoom/pan/reset already triggers a
re-render, FR-006 (recompute on zoom/pan) is satisfied by the existing path.

## 4. Sampling algorithm (which pins to keep)

**Decision**: Choose the smallest step `S` from a **nice-number series** such that
the count of retained harmonics ≤ cap, then keep harmonics whose number is a
multiple of `S` within the visible harmonic range.

- **Nice series**: `[1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, …]`
  (1-2-5 progression with the 25/250/2500 members the issue explicitly calls out).
  `S = 1` means "show every pin".
- **Step selection**: for the visible harmonic range `[a, b]`, the number of
  multiples of `S` is `floor(b/S) − floor((a−1)/S)`. Pick the first `S` in the
  series whose multiple-count ≤ cap.
- **Anchor on multiples of `S`** (not on `a`): retained pins are at harmonic
  numbers `S, 2S, 3S, …` that fall in `[a, b]`. This keeps the *same* pins on
  screen as the analyst pans (they don't shuffle), satisfying the "regular,
  predictable series" requirement (FR-004, SC-005).
- **Direct generation**: compute `S` first (O(1)), then emit only the multiples
  in range (≤ cap iterations). Never build the full `[a, b]` array — this is what
  removes the performance/DOM blow-up, not just the visual clutter.

**Rationale**: Multiples-of-nice-number is the standard axis-tick decimation
approach; anchoring on multiples gives pan stability; direct generation bounds
work to the cap.

**Alternatives considered**:
- *Evenly divide the range into ≤ cap buckets (arbitrary step)*: rejected —
  produces ugly non-round harmonic numbers and pins that jump while panning.
- *Keep every pin but drop only labels*: rejected — a wall of unlabelled lines is
  still illegible (spec Assumptions).
- *Fixed step regardless of zoom*: rejected — defeats progressive disclosure.

## 5. Cap value and configurability

**Decision**: `MAX_VISIBLE_PINS = 25` as a named constant in the new helper
module (single source of truth). Not exposed via the `gram-config` table.

**Rationale**: The issue suggested starting at 50; after review the default was
lowered to 25 to widen pin separation and improve legibility. Keeping it a
constant respects Constitution Principle IV (no new authored-config surface) and
keeps scope tight; it can be promoted to configuration later without rework
because it is already a single named value.

## 6. Hit-testing / selection consistency

**Finding**: `findHarmonicSetAtFrequency()` (≈L436) duplicates the same
full-range `minHarmonic..maxHarmonic` loop to decide, on hover/click, which set
the cursor is near (nearest harmonic within a frequency tolerance).

**Decision**: Leave hit-testing operating over the **full** harmonic series
(unchanged behaviour). Selecting/adjusting a set therefore works exactly as it
does today (User Story 3 / FR-010 / AC "works as it did before"), and the analyst
is not blocked from grabbing the set in a sampling gap.

**Optional follow-up (not required for this feature)**: that loop is O(range) per
hover and, for a 0.5 Hz set over a wide span, iterates many times. It can be
reduced to O(1) by computing the nearest harmonic directly
(`round(freq / spacing)`) and checking tolerance. Noted for a future cleanup;
out of scope here to keep the change focused and behaviour-preserving.

## 7. Testing approach

**Decision**:
- **Unit**: exercise `chooseSamplingStep()` / `sampledHarmonics()` directly (pure
  functions) for boundary counts (exactly cap, cap+1), step progression, and
  anchor-on-multiples stability under a shifted range.
- **E2E (Playwright)**: dense-set cap ≤ 25, regular spacing of drawn
  `data-harmonic-number`s, sparse-set pass-through (all pins), zoom-in reveals
  more pins, zoom-out thins, and label↔line correspondence. Add
  `GramFramePage` helpers to count `.gram-frame-harmonic-line` and read their
  `data-harmonic-number` attributes.

**Rationale**: Constitution Principle II requires Playwright coverage of
user-facing behaviour; the pure helper additionally gets fast, exhaustive
boundary tests.
