# Contract — Canonical coordinate module

**Module**: `src/utils/coordinates.js` (constitution Principle I names this path)
**Replaces**: `src/utils/coordinateTransformations.js`, the private
`dataToSVGCoordinates` / `svgToDataCoordinates` in `src/core/keyboardControl.js`,
and the inline `screenToDataWithZoom` in `src/core/events.js`.

## Invariants

- **I1** Every screen ↔ SVG ↔ image ↔ data conversion in `src/` routes through
  this module (FR-002). No caller re-derives a transform inline.
- **I2** The module is zoom-, expand-, render-size- and margin-aware (FR-003).
  Callers do **not** compensate externally — in particular, `keyboardControl.js`
  stops dividing its increment by the zoom level.
- **I3** Where a spectrogram image element is supplied, its live `x`/`y`/
  `width`/`height` attributes are the source of truth (they already encode
  expand × zoom). `imageDetails.renderWidth/renderHeight`, defaulting to
  `naturalWidth/naturalHeight`, are the fallback when no element is present.
- **I4** `rate` is a frequency divider applied on the data side only; SVG and
  image space are rate-free.
- **I5** Bounds handling is explicit and separate from transformation. Transform
  functions never silently clamp *and* never return `null`; callers that need a
  bounds decision call the predicate.

## Surface

```js
/** Viewport bundle every transform takes. */
/**
 * @typedef {Object} Viewport
 * @property {AxesMargins} margins
 * @property {ImageDetails} imageDetails
 * @property {Config} config
 * @property {number} rate
 */

/** Screen (client) point relative to the SVG element's bounding box. */
screenToSVG(screenX, screenY, svg) -> SVGCoordinates

/** SVG point -> image-relative point, in render-pixel space. */
svgToImage(svgX, svgY, viewport, spectrogramImage?) -> ImageCoordinates

/** Image-relative point -> data. Rate applied here. */
imageToData(imageX, imageY, viewport) -> DataCoordinates

/** Data -> SVG. Inverse of screenToSVG ∘ svgToImage ∘ imageToData. */
dataToSVG(dataPoint, viewport, spectrogramImage?) -> SVGCoordinates

/** Convenience composition used by pointer and wheel handlers. */
screenToData(clientX, clientY, svg, viewport, spectrogramImage?)
  -> { data: DataCoordinates, image: ImageCoordinates, svg: SVGCoordinates }

/** Live image bounds in SVG space (element attributes when present). */
getImageBounds(viewport, spectrogramImage?) -> { left, top, width, height }

/** Bounds predicate — the only place "is this point over the image" is decided. */
isWithinImage(svgPoint, viewport, spectrogramImage?) -> boolean
```

## Behavioural equivalences the pin grid asserts (AS-2.1)

For every cell of the grid in research.md §R2 — zoom ∈ {1, 1.5, 2, 4} ×
expand ∈ {off, on} × render size ∈ {natural, 2×, non-uniform} × margins ∈
{default, zero, asymmetric} × rate ∈ {1, 2}:

| # | Assertion | Tolerance |
|---|---|---|
| E1 | `screenToData` agrees with today's `events.js:screenToDataWithZoom` for in-bounds points | 1e-9 relative |
| E2 | `dataToSVG` agrees with today's `coordinateTransformations.js:dataToSVG` | 1e-9 relative |
| E3 | `dataToSVG` agrees with today's `keyboardControl.js:dataToSVGCoordinates` **at zoom 1, expand off** — the conditions under which the keyboard path is currently correct | 1e-9 relative |
| E4 | `imageToData` agrees with today's `coordinates.js:imageToDataCoordinates` | 1e-9 relative |
| E5 | `dataToSVG(imageToData(p)) ≈ p` round-trips for in-bounds points | 1e-9 relative |
| E6 | `isWithinImage` agrees with the bounds predicate inside `screenToDataWithZoom` | exact |

E3 is deliberately narrower than E1/E2/E4: the keyboard path is not
zoom/expand-aware and compensates externally (GF-01ᴿ). Outside zoom 1 / expand
off the grid records the *rendered-pixels-per-keypress* equivalence instead —
one keypress must move a marker the same number of rendered pixels before and
after consolidation, which is what the user actually experiences and what
`tests/keyboard-movement.spec.js` asserts in a real browser.

If any grid cell fails **before** consolidation, the pin is not faithful:
triage the divergence as a bug in its own issue and do not proceed to deletion
(spec Assumptions, AS-2.1).

## Post-consolidation gate

- Vitest grid green (now run against the canonical module only).
- `tests/keyboard-movement.spec.js` green.
- Full Playwright suite green with **zero spec diffs** (SC-002).
- `yarn hygiene`: madge cycle count not increased (AS-2.3); baselines lowered
  where the deletions allow.
- Mouse, keyboard, wheel-zoom and expand report identical data coordinates for
  the same physical point (AS-2.4, SC-003).
