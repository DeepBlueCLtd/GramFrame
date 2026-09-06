# Feature Specification: Player Refinements — Acting on the 169 Survey

**Feature Branch**: `claude/gramframe-close-implemented-rftc82`
**Created**: 2026-09-05
**Status**: Draft
**Input**: [Spectrograph Player Precedent Survey](../169-player-ui-precedents/research.md)
§7 (Recommendations) and §9 (Decisions), against the player shipped by
[spec 168](../168-spectrograph-player/spec.md).

> The survey read 24 precedents across four families, scored the player on 46
> capability rows, ran three empirical probes, and produced fifteen numbered
> recommendations. Three of the questions that gated them were answered by the
> product owner on 2026-09-05 and recorded as decisions.

## Context

<!--
  The survey deliberately stopped short of a spec: "It did not write a spec, a
  plan, a prototype or issues (product owner, 2026-09-05)". That instruction has
  since been reversed — this spec exists because the decisions recorded in §9
  had no tracking artefact of any kind, and a decision with nowhere to live is a
  decision that gets re-litigated or lost. Nothing else about §9 is superseded.

  Scope is the nine recommendations that are both (a) sized S by the survey and
  (b) either decided by the product owner or purely corrective. The six M-sized
  recommendations (R9-R15, less R13) need design work the survey did not do and
  answers to Q4 and Q5 that do not exist yet; they are listed under Out of Scope
  with their rationale intact so this spec does not quietly become the place
  they were dropped.

  Three of the nine are corrections rather than features: the spec 168 documents
  state three things that are untrue of the code that shipped. Those are listed
  first, because a spec that contradicts its own code is worse than no spec, and
  because two of the behavioural changes below only make sense once the record
  says what the player actually does.

  One change here reverses a decision spec 168 made deliberately. FR-011 of that
  spec — "the picture MUST never show audio that has not yet been played" — is
  withdrawn. The survey found it the only row of 46 with no precedent in any
  direction, and the product owner chose to drop it. What is lost is real and is
  recorded as a trade, not smuggled through as a bug fix.
-->

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The whole recording is there from the moment it loads (Priority: P1)

An analyst opens a page carrying an audio-sourced gram. The entire recording is
drawn — every second of it — and they can scroll through it, measure any part of
it, and place annotations anywhere on it, before pressing play at all. Pressing
play still scrolls the view with the playhead at the top edge, exactly as now.

**Why this priority**: It is the decided reversal, and everything about paused
navigation gets simpler once it lands. It also removes the contradiction the
survey found: the seek slider's `max` is the full duration, so one drag already
defeated the rule the drawing code was enforcing.

**Independent Test**: Load `sample/player.html`, do not press play, and pan to
the end of the recording. The gram is drawn there, the axes label it, and a
marker placed at that time survives a reload.

**Acceptance Scenarios**:

1. **Given** a freshly loaded audio-sourced gram, **When** the analyst pans
   toward the end of the recording without playing, **Then** the gram image is
   drawn for the whole span and no region is blank or clipped.
2. **Given** a freshly loaded audio-sourced gram, **When** the analyst places a
   marker, harmonic set, sideband set or Doppler point at a time later than the
   playhead, **Then** it is drawn, listed in its panel, and persisted.
3. **Given** a recording playing from the start, **When** the analyst watches
   the view, **Then** the playhead remains at the top edge and the image scrolls
   beneath it, unchanged from today.
4. **Given** a paused recording scrolled to its end, **When** the analyst presses
   play, **Then** playback resumes from the playhead and the view snaps to it,
   unchanged from today.

---

### User Story 2 - Bring a faint tonal out of the background (Priority: P1)

An analyst looking at a gram whose features sit close to the noise floor drags a
pair of controls — a floor and a ceiling — and watches the contrast redistribute
live. A tonal that was barely distinguishable from the background becomes
legible. Every measurement they have taken, and every annotation on the gram, is
unchanged by the adjustment.

