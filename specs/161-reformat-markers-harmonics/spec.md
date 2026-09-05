# Feature Specification: Reformat Existing Markers & Harmonics, with a "Cross" (Symbol-less) Style

**Feature Branch**: `161-reformat-markers-harmonics`  
**Created**: 2026-07-24  
**Status**: Complete — implemented and merged
**Input**: GH issue #198 (Review feedback) — bullets 4 & 5: "Introduce `cross` symbol style" and "Allow existing markers and harmonics to be reformatted".

## User Scenarios & Testing *(mandatory)*

<!--
  Today the colour selector and symbol selector only affect the NEXT feature the
  analyst creates; there is no way to restyle an already-placed harmonic set or
  marker (you must delete and re-create it). Selecting a table row highlights it
  but changes nothing else. Harmonic sets carry a symbol (circle/square/diamond/
  triangle/triangle-down/star, default circle); markers do NOT carry a symbol —
  they render as a fixed crosshair and show a plain colour swatch in the table.
  This feature (a) adds a "cross" style meaning "no drawn symbol", and (b) lets
  the analyst select an existing marker or harmonic set and instantly restyle its
  colour and symbol. The "cross" style is the stepping stone that lets markers
  and harmonics carry a symbol OR remain symbol-less.
-->

### User Story 1 - Reformat an existing harmonic set (Priority: P1)

An analyst has already placed several harmonic sets and now wants to recolour one
or give it a different symbol — without deleting and re-drawing it. They select
the harmonic set (on the overlay or in the harmonics table). It is shown as
selected, and the colour selector and symbol selector update to reflect that
set's current colour and symbol. The analyst changes the colour or picks a
different symbol, and the selected harmonic set updates instantly on the
spectrogram and in the table to match.

**Why this priority**: This is the core new capability requested — editing the
appearance of existing features in place. It removes the delete-and-recreate
workaround and is independently valuable and testable on harmonic sets alone.

**Independent Test**: Create two harmonic sets with different colours/symbols,
select one, confirm the selectors show that set's values, change the colour and
symbol, and confirm only the selected set changes — immediately, on both the
overlay and the table.

**Acceptance Scenarios**:

1. **Given** one or more placed harmonic sets, **When** the analyst selects one,
   **Then** it is visibly marked as selected and the colour and symbol selectors
   update to show that set's current colour and symbol.
2. **Given** a selected harmonic set, **When** the analyst changes the colour,
   **Then** that set's colour changes instantly on the overlay and in the table,
   and no other set changes.
3. **Given** a selected harmonic set, **When** the analyst chooses a different
   symbol, **Then** that set's symbol changes instantly on the overlay and in the
   table, and no other set changes.
4. **Given** a selected harmonic set, **When** the analyst changes its symbol to
   "cross", **Then** the set's pins show no drawn symbol shape while keeping their
   lines and labels.
5. **Given** no feature is selected, **When** the analyst changes the colour or
   symbol selector, **Then** the change applies to the NEXT feature created (the
   existing behaviour is preserved) and no placed feature changes.

---

### User Story 2 - The "cross" (symbol-less) style as the default (Priority: P1)

An analyst adding features does not always want a symbol drawn. A "cross" style is
available in the symbol selector; choosing it means "no symbol shape is drawn".
"Cross" is the default style, so a newly created harmonic set or marker has no
drawn symbol unless the analyst deliberately picks one. Existing shaped symbols
(circle, square, diamond, triangle, triangle-down, star) remain available.

**Why this priority**: The cross style is the foundation the reformatting relies
on — it is the value the selectors show for symbol-less features and the state a
feature returns to when the analyst removes its symbol. It ships alongside Story 1
as a P1.

**Independent Test**: Open the symbol selector, confirm "cross" is present and is
the default, create a feature without changing the symbol, and confirm no symbol
shape is drawn.

**Acceptance Scenarios**:

1. **Given** the symbol selector, **When** the analyst opens it, **Then** "cross"
   is offered as an option and is the default selection.
2. **Given** the default symbol (cross), **When** the analyst creates a harmonic
   set or marker, **Then** no symbol shape is drawn for it.
3. **Given** a feature with the "cross" style, **When** it is shown or reloaded,
   **Then** it renders with no symbol shape and without error.
4. **Given** a shaped symbol was previously selected, **When** the analyst chooses
   "cross", **Then** subsequent new features (and any selected feature being
   reformatted) show no symbol shape.

---

### User Story 3 - Reformat a marker, including giving it a symbol (Priority: P2)

An analyst has placed analysis markers, which today are plain colour-coded
crosses. They select a marker and change its colour, or give it a symbol. When a
marker has a symbol, it is shown as that colour-coded symbol; when a marker has no
symbol (cross), it continues to show a filled rectangle of its colour as the
colour indicator. Reformatting a marker takes effect instantly.

**Why this priority**: Extending reformatting to markers — and letting markers
carry symbols for the first time — is a natural companion to Story 1 but touches a
second feature type and introduces a new marker capability, so it is P2.

**Independent Test**: Place a marker, select it, confirm the selectors show its
colour and "cross" symbol, change its colour and give it a symbol, and confirm the
marker instantly shows the colour-coded symbol; set it back to cross and confirm
it shows the filled colour rectangle.

**Acceptance Scenarios**:

1. **Given** one or more placed markers, **When** the analyst selects one, **Then**
   it is marked as selected and the colour and symbol selectors show that marker's
   colour and symbol (cross for markers that have none).
2. **Given** a selected marker, **When** the analyst changes its colour, **Then**
   the marker's colour changes instantly on the overlay and in the markers table.
3. **Given** a selected marker with the cross style, **When** the analyst assigns a
   shaped symbol, **Then** the marker is drawn as that colour-coded symbol.
