# Feature Specification: Width of Harmonic Lines (Trial)

**Feature Branch**: `158-harmonic-line-width`  
**Created**: 2026-07-17  
**Status**: Draft  
**Input**: GH issue 158 — "Width of harmonics line". A user requested that the
vertical lines drawn to represent harmonics be a bit thinner. If they are 2px,
produce a trial release where every other vertical line is 1px. If they are
already 1px, we can't do anything about it.

## Context & Current State

The vertical lines that represent harmonic pins are currently rendered at a
stroke width of **2px** (`stroke-width: 2` on each `.gram-frame-harmonic-line`).
Because the lines are 2px today (not already 1px), the "we can't do anything
about it" branch does **not** apply, and a trial is warranted.

The purpose of this feature is to produce a **visual trial** so a reviewer can
compare thinner and thicker harmonic lines side by side on the same spectrogram
and decide whether thinner lines read better. The trial renders **alternating**
harmonic lines at 1px and 2px within each harmonic set, rather than committing
every line to a single new width. This lets the difference be judged directly
against the current appearance in one glance.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compare thinner harmonic lines against current width (Priority: P1)

An analyst reviewing the trial release opens a spectrogram and creates (or
loads) a harmonic set. The vertical harmonic lines now alternate in thickness:
every other line is drawn thinner (1px) while the lines between them keep the
current thickness (2px). Seeing both weights on the same set, the analyst can
judge at a glance whether the thinner line is clearer and preferable, and feed
that decision back before a final width is chosen.

**Why this priority**: This is the entire purpose of the trial requested in the
issue. It delivers the comparison the user asked for and is the only behavior
this feature introduces.

**Independent Test**: Create a harmonic set with several visible harmonics and
inspect the rendered lines; confirm the lines alternate between 1px and 2px
stroke widths across consecutive harmonics. Fully testable on its own.

**Acceptance Scenarios**:

1. **Given** a spectrogram in Harmonics mode, **When** the analyst creates a
   harmonic set that produces multiple visible harmonic lines, **Then** the
   harmonic lines alternate in stroke width so that every other line is 1px and
   the remaining lines are 2px.
2. **Given** a harmonic set with alternating line widths, **When** the analyst
   reads the harmonic number labels, **Then** the labels remain legible and
   correctly associated with their lines regardless of the line's width.
3. **Given** a harmonic set with only one visible harmonic line, **When** it is
   rendered, **Then** it is drawn without error at a defined width from the
   alternation scheme.

---

### Edge Cases

- A harmonic set may have only one visible harmonic (e.g., high spacing or a
  narrow frequency range). The single line still renders correctly at its
  assigned width.
- Line width must remain constant for a given harmonic as the view is zoomed or
  the image expanded — width is a fixed pixel stroke, not a scaled quantity, so
  it must not change with zoom.
- Multiple independent harmonic sets on the overlay each apply the same
  alternation scheme so the comparison is consistent across sets.
- The alternation is deterministic and tied to the harmonic number (or its
  rendering index) so the same harmonic always shows the same width across
  re-renders (drag updates, mode switches, reloads).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST render harmonic vertical lines such that every
  other line is drawn at 1px stroke width and the remaining lines at 2px stroke
  width (the current width), producing a directly comparable trial.
- **FR-002**: The assignment of 1px vs 2px MUST be deterministic for a given
  harmonic so that the same harmonic renders at the same width on every
  re-render (drag updates, zoom, expand, mode switch, reload).
- **FR-003**: The alternation MUST apply consistently to every harmonic set
  rendered on the overlay.
- **FR-004**: Harmonic number labels MUST remain legible and correctly
  positioned relative to their lines irrespective of whether a line is 1px or
  2px.
- **FR-005**: The change MUST be limited to the visual stroke width of harmonic
  lines; harmonic spacing, position, colour, label text, interaction (drag,
  selection, deletion), and persistence behaviour MUST be unchanged.
- **FR-006**: No configuration input, control, or persisted field is introduced
  by this trial; the alternating widths are applied automatically during
  rendering.

### Key Entities *(include if feature involves data)*

- **Harmonic Line**: The vertical SVG line drawn for a single harmonic of a
  harmonic set. Already carries position, height, colour, and a harmonic number.
  This feature makes its **stroke width** depend on the harmonic (alternating
  1px / 2px) instead of a fixed 2px. No persisted attribute changes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a harmonic set with N ≥ 2 visible harmonics, consecutive
  harmonic lines differ in width, with the width alternating between 1px and 2px.
- **SC-002**: 100% of rendered harmonic lines carry a stroke width of exactly
  1px or exactly 2px (no other values).
- **SC-003**: For any given harmonic, the rendered stroke width is identical
  before and after a re-render triggered by drag, zoom, expand, mode switch, or
  reload.
- **SC-004**: All existing harmonics behaviour (spacing, colour, labels, drag,
  selection, deletion, persistence) is unchanged, evidenced by the existing
  harmonics test suite continuing to pass.
- **SC-005**: A reviewer can visually compare a 1px harmonic line against a 2px
  harmonic line on the same spectrogram in a single view.

## Assumptions

- "Every other vertical line" is interpreted as alternating widths within a
  harmonic set (odd-numbered harmonics at one width, even-numbered at the
  other), producing a side-by-side comparison rather than converting all lines
  to a single new width. This matches the issue's request for a *trial*.
- The two widths under trial are 1px (thinner) and 2px (current). The default/
  current width of 2px is retained on the non-thinned lines so the comparison is
  against today's appearance.
- The trial applies only to Harmonics-mode harmonic lines
  (`.gram-frame-harmonic-line`); Doppler and Analysis mode lines are out of
  scope.
- No new UI control is added; the alternation is a fixed rendering behaviour for
  the trial release. A follow-up may standardise on the chosen width once the
  reviewer decides.
- This is a trial to gather feedback; a subsequent change (out of scope here)
  will settle on a single final width based on the reviewer's decision.