**Why this priority**: The survey's strongest single row — present in 12 of 12
precedents across both technical families, the only universal *control* row,
with a stated task reason — and probe (b) measured the implementation at 60.3
fps, indistinguishable from no filter. Zero dependencies, pure SVG.

**Independent Test**: On a sample recording, move the floor control up; the
image darkens progressively and the frequency/time readouts for a fixed pointer
position do not change.

**Acceptance Scenarios**:

1. **Given** an audio-sourced gram, **When** the analyst moves the floor control
   up, **Then** levels below it render as background and the remaining range is
   redistributed across the full colour map.
2. **Given** an audio-sourced gram, **When** the analyst moves the ceiling
   control down, **Then** levels above it saturate and mid-range detail expands.
3. **Given** any display-range setting, **When** the analyst reads the frequency
   and time under the pointer, **Then** the values are identical to those read at
   the default setting.
4. **Given** any display-range setting, **When** the analyst inspects existing
   annotations, **Then** every one is drawn at the same position with the same
   values.
5. **Given** an adjusted display range, **When** the analyst returns both
   controls to their default positions, **Then** the image is visually identical
   to the image as loaded.

---

### User Story 3 - Move around a recording that is playing (Priority: P2)

An analyst listening to a recording hears something and wants to look back at it
without stopping. They drag the gram: playback pauses under their hand and
resumes at the time they release it. They can also zoom the time axis while
playing, so the visible span suits what they are tracking — a short history for
a fast-changing contact, a long one for a slow one — and the span is labelled so
they know what they are looking at.

**Why this priority**: The survey's largest divergence from the closest family —
all six SDR/sonar precedents pan and zoom mid-stream — and the naval source
gives the task reason for an adjustable time span directly. Below US1/US2
because it changes an interaction rule rather than what can be seen at all.

**Independent Test**: Start playback, drag the gram downward, release; playback
continues from the released position and the transport time agrees with the
view.

**Acceptance Scenarios**:

1. **Given** a playing recording, **When** the analyst presses and drags on the
   gram, **Then** playback pauses and the view follows the drag.
2. **Given** a drag in progress on a playing recording, **When** the analyst
   releases, **Then** playback resumes immediately from the time the view was
   released at.
3. **Given** a playing recording, **When** the analyst zooms the time axis,
   **Then** the visible span changes, the follow loop keeps the playhead at the
   top edge, and the new span is stated in seconds.
4. **Given** a playing recording, **When** the analyst attempts to create, move,
   restyle or delete any annotation, **Then** nothing happens — annotation stays
   inert while playing, as today.
5. **Given** a playing recording, **When** the analyst clicks the gram without
   dragging it, **Then** playback pauses and the view stays where it was.
6. **Given** a recording paused in Pan mode, **When** the analyst clicks the
   gram, **Then** playback resumes.
7. **Given** a recording paused in any annotation mode, **When** the analyst
   clicks the gram, **Then** the mode places or picks up its feature as usual
   and playback stays paused.

---

### User Story 4 - Slow a recording down far enough to hear the detail (Priority: P2)

An analyst working on a click train or a fast transient selects a playback speed
well below half, and hears it stretched out. The frequency readout and what they
hear continue to agree, because pitch is preserved by default; where an exercise
wants the opposite, the author sets it in the config table.

**Why this priority**: The domain gives a stated reason for a wider range
(PAMGuard's slow playback brings inaudible clicks into band; ELAN goes to 1% for
transcription), and probe (a) put the platform ceiling at 0.0625-16, so today's
four-entry ladder is a UI choice with nothing behind it. The pitch half is
already decided and is two lines.

**Independent Test**: Select 0.25× on a sample recording; playback is audibly
slower and the pitch is unchanged.

**Acceptance Scenarios**:

1. **Given** an audio-sourced gram, **When** the analyst opens the speed
   control, **Then** the choices are 0.25, 0.5, 1, 1.5, 2 and 4.
