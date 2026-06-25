# Feature Specification: Expand Image Toggle

**Feature Branch**: `156-expand-image-toggle`
**Created**: 2026-06-25
**Status**: Draft
**Input**: User description: "Add toggle for expand image" (GitHub Issue #171)

> We should introduce a toggle that allows a user to expand the image to fill the
> available screen area. We should only offer this for images that are wider than
> they are tall (landscape). Portrait images are termed a `verniers` and should
> not be resizable, since the visible features may become unrecognisable.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Expand a Landscape Gram to Fill Available Space (Priority: P1)

An analyst is studying a landscape spectrogram on a published Pub-10 page. The
gram image only occupies part of the GramFrame component, leaving black space to
its right and white space on the page below it. The analyst clicks a small toggle
floating at the top-left of the image. The image immediately grows: it fills the
full width of the GramFrame component and grows downward to consume most of the
remaining vertical space in the current viewport, while the navigation bar, page
title, and the GramFrame control panel (LEDs, mode buttons, tables) all remain
visible. Clicking the toggle again restores the image to its original size.

**Why this priority**: This is the entire feature. A larger image lets analysts
see fine spectral detail that is hard to read at the default size. It is the
minimum viable slice — a single toggle that grows and restores the image.

**Independent Test**: Load a page with a landscape gram, click the expand toggle,
and verify the image grows to fill the GramFrame width and the available viewport
height while nav and control panel stay on screen. Click again and verify it
returns to the original dimensions.

**Acceptance Scenarios**:

1. **Given** a landscape gram at its default size, **When** the analyst clicks the
   expand toggle, **Then** the image region grows to fill the GramFrame component's
   inner width (consuming the black area to its right).
2. **Given** a landscape gram at its default size, **When** the analyst clicks the
   expand toggle, **Then** the image region grows in height to consume most of the
   vertical space available in the current viewport below the image's top edge.
3. **Given** an expanded gram, **When** the analyst clicks the toggle again, **Then**
   the image returns exactly to its original (natural) rendered dimensions.
4. **Given** an expanded gram, **When** the page is laid out, **Then** the top
   navigation bar, page title, and the GramFrame control panel remain visible
   without the user needing to scroll up.
5. **Given** the image is expanded, **When** the analyst reads the axis tick labels,
   **Then** the label text is rendered at its normal (unchanged) size — only the
   image area has grown.

---

### User Story 2 - Existing Annotations Stay Locked to Their Data Points (Priority: P2)

An analyst has already placed analysis markers, harmonics, and/or a doppler curve
on the gram. They toggle expand on and off. Every annotation stays pinned to the
same time/frequency data coordinate it was created at — the markers visually move
and scale together with the stretched image rather than drifting or detaching.

**Why this priority**: Expanding is useless, even harmful, if it corrupts work the
analyst has already done. Correct re-rendering of features against the new image
size is what makes the feature trustworthy. It depends on Story 1 existing.

**Independent Test**: Place a marker at a known data point (e.g. 180 Hz / 00:20),
record its data readout, toggle expand on, toggle expand off, and verify the marker
still reports the same data coordinates and sits on the same image feature.

**Acceptance Scenarios**:

1. **Given** an analysis marker at a known time/frequency, **When** the analyst
   expands the image, **Then** the marker remains on the same data coordinate and
   moves/scales with the image.
2. **Given** a harmonic set on the gram, **When** the analyst expands then collapses
   the image, **Then** the harmonics return to exactly their original positions.
3. **Given** a doppler curve on the gram, **When** the analyst expands the image,
   **Then** the curve continues to track the same data points.
4. **Given** an expanded image, **When** the analyst hovers a pixel and reads the
   time/frequency LEDs, **Then** the reported values match the data coordinate at
   that point (coordinate fidelity is preserved across the render-size change).

---

### User Story 3 - Portrait Verniers Are Not Expandable (Priority: P3)

An analyst views a portrait spectrogram (a `vernier`). No expand toggle is offered
on the image at all, so there is no way to distort the narrow features by scaling.

**Why this priority**: A guard rail that prevents misuse. Low priority because it is
an absence of UI rather than a new capability, but it directly reflects the issue's
explicit constraint.

**Independent Test**: Load a page whose gram image is taller than it is wide and
verify no expand toggle is rendered.

**Acceptance Scenarios**:

1. **Given** a gram whose image is taller than it is wide, **When** the page loads,
   **Then** no expand toggle is present on that gram.
2. **Given** a gram whose image is wider than it is tall, **When** the page loads,
   **Then** the expand toggle is present on that gram.

---

### Edge Cases

- **Multiple grams on one page**: Pub-10 pages are frequently taller than the
  viewport. Each gram computes its available space relative to the current viewport.
  Expanding a lower gram grows it into the current viewport and pushes the grams
  and content below it further down the page (normal document flow). No coordination
  between instances is required for this experiment.
- **Window resize while expanded**: When an expanded gram's container resizes (window
  resize / ResizeObserver), the available width and height are recomputed so the
  image continues to fill the available space.
- **Zoom and Pan**: Zoom and Pan are independent of expand. They continue to operate
  on whatever the current rendered image size is (original or expanded). Expand
  changes the size of the rendered image box; zoom/pan change the data window shown
  within it. The two compose without interfering.
- **Already-large landscape image**: The toggle is always offered for landscape
  images, even when little extra space is available. No minimum-extra-space threshold
  is applied.
