# ADR-019: Audio-Sourced Instances — the Spectrograph Player

## Status

**Accepted** (spec 168).

## Context

Every GramFrame instance was built on a static image an author supplied. Sonar
training also needs the dynamic view (a waterfall the trainee watches evolve)
and the aural one (hearing the contact while reading its gram) — issue #170.

A research spike ([specs/168-spectrograph-player/research.md](../../specs/168-spectrograph-player/research.md))
scored seven open-source candidates and found none worth adopting: the
rendering libraries draw time horizontally on their own canvas, and every one
of them gets audio by `fetch` or from a media element through Web Audio, both
of which the product's `file://` deployment forbids (Chromium refuses `fetch`
of a sibling file from a `file://` page and feeds Web Audio silence from a
cross-origin media element). The spike also measured that a 60-line FFT
analyses a three-minute file in under two seconds.

## Decision

1. **An audio-sourced instance is an image-backed instance whose image is the
   whole recording.** The WAV is decoded by our own RIFF parser, analysed by
   our own radix-2 FFT in ≤ 12 ms main-thread slices, painted through an
   off-screen canvas into a PNG data URL, and handed to the existing
   `<image>` element. `config` becomes `[0, duration] × [freq-start, freq-end]`
   and the natural size `bins × frames`. Zero runtime dependencies are added.
2. **The waterfall is a viewport rule, not a second renderer.**
   `imageDetails.timeStretch` draws the image `duration / window-seconds`
   times taller than the axes area and `state.player.viewTop` — the time at
   the view's top edge — positions it, both applied in
   `svgLayout.applyZoomTransform`. Every transform in `utils/coordinates.js`
   already reads the live element bounds and scales the axes independently,
   so the modes measure the moving gram unchanged. The one addition to the
   coordinate module is that its zoom-1 "full range visible" shortcut defers
   to the general path when the image is stretched.
3. **Playback is the `<audio>` element, not Web Audio.** It plays over
   `file://`, needs no context, and its `currentTime` read once per animation
   frame is the playhead. Its events are mirrored into `state.player` so a
   change the browser makes on its own is broadcast like one made by the API.
4. **Samples arrive by `fetch`, or over `file://` from a sidecar.**
   `<name>.wav.js`, written by `scripts/wav2js.mjs`, registers the file's
   bytes as base64 on `window.GramFrameAudio`; the loader injects it as a
   `<script>` only after `fetch` has failed. No change to authored HTML.
5. ~~**Reveal is structural.**~~ **Withdrawn by spec 171 (FR-003, FR-005).**
   The whole gram is drawn from the moment it is analysed: `clampViewTop` is
   bounded by the recording's duration, the image clip is the axes area, and
   `BaseMode.isTimeRevealed` — with the three renderer guards that used it — is
   gone. A mode now learns nothing at all about the player. What that costs is
   recorded in spec 171's Risks: a trainee can read ahead of the audio, which
   for a detection exercise is the thing the rule protected.
6. **Inertness while playing is decided in `core/events.js`**, before any
   mode is reached, so no mode changes its handlers. Spec 171 (FR-017) narrowed
   it to *annotation* inertness: the same place now hands a press on a playing
   gram to `player/dragSeek.js` and lets a wheel zoom through.
7. **The canvas is image production, not overlay rendering.** It is created
   once, off screen, at load, and never attached to the DOM; the constitution's
   SVG-first principle (overlays in SVG, coordinates through `coordinates.js`)
   is untouched.

## Consequences

**Positive**

- Every existing mode, the storage layer, the keyboard control, expand and
  zoom work on a player with one-line guards or none; the existing suite
  passes unchanged.
- The signal chain is pure and Vitest-covered, including the
  known-tone-in-expected-bin test.
- The product's `file://` constraint is met with a one-command authoring step
  and no runtime network.

**Negative**

- Axes and persistent features are rebuilt every animation frame while
  playing. Measured at 60 fps on the fixture; a dense pin set may need the
  recorded fallback (translating the overlay group between full renders).
- A sidecar is a third again the WAV's size on disk, per file.
- The gram is capped at 32,768 × 4,096 (refused, never truncated); long
  high-rate files need a larger `hop-size`.
- `zoom.centerY` is meaningless on a player; the vertical position lives in
  `player.viewTop`. Two places to look, documented in `viewport.js`.

## Related Decisions

- [ADR-001](ADR-001-SVG-Based-Rendering.md) — the overlay stays SVG.
- [ADR-002](ADR-002-Multiple-Coordinate-Systems.md), [ADR-015](ADR-015-Viewport-Based-Zoom.md),
  [ADR-016](ADR-016-Image-Resize-Zoom.md) — the pipeline the stretch rides on.
- [ADR-013](ADR-013-File-Protocol-Compatibility.md) — why the sidecar exists.
- [ADR-014](ADR-014-Mode-State-Registration-Seam.md) — `player` is a core
  slice, not a mode's.
