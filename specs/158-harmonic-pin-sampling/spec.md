# Feature Specification: Sample Harmonic Pins to Keep Them Legible

**Feature Branch**: `158-harmonic-pin-sampling`  
**Created**: 2026-07-17  
**Status**: Draft  
**Input**: User description: "GH issue 183 — Harmonic pins illegible at very low intervals"

## User Scenarios & Testing *(mandatory)*

<!--
  'Pin' is the domain term for the vertical line drawn for one harmonic of a
  harmonic set. A set placed with a small spacing (e.g. 0.5 Hz) over a wide
  frequency span produces hundreds or thousands of pins, which merge into a
  solid block of lines and overlapping number labels.
-->

### User Story 1 - Keep a dense harmonic set legible (Priority: P1)

An analyst adds a harmonic set and gives it a small spacing (for example
0.5 Hz). Across the visible spectrogram this would place hundreds of pins so
close together that the lines merge into a solid block and the number labels
overlap into an unreadable smear. Instead, the overlay shows only a manageable
subset of pins — thinned to a readable density — so the analyst can still make
out individual pins and read their labels. The overlay conveys the harmonic
structure without becoming an opaque wall.

**Why this priority**: This is the core problem reported in the issue. Without
it, a low-interval harmonic set makes the overlay useless. Thinning dense pins
to a legible density delivers the primary value on its own and is independently
demonstrable.

**Independent Test**: Add a harmonic set with 0.5 Hz spacing over a wide
frequency span, and confirm the overlay renders a bounded, readable number of
pins (not a solid block), each with a legible, non-overlapping label.

**Acceptance Scenarios**:

1. **Given** a harmonic set whose spacing would place far more pins than can be
   read across the visible frequency span, **When** the overlay renders, **Then**
   only a thinned subset of pins is drawn so the total stays at or below the
   maximum-pins limit.
2. **Given** such a thinned overlay, **When** the analyst reads it, **Then**
   adjacent pin labels do not overlap and each drawn pin's label is legible.
3. **Given** a harmonic set whose pins already number at or below the limit
   across the visible span, **When** the overlay renders, **Then** every pin is
   shown (no thinning is applied).
4. **Given** a thinned overlay, **When** pins are sampled, **Then** the retained
   pins are spaced at a regular, predictable step (every Nth harmonic) rather
   than dropped arbitrarily.

---

### User Story 2 - Reveal finer detail by zooming in (Priority: P2)

An analyst working with a dense harmonic set zooms in on the feature of
interest. As the visible frequency span narrows, fewer pins fall inside the view
and more of them can be shown legibly, so the overlay progressively reveals finer
harmonic detail. When the analyst zooms back out or pans to a wider view, the
overlay thins again to stay readable. The pin density adapts every time the view
changes.

**Why this priority**: Progressive disclosure is the workflow the issue
describes — thin when zoomed out, reveal when zoomed in. It builds directly on
Story 1 and makes the thinning feel like a helpful level-of-detail behaviour
rather than hidden data.

**Independent Test**: With a dense harmonic set displayed, zoom in on a region
and confirm more pins become visible (down to every pin once the visible span is
small enough); zoom back out or pan and confirm the overlay thins again — with
the pin set recomputed on each zoom and pan change.

**Acceptance Scenarios**:

1. **Given** a thinned harmonic overlay, **When** the analyst zooms in so that
   the visible frequency span narrows, **Then** the overlay shows more pins (a
   finer sampling step) while still respecting the maximum-pins limit.
2. **Given** the analyst has zoomed in far enough that all pins within the
   visible span fall at or below the limit, **When** the overlay renders,
   **Then** every pin in view is shown.
3. **Given** a finely sampled overlay, **When** the analyst zooms out or pans to
   a wider span, **Then** the overlay thins again to stay within the limit.
4. **Given** any change of zoom or pan, **When** the view settles, **Then** the
   set of drawn pins is recalculated for the new visible frequency span.

---

### User Story 3 - Consistent labels and interaction on the shown pins (Priority: P3)

An analyst interacts with a thinned harmonic overlay — reading labels, and
selecting or adjusting the set. The labels shown belong to the pins that are
actually drawn, and interacting with the overlay behaves consistently with what
is displayed, so the thinning never leaves the analyst reading a label for a pin
that isn't there or confused about which set they are touching.

**Why this priority**: Thinning must not break the existing read-and-adjust
workflow. It is a correctness/consistency guard on Stories 1 and 2 rather than
new capability, so it is lower priority but still required for a trustworthy
result.

**Independent Test**: On a thinned overlay, confirm every visible label matches a
drawn pin and its harmonic number, and confirm the analyst can still select and
adjust the harmonic set as before.

**Acceptance Scenarios**:

1. **Given** a thinned overlay, **When** the analyst reads any pin label,
   **Then** it correctly identifies the harmonic number of a pin that is
   actually drawn.
2. **Given** a thinned overlay, **When** the analyst selects or adjusts the
   harmonic set, **Then** the interaction works as it did before thinning was
   introduced.

---

### Edge Cases

- **Very small spacing over a wide span** (the reported 0.5 Hz case): the overlay
  must never render more than the maximum-pins limit; it thins to a legible
  subset instead of a solid block.
- **Spacing large enough that few pins fit**: no thinning is applied and every
  pin is shown.
