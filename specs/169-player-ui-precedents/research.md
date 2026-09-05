# Research: Spectrograph Player — UI and capability precedents (feature 169)

**Date**: 2026-09-05 · **Time box**: 2.5 working days; spent about one · **Status**: complete
**Deliverable**: this `research.md`, plus [gallery.md](./gallery.md) — schematics of the
layout archetypes, links to every surveyed system's own published screenshot, and a
list of systems not surveyed (added at the product owner's request, 2026-09-05). No
spec, plan, prototype or issues; the document recommends, it does not decide.
**Decision**: **build on what exists.** The player's shape is right and in two places leads every
precedent surveyed; adopt the eight small changes in §7.1 — three of which are
corrections to statements spec 168 makes about its own code — hold the seven larger,
evidenced capabilities in §7.2 for their own specs, and decline the seven in §7.3.
Three of the five questions in §9 were answered by the product owner on 2026-09-05
and are recorded there as decisions — the reveal rule is dropped (the player becomes an
analyst tool), `preservesPitch` is pinned `true` with a config row for the alternative,
and the retained grid gets a 16-bit, 32 MB budget. Q4 and Q5 remain open.

Spec 168 built the player from an interview and a build-or-borrow spike over npm
packages; nothing in the repo compared its UI or capabilities with any existing
waterfall, acoustic-analysis or media-player system. This spike does that. It
surveys four families of precedent, weighted as the product owner asked — sonar
and SDR waterfall displays first — ticks each against a 46-row capability
checklist, and argues nine of spec 168's own decisions from both sides before
ranking what to adopt, what to leave for a later spec, and what to reject.

## 1. Summary of findings

1. **The player's shape is sound and, in two places, ahead of every precedent
   surveyed.** No tool in twenty-four has a placeable, persistent, draggable harmonic
   pin set (E2 — Sonic Visualiser's harmonic cursor is transient and follows the mouse
   [A28]); no web media player reads out anything but time under the pointer (E3
   [M28]); and only the annotation family matches GramFrame's time-anchored, persisted
   annotations (E4 [T25, T22]). Nothing in the survey suggests the architecture is wrong.

2. **Three statements in the spec are untrue of the shipped code.** `preservesPitch` is
   never assigned, so it is `true` (probe (a), [M8]) — the player is *pitch-preserving*,
   which spec 168 lists as out of scope, while Assumption 3 describes the opposite. D5
   describes a blue→cyan→yellow→white colour map; the code is
   dark-blue→blue→yellow→orange→red. And FR-011's "MUST never show audio that has not yet
   been played" is defeated by one drag of the seek slider, whose `max` is the full
   duration (`TransportBar.js:60-68`).

3. **The reveal rule is the only row in forty-six with no precedent in any direction.**
   Every training player that restricts a learner restricts the *control* and preserves
   *orientation* — Panopto keeps the bar and the thumbnails with seek disabled [T16], H5P
   keeps "all the stopping points" [T3] — and every analysis tool draws the whole file at
   open. The stated reason for restriction elsewhere is compliance attestation, not
   perception [T10, T4], and two of the three vendors who ship it also ship an expiry for
   it [T15, T9].

4. **A runtime display range is the survey's strongest recommendation, and it is
   cheap.** C1 is present in 12 of 12 precedents across the sonar/SDR and acoustic
   families, is the only universal *control* row, and carries a stated task reason [A6,
   W19]. Probe (b) measured an `feComponentTransfer` on the tall `<image>` at **60.3 fps,
   indistinguishable from no filter** — zero dependencies, pure SVG.

5. **Retaining the magnitude grid is 6/6 in the acoustic family, and Raven says why:**
   after a brightness change "the underlying power values have not changed so all
   measurement values will be the same" [A10]. GramFrame currently shares OpenWebRX's
   discard-at-paint failure mode [W3] having already paid to compute the grid. An SVG
   filter re-maps 8-bit levels only; a dB readout and background subtraction need the
   float grid.

6. **The rate ladder and the `J`/`L` keys have no authority behind them.** Five web
   players ship five incompatible ladders and **no source in any family explains any of
   them**; Plyr even binds `L` to *toggle loop* [M20]. J/K/L descends from the Avid
   shuttle, where the keys meant variable speed [M13], not a fixed skip. Meanwhile the
   domain does give a reason for a *wider* range — PAMGuard's slow playback brings
   inaudible clicks into band [W32], ELAN goes to 1% for transcription [T30] — and probe
   (a) put the platform ceiling at 0.0625–16.

7. **Inertness while playing is the largest divergence from the closest family, and the
   family offers a better answer than blocking.** All six SDR/sonar precedents pan and
   zoom mid-stream [W3, W23]; Raven, rather than refusing a drag during scrolling
   playback, converts it — the sound stops and "resumes immediately at the new time
   position when you release" [A3]. Annotation-while-playing should stay inert; panning
   should not.

8. **`window-seconds` being fixed at authoring time is the player's clearest gap against
   the naval source.** ES310 gives the task reason directly: a short history for "close
   contacts whose bearings are changing rapidly", a long one "for detecting long range
   contacts" [W33]. Eleven of twelve technical precedents make the span adjustable. The
   existing time zoom is most of the fix, once it works while playing.

9. **Four capabilities the player lacks are domain conventions with stated reasons and no
   design work done:** region selection (E5) and A–B loop (F1) as one feature [A1, A4,
   T30, M29]; band-limited listening (F3), the strongest task reason in the acoustic
   family [A1, A39]; an overview strip (D5) [W29, T31]; and bookmarks (F4) [T18, T22].

10. **Two things the survey says *not* to do.** A runtime colour-map picker is a tool
    habit with no task reason in any family, and in a training component it means two
    trainees see different pictures of the same exercise. And auto-ranging must not be
    "improved" into visible-area normalisation — Praat documents the cost against itself:
    "the blackness of a certain part of the spectrogram will change as you scroll" [A41].
    GramFrame's whole-file percentile stretch is, by luck, the better of the three
    positions in the family.

11. **The accessibility bar comes from the training family, not the technical ones.**
    Zero `aria-*` attributes exist in either browser SDR client [W36]; meanwhile every
    commercial training product carries a WCAG/VPAT obligation [T24, T21, T12, T6].
    GramFrame's transport is labelled but silent; video.js supplies the cheap pattern and
    the reason [M18]. Reduced motion is a non-issue: the governing criterion is WCAG 2.2.2
    Pause, Stop, Hide [T38], which a user-started, pausable animation already meets.

## 2. Baseline — the player as built

Everything the survey scores against, with where it lives. Read on `main` at
`063b5c5` (the merge of PR #282).

| Area | As built | Where |
|---|---|---|
| Transport controls | play/pause, restart, seek `range` (step 0.01), `mm:ss / mm:ss`, loop toggle, rate `<select>` **0.5 / 1 / 1.5 / 2**, mute, volume | `src/components/TransportBar.js:20-155` |
| Keys (focused audio instance) | `Space`/`Enter`/`K` toggle, `J`/`L` ∓/± **5 s** (`Shift` 30 s), `Home` restart, `M` mute; arrows stay nudging | `src/core/keyboardControl.js:21-22, 212-250` |
| Click-to-seek | left-button click in the time-axis band, playing or paused | `src/core/events.js:304, 359` |
| Scroll model | newest row at top; playhead at the top edge; `window-seconds` (default 10) visible at 1× | `src/player/playerView.js:27-36, 104`; `src/core/state.js:117` |
| Reveal | image clip's top edge = playhead row; `isTimeRevealed(t)` gates every feature draw | `src/components/svgLayout.js:189-197`; `src/player/playerView.js:90` |
| Paused navigation | pan back in time at any zoom, never ahead of the playhead; zoom 1–10× keeps the time under the pointer | `src/player/playerView.js:121`; `src/modes/pan/PanMode.js:59`; `src/core/viewport.js:141-193` |
| Play | resumes from the playhead and snaps the view to it; `ended` leaves the view on the final window | `src/player/transport.js:128-142, 71-80` |
| While playing | wheel, mousedown, mouseup, contextmenu and arrow nudges return early; cursor forced to `default`; hover readouts live | `src/core/events.js:67, 312, 403, 462`; `src/core/keyboardControl.js:166`; `src/gramframe.css:205` |
| Analysis | Hann only; `fft-size` 64–8192 (default 1024), `hop-size` (default half), `freq-start`/`freq-end`, `window-seconds` | `src/audio/spectrogram.js:141`; `src/core/configuration.js:164-222` |
| Display range | power → dB, stretched from the file's 5th percentile to its 99.9th, fixed; the magnitude grid is discarded after painting | `src/audio/gramImage.js:54-73` |
| Colour | one 256-entry LUT, dark blue → blue → yellow → orange → red (plan.md D5 still says blue→cyan→yellow→white — a drift) | `src/audio/colourMap.js:16-22` |
| Caps | 32,768 rows × 4,096 columns, refused not truncated | `src/audio/gramImage.js:22-23` |
| Not present | waveform, overview/minimap, seek-bar shading or markers, A–B loop, time entry, rate keys, live region, reduced-motion handling, gain/contrast, colour-map choice, runtime re-analysis, spectrum strip, dB readout, band-limited listening, timed overlays, export, decode cache | — |
| Flagged reversible by spec 168 | the reveal rule (FR-011/016/018); frequency zoom while playing | `spec.md:470-485` |

## 3. Precedents surveyed

See [gallery.md](./gallery.md) for schematics of the five layout archetypes described
below, and for a link to each system's own published screenshot.

The eight groups of the 46-row checklist every precedent was ticked against:
**A** waterfall and scroll model (6 rows) · **B** transport and playback (9) ·
**C** display range, gain and colour (6) · **D** navigation and zoom (5) ·
**E** measurement and annotation (6) · **F** study and teaching aids (5) ·
**G** accessibility, feedback and robustness (5) · **H** analysis controls (4).
Row labels are given in full in the matrix (§4); each family's own table repeats them
in short form. Families are presented in the order the product owner weighted them.

### 3.1 Sonar and SDR waterfall displays

This family is the visual ancestor of what spec 168 built, and the one whose look a
sonar trainee will already recognise. Six precedents were read from documentation and
source: **OpenWebRX / OpenWebRX+** and the **KiwiSDR** web client (browser SDR
receivers), **fldigi** (desktop HF operating), **SDRangel** (desktop SDR), **WebSDR**
(the original browser receiver), and **PAMGuard** (open-source passive acoustic
monitoring — the only member that plays a *stored recording* rather than a live radio,
and therefore the most transferable).

**What all six share.** A time-versus-frequency raster with a fixed "now" edge that new
rows enter and old rows leave; a labelled frequency axis; a floor/ceiling pair of level
controls (OpenWebRX's min/max sliders, KiwiSDR's `w`/`W` min-dB keys, fldigi's "maximum
signal level" and "signal range", SDRangel's Reference level and Range, PAMGuard's
amplitude min/max) that the operator is expected to work *continuously*; and —
universally — **clicking or dragging horizontally on the raster changes frequency, never
time**. Every one of them also treats zoom and pan as things done *while the display is
live*: nobody stops the waterfall to navigate it. That is the exact inverse of spec 168's
assumption that pan/zoom is suspended during play.

**Medium facts, not conventions.** Five of the six show a live signal and therefore
*cannot* have a playhead marker (the top edge is the playhead — A6), a scrub bar or seek
(B3, B4), restart or loop (B5, B6), a rate control (B7–B9), or an A–B loop (F1).
Time-axis zoom (D2) is mostly a medium fact too: you cannot magnify rows already
discarded. Where the medium *does* allow it, it appears immediately — SDRangel's
"Waterfall Scrolling" adds a memory of N spectra and a scroll bar [W20], and PAMGuard,
which reads stored data, has a play button, adjustable play speed, a time scroller, an
adjustable view duration and a Data Map overview [W29]. **The absence of transport in
this family is evidence about radios, not evidence that trainees do not want transport.**

**Genuine domain conventions, with task reasons.** Three survive the test in §8.2.
(1) **Newest at top.** The US Naval Academy ES310 sonar text states of the passive
waterfall: "The newest information is at the top of the display" [W33] — independent
confirmation that interview decision 5 matches naval practice, not merely GramFrame's
existing upward time axis. (2) **Adjustable visible time span, with a stated reason:** the
same text explains that a short history suits "close contacts whose bearings are changing
rapidly" while "a long tie history is more useful for detecting long range contacts" [W33].
Every precedent implements it (WebSDR's Speed × Size grid, KiwiSDR's rate slider,
fldigi's SLOW/NORM/FAST/PAUSE, SDRangel's averaging, PAMGuard's time-scale setting) — but
only the sonar text says *why*. GramFrame's fixed `window-seconds` is the player's weakest
point against this family. (3) **Automatic level ranging.** OpenWebRX has one-shot *and*
continuous auto-adjust [W1]; KiwiSDR has `S` auto-scale and an aperture auto/manual mode
[W7]; SDRangel documents its algorithm outright — "the average of FFT size ÷ 32 minima for
the minimum and 10 dB over maximum" [W19] — a directly comparable recipe to
`gramImage.js`'s 5th/99.9th percentile stretch, which is therefore *in* the family's
practice rather than an invention.

**The strongest single lesson.** SDRangel keeps *spectra*, not pixels: the scroll buffer
holds values, so a level change re-renders history and the buffer can be dumped to CSV
[W20, W22]. OpenWebRX bakes colour into canvases at draw time [W3], so a slider move
affects only future rows — a known and irritating asymmetry. GramFrame already computes
the whole file up front and then throws the grid away; retaining it (H4) buys re-mappable
contrast forever, and is the one change this family argues for most clearly.

**The strongest trap.** The family's keyboard vocabulary is *already spent on radio*.
WebSDR binds `j k ← →` to frequency down/up [W26]; KiwiSDR binds **space to mute**, `j i`
to frequency step, arrows to passband edges and `z Z` to zoom [W7]; fldigi binds
Shift/Ctrl-arrows to move the decode marker by 1/10 Hz [W17]. Every key a media player
wants — space, J/L, arrows — carries a domain meaning in the very displays this component
imitates. FR-021's collision worry is real, and copying this family's bindings would be
the wrong resolution: they are *radio* bindings, not sonar ones. Second trap: no member
has a harmonic or comb cursor (E2), and none has any accessibility affordance at all —
zero `aria-*` attributes in OpenWebRX's or KiwiSDR's markup [W36], and no
`prefers-reduced-motion` anywhere in the family. Where GramFrame goes beyond this family
it is on its own.

#### Family W scores

Columns: **OWRX** OpenWebRX/+ · **Kiwi** KiwiSDR web client · **fldigi** · **SDRa**
SDRangel · **WSDR** WebSDR · **PAMG** PAMGuard (spectrogram + viewer mode).

| id | row | OWRX | Kiwi | fldigi | SDRa | WSDR | PAMG |
|---|---|---|---|---|---|---|---|
| A1 | fixed "now" edge, older scrolls away | ✓ [W1,W3] | ✓ [W6,W7] | ✓ [W15] | ✓ [W19] | ✓ [W28] | ✓ [W30] |
| A2 | continuous (sub-row) scroll | ✓ [W3,W5] | ✓ [W6] | ✓ [W15] | ✓ [W19] | ✓ [W26] | ◐ [W29] |
| A3 | unacquired region drawn blank | ◐ [W3] | — | — | ◐ [W20] | — | ? |
| A4 | scrollback beyond the window | ✗ [W2,W3] | ✗ [W12] | ✗ [W17,W18] | ✓ [W20] | ✗ [W28] | ✓ [W29] |
| A5 | span / speed adjustable at runtime | ◐ [W2,W3] | ✓ [W8] | ✓ [W15] | ✓ [W19] | ✓ [W26] | ✓ [W30] |
| A6 | explicit now/playhead marker | — | — | — | — | — | ? |
| B1 | play / pause | ✗ [W2] | ✗ [W7] | ◐ [W15] | ◐ [W19] | ✗ [W26] | ✓ [W29] |
| B2 | volume and mute | ✓ [W4] | ✓ [W7] | ? | ? | ✓ [W26] | ◐ [W32] |
| B3 | scrub bar / seek slider | — | — | — | ◐ [W20] | — | ✓ [W29] |
| B4 | seek by clicking display / time axis | — | — | — | ✗ [W23] | — | ? |
| B5 | restart / jump to start | — | — | — | ✗ [W20] | — | ◐ [W29] |
| B6 | loop the whole item | — | — | — | ? | — | ? |
| B7 | playback-rate control | — | — | — | ? | — | ✓ [W29,W32] |
| B8 | rate range wider than 0.5×–2× | — | — | — | ? | — | ◐ [W32] |
| B9 | pitch on rate change documented | — | — | — | ? | — | ✓ [W32] |
| C1 | runtime floor/ceiling levels | ✓ [W3,W4] | ✓ [W9] | ✓ [W15] | ✓ [W19] | ◐ [W26] | ✓ [W30] |
| C2 | automatic ranging | ✓ [W1,W4] | ✓ [W7] | ✗ [W15,W16] | ✓ [W19] | ◐ [W26] | ✗ [W30] |
| C3 | colour map selectable at runtime | ◐ [W3,W4] | ✓ [W10] | ✓ [W16] | ✓ [W19] | ✗ [W26] | ◐ [W30] |
| C4 | colour-scale legend / dB key | ✗ [W2] | ✓ [W13] | ✗ [W16] | ✗ [W19] | ✗ [W26] | ? |
| C5 | dB readout under the cursor | ✗ [W3] | ◐ [W11] | ✗ [W15] | ✓ [W19] | ✗ [W26] | ? |
| C6 | per-row/band normalisation | ✗ [W3] | ✗ [W9] | ✗ [W16] | ✓ [W25] | ? | ? |
| D1 | frequency-axis zoom | ✓ [W1,W3] | ✓ [W6,W7] | ✓ [W15] | ✓ [W23] | ✓ [W26] | ◐ [W37] |
| D2 | time-axis zoom | ✗ [W2] | ✗ [W8] | ✗ [W15] | ◐ [W23] | ◐ [W26] | ✓ [W29] |
| D3 | pan while live/playing | ✓ [W3] | ✓ [W12] | ◐ [W15,W16] | ✓ [W23] | ✓ [W26] | ◐ [W29] |
| D4 | zoom while live/playing | ✓ [W1,W3] | ✓ [W7] | ✓ [W15] | ✓ [W23] | ✓ [W26] | ◐ [W37] |
| D5 | overview strip / minimap | ✗ [W2] | ◐ [W7] | ✗ [W15] | ✗ [W19] | ◐ [W26] | ✓ [W29] |
| E1 | persistent markers on the display | ◐ [W1,W3] | ◐ [W7] | ◐ [W15,W16] | ✓ [W24] | ◐ [W26] | ✓ [W31] |
| E2 | harmonic / comb cursor | ✗ [W2] | ✗ [W7] | ✗ [W16] | ✗ [W24] | ✗ [W26] | ? |
| E3 | frequency + time readout at pointer | ◐ [W3] | ◐ [W11] | ◐ [W15] | ✓ [W19,W24] | ✗ [W26] | ? |
| E4 | annotations persist | ◐ [W1] | ◐ [W7] | ◐ [W15] | ✓ [W24] | ◐ [W26] | ✓ [W31] |
| E5 | region selection by drag | ◐ [W1] | ◐ [W7] | ◐ [W16] | ✗ [W24] | ◐ [W26] | ✓ [W30,W31] |
| E6 | export measurements / image / data | ◐ [W1] | ◐ [W7] | ? | ✓ [W22] | ◐ [W26] | ◐ [W31] |
| F1 | A–B (region) loop | — | — | — | ? | — | ? |
| F2 | timed overlays / cue points | ✗ [W2] | ✗ [W7] | ✗ [W16] | ✗ [W19] | ✗ [W26] | ◐ [W30] |
| F3 | band-limited listening | ✓ [W1] | ✓ [W7] | ◐ [W17] | ◐ [W19] | ✓ [W26] | ◐ [W32] |
| F4 | bookmarks / jump-to-time | ◐ [W1] | ◐ [W7] | ◐ [W15] | ◐ [W19] | ◐ [W26] | ✓ [W29] |
| F5 | spectrum strip alongside waterfall | ✓ [W2] | ✓ [W7,W14] | ◐ [W15] | ✓ [W19] | ◐ [W26] | ◐ [W30] |
| G1 | keyboard transport bindings | ✗ [W1] | ◐ [W7] | ✗ [W17] | ? | ✗ [W26] | ? |
| G2 | keys follow a recognised media scheme | ? | ✗ [W7] | ✗ [W17] | ? | ✗ [W26] | ? |
| G3 | ARIA live region / announcement | ✗ [W36] | ✗ [W36] | — | — | ? | ? |
| G4 | reduced-motion accommodation | ✗ [W36] | ◐ [W8] | ◐ [W15] | ◐ [W19] | ◐ [W26] | ? |
| G5 | graceful explained failure | ? | ◐ [W7] | ? | ? | ✓ [W26] | ? |
| H1 | FFT size selectable at runtime | ◐ [W3] | ◐ [W38] | ◐ [W16] | ✓ [W19] | ✗ [W26] | ◐ [W30] |
| H2 | window function selectable | ? | ? | ✓ [W16] | ✓ [W19] | ✗ [W26] | ? |
| H3 | overlap / hop selectable at runtime | ? | ? | ? | ✓ [W19,W23] | ✗ [W26] | ◐ [W30] |
| H4 | magnitudes retained after painting | ✗ [W3] | ◐ [W12] | ✗ [W15] | ✓ [W20,W22] | ? | ✓ [W29,W30] |

#### Family W notes

- **A1** — Direction is not uniform, and WebSDR could not be settled: a third-party guide
  says its waterfall "constantly scrolls upward" [W28], which would put newest at the
  *bottom*, opposite to the ES310 sonar convention [W33]. The SDR family does not
  unanimously agree with sonar on direction; the sonar source does.
- **A2** — The scroll quantum in every live precedent is one FFT row, not one pixel;
  OpenWebRX draws the new line at the top of a canvas and shifts prior canvases down
  [W3, W5]. GramFrame's per-frame sub-row interpolation is *better* than the family.
- **A3** — The clearest medium fact in the set. A live receiver has no future to reserve
  space for. GramFrame's "blank below the file's start" has no precedent here either way.
- **A4** — SDRangel is the only live-radio member with real scrollback, and it is opt-in
  and *costed*: enabling it displays "the amount of RAM required and total time duration"
  [W20]. A good model for being honest about a long recording's memory cost.
- **A4 (fldigi)** — The near-miss is instructive: fldigi keeps ~2 minutes of *audio*
  history that Ctrl-left-click on the waterfall replays and re-decodes [W17, W18]. The
  operator wants to go back; the display cannot, so the tool gives them the audio instead.
- **A5** — WebSDR splits the control the way GramFrame should consider: **Speed** (super
  slow … fast) and **Size** (50 … 600 px) are separate [W26]. `window-seconds` conflates
  scroll rate and visible span into one number.
- **A6** — No precedent draws a "now" marker, because the edge *is* now. GramFrame's
  playhead-at-top-edge inherits this for free; a drawn playhead line would be an invention.
- **B1/B3** — PAMGuard shows what transport looks like when the medium allows it, and it
  is *scroller-first*: the play button "will cause the scroll bar to advance
  automatically" [W29]. The scrub bar is the primary object and play is a way of moving
  it — arguably a better mental model for a trainer than a media transport bolted on.
- **B4** — In all five live precedents the horizontal gesture on the raster is spent on
  **frequency** (OpenWebRX `canvas_mouseup` → `set_offset_frequency` [W3]; WebSDR "click
  and drag on the waterfall to tune" [W26]; fldigi left-click positions the decode marker
  [W17]). FR-020's "click the *time axis* to seek" is therefore the right place for it.
- **B9** — PAMGuard is the only precedent with an explicit, task-motivated pitch
  statement: playback speed proportionally shifts frequency, and that is the *feature* —
  it is how inaudible cetacean clicks are brought into the audible band [W32].
- **C2** — SDRangel gives a publishable algorithm: reference = 10 dB above maximum, floor
  = average of the lowest FFT-size ÷ 32 bins [W19]. An OpenWebRX community post argues
  auto-adjust should be the default, implying shipped colour defaults leave newcomers with
  an unreadable display [W39].
- **C4** — KiwiSDR is the only one that draws a real colour key: a 16-px canvas sweeping
  −140 to −20 dBm through the current colormap with ticks at the min/max sliders [W13].
- **C5** — KiwiSDR's dB tooltip is a trap worth recording: `dB = ((h − clientY)/h) ×
  full_scale + mindb` [W11] — it reports where the *cursor* sits on the dB axis, not the
  signal value at that bin. It looks like a data readout and is a ruler. SDRangel's `Cur:`
  field is the genuine article and it is **off by default** [W19].
- **C6** — SDRangel's `x−μ dB` and `x−μ+∧μ dB` modes subtract a moving average and
  optionally add the mean back so the display does not collapse to zero [W25]: the
  background subtraction a LOFARgram operator wants, in a form GramFrame could implement
  over a retained magnitude grid.
- **D2** — SDRangel's "time zooming" is not a zoom: scrolling in the time scale changes
  the FFT *overlap*, i.e. re-analyses at a different row rate [W23]. Nobody in this family
  magnifies painted history in time. GramFrame, holding the whole grid, can.
- **D3/D4** — Every live precedent pans and zooms *while running*; OpenWebRX switches the
  cursor to `move` mid-drag with the stream still arriving [W3]. FR-013's inertness is the
  single largest divergence from this family.
- **D5** — PAMGuard's Data Map auto-loads in Viewer mode "to aid large dataset navigation"
  [W29] — the family's only true overview, and it exists precisely because the medium is a
  long stored file, which is GramFrame's situation.
- **E1/E4** — Note what the family persists: **frequency**, not (time, frequency).
  OpenWebRX bookmarks are colour-coded by origin [W1]; KiwiSDR persists DX labels [W7].
  Only SDRangel's waterfall markers carry a time coordinate, and only its annotation
  markers round-trip through CSV [W24]. GramFrame's time-anchored annotations lead here.
- **E2** — Zero harmonic/comb cursors across six precedents [W24]. GramFrame's
  differentiator, with no prior art to copy interaction design from.
- **E5** — PAMGuard's Mark Observers are the family's only time-frequency box selection:
  drag and "a red rectangle will appear on the spectrogram display panels" [W30]; Quick
  Annotations turn that into a stored, edge-draggable annotation with time and frequency
  bounds plus computed SNR/SPL [W31]. The closest analogue to a labelled GramFrame marker.
- **F2** — PAMGuard's detector overlays are timed content appearing on the gram at its own
  moment [W30] — machine-generated rather than trainer-authored, but the rendering problem
  is identical to FR-017.
- **F3** — Band-limited listening is universal here and is the family's *core*
  interaction, not a study aid: the passband dragged on the display is what you hear
  [W1, W7, W26]. If GramFrame adds it, it should be a draggable band on the gram.
- **G2** — The collision is worse than FR-021 anticipates: WebSDR spends `j k ← →` on
  frequency [W26]; KiwiSDR spends **space on mute** and `v/V` on volume [W7]. No key means
  "play" in this domain, so GramFrame must borrow the *media* vocabulary and accept that
  it looks foreign to a radio operator, or invent.
- **G3/G4** — Not one `aria-*` attribute in either browser client [W36], and no
  `prefers-reduced-motion` in the family. The nearest motion accommodation is functional:
  KiwiSDR's rate slider includes `off` [W8] and fldigi's speed selector includes `PAUSE`
  [W15] — you can stop the waterfall. Cheap, and worth copying.
- **G5** — WebSDR sets the bar for FR-007/FR-008: three distinct failures, three distinct
  named remedies, in plain prose in the page [W26].
- **H1–H3** — Runtime analysis controls are a *desktop* trait, not a browser one:
  SDRangel exposes FFT size 64–32768, nine windows and an overlap control [W19], while
  both browser receivers take FFT size from the server and give the listener no say
  [W3, W38]. Spec 168's decision to fix analysis at load sits with the browser members.
- **H4** — The deciding contrast. SDRangel stores spectra and dumps them to CSV
  [W20, W22]; PAMGuard re-processes raw audio so the display can re-render [W29];
  OpenWebRX bakes colour into pixels at draw time and cannot repaint history [W3].
  GramFrame currently shares OpenWebRX's failure mode, having already paid for the grid.

### 3.2 Acoustic and bioacoustic analysis tools

This family — Raven Pro (Cornell), Audacity, Sonic Visualiser, PAMGuard, iZotope RX and
Praat — exists to let one person open a recording, look at its time-frequency picture,
listen to it, measure things on it, annotate what they found, and export the result. Five
of the six assume the recording is a file already on disk; PAMGuard is the exception and
is the only member built for data arriving live. That single difference explains most of
the variance below, and it is the axis GramFrame's player sits on: **a WAV that is wholly
available, presented as if it were arriving.**

Four things are common to all six, and all four are argued for in the documentation
rather than merely implemented. **First, the magnitude grid survives the drawing.** Every
tool treats the spectrogram as a retained model plus a separately adjustable display
mapping. Raven states the consequence in the manual: after changing brightness and
contrast "the underlying power values have not changed so all measurement values will be
the same" [A10]. Audacity's cache is invalidated by window type, window size, zero-padding
and algorithm but *not* by Gain or Range [A21]; Sonic Visualiser's `setGain` calls
`invalidateRenderers()` and leaves the FFT model alone [A31]; RX gives the spectrogram
cache a user-set size in MB [A38]. This is a 6/6 row and the sharpest challenge to spec
168, which discards the grid at paint time. **Second, display range is a runtime control
expressed in dB** — Raven's floor/ceiling, Audacity's Gain/Range, SV's Gain/Threshold,
PAMGuard's amplitude limits (defaulting to 50–120 dB), RX's draggable colour-map ruler,
Praat's dynamic range [A6, A15, A25, A32, A38, A41]. **Third, FFT size and window shape
are changeable while looking**, with the reason stated as the time-versus-frequency
trade-off [A11, A15, A42]. **Fourth, a selection is a rectangle in time *and* frequency**,
not a time range [A1, A19, A25, A36, A39].

What varies most is the scroll model, and it is not settled. Raven has a dedicated
**Scrolling Play** button where "the signal view scrolls from right to left beneath the
position marker, like tape moving past the playback head of a tape recorder" [A2]. Sonic
Visualiser makes it a per-pane three-way property — Page, Scroll, or neither — with Page
the default [A26]. Audacity makes it an off-by-default "pinned play head" [A17]. PAMGuard,
the only live tool here, offers "Wrap Display" or "Scroll Display" and **defaults to wrap**
[A32, A33]: the canvas stays still and a write edge sweeps across it, overwriting last
sweep's data. RX and Praat do not scroll at all. So a fixed-now waterfall is an available
mode in four of six and the default in none — evidence that the fixed-now edge is a
*medium* fact of live receivers rather than an analyst preference.

The second big variance is what happens during playback. **None of the six forbids
interaction while playing.** Raven's answer is the most instructive design: dragging the
scroll thumb during scrolling playback stops the sound and "resumes immediately at the new
time position when you release" [A3] — a pan is converted into a seek rather than blocked.
SV goes further and lets you drag the overview strip "to scroll all of the panes without
moving the playback position" [A29]. FR-013 has no precedent in this family.

Distinguish convention from habit carefully. **Domain conventions** (a task reason is
given, twice or more): band-limited listening — Raven's filtered play exists "to listen to
only the higher harmonics of a sound… or to listen only to a low-frequency animal call and
not the high-frequency call recorded at the same time" [A1], RX's Play Selection Only is
"useful for isolating intermittent noises" [A39]; display-range control, because "it's hard
to pick the signal out of the background" [A6]; window length, because broad-band and
narrow-band answer different questions [A42]; retaining magnitudes, because measurements
must stay comparable across display settings [A10]. **Tool habits**, by contrast: the whole
file visible at once; the modal *Configure* dialog; the whole file resident in memory. That
last is demonstrably a habit and not a requirement — Raven had to bolt on paged sound
windows "for working with sounds that are too large to fit in the memory available" [A13],
and RX ships "Reduce Quality Above" plus a cache cap [A38]. A browser component with a
pre-rendered tall PNG is not obliged to inherit any of it. Another habit worth refusing:
the pointer readout living in a status bar at the bottom of a large desktop window [A9,
A40]. In a 900 × 400 embedded component it has to be inside the frame.

**Strongest lesson:** keep the dB grid, or at least keep a re-runnable mapping. Six of six
do, one of them says in the manual exactly why, and the SVG-filter workaround measured in
probe (b) cannot recover detail already clipped by the 5th-percentile stretch. Name the
range in dB and put the key on screen — RX's colour-map ruler, where the legend *is* the
control, is the best pattern in the family.

**Strongest trap:** auto-ranging that changes as you scroll. Praat documents this against
itself — autoscaling to the visible maximum "ensures that the window will always look well,
but it also means that the blackness of a certain part of the spectrogram will change as
you scroll" [A41]. For a trainee being taught to judge a contact's strength, a display
whose brightness depends on what happens to be on screen teaches the wrong reflex.
GramFrame's whole-file percentile stretch is, by luck, on the right side of this. Do not
"improve" it into visible-area normalisation. A related trap is Raven's own clipping-level
warning [A10]: a display control and an analysis control that look alike but differ in
reversibility must be labelled apart.

#### Family A scores

| id | row | Raven Pro 1.4 | Audacity 3.x | Sonic Vis. 3.2/5 | PAMGuard 2.x | iZotope RX 8–11 | Praat 6.x |
|---|---|---|---|---|---|---|---|
| A1 | fixed "now" edge | ✓ [A2] | ◐ [A17] | ◐ [A26] | ◐ [A32,A33] | ✗ [A39] | ✗ [A43] |
| A2 | continuous, not paged | ✓ [A2] | ◐ [A17] | ◐ [A26] | ◐ [A33] | ✗ [A39] | ✗ [A43] |
| A3 | unacquired region blank | — | — | — | ◐ [A32,A33] | — | — |
| A4 | scrollback reachable | ✓ [A13] | ✓ [A17] | ✓ [A29] | ✓ [A35] | ✓ [A38] | ✓ [A42] |
| A5 | span adjustable at runtime | ✓ [A12] | ✓ [A16] | ✓ [A25] | ✓ [A32,A34,A35] | ✓ [A38] | ✓ [A42] |
| A6 | playhead marker | ✓ [A2] | ✓ [A17] | ✓ [A26] | ? | ✓ [A39] | ? |
| B1 | play / pause | ✓ [A2,A12] | ✓ [A22] | ✓ [A29] | ✓ [A35] | ✓ [A39] | ? |
| B2 | volume and mute | ◐ [A14] | ✓ [A24] | ? | ? | ? | ? |
| B3 | scrub bar | ◐ [A3] | ◐ [A17] | ◐ [A29] | ◐ [A35] | ◐ [A38,A39] | ? |
| B4 | seek by clicking display/axis | ✓ [A12] | ✓ [A17] | ✓ [A29] | ◐ [A35] | ✓ [A39] | ◐ [A43] |
| B5 | restart | ? | ✓ [A22] | ✓ [A29] | ? | ✓ [A39] | ? |
| B6 | loop whole item | ✓ [A4] | ✓ [A22] | ✓ [A27] | ? | ✓ [A39] | ? |
| B7 | rate control | ✓ [A5] | ✓ [A18] | ✓ [A27] | ✓ [A35] | ? | ? |
| B8 | rate beyond 0.5×–2× | ◐ [A5] | ? | ✓ [A27] | ? | — | — |
| B9 | pitch documented | ✓ [A5] | ✓ [A18] | ✓ [A27] | ? | — | — |
| C1 | runtime floor/ceiling | ✓ [A6] | ✓ [A15] | ✓ [A25] | ✓ [A32,A34] | ✓ [A38] | ✓ [A41] |
| C2 | automatic ranging | ✗ [A6] | ✗ [A15] | ✓ [A25] | ✗ [A32] | ? | ✓ [A41] |
| C3 | colour map at runtime | ✓ [A7] | ◐ [A15] | ✓ [A25] | ✓ [A32] | ✓ [A38] | ◐ [A41] |
| C4 | colour key / legend | ✓ [A8] | ✗ [A16] | ✗ [A25] | ✓ [A32] | ✓ [A38] | ✗ [A41] |
| C5 | dB readout at cursor | ✓ [A9] | ✗ [A16] | ✓ [A30] | ? | ✓ [A40] | ? |
| C6 | per-row/band normalisation | ✗ [A6] | ◐ [A15] | ✓ [A25] | ✗ [A32] | ? | ✓ [A41] |
| D1 | frequency zoom | ✓ [A12] | ✓ [A16] | ✓ [A25] | ◐ [A34] | ✓ [A38] | ✓ [A42] |
| D2 | time zoom | ✓ [A12] | ✓ [A17] | ✓ [A29] | ◐ [A34,A35] | ✓ [A38] | ✓ [A42] |
| D3 | pan while playing | ◐ [A3] | ◐ [A17] | ✓ [A29] | ✓ [A35] | ✓ [A39] | ? |
| D4 | zoom while playing | ? | ? | ? | ✓ [A34] | ? | ? |
| D5 | overview strip | ✗ [A13] | ✗ [A17] | ✓ [A29] | ✓ [A35] | ✓ [A38] | ? |
| E1 | persistent markers | ✓ [A14] | ✓ [A23] | ✓ [A29] | ✓ [A36] | ? | ? |
| E2 | harmonic cursor | ✗ [A14] | ✗ [A15] | ✓ [A28] | ✗ [A36] | ? | ✗ [A42] |
| E3 | (t, f) readout at pointer | ✓ [A9] | ◐ [A16,A19] | ✓ [A30] | ? | ✓ [A40] | ◐ [A43] |
| E4 | annotations persist | ✓ [A14] | ✓ [A23] | ✓ [A29] | ✓ [A36] | ? | ? |
| E5 | region selection (box) | ✓ [A1] | ✓ [A19] | ✓ [A29] | ✓ [A36] | ✓ [A39] | ◐ [A43] |
| E6 | export | ✓ [A14] | ✓ [A20] | ✓ [A29] | ◐ [A36] | ? | ? |
| F1 | A–B loop | ✓ [A4] | ✓ [A17,A22] | ✓ [A27] | ? | ✓ [A39] | ? |
| F2 | timed overlays | ✗ [A14] | ✗ [A23] | ◐ [A29] | ◐ [A36] | ✗ [A38] | ✗ [A43] |
| F3 | band-limited listening | ✓ [A1] | ✗ [A19] | ✗ [A27] | ? | ✓ [A39] | ✗ [A41] |
| F4 | bookmarks / jump-to-time | ✓ [A13] | ◐ [A23] | ✓ [A29] | ✓ [A37] | ? | ? |
| F5 | spectrum strip | ✓ [A11] | ◐ [A20] | ? | ◐ [A32] | ◐ [A38] | ✗ [A42] |
| G1 | keyboard transport | ✓ [A12] | ✓ [A22] | ✓ [A29] | ? | ✓ [A39] | ? |
| G2 | recognised key scheme | ✗ [A12] | ✓ [A22] | ✓ [A29] | ? | ◐ [A39] | ? |
| G3 | live region / announcement | — | — | — | — | — | — |
| G4 | reduced motion | ✗ [A2] | ◐ [A17] | ◐ [A26] | ◐ [A33] | ✗ [A39] | — |
| G5 | explained failure on oversize | ✓ [A13] | ? | ? | ? | ✓ [A38] | ? |
| H1 | FFT size at runtime | ✓ [A11] | ✓ [A15] | ✓ [A25] | ◐ [A34] | ✓ [A38] | ✓ [A42] |
| H2 | window selectable | ✓ [A11] | ✓ [A15] | ◐ [A25] | ◐ [A34] | ✓ [A38] | ✓ [A41] |
| H3 | overlap / hop at runtime | ✓ [A11] | ✗ [A15] | ✓ [A25] | ◐ [A34] | ✓ [A38] | ✓ [A41] |
| H4 | magnitudes retained | ✓ [A10] | ✓ [A21] | ✓ [A31] | ✓ [A34] | ✓ [A38] | ✓ [A41,A42] |

#### Family A notes

- **A1** — Only Raven names the fixed-now waterfall as a first-class transport mode (a
  separate *Scrolling Play* button beside *Play*), and its metaphor is explicitly a tape
  recorder [A2]. Everywhere else it is a display preference the analyst may never find.
- **A2** — PAMGuard is the load-bearing counter-example: the only live tool in the family
  defaults to **wrap**, not scroll [A32]. `DirectDrawProjector` carries the wrap-around
  coordinate arithmetic. Wrap is cheaper; scroll is nicer. Spec 168 already pays the scroll
  cost via a tall image and a clip, so this argues *for* the current design — but it kills
  any claim that continuous scroll is a domain requirement.
- **A3** — Scored — for the five file-based tools: there is no unacquired future when the
  file is on disk. PAMGuard's live mode is the only real test and it scores ◐ because in
  wrap mode the region "ahead" of the write edge shows the **previous sweep's data**, not
  blank. A real waterfall does not go blank ahead of now — it shows stale data. Blank below
  the playhead is defensible as a teaching device, but it is not what the tools do.
- **A6** — PAMGuard is `?` deliberately: the wrap logic implies a write edge, but no help
  page or parameter names a drawn "now" line, and that should not be asserted from code
  shape alone.
- **B2** — Raven's volume control opens the *operating system's* mixer dialog [A14]. This
  whole family delegates output level to the OS. A browser component cannot, which is why
  GramFrame's in-component volume/mute is a media-player borrowing — and none the worse.
- **B3** — Not one of the six has a media-player seek slider. In every case the time axis or
  the scrollbar *is* the seek control. The `range` input is a media-player import; it costs
  little, but the click-to-seek on the time axis is the part with precedent [A12, A17, A39].
- **B7–B9** — The most useful contested rows. Raven and Audacity both **resample**: "Slowing
  down the rate makes the sound lower in pitch and slower" [A5]; Play-at-Speed is "also
  affecting pitch" [A18]. Sonic Visualiser time-stretches: 0.1×–10× "without affecting its
  pitch, although the sound quality will suffer" [A27]. The family is 2:1 for pitch moving
  with rate — the opposite of the browser default probe (a) measured.
- **B8** — Raven's rate is a free-typed number with no documented bound [A5]; SV's dial is a
  documented 0.1×–10× [A27]. Both are far wider than 0.5 / 1 / 1.5 / 2. Slow playback is how
  you hear structure in a tonal, and the browser accepts 0.0625–16 (probe (a)), so the
  narrow list is a UI choice with no precedent behind it.
- **C1** — Universal, and the only universal *control* row in the family. Note the units:
  everyone speaks dB. PAMGuard's default window is literally 50–120 dB [A32]. GramFrame has
  no user-facing dB anywhere.
- **C2** — Split, and the split is informative. SV and Praat auto-range to the visible area;
  Raven, Audacity and PAMGuard do not. Praat documents the cost of its own default [A41].
  GramFrame's whole-file percentile stretch is the third position — automatic but *fixed for
  the file* — and is arguably the best of the three for training.
- **C4** — RX's Color Map Ruler is the pattern worth stealing: the key and the control are
  one widget — "Click and drag the map to change the range and use the scroll wheel to make
  the range larger or smaller" [A38]. Audacity draws no key at all and is reduced to
  describing the colour bands in prose in the manual [A16] — a failure mode to avoid.
- **C5** — Sonic Visualiser's hover text is exactly the readout GramFrame lacks: `Time:` /
  `Bin Frequency: … Hz` / `Bin Pitch:` / `dB: …` / `Phase:` [A30]. It is cheap only because
  the FFT model is still there — C5 and H4 are the same decision.
- **C6** — "Per-row" in a vertical-time waterfall equals SV's "Normalize Columns" and Praat's
  dynamic compression. Praat's partial factor is the sophisticated version: at 0.4, a
  spectrum peaking 60 dB below the global maximum is raised 24 dB [A41] — a blended
  background subtraction, not a hard AGC. That is the shape a split-window normaliser takes.
- **D3** — The single most transferable design in the family: Raven does not block panning
  during playback, it *reinterprets* it — "The sound stops playing while you drag the scroll
  thumb and resumes immediately at the new time position when you release" [A3]. FR-013
  blocks; Raven seeks. SV's alternative — pan the overview strip without moving the playback
  position [A29] — is the other credible answer.
- **D5** — Three of six have an overview strip and the two that lack one both hurt for it
  (Raven substitutes paging; Audacity substitutes nothing). For a 900 × 400 component showing
  10 s of a 3-minute file, an overview is arguably more valuable than in any of these.
- **E2** — GramFrame is *ahead* of this family. Only Sonic Visualiser has a harmonic cursor,
  and it is transient (attached to the measure tool, following the mouse) rather than a
  placeable, persistent, draggable pin set [A28]. Nothing here does sidebands at all.
- **E3** — Audacity is scored ◐ honestly: the frequency comes from the vertical ruler and the
  Spectral Selection toolbar *after* a selection [A19]; there is no live pointer readout.
  Praat's is a click, not a hover [A43].
- **F1** — Four clear ✓ with different scopes: Raven loops "a sound window or selection"
  [A4], Audacity has a draggable loop *region* on the timeline [A17], RX loops "the selected
  audio" [A39]. A–B loop is region-scoped everywhere it exists — never a whole-file-only
  toggle like the player's.
- **F3** — The row that most rewards attention. Raven's filtered play gives the task reason
  in full [A1], and RX's gives a second one [A39]. Both draw the band from an existing
  time-frequency selection rather than from a separate control — the selection *is* the
  filter. GramFrame has no region selection to hang this on, so F3 is downstream of E5.
- **F5** — Raven's spectrogram-slice view is linked to the spectrogram (same parameters,
  optionally unlinked) [A11] — a live strip, not Audacity's modal Plot Spectrum dialog [A20].
  If GramFrame ever adds one, link it.
- **G2** — Raven fails this row outright: Play is `Ctrl+Shift+P` with no space bar [A12]. RX
  uses Space for play but `Enter` for rewind [A39]. Audacity and SV are the conformists
  (Space, Home/End). GramFrame's Space/J/L/K/Home/M is closer to media convention than most
  of this family, which is fine — the family's keys are historical accidents.
- **G4** — No tool here has a reduced-motion setting, but four have a *scroll-off* setting
  for other reasons — SV's "neither" [A26], Audacity's "Scroll view to playhead" disable
  [A17], PAMGuard's wrap-vs-scroll [A33]. Scored ◐ because the accommodation exists in
  effect; the intent was CPU and workflow, not vestibular comfort.
- **G5** — Two documented oversize strategies, both *degrade* rather than refuse: Raven pages
  a file too large for memory [A13]; RX has "Reduce Quality Above" plus a cache cap [A38].
  GramFrame refuses above 32,768 × 4,096. Refusal is legitimate for a training component, but
  no tool in this family chose it.
- **H3** — Audacity is the outlier with no overlap control at all [A15] — and Audacity is
  also the tool whose spectrogram is most often criticised for time smearing. Raven goes
  furthest: hop or overlap, in samples/seconds/milliseconds, with a lock on either, and a
  warning that negative overlap "can give an extremely mis-leading picture of a signal" [A11].
- **H4** — 6/6, and the only row with both a manual statement of *why* [A10] and independent
  source proof in two codebases [A21, A31].

### 3.3 Web media players

This is the family GramFrame's transport bar visibly resembles, and the family with the
least to say about *why*. Six precedents were read: Chromium's built-in `<audio>`/`<video>`
controls (source), YouTube (help pages), video.js 8, Plyr 3, wavesurfer.js 7 with its
official plugins, and Media Chrome (source and docs).

**What is genuinely conventional.** Only four things. (1) Play/pause on `Space` **and** `K`,
and mute on `M` — YouTube, video.js, Plyr and Media Chrome all agree, and Chromium agrees on
`Space` alone [M1, M9, M14, M20, M32]. (2) A single horizontal seek bar drawing the **whole**
duration, with the buffered part shaded and the rest an empty groove [M4, M17, M34]. (3)
Digit keys `0`–`9` seeking to 0–90 % [M9, M15, M20]. (4) `Home` = start, `End` = end, in
every player that binds them at all [M2, M9, M15]. That is the whole of the agreement.

**What is one vendor's habit.** Nearly everything else. Arrow-key seek: Chromium moves **1 %
of the duration** (its timeline is `<input type=range step="any">`, so the browser's generic
range handler applies) [M2]; YouTube 5 s; Plyr 10 s; video.js 5 s with PageUp/Down at 60 s;
Media Chrome 10 s [M9, M15, M21, M32]. Seek amount is not a convention, it is five different
numbers. `J`/`L`: absent from Chromium and Plyr entirely, ±10 s in YouTube and Media Chrome,
absent from video.js's default hotkeys [M1, M14, M20, M32]. Worse, **Plyr binds `L` to toggle
loop** [M20] — the same key YouTube uses to seek forward. GramFrame's `J`/`L` = ∓/± 5 s sits
inside this disagreement, not on top of a settled convention.

**Where J/K/L actually comes from.** Not the web. It is the tape-and-NLE *shuttle*: Avid
documents J-K-L as "three-button play or variable-speed play", `L` forward with repeated
presses stepping 2×/3×/4×, `J` backward at the same increments, `K` stop, `K+L` quarter
speed, `K`-held plus a tap for frame step — and it gives a task reason, "greater control"
over playback speed [M13]. YouTube kept the letters and threw away the meaning: `J`/`L`
became a fixed 10 s skip with no shuttle at all. A player that binds `J`/`L` to a fixed skip
is following *YouTube*, not the editing convention its keys allude to. Worth knowing before
treating the mapping as inherited authority.

**The speed menu is a tool convention with no task reason behind it.** No source in this
family gives a reason why any particular rate ladder exists, and the ladders prove the point:
Chromium 0.25/0.5/0.75/1/1.25/1.5/1.75/2 [M7]; YouTube the same eight plus a 0.05-step custom
slider still capped at 0.25–2 [M11]; Plyr `[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 4]` [M19]; Media
Chrome `[1, 1.2, 1.5, 1.7, 2]` — no slow rates at all [M33]; video.js an empty list, the
button hidden unless the author fills it [M36]. Five players, five ladders, one shared
purpose: *get through the content faster*. A sonar trainee's reason for slowing a recording is
the opposite — resolve a beat rate, hear a transient — and nothing here speaks to it.
GramFrame's 0.5/1/1.5/2 should be judged on cost and clarity alone; this family cannot be
cited to justify widening it.

**The pitch question the family answers by accident.** `preservesPitch` defaults to `true`
everywhere [M8], so every player in this list is *pitch-preserving* by default, and spec 168's
Assumption 3 ("rate change may alter pitch") describes behaviour no browser gives. Only
wavesurfer exposes the choice, as an optional second argument to `setPlaybackRate(rate,
preservePitch)` [M23] — the single most directly useful API shape in the family.

**wavesurfer is the outlier, in both directions.** Its record plugin is a real waterfall: a
fixed `scrollingWaveformWindow` (default 5 s), newest sample written at the last index, older
samples shifted off the end, and `interact = false` while recording [M25] — an independent
arrival at exactly GramFrame's `window-seconds` + FR-013 design. Its spectrogram plugin is the
only place in the family with genuine *analyst* controls and the only place with stated task
reasons, and they are borrowed from Audacity and Praat rather than invented: `gainDB`/`rangeDB`
"for small signals where the display is mostly blue… increase this value to see brighter colors
and give more detail", `preEmphasis` "so formants above 1 kHz stay visible", `autoGain` as
Praat-style autoscaling [M26, M27]. But its playhead convention is the opposite of ours —
`autoCenter: true` holds the cursor at the **middle** of the viewport, not an edge [M23, M24] —
and it has, in its entire `src/`, zero `aria-` attributes and zero keydown handlers [M31]. It
is an analysis engine wearing no interface.

**Accessibility, honestly.** This family is a poor teacher. Chromium conveys play state only by
flipping the play button's `aria-label`, with no live region anywhere in the media controls
[M5, M6]. Plyr and Media Chrome have `aria-pressed`/`aria-valuetext` and one `role="status"` on
a loading spinner [M35]. Only video.js does the thing the checklist asks for: every control's
hidden `vjs-control-text` span is created with `aria-live="polite"` and the comment "let the
screen reader user know that the text of the element may change" [M18] — the only explicit
accessibility *reason* found anywhere in the family, and a cheap pattern to copy.
`prefers-reduced-motion` is essentially unhandled: absent from video.js, wavesurfer and Media
Chrome, and present in Plyr only to skip a settings-menu resize animation [M18, M22]. For a
component whose whole picture scrolls continuously, there is no precedent here to lean on.

**Weight to give this family.** Adopt the four agreed keys and the buffered/marker seek-bar
affordances, because they are cheap and familiar. Treat the rate ladder, the seek increments
and `J`/`L` as tool habits — adopt on cost grounds, never cite as justification. Take the pitch
finding and video.js's live-region pattern as concrete corrections. Take wavesurfer's
spectrogram options as a *pointer to Audacity and Praat*, which is where those reasons actually
come from, rather than as a media-player precedent at all.

#### Family M scores

Columns: **CN** Chromium native controls · **YT** YouTube web player · **VJS** video.js 8 ·
**PLY** Plyr 3 · **WS** wavesurfer.js 7 + official plugins · **MC** Media Chrome. For the five
transport players, A-rows are scored against the **seek bar**, the only time-carrying display
they have.

| id | row | CN | YT | VJS | PLY | WS | MC |
|---|---|---|---|---|---|---|---|
| A1 | fixed "now" edge | ◐ [M3] | ✗ | ◐ [M15] | ✗ | ✓ [M25] | ? |
| A2 | continuous scroll | ◐ [M3] | ✗ | ◐ [M15] | ✗ | ✓ [M24] | ? |
| A3 | unacquired region blank | ✓ [M4] | ✓ [M9] | ✓ [M17] | ✓ [M19] | ✓ [M25] | ✓ [M34] |
| A4 | scrollback | ✓ [M2] | ✓ [M9] | ✓ [M15] | ✓ [M20] | ✓ [M23] | ✓ [M32] |
| A5 | span adjustable | ✗ | ✗ | ✗ | ✗ | ✓ [M23,M25] | ✗ |
| A6 | playhead marker | ✓ [M2] | ✓ [M9] | ✓ [M17] | ✓ [M19] | ✓ [M23] | ✓ [M34] |
| B1 | play / pause | ✓ [M1] | ✓ [M9] | ✓ [M14] | ✓ [M20] | ✓ [M23] | ✓ [M32] |
| B2 | volume and mute | ✓ [M1] | ✓ [M9] | ✓ [M16] | ✓ [M20] | ◐ [M23] | ✓ [M32] |
| B3 | scrub bar | ✓ [M2] | ✓ [M9] | ✓ [M15] | ✓ [M19] | ✓ [M23] | ✓ [M34] |
| B4 | seek by clicking display | ◐ [M1] | ◐ [M9] | ◐ [M15] | ◐ [M19] | ✓ [M23] | ◐ [M34] |
| B5 | restart | ◐ [M2] | ◐ [M9] | ◐ [M15] | ◐ [M20] | ◐ [M23] | ✗ |
| B6 | loop whole item | ✗ | ✓ [M10] | ✗ | ✓ [M20] | ◐ [M29] | ✓ [M35] |
| B7 | rate control | ✓ [M7] | ✓ [M11] | ◐ [M36] | ✓ [M19] | ◐ [M23] | ✓ [M33] |
| B8 | rate beyond 0.5×–2× | ◐ [M7] | ◐ [M11] | ◐ [M36] | ✓ [M19] | ◐ [M23] | ✗ [M33] |
| B9 | pitch documented | ◐ [M8] | ◐ [M8] | ✗ | ✗ | ✓ [M23] | ✗ |
| C1 | runtime floor/ceiling | — | — | — | — | ◐ [M26,M27] | — |
| C2 | automatic ranging | — | — | — | — | ✓ [M26] | — |
| C3 | colour map at runtime | — | — | — | — | ◐ [M26] | — |
| C4 | colour key | — | — | — | — | ✗ | — |
| C5 | dB readout | — | — | — | — | ✗ [M28] | — |
| C6 | per-band normalisation | — | — | — | — | ◐ [M26,M27] | — |
| D1 | frequency zoom | — | — | — | — | ◐ [M26] | — |
| D2 | time zoom | ✗ | ✗ | ✗ | ✗ | ✓ [M23,M30] | ✗ |
| D3 | pan while playing | — | — | — | — | ✓ [M24] | — |
| D4 | zoom while playing | — | — | — | — | ✓ [M30] | — |
| D5 | overview strip | ✗ | ◐ [M12] | ✗ | ✗ | ✓ [M30] | ✗ |
| E1 | persistent markers | ✗ | ◐ [M12] | ✗ | ✓ [M19] | ✓ [M29] | ◐ [M34] |
| E2 | harmonic cursor | — | — | — | — | ✗ | — |
| E3 | (t, f) readout at pointer | ✗ | ? | ◐ [M17] | ◐ [M19] | ◐ [M30] | ◐ [M34] |
| E4 | annotations persist | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| E5 | region selection | ✗ | ✗ | ✗ | ✗ | ✓ [M29] | ✗ |
| E6 | export | ✗ | ✗ | ✗ | ◐ [M19] | ✓ [M23,M26] | ✗ |
| F1 | A–B loop | ✗ | ◐ [M12] | ✗ | ✗ [M21] | ✓ [M29] | ✗ |
| F2 | timed overlays | ◐ | ◐ | ✓ [M18] | ◐ [M19] | ◐ [M29] | ◐ [M32] |
| F3 | band-limited listening | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| F4 | bookmarks / jump-to-time | ✗ | ✓ [M12] | ✓ [M36] | ◐ [M19] | ✓ [M29] | ✓ [M34] |
| F5 | spectrum strip | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| G1 | keyboard transport | ✓ [M1] | ✓ [M9] | ◐ [M14] | ✓ [M20] | ✗ [M31] | ✓ [M32] |
| G2 | recognised key scheme | ◐ [M1,M2] | ✓ [M9] | ◐ [M14,M15] | ◐ [M20] | ✗ [M31] | ✓ [M32] |
| G3 | live region / announcement | ◐ [M5,M6] | ? | ✓ [M18] | ◐ [M19] | ✗ [M31] | ◐ [M35] |
| G4 | reduced motion | ? | ? | ✗ [M18] | ◐ [M22] | ✗ [M22] | ✗ [M22] |
| G5 | explained failure | ? | ? | ? | ? | ✓ [M26] | ? |
| H1 | FFT size at runtime | — | — | — | — | ◐ [M26] | — |
| H2 | window selectable | — | — | — | — | ✓ [M26] | — |
| H3 | overlap at runtime | — | — | — | — | ◐ [M26] | — |
| H4 | magnitudes retained | — | — | — | — | ✓ [M26] | — |

`—` on C, D1/D3/D4, E2, F3, F5 and H rows means the precedent has no spectrogram and no
frequency axis. `?` reasons: **A1/A2 MC** — Media Chrome's live/stream-type behaviour is on a
page not read in the time box. **E3 YT** — no hover time/thumbnail readout is described on the
help pages read, and the live player could not be probed. **G3 YT** — the player source is
obfuscated and no accessibility statement covering live regions was found. **G4 CN/YT/MC** — the
`prefers-reduced-motion` search covered video.js, Plyr, wavesurfer and Media Chrome only.
**G5 CN/YT/VJS/PLY/MC** — error-display code and docs were not read inside the box.

#### Family M notes

- **A1** — Only wavesurfer's *record* plugin puts "now" at a fixed edge, shifting older samples
  off the far end [M25]. Chromium and video.js do it too, but only for **live** media: Chromium
  sets the timeline's `max` to "expected media time now" [M3], and video.js's seek bar
  substitutes `liveTracker.liveCurrentTime()` for the duration [M15]. For recorded media nobody
  in this family scrolls anything — the picture is static and the playhead moves. **GramFrame's
  model is a live-display model applied to a recorded file**, and the family confirms that is
  unusual, not that it is wrong.
- **A2** — wavesurfer's `autoCenter` scroll is deliberately smoothed: below 600 px/s it advances
  at most `SMOOTH_SCROLL_MAX_DELTA = 10` px per frame rather than jumping to the exact centre
  [M24]. Somebody hit visible judder and fixed it with a per-frame clamp; worth remembering if
  the follow loop ever stutters.
- **A3** — Read literally every player scores ✓: the seek bar always draws the full duration with
  the unplayed part as an empty groove. The substantive point is the opposite of the score —
  **no player in this family hides the future.** FR-011/016/018 has no support here at all.
- **A5** — `window-seconds` has exactly one analogue in the family: `scrollingWaveformWindow`,
  default 5 s, in wavesurfer's record plugin [M25]. A constructor option there too, not a runtime
  control, and no task reason is given for the value.
- **B4** — The sharpest divide. In the five transport players the picture is inert (clicking it
  toggles play) and seeking lives in a separate widget. In wavesurfer the **waveform itself is
  the seek surface** (`interact: true` by default; `dragToSeek` off) [M23]. GramFrame's
  click-on-the-time-axis sits between the two, closer to wavesurfer's instinct.
- **B5** — Nobody ships a **restart button**. Restart is `Home` (Chromium, YouTube, video.js),
  `0` (YouTube, Plyr, video.js), or an API call (wavesurfer). GramFrame's dedicated restart
  button is a divergence — defensible for a trainee audience, but ours, not inherited.
- **B6** — Whole-item loop is a right-click item on YouTube [M10], an `L` press plus a config flag
  in Plyr [M20], a shipped component in Media Chrome [M35], and absent from Chromium's and
  video.js's default controls. GramFrame's visible loop toggle is on the generous side.
- **B7/B8** — Two facts worth carrying: Plyr is the only one shipping a rate above 2 (`4`) [M19],
  and Media Chrome ships **no rate below 1** [M33]. Chromium's *menu* stops at 0.25–2 but its
  *element* accepts 0.0625–16 (probe (a)), so the menu is a UI choice, not a platform limit.
- **B9** — `preservesPitch` defaults to `true` and has been Baseline since December 2023 [M8].
  Only wavesurfer surfaces the choice, as `setPlaybackRate(rate, preservePitch?)` [M23]. If pitch
  is ever wanted to follow rate — a 50 Hz shaft line moving to 100 Hz at 2× — it must be set
  explicitly; "browser default" gives the opposite.
- **C1/C2** — wavesurfer's `gainDB` (20) and `rangeDB` (80) are lifted from Audacity's spectrogram
  settings, and `autoGain` is Praat's autoscaling [M26]. Scored ◐ for C1 because they are
  construction-time options with no runtime control. GramFrame's fixed 5th–99.9th percentile
  stretch is a cruder version of `autoGain`.
- **C3** — `colorMap` accepts `gray`, `igray`, `roseus` or a 256-entry RGBA array [M26] — the same
  shape as GramFrame's own LUT, so a configurable map would be a small change if wanted.
- **C5/E3** — The wavesurfer spectrogram plugin's only pointer event is `click: [relativeX]`
  [M28]. There is **no dB readout and no frequency readout under the cursor anywhere in this
  family**. GramFrame's live hover readout is already ahead of every web media player surveyed.
- **C6** — `preEmphasis` (Praat-style, dB per octave, 0 dB at 1 kHz) is a per-band tilt, not
  background subtraction, hence ◐ [M26, M27].
- **D2/D4** — wavesurfer zooms with `zoom(minPxPerSec)` and a wheel-driven `ZoomPlugin` [M23,
  M30], and nothing in the zoom plugin guards against zooming while playing. Combined with
  `autoScroll`, this is the closest thing to spec 168's flagged "frequency zoom while playing"
  enhancement — and wavesurfer simply allows it.
- **D3** — wavesurfer lets the user scroll while playing, but `renderProgress` calls
  `scrollIntoView` on the next tick and drags the view back [M24]. There is a guard for the *drag*
  case only: while `isDragging`, the view nudges by a 30 px `minGap` at the viewport edge instead
  of recentring [M24]. The family's only answer to "what happens when the user navigates while
  playing", and a partial one — a known source of fighting between user and autoscroll.
- **D5** — wavesurfer's MinimapPlugin is a second, tiny wavesurfer instance used purely for
  orientation [M30]. YouTube's chapter segmentation of the seek bar is the nearest thing elsewhere.
- **E1** — Plyr's `markers.points` are `{time, label}` objects drawn on the progress bar, surfaced
  in the seek tooltip when the hovered second matches [M19]. Author configuration, not user
  annotations — as are YouTube's chapters and Media Chrome's VTT chapter segments [M12, M34].
- **E4** — **Zero** in the whole family. Nothing here persists a user-placed marker. Plyr's
  `storage` option persists user *preferences*, not annotations [M19]. GramFrame's persistence has
  no precedent to copy in this family.
- **E5/F1** — wavesurfer's RegionsPlugin is the only region model: drag-created spans with
  start/end, drag/resize, colour and HTML content, and `region.play(true)` calling
  `wavesurfer.play(start, end)` [M29] — a working A–B loop. Plyr *planned* one (`loop: { active:
  false, // start: null, // end: null }` and a `.plyr__progress__loop` selector commented "Used
  later") and never shipped it [M21]. YouTube's chapter loop is A–B constrained to chapters [M12].
- **G1/G2** — video.js's hotkeys are **off unless the author opts in**, and even then bind only
  `f`, `m` and `k`/`Space` [M14]. wavesurfer binds nothing at all [M31]. "Keyboard transport is
  standard" is not quite true even inside this family.
- **G2 (Space)** — The clearest statement of the ambiguity is YouTube's own: "Spacebar: Play/Pause
  when the seek bar is selected. Activate a button if a button has focus" [M9]. video.js says the
  same in code shape [M14, M15]. Media Chrome solves it declaratively with a per-element
  `keysused` opt-out list [M32]. GramFrame binding `Space` at instance level should expect the
  same collision the moment any control inside it takes focus — and it already handles the button
  case explicitly in `keyboardControl.js`. Media Chrome's `keysused` is the cleanest generalisation.
- **G3** — video.js is the model: `aria-live="polite"` on the hidden control text of *every*
  clickable control, with the reason stated in the source comment [M18], plus `aria-valuenow` and
  a localised `aria-valuetext` ("{1} of {2}") on the seek bar [M17]. Chromium does the weaker
  version and has no live region anywhere in its media controls [M5, M6].
- **G4** — Effectively unsolved. Zero matches for `prefers-reduced-motion` in video.js, wavesurfer
  and Media Chrome; Plyr detects it and spends it on a menu animation [M18, M22]. A continuously
  scrolling gram is a far stronger reduced-motion trigger than anything these players draw, so
  there is no shoulder to stand on.
- **G5** — Only wavesurfer's spectrogram plugin documents its failure modes: `validateOptions`
  throws synchronously on a bad `fftSamples`, and a worker timeout falls back to the main thread
  unless `fallbackToMainThread: false`, in which case it emits `error` and skips rendering — with
  the reasoning spelled out ("on long files a main-thread FFT can freeze the page, which is usually
  worse than a missing spectrogram") [M26]. That reasoning applies directly to the 32,768 × 4,096
  refusal.
- **H1–H3** — wavesurfer exposes `fftSamples`, a separate zero-padded `fftSize`, `noverlap`, ten
  window functions with an `alpha`, `frequencyMin`/`Max`, and five frequency scales
  (linear/log/mel/bark/erb) [M26]. All construction-time, hence ◐ on the "at runtime" rows.
  GramFrame's Hann-only analysis is a strict subset — defensible, but the shape of a future
  settings panel is already drawn here.
- **H4** — `getFrequenciesData()` returns the cached `Uint8Array[][]`, `clearCache()` forces
  recomputation, and `frequenciesDataUrl` loads a pre-computed grid [M26]. The grid is retained,
  but at 8-bit quantisation — so it supports re-mapping, not recovery of detail below the
  quantisation floor. **The same limit probe (b) found for an SVG filter over the painted PNG.**

### 3.4 Training, lecture and annotation players

This is the only family in the survey whose players are built around an **author and an
assessor** as well as a viewer, and everything distinctive about it follows from that. The
waterfall families ask "what is happening now?"; this one asks "did the learner see it,
can they find it again, and what did they say about it?" Three capabilities exist here and
nowhere else in the survey: content pinned to a time and revealed *by* the clock (H5P
interactions, Panopto in-video quizzes) [T1, T2]; a per-viewer note or flag stored against
absolute media time and readable by the instructor (Echo360 bookmarks and confusion flags,
Panopto notes, VideoAnt annotations) [T18, T22, T23, T34]; and, at the far end, a full
time-aligned annotation model with a published file format — ELAN's EAF, where every
annotation is two references into a `TIME_ORDER` list of millisecond `TIME_SLOT`s and
*nothing* is ever written into the media [T25, T26]. That last is the closest published
precedent to FR-017, and it agrees with it exactly: annotations live in data coordinates,
in a sidecar, keyed to absolute recording time. GramFrame's storage model is conventional
in the best sense — it matches the one tool in the survey that had to think hardest about it.

**Seek restriction is the two-sided finding, and it does not say what it first appears to
say.** Forced linear viewing is real, widespread and a first-class documented feature: H5P
has `preventSkippingMode` with "Forward" and "Forward and backward" [T2]; Storyline 360's
seekbar has three modes — drag freely, read-only, and "allow drag after completion" [T8,
T9]; Rise 360 has a per-video-block "Allow forward seeking" checkbox [T11]; Panopto ships a
site- and session-level "Disable Seek and Variable Speed Playback" plus a percentage
threshold that *lifts* the restriction once a viewer has watched enough [T15, T16]. The
stated task reason is consistent, and it is about **audit, not comprehension**: "restricted
navigation allows organizations to ensure that users see all content… users may be required
to spend a certain amount of time in the course, which is usually the case with
certification or compliance-based courses" [T10]; a university's advice is to "ensure
students do not skip ahead and actually watch the entire video" [T4]. A *domain* convention
— but the domain is compliance attestation, not measurement or perception.

The second side matters more for spec 168. **Not one of these players hides the unwatched
material.** With Panopto's seek disabled the viewer still sees the full scrub bar, the
duration and the slide thumbnails — only the *click* is refused ("users cannot click on
slides or navigate via the table of contents, though they can view thumbnails") [T16]. With
H5P's prevent-skipping on, a user reports "I still see all the stopping points", and H5P
staff confirm the feature only "disables the video navigation" [T3]. Storyline's read-only
seekbar is still drawn and still shows minutes and seconds [T13]. ELAN — the annotation
tool — paints the entire waveform and the entire spectrogram of the whole file the moment
it opens [T27, T28]. **The family restricts control and preserves orientation; FR-011/016/018
removes both.** No precedent here supports the stronger form. The practice is also actively
disliked where it exists: Absorb's own documentation concedes that a learner who has watched
in full "should also be able to scan through the video to review" [T39], a Panopto
administrator raises the same objection [T16], and practitioner writing calls unskippable
video "designed to maximize seat time rather than efficient learning" [T40]. Two of the
three vendors that lock the seekbar also ship an *expiry* for the lock [T15, T9] — a
mechanism GramFrame's reveal rule has no equivalent of.

Two habits here are *tool*, not domain. Rate ranges cluster at 0.25×–2× (H5P, Storyline) or
0.5×–2× (Panopto) [T7, T14, T17] because that is what the vendors shipped; the published
evidence — Murphy et al. (2022), "minimal costs incurred by increasing video speed from 1x
to 1.5x, or 2x speed, but performance declined beyond 2x" [T37] — happens to bless the
range after the fact rather than having produced it. ELAN alone, and for a stated task
reason (transcribing speech), goes down to **1%** [T30]. Accessibility, by contrast, is a
genuine obligation here rather than an afterthought: Echo360 and H5P claim WCAG 2.2 AA with
published VPATs [T24, T6], Panopto claims 2.1 AA with third-party audit [T21], Articulate
publishes a maturity plan naming ~27 open gaps [T12] — while a university's own statement
rates the deployed Panopto player only "partially compliant" [T20]. Reduced motion is absent
everywhere; the criterion the family actually answers is **WCAG 2.2.2 Pause, Stop, Hide**,
which requires a pause mechanism for auto-starting movement over five seconds [T38] — which
the transport already is.

#### Family T scores

Columns: **IV** H5P Interactive Video · **SL** Articulate Storyline 360 / Rise 360 ·
**PA** Panopto viewer · **EV** Echo360 EchoVideo · **EL** ELAN 6.x · **VA** VideoAnt /
Hypothesis.

| id | row | IV | SL | PA | EV | EL | VA |
|---|---|---|---|---|---|---|---|
| A1 | fixed "now" edge | ✗ [T2] | ✗ [T13] | ✗ [T18] | ✗ [T23] | ◐ [T29] | ✗ [T34] |
| A2 | continuous scroll | — | — | — | — | ◐ [T29] | — |
| A3 | unacquired region blank | ✗ [T3] | ✗ [T13] | ✗ [T16] | ✗ [T22] | ✗ [T27] | ✗ [T34] |
| A4 | scrollback | ◐ [T2] | ◐ [T8] | ◐ [T15] | ✓ [T23] | ✓ [T29] | ✓ [T34] |
| A5 | span adjustable | ✗ [T2] | ✗ [T13] | ✗ [T17] | ✗ [T22] | ✓ [T29] | ✗ [T34] |
| A6 | playhead marker | ✓ [T2] | ✓ [T13] | ✓ [T18] | ✓ [T23] | ✓ [T28] | ✓ [T34] |
| B1 | play / pause | ✓ [T2] | ✓ [T13] | ✓ [T18] | ✓ [T22] | ✓ [T30] | ✓ [T34] |
| B2 | volume and mute | ✓ [T2] | ✓ [T13] | ✓ [T18] | ? | ✓ [T30] | ◐ [T34] |
| B3 | scrub bar | ◐ [T3] | ◐ [T8] | ◐ [T15] | ✓ [T23] | ✓ [T29] | ✓ [T34] |
| B4 | seek by clicking the axis | ✓ [T1] | ✓ [T13] | ✓ [T17] | ✓ [T23] | ✓ [T29] | ✓ [T34] |
| B5 | restart | ◐ [T2] | ✓ [T13] | ◐ [T18] | ◐ [T23] | ✓ [T33] | ◐ [T34] |
| B6 | loop the whole item | ✓ [T2] | ◐ [T13] | ✗ [T17] | ✗ [T22] | ✓ [T30] | ✗ [T34] |
| B7 | rate control | ✓ [T7] | ✓ [T14] | ✓ [T17] | ? | ✓ [T30] | ◐ [T36] |
| B8 | rate beyond 0.5×–2× | ◐ [T7] | ◐ [T14] | ✗ [T17] | ? | ✓ [T30] | ◐ [T36] |
| B9 | pitch documented | ✗ [T7] | ✗ [T14] | ✗ [T17] | ? | ? [T30] | ✗ [T36] |
| C1 | runtime floor/ceiling | — | — | — | — | ✓ [T27] | — |
| C2 | automatic ranging | — | — | — | — | ✓ [T27] | — |
| C3 | colour map selectable | — | — | — | — | ✓ [T27] | — |
| C4 | colour key | — | — | — | — | ✗ [T27] | — |
| C5 | dB readout | — | — | — | — | ✗ [T27] | — |
| C6 | per-band normalisation | — | — | — | — | ◐ [T27] | — |
| D1 | frequency zoom | — | — | — | — | ✓ [T27] | — |
| D2 | time zoom | ✗ [T2] | ✗ [T13] | ✗ [T17] | ✗ [T23] | ✓ [T29] | ✗ [T34] |
| D3 | pan while playing | — | — | — | — | ✓ [T28] | — |
| D4 | zoom while playing | — | — | — | — | ◐ [T27] | — |
| D5 | overview strip | ◐ [T1] | ✗ [T13] | ◐ [T17] | ◐ [T22] | ✓ [T31] | ◐ [T34] |
| E1 | persistent markers | ✓ [T2] | ◐ [T13] | ✓ [T18] | ✓ [T22] | ✓ [T29] | ✓ [T34] |
| E2 | harmonic cursor | — | — | — | — | — | — |
| E3 | (t, f) readout at pointer | ◐ [T2] | ◐ [T13] | ◐ [T18] | ◐ [T23] | ◐ [T28] | ◐ [T34] |
| E4 | annotations persist | ✓ [T1] | ✗ [T13] | ✓ [T18] | ✓ [T22] | ✓ [T25] | ✓ [T35] |
| E5 | region selection | ✗ [T2] | ✗ [T13] | ✗ [T17] | ✗ [T22] | ✓ [T29] | ✗ [T34] |
| E6 | export | ✗ [T2] | ◐ [T12] | ◐ [T17] | ◐ [T22] | ✓ [T32] | ✓ [T35] |
| F1 | A–B loop | ✗ [T2] | ✗ [T13] | ✗ [T17] | ✗ [T22] | ✓ [T30] | ✗ [T34] |
| F2 | timed overlays | ✓ [T1] | ✓ [T13] | ✓ [T17] | ✓ [T22] | ✓ [T29] | ✓ [T34] |
| F3 | band-limited listening | — | — | — | — | — | — |
| F4 | bookmarks / jump-to-time | ✓ [T1] | ◐ [T13] | ✓ [T18] | ✓ [T22] | ◐ [T31] | ✓ [T34] |
| F5 | spectrum strip | — | — | — | — | ✗ [T27] | — |
| G1 | keyboard transport | ✓ [T5] | ✓ [T13] | ✓ [T18] | ? | ✓ [T33] | ◐ [T36] |
| G2 | recognised key scheme | ◐ [T2] | ◐ [T13] | ✓ [T18] | ? | ◐ [T33] | ◐ [T36] |
| G3 | live region / announcement | ◐ [T2] | ✓ [T12] | ◐ [T21] | ◐ [T24] | ? | ? |
| G4 | reduced motion | ✗ [T6] | ✗ [T12] | ✗ [T20] | ✗ [T24] | ✗ [T27] | ? |
| G5 | explained failure | ◐ [T3] | ? | ? | ? | ? | ? |
| H1 | FFT size at runtime | — | — | — | — | ✓ [T27] | — |
| H2 | window selectable | — | — | — | — | ✓ [T27] | — |
| H3 | overlap selectable | — | — | — | — | ✓ [T27] | — |
| H4 | magnitudes retained | — | — | — | — | ◐ [T27] | — |

#### Family T notes

- **A1** — Every web player here inverts our model: the time axis is fixed to the whole item
  and the playhead travels along it. Only ELAN offers the fixed-"now" alternative, and only
  as an option — "Ticker Mode", where "the crosshair will stop when it reaches the center of
  the viewer, while the viewer itself scrolls to the left" [T29]. That ELAN ships both and
  defaults to the page-flip is the honest reading: the scroll model is a preference.
- **A2** — ELAN's default is a page jump ("the crosshair will start from the left if it
  reaches the right side of the viewer"); continuous scroll is opt-in [T29].
- **A3** — Unanimous ✗, and the single most load-bearing row in the survey for spec 168.
  Even the players built to stop learners skipping still draw the whole duration [T16, T3,
  T13]; ELAN paints the whole file at open [T27, T28].
- **A4** — H5P's "Forward and backward" mode is the only setting in the family that removes
  scrollback, and it is the rarer of its two options [T2]. Panopto's percentage threshold
  restores seek after a configured proportion is watched [T15] — restriction *with an
  expiry*, which the reveal rule lacks.
- **A5** — No web player lets the viewer change how much time the bar spans; ELAN does, via
  timeline zoom and the spectrogram's visible interval [T29, T27]. `window-seconds` is closer
  to ELAN than to any e-learning player.
- **A6** — Universal. ELAN's is a red crosshair drawn identically in the waveform,
  spectrogram, timeline and density viewers — one playhead, in every synchronised pane.
- **B3/B4** — The scrub bar *is* the time axis in this family, so B3 and B4 collapse into one
  control. GramFrame's separate time-axis click is unusual only because its time axis is a
  measurement axis as well.
- **B6** — Loop is an authoring option in H5P [T2] and a working mode in ELAN; the
  lecture-capture players do not offer it [T17, T22]. Loop is a drill affordance, and drill is
  not what lecture capture is for.
- **B7/B8** — Ranges: H5P [0.25, 0.5, 1, 1.25, 1.5, 2] [T7]; Storyline 0.25×–2× [T14];
  Panopto 0.5×–2× [T17]; ELAN 1%–200% [T30]. GramFrame's 0.5/1/1.5/2 sits inside every one of
  them. The only precedent that goes materially slower is the transcription tool — a task
  reason GramFrame shares (resolving a transient tonal by ear).
- **B9** — Nobody documents pitch behaviour. A real gap in the family, not just in the spec:
  four vendors expose a rate control and none says what happens to pitch. Probe (a) already
  knows more than these vendors publish.
- **C1–C3** — ELAN alone, and thorough: window function, window length, stride, frequency
  min/max, three colour schemes, "Adaptive contrast" plus manual foreground and background
  brightness correction [T27]. A general-purpose annotation tool ships more display-range
  control than the purpose-built sonar gram does.
- **C2** — ELAN's adaptive contrast "adapts to the actual values in the current visible
  interval" [T27] — continuous per-view auto-ranging, against GramFrame's once-at-load
  whole-file percentile stretch. Ours is more deterministic; ELAN's is more useful when the
  interesting energy is quiet.
- **C4/C5** — No colour key and no dB readout even in ELAN. If C1 is adopted, a legend does
  not come with it for free; nobody in this family provides one.
- **D2** — Timeline zoom exists only in the annotation tool; every e-learning player treats
  the timeline as fixed furniture. Zoom-while-paused is an ELAN-family capability.
- **D5** — ELAN's Annotation Density Viewer [T31] is the closest thing to an orientation
  strip: where annotations are across the whole file, filterable by tier, type or annotator.
  Read across to GramFrame it is "where in the recording have I marked anything" — a cheap win.
- **E1/E4** — The persistence model is well settled: ELAN keeps everything in the sidecar and
  never touches the media [T25]; Echo360 keeps bookmarks and notes in a per-student Study
  Guide [T22, T23]; VideoAnt marks each annotation on the timeline with "a small, draggable
  marker" [T34]. GramFrame's storage keyed to absolute seconds is squarely conventional.
- **E3** — Time-only everywhere: no player in this family reads out a second measured
  quantity under the pointer, because there is nothing to measure. The (t, f) readout belongs
  to the acoustic-analysis family, not this one.
- **E5** — Region selection exists only in ELAN, and it is a time interval across all tiers,
  not a 2-D box [T29]. Combined with Loop Mode it *is* the A–B loop.
- **E6** — ELAN exports eleven annotation formats plus Praat TextGrid, WebAnnotation JSON,
  subtitle formats, an image of the window and an annotation density plot [T32]; VideoAnt
  exports RSS/JSON/XML [T35]. Export is the norm for anything calling itself an annotation
  tool. GramFrame has none.
- **F1** — A–B loop exists only in ELAN, where selection + Loop Mode is the core transcription
  drill [T30]. The clearest single capability gap between the player and the annotation
  family, and it maps directly onto "listen to this eight-second tonal ten times".
- **F2** — Timed overlays are the family's signature: H5P interactions with adaptive
  branching [T1], in-video quizzing in both lecture-capture products, ELAN annotations
  appearing at their own time [T29], VideoAnt annotations that "scroll by at the appropriate
  moment" [T34]. Spec 168 puts trainer-authored timed overlays out of scope; that is the one
  place it deliberately declines a domain convention, and it should be recorded as deliberate.
- **F4** — H5P bookmarks are author-placed and appear "with vertical grey lines on the
  seek-bar" [T1]; Panopto and Echo360 bookmarks are viewer-placed and timestamped [T18, T22].
  Note the split: authoring tools give the instructor the chapter list, lecture capture gives
  the learner the bookmark. For sonar training the learner-placed one is the interesting one,
  and it is nearly free given the existing annotation store.
- **G1/G2** — Panopto is the only one following anything like the web convention: Space
  play/pause, Left/Right ±5 s, Up/Down volume, M mute [T18] — GramFrame's binding set minus
  J/L. Storyline exposes its own list under Shift+? [T13]; ELAN's are fully customisable
  [T33]. Panopto has no rate shortcut, and a community request for one is described as an
  "EXCELLENT ACCESSIBILITY upgrade" [T19] — evidence that rate keys are wanted, not standard.
- **G3** — Articulate documents "screen reader announcements for player elements" [T12]; H5P
  ships stateful control labels ("Mute, currently unmuted") [T2] rather than a live region.
  The stateful accessible name is the cheaper pattern and is what the family actually does.
- **G4** — No product documents `prefers-reduced-motion`. The applicable criterion is WCAG
  2.2.2, which requires a pause mechanism for movement that starts automatically and runs
  over five seconds [T38]. The waterfall only moves after a user gesture and pauses on demand,
  so the player is already inside 2.2.2; a reduced-motion query would be polish, not a fix.
- **G5** — Largely undetermined in the time box; only H5P gave evidence, and it was of a
  feature failing quietly rather than loudly [T3].
- **H1–H3** — ELAN exposes window function, window length and stride as runtime settings on a
  live spectrogram [T27]: a working existence proof that runtime re-analysis is normal for an
  annotation tool, against spec 168's "out of scope".
- **H4** — ELAN re-renders the spectrogram from the audio when settings change, and its
  adaptive contrast works from values in the visible interval [T27], so magnitudes are
  effectively retained. Inferred from the manual, not read from source, hence ◐.

## 4. Capability matrix

Cells: ✓ present · ◐ partial or configurable · ✗ absent · — not applicable to the
medium · ? could not be determined (reason in the note). Every ✓/◐ cites an
evidence-log row (§8.3). The **tag** column says whether the row is a *domain*
convention (justified by an operator or analyst task in ≥ 2 families), a
*medium* fact (true of live receivers because there is no future to show) or a
*tool* habit. The **168** column is the player today; **challenges** names the
spec-168 requirement or decision the row bears on.

Family cells summarise that family's per-precedent table in §3 (`n/m` = members
scoring ✓ or ◐ out of those where the row applies), with one or two representative
evidence ids. **W** sonar/SDR · **A** acoustic analysis · **M** web media · **T**
training/annotation.

One row is restated here. The families answered A3 in opposite senses — a live
receiver has no future, a media player draws the whole duration — so the merged row
asks the question spec 168 actually poses: **is material ahead of the playhead
withheld from view?** Scored that way it is the only row in the survey where the
player stands alone.

| id | capability | W | A | M | T | tag | 168 | challenges |
|---|---|---|---|---|---|---|---|---|
| A1 | fixed "now" edge, older data moves away | 6/6 [W1,W33] | 4/6 [A2,A26] | 1/6 [M25] | 1/6 [T29] | **domain** [W33] | ✓ | interview 5, FR-010 |
| A2 | continuous (sub-row) scroll | 5/6 [W3] | 3/6 [A17,A33] | 1/6 [M24] | 1/6 [T29] | tool | ✓ better | FR-012, SC-003 |
| A3 | **material ahead of the playhead withheld** | — medium [W3] | 0/6 [A13,A38] | 0/6 [M4,M9] | 0/6 [T16,T3] | **ours** — no precedent | ✓ | **FR-011/016/018, D10** |
| A4 | history behind the window reachable | 2/6 [W20,W29] | 6/6 [A13,A29] | 6/6 [M2,M9] | 6/6 [T15,T29] | **domain** [A13,T15] | ✓ within `[0, playhead]` | FR-016, D11 |
| A5 | visible time span adjustable at runtime | 5/6 [W8,W26] | 6/6 [A34,A42] | 1/6 [M25] | 1/6 [T29] | **domain** [W33,A34] | ✗ authoring-time only | FR-004 (`window-seconds`) |
| A6 | explicit playhead marker drawn | — medium | 4/6 [A2,A39] | 6/6 [M2,M34] | 6/6 [T28] | medium/tool | ◐ the top edge is it | D7, D10 |
| B1 | play / pause | 1/6 [W29] | 5/6 [A22,A39] | 6/6 [M1,M9] | 6/6 [T18] | tool | ✓ | FR-020 |
| B2 | volume and mute | 3/6 [W4,W7] | 2/6 [A24] | 6/6 [M1,M20] | 5/6 [T18] | tool | ✓ | FR-020 |
| B3 | scrub bar / seek slider | 2/6 [W20,W29] | 5/6 ◐ [A3,A17] | 6/6 [M2,M34] | 6/6 [T15,T23] | tool | ✓ **to full duration** | FR-020 vs FR-011 |
| B4 | seek by clicking the display or its axis | 0/6 [W3,W23] | 5/6 [A12,A39] | 1/6 ✓ 5 ◐ [M23] | 6/6 [T17] | domain (weak) [A3] | ✓ backwards only | FR-020 |
| B5 | restart / jump to start | 1/6 [W29] | 3/6 [A22,A39] | 6/6 ◐ [M2,M9] | 6/6 [T13] | tool | ✓ button + `Home` | D13 |
| B6 | loop the whole item | ? [W20] | 4/6 [A4,A22] | 3/6 [M10,M35] | 2/6 [T2,T30] | tool | ✓ | FR-020 |
| B7 | playback-rate control | 1/6 [W32] | 4/6 [A5,A27] | 5/6 [M7,M19] | 5/6 [T7,T30] | **domain** [W32,A5] | ✓ 0.5–2 | D13, FR-020 |
| B8 | rate range wider than 0.5×–2× | 1/6 [W32] | 3/6 [A5,A27] | 1/6 [M19] | 2/6 [T30] | **domain** [W32,T30] | ✗ | D13 |
| B9 | pitch on rate change stated or chosen | 1/6 [W32] | 3/3 [A5,A18,A27] | 1/6 ✓ [M23] | 0/6 [T7] | **domain** [W32,A5] | ✗ undocumented | **D16, Assumption 3** |
| C1 | runtime floor/ceiling (gain + reference) | 6/6 [W9,W19] | 6/6 [A6,A15] | 1/6 ◐ [M26] | 1/6 [T27] | **domain** [A6,W19] | ✗ fixed at paint | **D5** |
| C2 | automatic ranging | 4/6 [W7,W19] | 2/6 [A25,A41] | 1/6 [M26] | 1/6 [T27] | **domain** [W19,A41] | ✓ per-file percentile | D5 |
| C3 | colour map selectable at runtime | 4/6 [W10,W16] | 4/6 [A7,A25] | 1/6 ◐ [M26] | 1/6 [T27] | tool — no reason found | ✗ | D5, Assumption 5 |
| C4 | colour-scale legend / dB key | 1/6 [W13] | 3/6 [A8,A38] | 0/6 | 0/6 [T27] | tool [A8 weak] | ✗ | D5 |
| C5 | dB / magnitude readout at the pointer | 1/6 [W19] | 3/6 [A9,A30] | 0/6 [M28] | 0/6 | tool — no reason found | ✗ | FR-022, H4 |
| C6 | per-row or per-band normalisation | 1/6 [W25] | 2/6 [A25,A41] | 1/6 ◐ [M26] | 1/6 ◐ [T27] | **domain** [W25,A41] | ✗ | — (new) |
| D1 | frequency-axis zoom | 6/6 [W3,W23] | 5/6 [A12,A25] | 1/6 ◐ [M26] | 1/6 [T27] | tool (universal) | ✓ | FR-016 |
| D2 | time-axis zoom | 2/6 ◐ [W23] | 5/6 [A12,A29] | 1/6 [M30] | 1/6 [T29] | tool | ✓ paused | FR-016, D11 |
| D3 | pan while live / playing | 6/6 [W3,W23] | 5/6 [A3,A29] | 1/6 [M24] | 1/6 [T28] | **domain** [A3] | ✗ | **FR-013, D9** |
| D4 | zoom while live / playing | 6/6 [W7,W23] | 1/6 [A34] | 1/6 [M30] | 1/6 ◐ [T27] | tool (W-universal) | ✗ | FR-013, spec §"reversible" |
| D5 | overview / minimap / density strip | 2/6 [W29] | 3/6 [A29,A38] | 1/6 [M30] | 5/6 [T31,T17] | **domain** [W29,A13] | ✗ | — (new) |
| E1 | persistent markers on the display | 5/6 ◐ [W24,W31] | 4/6 [A14,A36] | 2/6 [M19,M29] | 6/6 [T22,T34] | **domain** [T22] | ✓ | FR-016/017 |
| E2 | harmonic / comb cursor | 0/6 [W24] | 1/6 [A28] | 0/6 | — | **none — GramFrame leads** | ✓✓ | — |
| E3 | frequency *and* time readout at the pointer | 2/6 [W19] | 4/6 [A9,A30] | 0/6 [M28] | 0/6 time only | domain (weak) | ✓ | FR-022 |
| E4 | annotations persist beyond the session | 4/6 ◐ [W24,W31] | 4/6 [A14,A23] | 0/6 [M19] | 5/6 [T25,T22] | **domain** [T25,T22] | ✓ | FR-019 |
| E5 | region selection by drag (time × frequency) | 2/6 [W30,W31] | 5/6 [A1,A19] | 1/6 [M29] | 1/6 time only [T29] | **domain** [W31, A1 via F3] | ✗ | — (new) |
| E6 | export of measurements, image or data | 3/6 [W22,W31] | 4/6 [A14,A29] | 1/6 [M23] | 4/6 [T32,T35] | domain (weak) | ✗ | Out of Scope |
| F1 | A–B (region) loop | ? [W20] | 4/6 [A4,A17] | 1/6 [M29] | 1/6 [T30] | **domain** [T30,A4] | ✗ | FR-020 (loop is whole-file) |
| F2 | timed overlays / cue points | 1/6 ◐ [W30] | 2/6 ◐ [A29,A36] | 4/6 ◐ [M18] | 6/6 [T1,T29] | **domain** [T1] | ✗ deliberately | Out of Scope (explicit) |
| F3 | band-limited listening | 5/6 [W1,W7] | 2/6 [A1,A39] | 0/6 | — | **domain (strong)** [A1,A39] | ✗ | — (new) |
| F4 | bookmarks / jump-to-time list | 6/6 freq-only [W1,W29] | 4/6 [A13,A37] | 4/6 [M12,M34] | 6/6 [T18,T22] | **domain** [T18,T22] | ✗ | — (new) |
| F5 | spectrum (single-slice) strip | 4/6 [W14,W19] | 4/6 [A11,A38] | 0/6 | 0/6 | tool — no reason found | ✗ | — |
| G1 | keyboard transport bindings | 1/6 ◐ [W7] | 4/6 [A12,A22] | 4/6 [M1,M20] | 5/6 [T18,T33] | **domain** [T12,T24] | ✓ | FR-021, D13 |
| G2 | keys follow a recognised scheme | 0/6 [W7,W26] | 2/6 [A22,A29] | 2/6 ✓ 4 ◐ [M9,M32] | 2/6 [T18] | tool — five disagreeing schemes | ◐ | FR-021 |
| G3 | live region / state announcement | 0/6 [W36] | — desktop | 1/6 ✓ [M18] | 4/6 ◐ [T12,T2] | **domain** [M18,T12] | ✗ | — (accessibility) |
| G4 | reduced-motion accommodation | 4/6 ◐ scroll-off [W8,W15] | 4/6 ◐ [A17,A26] | 1/6 ◐ [M22] | 0/6 [T38] | none — obligation is WCAG 2.2.2 [T38] | ◐ satisfied by pause | — |
| G5 | graceful, explained failure | 1/6 [W26] | 2/6 degrade [A13,A38] | 1/6 [M26] | 1/6 ◐ [T3] | domain (weak) [A13,M26] | ✓ refuses | FR-007, D6 |
| H1 | FFT size selectable at runtime | 1/6 desktop [W19] | 5/6 [A11,A15] | 1/6 ◐ [M26] | 1/6 [T27] | **domain (desktop)** [A42] | ✗ config-time | Out of Scope, FR-004 |
| H2 | window function selectable | 2/6 [W16,W19] | 5/6 [A11,A41] | 1/6 [M26] | 1/6 [T27] | **domain** [A11] | ✗ Hann only | D4 |
| H3 | overlap / hop selectable at runtime | 1/6 [W19] | 4/6 [A11,A41] | 1/6 ◐ [M26] | 1/6 [T27] | domain [A11] | ✗ config-time | FR-004 |
| H4 | magnitudes retained after painting | 2/6 [W20,W29] | 6/6 [A10,A21] | 1/6 8-bit [M26] | 1/6 ◐ [T27] | **domain (strongest)** [A10] | ✗ grid discarded | **D5, gramImage.js** |

**Reading the tag column.** Twenty-eight rows carry a **domain** tag — four of them
weakly (B4, E3, E6, G5), where the capability is common but no source states a task
reason. Those twenty-eight are the only rows that may be cited to amend a spec-168
requirement. The player holds ten of them (A1, A4, B4, B7, C2, E1, E3, E4, G1, G5) and
leads the entire survey on E2, which no family has at all. The eighteen it lacks are
**A5** (adjustable span), **B8/B9** (rate range and pitch), **C1** and **H4** (display
range and the retained grid — one decision, see §6.3), **C6** (per-band normalisation),
**D3** (interaction while playing), **D5** (overview), **E5** (region selection),
**E6** (export), **F1** (A–B loop), **F2** (timed overlays — declined deliberately),
**F3** (band-limited listening), **F4** (bookmarks), **G3** (state announcement) and
**H1/H2/H3** (runtime analysis). Rows tagged *tool* — the rate ladder, the colour map,
the legend, the spectrum strip, the key scheme — may be adopted on cost grounds but
justify nothing.

One further reading matters more than any single row. **A3 is the only row in
forty-six where the player has no precedent in any direction**: every other family
either cannot answer the question (W) or answers it the other way (A, M, T). That
is not by itself an argument that the reveal rule is wrong — a training component may
legitimately do something no tool does — but it means the rule carries its
justification alone, with nothing to lean on. §6.1 tests it.

## 5. Empirical probes

Three bounded probes, run from the session scratchpad in Playwright's bundled
Chromium (HeadlessChrome 139.0.7258.5, Linux). Nothing from them is committed.

### 5.1 Probe (a) — `playbackRate` range, `preservesPitch` default (decides B7–B9)

A 30 s 440 Hz 16-bit mono WAV served over `http://127.0.0.1`, an `<audio>`
element, rates set in turn and `play()` called; `currentTime` advance checked
over 700 ms.

| Fact | Measured | Source |
|---|---|---|
| Accepted range | **0.0625 – 16** inclusive; outside it `setPlaybackRate` throws `NotSupportedError` ("not in the supported playback range") and leaves the rate unchanged | measured; `html_media_element.h:127-128` (`kMinPlaybackRate = 0.0625`, `kMaxPlaybackRate = 16.0`) |
| `preservesPitch` default | **`true`** | measured; `html_media_element.cc:3275-3285` |
| Effect of `preservesPitch = false` | Chromium switches the renderer from WSOLA time-stretch to a plain resampler — "Always resample when we don't care about pitch" | `media/filters/audio_renderer_algorithm.cc:341-349` |
| Muting at extreme rates | the current algorithm has **no** mute band (older Chromium muted outside 0.5–4×); nothing in `audio_renderer_algorithm.cc` or `audio_renderer_impl.cc` zeroes output by rate | source read; audibility itself **not measurable** headless (see below) |
| `currentTime` advance at 0.0625× / 16× | 0.02 s / 11.2 s per 700 ms — rate applied as requested | measured |

**Not measured**: audibility and the spectral effect of `preservesPitch`. The
`AnalyserNode` fed from a `MediaElementAudioSourceNode` reported the same RMS
(0.259) and the same 441 Hz peak at every rate, including 2× with
`preservesPitch = false`, which cannot be the rendered output. Headless Chromium
uses a fake audio sink and the Web Audio tap point appears to sit upstream of the
rate-processing stage, so the probe cannot see what the speaker would. The
conclusion for B7–B9 rests on the source, not on the analyser.

**Reading for spec 168**: D16 ("browser default") means *pitch-preserving*
time-stretch — the opposite of what spec 168's Assumption 3 describes. A rate
change today does **not** move a 50 Hz shaft line to 100 Hz; it keeps it at
50 Hz and shortens the time. Whether that is what a sonar trainee wants is
argued in §6.3.

### 5.2 Probe (b) — a live display-range filter on the tall `<image>` (decides whether C1 is S or M)

A 512 × 32,768 random-noise PNG (58 MB data URL, 2.8 s to encode) drawn as a
900 × 57,600 SVG `<image>` inside a 900 × 400 clip, scrolled by 7 px per frame
for 3 s in each condition.

| Condition | fps |
|---|---|
| No filter (first run, includes decode warm-up) | 49.9 |
| `feComponentTransfer` (linear slope 1.6, intercept −0.2) on the `<image>` | **60.3** |
| CSS `filter: contrast(1.6) brightness(1.1)` on the `<image>` | **60.3** |
| No filter (repeat) | 60.3 |

A contrast/brightness filter on the whole image costs nothing measurable at
this size on this machine. So a **runtime floor/ceiling control does not need
the magnitude grid retained or the PNG repainted**: a `feComponentTransfer`
whose slope and intercept are recomputed from two sliders is a pure-SVG,
zero-dependency change — Principle I as it stands. The filter works on the
*encoded* 8-bit levels, so it can only stretch or compress the 5th–99.9th
percentile range the PNG already carries; it cannot recover detail below the
5th percentile. That remains the argument for retaining a dB grid (H4) or for
`db-floor`/`db-ceiling` config rows applied at paint time.

**Not measured**: the same on WebKit; the cost with a dense pin set redrawn
each frame (spec 168's own SC-003 fixture covers that without a filter).

### 5.3 Probe (c) — can a public KiwiSDR / OpenWebRX receiver be opened from here?

Five receivers were tried in Playwright through the session proxy:
`20200.proxy.kiwisdr.com:8073` and `13oz1.ddns.net:8073` (KiwiSDR; timed out at
30 s — non-standard ports do not pass), `openwebrx.rahsmann.de`,
`hasenberg01.openwebrx.ch` and `yhsecurity.com/openwebrx` (OpenWebRX on 443;
`ERR_CONNECTION_RESET`, the proxy log shows the tunnel closed mid-exchange).
**No live receiver could be observed**, so the SDR family is evidenced from
source code and manuals only, which is the fallback the plan named. Live
behaviour that the source makes unambiguous (a slider bound to a variable) is
scored ✓; behaviour that depends on a receiver operator's configuration is
scored ◐.

## 6. Decisions under challenge

Nine decisions, argued both ways against the evidence above. Each closes with a
verdict and what it would cost. The verdicts feed §7; none of them is a decision —
the product owner decides.

### 6.1 The reveal rule — nothing beyond the playhead is ever drawn

*FR-011, FR-016, FR-018; D10; spec 168 Assumption 1, which already flags the rule as
reversible.*

**For.** It is the one thing that makes the component a *waterfall* rather than a
picture with a cursor. A trainee who can see the whole gram before it plays has been
handed the answer: the contact's track, the moment it appears, the harmonic set's
extent are all legible from the picture alone, and the exercise degrades from
detection to transcription. It also matches the medium the trainee will meet in
service, where the future genuinely does not exist (§3.1). And it is nearly free: one
clip rectangle and a one-line guard in three renderers.

**Against.** Four things, in ascending order of force.

1. **No precedent, in any family, in either direction** (matrix A3). The families that
   restrict a learner restrict the *control* and preserve *orientation*: Panopto with
   seek disabled still draws the bar, the duration and the slide thumbnails [T16]; H5P
   with prevent-skipping on still shows "all the stopping points" [T3]; Storyline's
   read-only seekbar still reads out minutes and seconds [T13]. Every analysis tool
   draws the whole file at open [A13, A27, A38]. The one live tool in the acoustic
   family does not go blank ahead of "now" either — in wrap mode it shows the
   *previous sweep's* data [A32].
2. **The stated reason for restriction elsewhere is compliance attestation, not
   perception** [T10, T4] — "users may be required to spend a certain amount of time in
   the course". That reason does not apply to a sonar exercise, and the two vendors who
   ship the restriction also ship an *expiry* for it: Panopto's percentage threshold
   [T15], Storyline's conditional seekbar [T9]. The reveal rule has no expiry.
3. **It does not actually hold.** The seek slider's `max` is the full duration
   (`TransportBar.js:60-68`); one drag to the right sets `currentTime = duration`,
   `transport.seek()` moves the playhead there, and the entire recording becomes
   revealed and pannable. `L` (or `Shift+L`) does the same in steps, unclamped. Only
   the time-axis click is genuinely one-way, and only because the axis never spans
   anything above the playhead. So the rule costs the analyst the whole-file view and
   buys an integrity guarantee it does not provide — the worst of both.
4. **It is untestable as an assessment control** and, worse, it is *silently* defeated:
   nothing tells the instructor a trainee skipped, and nothing tells the trainee they
   have crossed into unheard material.

> **Resolved 2026-09-05 (§9 Q1): drop the hiding — option (b) below.** The verdict that
> follows is the survey's recommendation; the product owner chose differently, and the
> survey's own A3 row supports the choice. Read this section for the argument and §9 Q1
> for what was decided.

**Verdict.** Keep the reveal rule as the **default**, because the waterfall reading is
real and the cost is trivial — but stop presenting it as an integrity mechanism, and
close the gap between what it claims and what it does. Two coherent positions exist and
the present code sits between them: (a) *pedagogic default* — keep the rule, and make
the seek bar and `L` honour it (clamp forward seek to the playhead) so the picture and
the transport agree, with an author opt-out row for review sessions; or (b) *analyst
mode* — an author row that reveals the whole file from the start, keeping the
scrolling view as the play behaviour. Recommend shipping (a) plus the opt-out, which
is (b) at one row's cost. **Effort: S.**

### 6.2 Rate change and pitch

*D16 ("browser default"); spec 168 Assumption 3 ("rate change may alter pitch"); Out of
Scope, "Pitch-preserving rate change".*

**For the decision as written.** Doing nothing is free, and the browser's choice is
defensible.

**Against.** The spec's factual premise is wrong. `preservesPitch` is never assigned
anywhere in `src/`, and it defaults to **`true`** in every browser (probe (a); [M8],
Baseline since December 2023). So the shipped behaviour is *pitch-preserving
time-stretch* — the exact behaviour the spec lists as **out of scope**, arrived at by
not writing a line of code. A 50 Hz shaft line at 2× stays at 50 Hz and the recording
finishes in half the time. Assumption 3, the Out-of-Scope entry and D16 are mutually
inconsistent with the code and with each other.

Which behaviour is *wanted* is a genuine question, and the domain answers it in the
opposite direction to the browser. Raven and Audacity resample — "Slowing down the rate
makes the sound lower in pitch and slower" [A5, A18]; PAMGuard states the analyst
reason outright, that slow playback is how inaudible high-frequency cetacean clicks are
brought into the audible band [W32]. Only Sonic Visualiser time-stretches, and it warns
that "the sound quality will suffer" [A27]. So the acoustic family is 2:1 for pitch
following rate, with the only *stated task reason* on that side.

But there is a strong counter-argument specific to *this* product: GramFrame teaches
trainees to associate an audible pitch with a measured frequency on the gram, and the
gram is never re-analysed at the new rate (FR-022). Under resampling, at 2× the ear
hears 100 Hz while the readout says 50 Hz — the two channels of the lesson contradict
each other. Under pitch preservation they agree.

> **Resolved 2026-09-05 (§9 Q2): explicit `true`, plus a config row for the resampling
> behaviour.** R3 as recommended.

**Verdict.** Set `preservesPitch` explicitly rather than inheriting it, and say which
in the contract. Recommend **explicit `true`** (matching what ships today, and keeping
ear and readout consistent), with `preservesPitch = false` offered as a config row for
instructors who want the frequency-shift behaviour the acoustic family uses. Correct
Assumption 3, the Out-of-Scope entry and D16 to describe what the code does either way
— that correction is required whatever is chosen. **Effort: S.**

### 6.3 The display range is fixed at paint time and the magnitude grid is discarded

*D5; `gramImage.js:54-90`; matrix C1, C2, C4, C5, C6, H4.*

**For.** Determinism. The 5th–99.9th percentile stretch is computed once from the whole
file, so the same WAV always produces the same picture — a real virtue for a training
component whose exercises must look the same to every trainee, and for a Playwright
suite that compares state rather than pixels. It also avoids the trap Praat documents
against itself: autoscaling to the *visible* area means "the blackness of a certain part
of the spectrogram will change as you scroll" [A41], which would teach a trainee to
misjudge contact strength. GramFrame's whole-file stretch is a genuine third position,
and the better one.

**Against.** This is the survey's strongest single finding, and it is two findings that
look like one.

- **C1 (a runtime floor/ceiling) is 12/12 across the two technical families** and is the
  only universal *control* row in the acoustic family. Raven states the task reason:
  adjust it when "it's hard to pick the signal out of the background" [A6]. SDRangel
  publishes its algorithm [W19]. Probe (b) measured the cost of doing it live on the
  tall `<image>` at **60.3 fps, indistinguishable from no filter** — an
  `feComponentTransfer` whose slope and intercept come from two sliders, zero
  dependencies, pure SVG. **Effort: S.**
- **H4 (retaining the magnitudes) is 6/6 in the acoustic family**, and Raven says why in
  one sentence worth quoting in full: after a brightness change "the underlying power
  values have not changed so all measurement values will be the same" [A10]. Audacity's
  cache is invalidated by window and algorithm but *not* by Gain or Range [A21]; Sonic
  Visualiser's `setGain` touches only the renderer [A31]. GramFrame currently shares
  **OpenWebRX's** failure mode — colour baked into pixels at draw time [W3] — for a
  component that has already paid to compute the grid and could keep it. **Effort: M**
  (a `Float32Array` of frames × columns, plus repaint; memory is the real cost and it
  should be measured against the existing 32,768 × 4,096 cap before committing).

The two are not equivalent. An SVG filter re-maps the *encoded 8-bit levels*, so it can
stretch or compress what the PNG already carries but cannot recover detail below the 5th
percentile. wavesurfer hits the same wall, retaining magnitudes only as `Uint8Array`
[M26]. Only a retained float grid buys C5 (a dB readout), C6 (background subtraction —
SDRangel's `x−μ+∧μ dB` [W25], Praat's dynamic compression [A41], the shape a split-window
normaliser would take) and honest dB axis labels.

> **Resolved 2026-09-05 (§9 Q3): retain the grid as `Uint16` under a ~32 MB per-instance
> cap, degrading to the painted-PNG path when a file will not fit.**

**Verdict.** Adopt C1 now via the filter — it is small, measured, and the single
highest-value change in the survey. Treat H4 as a separate, later decision with a memory
budget attached; C5 and C6 are downstream of it and should not be promised before it.
Also fix the D5 drift while here: the plan says blue→cyan→yellow→white, the code is
dark-blue→blue→yellow→orange→red (`colourMap.js:16-22`).

### 6.4 All pointer interaction is inert while playing

*FR-013; D9; `events.js:312`, `keyboardControl.js:166`.*

**For.** It removes a whole class of ambiguity — what should a pan mean when the view is
being driven by the playhead? — for one `return` statement, and it guarantees that no
mode needs to know the player exists (Constitution III). Hover readouts still work, so
the trainee is not blind while listening.

**Against.** Every family that can pan while its display is live, does. All six SDR/sonar
precedents pan and zoom mid-stream; OpenWebRX even switches the cursor to `move` with the
stream still arriving [W3]. Five of six acoustic tools allow it. And the family supplies
two designs that are better than blocking, not just different:

- **Raven converts the gesture instead of refusing it**: dragging the scroll thumb during
  scrolling playback stops the sound and "resumes immediately at the new time position
  when you release" [A3] — a pan becomes a seek, which is exactly what a trainee who
  spots something and grabs the gram actually means.
- **Sonic Visualiser separates the surfaces**: drag the overview strip "to scroll all of
  the panes *without moving the playback position*" [A29].
- wavesurfer shows the failure mode of the naive version: it allows scrolling while
  playing and then drags the view back on the next progress tick [M24] — user and
  autoscroll fighting. Whatever is adopted must not be that.

Note also that FR-013's inertness is *not* what makes annotation-while-playing hard; the
reveal rule and the moving view are. Blocking is a cheap answer to a question the family
answers better.

**Verdict.** Keep annotation create/move/delete inert while playing — that part is sound
and nobody in the survey lets you draw on a moving display. Reconsider **pan** (D3, a
domain row): Raven's pan-becomes-seek is the strongest candidate and costs one branch in
`events.js` plus a `transport.seek()`. Frequency zoom while playing (D4), already flagged
reversible by the spec, is a smaller and safer follow-on. **Effort: S–M.**

### 6.5 `window-seconds` is fixed when the page is authored

*FR-004; D7; matrix A5.*

**For.** One number, set by the instructor who knows the exercise; no UI; no state to
persist; the geometry (`imageDetails.timeStretch`) is computed once at load.

**Against.** A5 is tagged **domain** on the strongest task reason in the whole survey,
and it comes from a naval sonar text rather than a tool manual: a short time history
suits "close contacts whose bearings are changing rapidly", while "a long tie history is
more useful for detecting long range contacts, whose bearings are only changing slowly"
[W33]. Eleven of twelve precedents in the two technical families make it adjustable, and
WebSDR usefully splits it in two — **Speed** and **Size** as separate controls [W26],
where `window-seconds` conflates scroll rate with visible span.

The mitigating fact is that GramFrame already has *half* of this: time zoom while paused
changes the visible span (`visibleWindowSeconds = windowSeconds / zoom.level`). What is
missing is that it is unavailable while playing (§6.4) and is expressed as a zoom factor
rather than as seconds.

**Verdict.** The cheapest honest fix is to let zoom act on the time axis while playing,
which turns the existing control into the adjustable span the domain asks for, and to
label the readout in seconds. A separate span control is not needed. **Effort: S**, and
it is the same change as the D4 half of §6.4.

### 6.6 One fixed colour map, not configurable

*D5; Assumption 5; matrix C3, C4.*

**For.** C3 is tagged **tool**: eight precedents offer a colour-map choice and *not one
source in any family gives a task reason for it*. It is a preference, and preferences in
a training component are a way for two trainees to see different pictures of the same
exercise. Holding it fixed is defensible and was an explicit interview decision.

**Against.** Two narrower points survive. First, the map is not what the plan says it is
(§6.3), and a documentation drift in the one visual constant of the component is worth
fixing on its own. Second, greyscale is not merely a preference in this domain: PAMGuard
defaults to greyscale [A32], Raven ships it first [A7], and a legend is drawn by
KiwiSDR, Raven, PAMGuard and RX [W13, A8, A32, A38]. If a second map is ever added, make
it greyscale, and add it as an authoring row rather than a viewer control so the
exercise stays identical for everyone taking it.

**Verdict.** Reject the runtime colour picker. Fix the D5 documentation drift. Hold a
greyscale *authoring* row and a dB legend as low-priority candidates, both downstream of
C1 (a legend for a range nobody can see or change is decoration).

### 6.7 Analysis is fixed at load; no runtime re-analysis

*Out of Scope, "Re-analysis with different parameters at runtime"; FR-004; matrix
H1, H2, H3.*

**For.** The browser members of the closest family agree: both OpenWebRX and KiwiSDR take
FFT size from the server and give the listener no say [W3, W38]. Runtime analysis
controls are a *desktop* trait. And the cost here is not a dialog — it is re-running the
whole file's FFT, repainting a PNG up to 32,768 rows tall, and invalidating every
annotation's pixel position mid-session. The interview chose "sensible defaults,
overridable by config rows", which is what an instructor authoring an exercise needs.

**Against.** H1–H3 are tagged **domain**, and the reason is stated crisply by Praat: keep
5 ms for a broad-band picture at 260 Hz resolution, set 30 ms for a narrow-band picture at
43 Hz, because "one cannot know both the time and the frequency with great precision"
[A42]; Raven adds the window-shape and hop reasons and warns what a bad hop does to the
picture [A11]. Five of six acoustic tools and ELAN all offer it live. For a *trainee being
taught what a spectrogram is*, being able to widen the window and watch a tonal sharpen
while its onset smears is arguably the lesson itself.

**Verdict.** Uphold the decision for the component, and note the pedagogic argument
against it as a separate product question — "an FFT-size demonstration mode" is a
different feature from "a settings panel", and would be better served by an authored page
with two instances at different `fft-size` values than by runtime re-analysis. **Cost of
the alternative: L.** No change recommended.

### 6.8 An oversized gram is refused, not degraded

*FR-007; D6; `gramImage.js:22-48`; matrix G5.*

**For.** The refusal is well-made: it names the parameter and the value that would fit
("Set hop-size to 4096 (or shorten the recording)"), which is the standard WebSDR sets —
three distinct failures, three named remedies [W26] — and better than anything else in
the survey. Truncating a recording silently would be far worse for a measurement tool.

**Against.** No tool in the acoustic family refuses. Raven pages a file "too large to fit
in the memory available" [A13]; RX ships "Reduce Quality Above" plus a cache cap [A38];
wavesurfer falls back from a worker to the main thread and explains why ("on long files a
main-thread FFT can freeze the page, which is usually worse than a missing spectrogram")
[M26]. All three *degrade* along an axis the user did not have to understand. GramFrame's
message is good but it asks an instructor to reason about `hop-size` — a parameter they
may never have met — at the moment their page is broken.

**Verdict.** Keep the refusal (it is the right default for a measurement tool, and the
message is already better than the family's). Consider one improvement: since the code
already computes the hop that *would* fit, it could offer to use it — "analysed at
hop-size 4096 to fit the display; set `hop-size` explicitly to silence this" — which is
degradation with the parameter named rather than a dead page. **Effort: S**, low priority.

### 6.9 The transport vocabulary — keys, rate ladder, restart button

*D13; FR-020, FR-021; matrix B5, B7, B8, G2.*

**For.** The bindings are conventional where a convention exists: `Space`/`K` for
play-pause and `M` for mute are agreed by every web player surveyed [M1, M9, M14, M20,
M32], and Panopto — the only training player following the web scheme — binds Space,
arrows and M the same way [T18]. The rate ladder 0.5/1/1.5/2 sits inside every ladder in
both the media and training families. Space-on-a-focused-button is already handled
correctly in `keyboardControl.js`, which is exactly the collision YouTube documents [M9].

**Against.** Three specifics.

1. **`J`/`L` is not a convention.** It is absent from Chromium and Plyr, ±10 s in YouTube
   and Media Chrome, absent from video.js's defaults — and **Plyr binds `L` to toggle
   loop** [M20], the opposite meaning. Its ancestry is the Avid shuttle, where `L`
   repeated steps 2×/3×/4× for "greater control" over speed [M13]; a fixed ±5 s skip
   inherits the letters without the reason. More sharply for this audience, the closest
   *visual* family spends those very keys on frequency: WebSDR binds `j k ← →` to
   frequency [W26] and KiwiSDR binds **space to mute** [W7]. There is no way to please
   both; the choice made (media vocabulary) is the right one, but it should be recorded
   as a choice rather than as inheritance.
2. **The rate ladder is a tool habit with no task reason behind it** — five players, five
   incompatible ladders, no source explaining any of them (§3.3). It therefore cannot be
   cited *for* 0.5–2, and B8 (a wider range) is tagged domain on the other side: SV offers
   0.1×–10× [A27], Raven is unbounded [A5], ELAN goes to 1% for transcription [T30], and
   PAMGuard's slow playback has an explicit analyst reason [W32]. Probe (a) measured the
   platform ceiling at 0.0625–16, so **0.25 and 4 are free to add**; the trainee task —
   resolving a beat rate or a transient by ear — is the same task ELAN's 1% serves.
3. **No live region.** `aria-live` appears once in the whole component
   (`StorageWarning.js:51`); the transport is labelled (`role="group"`, `aria-pressed`,
   `aria-label`) but silent. video.js shows the cheap pattern and states the reason in its
   source: `aria-live="polite"` on every control's hidden text, "let the screen reader
   user know that the text of the element may change" [M18]. G3 is tagged domain on the
   accessibility obligations the training family carries [T12, T24]. Note the related
   finding on G4: `prefers-reduced-motion` is unhandled here and essentially unhandled
   everywhere, but the applicable criterion is WCAG **2.2.2 Pause, Stop, Hide** [T38],
   which a user-started, pausable animation already satisfies — so this is polish, not a
   defect.

**Verdict.** Keep `Space`/`K`/`M`/`Home` and the restart button. Widen the rate ladder to
0.25 / 0.5 / 1 / 1.5 / 2 / 4 (**S**). Add `aria-live="polite"` to the transport's time
and state text (**S**). Keep `J`/`L` but document the choice, and consider adopting Media
Chrome's `keysused` idea — a per-element opt-out [M32] — if key collisions ever spread.

## 7. Recommendations

Ranked within each group by value for effort. **S** ≈ under a day, no new state or
module; **M** ≈ a few days, new state or a new component; **L** ≈ its own spec.
"Changes" names the spec-168 artefact that would have to move.

### 7.1 Adopt — evidenced, small, and mostly corrective

| # | Recommendation | Why | Effort | Changes |
|---|---|---|---|---|
| R1 | **Correct the three statements that are untrue of the shipped code**: Assumption 3 / D16 / Out-of-Scope on pitch (the player *is* pitch-preserving — probe (a), [M8]); D5's colour stops (`colourMap.js:16-22`); and FR-011's "the picture MUST never show audio that has not yet been played", which `TransportBar.js:60-68` defeats in one drag. **Since §9 Q1 the third is settled by R1b, not by a seek clamp** | A spec that contradicts its own code is worse than no spec; all three are now documentation-sized | S | spec.md Assumptions + FR-011; plan.md D5, D16 |
| R1b | **Draw the whole gram from load** (§9 Q1): remove the unrevealed region, retire `BaseMode.isTimeRevealed`'s gating and D10, and raise `clampViewTop`'s upper bound from the playhead to the duration. The scrolling playhead-at-top view during playback is unchanged | Product-owner decision, 2026-09-05. A3 was the one row of 46 where the player stood alone; this puts it with every analysis tool and media player surveyed | S–M | FR-011/016/018; D10; `playerView.js` |
| R2 | **Runtime display range** — two sliders (floor, ceiling) driving an `feComponentTransfer` on the `<image>` | The survey's strongest row: C1 is 12/12 across both technical families with a stated task reason [A6, W19], and probe (b) measured it at **60.3 fps, indistinguishable from no filter**. Zero dependencies, pure SVG | S | new FR under Story 3; D5 |
| R3 | **Set `preservesPitch` explicitly** — `true`, matching today — and offer the resampling behaviour as a config row (**confirmed, §9 Q2**) | The domain is 2:1 the other way with the only stated task reason [W32, A5, A18], but ear-and-readout consistency argues for keeping what ships. Either way, inheriting a default the spec describes backwards is not a decision | S | D16; contracts/config-rows.md |
| R4 | **Widen the rate ladder to 0.25 / 0.5 / 1 / 1.5 / 2 / 4** | B8 is a domain row [W32, A27, T30]; probe (a) measured the platform ceiling at 0.0625–16, so the current list is a UI choice with nothing behind it. The media family's ladders justify nothing either way (§3.3) | S | D13 |
| R5 | **`aria-live="polite"` on the transport's time and state text** | G3 is domain on the training family's accessibility obligations [T12, T24]; video.js gives both the pattern and the reason [M18]. One attribute | S | — |
| R6 | **Let time zoom act while playing**, and label the visible span in seconds | Turns the existing zoom into A5, the adjustable time history the naval source gives the clearest task reason for in the whole survey [W33]; also the safer half of §6.4 | S | FR-013 (partial); D11 |
| R7 | **Pan-becomes-seek while playing** (Raven's design [A3]) instead of an inert pointer | D3 is a domain row, unanimous in the closest family; converting the gesture is better than refusing it and avoids wavesurfer's user-versus-autoscroll fight [M24] | S–M | FR-013; D9 |
| R8 | **Degrade-with-a-named-parameter on oversize**: the code already computes the hop that would fit — offer it rather than only naming it | Nobody in the acoustic family refuses [A13, A38, M26]; this keeps the refusal's honesty while unblocking the page | S | FR-007 |

### 7.2 Later spec — evidenced, but each needs its own design

| # | Recommendation | Why | Effort | Changes |
|---|---|---|---|---|
| R9 | **Region selection (E5) and A–B loop (F1)** as one feature: drag a time×frequency box, loop the time span it spans | E5 is 5/6 in the acoustic family and F1 is 4/6 with a drill task reason [A4, T30]; ELAN's selection+Loop Mode is the transcription workflow, and "listen to this eight-second tonal ten times" is the same task. wavesurfer shows the API shape (`region.play(true)` → `play(start, end)`) [M29] | M | FR-020; Story 4 |
| R10 | **Retain the magnitude grid (H4)** as `Uint16` under a ~32 MB per-instance cap, degrading to the painted-PNG path when a file will not fit (**budget set, §9 Q3**) | 6/6 in the acoustic family with the clearest task reason in the survey — measurements must survive display changes [A10, A21, A31]. Unlocks C5 (dB readout) and C6 (background subtraction). Currently GramFrame shares OpenWebRX's discard-at-paint failure mode [W3] | M | D5; contracts/audio-pipeline.md |
| R11 | **Band-limited listening (F3)** — hear only the selected band | The strongest task reason in the acoustic family, stated twice ("listen to only the higher harmonics… or only to a low-frequency animal call") [A1, A39], and the core interaction of every SDR precedent [W1, W7, W26]. Downstream of R9: the selection is the filter | M | Out of Scope entry |
| R12 | **An overview strip (D5)** — the whole recording at a glance, with annotation density | Domain row; PAMGuard's Data Map exists "to aid large dataset navigation" [W29] and ELAN's density viewer answers "where have I marked anything" [T31]. A 900 × 400 view of 10 s inside a 3-minute file needs it more than any desktop tool does | M | Story 3 |
| R13 | **Bookmarks / jump-to-time (F4)** | Domain row with a stated revision reason — "Save a particular spot in a recording to revisit at a later time" [T18, T22]. Nearly free given the existing annotation store and storage layer | S–M | Story 4 |
| R14 | **Per-band normalisation (C6)** — background subtraction toward a split-window normaliser | Domain row: SDRangel's `x−μ+∧μ dB` with its stated reason [W25] and Praat's dynamic compression [A41]. Strictly downstream of R10 | M | — |
| R15 | **A dB colour key**, ideally as RX's ruler where the legend *is* the control [A38] | Only worth having once R2 exists — a legend for a range nobody can change is decoration; and honest dB labels need R10 | S | — |

### 7.3 Reject, or hold with reasons

| # | Not recommended | Why |
|---|---|---|
| X1 | **Runtime colour-map picker** | C3 is tagged *tool*: eight precedents offer it and **no source in any family gives a task reason**. In a training component it lets two trainees see different pictures of the same exercise. A greyscale *authoring* row is the acceptable version if ever wanted [A7, A32] |
| X2 | **Runtime re-analysis / a settings panel (H1–H3)** | Domain in the desktop tools but not in the browser members of the closest family [W3, W38], and the cost here is re-running the whole file's FFT and repainting a 32,768-row PNG mid-session (**L**). The pedagogic case — watching a tonal sharpen as the window widens — is better served by an authored page with two instances at different `fft-size` values |
| X3 | ~~**Removing the reveal rule outright**~~ — **overridden by the product owner, 2026-09-05 (§9 Q1)** | The survey's reasoning was that the waterfall reading is real and matches the medium the trainee will meet [W33]. The decision went the other way, on the strength of A3 having no precedent in any family. Recorded so the trade — losing "you only know what you have heard" — is visible as a choice rather than an omission. Implemented as R1b |
| X4 | **A spectrum (single-slice) strip (F5)** | 8/12 in the technical families and **not one source says what it is for**; tagged *tool*. It also costs vertical space a 400 px component does not have |
| X5 | **Trainer-authored timed overlays (F2)** | The training family's signature capability and a genuine domain convention [T1] — but spec 168 declines it explicitly, and it is a different product (authoring) rather than a player change. Recorded here so the decline is visible as deliberate, not as an oversight |
| X6 | **Copying the SDR keyboard vocabulary** | Every key a transport wants is spent on radio in that family — `j k ← →` on frequency [W26], space on mute [W7]. Those are radio bindings, not sonar ones. Keep the media vocabulary and document it as a choice |
| X7 | **`prefers-reduced-motion` handling** | Effectively unhandled across all four families [M22, T-family], and the applicable criterion — WCAG 2.2.2 Pause, Stop, Hide [T38] — is already satisfied by a user-started, pausable animation. Polish, not a defect |

## 8. Method and evidence

### 8.1 Method

Documentation first, source second, live demo third. Nothing was installed.
Each precedent had about 45 minutes; anything not evidenced in that time is `?`
with the reason. Vendor pages and manuals were read on 2026-09-05; open-source
tools were read from their GitHub default branch on the same day, so a source
citation is `repo/path` as of that date. Live web demos were attempted only for
the SDR family (probe (c)) and failed at the network boundary. The four
families were surveyed in parallel by four researchers working from the same
checklist and evidence format, then merged; where two disagreed the source
code won over the manual and the manual over a forum post.

### 8.2 The tagging rule

A capability is tagged **domain** only if it appears in at least two families
*and* at least one source gives a task reason for it (an operator manual
explaining why gain is adjustable counts; a video player's speed menu does
not). SDR waterfalls are live, so "no future shown" and "no seek" there are
**medium** facts, not conventions to copy. Acoustic tools are analysis tools,
so "the whole file is visible" is partly a **tool** habit. Only domain
conventions can justify amending a spec-168 requirement; tool conventions are
adopted on cost grounds alone. The trap this guards against is that SDR is the
closest *visual* precedent to the player and the furthest *medium* precedent —
the survey must not let the first fact smuggle in the second.

### 8.3 Evidence log

One row per source actually read, grouped by family. Every ✓ and ◐ in §3 and
§4 cites one of these ids.

#### W — sonar and SDR waterfall displays

| id | precedent | what was read | URL | fact evidenced |
|---|---|---|---|---|
| W1 | OpenWebRX+ | OpenWebRX+ documentation draft, single page | http://fms.komkon.org/OWRX/ | Four zoom buttons about the tuned frequency; wheel zoom; drag to pan; two sliders for hottest/coldest waterfall colour; a button for one-time auto-adjust and right-click for continuous; REC records audio; bookmarks colour-coded green (band plan) / yellow (server) / blue (browser); "?" opens the shortcut list; Turbo colormap default |
| W2 | OpenWebRX+ | same page, second targeted read | http://fms.komkon.org/OWRX/ | No waterfall speed or time-span control documented; no scrollback; no colour-scale legend; no dB readout under the cursor; the spectrum display is toggleable and "may make your web browser use a lot of processor power"; no measurement or annotation tool |
| W3 | OpenWebRX | source: `htdocs/openwebrx.js` (~54–140, 515–600, 1084–1180) | https://raw.githubusercontent.com/jketterl/openwebrx/master/htdocs/openwebrx.js | `waterfall_min_level`/`waterfall_max_level` bound to the colour-min/max inputs; `waterfallColorsAuto`, `waterfallColorsContinuous`; `zoom_set`/`zoom_step`; `shift_canvases()` with `canvases.shift(); removeChild(c)` — history destroyed, no scrollback, colours baked at draw time; `canvas_mousemove` → `setMouseFrequency` (frequency-only readout); `canvas_mouseup` → `set_offset_frequency`; `fft_size` from the server config |
| W4 | OpenWebRX | source: `htdocs/index.html` receiver panel | https://raw.githubusercontent.com/jketterl/openwebrx/master/htdocs/index.html | Volume slider (0–150) and mute; range inputs "Waterfall minimum level"/"maximum level" (−200…100); "Auto-adjust waterfall colors (right-click for continuous)"; "Set waterfall colors to default" |
| W5 | OpenWebRX | DeepWiki, "Waterfall Display" | https://deepwiki.com/jketterl/openwebrx/2.2-waterfall-display | New line drawn at the top with previous content shifted down across multiple canvases; no persistent historical scrollback |
| W6 | KiwiSDR | repository README | https://github.com/jks-prv/Beagle_SDR_GPS/blob/master/README.md | Browser-based, multi-user, "15 levels of zoom (z0 – z14)", interface "based on OpenWebRX" |
| W7 | KiwiSDR | source: `web/openwebrx/openwebrx.js`, `keyboard_shortcut_init()` (10305–10395) | https://raw.githubusercontent.com/jks-prv/Beagle_SDR_GPS/master/web/openwebrx/openwebrx.js | Shortcuts: `g` freq field; `j i ←→` frequency step; `z Z` zoom; `<` `>` waterfall page down/up; `w W` waterfall min-dB ∓1 dB (alt ∓10); `S` auto-scale; `s` spectrum RF/AF/off; `v V space` volume less/more, **mute**; `r` audio recording; `!` aperture manual/auto; `^` wheel tune/zoom; `\` `\|` DX databases; `? h` help. Returns early on old browsers and mobile |
| W8 | KiwiSDR | same file: `wf_rates` (286), `id-slider-rate` (11172), `WF_SPEED_*` (11579+) | as W7 | Waterfall speed is a slider 0–4 mapping `{off, 1hz, slow, med, fast}`; `off` stops the waterfall entirely |
| W9 | KiwiSDR | same file: `override_min_dB`/`override_max_dB` (351–492), `w3_slider('id-input-mindb', …, −190, −30, 1, …)` (11095) | as W7 | Runtime waterfall min-dB slider −190…−30 dBm plus a max-dB value; persisted via `kiwi_storeRead('last_min_dB')` |
| W10 | KiwiSDR | same file: `mkcolormap()` (5763+), `cmap` URL param, `turbo_colormap_data` | as W7 | Selectable colormaps kiwi, CuteSDR, greyscale, linear, Turbo plus user "custom", at runtime and by URL parameter |
| W11 | KiwiSDR | same file: `spectrum_tooltip_update()` (4455–4540) | as W7 | Tooltip prints `<freq> kHz … <dB> dBm`, but dB is `((h − clientY)/h) × full_scale + mindb` — the cursor's position on the dB axis, not the bin's level |
| W12 | KiwiSDR | same file: `page_scroll()` (5083) → `waterfall_pan_canvases(dbins)` | as W7 | The `<` `>` "waterfall page" keys pan **frequency**; panning re-renders the canvases, so per-canvas data is retained across a pan |
| W13 | KiwiSDR | source: `web/extensions/colormap/colormap.js`, `colormap_aper()` (285–310) | https://raw.githubusercontent.com/jks-prv/Beagle_SDR_GPS/master/web/extensions/colormap/colormap.js | A 16-px "aperture" canvas draws the current colormap across −140…−20 dBm with ticks at the current min/max dB — an on-screen colour key in dBm |
| W14 | KiwiSDR | same file as W7: spectrum canvas ids (2653–2690) | as W7 | A separate spectrum canvas stack with its own dB scale strip, toggled by `s` |
| W15 | fldigi | Users Manual, "Operating Controls and Displays" | https://www.w1hkj.org/FldigiHelp/operating_controls_page.html | `WF` toggles WF / FFT / Sig; `Norm` selects SLOW, NORM, FAST, **PAUSE**; X1/X2/X4 scale; shift and centre buttons; two dB controls — maximum signal level and display range; `Store` saves mode+frequency; arrow keys adjust frequency finely |
| W16 | fldigi | Users Manual, "Waterfall Configuration" | https://www.w1hkj.org/FldigiHelp/ui_configuration_waterfall_page.html | Editable palette with load/save; FFT averaging "to smooth the waterfall display in the frequency domain"; latency in 512-byte blocks (default 4); prefilter/window (Blackman default); RF or AF scale; cursor-BW / centre-line / tracking marker colours; wheel actions incl. waterfall scrolling in 100 Hz steps |
| W17 | fldigi | Users Manual, "Mouse and Keyboard Shortcuts" | https://www.w1hkj.org/FldigiHelp/mouse_and_keyboard_shortcuts_page.html | Shift/Ctrl Left/Right move the marker by 1 Hz / 10 Hz; left-drag positions the marker and starts decoding; **Ctrl+left-click replays audio history at the marker**; Ctrl+right-click replays at the cursor frequency, reverting on release |
| W18 | fldigi | manual passage on audio history | https://www.w1hkj.org/FldigiHelp/operating_controls_page.html | The received-audio history buffer is "approximately 2 minutes in duration" and can be re-decoded from a Ctrl-click on the waterfall |
| W19 | SDRangel | `sdrgui/gui/spectrum.md` (full file) | https://raw.githubusercontent.com/f4exb/sdrangel/master/sdrgui/gui/spectrum.md | FFT size 64…32768; nine windows (Hanning default); FFT overlap 0…FFT/2−1; averaging No/Mov/Fix/Max to 1 M ("the time scale on the waterfall display is updated accordingly"); Color Map dropdown; Autoscale = "average of FFT size ÷ 32 minima for the minimum and 10 dB over maximum"; Reference level 0…−110 dB and Range 1…100 dB; `Cur:` power+frequency under cursor and `Pk:` peak, both optional; FPS capping; freeze |
| W20 | SDRangel | same file, §C.1 "Waterfall Scrolling" | as W19 | Optional scroll bar; spectra stored in memory beyond the displayed waterfall; "Length (Spectra)" sets the buffer; RAM required and total time duration are shown to the user |
| W21 | SDRangel | same file, §C.2 "Waterfall Axis" | as W19 | Vertical time axis with units Time offset / Local time / UTC (the latter two only with scrolling on) and a configurable time format |
| W22 | SDRangel | same file, §B.6.3–B.6.5 | as W19 | Load/save spectrum or scroll buffer to CSV; save the current display to PNG or JPG |
| W23 | SDRangel | same file, "Mouse scroll wheel" A–D | as W19 | Wheel over the spectrum/waterfall zooms X 1×–10× in 0.5 steps; Alt+left-click sets centre; wheel **inside the time scale** changes FFT overlap — the only "time zoom", and it re-analyses |
| W24 | SDRangel | `sdrgui/gui/spectrummarkers.md` | https://raw.githubusercontent.com/f4exb/sdrangel/master/sdrgui/gui/spectrummarkers.md | Histogram markers (power at a frequency, max-hold, peak assignment), **waterfall markers carrying a time coordinate**, and annotation markers (text over a bandwidth) that import/export to CSV. No harmonic/comb feature |
| W25 | SDRangel | same file as W19, §B.4.6 math modes | as W19 | `x−μ`, `x−μ dB`, `x−μ+∧μ dB`, `\|x−μ\| dB`, `x−M1`/`x−M2` — background subtraction against a moving average or a stored spectrum, with a mode that adds the mean back to preserve level |
| W26 | WebSDR | `dist11/pub2/websdr-controls.html` (mirror of the deployed control panel) | https://raw.githubusercontent.com/FarnhamSDR/websdr/master/dist11/pub2/websdr-controls.html | Keys `j k ← →` frequency, `u l c a f` modes, `z Z` centre/zoom, `g` enter frequency. Speed: super slow…fast. Size: small…huge. View: spectrum/waterfall/weak/strong. Memories; draggable passband edges; S-meter; audio recording; volume; mute/squelch/autonotch; logbook capturing time and frequency. Three explicit browser-failure messages (Java disabled, no HTML5 WebAudio, no recording download) |
| W27 | WebSDR | websdr.org FAQ | https://www.websdr.org/faq.html | Bandwidth "depends on how many waterfall displays each user has … and the scroll speed of those waterfalls" — scroll speed is a per-user setting |
| W28 | WebSDR | OARC wiki, "How to use WebSDR sites" | https://wiki.oarc.uk/using_sdr | The waterfall "constantly scrolls" showing "the last 5-10 seconds of history"; wheel zoom; drag to move |
| W29 | PAMGuard | Help: "PAMGuard Viewer" | https://www.pamguard.org/olhelp/overview/PamMasterHelp/docs/viewerMode.html | Outer scroller loads a section (≈30 min), inner scroller navigates within it; data start time, loaded duration and step-size options; view duration adjustable by typing or arrows; "Pressing the play button will cause the scroll bar to advance automatically", play speeds on the right-click menu; scrollers coupled across displays; Data Map auto-loads; the spectrogram re-processes raw audio |
| W30 | PAMGuard | Help: "Configuring a Spectrogram Display" | https://www.pamguard.org/olhelp/displays/spectrogramDisplayHelp/docs/UserDisplay_Spectrogram_Configuring.html | FFT source selected from an FFT engine module; frequency range default 0…Fs/2; amplitude range as colour min/max; time scale as pixels per FFT bin or total display time; multiple panels; overlay panels that "scroll in synchrony"; Mark Observers — press-and-drag draws a red rectangle |
| W31 | PAMGuard | Help: "Quick Annotations — Using, Editing and Deleting" | https://www.pamguard.org/olhelp/utilities/quickAnnotations/docs/using.html | Select a label then drag across the spectrogram to create an annotation; optional notes; stores time and frequency bounds plus label and auto-computed SNR and sound-pressure measures; "drag the edges of the marks with the mouse to alter the time and frequency limits" |
| W32 | PAMGuard | Help: "Sound Output Control" | https://www.pamguard.org/olhelp/sound_processing/soundPlaybackHelp/docs/soundPlayback_Control.html | Speed slider for file/simulated/viewer sources only; speed proportionally changes frequency (half speed halves frequencies); gain; a high-pass filter slider; envelope tracing mixed with raw audio so ultrasonic clicks and audible whistles are heard together |
| W33 | naval sonar | US Naval Academy ES310, "Basic Sonar System" (FAS mirror) | https://man.fas.org/dod-101/navy/docs/es310/asw_sys/asw_sys.htm | "For a particular beam, the time history of the frequency is called a waterfall display"; mini-waterfalls are called "grams"; **"The newest information is at the top of the display"**; display time history is adjustable, short for "close contacts whose bearings are changing rapidly", long "for detecting long range contacts, whose bearings are only changing slowly" |
| W36 | OpenWebRX, KiwiSDR | both clients' `index.html`, grepped for `aria-`, `role=`, `prefers-reduced-motion` | https://raw.githubusercontent.com/jketterl/openwebrx/master/htdocs/index.html · https://raw.githubusercontent.com/jks-prv/Beagle_SDR_GPS/master/web/openwebrx/index.html | Zero matches in either file — no ARIA attributes, no roles, no reduced-motion handling |
| W37 | PAMGuard | CRP-PAM Lab Manual, "PAMGuard User Tips" | https://pifsc-protected-species-division.github.io/CRP_PAM_Manual/content/PAMGuard.html | "The zoom feature can be used by placing the cursor in the spectrogram window and scrolling upwards with the mouse scroll wheel"; right-clicking the options button couples all scrollers |
| W38 | KiwiSDR | source: `openwebrx.js` line 13443, `wf_fft_size = parseInt(param[1])` | as W7 | The client's FFT size arrives from the server; the listener cannot change it at runtime |
| W39 | OpenWebRX | community post, "Enabling auto-adjust waterfall colors by default" | https://blog.gudynas.lt/2023/09/24/enabling-auto-adjust-waterfall-colors-by-default-openwebrx/ | Third-party recipe to make auto colour adjustment the default — evidence that shipped colour defaults are judged inadequate for first-time users |

#### A — acoustic and bioacoustic analysis tools

| id | precedent | what was read | URL | fact evidenced |
|---|---|---|---|---|
| A1 | Raven Pro 1.4 | Ch.1, "Filtered play" (p.9) | https://ravensoundsoftware.com/wp-content/uploads/2017/11/Raven14UsersManual.pdf | "When filtered play is turned on, Raven plays only the frequencies within the bounds of the selection… to listen to only the higher harmonics of a sound, for example, or to listen only to a low-frequency animal call and not the high-frequency call recorded at the same time" |
| A2 | Raven Pro 1.4 | Ch.1, "Scrolling playback and position markers" (p.10) | same PDF | "In scrolling playback, the signal view scrolls from right to left beneath the position marker, like tape moving past the playback head of a tape recorder"; green playback cursor; magenta position markers |
| A3 | Raven Pro 1.4 | Ch.1, sidebar on scrolling playback (p.11) | same PDF | "During scrolling playback, you can drag the scroll thumb to move the signal so that a particular point of interest is at the time position marker. The sound stops playing while you drag the scroll thumb and resumes immediately at the new time position when you release the scroll thumb." |
| A4 | Raven Pro 1.4 | Ch.1, "Looping and reverse playback" (p.10) | same PDF | "To loop a sound window or selection to hear it many times, click on the Looping Play button"; reverse play also present |
| A5 | Raven Pro 1.4 | Ch.1, "Playback rate" (p.11) | same PDF | Rate typed into a box, default 1.0, no documented bound. "Slowing down the rate makes the sound lower in pitch and slower; speeding it up makes it higher in pitch and faster." |
| A6 | Raven Pro 1.4 | Ch.3, "Spectrogram brightness and contrast" (pp.68–69) | same PDF | "If your spectrogram looks too dark or light, or if it's hard to pick the signal out of the background, move the brightness and contrast sliders…"; the Configure dialog adds floor/ceiling power thresholds "and displays a plot illustrating how colors are assigned to each value" |
| A7 | Raven Pro 1.4 | Ch.3, "Color schemes of sound windows" (p.70) | same PDF | Six predefined colormaps: Grayscale, Hot, Cool, Standard Gamma II, Bone, Copper |
| A8 | Raven Pro 1.4 | Ch.3, "Color Bar View" (p.66) | same PDF | "A color bar view serves as a key to the current spectrogram color scheme. It displays the spectrum of colors in the color scheme along with their associated intensity values." |
| A9 | Raven Pro 1.4 | Ch.2, mouse measurement field (p.43) | same PDF | "When moving the mouse pointer over a spectrogram view, the time and frequency of the pointer's location, and the relative power at that time and frequency are shown in the mouse measurement field" |
| A10 | Raven Pro 1.4 | Ch.5, Fig. 5.12 caption + Clipping Level (pp.125–126) | https://ravensoundsoftware.com/wp-content/uploads/2019/03/Raven14UsersManual_configuringSpectrogramViews-1.pdf | "The underlying power values have not changed so all measurement values will be the same as those measured in the first row"; and "the only way to change the noise floor is to recalculate the spectrogram, specifying a different Clipping Level" |
| A11 | Raven Pro 1.4 | Ch.5, window type / DFT size / hop &amp; overlap / auto-apply / presets | same ch.5 PDF | Six windows; hop in samples/seconds/ms or as overlap %, with Lock Overlap vs Lock Hop Size and Lock DFT Size; "If the Auto-apply checkbox is checked, Raven immediately recalculates and displays the spectrogram each time you change any parameter"; presets savable; warning that negative overlap "can give an extremely mis-leading picture of a signal" |
| A12 | Raven Pro 1.4 | Ch.2 keyboard shortcuts (pp.38–39), view toolbar zoom (p.53) | https://ravensoundsoftware.com/wp-content/uploads/2017/11/Raven14UsersManual.pdf | Play = Ctrl+Shift+P; Play Visible = Ctrl+Shift+Y; "Move Horizontal Position Indicator — Ctrl+Click"; "Scroll sound and position marker — Ctrl+Shift+Click"; Zoom In/Out X and Y, Zoom to Selection, Zoom to All. No space-bar transport |
| A13 | Raven Pro 1.4 | Ch.6/Ch.7, paged sound windows (pp.160, 187–191) | same PDF | "Paged sound windows provide a mechanism for working with sounds that are too large to fit in the memory available to Raven"; the selection table lists all selections "irrespective of whether the selections are presently in memory"; activating a row navigates to it |
| A14 | Raven Pro 1.4 | Ch.6 measurements/annotations/export; Ch.11 volume control | same PDF | Selection tables with measurement and annotation columns saved to file; "Exporting samples from various views to text files"; *Export Image Of…*; the Volume Control dialog is the operating system's mixer |
| A15 | Audacity 3.x | Spectrogram Settings | https://manual.audacityteam.org/man/spectrogram_settings.html | Scale, Min/Max Frequency, **Gain (dB)** "Increases / decreases the brightness of the display" (default 20), **Range (dB)** (default 80), Frequency Gain, Scheme "Choice of two colorways or two grayscale settings", Algorithm, Window Size, Window type (Hann default), Zero padding factor. Per-track, changeable while open. **No overlap/hop control** |
| A16 | Audacity 3.x | Spectrogram View | https://manual.audacityteam.org/man/spectrogram_view.html | Colour→dB bands described in prose only (white above −20 dB … black below −100 dB); frequency zoom via the vertical scale; no pointer dB or frequency readout documented |
| A17 | Audacity 3.x | Timeline | https://manual.audacityteam.org/man/timeline.html | Quick-Play: "Simply click into the timeline to play from that point"; pinned play head — "the head remains static and the waveforms will move as the audio is played or recorded", off by default, draggable during play; "By default the waveform scrolls when playing. Disabling this option so as not to scroll can be useful when using Quick-Play to adjust the start and end of loops"; loop region created by left-drag |
| A18 | Audacity 3.x | Play-at-Speed Toolbar | https://manual.audacityteam.org/man/play_at_speed_toolbar.html | "lets you Play or Loop Play audio at a slower or faster speed than normal, also affecting **pitch**"; pitch-preserving change requires the Change Tempo effect |
| A19 | Audacity 3.x | Spectral Selection | https://manual.audacityteam.org/man/spectral_selection.html | Time+frequency selection by click-drag; centre frequency is a geometric mean; "those effects and commands will not take into account the frequency range of the spectral selection" — no band-limited playback |
| A20 | Audacity 3.x | Plot Spectrum | https://manual.audacityteam.org/man/plot_spectrum.html | Single-slice spectrum of the selection in a modal dialog; "Export — Exports the spectrum to a text file" |
| A21 | Audacity (source) | `SpecCache::Matches`, lines 79–96 | https://raw.githubusercontent.com/audacity/audacity/master/src/spectrogram/internal/au3/SpectrumCache.cpp | Cache validity compares samples-per-pixel, dirty, `windowType`, `windowSize`, `zeroPaddingFactor`, `frequencyGain`, `algorithm` — **not** `gain` or `range`. Changing Gain/Range re-maps colours from retained magnitudes with no re-FFT |
| A22 | Audacity 3.x | Transport Toolbar | https://manual.audacityteam.org/man/transport_toolbar.html | Play/Stop = Space; Skip to Start = Home; Skip to End = End; Loop = L |
| A23 | Audacity 3.x | Label Tracks | https://manual.audacityteam.org/man/label_tracks.html | Labels added with Ctrl+B; "Label Tracks are included when saving an Audacity Project"; exported to and imported from plain text; the Label Editor edits start/end time "and also its Low Frequency and High Frequency" |
| A24 | Audacity 3.x | Meter Toolbars | https://manual.audacityteam.org/man/meter_toolbar.html | "The playback volume slider… affects only the volume delivered to your speaker, it does not affect the amplitude of the project's audio" |
| A25 | Sonic Visualiser 3.2.1 | Reference — Spectrogram layer properties | https://sonicvisualiser.org/doc/reference/3.2.1/en/ | Colour maps; Colour Scale (Linear, Meter, dBV, dBV², Phase); **Gain** applied "before applying the display colour map"; **Threshold**; Colour Rotation; Window Size; Window Overlap; Window Shape; Bin Display; Frequency Scale; **Normalize Columns**; **Normalize Visible Area** |
| A26 | Sonic Visualiser 3.2.1 | Reference — Follow Playback | same URL | "The Follow Playback control allows you to choose whether the pane will track playback using a playback cursor, paging when it reaches the edge of the pane (Page); or whether it will scroll along with the playback (Scroll); or neither" |
| A27 | Sonic Visualiser 3.2.1 | Reference — playback speed, loop, selection play | same URL | "you can adjust playback speed from one-tenth to ten times the original speed **without affecting its pitch**, although the sound quality will suffer"; Play Loop toggle; Play Selection toggle |
| A28 | Sonic Visualiser 3.2.1 | Reference — harmonic cursor | same URL | "a vertical line with tick marks at the frequencies of the second harmonic, third harmonic and so on of the frequency that the mouse is currently pointing at" (measure tool) |
| A29 | Sonic Visualiser 3.2.1 | Reference — overview, export, session, keys, navigation | same URL | "Click and drag in the small overview waveform shown at the bottom of the main window, to scroll all of the panes without moving the playback position"; Export Image File; Export Annotation Layer; a session records the layer data and display properties; Space play/pause, Page Up/Down, Home/End; double-click to navigate |
| A30 | Sonic Visualiser (source) | `SpectrogramLayer::getFeatureDescription` | https://raw.githubusercontent.com/sonic-visualiser/svgui/default/layer/SpectrogramLayer.cpp | The hover description is `Time:` / `Peak Frequency:` / `Bin Frequency: … Hz` / `Bin Pitch:` / **`dB: …`** / `Phase:` |
| A31 | Sonic Visualiser (source) | `SpectrogramLayer::setGain`, lines 933–943 | same raw URL | `setGain` calls `invalidateRenderers()` and updates `m_gain` only; the FFT model is untouched |
| A32 | PAMGuard 2.x (source) | `SpectrogramParameters.java` | https://raw.githubusercontent.com/PAMGuard/PAMGuard/master/src/Spectrogram/SpectrogramParameters.java | `wrapDisplay = true` ("Wraps display if this is true (default)"); `displayLength = 20` s; `colourMap` default GREY; `amplitudeLimits = {50, 120}` dB; `showScale = true`; `frequencyLimits`; `timeScaleFixed`, `pixelsPerSlice` |
| A33 | PAMGuard 2.x (source) | `SpectrogramParamsDialog.java` | https://github.com/PAMGuard/PAMGuard/blob/master/src/Spectrogram/SpectrogramParamsDialog.java | `JRadioButton("Wrap Display")` and `JRadioButton("Scroll Display")` in one ButtonGroup — the two scroll models as an explicit user choice; `DirectDrawProjector.getCoord3d` carries the wrap arithmetic |
| A34 | PAMGuard 2.x | Configuring a Spectrogram Display (help) | https://www.pamguard.org/olhelp/displays/spectrogramDisplayHelp/docs/UserDisplay_Spectrogram_Configuring.html | "options are specified when the display is first created; in addition, they can be adjusted at any time using the popup menu"; FFT source; frequency range; "Set the Amplitude Range…"; time range as pixels per FFT bin or total length |
| A35 | PAMGuard 2.x | PAMGuard Viewer (help) | https://www.pamguard.org/olhelp/overview/PamMasterHelp/docs/viewerMode.html | "an outer scroller controls the loading of data into memory and an inner scroller moves through that data"; a duration box; scrollers coupled; "Pressing the play button will cause the scroll bar to advance automatically… Right click on the button to select different play speeds" |
| A36 | PAMGuard 2.x | Spectrogram display + DIFAR "Using the Spectrogram" | https://www.pamguard.org/olhelp/displays/spectrogramDisplayHelp/docs/UserDisplay_Spectrogram.html · https://www.pamguard.org/olhelp/localisation/difar/difarLocalisation/docs/difar_UsingSpectrogram.html | Detector overlays on the spectrogram; Mark Observers give "a red rectangle… when you press and drag the mouse"; "To mark a sound simply place the mouse on the spectrogram at the start of a sound and drag to the end of a sound", marks queued, classified, coloured and persisted |
| A37 | PAMGuard 2.x (source) | `DetectionGroupTablePanel.GroupTableCommands` | https://github.com/PAMGuard/PAMGuard/blob/master/src/PamguardMVC/superdet/swing/DetectionGroupTablePanel.java | "Scroll displays to the given group… secsBefore number of seconds before the group start to scroll to" — a jump-to-detection list driving the displays |
| A38 | iZotope RX 11 | Spectrogram/Waveform Display | https://docs.izotope.com/rx11/en/spectrogram-waveform-display.html | Spectrogram Settings: type, FFT size, reassignment, window, frequency scale, frequency overlap, time overlap, colour map, high-quality rendering, **Reduce Quality Above**, **Cache Size (MB)**. Colour Map Ruler: "Click and drag the map to change the range and use the scroll wheel to make the range larger or smaller". Waveform Overview of the whole file, draggable |
| A39 | iZotope RX 8 | Transport Controls &amp; Displays | https://s3.amazonaws.com/izotopedownloads/docs/rx8/en/transport-controls/index.html | Play [Space]; Rewind "Brings you back to the start of the file" [Enter]; Loop [Ctrl/Cmd+L]; **Play Selection Only** — "When you've made a selection of a time range, frequency range, or both, this button auditions just the selection (useful for isolating intermittent noises, etc.)"; playhead placed by a single click and draggable "in real time during playback" |
| A40 | iZotope RX 6 | Preferences | https://downloads.izotope.com/docs/rx6/12-preferences/index.html | "Display cursor coordinates in status bar" — time, amplitude at the cursor and frequency at the cursor, in the status bar at the bottom of the window |
| A41 | Praat 6.x | Advanced spectrogram settings… | https://www.fon.hum.uva.nl/praat/manual/Advanced_spectrogram_settings___.html | "All values that are more than *Dynamic range* dB below the maximum… will be drawn in white"; "if autoscaling is on (which is the standard), Praat will use the maximum of the visible part of the spectrogram instead; this ensures that the window will always look well, but it also means that the blackness of a certain part of the spectrogram will change as you scroll"; dynamic compression 0–1 with the 24 dB worked example; six window shapes; time and frequency step |
| A42 | Praat 6.x | Intro 3.2 — Configuring the spectrogram | https://www.fon.hum.uva.nl/praat/manual/Intro_3_2__Configuring_the_spectrogram.html | View range default 0–5000 Hz; window length default 5 ms; "To get a 'broad-band' spectrogram (bandwidth 260 Hz), keep the standard window length of 5 ms; to get a 'narrow-band' spectrogram (bandwidth 43 Hz), set it to 30 ms"; "there is a trade-off between time resolution and frequency resolution" |
| A43 | Praat 6.x | Intro 3.1 — Viewing a spectrogram | https://www.fon.hum.uva.nl/praat/manual/Intro_3_1__Viewing_a_spectrogram.html | "just click in the spectrogram and you will see the vertical time cursor showing the time above the waveform and the horizontal frequency cursor showing the frequency to the left" — a click readout, not a hover readout |

#### M — web media players

| id | precedent | what was read | URL | fact evidenced |
|---|---|---|---|---|
| M1 | Chromium | `media_controls_impl.cc` — `HandleKeyboardEventFromMediaElement` (1697–1726), `kNumberOfSecondsToJump` (157), `MaybeJump`, `HandleClickEvent` | https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/modules/media_controls/media_controls_impl.cc | Native controls bind only `Enter`/`Space` → play button, `←`/`→`/`Home`/`End` → timeline, `↑`/`↓` → volume slider (invoked 5×). No `K`, `J`, `L`, `M`, `F`. The 10 s jump constant is the **double-tap touch** gesture, not a key. Clicking the video toggles play |
| M2 | Chromium | `media_control_slider_element.cc:87` (`step="any"`) and `range_input_type.cc:199-256` `HandleKeydownEvent` | https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/html/forms/range_input_type.cc | With `step="any"` the arrows move `(max−min)/100`, PageUp/Down `(max−min)/10`, Home/End to the ends — native arrow seek is **1 % of duration**, and the 5× volume loop is 5 % per press |
| M3 | Chromium | `media_control_timeline_element.cc` — `SetDuration` (120–125), `MaybeUpdateTimelineInterval` (244–255) | https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/modules/media_controls/elements/media_control_timeline_element.cc | For live media, `min` = seekable start and `max` = expected media time now — a sliding window whose right edge is "now" |
| M4 | Chromium | same file, `RenderBarSegments` (255–305), `GetCurrentBufferedTimeRange` | same as M3 | The seek bar shades the buffered range containing the playhead |
| M5 | Chromium | same file, `UpdateAria` (75–100), refreshed on `SetPosition` and on focus | same as M3 | `aria-label` + `aria-valuetext` (current time) + `aria-description` (total time); source comments explain `aria-valuenow` cannot carry a friendly value |
| M6 | Chromium | `media_control_play_button_element.cc` `UpdateDisplayType`; grep for `aria-live` in `media_controls_impl.cc` | https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/modules/media_controls/elements/media_control_play_button_element.cc | Play state is conveyed only by flipping `aria-label`; there is **no** live region in the native controls |
| M7 | Chromium | `media_control_playback_speed_list_element.cc:39-48` `kPlaybackSpeeds` | https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/modules/media_controls/elements/media_control_playback_speed_list_element.cc | Native overflow rate menu = 0.25 / 0.5 / 0.75 / Normal / 1.25 / 1.5 / 1.75 / 2 |
| M8 | MDN | `HTMLMediaElement.preservesPitch` | https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/preservesPitch | "A boolean value defaulting to `true`"; `false` makes pitch follow rate; Baseline widely available since December 2023 |
| M9 | YouTube | Keyboard shortcuts help page | https://support.google.com/youtube/answer/7631406?hl=en | `Space`/`k` play-pause, `j`/`l` ∓/±10 s, arrows ±5 s "on the seek bar", Home/End "on the seek bar", ↑/↓ volume 5 %, `m` mute, `<`/`>` rate, `0` to start, `1`–`9` = 10–90 %. Also "Spacebar: Play/Pause when the seek bar is selected. Activate a button if a button has focus" and "you must click the video player before using keyboard shortcuts" |
| M10 | YouTube | "Loop videos or playlists" help page | https://support.google.com/youtube/answer/10788593 | Loop = right-click → Loop, whole video only. No A–B loop mentioned |
| M11 | YouTube | 9to5Google on the web custom playback-speed slider (Dec 2024) | https://9to5google.com/2024/12/12/youtube-custom-playback-speed/ | A "Custom" slider in 0.05× steps, still bounded 0.25–2.00; the eight-step ladder remains beneath it |
| M12 | YouTube | Android Police, "YouTube now lets you loop individual video chapters" | https://www.androidpolice.com/youtube-now-lets-you-loop-individual-video-chapters/ | Chapters exist as a menu and as seek-bar segmentation; a Loop button in the Chapters menu repeats one chapter — an A–B loop constrained to chapter boundaries |
| M13 | Avid (origin of J/K/L) | MediaCentral help, "Using the J-K-L Keys for Playback" | https://help.avid.com/MediaCentral/MediaCentralCloudUX/MCCUX_Help/NUX_UG_Media.06.06.html | "three-button play or variable-speed play … use three fingers to manipulate the speed of playback for greater control": `L` forward, repeated presses 2×/3×/4×; `J` backward likewise; `K` stop; `K+L`/`K+J` ¼ speed; hold `K` + tap = frame step |
| M14 | video.js 8 | `src/js/player.js` — `handleKeyDown` (3323–3330), `handleHotkeys` (3385–3418) | https://raw.githubusercontent.com/videojs/video.js/main/src/js/player.js | Hotkeys are inert unless `userActions.hotkeys` is set; the defaults are only `f`, `m`, and `k` or `' '` |
| M15 | video.js 8 | `src/js/control-bar/progress-control/seek-bar.js` — `handleKeyDown` (528–569), `options_` (599–606), `liveTracker` | https://raw.githubusercontent.com/videojs/video.js/main/src/js/control-bar/progress-control/seek-bar.js | Seek-bar keys: Space/Enter play-pause, Home/End, digits `0`–`9` = 0–90 %, PageDown/PageUp = `stepSeconds × pageMultiplier`; defaults `stepSeconds: 5, pageMultiplier: 12` (= 60 s). For live, duration is `liveTracker.liveCurrentTime()` |
| M16 | video.js 8 | `src/js/slider/slider.js` — `handleKeyDown` (311–351), `createEl` (134–137) | https://raw.githubusercontent.com/videojs/video.js/main/src/js/slider/slider.js | Arrow left/down = `stepBack`, right/up = `stepForward`; every slider carries `role="slider"` with `aria-valuenow/min/max` |
| M17 | video.js 8 | `seek-bar.js` `update` (160–200) | same as M15 | `aria-valuenow` (percent) and a localised `aria-valuetext` ("{1} of {2}") refreshed as time advances; a progress-bar time tooltip follows the playhead |
| M18 | video.js 8 | `src/js/clickable-component.js`; repo-wide search for `prefers-reduced-motion` (0 hits) | GitHub code search, `repo:videojs/video.js path:src` | Every control's `vjs-control-text` span is created with `'aria-live': 'polite'` and the comment "let the screen reader user know that the text of the element may change". No `prefers-reduced-motion` anywhere |
| M19 | Plyr 3 | README options table and feature list | https://raw.githubusercontent.com/sampotts/plyr/master/README.md | `speed.options [0.5,0.75,1,1.25,1.5,1.75,2,4]`; `markers {enabled, points:[{time,label}]}` drawn on the progress bar; `previewThumbnails` from VTT sprites; `tooltips.seek: true`; `storage` persists user settings; `urls` carries a custom download URL |
| M20 | Plyr 3 | README "Shortcuts" section | same as M19 | `0`–`9` = 0–90 %, `space` and `K` play/pause, ←/→ = `seekTime`, ↑/↓ volume, `M` mute, `F` fullscreen, `C` captions, **`L` toggle loop**. Bound when the player has focus |
| M21 | Plyr 3 | `src/js/config/defaults.js` 25, 77–90 | https://raw.githubusercontent.com/sampotts/plyr/master/src/js/config/defaults.js | `seekTime: 10`; `loop: { active: false, // start: null, // end: null }` — A–B loop commented out; `selectors.display.loop: '.plyr__progress__loop' // Used later` |
| M22 | Plyr 3 / others | `src/js/support.js`, `src/js/controls.js`; same search across Media Chrome and wavesurfer | GitHub code search for `prefers-reduced-motion` | Plyr detects `matchMedia('(prefers-reduced-motion)')` and uses it only to skip the settings-menu resize animation. Zero hits in Media Chrome and wavesurfer |
| M23 | wavesurfer.js 7 | `src/wavesurfer.ts` — options, defaults, public methods; `src/player.ts:382-387` | https://raw.githubusercontent.com/katspaugh/wavesurfer.js/main/src/wavesurfer.ts | Defaults `autoScroll: true, autoCenter: true, interact: true, dragToSeek: false, minPxPerSec: 0, sampleRate: 8000`. Methods `zoom`, `skip`, `setTime`, `exportPeaks`, `exportImage`, `setVolume`/`setMuted` (API only), and `setPlaybackRate(rate, preservePitch?)` which sets `media.preservesPitch` when the second argument is given |
| M24 | wavesurfer.js 7 | `src/renderer.ts` — `scrollIntoView` (879–916), `renderProgress` (918–932), constants (17–19) | https://raw.githubusercontent.com/katspaugh/wavesurfer.js/main/src/renderer.ts | While playing with `autoCenter`, `scrollLeft += center` each tick, capped at `SMOOTH_SCROLL_MAX_DELTA = 10` px/frame below `LOW_ZOOM_PIXELS_PER_SECOND_THRESHOLD = 600` px/s. While the user is dragging it instead nudges by a 30 px `minGap` near a viewport edge |
| M25 | wavesurfer.js 7 | `src/plugins/record.ts` — options (18–24), `drawWaveform` (152–232) | https://raw.githubusercontent.com/katspaugh/wavesurfer.js/main/src/plugins/record.ts | `scrollingWaveform` keeps a fixed `scrollingWaveformWindow` (default 5 s): the new peak is written at `tempArray[windowSize - 1]` and older samples shift off. While recording, `interact = false` and `cursorWidth = 0` |
| M26 | wavesurfer.js 7 | `src/spectrogram-setup.ts` — options (56–209), events, API | https://raw.githubusercontent.com/katspaugh/wavesurfer.js/main/src/spectrogram-setup.ts | `fftSamples`, separate zero-padded `fftSize`, `noverlap`, 10 `windowFunc`s + `alpha`, `frequencyMin`/`Max`, `scale: linear\|logarithmic\|mel\|bark\|erb`, `gainDB` (20), `rangeDB` (80), `preEmphasis`, `autoGain`, `colorMap: gray\|igray\|roseus\|number[][]`, `frequenciesDataUrl`, `maxCanvasWidth` (30000), `useWebWorker`, `workerTimeout` (30 s), `fallbackToMainThread`; magnitudes retained as `Uint8Array[][]` and re-fetchable via `getFrequenciesData()`/`clearCache()` |
| M27 | wavesurfer.js 7 | same file — doc comments on `scale`, `gainDB`, `rangeDB`, `preEmphasis`, `autoGain`, `fallbackToMainThread` | same as M26 | The only **task reasons** in this family, and they are borrowed: `scale` "Based on: manual.audacityteam.org/man/spectrogram_settings.html"; gain "For small signals where the display is mostly 'blue' (dark) you can increase this value to see brighter colors and give more detail"; `preEmphasis` "Counteracts the natural ~-6 dB/oct spectral slope of speech so formants above 1 kHz stay visible"; `autoGain` "Praat-style autoscaling" |
| M28 | wavesurfer.js 7 | same file — `SpectrogramPluginEvents` (211–217) | same as M26 | The plugin's only pointer event is `click: [relativeX: number]` — no frequency, time or dB readout |
| M29 | wavesurfer.js 7 | `src/plugins/regions.ts` — `RegionParams` (82–108), `Region.play` (654–656), the `'play'` handler (1068–1072) | https://raw.githubusercontent.com/katspaugh/wavesurfer.js/main/src/plugins/regions.ts | Regions carry start/end, `drag`, `resize`, `color`, HTML `content`, `minLength`/`maxLength`; `region.play(true)` stops at the region end via `wavesurfer.play(region.start, end)`; drag-selection creates regions; nothing persists them |
| M30 | wavesurfer.js 7 | `src/plugins/minimap.ts`, `hover.ts`, `timeline.ts`, `zoom.ts` | https://raw.githubusercontent.com/katspaugh/wavesurfer.js/main/src/plugins/minimap.ts (and siblings) | Minimap = "a tiny copy of the main waveform serving as a navigation tool"; HoverPlugin shows a **time** label only; TimelinePlugin draws ticks/labels; ZoomPlugin zooms on the wheel with no playing guard |
| M31 | wavesurfer.js 7 | GitHub code search for `"aria-"` under `src`; grep for `keydown` | GitHub code search, `repo:katspaugh/wavesurfer.js path:src` | Zero `aria-` attributes and no keydown handlers anywhere in the source |
| M32 | Media Chrome | Keyboard shortcuts documentation | https://www.media-chrome.org/docs/en/keyboard-shortcuts | `Space`/`k` play-pause, `m` mute, `f` fullscreen, `c` captions, `p` PiP, `←`/`j` −10 s, `→`/`l` +10 s, ↑/↓ volume, `<`/`>` rate, `Shift+/` help. Focus must be inside the media controller; individual elements opt out with `keysused` |
| M33 | Media Chrome | `src/js/media-playback-rate-button.ts` — `DEFAULT_RATES` | GitHub code search, `repo:muxinc/media-chrome` | `export const DEFAULT_RATES = [1, 1.2, 1.5, 1.7, 2];` — no rate below 1 |
| M34 | Media Chrome | `src/js/media-time-range.ts` plus the `<media-time-range>` docs page | https://www.media-chrome.org/docs/en/components/media-time-range | Buffered shading; hoverable **chapter segments** from a chapters VTT track; **preview thumbnails** from a metadata track; `<media-preview-time>` for the hover time |
| M35 | Media Chrome | `src/js/media-loading-indicator.ts`; `src/js/media-loop-button.ts` | GitHub code search, `repo:muxinc/media-chrome path:src/js` | The library's only `aria-live` is `role="status" aria-live="polite"` on the loading indicator. A `media-loop-button` ships as a first-class component |
| M36 | video.js 8 | `playback-rate-menu-button.js`; `control-bar.js` default children | GitHub code search, `repo:videojs/video.js path:src/js` | `playbackRates()` returns `(player.playbackRates && player.playbackRates()) \|\| []` — empty unless the author configures it, so the rate menu is hidden by default |

#### T — training, lecture and annotation players

| id | precedent | what was read | URL | fact evidenced |
|---|---|---|---|---|
| T1 | H5P Interactive Video | Product/feature page | https://h5p.org/interactive-video | Interaction types; "Add bookmarks so that your users can skip to specified sections of the video on demand"; adaptive branching on answers; "disabled skipping forward in the video under 'Behavioural settings'" |
| T2 | H5P Interactive Video | `semantics.json` (source, master) | https://raw.githubusercontent.com/h5p/h5p-interactive-video/master/semantics.json | `preventSkippingMode` = "Disable navigation" with "Forward" / "Forward and backward"; `bookmarks`, `showBookmarksmenuOnLoad`, `autoplay`, `loop`, `showRewind10`, `playbackRate`; control labels "Mute, currently unmuted" / "Unmute, currently muted" |
| T3 | H5P Interactive Video | Forum thread with an H5P staff reply | https://h5p.org/node/1377808 | User: "I still see all the stopping points and can skip forward"; staff: the feature "disables the video navigation… It does not prevent users from skipping the activities within the content" |
| T4 | H5P Interactive Video | Univ. of Queensland recommended settings | https://elearning.uq.edu.au/staff-guides-original/h5p-interactive-learning-objects/recommended-settings-and-tips-h5p-activity-types-original | Recommends "Prevent skipping forward" to "ensure students do not skip ahead and actually watch the entire video"; enable the 10-second rewind "to help students revisit missed sections" |
| T5 | H5P Interactive Video | LibreStudio accessibility guide | https://studio.libretexts.org/help/h5p-accessibility/interactive-video | "The activity is usable with the keyboard"; focus not retained inside popups; "focus indicator does not have good color contrast" |
| T6 | H5P.com | Accessibility statement | https://help.h5p.com/hc/en-us/articles/7505444789405-Accessibility-statement-for-H5P-com | Stated goal WCAG 2.2 AA; tested with screen readers, keyboard and zoom; no reduced-motion claim |
| T7 | H5P Video | Playback-rate discussion citing the rate list in `h5p-video` | https://h5p.org/node/1080856 | Rate options `[0.25, 0.5, 1, 1.25, 1.5, 2]`; Interactive Video takes its list from H5P.Video |
| T8 | Storyline 360 | Seekbar modes (community + third-party how-to) | https://community.articulate.com/discussions/articulate-storyline/player-seekbar-functionality | Player→Features→Seekbar options "Allow drag at any time", "Read-only", "Allow drag after completion"; disabling the *video* seekbar needs custom JavaScript |
| T9 | Storyline 360 | Conditional seekbar | https://articulate.com/support/article/Storyline-360-How-to-Use-the-Conditional-Seekbar | Locks the seekbar on first view of a slide and unlocks it after completion |
| T10 | Storyline / restricted nav | The Articulate Trainer, "Tips when using restricted navigation" | https://www.thearticulatetrainer.com/what-are-some-tips-when-using-restricted-navigation/ | "restricted navigation allows organizations to ensure that users see all content", and learners "may be required to spend a certain amount of time in the course, which is usually the case with certification or compliance-based courses" |
| T11 | Rise 360 | Video block forward-seeking setting | https://community.articulate.com/discussions/rise-360/new-feature-in-rise-disable-forward-seeking | Per-video-block Settings checkbox "Allow forward seeking"; unchecking disables forward seek for that block only |
| T12 | Storyline 360 | Accessibility maturity plan | https://www.articulate.com/about/accessibility/storyline-360-accessibility-maturity-plan/ | Targets WCAG AA; ACR/VPAT published; delivered "modern player controls meeting WCAG 2.2 minimum target size", "keyboard-accessible playback speed controls", "screen reader announcements for player elements"; ~27 named gaps remain |
| T13 | Storyline 360 | Accessible player article | https://articulate.com/support/article/Storyline-360-Accessible-Player | Shortcut list on Shift+?; the seekbar shows position "by minutes and seconds"; NVDA / VoiceOver / TalkBack support; shortcuts for mute, replay slide, captions |
| T14 | Storyline 360 | Course playback speed control | https://articulate.com/support/article/Storyline-360-Course-Playback-Speed-Control | Learners choose "a course playback speed between 0.25x and 2x" |
| T15 | Panopto | "How to Disable Variable Speed Playback (VSP) and Seek" | https://support.panopto.com/s/article/How-to-Disable-Variable-Speed-Playback-and-Seek | Site-wide "Features - Viewer - Disable Seek and Variable Speed Playback (VSP)", now also session-level; a companion "Percentage Threshold" setting lifts the restriction after a set proportion is watched |
| T16 | Panopto | Community thread on preventing fast-forward | https://community.panopto.com/discussion/267/is-there-any-way-to-prevent-viewers-from-fast-forwarding-playback | Use case is mandatory training gated on a survey; hidden setting `disableseekandvsp`; with seek off "users cannot click on slides or navigate via the table of contents, though they can view thumbnails"; an admin objects that the lock blocks efficient re-watching |
| T17 | Panopto | University at Buffalo viewer guide | https://www.buffalo.edu/ubit/service-guides/teaching-technology/teaching-services-for-faculty/panopto/instructions/viewing-recording.html | "The Speed button allows you to control the video playback speed, from .5x up to 2x"; captions; "Search this recording"; Table of Contents, Bookmarks and Notes panels |
| T18 | Panopto | Aalto University wiki, Panopto Player | https://wiki.aalto.fi/display/OPIT/Panopto+Player | Keys: Space play/pause, ←/→ ±5 s, ↑/↓ volume, M mute; skip-back 10 s button; timestamped thumbnails; notes "to refresh your memory later"; bookmarks "Save a particular spot in a recording to revisit at a later time" |
| T19 | Panopto | Community feature request, playback-speed shortcuts | https://community.panopto.com/discussion/1660/playback-speed-keyboard-shortcuts-desktop | No rate keyboard shortcut exists; the request models it on YouTube's `<` / `>`; a commenter calls it an "EXCELLENT ACCESSIBILITY upgrade" |
| T20 | Panopto | Lancaster University accessibility statement | https://www.lancaster.ac.uk/accessibility-statement/other-applications/panopto/ | "partially compliant with the Web Content Accessibility Guidelines version 2.2 AA standard"; named failures include insufficient contrast and "Some elements on the page have missing labels" |
| T21 | Panopto | Vendor accessibility page + 2025 ACR | https://www.panopto.com/capabilities/accessibility/ | Evaluated against WCAG 2.1 AA and Section 508; testing with NVDA, IBM Equal Access and an independent third-party audit |
| T22 | Echo360 | Flagging and bookmarking content | https://support.echo360.com/hc/en-us/articles/11077695519885-EchoVideo-Flagging-and-Bookmarking-Content | Bookmarks "identify classroom material you want to return to later"; confusion flags carry "the location of the presentation at the time it was flagged"; bookmarks stored in the student's Study Guide; instructors are notified of flags |
| T23 | Echo360 | Taking notes | https://support.echo360.com/hc/en-us/articles/11077653922061-EchoVideo-Taking-Notes | Notes carry an editable "Video Timestamp" in `hh:mm:ss`; clicking returns to that point |
| T24 | Echo360 | Accessibility page + VPAT | https://echo360.com/accessibility/ | "Echo360 solutions comply with … WCAG 2.2 Level AA, including Section 508"; third-party audit documented in a VPAT |
| T25 | ELAN | Manual: Media Files and Annotation Files | https://www.mpi.nl/tools/elan/docs/manual/Sec_Media_Files_and_Annotation_Files.html | "All information (e.g., the tier setup, the time alignment, the annotations) is saved to the annotation file only – never to the media file(s)" |
| T26 | ELAN | EAF specification (CLARIN SIS) | https://standards.clarin.eu/sis/views/view-spec.xq?id=SpecEAF | `TIME_UNITS="milliseconds"`; a `TIME_ORDER` of `TIME_SLOT` elements with integer `TIME_VALUE`; `ALIGNABLE_ANNOTATION` references two slots |
| T27 | ELAN | Manual: The Spectrogram Viewer | https://www.mpi.nl/tools/elan/docs/manual/Sec_The_Spectrogram_Viewer.html | Window function drop-down; window length; stride length; frequency min/max; grayscale / reversed grayscale / colour gradient; "Adaptive contrast" that "adapts to the actual values in the current visible interval"; foreground/background brightness correction; red crosshair; blue selection lines; no dB readout or legend |
| T28 | ELAN | Manual: The Waveform Viewer | https://www.mpi.nl/tools/elan/docs/manual/Sec_The_Waveform_Viewer.html | Red crosshair for current time; selection highlighted light blue; "you can press ALT and drag the time axis for a panning effect" |
| T29 | ELAN | Manual: The Timeline Viewer and the Interlinear Viewer | https://www.mpi.nl/tools/elan/docs/manual/Sec_The_Timeline_Viewer_and_the_Interlinear_Viewer.html | Each annotation "corresponds to a specific time interval"; crosshair; hideable time ruler; horizontal zoom; **Ticker Mode** — "the crosshair will stop when it reaches the center of the viewer, while the viewer itself scrolls to the left"; default is a page jump |
| T30 | ELAN | Manual: Playing in slow motion + Controls tab | https://www.mpi.nl/corpus/html/elan/ch04s07s04.html | Rate slider right of the video window; "ELAN accepts rates between 1% and 200%"; Loop Mode plays the selection repeatedly; Selection Mode |
| T31 | ELAN | Manual: The Annotation Density Viewer | https://www.mpi.nl/corpus/html/elan/ch04s05s03.html | Shows annotation density across the file for all tiers, or filtered by tier / type / participant / annotator |
| T32 | ELAN | Manual: Export as | https://www.mpi.nl/tools/elan/docs/manual/Sec_Export_as.html | Exports include Toolbox, FLEx, CHAT, tab-delimited text, Tiger XML, interlinear text, HTML, **Praat TextGrid**, **WebAnnotation JSON**, subtitle text, plus **Image from ELAN Window** and **Annotation Density Plot** |
| T33 | ELAN | Manual: The shortcut keys | https://www.mpi.nl/tools/elan/docs/manual/Sec_The_shortcut_keys.html | Default shortcuts for playing and making selections exist and "can be customized in the Edit Keyboard Shortcuts window" |
| T34 | VideoAnt | Official documentation | https://ant.umn.edu/documentation | Creating an annotation stops playback and opens a form; "Every annotation is marked in the video timeline by a small, draggable marker"; annotations are tied to "a specific point on a video's timeline"; no keyboard or accessibility statement |
| T35 | VideoAnt | Help/export descriptions | https://ant.umn.edu/help | Annotations and comments exportable as text and as RSS, JSON or XML; Ants embeddable in an LMS or web page |
| T36 | Hypothesis | Annotating YouTube videos with the LMS app | https://web.hypothes.is/help/annotating-youtube-videos-with-the-hypothesis-lms-app/ | Annotations anchor to **transcript text**, not to a timestamp; clicking transcript "jump[s] to that section of the video" |
| T37 | Research | Murphy, Hoover, Agadzhanyan, Kuehn &amp; Castel (2022), *Applied Cognitive Psychology* (ERIC record) | https://eric.ed.gov/?id=EJ1325295 | "Results revealed minimal costs incurred by increasing video speed from 1x to 1.5x, or 2x speed, but performance declined beyond 2x speed" |
| T38 | Standard | WCAG 2.2 Understanding 2.2.2 Pause, Stop, Hide | https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html | Moving/blinking/scrolling information that starts automatically, lasts over five seconds and runs in parallel with other content needs a pause/stop/hide mechanism; beneficiaries include people with attention deficits and those who cannot track moving objects |
| T39 | Absorb LMS | "Disable Video Seeking" | https://support.absorblms.com/hc/en-us/articles/18767076921491-Disable-Video-Seeking | The feature exists to make learners watch in full, but the vendor concedes that once watched in full a learner "should also be able to scan through the video to review parts of the content" |
| T40 | Criticism | Practitioner commentary on unskippable training video | https://www.clrn.org/how-to-skip-unskippable-training-videos/ | Unskippable videos described as "seemingly designed to maximize seat time rather than efficient learning" |

## 9. Risks and open questions

**Evidence risks.**

- **No live SDR receiver could be observed** (probe (c)): five hosts failed at the
  network boundary. The whole W family is evidenced from source and manuals, so any
  behaviour that depends on a receiver operator's configuration is scored ◐ rather
  than ✓. If the SDR rows ever drive a decision, they should be re-checked against a
  live receiver from an unproxied network.
- **Probe (a) could not measure audibility.** Headless Chromium uses a fake audio sink
  and the `AnalyserNode` tap appeared to sit upstream of rate processing — the same RMS
  and the same 441 Hz peak were reported at every rate. The `preservesPitch` conclusion
  rests on the Chromium source and MDN [M8], not on the analyser. Anyone acting on §6.2
  should confirm by ear on a real machine first; it takes a minute.
- **Probe (b) was run on Chromium only**, on one machine, with no features drawn over
  the image. SC-003's own fixture covers a dense pin set *without* a filter; the two
  have not been measured together, and WebKit is unmeasured (the same gap plan.md
  already records for the canvas ceiling).
- **Commercial products were read from vendor documentation**, which describes intent
  rather than behaviour. Where a university's own accessibility statement disagreed with
  the vendor's claim it is recorded [T20 vs T21], but that check was not possible for
  every claim.
- **`?` cells are absences of evidence, not evidence of absence.** They cluster in
  Echo360's playback specifics, PAMGuard's drawn playhead, and error handling across the
  media family — none of which carries a recommendation.

**Questions for the product owner. Q1–Q3 were answered in an interview on
2026-09-05 and are recorded here as decisions; Q4 and Q5 remain open.**

- **Q1 — the reveal rule. RESOLVED: drop the hiding; the player is an analyst tool.**
  The whole gram is drawn from load. The scrolling, playhead-at-top view stays as what
  happens *during playback* — that part was never in question. FR-011, FR-016 and
  FR-018 change, D10 goes, and `BaseMode.isTimeRevealed` stops gating anything.
  **This overrides X3**, which recommended keeping the rule and making it honest; the
  product owner decided the other way, and the survey supports it — every analysis tool
  and every media player draws the whole item, and A3 was the one row of 46 where the
  player stood alone. What is *lost* is the "you only know what you have heard" effect,
  which should be recorded as a deliberate trade rather than rediscovered later. Two
  consequences to carry into the spec: the forward-seek clamp proposed under R1 is no
  longer needed (the transport and the picture now agree by construction), and
  `clampViewTop`'s upper bound becomes the duration rather than the playhead.
- **Q2 — pitch on rate change. RESOLVED: assign `preservesPitch = true` explicitly, and
  add a config row that lets an author select the resampling behaviour instead.** Today's
  audible behaviour is kept, so the ear and the frequency readout continue to agree — the
  point that matters while a trainee is being taught to trust the readout — and the
  acoustic family's behaviour [A5, A18, W32] stays available per exercise. R3 as written.
  The spec corrections in R1 are required either way.
- **Q3 — memory for the retained grid. RESOLVED: a quantised 16-bit grid with a ~32 MB
  per-instance cap.** dB stored as `Uint16` rather than `Float32`: half the memory
  (~16 MB for a 3-minute mono 44.1 kHz file at the default `fft-size`, ~32 MB for six
  minutes) at a resolution far finer than a readout or a contrast control needs. **One
  interaction to design around:** 32 MB of `Uint16` is ~16.7 M cells, while the existing
  image caps allow 32,768 × 4,096 = 134 M cells, so a legal file can exceed the grid
  budget. Prefer *graceful degradation* over lowering the image caps — retain the grid
  when it fits and fall back to the painted-PNG path (R2's filter alone, no dB readout)
  when it does not, with the fallback stated in the loading caption. That keeps long
  recordings working and keeps C1 available on every file.
- **Q4.** Is region selection (R9) wanted as a *measurement* (a box with bounds, like
  PAMGuard's Quick Annotations [W31]) or only as a *loop range*? The first is a new
  annotation type with storage implications; the second is transport state.
- **Q5.** Does the product want to keep declining trainer-authored timed overlays (X5)?
  It is the training family's signature capability, and the decline currently reads as
  an oversight rather than a decision.

**Things this document deliberately did not do.** It did not write a spec, a plan, a
prototype or issues (product owner, 2026-09-05); it did not measure any recommendation
beyond probes (a) and (b); and it did not rank the recommendations against the project's
existing backlog, which contains 33 open issues this survey did not read.
