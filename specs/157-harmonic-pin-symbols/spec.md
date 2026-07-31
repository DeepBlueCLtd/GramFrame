# Feature Specification: Symbols on Harmonic Pins

**Feature Branch**: `157-harmonic-pin-symbols`  
**Created**: 2026-07-17  
**Status**: Draft  
**Input**: User description: "GH issue 185 — Symbols on harmonic pins"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Distinguish harmonic sets by symbol as well as colour (Priority: P1)

An analyst is examining a spectrogram that contains several overlapping harmonic
sets. Before placing a new harmonic set they choose both a colour and a symbol
(circle, square, or diamond) from the main control panel. When they draw the
harmonic set, a filled symbol in the chosen colour appears at the top of each
pin. Because each set now carries a distinct symbol as well as a colour, the
analyst — including a colour-blind analyst — can tell the sets apart at a
glance, both on the overlay and in the harmonics table.

**Why this priority**: This is the core value of the feature. Colour alone is
insufficient for colour-blind analysts, and even for others overlapping sets in
similar colours are hard to separate. The symbol affordance is what the issue
asks for and delivers immediate accessibility benefit.

**Independent Test**: Select a symbol from the selector, create a harmonic set,
and confirm a filled symbol of that shape and colour renders at the top of the
pins and appears next to that set in the harmonics table. Fully testable on its
own and delivers the primary value.

**Acceptance Scenarios**:

1. **Given** the control panel with a symbol selector, **When** the analyst
   opens the selector, **Then** they can choose from at least circle, square,
   and diamond filled symbols.
2. **Given** the analyst has chosen a colour and a symbol, **When** they create
   a harmonic set by click/drag, **Then** a filled symbol of the chosen shape
   and colour is displayed at the top of the pin.
3. **Given** the analyst has chosen a colour and a symbol, **When** they add a
   harmonic set via the manual add dialog, **Then** the created set shows the
   same chosen symbol at the top of its pin.
4. **Given** a harmonic set with an assigned symbol, **When** the analyst views
   the harmonics table, **Then** the set's row shows that symbol rendered in the
   set's colour.
5. **Given** a pin with a symbol at its top, **When** the analyst reads the pin
   label, **Then** the label (drawn to the right of the vertical line) is not
   obscured by the symbol.

---

### User Story 2 - Preserve symbols across save and reload (Priority: P2)

An analyst annotates a spectrogram with several symbol-coded harmonic sets and
later reopens the same material. Every harmonic set returns with the same colour
and the same symbol it was created with, so the analyst's colour/symbol coding
survives the round trip.

**Why this priority**: The colour/symbol coding only stays useful if it
persists. Without persistence the analyst must re-assign symbols each session,
undermining the accessibility benefit. Depends on Story 1 existing.

**Independent Test**: Create harmonic sets with different symbols, persist and
reload the annotations, and confirm each set reloads with its original symbol.

**Acceptance Scenarios**:

1. **Given** harmonic sets each carrying a distinct symbol, **When** the
   annotations are saved and reloaded, **Then** each set is restored with its
   original symbol and colour.

---

### User Story 3 - Gracefully display legacy harmonics that predate symbols (Priority: P2)

An analyst reloads annotations that were saved before symbols existed. Those
harmonic sets have no stored symbol, yet they must still render cleanly. Each
legacy harmonic set is shown with a default circle symbol so the display is
consistent and nothing appears broken.

**Why this priority**: Existing saved annotations must not break or disappear
when the feature ships. Backward compatibility protects analysts' prior work.

**Independent Test**: Load annotation data that lacks any symbol information and
confirm every harmonic set renders with a circle symbol without error.

**Acceptance Scenarios**:

1. **Given** persisted harmonic data created before this feature (no symbol
   recorded), **When** the annotations are reloaded, **Then** each affected
   harmonic set displays a circle symbol.
2. **Given** such legacy harmonic sets are reloaded and shown with a circle,
   **When** the analyst changes or re-saves them, **Then** the now-assigned
   symbol persists on subsequent reloads.