- **Extreme zoom-in on a narrow slice**: once the number of pins in the visible
  span is at or below the limit, all of them are shown at the finest step.
- **Extreme zoom-out**: the overlay stays at or below the limit with the coarsest
  step needed.
- **Panning without zooming**: the visible span width is unchanged, so the
  sampling step is unchanged, but the specific pins in view are recomputed for
  the new position.
- **Multiple harmonic sets on screen at once**: the legibility limit applies to
  each harmonic set independently, so each set stays readable on its own terms.
- **A harmonic set whose thinned step would hide the lowest/fundamental pin**:
  the retained pins still form a regular series a reader can extrapolate from.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST limit the number of pins drawn for a single
  harmonic set within the visible frequency span to at most a defined
  maximum-pins limit.
- **FR-002**: The default maximum-pins limit MUST be 50.
- **FR-003**: When the number of pins a harmonic set would place across the
  visible frequency span exceeds the limit, the system MUST draw a thinned
  subset by keeping every Nth pin (sampling by a regular step) rather than
  drawing every pin.
- **FR-004**: The sampling step MUST be chosen from a series of "nice" values
  (for example every 5, 10, 25, 50, 100, 250 …) — the smallest step that brings
  the drawn pin count to at or below the limit for the current visible span.
- **FR-005**: When the number of pins across the visible frequency span is
  already at or below the limit, the system MUST draw every pin (no thinning).
- **FR-006**: The system MUST recompute which pins are drawn whenever the zoom
  level or pan position changes, using the frequency span visible after that
  change.
- **FR-007**: As the visible frequency span narrows (zoom in), the system MUST
  show the same or a finer sampling of pins; as the span widens (zoom out), it
  MUST show the same or a coarser sampling — density MUST never decrease when
  zooming in or increase when zooming out.
- **FR-008**: Each drawn pin MUST retain its label, and labels MUST only be drawn
  for pins that are actually drawn (no orphan labels for skipped pins).
- **FR-009**: The thinning MUST NOT change the underlying harmonic set (its
  spacing, anchor, colour, or identity); it affects only which pins are
  displayed.
- **FR-010**: Interaction with a harmonic set (selecting or adjusting it) MUST
  remain consistent with the displayed, thinned overlay.
- **FR-011**: The legibility limit MUST be applied per harmonic set, so each set
  on screen is thinned independently.

### Key Entities *(include if data involved)*

- **Harmonic Set**: A series of harmonic pins the analyst places on the
  spectrogram, defined by a spacing (frequency interval between consecutive
  pins), an anchor position, and a colour/identity. This feature does not change
  the set's data; it changes only how many of its pins are drawn.
- **Pin**: The vertical line (with a harmonic-number label) drawn for one
  harmonic of a set. The harmonic at position *n* sits at *n × spacing*. This
  feature decides which pins in the visible span are drawn.
- **Visible frequency span**: The range of frequencies currently in view,
  determined by the current zoom and pan state. Its width (in Hz) together with
  the set's spacing drives how many pins would appear and therefore the sampling
  step.
- **Maximum-pins limit**: The upper bound on how many pins one harmonic set may
  draw within the visible span (default 50).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For any harmonic set at any zoom/pan, no more than the
  maximum-pins limit (default 50) pins are drawn for that set within the visible
  frequency span.
- **SC-002**: For the reported case (a 0.5 Hz harmonic set over a wide span), the
  overlay renders as distinct, readable pins with non-overlapping labels rather
  than a solid block.
- **SC-003**: When zooming in on a dense harmonic set, the analyst sees the same
  or more pins revealed at each step until, at a small enough span, every pin in
  view is shown.
- **SC-004**: When zooming out or panning to a wider span, the overlay returns to
  a thinned state that stays within the limit.
- **SC-005**: The drawn pins are always sampled at a regular step, so the
  retained pins form an evenly spaced, predictable series the analyst can read.
- **SC-006**: The set of drawn pins updates on every zoom and pan change with no
  perceptible lag to the analyst.
- **SC-007**: A harmonic set that already fits within the limit shows all of its
  pins (thinning never removes pins unnecessarily).

## Assumptions

- The default maximum-pins limit is 50, as suggested in the issue. It is a single
  tunable value; changing it later does not change the feature's scope.
- "Skipping insignificant pins" means dropping whole pins (line and its label)
  by sampling, not merely hiding labels while keeping the lines. A solid block of
  unlabelled lines would be no more legible.
- Sampling is done by keeping every Nth harmonic (a regular step by harmonic
  number). Because a pin's frequency is *n × spacing*, stepping by harmonic
  number is equivalent to stepping by a fixed frequency interval, so the retained
  pins are evenly spaced in frequency.
- The "nice" step series starts at 1 (show every pin) and increases through
  values such as 5, 10, 25, 50, 100, 250 (and further as needed). The exact final
  series is a design detail that does not change scope.
- The visible frequency span is derived from the current zoom and pan state, so
  that zooming in narrows the span and reveals finer pins. This assumes the
  visible-span width (in Hz) can be determined for the current view; today zoom
  is applied as a visual transform over the full data range, so exposing the
  visible span for the sampling calculation is part of this work.
- The limit and sampling apply per harmonic set; overall on-screen pin count
  across multiple sets is not separately capped.
- Existing harmonic-set creation, colour/symbol, persistence, and selection
  behaviours are unchanged except for how many pins are drawn.
