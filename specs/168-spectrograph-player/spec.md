# Feature Specification: Spectrograph Player — a Scrolling, Audible Gram

**Feature Branch**: `168-spectrograph-player`
**Created**: 2026-09-05
**Status**: Complete — implemented and merged
**Input**: [GitHub Issue #170 — JS spectrograph player](https://github.com/DeepBlueCLtd/GramFrame/issues/170),
elaborated through a structured interview on 2026-09-05 (decisions recorded
under [Interview Decisions](#interview-decisions)).

> See if there is an open source JS component that can display a wav file as a
> spectrograph waterfall component. If there isn't one — consider writing our
> own. The component would show the audio data moving vertically down the
> component as it plays. That would handle the dynamic AND aural requirements.
> A user should be able to pause the video to add the existing GramFrame
> annotations. These will scroll with the moving spectrograph when playing.
> We'll need to find a few creative commons audio files, typically containing
> industrial/machinery noise.

## Context

<!--
  Today every GramFrame instance is built on a static image: the author
  supplies a PNG and four axis values, and the component overlays measurement
  tools on it. Sonar training also needs the *dynamic* view (a waterfall the
  trainee watches evolve, as on a real display) and the *aural* view (hearing
  the contact while reading its gram). Both are met by one addition: a
  GramFrame instance whose source is a WAV file rather than an image. The
  spectrogram is computed in the browser from the audio, revealed row by row
  as the audio plays, and every existing annotation tool works on it once the
  trainee pauses.

  The work is phased. Phase 1 is a time-boxed research spike: is there an
  open-source JS component that already does this well enough to build on?
  Its output is a documented decision. Phases 2-5 specify the player itself
  and are written to hold whichever way that decision goes.

  Constraints carried over from the product: single-file distribution, runs
  over file:// in air-gapped environments, no network access at runtime,
  declarative configuration through the gram-config table, multiple
  independent instances per page.
-->

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Research spike: build or borrow? (Priority: P1)

A developer spends a bounded effort (recommended: two days) surveying
open-source JavaScript components that render audio as a spectrogram in the
browser, and evaluates each candidate against a fixed criteria list. The
output is `research.md` in this spec folder: the candidates considered, how
each scored, the licence of each, and a recommendation of one of three
outcomes — **adopt** (bundle a library), **borrow** (reuse an algorithm or
approach without bundling code), or **build** (write our own). The licence
implications of any *adopt* recommendation are discussed with the product
owner before the decision is final; the spike records the licence terms and
what accepting them would mean for the single-file build, but does not decide
on its own.

**Why this priority**: Everything downstream depends on it. A wrong answer
here costs either weeks of unnecessary implementation or a dependency the
project cannot ship. It is also the only story with no user-facing output, so
it must finish first and finish quickly.

**Independent Test**: `research.md` exists, names at least three candidates
(or shows the search that found fewer), scores each against every criterion
in FR-001, states the licence of each, and closes with a single recommended
outcome and the reasons for it.

**Acceptance Scenarios**:

1. **Given** the criteria in FR-001, **When** the spike is complete, **Then**
   every candidate is scored against every criterion, with a source link and
   a one-line justification per score.
2. **Given** a candidate that scores well, **When** its licence is not
   permissive (anything other than MIT, BSD, ISC, Apache-2.0 or similar),
   **Then** the report explains what shipping it would require of GramFrame's
   own licence and distribution, so the product owner can decide.
3. **Given** the recommendation is *adopt*, **Then** the report includes a
   proof-of-concept page under `debug*.html` or `sample/` that loads a WAV
   and renders a gram with the candidate over `file://`, with no network
   access.
4. **Given** the recommendation is *build*, **Then** the report names the
   algorithmic choices (FFT implementation, windowing, magnitude-to-colour
   mapping) that Story 2 will implement, with a reference for each.
5. **Given** the time box elapses without a clear winner, **Then** the
   recommendation defaults to *build*, and the report says so.

---

### User Story 2 - An audio-sourced GramFrame instance renders a gram (Priority: P1)

An instructor writes a gram-config table whose first row holds an audio
source instead of an image. On load, GramFrame decodes the WAV, computes a
spectrogram of the whole file in the browser, and shows the component with
the familiar frequency (horizontal) and time (vertical, increasing upward)
axes. Before play is pressed the gram area is blank: nothing has been heard
yet, so nothing is shown. A progress indication covers the computation so the
trainee knows the page is working.

**Why this priority**: This is the minimum slice that proves the pipeline
(decode → analyse → render through the existing coordinate system). Without
it there is nothing to play, and no annotation can be placed.

**Independent Test**: Load a sample page whose gram-config names a WAV.
Assert that the component initialises, the axes show the configured
frequency range and a time range of `[-window-seconds, 0]`, the gram area is
blank, and the broadcast state reports the audio duration and the analysis
parameters in force.

**Acceptance Scenarios**:

1. **Given** a gram-config table with an audio row and no other rows,
   **When** the page loads, **Then** the component initialises with default
   analysis parameters (FR-003) and the axes reflect them.
2. **Given** a table that overrides `fft-size`, `freq-start`, `freq-end` or
   `window-seconds`, **When** the page loads, **Then** those values are used
   and appear in the broadcast state.
3. **Given** a stereo WAV, **When** it is analysed, **Then** both channels
   are mixed to mono before analysis and playback.
4. **Given** a file that is not a decodable WAV, or fails to load, **When**
   the page loads, **Then** the standard `.gramframe-error-indicator` is
   shown in place of the component, with the cause logged, and other
   instances on the page are unaffected.
5. **Given** a browser without the Web Audio API, **When** the page loads,
   **Then** the existing unsupported-browser warning is shown and no attempt
   is made to decode audio.
6. **Given** a three-minute mono WAV at 44.1 kHz, **When** it is analysed with
   default parameters, **Then** the component is ready to play within the
   budget in SC-002 and the page remains responsive throughout.

---

### User Story 3 - Play: the gram scrolls down while the audio is heard (Priority: P1)

The trainee presses play. The audio is heard, and the spectrogram appears as
a waterfall: each newly played instant enters at the top edge of the gram
area and everything already shown slides downward, so the most recent audio
is always at the top and the view holds the last `window-seconds` of what has
been played. The time axis scrolls with it. Audio and picture stay in step.
Hovering shows the live frequency/time readout as it does today. Unplayed
audio is never displayed — the picture never gets ahead of the sound.

**Why this priority**: This is the dynamic-and-aural requirement in the
issue. With Stories 2 and 3 a trainee can already listen and watch, which is
the core training value.

**Independent Test**: Press play on a sample page; assert that the visible
time range advances at real time (within SC-003), the top row of the gram
corresponds to the current playback position, no rows beyond the playback
position are painted, and the audio element reports `playing`.

**Acceptance Scenarios**:

1. **Given** the initial blank view, **When** play is pressed, **Then** rows
   fill from the top as audio plays; until `window-seconds` have elapsed the
   lower part of the view remains blank (it represents time before the file
   began).
2. **Given** more than `window-seconds` have played, **When** playback
   continues, **Then** the view shows exactly the last `window-seconds` of
   audio with the newest row at the top, and the axis labels update.
3. **Given** playback is running, **When** the audio reaches the end,
   **Then** playback stops, the view remains on the final window, and the
   transport shows the stopped state (unless loop is on, per Story 5).
4. **Given** playback is running, **When** the pointer moves over the gram,
   **Then** the frequency/time readouts show the data under the pointer at
   that moment.
5. **Given** playback is running, **When** the trainee tries to place, drag
   or delete an annotation, or to pan or zoom, **Then** nothing happens and
   the cursor indicates that interaction requires pausing.
6. **Given** two audio-sourced instances on one page, **When** both are
   played, **Then** both play independently; starting one does not affect
   the other.

---

### User Story 4 - Pause, annotate, resume: annotations ride the gram (Priority: P2)

The trainee pauses. The gram freezes where it is. Every existing tool is now
available: Analysis markers, Harmonics and Sidebands pin sets, Doppler
curves, Pan-mode zoom and pan over everything that has been revealed so far.
The trainee places a harmonic set on a tonal and presses play again. The
annotations move with the gram, staying on the features they were placed on,
and slide off the bottom of the view as their moment passes; on seeking or
looping back they reappear where they belong. Annotations persist through
the existing storage mechanism, keyed to absolute time in the recording.

**Why this priority**: This is the second half of the issue's ask and what
turns the player from a viewer into a training instrument. It is P2 only
because it depends on Story 3 and delivers nothing on its own.

**Independent Test**: Pause at 20 s; place a marker at (12 s, 300 Hz) and a
harmonic set at 15 s; resume; at 30 s assert both are drawn at the screen
position that (12 s, 300 Hz) and 15 s now map to; at 45 s assert they are no
longer in the visible window; seek to 20 s and assert they are back.

**Acceptance Scenarios**:

1. **Given** the player is paused, **When** any existing mode is selected and
   used, **Then** it behaves exactly as on an image-backed instance, within
   the revealed time range.
2. **Given** the player is paused, **When** the trainee pans or zooms,
   **Then** the view may travel anywhere in `[0, playhead]`; it cannot
   scroll into unplayed time.
3. **Given** annotations exist and playback resumes, **When** the view
   scrolls, **Then** every annotation is redrawn each frame at the screen
   position its data coordinates map to.
4. **Given** the trainee has panned away from the playhead while paused,
   **When** play resumes, **Then** the view returns to the playhead window
   first, then scrolls from there.
5. **Given** annotations were saved and the page is reloaded, **When** the
   trainee plays past their time, **Then** they reappear at the same data
   coordinates.
6. **Given** a marker at 12 s and the trainee seeks to 5 s, **Then** the
   marker is not drawn (its time is now unrevealed) and is drawn again once
   playback passes 12 s.

---

### User Story 5 - Full transport (Priority: P2)

Alongside play/pause the trainee can seek to any played position by
scrubbing or by clicking the time axis, return to the start, loop the file,
change playback rate (at least 0.5×, 1×, 2×), adjust volume and mute. The
same actions are available from the keyboard when the instance has focus,
without stealing keys that already nudge annotations.

**Why this priority**: The issue only requires pause; the product owner
asked for full transport in the first release. Each control is small, but
they are independent of the core play/annotate loop.

**Independent Test**: Exercise every control on a sample page and assert the
audio element's `currentTime`, `paused`, `loop`, `playbackRate`, `volume` and
`muted` follow it, and that the gram view follows `currentTime`.

**Acceptance Scenarios**:

1. **Given** the file has been played to 40 s, **When** the trainee seeks to
   25 s, **Then** the view shows the window ending at 25 s and play resumes
   from there; **When** the trainee seeks to 60 s, **Then** the view shows
   the window ending at 60 s with rows revealed up to 60 s, and playback
   continues from 60 s.
2. **Given** loop is on, **When** the end is reached, **Then** playback and
   the view restart from 0 without a visible discontinuity longer than
   SC-003.
3. **Given** rate 2×, **When** playing, **Then** the view scrolls at twice
   real time and the frequency readouts still report the recording's true
   frequencies (a 300 Hz tonal reads 300 Hz at any rate).
4. **Given** a marker is selected, **When** an arrow key is pressed, **Then**
   the marker nudges as today; **When** the transport seek key is pressed,
   **Then** the transport acts. The two bindings never collide.
5. **Given** the instance is muted, **When** playing, **Then** the gram still
   scrolls and readouts still work.

---

### User Story 6 - Sample material and documentation (Priority: P3)

The repository gains three to five Creative Commons recordings of industrial
or machinery noise, each with source, author and licence recorded, and a
sample page that plays them. The integration guide documents the audio row
and the optional analysis rows so an instructor can author a player without
reading code.

**Why this priority**: Required by the issue and needed by the Playwright
suite, but it is content rather than behaviour and can land alongside any of
the stories above.

**Independent Test**: `sample/audio/ATTRIBUTION.md` (name at plan time) lists
every committed file with a resolvable source URL and a CC0 or CC-BY licence;
`sample/` contains a page that loads each one; the HTML Integration Guide has
a section for audio-sourced instances.

**Acceptance Scenarios**:

1. **Given** the committed audio files, **Then** each is WAV, each is under
   five minutes, each is licensed CC0 or CC-BY, and the attribution file
   names the author where CC-BY requires it.
2. **Given** the sample page, **When** opened over `file://`, **Then** every
   player initialises and plays.
3. **Given** the Integration Guide, **Then** the audio row and every
   optional analysis row is documented with type, default and meaning.

---

### Edge Cases

- **Web Audio autoplay policy**: browsers refuse to start audio without a
  user gesture. The player never auto-plays; the first play is always a
  click or key press, and any API-driven `play()` before a gesture reports
  failure rather than silently doing nothing.
- **Keyboard collisions**: arrow keys already nudge the selected annotation
  through `FocusManager`/`keyboardControl.js`, and space may scroll the page.
  Transport bindings must be chosen so neither existing behaviour changes on
  image-backed instances, and so an audio-backed instance with a selected
  marker still nudges it. The concrete bindings are a plan-phase decision.
- **Long or high-rate files**: a five-minute 96 kHz stereo file produces a
  gram far taller than the browser's largest paintable surface. The plan
  states the maximum image height the render path can hold; the player draws
  the gram at the coarser hop that fits and says so in a caption (spec 171,
  FR-023/FR-024), and refuses — with the error indicator, never a silent
  truncation — only when no substitution rescues the file (FR-025).
- **Frequency crop above Nyquist**: `freq-end` above half the sample rate is
  clamped to Nyquist and a console warning names the clamp.
- **`window-seconds` longer than the file**: the whole file fits in the
  view; the lower part stays blank and the view never scrolls.
- **Seek while paused**: the view moves to the target window and rows up to
  the target are revealed, without starting playback.
- **Rate change and pitch**: pitch is preserved across a rate change unless
  the config table's `preserve-pitch` row says otherwise (spec 171, FR-021 and
  FR-022). The displayed gram is computed from the original audio and is never
  re-analysed at the new rate.
- **Storage keying**: an instance's annotations are keyed as today. Because
  time is absolute in the recording, an annotation saved at 12 s is at 12 s
  after reload regardless of where the view was when it was saved.
- **Tab in the background**: `requestAnimationFrame` pauses in hidden tabs
  while audio continues. On return the view must jump to the current
  position, not replay the missed scroll.
- **Same WAV, two instances**: each instance decodes and analyses
  independently; there is no shared cache in the first release.
- **Sub-frame precision**: the playhead advances in analysis-frame steps
  (hop size ÷ sample rate). The view scrolls smoothly between frames; the
  readout reports the interpolated time.

## Requirements *(mandatory)*

### Functional Requirements

**Research spike (Story 1)**

- **FR-001**: The spike MUST score every candidate against all of the
  following: (a) renders a spectrogram from a WAV in the browser without a
  server; (b) works over `file://` with no runtime network access; (c) can be
  bundled into a single file; (d) exposes either per-frame magnitude data or a
  render surface that SVG can be overlaid on; (e) supports a scrolling
  waterfall, or gives enough access to build one; (f) browser support at
  least matching GramFrame's current baseline; (g) size added to the bundle;
  (h) maintenance signal (last release, open issues, bus factor); (i) licence
  and its implications for GramFrame's distribution; (j) test determinism
  (same input → same pixels/values).
- **FR-002**: The spike MUST end in exactly one of *adopt*, *borrow* or
  *build*, recorded in `research.md` with reasons, and *adopt* MUST NOT be
  final until the licence has been discussed with the product owner.

**Configuration (Story 2)**

- **FR-003**: A gram-config table MUST accept an audio source in its first
  row in place of the image. The plan decides the exact form (an `<audio>`
  element, or a `<td>` naming the file); either way the table stays in the
  existing two-column format.
- **FR-004**: The following optional rows MUST be honoured with these
  defaults: `fft-size` (power of two, default 1024), `hop-size` (samples,
  default `fft-size / 2`), `freq-start` (Hz, default 0), `freq-end` (Hz,
  default Nyquist, clamped to Nyquist), `window-seconds` (seconds of audio
  visible, default 10). `time-start` and `time-end` MUST be ignored with a
  console warning on an audio-sourced instance, since the recording defines
  them.
- **FR-005**: The component MUST accept mono and stereo 8-, 16-, 24- and
  32-bit PCM (and 32-bit float) WAV; stereo MUST be mixed to mono. Any other
  container or codec is out of scope and MUST fail through FR-007.
- **FR-006**: The component MUST compute the spectrogram of the entire file
  once, at load, and MUST keep the page responsive while doing so (chunked
  or off-thread), showing a progress indication in the gram area.
- **FR-007**: A file that cannot be fetched or decoded, or a file whose
  analysed gram exceeds the render path's maximum height, MUST surface via
  the standard `.gramframe-error-indicator` with the cause logged; other
  instances on the page MUST be unaffected.
- **FR-008**: On a browser lacking the Web Audio API the existing
  unsupported-browser warning MUST be shown and no audio work attempted.
- **FR-009**: The audio-sourced instance MUST expose the same public API,
  state broadcast and `__test__` hooks as an image-backed instance, extended
  with: audio duration, playhead time, playing/paused/ended, loop, rate,
  volume, muted, the analysis parameters in force, and an analysis-ready
  flag.

**Rendering and playback (Story 3)**

- **FR-010**: Time MUST increase upward, as it does today; the newest revealed
  audio is the top row of the visible window and the window shows
  `[playhead - window-seconds, playhead]`. Time before 0 is blank.
- **FR-011**: ~~Rows MUST be revealed only up to the playhead; the picture MUST
  never show audio that has not yet been played or sought past.~~
  **Withdrawn by [spec 171](../171-player-refinements/spec.md) FR-003.** The
  product owner dropped the reveal rule (research 169 §9, Q1): the whole gram
  is drawn from the moment it is analysed. What is lost — "you only know what
  you have heard" — is recorded as a trade in spec 171's Risks, not as a
  defect.
- **FR-012**: During playback the view MUST follow the playhead every
  animation frame, and audio-to-picture alignment MUST stay within SC-003.
- **FR-013**: During playback, pointer hover readouts MUST work; annotation
  create/move/delete MUST be inert, and the cursor MUST show that they are.
  **Narrowed by [spec 171](../171-player-refinements/spec.md) FR-004a**: pan
  and zoom are no longer inert. A press-and-drag pauses playback and resumes
  where the view is released (spec 171 FR-015, FR-016), and time zoom is
  permitted while playing (FR-018). Region zoom stays inert.
- **FR-014**: The spectrogram MUST use the existing coordinate pipeline
  (`utils/coordinates.js`) so that every existing mode measures the moving
  gram correctly without mode-specific changes.
- **FR-015**: Multiple audio-sourced instances on one page MUST play
  independently of each other.

**Annotations (Story 4)**

- **FR-016**: When paused, every existing mode MUST work unchanged, and
  pan/zoom MUST be confined to the recording — `[0, duration]`.
  **Rewritten by [spec 171](../171-player-refinements/spec.md) FR-003/FR-007**;
  it read "on the revealed range … confined to `[0, playhead]`".
- **FR-017**: Annotations MUST be stored in data coordinates (absolute
  seconds, Hz) and redrawn each frame at the screen position those map to,
  so they scroll with the gram and reappear on seek or loop.
- **FR-018**: ~~Annotations whose time is beyond the current playhead MUST NOT
  be drawn.~~ **Withdrawn by [spec 171](../171-player-refinements/spec.md)
  FR-003/FR-006.** Every annotation is drawn wherever it sits in time, and one
  may be placed anywhere in a recording that has never been played.
- **FR-019**: Annotation persistence MUST reuse the existing storage layer
  and warning banner without a schema bump for existing image-backed data.

**Transport (Story 5)**

- **FR-020**: The player MUST provide play/pause, seek (scrub control and
  click on the time axis), restart, loop, playback rate (at least 0.5×, 1×,
  2×), volume and mute, from both the UI and the public API.
- **FR-021**: Keyboard transport bindings MUST NOT change any existing
  key behaviour on image-backed instances and MUST NOT collide with
  annotation nudging on audio-backed instances.
- **FR-022**: Frequency and time readouts MUST report the recording's true
  values at any playback rate.
- **FR-023**: Playback MUST NOT start without a user gesture; API `play()`
  before a gesture MUST report failure.

**Material and docs (Story 6)**

- **FR-024**: Three to five CC0 or CC-BY WAV recordings of industrial or
  machinery noise, each under five minutes, MUST be committed under
  `sample/` with an attribution file giving source URL, author and licence.
- **FR-025**: A sample page MUST exercise at least one player, and the HTML
  Integration Guide MUST document the audio row and every row in FR-004.

### Key Entities

- **Audio source**: the WAV file an instance is built on. Attributes:
  duration, sample rate, channel count. Replaces the image as the thing the
  axes are calibrated from.
- **Analysis parameters**: `fft-size`, `hop-size`, `freq-start`, `freq-end`,
  `window-seconds`. Determine the gram's pixel dimensions and the mapping
  from pixel to (time, Hz).
- **Spectrogram**: the computed magnitude grid, one row per analysis frame,
  one column per retained frequency bin. Conceptually an image whose height
  is the whole recording; the existing zoom/pan model views a window of it.
- **Playhead**: the current playback time in seconds. Drives the visible
  window during play, bounds what is revealed, and bounds pan/zoom when
  paused.
- **Transport state**: playing/paused/ended, loop, rate, volume, muted.
  Broadcast like every other state slice.
- **Annotation** (existing): marker, pin set, Doppler curve. Unchanged;
  time is now absolute in the recording.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The spike delivers `research.md` within its time box with at
  least three candidates scored on every FR-001 criterion, or a documented
  search showing fewer exist.
- **SC-002**: A three-minute mono 44.1 kHz WAV is ready to play within 5 s of
  page load on a mid-range laptop, with no single main-thread stall over
  100 ms during analysis.
- **SC-003**: During playback the top revealed row is within 100 ms of the
  audio element's reported position, measured at 1× and 2×; the view scrolls
  at 30 frames per second or better for a `window-seconds` of 10.
- **SC-004**: Every existing Playwright spec passes unchanged on image-backed
  instances; a new suite covers Stories 2-5 with state-based waits and no
  `waitForTimeout`.
- **SC-005**: A trainee can pause, place a harmonic set, resume, and see it
  stay on its tonal through a full window of scrolling and a loop back to
  0 — demonstrated in a Playwright test against a committed sample file.
- **SC-006**: The single-file bundle grows by no more than the size the spike
  reported for the chosen approach, and still initialises over `file://`
  with no network access.
- **SC-007**: `yarn typecheck`, `yarn lint`, `yarn hygiene` and the unused-
  export ratchets pass; the analysis code has unit coverage in the Vitest
  lane (a known tone at a known frequency lands in the expected bin).

## Assumptions

- ~~**Unplayed audio stays hidden.**~~ **Superseded.** This assumption named
  its own escape hatch — "if the product owner would rather let a paused
  trainee scroll ahead into unplayed audio, FR-011, FR-016 and FR-018 change"
  — and that is exactly what happened (research 169 §9, Q1;
  [spec 171](../171-player-refinements/spec.md) US1). Everything is still
  computed up front; nothing is withheld.
- **Play resumes from the playhead, not the view.** Panning while paused
  does not move the playhead; resuming snaps the view back to the playhead
  window (Story 4 scenario 4).
- **Rate change preserves pitch.** Corrected by
  [spec 171](../171-player-refinements/spec.md) FR-001: this assumption said
  the player used the browser's native pitch handling, but every engine in the
  baseline defaults to preserving pitch, so the shipped player was
  pitch-preserving in fact. It is now assigned explicitly (FR-021) and an
  author may select resampling per exercise with `preserve-pitch`. The gram is
  never recomputed for a rate change.
- ~~**Pan/zoom is suspended during play**~~ — the "plausible later
  enhancement" this assumption named is [spec
  171](../171-player-refinements/spec.md) US3: a drag seeks, and zoom works
  while playing.
- **Default colour map** is the implementation's choice, chosen to resemble
  the existing sample grams; a configurable map is out of scope.
- **Browser baseline** is the existing one (Chrome/Edge 84 class); the Web
  Audio API is present on it. WebKit smoke coverage follows the existing
  smoke lane.
- **No shared decode cache** between instances of the same file in the first
  release.
- **Time-box for the spike** is two working days; longer is a plan decision.
- **Licence discussion** with the product owner is a gate inside Story 1,
  not a constraint fixed by this spec.
- **Existing storage schema is untouched**; audio-backed annotations use the
  same shape with absolute times.

## Interview Decisions

Recorded so the plan phase can see what was chosen and what was offered.

| # | Question | Decision |
|---|----------|----------|
| 1 | Scope of this SRD | Both: a research spike with a decision gate, then the player, as phased stories |
| 2 | Packaging | A GramFrame instance with an audio source; same table, modes, storage and API |
| 3 | Source of pixels | Computed in-browser from the WAV |
| 4 | Timeline model | Whole file precomputed; pan/zoom and seek available when paused |
| 5 | Scroll direction | Newest at top, older slides down, playhead at the top edge (consistent with the existing upward time axis) |
| 6 | Interaction while playing | View only; existing annotations scroll; hover readouts live |
| 7 | Transport | Full: play/pause, seek, restart, loop, rate, volume/mute, keyboard |
| 8 | Third-party library | Discuss licence implications if a suitable candidate is found; no constraint fixed now |
| 9 | Analysis parameters | Sensible defaults, overridable by optional gram-config rows |
| 10 | Audio input | WAV only, up to a few minutes |
| 11 | Sample audio | 3-5 files, CC0 or CC-BY, committed under `sample/` with attribution |
| 12 | Multiple instances | Independent playback |
| 13 | Initial view | Blank; fills from the top on play |

## Out of Scope

- Live microphone or streaming input.
- Non-WAV formats, recordings longer than a few minutes, and any progressive
  or windowed analysis of long files.
- Pitch-preserving rate change.
- Trainer-authored "answer" overlays that appear at a given time.
- Re-analysis with different parameters at runtime (a settings panel).
- Recording or exporting audio or the computed gram.