2. **Given** a recording playing at 0.25×, **When** the analyst listens, **Then**
   the pitch matches playback at 1× and the frequency readout still describes
   what is heard.
3. **Given** a config table that selects resampling behaviour, **When** the
   recording plays at any speed other than 1×, **Then** the pitch shifts with the
   speed, as the acoustic family does.

---

### User Story 5 - A long recording opens instead of being refused (Priority: P3)

An author points a config table at a recording too long for the render caps at
the requested resolution. Rather than a refusal, the gram loads at a coarser time
resolution, and the caption says which parameter was changed and to what.

**Why this priority**: The code already computes the hop size that would fit in
order to name it in the refusal message — offering it costs little. Nobody in the
acoustic family refuses outright. Below the others because an author hits it
once, at authoring time, not an analyst repeatedly.

**Independent Test**: Configure a recording that exceeds the row cap; the gram
loads and the caption names the substituted hop size.

**Acceptance Scenarios**:

1. **Given** a recording that exceeds the caps at the requested settings,
   **When** the page loads, **Then** the gram is rendered at the computed
   fitting parameter rather than refused.
2. **Given** such a degraded load, **When** the author reads the caption,
   **Then** it names the parameter, the requested value and the value used.
3. **Given** a recording that cannot be made to fit by that parameter alone,
   **When** the page loads, **Then** it is refused with the existing message —
   the refusal path stays, it just stops being the first answer.

---

### User Story 6 - The transport announces what it is doing (Priority: P3)

An analyst using a screen reader hears the playback state and elapsed time as
they change, instead of having to poll the control.

