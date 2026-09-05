# Research: Spectrograph Player — UI and capability precedents (feature 169)

**Date**: 2026-09-05 · **Time box**: 2.5 working days; spent under one · **Status**: complete
**Deliverable**: this `research.md` only (product owner, 2026-09-05) — no spec, plan,
prototype or issues; the document recommends, it does not decide.
**Decision**: __DECISION_LINE__

Spec 168 built the player from an interview and a build-or-borrow spike over npm
packages; nothing in the repo compared its UI or capabilities with any existing
waterfall, acoustic-analysis or media-player system. This spike does that. It
surveys four families of precedent, weighted as the product owner asked — sonar
and SDR waterfall displays first — ticks each against a 46-row capability
checklist, and argues nine of spec 168's own decisions from both sides before
ranking what to adopt, what to leave for a later spec, and what to reject.

## 1. Summary of findings

__FINDINGS__

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

__PRECEDENTS__

## 4. Capability matrix

Cells: ✓ present · ◐ partial or configurable · ✗ absent · — not applicable to the
medium · ? could not be determined (reason in the note). Every ✓/◐ cites an
evidence-log row (§8.3). The **tag** column says whether the row is a *domain*
convention (justified by an operator or analyst task in ≥ 2 families), a
*medium* fact (true of live receivers because there is no future to show) or a
*tool* habit. The **168** column is the player today; **challenges** names the
spec-168 requirement or decision the row bears on.

__MATRIX__

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

__CHALLENGES__

## 7. Recommendations

__RECOMMENDATIONS__

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

__EVIDENCE__

## 9. Risks and open questions

__RISKS__
