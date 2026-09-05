# Feature Specification: Show All Harmonic Pins, Label Only the Major Subset

**Feature Branch**: `159-harmonic-pin-labels`  
**Created**: 2026-07-24  
**Status**: Complete — implemented and merged
**Input**: GH issue #198 (Review feedback) — bullets 1 & 2: "For harmonics, show all pins, but infrequent labels" and "Move harmonic label vertically above symbol/pin".

## User Scenarios & Testing *(mandatory)*

<!--
  Background: A "harmonic set" places a series of vertical "pins" (one per
  harmonic, at n × spacing). A prior feature (spec 158) kept dense sets legible
  by SAMPLING pins — drawing only every Nth pin (default max 25) and dropping the
  rest entirely (line + label + symbol). Review feedback is that dropping the
  lines loses information analysts need: they want to see the full harmonic
  structure. This feature keeps the sampling idea but applies it only to labels
  and symbols, while every pin LINE is drawn.
-->

### User Story 1 - See every harmonic pin, even at high density (Priority: P1)

An analyst places a harmonic set with a small spacing over a wide frequency span.
This would produce hundreds of pins. Today the overlay thins the set down to a
sampled subset and draws only those, so the analyst cannot see the full harmonic
structure. Instead, the analyst now sees **every** pin line drawn — even where
they crowd together into a near-solid block of colour — because the complete
harmonic structure is itself the information the analyst is reading. Only the
number labels and symbols are thinned, so the overlay stays readable without
hiding any pins.

**Why this priority**: This is the core correction requested in the review. The
current behaviour discards pin lines that analysts rely on. Drawing all pins
while thinning only the labels/symbols restores the lost information and is
independently demonstrable on its own.

**Independent Test**: Add a harmonic set whose spacing would place far more than
the label limit across the visible span, and confirm that a pin line is drawn for
every harmonic in the visible span (no lines are dropped), while only a bounded
subset of pins carry a number label and symbol.

**Acceptance Scenarios**:

1. **Given** a harmonic set whose pins across the visible frequency span number
   more than the label limit, **When** the overlay renders, **Then** a pin line
   is drawn for every harmonic in the visible span (none are dropped), even if
   the lines visually merge into a solid block.
2. **Given** that same dense harmonic set, **When** the overlay renders, **Then**
   number labels and symbols are drawn only on a thinned "major" subset of the
   pins, at most the label limit (default 25).
3. **Given** a harmonic set whose pins across the visible span already number at
   or below the label limit, **When** the overlay renders, **Then** every pin is
   drawn AND every pin carries a label and symbol (no thinning of labels).
4. **Given** any dense overlay, **When** the analyst zooms in so fewer pins are in
   view, **Then** more pins gain labels/symbols (down to all pins labelled once
   the count drops to or below the limit); zooming out or panning to a wider span
   thins the labels/symbols again.
5. **Given** a thinned overlay, **When** the labels/symbols are sampled, **Then**
   they fall on a regular, predictable step (every Nth pin) rather than an
   arbitrary selection, and each drawn label matches an actual pin's harmonic
   number.

---

### User Story 2 - Read labels clearly above the pins (Priority: P2)

With every pin now drawn, the pins sit close together and the current label
position — offset to the top-right of each pin's line, just beneath the symbol —
is easily obscured by neighbouring pins. Instead, each labelled pin shows its
number label **centred horizontally above its symbol**, stacked vertically over
the pin (label on top, then symbol, then the pin line). This vertical stack keeps
the label clear of adjacent pins and clear of the pin's own line.

**Why this priority**: This directly follows Story 1 — once all pins are drawn,
the old top-right label position is prone to being covered. Repositioning the
label above the symbol keeps the thinned labels readable, which is the point of
thinning them. It has value only in combination with Story 1, so it is P2.

**Independent Test**: Display a labelled pin and confirm its number label is
centred horizontally on the pin line and rendered above the symbol (not to the
right of the line), with the vertical order label → symbol → pin line.

**Acceptance Scenarios**:

1. **Given** a labelled pin, **When** the overlay renders, **Then** the pin's
   number label is horizontally centred on the pin's vertical line.
2. **Given** a labelled pin with a symbol, **When** the overlay renders, **Then**
   the label sits above the symbol, which sits above the top of the pin line
   (top-to-bottom order: label, symbol, line).
3. **Given** a labelled pin whose stack would extend above the top edge of the
   spectrogram image, **When** the overlay renders, **Then** the label and symbol
   are kept within the visible area and remain legible.

---

### Edge Cases

- **Extremely dense set (e.g. 0.5 Hz over a wide span)**: every pin line is drawn
  (a solid block is acceptable and expected), while labels/symbols stay at or
  below the limit so the numbers remain readable.
- **Set already within the limit**: every pin is drawn and every pin is labelled;
  no thinning of labels is applied.
- **Deep zoom-in on a narrow slice**: once the number of pins in view drops to or
  below the limit, all visible pins are labelled at the finest step.
- **Panning without zooming**: the visible-span width is unchanged, so the number
  of labelled pins is unchanged, but which specific pins are labelled is
  recomputed for the new position; every pin line in the new view is still drawn.
