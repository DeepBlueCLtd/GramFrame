# Feature Specification: Mouse-Wheel Pan and Zoom

**Feature Branch**: `160-mouse-wheel-navigation`  
**Created**: 2026-07-24  
**Status**: Complete — implemented and merged
**Input**: GH issue #198 (Review feedback) — bullet 3: "Introduce mouse wheel support ... scroll to pan horizontally, ctrl-scroll to zoom in/out in both directions, wheel-click drag to pan ... we'll also need to add guidance for this."

## User Scenarios & Testing *(mandatory)*

<!--
  Today GramFrame supports zoom (via + / − buttons in Pan mode) and pan (via
  click-and-drag, only when zoomed in). There is NO mouse-wheel or middle-button
  handling anywhere. Mouse-wheel input is therefore unused across every mode, so
  it can be adopted globally without conflicting with existing interactions. The
  behaviour should follow familiar browser/map conventions.
-->

### User Story 1 - Zoom in and out with Ctrl-scroll (Priority: P1)

An analyst wants to zoom into a feature without moving the mouse to the Pan-mode
buttons. Holding Ctrl and scrolling the mouse wheel zooms the spectrogram in and
out around the pointer, in any interaction mode. Scrolling up (away) zooms in;
scrolling down (toward) zooms out. Zoom affects both the frequency (horizontal)
and time (vertical) directions together, consistent with the existing zoom
behaviour, and stays within the existing zoom limits.

**Why this priority**: Zoom is the most valuable wheel interaction and the entry
point for the others — panning is only meaningful once zoomed in. Ctrl-scroll
zoom works on its own and delivers immediate value in every mode.

**Independent Test**: In any mode, hold Ctrl and scroll up over the spectrogram
and confirm it zooms in; scroll down and confirm it zooms out, both bounded by
the existing min/max zoom.

**Acceptance Scenarios**:

1. **Given** the spectrogram at any zoom level in any mode, **When** the analyst
   holds Ctrl and scrolls the wheel up, **Then** the view zooms in (up to the
   existing maximum) and the browser page does not scroll.
2. **Given** a zoomed-in spectrogram, **When** the analyst holds Ctrl and scrolls
   the wheel down, **Then** the view zooms out (down to the existing minimum, no
   further).
3. **Given** any Ctrl-scroll zoom, **When** the view changes, **Then** the zoom is
   applied to both the frequency and time directions together, and the axes and
   any overlays update to match the new visible range.
4. **Given** Ctrl-scroll zoom, **When** the analyst zooms, **Then** the zoom is
   centred on the pointer location so the feature under the cursor stays roughly
   under the cursor.

---

### User Story 2 - Pan horizontally by scrolling (Priority: P2)

Once zoomed in, an analyst wants to move forward and back through frequency
without dragging. Scrolling the mouse wheel (without Ctrl) pans the view
horizontally along the frequency axis — scrolling in one direction moves forward
in frequency, the other moves back. This works in any mode. When the view is not
zoomed in (nothing is off-screen to pan to), plain scroll does nothing.

**Why this priority**: Horizontal scroll-pan is a convenience over the existing
drag-pan and only applies once zoomed (Story 1). It is valuable but secondary to
zoom, so it is P2.

**Independent Test**: Zoom in, then scroll the wheel (no Ctrl) and confirm the
view pans horizontally along frequency; verify that at zoom level 1 (not zoomed)
plain scroll has no effect.

**Acceptance Scenarios**:

1. **Given** a zoomed-in spectrogram, **When** the analyst scrolls the wheel
   without Ctrl, **Then** the view pans horizontally along the frequency axis and
   the browser page does not scroll.
2. **Given** a spectrogram at zoom level 1 (fully zoomed out), **When** the
   analyst scrolls the wheel without Ctrl, **Then** nothing pans (there is
   nothing off-screen to reveal).
3. **Given** a horizontal scroll-pan, **When** the view reaches the edge of the
   available data, **Then** panning stops at the edge and does not reveal empty
   space beyond the data.