- **Collapse returns to natural size**: Collapsing always restores the original
  natural rendered dimensions, regardless of intervening resizes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST render an expand/collapse toggle floating at the
  top-left corner of the image region, positioned so it does not obscure the left
  (time) axis labels.
- **FR-002**: The system MUST render the toggle ONLY for images that are landscape
  (natural width greater than natural height). Portrait/square images MUST receive
  no toggle.
- **FR-003**: When expanded, the system MUST render the image to fill the inner
  width of the GramFrame component (the image area between the left and right axis
  margins spans the component's available width).
- **FR-004**: When expanded, the system MUST render the image to grow in height to
  consume most of the vertical space available within the current viewport below the
  image region's top edge, leaving a small bottom gap, such that the navigation bar,
  page title, and GramFrame control panel remain visible without scrolling up.
- **FR-005**: The system MUST NOT lock the image's aspect ratio when expanding; the
  expanded width and height are computed independently from the available space.
- **FR-006**: The system MUST expand only the image region. Axis margins and axis
  label text MUST retain their normal size; the GramFrame control panel (LEDs, mode
  buttons, markers/harmonics tables) MUST be unaffected in size.
- **FR-007**: The system MUST maintain a rendered image size that is decoupled from
  the image's natural size, and all coordinate transforms (screen ↔ image ↔ data)
  and feature rendering MUST use the rendered size so that data-coordinate fidelity
  is preserved at any rendered size.
- **FR-008**: On toggling expand or collapse, the system MUST re-render all persistent
  features (analysis markers, harmonics, doppler) so they remain locked to their
  original data coordinates.
- **FR-009**: When collapsed, the system MUST restore the image to its original
  natural rendered dimensions exactly.
- **FR-010**: When an expanded gram's container resizes, the system MUST recompute
  the available width and height and re-render so the image continues to fill the
  available space.
- **FR-011**: The expand state MUST be held in memory per GramFrame instance, default
  OFF, and MUST NOT be persisted to browser storage.
- **FR-012**: Zoom and Pan MUST remain available and functional in both expanded and
  collapsed states, operating on the current rendered image size.

### Key Entities

- **Rendered image dimensions**: The width/height at which the spectrogram image,
  axes span, and feature overlay are currently drawn. Defaults to the natural
  (load-time, capped) dimensions; set to computed fill dimensions when expanded.
  Distinct from the natural dimensions, which are retained as the data-mapping
  reference and the landscape test.
- **Expand state**: A per-instance, in-memory boolean (expanded / collapsed),
  default collapsed, not persisted.
- **Available space**: The width of the GramFrame component's image region and the
  vertical space from the image region's top edge to the viewport bottom (minus a
  small gap), recomputed at toggle time and on resize.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: When expanded at a fixed viewport, the rendered image width equals the
  GramFrame component's inner image-region width within ±2px.
- **SC-002**: When expanded at a fixed viewport, the rendered image height equals the
  computed available height within ±2px.
- **SC-003**: Axis tick-label text size is identical before and after expanding
  (proving only the image expands).
- **SC-004**: For a known pixel/data point, hovering before expand and hovering the
  corresponding point after expand report the same frequency/time values (coordinate
  fidelity preserved across the render-size change).
- **SC-005**: No expand toggle is present for a portrait/`vernier` image; the toggle
  is present for a landscape image.
- **SC-006**: Collapsing restores the image to its exact original natural dimensions.
- **SC-007**: After expand and collapse, an annotation placed before expanding sits
  at its original screen position and reports its original data coordinates.

## Acceptance Testing Approach

To exercise the feature in a realistic published-document context without running
OxygenXML, a self-contained demonstrator page is reconstructed from the published
Pub-10 page `out/pub-10/Grams/gram1.html`:

- The published page's shell is reproduced verbatim — the "COMMERCIAL IN CONFIDENCE"
  banner, top navigation bar, page title, the `gram-config` table, the right-hand
  "Related information" sidebar, and the Question/Theory table beneath the gram —
  using copies of its upstream CSS/JS assets (`commons.css`, `topic.css`,
  `oxygen.css`, `f13ldman.css`, `notes.css`, and the oxygen-webhelp scripts).
- The published `gramframe.bundle.js` is replaced with the locally built GramFrame
  bundle so tests exercise the current source.
- The demonstrator uses the published landscape spectrogram (`gram-1.png`, 902 × 237,
  time 0–40, freq 100–300), giving a layout with navigation above and content below —
  the conditions FR-004 and the multiple-gram edge case depend on.

Playwright acceptance tests run against this demonstrator at a fixed viewport to
assert SC-001 through SC-007.

## Assumptions

- "Fill the available width" means the width of the GramFrame component itself (the
  image consumes the black area currently to its right), not the full browser
  viewport width or the page's right sidebar.
- "Consume most of" the available vertical space means filling the space from the
  image region's top edge down to the viewport bottom, less a small gap (~16px), so
  the expanded frame is not flush against the window edge.
- Landscape is defined strictly as natural width greater than natural height; square
  images are treated as non-landscape and receive no toggle.
- The toggle is an early experiment to gather user feedback; its visual styling can be
  minimal (a small semi-transparent button with an expand/collapse icon).
- The existing ResizeObserver and window resize handling are reused to drive
  recomputation; no new observers are required.
- Persistence (browser storage, feature 155) is intentionally out of scope for the
  expand state.