---

### Edge Cases

- When the analyst has not explicitly chosen a symbol yet, a sensible default
  symbol (circle) is used so every new harmonic set always has a symbol.
- When many harmonic sets share the same colour but different symbols, each set
  remains individually distinguishable by its symbol.
- When a pin sits near the top edge of the spectrogram, the symbol still renders
  legibly and does not overlap the pin label.
- When the same symbol and colour are chosen for more than one set, the system
  allows it (symbol is a visual aid, not a uniqueness constraint).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The main control panel MUST provide a symbol selector alongside
  the existing colour selector.
- **FR-002**: The symbol selector MUST be presented as a drop-down list of
  filled symbols and MUST include at least circle, square, and diamond.
- **FR-003**: The system MUST record the analyst's currently selected symbol so
  it applies to the next harmonic set created.
- **FR-004**: When a harmonic set is created by click/drag, the system MUST
  render a filled symbol of the selected shape at the top of the pin, in the
  harmonic set's colour.
- **FR-005**: When a harmonic set is created via the manual add dialog, the
  system MUST apply the selected symbol in the same way as click/drag creation.
- **FR-006**: The pin symbol MUST be positioned so that it does not conflict
  with or obscure the pin label, which is drawn to the right of the vertical
  line.
- **FR-007**: The harmonics table MUST display each harmonic set's symbol,
  rendered in that set's colour, as a colour-blind-friendly affordance.
- **FR-008**: The persisted representation of a harmonic set MUST include its
  symbol so the symbol is restored on reload.
- **FR-009**: When reloading persisted harmonic sets that have no recorded
  symbol (legacy data), the system MUST display a circle symbol for those sets.
- **FR-010**: The system MUST assign a default symbol (circle) to any new
  harmonic set for which the analyst has not explicitly chosen a symbol.
- **FR-011**: Each symbol in the selector MUST be visually distinguishable from
  the others at the size rendered on a pin and in the harmonics table.

### Key Entities *(include if data involved)*

- **Harmonic Set**: A set of harmonic overlay pins the analyst places on the
  spectrogram. Already carries a colour and position/spacing; this feature adds
  a **symbol** attribute (one of the available filled shapes) that determines
  the marker drawn at the top of each pin and shown in the harmonics table.
- **Symbol**: A named filled shape (circle, square, diamond, and any additional
  shapes offered) used as a colour-blind-friendly visual code for a harmonic
  set. Selected in the control panel and persisted with the harmonic set.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An analyst can assign a symbol to a new harmonic set and see it on
  the pin within a single interaction (one selection plus one create action),
  with no additional steps.
- **SC-002**: 100% of harmonic sets created after this feature ships display a
  filled, colour-coded symbol at the top of their pins.
- **SC-003**: 100% of harmonic sets shown in the harmonics table display their
  symbol in the set's colour.
- **SC-004**: When saved and reloaded, 100% of harmonic sets retain the symbol
  they were assigned.
- **SC-005**: 100% of legacy harmonic sets (persisted before this feature) load
  without error and display a circle symbol.
- **SC-006**: A colour-blind analyst can correctly distinguish overlapping
  harmonic sets that share similar colours by symbol alone.

## Assumptions

- The symbol set offered is circle, square, and diamond at minimum. Additional
  common filled shapes (for example triangle and star) may be added to give
  analysts more distinct options; the exact final list is a design detail that
  does not change scope.
- Symbols are a visual coding aid only; the system does not enforce uniqueness
  of symbol or symbol+colour combinations across harmonic sets.
- The symbol applies to the whole harmonic set (one symbol per set, shown on
  each pin of that set), consistent with colour being a per-set attribute.
- The default symbol for both new sets with no explicit choice and reloaded
  legacy sets is a circle.
- Persistence uses the existing annotation storage mechanism; this feature
  extends the stored harmonic-set record with a symbol field and remains
  backward compatible with records that lack it.
- The manual add dialog and click/drag creation both draw the new symbol from
  the same currently selected symbol in the control panel.