**Why this priority**: The accessibility bar in this component comes from the
training family, where every commercial product carries a WCAG or VPAT
obligation. This is one attribute with an established pattern behind it, and it
is the only accessibility item in this spec — the broader keyboard and dialog
work was closed as not planned (#274) and is not revived here.

**Independent Test**: With a screen reader, start and pause playback; both
transitions are announced without moving focus.

**Acceptance Scenarios**:

1. **Given** an audio-sourced gram, **When** playback starts or pauses, **Then**
   the change is announced politely, without stealing focus.
2. **Given** a playing recording, **When** the elapsed time updates, **Then**
   announcements do not fire on every frame.

---

### Edge Cases

- What happens when a drag on a playing recording is released **outside** the
  component? Playback must resume rather than being left paused by an
  interaction the analyst thinks they cancelled.
- What happens when the display-range floor is dragged above the ceiling? The
  two must not cross; the image must never go fully blank as a result of a
  control the analyst can move by accident.
- What happens to the display range when the gram is re-analysed or the page is
  reloaded? It is view state (see Assumptions), so it resets — the analyst must
  not believe a persisted contrast setting is part of their saved work.
- What happens on a still-image (non-audio) gram? The display range applies to
  audio-sourced instances only; the levels of an author-supplied PNG were never
  ours to re-map, and the control must not appear there.
- What happens when a region zoom (spec 170 FR-013) runs on a paused recording?
  That requirement's clamp against unrevealed time no longer has anything to
  clamp against, and must be amended with this change rather than left to
  contradict it.

## Requirements *(mandatory)*

### Documentation truth (R1)

- **FR-001**: Spec 168's Assumption 3, D16 and the Out-of-Scope entry on pitch
  MUST be corrected: the shipped player is pitch-preserving.
- **FR-002**: Spec 168's D5 MUST state the colour map the code implements —
  dark blue → blue → yellow → orange → red.
- **FR-003**: Spec 168's FR-011, FR-016 and FR-018 MUST be withdrawn or rewritten
  to match the decision in FR-004 below, and D10 removed.
- **FR-004**: Spec 170's FR-013 MUST be amended to drop its clamp against
  unrevealed time.
- **FR-004a**: Spec 168's FR-013 — "annotation create/move/delete, pan and zoom
  MUST be inert" during playback — MUST be narrowed to annotation interactions,
  matching FR-015 to FR-018 below.

### The whole gram from load (R1b)

- **FR-005**: The gram image MUST be drawn for the full duration of the
  recording from the moment analysis completes, with no region hidden by
  playback position.
- **FR-006**: Feature rendering MUST NOT be gated on playback position. Every
  annotation MUST draw wherever it sits in time.
- **FR-007**: `clampViewTop`'s upper bound MUST be the recording's duration
  rather than the playhead.
- **FR-008**: Playback behaviour MUST be unchanged: the playhead stays at the
  top edge, the view follows it, and `ended` leaves the view on the final
  window.

### Runtime display range (R2)

- **FR-009**: An audio-sourced gram MUST offer two controls — a display floor
  and a display ceiling — acting on the rendered image.
- **FR-010**: Moving either control MUST re-map the displayed levels live, at
  interactive frame rates, with no re-analysis of the audio.
- **FR-011**: The controls MUST NOT change any stored or reported value: data
  coordinates, readouts, annotation positions and persisted records are all
  unaffected.
- **FR-012**: The floor MUST NOT be settable at or above the ceiling.
- **FR-013**: The controls MUST have a default position that reproduces the
  image exactly as it loads today, and MUST be returnable to it.
- **FR-014**: The controls MUST be offered on image-sourced instances as well
  as audio-sourced ones. On an instance with no transport bar they MUST appear
  on a bar of their own, in the same place under the gram.

  *Amended by [#324](https://github.com/DeepBlueCLtd/GramFrame/issues/324),
  2026-09-06.* It read "The controls MUST NOT appear on image-sourced
  instances", on the ground that "the levels of an author-supplied PNG were
  never ours to re-map". **That reason was wrong**: on a player the controls
  also act on painted 8-bit pixels, not on measured levels, since the magnitude
  grid is discarded once the PNG exists. The two cases are the same case.

  The real question was whether a per-channel transfer misleads on a
  colour-mapped image, and it was measured rather than argued. Every gram in
  `sample/` is hue-coded blue → yellow (mean saturation 0.65–0.77, no greyscale
  pixels) — **and hue is a monotone function of brightness in all of them**, so
  the transfer, being monotone, never reorders what is strong and what is weak.
  Hue distortion is confined to clipping: lowering the ceiling moves 3.9% of
  pixels by more than 5°, while raising the floor to 0.35 moves 23% by more
  than 15° — all of it in the background being deliberately suppressed. A
  desaturating "hue-safe" variant was prototyped and rejected: identical
  contrast, colour map thrown away.

  This is a **trial**. The one fact that would have reversed it — a printed
  colour key that analysts read values against, which would make colour the
  measurement rather than a rendering of it — was put to the product owner and
  answered on 2026-09-06: **no training material carries a colour key.** So
  colour here is a rendering of level and nothing else, and the hue shift the
  floor produces in the suppressed background costs no reading. It remains a
  trial in the sense that it wants use before it is called settled, not in the
  sense that a known risk is outstanding.

### Navigating a playing recording (R6, R7)

- **FR-015**: Pressing and dragging on a playing gram MUST pause playback for
  the duration of the drag and move the view with the pointer.
- **FR-016**: Releasing such a drag MUST resume playback from the time the view
  was released at, including when the release happens outside the component.
- **FR-017**: Annotation interactions MUST remain inert while playing.
- **FR-018**: Time zoom MUST be permitted while playing, with the follow loop
  continuing to hold the playhead at the top edge.
- **FR-019**: The visible time span MUST be stated in seconds wherever the zoom
  can be changed.
- **FR-028**: A click on a playing gram — a press and release with no
  intervening drag — MUST pause playback, in every mode, and MUST NOT move the
  view. *(Added during implementation at the product owner's request,
  2026-09-06. A click while playing had no meaning: annotation is inert
  (FR-017), so the drag-seek paused on the press and resumed on the release,
  making it a no-op.)*
- **FR-029**: A click on a *paused* gram MUST resume playback in Pan mode only.
  In every other mode the click MUST keep its existing meaning — placing or
  picking up a feature — and MUST NOT affect playback. *(Added with FR-028.
  The asymmetry is deliberate: pause-then-annotate is the workflow the player
  exists for, and taking the annotating modes' click for the transport would
  cost it.)*

### Playback speed and pitch (R3, R4)

- **FR-020**: The playback-speed choices MUST be 0.25, 0.5, 1, 1.5, 2 and 4.
- **FR-021**: `preservesPitch` MUST be assigned explicitly rather than
  inherited, and MUST default to `true`.
- **FR-022**: A config-table row MUST allow an author to select resampling
  (pitch-shifting) behaviour instead, per exercise.

### Oversize recordings (R8)

- **FR-023**: A recording that exceeds the render caps MUST be offered at the
  fitting parameter the code already computes, rather than refused outright.
- **FR-024**: A degraded load MUST state, in the caption, which parameter was
  changed, what was requested and what was used.
- **FR-025**: The existing refusal MUST remain for a recording that cannot be
  made to fit.

### Announcements (R5)

- **FR-026**: The transport's state and time text MUST be exposed as a polite
  live region.
- **FR-027**: Announcements MUST be rate-limited so a playing recording does not
  produce continuous speech.

### Key Entities

- **Display range**: a floor and a ceiling over the rendered level scale. View
  state, per instance, not persisted and not broadcast as annotation data. It
  lives in `state.display` — a core key, not a player one, since #324 gave
  image-backed grams the controls too.
- **Drag-seek**: a transient pairing of a pan gesture with a playback pause and
  a resume time. Owned by the transport, not by any mode. A press that never
  moves is the degenerate case, and means "pause" rather than "seek to here"
  (FR-028).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a freshly loaded, never-played recording, an analyst can place
  and persist an annotation at any time in the file, including the last second.
- **SC-002**: Moving either display-range control redraws at ≥ 50 fps on the
  sample recordings, measured as probe (b) measured it.
- **SC-003**: Frequency and time readouts for a fixed pointer position are
  bit-identical across the full travel of both display-range controls.
- **SC-004**: A drag on a playing recording resumes playback within one
  animation frame of release, and the resumed time matches the released view.
- **SC-008**: A click on a playing gram pauses it in every mode, and in Pan
  mode a second click resumes it; in the annotation modes the same click on a
  paused gram still places its feature.
- **SC-005**: 0.25× playback is audibly slower with pitch unchanged, confirmed
  by ear on a real machine (probe (a) could not measure this headlessly).
- **SC-006**: A recording that is refused today loads at a stated coarser hop.
- **SC-007**: `yarn lint && yarn typecheck && yarn hygiene && yarn test:unit &&
  yarn test` green, with new coverage for each user story.

## Assumptions

- The display range is **view state**, like zoom: per instance, reset on reload,
  never persisted and never part of an annotation record. A trainee's contrast
  setting is not part of their work, and two trainees comparing the same
  exercise should not be able to disagree about what was saved.
- The display range acts on the **painted 8-bit levels**, not on the magnitude
  grid, which is discarded after painting today. This is the honest limit of the
  feature as scoped — see Risks.
- "Pause under the hand, resume on release" is Raven's behaviour and is assumed
  to be the wanted one; the alternative (scrub audibly while dragging) is a
  different feature and is not proposed.
- The rate ladder is a UI list only. No claim is made that every entry is useful
  on every recording.

## Out of Scope

Carried from the survey with their sizing, so they are not lost:

- **R9** — region selection plus A-B loop as one feature. Blocked on Q4: is the
  selection a *measurement* (a new annotation type, with storage implications)
  or only a *loop range* (transport state)?
- **R10** — retaining the magnitude grid as `Uint16` under a ~32 MB per-instance
  cap. Decided in principle (Q3), including the graceful-degradation rule for
  files that exceed the budget, but M-sized and a prerequisite for R14 and R15.
- **R11** — band-limited listening. Downstream of R9.
- **R12** — an overview strip.
- **R13** — bookmarks / jump-to-time. S-M and nearly free given the existing
  annotation store; excluded only to keep this spec to decided items.
- **R14** — per-band normalisation. Downstream of R10.
- **R15** — a dB colour key. Needs R2 (this spec) *and* R10 to be honest.
- **X5** — trainer-authored timed overlays, still declined. Q5 asks whether that
  decline is a decision or an oversight; unanswered.
- The keyboard and ARIA work beyond FR-026/FR-027: closed as not planned (#274).

## Decisions carried in

From research §9, product owner, 2026-09-05:

- **Q1 — the reveal rule**: dropped. The player is an analyst tool; the whole
  gram is drawn from load. This overrides the survey's own X3, which had
  recommended keeping the rule and making it honest.
- **Q2 — pitch on rate change**: `preservesPitch = true`, explicitly, with a
  config row offering resampling instead.
- **Q3 — memory for a retained grid**: `Uint16`, ~32 MB per instance, degrading
  to the painted-PNG path when a file will not fit. Recorded here; the work is
  out of scope (R10).

## Risks and Open Questions

- **The trade in US1 is real.** Dropping the reveal rule loses "you only know
  what you have heard" — a trainee can now read ahead of the audio, which for a
  detection exercise is exactly the thing the rule protected. The product owner
  decided this knowing the cost; it is recorded here so it is not rediscovered
  later as a defect. If a future exercise type needs it back, it should return as
  an authoring option, not as a global rule.
- **The static-gram trial widens the blast radius of US2's limitation.** The
  controls now act on author-supplied PNGs whose colour map GramFrame did not
  choose and cannot know. The measurements above cover the material we have —
  all of it hue-coded with hue monotone in brightness, and none of it carrying
  a colour key (product owner, 2026-09-06). Material we have not seen is not
  covered by them: a gram with a **non-monotone** map would break the ordering
  argument, and one printed **with** a key would make colour a value to read
  rather than a rendering. Neither exists today; both are things to check if
  the material ever comes from a new source.
- **US2 over-promises if read casually.** The floor/ceiling controls re-map
  levels that were already quantised to 8 bits and already clipped at the file's
  5th and 99.9th percentiles when the PNG was painted. Detail outside that
  window is gone and no slider recovers it. A genuine display range needs the
  retained grid (R10, out of scope). The controls should therefore be described
  as contrast adjustment, not as "the display range", in anything an analyst
  reads.
- **The click threshold is a judgement, not a measurement.** Four screen
  pixels separates a click from a drag. Too small and a firm click on a
  trackpad seeks by a few milliseconds instead of pausing; too large and a
  deliberate short drag pauses instead of seeking. It has not been tested on a
  touchpad under a moving vehicle, which is the condition that would decide it.
- **US3 changes a rule other specs lean on.** Spec 168's FR-013 names "annotation
  create/move/delete, pan and zoom" as inert during playback, and spec 170's
  FR-012 inherits it for region zoom. This spec narrows that to annotation
  interaction only. Both documents need the amendment (FR-004, FR-004a), or the
  next reader will implement the old rule from whichever they open first.
  Region zoom while playing is deliberately *not* revived here: it is a framing
  gesture, and pairing it with a pause-and-resume seek is a design question this
  spec does not answer.
- **SC-005 cannot be verified in CI.** Headless Chromium uses a fake audio sink
  and the analyser tap sat upstream of rate processing, so probe (a) could not
  hear anything. The pitch behaviour must be confirmed by ear on a real machine
  before this is called done.
- **Probe (b) is one machine, one browser, no features drawn.** The 60.3 fps
  figure was measured on Chromium with nothing over the image. A dense pin set
  under a live filter has not been measured, and WebKit has not been measured at
  all.
- **The rate ladder has no authority in either direction.** Five surveyed
  players ship five incompatible ladders and no source explains any of them. The
  six values chosen here are defensible from the domain reason for going slow,
  not from precedent; do not treat them as researched.