4. **Given** a marker with a shaped symbol, **When** the analyst changes it back to
   cross, **Then** the marker's colour indicator reverts to the filled colour
   rectangle.
5. **Given** a marker's colour indicator, **When** the marker has a symbol, **Then**
   the indicator shows the colour-coded symbol; **when** it has no symbol (cross),
   **then** the indicator shows the filled colour rectangle.

---

### Edge Cases

- **Selecting then deselecting**: when selection is cleared, the selectors revert
  to controlling the next-created feature; no placed feature is affected by later
  selector changes until something is selected again.
- **Reformatting the currently-dragged feature**: changing colour/symbol while a
  feature is selected mid-interaction applies to that feature and does not disturb
  its position.
- **Cross style on harmonic pins**: the pin still draws its line and (for labelled
  pins) its number label; only the symbol shape is omitted.
- **Legacy harmonic sets** (persisted before symbols, or before cross existed):
  they load without error; a set with no recorded symbol is treated consistently
  with the defined default.
- **Legacy markers** (persisted before markers could carry symbols): they load as
  cross (no symbol) and show the filled colour rectangle.
- **Switching symbol while multiple features exist**: only the selected feature is
  reformatted; unselected features are untouched.
- **Reformat persistence**: a reformatted colour/symbol survives save and reload
  the same way an originally-chosen colour/symbol does.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The symbol selector MUST offer a "cross" style meaning "no symbol
  shape is drawn", in addition to the existing shaped symbols.
- **FR-002**: "Cross" MUST be the default symbol style for newly created harmonic
  sets and markers (replacing the previous default).
- **FR-003**: A feature (harmonic set or marker) whose style is "cross" MUST render
  with no symbol shape, without error.
- **FR-004**: Selecting an existing harmonic set or marker MUST mark it as selected
  and MUST update the colour and symbol selectors to reflect that feature's current
  colour and symbol.
- **FR-005**: While a feature is selected, changing the colour selector MUST
  immediately change that feature's colour on the overlay and in its table.
- **FR-006**: While a feature is selected, changing the symbol selector MUST
  immediately change that feature's symbol on the overlay and in its table.
- **FR-007**: Reformatting a selected feature MUST affect only that feature; no
  other placed feature may change.
- **FR-008**: When no feature is selected, changing the colour or symbol selector
  MUST continue to set the style for the next feature created (existing behaviour
  preserved), and MUST NOT change any placed feature.
- **FR-009**: Markers MUST be able to carry a symbol; a marker with a shaped symbol
  MUST be drawn as that colour-coded symbol.
- **FR-010**: A marker's colour indicator MUST depend on its style: a marker with a
  shaped symbol shows the colour-coded symbol; a marker with the cross style shows
  a filled rectangle of its colour.
- **FR-011**: A reformatted colour and symbol MUST persist so that saving and
  reloading restores the reformatted appearance.
- **FR-012**: Loading legacy persisted data MUST NOT error: features with no
  recorded symbol MUST be shown consistently with the defined default handling, and
  legacy markers MUST render as cross with a filled colour rectangle.
- **FR-013**: Clearing the selection MUST return the selectors to controlling the
  next-created feature.

### Key Entities *(include if data involved)*

- **Symbol style**: The visual coding of a feature. Extended to include "cross"
  (no drawn shape) alongside the existing filled shapes. "Cross" is the default.
- **Harmonic Set**: Already carries colour and symbol. This feature makes its
  colour and symbol editable in place and lets its symbol be "cross" (symbol-less).
- **Marker**: Analysis-mode annotation that today carries only colour. This feature
  adds a symbol attribute to markers (default cross) and makes colour and symbol
  editable in place. Its colour indicator becomes symbol-dependent.
- **Selection**: The currently selected feature (marker or harmonic set). This
  feature makes selection drive the colour/symbol selectors and route restyle edits
  to the selected feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An analyst can change an existing harmonic set's colour or symbol in
  place, seeing the change immediately, without deleting and re-creating it.
- **SC-002**: An analyst can change an existing marker's colour or symbol in place,
  seeing the change immediately.
- **SC-003**: Selecting any feature updates the colour and symbol selectors to that
  feature's current values 100% of the time.
- **SC-004**: Reformatting a selected feature never alters any other placed
  feature.
- **SC-005**: "Cross" is available and is the default; a feature created without
  choosing a symbol shows no symbol shape.
- **SC-006**: A marker with a symbol shows the colour-coded symbol; a marker with
  cross shows the filled colour rectangle — matching its current style in every
  case.
- **SC-007**: Reformatted colours/symbols survive save and reload for 100% of
  features; legacy data loads without error.

## Assumptions

- The colour selector and symbol selector are the existing controls; this feature
  changes them from "always target the next feature" to "target the selected
  feature when one is selected, otherwise the next feature".
- "Cross" denotes the symbol-less style. The name reflects that markers currently
  render as a cross/crosshair; a "cross" harmonic or marker simply has no filled
  symbol shape. Whether a literal small cross glyph is drawn or nothing at all is a
  design detail; the intent is "no shaped symbol".
- Selection already exists as a concept (highlighting a table row / overlay
  element); this feature extends what selection does rather than inventing
  selection.
- Making the default "cross" changes the default appearance of new features from
  the previous default shape (circle) to no symbol; this is intended.
- Persistence reuses the existing annotation storage; the stored record for a
  harmonic set already includes a symbol, and this feature adds a symbol to the
  stored marker record, remaining backward compatible with records that lack it.
- This feature is the follow-on to the harmonic symbol work (spec 157); it does not
  change the shaped-symbol catalogue, only adds "cross" and makes styles editable.
- Instant restyle applies within the current session view; no additional
  confirmation step is required.
