# Phase 0 Research: Expand Image Toggle

All open questions from the spec were resolved during the design discussion with the
stakeholder (issue #171). This document records the resulting decisions and the
codebase facts that constrain implementation. There are **no remaining NEEDS
CLARIFICATION** items.

## Decision 1 — Decouple rendered image size from natural size

**Decision**: Introduce `renderWidth`/`renderHeight` in `state.imageDetails` (default =
`naturalWidth`/`naturalHeight`). When expanded, these hold the computed fill dimensions.
All layout and coordinate math that currently divides/multiplies by `naturalWidth`/
`naturalHeight` to map data ↔ image pixels switches to the **rendered** dimensions.

**Rationale**: The data range (`freqMin..freqMax`, `timeMin..timeMax`) maps across the
*displayed* image, whatever its pixel size. Keying transforms off the rendered size
preserves coordinate fidelity (SC-004) while letting the image grow. `naturalWidth`/
`naturalHeight` are retained as the load-time reference and the landscape test only.

**Codebase facts** (the exact lines that must change):
- `src/components/table.js:177-178` — `axesWidth/axesHeight` set from natural; must use render dims.
- `src/components/table.js:198-214` — image + clip rects sized from natural; use render dims.
- `src/components/table.js:292-306` — `renderAxes` spans natural dims; use render dims.
- `src/utils/coordinates.js:53,56-63` — `imageToDataCoordinates` divides by natural; use render dims.
- `src/rendering/cursors.js:66-69` — data→pixel uses `naturalWidth`; use render dims.
- `src/core/events.js:25-59` — screen→data path (normalizes zoom, subtracts margins) must
  normalize against the base **render** size, not natural.

**Alternatives considered**:
- *`preserveAspectRatio="none"` on the whole SVG + a bigger CSS box*: trivial, zero
  coordinate changes, but stretches the **axis-label text** too — violates "only the
  image expands" (FR-006/SC-003). Rejected.
- *Overload `naturalWidth`/`naturalHeight` with the expanded values*: loses the
  data-mapping reference and the landscape test, and corrupts collapse-restore. Rejected
  in favour of a separate render field.

## Decision 2 — Composition with the existing zoom/pan transform

**Decision**: Expand sets the **base** render size; zoom multiplies it. The existing
zoom path is the model to follow and must be made render-size aware rather than
natural-size aware.

**Rationale**: The stakeholder requires zoom/pan to remain independent and to act on the
current image size (original or expanded). The code already renders the image element at
non-natural sizes under zoom (`table.js:254-272`, `zoomedWidth = naturalWidth * level`)
and already recomputes the visible range from the *actual element* dimensions
(`table.js:334-335`). Expand reuses that decoupling: base size becomes `renderWidth`
instead of `naturalWidth`, and zoom applies `level` on top.

**Risk / validation**: The screen→data normalization in `events.js` divides out
`zoom.level` to recover image-pixel coordinates. After this change it must divide by the
**base render** size, then map to data via render dims — so expand × zoom composes
multiplicatively without double-counting. This is the single highest-risk interaction
and is covered by SC-004 (coordinate fidelity) plus an explicit expand-then-zoom test.

## Decision 3 — Available-space computation

**Decision**: At toggle time and on resize, compute:
- **Width** = the GramFrame component's inner image-region width (image fills the black
  area to its right, between the 60px left and 15px right axis margins).
- **Height** = `viewportBottom − imageRegionTop − bottomGap` (gap ≈ 16px), i.e. fill down
  to near the viewport bottom from the image region's current top.

**Rationale**: Growing downward keeps the control panel (above the image) and nav/title
on screen (FR-004). Pub-10 pages are typically taller than the viewport, so expanding a
lower gram simply pushes following content down (normal flow) — no inter-instance
coordination needed.

**Alternatives considered**: Locking aspect ratio (rejected per stakeholder — width and
height computed independently); a minimum-extra-space threshold before allowing expand
(rejected — always allow for landscape).

## Decision 4 — Reuse existing resize machinery

**Decision**: Reuse the existing `ResizeObserver` (`src/core/events.js:129-140`) and
window `resize` handler, which already call `updateSVGLayout` → `renderAxes`. When
expanded, the layout function recomputes available space so the fill is maintained
(FR-010). No new observers.

**Rationale**: The reflow path already exists; expand only changes the dimensions it
computes from.

## Decision 5 — Feature re-render on toggle

**Decision**: On expand/collapse, after recomputing layout, call
`FeatureRenderer.renderAllPersistentFeatures()` (`src/core/FeatureRenderer.js:23`) so
markers, harmonics, and doppler re-resolve through the (now render-size-aware) transforms
and stay locked to their data coordinates (FR-008/SC-007).

**Rationale**: Constitution III — cross-mode feature coordination goes through
`FeatureRenderer`, not mode-to-mode calls. The features store data coordinates, so a
re-render at the new size repositions them correctly with no per-mode change.

## Decision 6 — Toggle control: HTML control, landscape-gated, in-memory

**Decision**: A small `<button>` floating at the image region's top-left (inside the
`position: relative` `.gram-frame-main-panel`), shown only when
`naturalWidth > naturalHeight`. Expand state is a per-instance in-memory boolean, default
off, not persisted.

**Rationale**: Consistent with existing HTML controls (`ModeButtons`, `ColorPicker`);
Principle I governs *data* overlays (which stay SVG), not UI controls. Landscape gate and
non-persistence are explicit requirements (FR-002, FR-011). Square images are treated as
non-landscape.

## Decision 7 — Demonstrator-based acceptance testing

**Decision**: Add `sample/pub10-gram1.html`, rebuilt from the published Pub-10 page
`out/pub-10/Grams/gram1.html`, reusing its CSS/JS shell but loading the locally built
GramFrame bundle, with the landscape `gram-1.png` (902×237, time 0–40, freq 100–300).
Playwright runs SC-001..007 against it at a fixed viewport.

**Rationale**: Exercises the feature in the real published layout (nav above, content
below, sidebar beside — the conditions FR-004 and the multi-gram edge case depend on)
without requiring OxygenXML. Assets were mirrored during research and are ready to import.
