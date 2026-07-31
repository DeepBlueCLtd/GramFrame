# ADR-016: Zoom by Resizing the Image Element

## Status
Accepted — this describes the shipped implementation. Supersedes
[ADR-015](ADR-015-Viewport-Based-Zoom.md), which specified a viewBox-based
approach that was never adopted.

## Context

ADR-015 decided that zoom would be implemented by narrowing the SVG `viewBox`,
with the spectrogram image left untouched ("No Image Transforms"). What was
built does the opposite, and has been in the field through several feature
cycles since: the `viewBox` stays fixed at the full component extent, and the
`<image>` element's `x`, `y`, `width` and `height` attributes are rewritten on
every zoom or pan.

Spec 165 (finding GF-39) found the ADR and the code contradicting each other.
Since the shipped behaviour is the one analysts rely on — and the mouse-wheel
navigation added later was built on it — the resolution is to record the real
decision rather than change working code to match a paper one.

## Decision

Zoom and pan are applied by **resizing and repositioning the spectrogram image
element** within a fixed SVG viewBox.

- `applyZoomTransform()` (`src/components/table.js`) sets the image element's
  `x`/`y`/`width`/`height` from `state.zoom.{level, centerX, centerY}` and the
  base render size. At level 1.0 the image returns to the axes origin at its
  base size.
- The base render size is `imageDetails.renderWidth/renderHeight`, which the
  expand toggle grows; zoom multiplies it, so expand and zoom compose.
- Axes are re-rendered for the visible data range after every change, and
  `FeatureRenderer.renderAllPersistentFeatures()` redraws overlays at their new
  positions.
- `viewport.js` owns the state side: `setZoom`, `zoomAtImagePoint`,
  `panByNormalized` and `pixelDeltaToNormalizedPan`, the last shared by
  Pan-mode drag, middle-button drag and wheel pan so those cannot diverge.
- Overlays are kept inside the plot area by clip rects, not by the viewBox.

Coordinate conversions read the image element's live attributes as the source of
truth (they already reflect expand × zoom), which is what keeps markers, harmonic
sets and doppler curves aligned with image features at any zoom level.

## Consequences

### Positive

- Zoom, expand and pan compose through one multiplicative render size.
- The axes and margins stay in a stable coordinate space, so axis rendering,
  clipping and hit-testing do not have to track a moving viewBox.
- Pointer-centred zoom is a small calculation on the image rectangle.

### Negative

- Every coordinate path has to consult the image element's attributes rather
  than assuming a fixed mapping, which is exactly the duplication recorded as
  GF-01ᴿ (four coordinate implementations that must stay in step).
- Alignment is maintained by convention across those paths rather than by SVG
  itself, which is what ADR-015 hoped to avoid.

### Follow-up

Consolidating the coordinate pipelines onto one implementation (GF-01ᴿ) is the
outstanding work this design implies; it is scoped in the later remediation
phases, not here.

## Related Decisions

- [ADR-015](ADR-015-Viewport-Based-Zoom.md) — the superseded viewBox approach
- [ADR-002](ADR-002-Multiple-Coordinate-Systems.md) — coordinate system design
- [ADR-001](ADR-001-SVG-Based-Rendering.md) — SVG-based rendering