- **Pins near the top edge**: the label/symbol stack is nudged to stay on-screen
  rather than being clipped.
- **Multiple harmonic sets on screen**: the label limit applies to each set
  independently; every set draws all its pin lines and thins only its own labels.
- **A labelled subset that omits the fundamental/first pin**: the labelled pins
  still form a regular series the analyst can extrapolate, and every pin line
  (including the fundamental) is still drawn.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST draw a pin line for every harmonic of a set that
  falls within the visible frequency span, regardless of how many that is — pin
  lines MUST NOT be dropped to keep the overlay legible.
- **FR-002**: The system MUST draw number labels and symbols only on a thinned
  "major" subset of the pins, never exceeding the label limit within the visible
  span.
- **FR-003**: The label limit MUST reuse the existing maximum (default 25); this
  feature changes what the limit governs (labels/symbols) but not its value.
- **FR-004**: The subset of pins that receive labels/symbols MUST be selected by
  a regular sampling step (every Nth pin), consistent with the existing sampling
  behaviour, so the labelled pins are evenly spaced and predictable.
- **FR-005**: When the number of pins in the visible span is at or below the
  label limit, the system MUST label and symbol every drawn pin (no label
  thinning).
- **FR-006**: The system MUST recompute both the set of drawn pin lines and the
  subset of labelled/symbolled pins whenever the zoom level or pan position
  changes, based on the frequency span visible after the change.
- **FR-007**: As the visible span narrows (zoom in) the labelled subset MUST grow
  (or stay equal); as it widens (zoom out) it MUST shrink (or stay equal) —
  labelling density MUST never decrease when zooming in.
- **FR-008**: A label MUST only be drawn for a pin that is actually drawn, and its
  text MUST correctly identify that pin's harmonic number (no orphan or
  mismatched labels).
- **FR-009**: Each drawn label MUST be positioned horizontally centred on its
  pin's vertical line (rather than offset to the right of the line).
- **FR-010**: Each drawn label MUST be positioned above the pin's symbol, so the
  vertical order over the pin is label, then symbol, then the pin line.
- **FR-011**: When the label/symbol stack would fall outside the top of the
  spectrogram image, the system MUST keep it within the visible area so it stays
  legible.
- **FR-012**: This feature MUST NOT change the underlying harmonic set data
  (spacing, anchor, colour, symbol, identity) — it affects only which pins are
  drawn and which carry labels/symbols, and where labels sit.
- **FR-013**: Selecting and adjusting a harmonic set MUST continue to work as
  before with the full set of pin lines drawn.

### Key Entities *(include if data involved)*

- **Harmonic Set**: A series of pins the analyst places on the spectrogram,
  defined by spacing, anchor, colour, and symbol. Unchanged by this feature.
- **Pin**: The vertical line for one harmonic (at n × spacing). This feature draws
  a line for every pin in the visible span and, for a subset, additionally a
  number label and a symbol.
- **Major (labelled) subset**: The evenly-sampled set of pins — at most the label
  limit — that receive a number label and symbol. Recomputed per view.
- **Label limit**: The upper bound on how many pins in the visible span carry a
  label/symbol (default 25). Formerly the cap on pins drawn; now the cap on
  labels/symbols.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For any harmonic set at any zoom/pan, a pin line is drawn for 100%
  of harmonics that fall in the visible frequency span (zero dropped lines).
- **SC-002**: For any harmonic set at any zoom/pan, no more than the label limit
  (default 25) pins carry a number label/symbol within the visible span.
- **SC-003**: For the dense case (e.g. a 0.5 Hz set over a wide span), the analyst
  can see the full block of pin lines while reading a bounded set of
  non-overlapping labels.
- **SC-004**: When zooming in on a dense set, the number of labelled pins
  increases at each step until, at a small enough span, every visible pin is
  labelled; zooming out thins the labels again.
- **SC-005**: 100% of drawn labels sit centred above their pin's symbol, with none
  offset to the right of the line.
- **SC-006**: Every drawn label matches an actual drawn pin and its harmonic
  number (no orphan or mismatched labels).
- **SC-007**: The drawn pins and labelled subset update on every zoom/pan change
  with no perceptible lag.

## Assumptions

- This feature supersedes the pin-dropping behaviour introduced in spec 158
  (Sample Harmonic Pins). The sampling calculation (regular step, "nice"
  step series, default max 25) is retained but now decides which pins are
  *labelled/symbolled*, not which pins are *drawn*.
- "Show all pins" means all pin lines within the visible frequency span; the
  system still only renders harmonics that fall inside the current view, so
  off-screen harmonics are not drawn.
- The label limit remains a single tunable value (default 25). Changing it later
  does not change this feature's scope.
- A "solid block" of overlapping pin lines is an acceptable and intended visual
  outcome at extreme density — legibility is preserved through the thinned labels,
  not by hiding lines.
- The symbol shown on a labelled pin is the harmonic set's assigned symbol; this
  feature does not change the symbol catalogue or the default symbol (covered by
  other specs).
- Existing harmonic-set creation, colour/symbol assignment, persistence, and
  selection behaviours are unchanged except for pin/label rendering.
