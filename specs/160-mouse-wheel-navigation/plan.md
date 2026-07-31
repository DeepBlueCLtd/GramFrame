# Implementation Plan: Mouse-Wheel Pan and Zoom

**Feature Branch**: `160-mouse-wheel-navigation`
**Spec**: [spec.md](./spec.md)
**Status**: Ready for implementation

## Summary

GramFrame today zooms only via the Pan-mode +/− buttons and pans only by
click-drag in Pan mode. Issue #198 (review feedback, bullet 3) asks for familiar
map-style wheel navigation, available in **every** mode:

1. **Ctrl+scroll** zooms in/out, centred on the pointer (US1 / FR-002–FR-004).
2. **Plain scroll** pans horizontally along frequency, but only when zoomed in
   (US2 / FR-005, FR-007).
3. **Wheel-button (middle) drag** pans the view when zoomed in, without triggering
   the active mode's left-button action (US3 / FR-006, FR-009).
4. **On-screen guidance** describes all three, in every mode (US4 / FR-012).

Mouse-wheel and middle-button input are currently **unused everywhere**, so the
interactions are added **globally** at the input layer rather than per-mode. They
reuse the existing zoom (`zoom.level/centerX/centerY` + `applyZoomTransform`) and
pan (centre-clamping) mechanisms, so nothing new is persisted and the existing
+/− buttons and click-drag pan are untouched.

## Technical Context

- **Language**: JavaScript (ES2020+, JSDoc-typed via `checkJs`, no compilation), Vite build.
- **Rendering**: SVG overlay; zoom is applied by repositioning/resizing the
  `<image>` element in `applyZoomTransform()` (`src/components/table.js`), not by a
  viewBox or group transform.
- **Zoom state**: `state.zoom = { level, centerX, centerY }`; limits (1.0–10.0)
  are enforced in `src/core/viewport.js`.
- **Input layer**: all mouse handlers are bound to `instance.svg`
  (`src/core/events.js`), which is where wheel + middle-button are added (agreed
  interception surface: the spectrogram SVG, not the whole component — so panels,
  LEDs and the harmonic table stay page-scrollable).

## Design

### Interception surface