4. **Given** scroll-pan in any mode, **When** the analyst pans, **Then** the
   current mode's other interactions (cursor, markers, harmonics, doppler) are
   unaffected by the pan itself.

---

### User Story 3 - Pan by dragging with the wheel button (Priority: P3)

An analyst wants to reposition a zoomed-in view quickly by grabbing it. Pressing
and holding the mouse wheel button (middle button) and dragging pans the view in
the direction of the drag, in any mode. As with scroll-pan, this only does
something once zoomed in. Releasing the wheel button ends the pan. The wheel-drag
pan does not trigger the mode's normal left-button actions (placing a cursor,
marker, or harmonic set).

**Why this priority**: Wheel-click drag is a third, familiar way to pan and
overlaps in value with scroll-pan. It is the least essential of the three wheel
interactions, so it is P3.

**Independent Test**: Zoom in, press and hold the middle (wheel) button, drag, and
confirm the view pans following the drag; release and confirm the pan ends and no
marker/cursor was placed.

**Acceptance Scenarios**:

1. **Given** a zoomed-in spectrogram in any mode, **When** the analyst presses the
   wheel button and drags, **Then** the view pans following the drag direction.
2. **Given** a wheel-button drag-pan in progress, **When** the analyst releases the
   wheel button, **Then** the pan ends and the view holds its new position.
3. **Given** a wheel-button drag, **When** it starts and ends, **Then** the active
   mode's left-button action (place cursor / marker / harmonic / doppler point) is
   NOT triggered.
4. **Given** the spectrogram at zoom level 1, **When** the analyst wheel-drags,
   **Then** nothing pans.

---

### User Story 4 - Discover the wheel interactions from guidance (Priority: P2)

An analyst who does not know GramFrame supports the mouse wheel needs to be told.
The on-screen guidance describes the wheel interactions — scroll to pan, Ctrl+scroll
to zoom, wheel-drag to pan — so analysts can discover them without documentation.

**Why this priority**: Undocumented interactions are effectively invisible.
Guidance is required for the feature to be usable in practice, but it depends on
the interactions existing, so it is P2.

**Independent Test**: Open the guidance panel and confirm it lists the mouse-wheel
interactions in plain language.

**Acceptance Scenarios**:

1. **Given** the guidance panel, **When** the analyst reads it, **Then** it
   describes scroll-to-pan, Ctrl+scroll-to-zoom, and wheel-drag-to-pan.
2. **Given** the guidance describes wheel interactions, **When** the analyst reads
   it, **Then** it makes clear that scroll-pan and wheel-drag-pan only take effect
   once zoomed in.

---

### Edge Cases

- **Wheel used while not zoomed in**: Ctrl+scroll still zooms (from level 1);
  plain scroll and wheel-drag do nothing because there is nothing off-screen.
- **Zoom at the min/max limit**: further Ctrl+scroll in that direction has no
  effect and does not error.
- **Pan at the data edge**: scroll-pan and wheel-drag-pan clamp at the edge of the
  available data rather than revealing blank space.
- **Page scrolling**: wheel actions over the spectrogram must not scroll the host
  web page; the component consumes the wheel event.
- **Wheel-drag interrupted** (pointer leaves the component, or focus lost mid-drag):
  the pan ends cleanly without leaving the component stuck in a dragging state.
- **Trackpad two-finger scroll**: behaves as a wheel scroll (pan), and pinch/Ctrl
  as zoom, per browser convention, without special-casing device type.
- **Interaction with existing drag-pan and +/− buttons**: the new wheel
  interactions coexist with the existing click-drag pan and the Pan-mode zoom
  buttons; none of them are removed or broken.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The component MUST respond to mouse-wheel input over the
  spectrogram in every interaction mode (analysis, harmonics, doppler, pan).
- **FR-002**: When the analyst scrolls the wheel while holding Ctrl, the system
  MUST zoom the view in (scroll up/away) or out (scroll down/toward).
- **FR-003**: Ctrl+scroll zoom MUST apply to both the frequency and time
  directions together and MUST respect the existing zoom minimum and maximum.
