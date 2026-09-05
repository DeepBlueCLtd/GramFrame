# Implementation Plan: Spectrograph Player — a Scrolling, Audible Gram

**Branch**: `168-spectrograph-player` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/168-spectrograph-player/spec.md`; spike findings in [research.md](./research.md)

## Summary

An audio-sourced GramFrame instance: the config table's first row holds an
`<audio>` element instead of an `<img>`. On load the component fetches the WAV
(or, over `file://`, loads a base64 sidecar), decodes it with its own RIFF
parser, analyses it with its own radix-2 FFT in ≤ 12 ms main-thread slices,
paints the magnitudes into a canvas and hands the result to the *existing*
`<image>` element as a PNG data URL. From then on it is an image-backed
instance whose image is the whole recording, `config.timeMin = 0`,
`timeMax = duration`. The waterfall is a viewport rule, not a second renderer:
the image is drawn `duration / window-seconds` times taller than the axes area
and positioned so the playhead — the `<audio>` element's `currentTime`, read
once per animation frame — sits at the top edge. Every coordinate transform
already reads the live element bounds and scales the two axes independently,
so the modes measure the moving gram unchanged (FR-014).

The spike's verdict is **build** with zero runtime dependencies (research §5).
Its one structural finding — that `file://` blocks every route to the samples
except a `<script>`-loaded copy — is absorbed by a sidecar file the loader
looks for only when `fetch` fails (research §5.3).

## Technical Context

**Language/Version**: JavaScript ES2020+, JSDoc-typed under `strict: true`, no compilation
**Primary Dependencies**: None at runtime (unchanged); Vite 5 for build. No library adopted (research §5)
**Storage**: Unchanged — Web Storage, schema v1, no bump. Audio instances fingerprint on the audio file's basename plus `[0, duration] × [freq-start, freq-end]`
**Testing**: Playwright (new `tests/player-*.spec.js` against `tests/fixtures/player-page.html` and a committed synthetic WAV); Vitest for `src/audio/*` (decoder, FFT, analysis, colour map — SC-007); `yarn hygiene`/`lint`/`typecheck`
**Target Platform**: Chrome/Edge ≥ 86 (existing baseline); WebKit via the smoke lane. Pages served over HTTP(S) *or* opened from `file://`
**Project Type**: Single-project browser component
**Performance Goals**: SC-002 ready-to-play ≤ 5 s for 3 min @ 44.1 kHz with no main-thread slice > 100 ms (spike: 1.9 s, 14 ms); SC-003 top row within 100 ms of `currentTime`, ≥ 30 fps scrolling at `window-seconds` 10 (spike: 61 fps)
**Constraints**: single-file bundle; no runtime network; `file://`; declarative config; multiple independent instances; every existing Playwright spec passes unchanged (SC-004); no hygiene baseline rises
**Scale/Scope**: WAV ≤ 5 min, ≤ 96 kHz stereo; gram ≤ 32,768 rows × 4,096 columns (research §5.2); ~1,100 lines of new `src/`, ~9 new modules, one new `state` slice

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| **I. SVG-First Rendering** | ✅ Pass, with one reading recorded | Every overlay (cursors, axes, markers, pins, transport-driven playhead) stays SVG and DOM-queryable. A 2-D canvas is used **once, off-screen, at load** to encode the analysed magnitudes into a PNG; the result reaches the page only as the `href` of the existing `<image>` element. That is image *production*, not overlay rendering — the same role `mock-gram.png` plays for an image-backed instance — and no canvas is ever attached to the DOM. All coordinate transforms flow through `utils/coordinates.js` (FR-014); the one addition there is that the zoom-1 shortcut in `calculateVisibleDataRange` defers to the general bounds path when the image is time-stretched. |
| **II. Test-First (NON-NEGOTIABLE)** | ✅ Pass | Stories 2–5 each get a Playwright spec with state-based waits (SC-004); the analysis chain gets Vitest coverage including the known-tone-in-expected-bin test (SC-007). The existing suite must pass unchanged; the plan touches shared modules (`events`, `viewport`, `svgLayout`, `keyboardControl`, `configuration`) only behind `state.player.active` guards. |
| **III. Modular Mode Architecture** | ✅ Pass | No new mode; no mode gains knowledge of the player. Modes learn one thing through `BaseMode`: `isTimeRevealed(time)`, which reads `state.player` and is `true` on image-backed instances. Playing-time inertness is enforced in `core/events.js` before any mode is reached, so no mode changes its own handlers. |
| **IV. Declarative HTML Configuration** | ✅ Pass, extended | Same table, same 2-column rows. The first row holds `<audio src>` in place of `<img>`; five optional analysis rows are added (FR-004). `time-start`/`time-end` on an audio table warn and are ignored. Multiple instances stay independent (FR-015): each owns its `<audio>` element and its own analysis. |
| **Technical Constraints** | ✅ Pass | State stays centralised: the `player` slice is a core key in `core/state.js`, broadcast deep-copied like every other. HMR unchanged. Build unminified. |
| **Quality Gates** | ✅ Pass | `yarn typecheck && yarn test && yarn build` plus `hygiene`, `lint`, `test:unit` gate every task (see [quickstart.md](./quickstart.md)). |

