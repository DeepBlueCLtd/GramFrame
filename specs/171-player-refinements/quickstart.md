# Quickstart: verifying spec 171 (Player Refinements)

A script to walk through, in order. Steps 1–2 are the automated gate; steps
3–9 are what to do with your hands and eyes, each with what should happen and
what would count as a failure. Roughly fifteen minutes end to end.

Two things in this spec **cannot** be checked in CI and are the reason this
walkthrough exists: whether 0.25× playback really preserves pitch (SC-005 —
headless Chromium has no sound device), and whether the contrast controls stay
smooth with features drawn over the gram (SC-002 was measured on an empty
image, on one machine, in one browser).

---

## 1. The automated gate

```bash
yarn lint && yarn typecheck && yarn hygiene && yarn test:unit && yarn test
```

All five must pass (SC-007). The suites that carry this spec's own behaviour:

| Story | Command | What it pins |
|---|---|---|
| 1 | `npx playwright test tests/player-load.spec.js tests/player-annotations.spec.js tests/player-pan.spec.js tests/player-region-zoom.spec.js` | The whole gram from load; annotations drawn wherever they sit; the view clamped by the duration rather than the playhead |
| 2–6 | `npx playwright test tests/player-refinements.spec.js` | Contrast, drag-seek, zoom while playing, the rate ladder and pitch, the degraded load, the live region |
| pure | `yarn test:unit -- display-range gram-image` | The contrast arithmetic and the hop-size substitution |

## 2. Start the sample page

```bash
yarn dev     # then open http://localhost:5173/sample/player.html
```

Use the **hot-bulb diesel engine** player for everything below unless a step
says otherwise. Its window is 10 s.

---

## 3. Story 1 — the whole recording is there before you press play

1. Reload the page. **Do not press play.**
2. The gram is drawn immediately: the first 10 s of the recording fill the axes
   area and the time axis reads `00:00` at the bottom to `00:10` at the top.
   *Before this change the view was blank and the axis read `-00:10` to
   `00:00`.*
3. Drag the gram upward (Pan mode is the default) until the end of the
   recording. Every second of it is drawn — no blank band, no clipped edge —
   and the drag stops at the recording's last second rather than earlier.
4. Switch to **Cross Cursor** and click near the end of the recording. The
   marker appears, is listed in the markers table, and its time is what the
   readout said.
5. Reload the page. The marker is still there and still drawn, with nothing
   having been played (SC-001).

**Failure looks like**: a blank view on load, a marker that is listed but not
drawn, or a drag that refuses to pass the playhead.

## 4. Story 2 — contrast

1. Find the two sliders on the transport bar: **Floor** and **Ceiling**.
2. Drag **Floor** slowly to the right. The background darkens progressively and
   the tonals stand out; it should feel continuous under the hand, not stepped.
   (This is the SC-002 check that CI cannot do. Place half a dozen markers and a
   harmonic set first, then repeat — the drag must stay just as smooth with
   features drawn over the gram.)
3. Drag **Ceiling** left. Mid-range detail expands; the loudest parts saturate.
4. Push the two together. They refuse to cross, and the picture never goes
   blank.
5. Hover a fixed point and note the frequency and time. Move both controls
   through their whole travel and hover the same point: the readouts are
   identical to the digit (FR-011, SC-003). Every marker is where it was.
6. Press **Reset**. The picture returns to exactly how it loaded.
7. Open any image-backed page (`http://localhost:5173/debug.html`): there are no
   contrast controls there at all (FR-014).

**Failure looks like**: a readout that shifts with a slider, a marker that
moves, a blank image, or contrast controls on an image gram.

## 5. Story 3 — moving around a playing recording

1. Press ▶ and let it run past 15 s.
2. Press and drag the gram downward. Playback pauses under your hand, the view
   follows the pointer, and the cursor is a closed hand.
3. Release. Playback resumes **from where you let go** — within an animation
   frame, and the transport's elapsed time agrees with the view (SC-004).