- **FR-004**: Ctrl+scroll zoom MUST be centred on the pointer position so the
  point under the cursor stays approximately under the cursor after zooming.
- **FR-005**: When the analyst scrolls the wheel without Ctrl and the view is
  zoomed in, the system MUST pan the view horizontally along the frequency axis.
- **FR-006**: When the analyst presses the wheel (middle) button and drags, and
  the view is zoomed in, the system MUST pan the view following the drag.
- **FR-007**: Scroll-pan and wheel-drag-pan MUST have no effect when the view is
  not zoomed in (zoom level 1), because nothing is off-screen to reveal.
- **FR-008**: Panning (by scroll or wheel-drag) MUST clamp at the edges of the
  available data and MUST NOT reveal empty space beyond the data.
- **FR-009**: Wheel-drag-pan MUST NOT trigger the active mode's left-button action
  (placing a cursor, marker, harmonic set, or doppler point).
- **FR-010**: Wheel actions over the spectrogram MUST prevent the host page from
  scrolling.
- **FR-011**: A wheel-drag pan MUST end cleanly when the wheel button is released
  or the interaction is interrupted (pointer leaves the component), leaving no
  residual dragging state.
- **FR-012**: The on-screen guidance MUST describe the wheel interactions
  (scroll-to-pan, Ctrl+scroll-to-zoom, wheel-drag-to-pan), noting that the pan
  interactions require the view to be zoomed in.
- **FR-013**: The new wheel interactions MUST coexist with the existing click-drag
  pan and the Pan-mode +/− zoom buttons without removing or breaking them.

### Key Entities *(include if data involved)*

- **Zoom state**: The current zoom level and centre of the view (already stored
  by the component). Wheel zoom and wheel pan update this state; they add no new
  persisted data.
- **Wheel interaction**: A transient user input (scroll, Ctrl+scroll, or
  wheel-button drag) that maps to a pan or zoom of the view. No entity is
  persisted; the effect is entirely a change to the existing zoom/pan state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In every mode, Ctrl+scroll changes the zoom level, bounded by the
  existing min and max, with no page scroll.
- **SC-002**: In every mode, plain scroll pans horizontally along frequency when
  zoomed in, and has no effect when not zoomed in.
- **SC-003**: In every mode, wheel-button drag pans the view when zoomed in and
  never places a cursor/marker/harmonic/doppler point.
- **SC-004**: Wheel zoom is centred on the pointer, keeping the feature under the
  cursor approximately in place.
- **SC-005**: Panning by any means stops at the data edges without exposing blank
  space.
- **SC-006**: The guidance panel names all three wheel interactions and their
  zoom-in precondition, so a first-time analyst can discover them.
- **SC-007**: Existing zoom buttons and click-drag pan continue to work unchanged.

## Assumptions

- Mouse-wheel and middle-button input are currently unused everywhere in the
  component, so adopting them globally (in all modes) introduces no conflict with
  existing interactions.
- "Zoom in both directions" means zoom is uniform across frequency and time,
  matching the current button-driven zoom, which scales the whole image rather
  than one axis.
- "Scroll to pan horizontally (fwd/back in frequency)" maps vertical wheel-scroll
  delta to horizontal frequency panning, following the common convention for
  horizontally-oriented data views; the exact direction mapping is a design detail
  that does not change scope.
- Scroll-pan and wheel-drag-pan reuse the existing pan mechanism and its
  zoom-level-1 gating, so they are naturally inert when not zoomed in.
- Guidance for the wheel interactions is added to the on-screen mode guidance;
  because the interactions are global, the guidance may appear in the Pan mode
  guidance and/or be surfaced across modes — the exact placement is a design
  detail.
- Zoom centring on the pointer is a refinement of the existing centre-based zoom;
  if pointer-centred zoom proves impractical, zooming about the current centre is
  an acceptable fallback that does not change the feature's scope.
- Standard browser wheel semantics apply to trackpads (two-finger scroll = wheel
  scroll; pinch or Ctrl = zoom) without device-specific handling.