**Gate result: PASS.** Principle I's canvas note is a reading of "overlay
rendering", not an exception; it is recorded here and in ADR-019 rather than in
Complexity Tracking.

**Post-Phase-1 re-check: still PASS.** The design adds `src/audio/` (four pure
modules), `src/player/` (three modules), one component, one script and one
state slice; it modifies six existing modules behind guards and deletes
nothing.

## Project Structure

### Documentation (this feature)

```text
specs/168-spectrograph-player/
├── plan.md              # This file
├── research.md          # Story 1 — spike, scoring, decision (build)
├── spike/               # Reproducible spike scripts (not part of the component)
├── data-model.md        # The player state slice, config rows, storage fingerprint
├── quickstart.md        # How to author, run and verify each story
├── contracts/
│   ├── config-rows.md   # The audio row and the five analysis rows
│   ├── player-api.md    # instance.player, GramFrame.getPlayer, state.player, keys, DOM
│   └── audio-pipeline.md# wavDecoder / fft / spectrogram / gramImage / audioSource
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
src/
├── audio/                         # Pure, browser-independent where possible; Vitest-covered
│   ├── wavDecoder.js              # RIFF/WAVE → {samples: Float32Array, sampleRate, channels}
│   ├── fft.js                     # Radix-2 real-input FFT with cached tables
│   ├── spectrogram.js             # Hann-windowed frames → power grid, sliced, with progress
│   ├── gramImage.js               # Power grid → dB → colour LUT → canvas → PNG data URL
│   └── audioSource.js             # fetch(src) → ArrayBuffer, else the .wav.js sidecar
├── player/
│   ├── audioSetup.js              # The audio-instance init step (mirrors spectrogramImage.js)
│   ├── transport.js               # <audio> element wrapper: play/pause/seek/loop/rate/volume/mute
│   └── playerView.js              # Waterfall geometry: viewTop, clamps, follow loop, reveal
├── components/
│   └── TransportBar.js            # The controls under the gram
├── core/
│   ├── state.js                   # + `player` core slice
│   ├── configuration.js           # + audio row and analysis rows
│   ├── browserCompatibility.js    # + HTMLAudioElement / canvas toDataURL in REQUIRED_APIS
│   ├── events.js                  # + inert-while-playing gate, time-axis click seek
│   ├── viewport.js                # + player-aware pan/zoom (viewTop instead of centerY)
│   └── keyboardControl.js         # + transport keys on a focused audio instance
├── components/svgLayout.js        # + time-stretched image placement
├── utils/coordinates.js           # + stretch-aware visible-range shortcut
├── modes/BaseMode.js              # + isTimeRevealed(time)
├── modes/{analysis,shared,doppler}/  # each render skips unrevealed features (3 one-line guards)
├── api/GramFrameAPI.js            # + getPlayer(index)
└── types.js                       # + PlayerState, AnalysisParams, ImageDetails.timeStretch

scripts/
└── wav2js.mjs                     # WAV → <name>.wav.js sidecar (file:// delivery)

sample/
├── audio/                         # 3–5 CC0/CC-BY WAVs + sidecars + ATTRIBUTION.md
└── player.html                    # One player per sample file

tests/
├── fixtures/player-page.html      # Debug-flagged page with one audio instance
├── fixtures/player-two-page.html  # Two independent players
├── fixtures/player-sidecar-page.html # src that 404s + a sidecar, to exercise the fallback
├── fixtures/audio/tone-20s.wav    # Synthetic: 300/600/900 Hz + chirp, 20 s @ 8 kHz
├── player-load.spec.js            # Story 2
├── player-playback.spec.js        # Story 3
├── player-annotations.spec.js     # Story 4
├── player-transport.spec.js       # Story 5
└── unit/{wav-decoder,fft,spectrogram,gram-image}.test.js
```

**Structure Decision**: Single project. `src/audio/` holds the signal chain and
imports nothing from the component so it runs in Node under Vitest; `src/player/`
holds everything that knows about the instance. `audioSetup.js` is deliberately
the audio twin of `components/spectrogramImage.js`: the constructor calls one or
the other from `setupSpectrogramIfAvailable`.

## Design decisions (Phase 1)

Each is elaborated in the contracts; this is the index.