4. Repeat, but this time drag off the component — past the browser chrome — and
   release there. Playback must still resume; being left paused would be the
   bug this step exists for.
5. Now **click** the gram without dragging it. Playback pauses and the view
   does not jump. Click again (in Pan mode) and it resumes — the toggle.
   Switch to Cross Cursor, click to pause, then click again: this time a marker
   is placed and playback stays paused, because the annotating modes keep their
   click.
6. While it is playing, Ctrl+wheel over the gram. The time span changes, the
   playhead stays at the top edge, and the bar's span readout ("5.0 s span")
   follows the zoom (FR-019).
7. Still playing: right-click a marker, or press an arrow key with one
   selected. **Nothing happens** — annotation stays inert (FR-017); a plain
   click is the pause from step 5, not a placement.
8. Still playing: Shift-drag. Nothing happens either; region zoom is
   deliberately a paused-only gesture.

**Failure looks like**: a marker placed while playing, a recording left paused
after a drag, a click that seeks instead of pausing, or a zoom that is refused
mid-playback.

## 6. Story 4 — speed and pitch (the by-ear check, SC-005)

**This step needs a real machine with sound.** It is the one requirement this
repository cannot test.

1. Open the speed control. The choices are 0.25, 0.5, 1, 1.5, 2 and 4.
2. Play at 1×, then select **0.25×**. The engine note is four times slower and
   at the **same pitch** — it drawls, it does not drop an octave and a half.
3. Read a tonal's frequency off the gram at 1× and again at 0.25×. What you hear
   still matches the number (FR-021).
4. Now check the opt-out. Add `<tr><td>preserve-pitch</td><td>false</td></tr>`
   to one of the tables in `sample/player.html`, reload, and play at 0.25×: the
   pitch now falls with the speed, as slowing a tape does (FR-022).
5. Undo that edit.

**Failure looks like**: a pitch that drops at 0.25× with `preserve-pitch`
unset, or a `preserve-pitch` row that changes nothing.

## 7. Story 5 — a long recording loads instead of being refused

```
open http://localhost:5173/tests/fixtures/player-degraded-page.html
```

1. The gram loads. There is **no** red error indicator.
2. Under the transport bar, a caption reads: *"This recording is too long to
   render at hop-size 2; it is drawn at hop-size 8."* (FR-024, SC-006.)
3. For contrast, open `http://localhost:5173/tests/fixtures/player-bad-page.html`:
   the third table asks for an `fft-size` that makes the gram too *wide*, which
   no substitution rescues, and it is still refused with the standard error
   indicator (FR-025).

## 8. Story 6 — what a screen reader hears

1. Turn on a screen reader (VoiceOver ⌘F5, or NVDA).
2. Press play, then pause. Each transition is announced — "Playing at 00:12 of
   01:30" — without the focus moving.
3. Let it play for a minute. Announcements come every few seconds, not on every
   frame (FR-027). Continuous speech is the failure here.

## 9. Nothing else moved

1. Open `http://localhost:5173/debug.html` (an image gram) and use it normally:
   markers, harmonics, sidebands, doppler, zoom, pan, region zoom, expand.
   Nothing in this spec touches an image-backed instance.
2. Confirm no transport bar, no contrast controls and no `filter` attribute on
   its `<image>` element.

---

## What this change deliberately does **not** do

- It does not recover detail the analysis already discarded. The contrast
  controls act on the painted 8-bit image, whose levels were clipped at the
  file's 5th and 99.9th percentiles when the PNG was made. A true dB display
  range needs the retained magnitude grid (R10), which is out of scope.
- It does not revive region zoom while playing, add A-B looping, band-limited
  listening, an overview strip, bookmarks or a dB colour key. Those are R9–R15
  in the spec's Out of Scope section, with the reason each was left.
- **It gives up "you only know what you have heard."** A trainee can now read
  ahead of the audio, which for a detection exercise is exactly what the reveal
  rule protected. The product owner decided this knowing the cost (research 169
  §9, Q1). If an exercise needs it back, it should return as an authoring
  option, not as a global rule.
