# Feature Specification: Region Zoom — Shift-Drag a Box to Zoom

**Feature Branch**: `claude/mouse-drag-zoom-ux-3asov4`
**Created**: 2026-09-05
**Status**: Draft
**Input**: User description, elaborated through a structured interview on
2026-09-05 (decisions recorded under [Interview Decisions](#interview-decisions)).

> I'd like to tidily introduce a way of mouse-dragging a region to zoom in on
> it. Hmm, we're panned all the way out we could use mouse-drag, but if we're
> zoomed in at all, drag pans the image. Let's discuss a good way of supporting
> this feature, in good UX terms.

## Context

<!--
  GramFrame today offers four ways to change the view, and none of them is
  "show me this bit":

  - the `+` / `−` command buttons, which step the zoom by ×1.5 about the view
    centre (`viewport.js:zoomIn` / `zoomOut`);
  - Ctrl + wheel, which zooms by ×1.2 per notch about the pointer
    (`events.js:handleWheel`);
  - plain wheel, which pans along frequency when zoomed in;
  - left-drag in Pan mode and middle-button drag in every mode, which pan.

  Framing a feature of interest therefore means alternating zoom steps with
  pan corrections until the region happens to land in view. A rubber-band
  region zoom replaces that loop with one gesture.

  The obvious place to put it — bare left-drag, which is idle in Pan mode at
  zoom 1 (`PanMode.canPan()` returns false, so `resolvePanDrag()` declines) —
  is the wrong place. It would make one gesture mean two different things
  either side of a state boundary the analyst cannot see, it would vanish
  after the first zoom, and it would be absent from the four measurement modes
  where framing is actually wanted. This feature instead follows the existing
  precedent for cross-mode navigation gestures — Ctrl+wheel, wheel pan and the
  middle-button pan are all resolved centrally in `events.js` ahead of mode
  delegation, so they can never reach a mode and place a feature — and adds
  Shift + left-drag to that family.

  One structural constraint shapes the whole design: zoom is a single
  isotropic `level` plus a normalised centre (`viewport.js:setZoom`), capped at
  10×. There is no independent horizontal/vertical zoom, so an arbitrary
  rectangle cannot become the view exactly. Rather than silently fitting or
  cropping after the fact, the selection rectangle is constrained to the gram's
  aspect ratio *while it is drawn*, so what the analyst sees is what they get.
-->

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Frame a region and zoom to it (Priority: P1)

An analyst studying a gram sees a feature of interest — a cluster of tonals, a
transient, a narrow band — and wants to look at it closely. They hold Shift and
drag a box around it. On release, that box becomes the view. They can do this
in whichever mode they are working in, at whatever zoom they are already at,
without switching modes or touching a button.

**Why this priority**: It is the feature. Everything else here supports it, and
it is independently useful the moment it works: one gesture replaces the
zoom-step-and-pan-correct loop that is the current cost of framing anything.

**Independent Test**: On the sample gram, in Analysis mode, Shift-drag a box
around a known tonal; the visible frequency and time range after release
matches the box that was drawn, and no marker has been created.

**Acceptance Scenarios**:

1. **Given** a gram at zoom 1 in Pan mode, **When** the analyst Shift-drags a
   box over part of the image and releases, **Then** the view zooms so that
   box fills the gram area, and the axes relabel to the selected ranges.
2. **Given** a gram already at zoom 3 in Harmonics mode, **When** the analyst
   Shift-drags a box and releases, **Then** the view zooms further into that
   box, and no harmonic set has been created, moved or removed.
3. **Given** any mode, **When** the analyst Shift-drags, **Then** no annotation
   of any kind is created, moved, restyled or deleted by the gesture.
4. **Given** a completed region zoom, **When** the analyst inspects existing
   markers, harmonic sets, sideband sets and Doppler points, **Then** each is
   still drawn at its own data coordinates within the new view.
5. **Given** a region zoom has been performed, **When** the analyst then
   left-drags in Pan mode, wheel-pans, Ctrl+wheel-zooms or middle-drags,
   **Then** each behaves exactly as it did before this feature existed.

---

### User Story 2 - Get back to the whole gram in one action (Priority: P2)

Having zoomed into a region, the analyst wants the whole gram back — to
re-orient, or to pick a different region. One click on a **Fit** button beside
the existing `+` and `−` returns the full view.

**Why this priority**: Without it the interaction is lopsided: one gesture in,
up to six `−` clicks out from a deep region zoom. It is separable from P1 (the
`−` button does technically get you out) but P1 makes deep zooms cheap and so
makes the missing exit felt immediately.

**Independent Test**: From any zoom level above 1, click **Fit**; the view
returns to the complete gram in a single action, and the button then reads as
unavailable.

**Acceptance Scenarios**:

1. **Given** the view is zoomed in by any means, **When** the analyst clicks
   **Fit**, **Then** the whole gram is visible again, centred.
2. **Given** the view already shows the whole gram, **When** the analyst looks
   at the control row, **Then** **Fit** is present but disabled.
3. **Given** an audio-sourced gram paused mid-recording, **When** the analyst
   clicks **Fit**, **Then** the time window returns to its configured
   `window-seconds` height and stays within what has been played.

---

### User Story 3 - See what you are about to select (Priority: P3)

While the box is being dragged, the analyst can see exactly what they are
choosing: the selection is outlined, the gram outside it is dimmed so the
target region reads as the subject, and the frequency and time span of the
selection is shown live as they drag.

**Why this priority**: P1 is usable with a plain outline, so this is an
enhancement rather than a prerequisite. It earns its place by making the
aspect-ratio lock self-explanatory — a box that resists your pointer looks
broken until the dimmed surround shows you it is the shape of the view — and by
letting an analyst dial in a span numerically before committing.

**Independent Test**: Begin a Shift-drag and hold; the outlined rectangle, the
dimmed surround and a live span readout are all visible and update together as
the pointer moves.

**Acceptance Scenarios**:

1. **Given** a Shift-drag in progress, **When** the pointer moves, **Then** the
   rectangle, the dimmed surround and the span readout all update together.
2. **Given** a Shift-drag in progress, **When** the pointer moves in a way that
   would make the box taller than the gram's proportions allow, **Then** the
   box keeps the gram's aspect ratio rather than following the pointer exactly.
3. **Given** a Shift-drag in progress, **When** the analyst presses Escape,
   **Then** the rectangle and dimming disappear and the view is unchanged.

---

### User Story 4 - Region zoom on a paused recording (Priority: P4)

An analyst listening to an audio-sourced gram pauses it and Shift-drags a
region of the waterfall. The view zooms to that region: the frequency range
narrows as it would on an image, and the time window narrows to the selected
span at the selected position in the recording.

**Why this priority**: It is a distinct code path (vertical position on a
player is a time window — `player.viewTop` plus `windowSeconds` — not a
normalised centre) and audio-sourced instances are the newer, less-used form.
Deferring it keeps P1 simple, and until it lands region zoom is simply
unavailable on players.

**Independent Test**: On `sample/player.html`, play briefly, pause, Shift-drag
a region of the revealed waterfall; the resulting view shows that time span and
that frequency span, and no unplayed time is revealed.

**Acceptance Scenarios**:

1. **Given** a paused audio-sourced gram, **When** the analyst Shift-drags a
   region and releases, **Then** the visible time window and frequency range
   match the selection.
2. **Given** a paused audio-sourced gram, **When** a region zoom would reveal
   time that has not yet played, **Then** the window is clamped so it does not.
3. **Given** an audio-sourced gram that is *playing*, **When** the analyst
   Shift-drags, **Then** nothing happens — no selection rectangle appears and
   the view does not change.

---

### Edge Cases

- **A Shift-click with no movement.** Treated as a click: no zoom change, no
  annotation. Without this, a stray Shift-click zooms straight to the 10× cap.
- **A box smaller than the 10× cap allows.** The zoom clamps at 10× and centres
  on the selection, so the view then shows *more* than was drawn. This is the
  one place the what-you-draw-is-what-you-get promise cannot hold; showing more
  than asked is the safe direction to fail.
- **The pointer leaves the image but stays over the axis margins.** The box is
  clamped to the image edge and the drag continues, so a region can be selected
  right up to an edge. (This deliberately differs from feature drags, which are
  cancelled on an off-image release — see FR-011 and the risk note.)
- **The pointer leaves the component entirely.** The selection is cancelled and
  the view is unchanged.
- **Shift pressed or released mid-drag.** The gesture is decided at mousedown;
  releasing Shift part-way through does not turn a region selection into a pan,
  and pressing Shift part-way through a pan does not turn it into a selection.
- **A second button pressed mid-drag.** A middle- or right-button press during
  a region selection must not start a competing drag, open a context menu, or
  leave the rectangle stranded on screen.
- **A region selection started while another drag is running.** Refused: the
  drag engine permits one active drag per instance.
- **Two GramFrame instances on a page.** The selection belongs to the instance
  under the pointer; the other is untouched.
- **A zero-width or zero-height box** (a pure horizontal or vertical sweep).
  Covered by the movement threshold in FR-008 if small; if large in one axis
  only, the aspect lock gives it the gram's proportions, so it is always a
  well-formed region.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Holding Shift and pressing the left button over the spectrogram
  MUST begin a region selection, in every interaction mode (Pan, Analysis,
  Harmonics, Sidebands, Doppler) and at every zoom level.
- **FR-002**: A region selection MUST NOT be delegated to the active mode. No
  marker, harmonic set, sideband set or Doppler point may be created, moved,
  restyled or deleted by any part of the gesture — press, move, or release.
- **FR-003**: While the selection is being drawn, it MUST be displayed as a
  rectangle constrained to the aspect ratio of the gram's rendered area: the
  pointer determines the larger dimension and the other follows.
- **FR-004**: While the selection is being drawn, the area of the gram outside
  the rectangle MUST be visually dimmed.
- **FR-005**: While the selection is being drawn, its frequency span and time
  span MUST be shown live, in the same units and formatting the axes use.
- **FR-006**: On release, the view MUST change so the selected region occupies
  the visible gram area, centred on the selection's centre.
- **FR-007**: The resulting zoom MUST stay within the existing 1×–10× range. A
  selection that would require more than 10× MUST clamp to 10× and centre on
  the selection rather than being refused.
- **FR-008**: A gesture whose pointer movement stays below a small threshold
  (5 rendered pixels on both axes) MUST be treated as a click: no zoom change
  and no annotation change.
- **FR-009**: Pressing Escape during a selection MUST cancel it, leaving the
  view and all annotations unchanged.
- **FR-010**: The pointer leaving the component during a selection MUST cancel
  it, leaving the view unchanged.
- **FR-011**: While the pointer is outside the image but still within the
  component (over the axis margins), the rectangle MUST be clamped to the image
  bounds and the selection MUST remain live, so a release there completes the
  zoom rather than cancelling it.
- **FR-012**: Region zoom MUST be inert while an audio-sourced recording is
  playing, consistent with every other pointer interaction on a playing gram.
- **FR-013**: On a paused audio-sourced gram, a region zoom MUST set the
  visible time window to the selected time span and the frequency range to the
  selected frequency span, clamped so that time which has not been played is
  not revealed.
- **FR-014**: A **Fit** command button MUST be available in the control row
  alongside `+` and `−`, returning the view to the complete gram in one click.
- **FR-015**: **Fit** MUST be disabled when the complete gram is already shown.
- **FR-016**: The on-screen guidance MUST describe the gesture in the section
  that covers cross-mode navigation, alongside the wheel instructions.
- **FR-017**: Every existing navigation and annotation gesture MUST behave
  unchanged: Pan-mode left-drag, middle-button drag pan, Ctrl+wheel zoom, wheel
  pan, right-click delete, and each mode's own left-drag interactions.
- **FR-018**: Persistent features MUST remain locked to their data coordinates
  across a region zoom, as they do across every other view change.
- **FR-019**: A region selection MUST NOT be persisted. It leaves no trace in
  stored annotations and does not survive the release of the mouse button.
- **FR-020**: When a page hosts several instances, a region selection MUST
  affect only the instance under the pointer.
- **FR-021**: While Shift is held with the pointer over the gram, the cursor
  SHOULD indicate that a region selection is available, so the gesture is
  discoverable by experiment rather than only by reading the guidance.

### Key Entities

- **Region selection**: transient, in-memory only, existing for the duration of
  one drag. Its start and current corners are the only data it holds; it is
  never written to state that outlives the gesture, never persisted, and never
  broadcast as an annotation. The only durable result of a selection is a
  change to the existing zoom level and centre (and, on a player, the time
  window).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From any mode and any zoom level, an analyst can go from "I want
  to look at that" to looking at it in a single press-drag-release, with no
  mode switch and no button click.
- **SC-002**: After release, the visible frequency and time ranges match the
  drawn rectangle to within one rendered pixel on each edge, except where the
  10× cap applies.
- **SC-003**: Returning to the complete gram takes exactly one action from any
  zoom level.
- **SC-004**: Across the full matrix of five modes, no Shift-drag creates,
  moves, restyles or deletes any annotation — 0 occurrences in the automated
  suite.
- **SC-005**: A Shift-click below the movement threshold leaves both the view
  and the annotation set byte-identical.
- **SC-006**: Framing a chosen feature requires 1 gesture, against the 3–8
  alternating zoom-and-pan actions the same task takes today.

## Assumptions

- Shift is free as a pointer modifier: it is currently used only to accelerate
  keyboard nudges, which cannot coincide with a mouse drag. Ctrl is taken by
  wheel zoom and is right-click emulation on macOS; Alt+drag is intercepted by
  common Linux window managers. Neither is a viable alternative.
- Analysts use a mouse and keyboard. Touch and trackpad pinch gestures are out
  of scope; the component has no touch input today.
- Zoom stays isotropic — one level plus a centre — and capped at 10×. This
  feature does not change the zoom model, which is why the aspect lock exists.
- The existing drag engine's one-drag-per-instance rule and its cancellation
  points (Escape, pointer leave) are reused rather than duplicated.
- The guidance panel's cross-mode section is currently rendered as part of Pan
  mode's guidance, so the new line is fully visible only in Pan mode. That is a
  pre-existing quirk of the guidance system and is not addressed here.

## Out of Scope

- **A zoom history stack** ("back to the previous view"). Considered and
  deferred: it needs a decision about what invalidates the history (pan? wheel
  zoom? mode switch? a new gram?) and a second gesture to teach. **Fit** covers
  the common case of getting out.
- **Independent horizontal and vertical zoom.** This would remove the need for
  the aspect lock, but it changes the zoom model and every consumer of it.
- **Raising the 10× cap.**
- **Double-click to reset.** Considered and rejected: a double-click currently
  reaches the modes as two mousedowns, which in Analysis mode places two
  markers, so it would need suppression logic that risks the existing
  single-click behaviour.
- **Region zoom during playback.**

## Interview Decisions

Recorded from the 2026-09-05 design discussion. Each entry states the choice
and what was rejected, so a later reader can tell a decision from an accident.

1. **Gesture: Shift + left-drag, in every mode.** Rejected: a dedicated Zoom
   mode (a sixth mode, and it forces you out of the measurement mode you are
   in — the exact interruption region zoom exists to remove); right-button drag
   (collides with Analysis's right-click delete and the context-menu path);
   bare left-drag in Pan mode at zoom 1 (one gesture with two meanings across
   an invisible boundary, gone after the first zoom, absent from the four
   measurement modes).
2. **Aspect ratio: lock the rubber band to the gram's shape while dragging.**
   Rejected: free box then fit (the view is never quite the box you drew, and a
   thin box barely zooms — the drag appears to do nothing); free box then fill
   (crops away content the analyst deliberately selected — the wrong failure
   mode for a measurement tool).
3. **Exit: a Fit button beside `+` and `−`.** Rejected: a zoom history stack
   (deferred, see Out of Scope); double-click to reset (see Out of Scope);
   nothing at all (leaves the one-gesture-in / six-clicks-out asymmetry).
4. **Feedback: outline, dimmed surround and live span readout.** Rejected:
   outline plus dimming without the readout (you cannot tell what span you are
   committing to); plain outline only (competes with gram content, and makes
   the aspect lock look arbitrary).

## Risks and Open Questions

- **The modifier is invisible.** Shift+drag is undiscoverable without the
  guidance line (FR-016) and the cursor hint (FR-021). This is the standing
  cost of choosing a modifier over a mode button, and the cursor hint is what
  most reduces it — which is why FR-021 is a SHOULD, not a nice-to-have.
- **FR-011 deviates from an existing rule.** Feature drags are cancelled when
  the pointer is released off-image; a region selection completes instead. The
  reasoning is that selecting to the very edge of a gram is a normal thing to
  want, while a feature released off-image has no valid position. It is a
  genuine inconsistency and should be reviewed rather than waved through.
- **The player path is the likeliest source of subtle bugs.** Existing
  pointer-anchored zoom holds a single time at a fixed fraction of the view; a
  region zoom must hold a whole span, with its own clamp against unplayed time.
  This is why it is a separate story (US4) rather than folded into P1.
- **The 10× clamp breaks the WYSIWYG promise** for very small selections. FR-007
  chooses to clamp rather than refuse; whether the analyst should be told this
  happened (rather than just seeing a wider view than they drew) is open.
- **Guidance visibility.** Because the cross-mode guidance section is rendered
  by Pan mode, an analyst who starts in Analysis mode may never read the line
  that documents the gesture. Out of scope here, but it limits SC-001 in
  practice.