| # | Decision | Where |
|---|---|---|
| D1 | The audio row is `<tr><td colspan="2"><audio src="…"></audio></td></tr>`. An `<audio>` in the first row makes the instance audio-sourced; `controls` on it is the author's graceful fallback before GramFrame runs | contracts/config-rows.md |
| D2 | Samples arrive by `fetch`; on any failure (network error or non-2xx) the loader injects `<script src="<src>.js">` and reads `window.GramFrameAudio[basename]`. The sidecar is produced by `scripts/wav2js.mjs` | contracts/audio-pipeline.md |
| D3 | Own WAV decoder, no `decodeAudioData`: no resampling, no `AudioContext`, PCM 8/16/24/32 + float32, mono/stereo mixed by averaging | contracts/audio-pipeline.md |
| D4 | Hann window, `re²+im²` power, bins cropped to `[freq-start, freq-end]`, `freq-end` clamped to Nyquist with a warning; analysis sliced at ≤ 12 ms with `setTimeout(0)`; progress reported through `state.player.progress` and the loading caption | contracts/audio-pipeline.md |
| D5 | Colour: log power, floor at the 5th percentile and ceiling at the 99.9th percentile of the file, 256-entry blue→cyan→yellow→white LUT (chosen against `sample/mock-gram.png`) | contracts/audio-pipeline.md |
| D6 | The gram is one tall image: `naturalWidth = columns`, `naturalHeight = frames`, rendered at `renderWidth 900 × renderHeight 400`, `config = {0, duration, freqStart, freqEnd}`. Caps 32,768 × 4,096 → FR-007 error naming the `hop-size` that fits | contracts/audio-pipeline.md |
| D7 | Waterfall geometry: `imageDetails.timeStretch = duration / window-seconds`; `state.player.viewTop` is the time at the view's top edge; `svgLayout.applyZoomTransform` places the element from `{zoom.level, zoom.centerX, timeStretch, viewTop}`; `zoom.centerY` is unused on audio instances | data-model.md, contracts/player-api.md |
| D8 | Playhead = `audio.currentTime` read per animation frame while playing, plus on `timeupdate`/`seeked`/`ended`, so a backgrounded tab jumps to the right place on return | contracts/player-api.md |
| D9 | While playing: `events.js` returns before delegating mousedown/mouseup/contextmenu/wheel to the mode; arrow-key nudges are skipped; the container carries `gram-frame-playing` and the SVG cursor is the arrow (`default`). Hover readouts still run | contracts/player-api.md |
| D10 | Reveal: `viewTop ≤ playhead` always; the image clip's top edge is the playhead's y; `BaseMode.isTimeRevealed(t)` (`t ≤ playhead + hop/sampleRate`) guards the three renderers | contracts/player-api.md |
| D11 | Pan/zoom on audio instances: vertical pan moves `viewTop` (clamped to `[min(window/level, playhead), playhead]`) and is allowed at zoom 1; horizontal pan as today; zoom keeps the time under the pointer fixed by recomputing `viewTop`; resuming play snaps `viewTop` to the playhead | contracts/player-api.md |
| D12 | Annotation restore and the storage-save listener are deferred until `player.ready` (the fingerprint needs `duration`); the fingerprint's `image` is the audio basename | data-model.md |
| D13 | Transport UI is a bar under the SVG inside the main panel: play/pause, restart, seek slider, time readout, loop, rate `<select>` (0.5/1/1.5/2), mute, volume. Keys on a focused audio instance: `Space`/`K` play-pause, `J`/`L` ±5 s (`Shift` ±30 s), `Home` restart, `M` mute. Arrow keys untouched; nothing bound on image-backed instances | contracts/player-api.md |
| D14 | Public API: `instance.player` (a `PlayerController`) and `GramFrame.getPlayer(index = 0)` → controller or `null`. `play()` returns the element's promise, so an autoplay refusal rejects (FR-023) | contracts/player-api.md |
| D15 | FR-008 is met by adding `HTMLAudioElement` and `HTMLCanvasElement.prototype.toDataURL` to `REQUIRED_APIS`; the existing warning path then covers audio pages. Web Audio is not used (research §1.5) | — |
| D16 | Rate change uses the element default (`preservesPitch` as the browser ships it); readouts are unaffected because the gram is never re-analysed (FR-022) | — |

## Risks and how the plan bounds them

- **Per-frame re-render cost** — axes and persistent features are rebuilt each
  frame while playing. SC-003's ≥ 30 fps test is the gate; if a dense harmonic
  set drops below it, the fallback (recorded, not built) is translating
  `cursorGroup` between full renders.
- **WebKit canvas ceiling** — unmeasured (research §5.4). The smoke lane opens
  `sample/player.html`; the row cap may need a WebKit-specific value.
- **Sidecar size** on long files — documented in the Integration Guide with
  the 22,050 Hz recommendation; the cap on duration stays "a few minutes".
- **Existing tests that assume `zoom.level === 1` means "full range visible"**
  — unaffected: the shortcut is only bypassed when `timeStretch > 1`, which no
  image-backed instance sets.

## Complexity Tracking

No constitution violations to justify. The canvas note under Principle I is a
reading recorded in ADR-019, not an exception.