Wheel and middle-button listeners bind to `instance.svg` — the same element as
every existing mouse handler. `preventDefault()` (needed to suppress host-page
scroll on zoom/pan and browser middle-click autoscroll) therefore only fires over
the spectrogram surface. Wheeling over surrounding chrome keeps its normal
behaviour (FR-010, matches the spec's "over the spectrogram" wording).

### Shared viewport helpers (single source of truth)

Three helpers are added to `src/core/viewport.js` so the new wheel path and the
existing Pan-mode drag path share identical maths:

- `zoomAtImagePoint(instance, factor, imageX, imageY)` — pointer-centred zoom.
  New level = `clamp(level × factor, 1.0, 10.0)`; a no-op at the limit. Derives
  the new centre from the pointer's image-render fraction
  (`centerX = imageX / renderWidth`, `centerY = imageY / renderHeight`, clamped
  0–1) so the feature under the cursor is the zoom anchor (FR-004; exact
  pointer-anchoring from level 1, approximate thereafter — the spec's documented
  acceptable behaviour). Resets to centre when returning to level 1.
- `pixelDeltaToNormalizedPan(instance, dxPx, dyPx)` — the existing Pan-mode
  pixel→normalized conversion (render size, SVG rect scale, ÷ zoom level, negated
  so content follows the drag), extracted verbatim.
- `panByNormalized(instance, dCx, dCy)` — the existing centre-clamp pan
  (`clamp(center + delta, 0, 1)`), a no-op at level 1 (FR-007), clamped at the
  data edges (FR-008).

`PanMode.handleMouseMove()` / `panImage()` are refactored to call these, so the
drag-pan and wheel-pan can never diverge.

### Global wheel handler (`handleWheel` in events.js)

Uses `screenToDataWithZoom()` (returns `null` off the image → do nothing, let the
page scroll):

- **Ctrl held** → `zoomAtImagePoint(instance, deltaY < 0 ? STEP : 1/STEP, …)` and
  `preventDefault()` (always — it is a zoom gesture, even at the limit).
- **No Ctrl, zoomed in** → horizontal pan from `pixelDeltaToNormalizedPan(-deltaY, 0)`
  (scroll down → forward in frequency) and `preventDefault()`.
- **No Ctrl, level 1** → nothing; the host page scrolls normally.

Bound with `{ passive: false }` so `preventDefault()` is honoured.

### Global middle-button drag (in events.js mousedown/move/up/leave)

`event.button === 1` is intercepted **before** mode delegation and never
delegates (so no cursor/marker/harmonic/doppler point is placed — FR-009):

- **mousedown(button 1)**: `preventDefault()` (suppress autoscroll); if zoomed in,
  begin a wheel-pan (`instance._wheelPan = { active, lastX, lastY, prevCursor }`,
  cursor → `grabbing`).
- **mousemove while `_wheelPan.active`**: pan via
  `pixelDeltaToNormalizedPan` → `panByNormalized`, update last point, return early.
- **mouseup / mouseleave while active**: end cleanly, restore cursor (FR-011).

`_wheelPan` is a transient field on the instance (declared on the class, like
`resizeObserver`); it is **not** part of the broadcast state.

### Guidance (US4)

A shared constant `WHEEL_NAV_GUIDANCE` (`src/utils/wheelGuidance.js`) is spread
into every mode's `getGuidanceText().items`, so the wheel interactions are
discoverable in Analysis, Harmonics, Doppler and Pan (FR-012), noting the
zoom-in precondition for the pan gestures.

## Files Changed

- `src/core/viewport.js` — add `zoomAtImagePoint`, `pixelDeltaToNormalizedPan`,
  `panByNormalized`.
- `src/core/events.js` — `wheel` listener + `handleWheel`; middle-button branches
  in mousedown/move/up/leave; `endWheelPan` helper.
- `src/modes/pan/PanMode.js` — route drag-pan through the shared helpers.
- `src/utils/wheelGuidance.js` — new shared guidance constant.
- `src/modes/{analysis,harmonics,doppler,pan}/*Mode.js` — spread wheel guidance
  into `getGuidanceText()`.
- `src/main.js` — declare the transient `_wheelPan` field.
- `tests/helpers/gram-frame-page.js` — `wheelAtSVG()` and `middleDragSVG()` helpers.
- `tests/pan-zoom.spec.js` — new E2E coverage for US1–US4 + regression.
- `tests/harmonic-symbols.spec.js` — scroll the SVG into view before an existing
  raw-mouse drag (the taller guidance panel pushes the component below the default
  test viewport).

## Testing Strategy

- E2E US1: Ctrl+scroll up increases `zoom.level` (≤ 10), down decreases (≥ 1);
  Ctrl+scroll at an off-centre pointer moves `centerX/centerY` toward the pointer.
- E2E US2: at level > 1, plain scroll changes `centerX`; at level 1 it does not.
- E2E US3: at level > 1, middle-drag changes the centre; in Analysis mode a
  middle-drag places **no** marker (`analysis.markers` stays empty) while a normal
  click still does.
- E2E US4: `.gram-frame-guidance` names all three wheel interactions in Analysis
  and Pan modes.
- Regression: +/− buttons and click-drag pan still change zoom/centre as before.

## Out of Scope

- Changing existing zoom limits/step, the +/− buttons, or Pan mode gating.
- Per-axis (frequency-only or time-only) zoom — wheel zoom is uniform, matching
  the button zoom.
- Any new persisted state.

## Constitution Check

- **I. SVG-First**: no new render surface; reuses the existing SVG image transform.
- **II. Test-First**: new Playwright coverage for every user story (mandatory).
- **III. Modular Modes**: the interactions are global input, not a mode; no mode
  depends on another. Guidance is added via a shared constant, not mode-to-mode calls.
- **IV. Declarative HTML config**: unaffected.
