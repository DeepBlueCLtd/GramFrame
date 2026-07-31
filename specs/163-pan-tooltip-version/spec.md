# Feature Specification: Remove the Version Number from the Pan-Mode Button Tooltip

**Feature Branch**: `163-pan-tooltip-version`  
**Created**: 2026-07-24  
**Status**: Draft  
**Input**: GH issue #198 (Review feedback) — bullet 7: "Drop version number from PanMode tooltip. We recently added a tooltip to the Pan Mode button, to show the version number. I'd forgotten that we already show the version in the pan mode guidance. We should drop showing the version in the pan mode tooltip."

## User Scenarios & Testing *(mandatory)*

<!--
  Background: The version number is currently surfaced in TWO places — (a) as the
  hover tooltip (title) on the Pan Mode button, and (b) as the last line of the Pan
  Mode guidance panel. The guidance panel is the intended place; the button
  tooltip was added before that was remembered and is now redundant. This change
  removes the redundant tooltip while keeping the guidance display.
-->

### User Story 1 - Version shown in one place, not duplicated (Priority: P1)

A trainer or analyst hovers over the Pan Mode button. Today a tooltip appears
showing the GramFrame version, duplicating the version that already appears in the
Pan Mode guidance panel. After this change, hovering the Pan Mode button no longer
shows the version tooltip, while the version remains visible in the Pan Mode
guidance. The version is therefore surfaced in exactly one place.

**Why this priority**: It is the entire requested change — remove the redundant
tooltip. Small but self-contained and independently verifiable.

**Independent Test**: Hover the Pan Mode button and confirm no version tooltip
appears; open the Pan Mode guidance and confirm the version is still shown there.

**Acceptance Scenarios**:

1. **Given** the mode buttons, **When** the analyst hovers over the Pan Mode
   button, **Then** no version-number tooltip is shown.
2. **Given** the Pan Mode guidance panel, **When** the analyst views it, **Then**
   the GramFrame version is still displayed there (unchanged by this change).
3. **Given** the version was the only content of the Pan Mode button's tooltip,
   **When** the tooltip is removed, **Then** the Pan Mode button behaves like the
   other mode buttons with respect to hover (no leftover empty tooltip).

---

### Edge Cases

- **Version still needed for support/debugging**: it remains available via the Pan
  Mode guidance, so removing the tooltip does not hide the version entirely.
- **Other mode buttons**: only the Pan Mode button carries the version tooltip
  today; this change must not add or alter tooltips on the other mode buttons.
- **Disabled Pan button**: the version tooltip previously appeared even while the
  button was disabled; after the change there is no version tooltip in either
  state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Pan Mode button MUST NOT display the GramFrame version number as
  a hover tooltip.
- **FR-002**: The GramFrame version MUST continue to be displayed in the Pan Mode
  guidance panel, unchanged.
- **FR-003**: Removing the tooltip MUST NOT leave the Pan Mode button with an empty
  or placeholder tooltip; it should behave like the other mode buttons regarding
  hover.
- **FR-004**: This change MUST NOT alter the version display or tooltips of any
  other mode button or component.

### Key Entities *(include if data involved)*

- **Version indicator**: The GramFrame version string. This change reduces where it
  is surfaced from two locations (Pan button tooltip + Pan guidance) to one (Pan
  guidance only). The version value and its source are unchanged.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Hovering the Pan Mode button shows no version tooltip.
- **SC-002**: The Pan Mode guidance still shows the version, so the version remains
  discoverable in exactly one place.
- **SC-003**: No other mode button's tooltip behaviour changes.

## Assumptions

- The version is currently shown in both the Pan Mode button tooltip and the Pan
  Mode guidance; this change removes only the tooltip occurrence.
- The version value and how it is generated/sourced are out of scope and unchanged.
- No other button currently shows the version as a tooltip, so no other button is
  affected.
