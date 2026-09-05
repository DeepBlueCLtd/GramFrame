# Research: Spectrograph Player — build or borrow? (Story 1)

**Date**: 2026-09-05 · **Time box**: two days; spent well under one · **Status**: complete
**Decision**: **build** — see §5. No third-party code is bundled, so the licence
gate in FR-002 is not triggered; §4 records what accepting the best candidates
*would* have meant, for the record.

The spike had two jobs: score the open-source candidates (FR-001), and find out
whether the pipeline the SRD assumes — decode a WAV in the browser, analyse it,
show the result through the existing image viewer — actually works under the
product's constraints. The second job produced the finding that shapes the
whole plan (§3.1), so it is reported first.

## 1. Summary of findings

1. **Analysis in the browser is fast enough with no library at all.** A
   60-line radix-2 FFT analyses a three-minute 44.1 kHz mono file at
   `fft-size` 1024 / `hop-size` 512 in **1.9 s**, in time slices no longer than
   **14 ms**, in Playwright's headless Chromium (§3.2). SC-002 (5 s, no stall
   over 100 ms) has more than 2× headroom before any optimisation.
2. **The existing image viewer can display the result unchanged.** A canvas of
   512 × 32,768 turns into a PNG data-URL in 0.3 s; an SVG `<image>` of a
   65,535-row PNG keeps its natural size; a 900 × 3,870 rendering scrolled by
   changing `y` every frame held **61 fps** (§3.3). The spectrogram can be a
   *tall image* the coordinate pipeline already understands, which is what
   FR-014 asks for.
3. **`file://` is the constraint that decides the design, and the SRD did not
   anticipate it.** From a `file://` page Chromium refuses `fetch()` and
   `XMLHttpRequest` for a sibling `.wav` (CORS: every `file://` document is
   origin `null`), *and* a `MediaElementAudioSourceNode` built on an `<audio>`
   element playing that file outputs **silence** (the element is treated as
   cross-origin and tainted). So neither "decode the file" nor "analyse it as
   it plays" can get at the samples over `file://` (§3.1). What *does* work
   over `file://`: the `<audio>` element plays normally; a `<script>` tag loads
   a sibling file; `decodeAudioData` and our own decoder accept an
   `ArrayBuffer` from wherever it came; blob-URL workers start. This is a
   Chromium/Edge behaviour, the product's baseline browser; it is not something
   a library can route around, which is why every "adopt" candidate fails
   criterion (b) equally.
4. **Consequence for the SRD.** In-browser analysis (interview decision 3,
   FR-006) is feasible and is what the plan does. The samples reach the browser
   by `fetch` when the page is served over HTTP(S), and over `file://` from a
   sibling `<name>.wav.js` — the WAV base64-wrapped in a one-line script — that
   a 15-line repo script produces and the component loads on demand by
   injecting a `<script>` tag. No change to the authored HTML; one extra file
   next to each WAV in published material. §5.3 sets out the alternatives and
   why this one.
5. **Web Audio is not needed for analysis.** A WAV decoder is ~70 lines
   (FR-005's PCM widths plus float), avoids `decodeAudioData`'s resampling to
   the context rate (observed: a 22,050 Hz file came back at 44,100 Hz, which
   would silently halve the frequency resolution), and needs no
   `AudioContext` — so no autoplay-policy interaction at load. Playback is the
   `<audio>` element. FR-008's "Web Audio API" guard becomes a guard on what the
   player actually uses: `HTMLAudioElement`, Canvas 2D and `toDataURL`.

## 2. Candidates

Search: npm registry (`spectrogram`, `fft`, `waterfall`, `audio analysis`),
GitHub topic `spectrogram`, and the libraries the issue's own suggestion of
"an open source JS component" turns up. Fifteen packages were inspected from
their registry metadata; the seven that could plausibly satisfy criterion (a)
are scored. Metadata is as read from `registry.npmjs.org` on 2026-09-05.

| Candidate | Version · last publish | Licence | Bundle cost (unpacked) | What it is |
|---|---|---|---|---|
| [wavesurfer.js](https://github.com/katspaugh/wavesurfer.js) + Spectrogram plugin | 7.12.11 · 2026-07-17 | BSD-3-Clause | 1.42 MB (core ≈ 60 KB min + plugin ≈ 30 KB) | Waveform player; plugin renders a spectrogram to canvas in a worker |
| [spectrogram-js](https://github.com/anyshake/spectrogram-js) | 1.1.2 · 2026-02-12 | MIT | 1.48 MB, depends on `webfft` (440 KB) | Real-time canvas waterfall for streaming samples |
| [spectrogram](https://github.com/miguelmota/spectrogram) | 0.0.7 · 2019-01-20 | MIT | 14 KB | Canvas spectrogram from an AnalyserNode |
| [audiomotion-analyzer](https://github.com/hvianna/audioMotion-analyzer) | 4.5.4 · 2026-01-09 | **AGPL-3.0-or-later** | 300 KB | Real-time spectrum analyser (bars/graph), canvas |
| [essentia.js](https://github.com/MTG/essentia.js) | 0.1.3 · 2021-06-24 | **AGPL-3.0** | 10.1 MB (WASM) | Full audio-analysis toolkit |
| [fft.js](https://github.com/indutny/fft.js) | 4.0.4 · 2021-01-11 | MIT | 22 KB | Radix-4 FFT (no rendering) |
| [fourier-transform](https://github.com/scijs/fourier-transform) | 2.4.1 · 2026-07-11 | MIT | 40 KB | Minimal FFT (no rendering) |

Inspected and set aside without scoring: `meyda` (MIT; real-time feature
extraction, carries five dependencies, no spectrogram surface), `tone` (MIT;
5.4 MB music framework), `webfft` (MIT; 440 KB of WASM/JS FFT variants — a
dependency of spectrogram-js, scored through it), `dsp.js`, `kissfft-js`,
`fft-js`, `ml-fft`, `jsfft` (all MIT FFTs, unmaintained since 2016-2019 and
dominated by fft.js/fourier-transform on every axis).

## 3. Empirical checks

Run with `spike/run-exp.mjs` (see `spike/README.md`) against Playwright's
Chromium 1194 on the spike machine, once from `file://` and once from HTTP.
Raw JSON is reproduced in §3.4.

### 3.1 Sample access over `file://` versus HTTP

| Probe | `file://` | `http://` |
|---|---|---|
| `fetch('tone.wav')` | ✗ `TypeError: Failed to fetch` — console: *URL scheme "file" is not supported* | ✓ 1,323,044 bytes |
| `XMLHttpRequest` to `tone.wav` | ✗ status 0, *blocked by CORS policy* | ✓ |
| `<script src="tone.wav.js">` (WAV as base64 in a script) | ✓ 1,764,060 chars | ✓ |
| `AudioContext.decodeAudioData(ArrayBuffer)` on the embedded bytes | ✓ 61 ms | ✓ 55 ms |
| `<audio src="tone.wav">` `.play()` | ✓ `currentTime` advances, `readyState` 4 | ✓ |
| `MediaElementAudioSourceNode` → `AnalyserNode` while playing | ✗ **peak amplitude 0** (tainted) | ✓ peak 0.80 |
| Blob-URL `Worker` | ✓ | ✓ |

The `file://` failures are by design in Chromium (and Edge): `file://` documents
have an opaque origin, so cross-origin rules apply to every sibling file, and a
media element that is cross-origin without CORS headers feeds Web Audio
silence. Firefox has matched this since v68 (`privacy.file_unique_origin`).
There is no flag a published page can set; `--allow-file-access-from-files`
is a launch switch.

### 3.2 Analysis cost (own radix-2 FFT, Hann window, main thread, 12 ms slices)

| Input | Frames | Total | Longest slice |
|---|---|---|---|
| 30 s mono, 22,050 Hz (decoded at 44,100 by `decodeAudioData`) | 1,290 | 135 ms | 12 ms |
| 180 s mono, 44,100 Hz | 15,502 | **1,887 ms** | **14 ms** |

The known 300 Hz tone landed in bin 14 of 512 at 44,100 Hz / 1024 — the
expected bin — which is the SC-007 unit test in miniature. (The 180 s row
reads "expected 7" because the test tiled 22,050 Hz samples as if they were
44,100 Hz; the peak bin is the right answer for what was actually fed in.)

### 3.3 Image path

| Probe | Result |
|---|---|
| Paint 186 × 1,290 spectrogram into canvas → `toDataURL('image/png')` | 49 ms, 642 KB |
| Canvas 512 × 32,768 → PNG | ✓ 313-398 ms, 596 KB |
| Canvas 2,048 × 32,768 → PNG | ✓ 2.6 s, 1.9 MB |
| `Image` from a 512 × 65,535 PNG | ✓ `naturalHeight` 65,535 |
| SVG `<image>` shown at 900 × 3,870, `y` changed per frame for 1 s | **61 frames** |

Chromium's documented canvas limit is 65,535 px per side and 268,435,456 px of
area; the plan caps the gram at **32,768 rows × 4,096 columns** (§5.2), which is
inside the limit with a 2× margin and is where PNG encoding stays under a few
seconds. WebKit is not installed in the spike environment, so its (lower)
canvas ceiling is a plan risk to be checked in the smoke lane, not a measured
number.

### 3.4 Raw output (abridged)

```json
"file://": { "fetch": {"ok": false}, "xhr": {"ok": false, "status": 0},
             "scriptEmbed": {"ok": true}, "decode": {"ok": true, "ms": 61},
             "audioElement": {"ok": true, "currentTime": 1.45, "readyState": 4},
             "mediaElementSource": {"ok": false, "peak": 0}, "worker": {"ok": true} }
"http://":  { "fetch": {"ok": true, "bytes": 1323044}, "xhr": {"ok": true},
             "mediaElementSource": {"ok": true, "peak": 0.80},
             "fft3min": {"frames": 15502, "totalMs": 1887, "maxSliceMs": 14},
             "png30s": {"ms": 49, "urlBytes": 641842},
             "imageRender": {"bbox": {"w": 900, "h": 3870}, "fps": 61},
             "bigCanvas512x32768": {"ok": true, "ms": 313},
             "bigCanvas2048x32768": {"ok": true, "ms": 2633},
             "bigImage512x65535": {"ok": true, "natural": [512, 65535]} }
```

## 4. Scoring against FR-001

✓ meets · ◐ partly / with work · ✗ fails. One line of justification per cell;
the source is the candidate's README, source tree or registry record linked in
§2.

| Criterion | wavesurfer.js + plugin | spectrogram-js | spectrogram | audiomotion | essentia.js | fft.js | fourier-transform | **own code** |
|---|---|---|---|---|---|---|---|---|
| (a) WAV → spectrogram in browser, no server | ✓ decodes via `decodeAudioData`, FFT in a worker | ◐ takes samples you already have; no decoder | ◐ needs an `AnalyserNode` (real-time only) | ✗ real-time spectrum, not a spectrogram | ✓ but 10 MB WASM | ◐ FFT only | ◐ FFT only | ✓ decoder + FFT are ~130 lines (§3.2) |
| (b) works over `file://`, no runtime network | ✗ loads audio with `fetch` (§3.1) | ◐ agnostic to how samples arrive | ✗ MediaElementSource is silent over `file://` | ✗ same | ✗ WASM fetched at runtime | ✓ pure JS | ✓ pure JS | ✓ with the `.wav.js` sidecar (§5.3) |
| (c) single-file bundle | ✓ ESM, bundles | ◐ `webfft` ships WASM variants that expect to be fetched | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| (d) per-frame magnitudes or an overlay-able surface | ◐ draws to its own canvas; magnitudes reachable only by reading plugin internals | ◐ draws to a caller canvas; frame data not exposed | ✗ canvas only | ✗ | ✓ returns arrays | ✓ arrays | ✓ arrays | ✓ magnitudes are ours |
| (e) scrolling waterfall, or the access to build one | ✗ time runs horizontally; scrolling is the waveform's | ✓ waterfall is its purpose, but real-time streaming, not seek-anywhere | ✗ | ✗ | n/a | n/a | n/a | ✓ tall image + viewport (§5.2) |
| (f) browser support ≥ GramFrame baseline (Chrome/Edge 86) | ✓ | ◐ ES2020+, `OffscreenCanvas` in places | ✓ | ✓ | ◐ WASM SIMD paths | ✓ | ✓ | ✓ nothing newer than canvas + `<audio>` |
| (g) bundle size added | ≈ 90 KB min for the two parts we would use | ≈ 500 KB with `webfft` | 14 KB | 300 KB | 10 MB | 22 KB | 40 KB | **≈ 8 KB** unminified for decoder + FFT; the whole player (analysis, view, transport, bar) measured **+49 KB** unminified, **+12.8 KB** gzipped, on the standalone bundle (346,985 → 396,153 bytes) |
| (h) maintenance signal | ✓ active 2026-07, large community | ◐ 8 months old, single organisation | ✗ last release 2019 | ✓ active | ✗ 2021 | ✗ 2021, one author | ✓ 2026-07, scijs | ✓ ours |
| (i) licence and distribution implications | BSD-3: notice + licence text must ship with the bundle | MIT: notice must ship | MIT | AGPL: the combined work's source must be offered to recipients — acceptable, since the component is to be open-sourced (product owner, 2026-09-05), but every training package would carry that obligation | AGPL: as left | MIT | MIT | none |
| (j) deterministic (same input → same pixels/values) | ◐ worker + colour map are deterministic; rendering is tied to the waveform's zoom state | ◐ colour maps deterministic; real-time input path is not | ✗ real-time | ✗ | ✓ | ✓ | ✓ | ✓ integer PCM in, fixed window, fixed colour map |

**Reading the table.** Every rendering library fails (e), (d) or (b): they
paint their own canvas with time on the horizontal axis (or as a live stream),
and none of them can get at the samples over `file://` any better than we
can. The FFT libraries pass everything but add a dependency to a zero-dependency
project to save writing a routine that the spike measured at 1.9 s for the
worst case in FR-005's scope. The two AGPL packages fail on merit — audiomotion-analyzer is not a
spectrogram at all, essentia.js is a 10 MB toolkit fetched at runtime — and
not on licence: the product owner has confirmed the component is to be
open-sourced, so a copyleft dependency would not have been a bar in itself.

## 5. Decision: build

### 5.1 What "build" means here

- **Decoder** — `src/audio/wavDecoder.js`: RIFF/WAVE parser for PCM 8/16/24/32-bit
  and IEEE float 32-bit, mono or stereo (mixed to mono by averaging), returning
  `Float32Array` samples plus `sampleRate`. WAVE_FORMAT_EXTENSIBLE is accepted
  for those sub-formats. Anything else throws, which FR-007 surfaces. Reference:
  Microsoft/IBM *Multimedia Programming Interface and Data Specifications 1.0*
  (RIFF WAVE), and the `WAVE_FORMAT_EXTENSIBLE` note in the *Multiple Channel
  Audio Data and WAVE Files* specification.
- **FFT** — `src/audio/fft.js`: iterative radix-2 Cooley–Tukey, decimation in
  time, precomputed bit-reversal and twiddle tables, `Float32Array` in place.
  Reference: Cooley & Tukey (1965), *An algorithm for the machine calculation
  of complex Fourier series*; the iterative form as in Press et al., *Numerical
  Recipes* §12.2. Power-of-two `fft-size` only (FR-004 already says so).
- **Analysis** — `src/audio/spectrogram.js`: Hann window (Harris 1978, *On the
  use of windows for harmonic analysis with the DFT* — the standard choice for
  tonal detection, main-lobe width 4 bins, first sidelobe −31 dB), frames at
  `hop-size`, power spectrum `re² + im²` per bin, retained bins cropped to
  `[freq-start, freq-end]`. Runs in **time slices of ≤ 12 ms** yielded through
  `setTimeout(0)` on the main thread, reporting progress. The worker option is
  recorded as a later optimisation: the spike showed it works over `file://`
  via a blob URL, but at 1.9 s worst case the main-thread slicer already meets
  SC-002 and keeps the code single-threaded and testable in Vitest.
- **Colour** — `src/audio/gramImage.js`: magnitude → dB → clamp to a 60 dB
  range below the file's peak → a fixed 256-entry blue-to-yellow lookup chosen
  to resemble `sample/mock-gram.png`. Painted into a canvas (`putImageData`),
  encoded once with `toDataURL('image/png')`, and set as the existing
  `<image>` element's `href`. From that point the instance *is* an image-backed
  instance whose natural size is `columns × frames`.
- **Playback** — an `<audio>` element created by the component (not Web Audio):
  `play/pause/currentTime/loop/playbackRate/volume/muted` are the transport,
  `timeupdate`/`ended`/`seeked` its events, and `currentTime` read once per
  animation frame is the playhead.

### 5.2 Viewer geometry

The whole file is one tall image with `config.timeMin = 0`, `timeMax =
duration`. The waterfall is a *vertical stretch* of that image: the base render
height stays the axes height (400 px by default), the image element is drawn
`duration / window-seconds` times taller and positioned so the playhead sits at
the top edge. `svgToImage`, `dataToSVG`, `isWithinImage` and
`calculateVisibleDataRange` already read the live element bounds and scale
width and height independently, so every mode measures the moving gram through
the unchanged pipeline (FR-014). The plan adds one optional field,
`imageDetails.timeStretch`, and one player-owned scalar, the time at the top
edge of the view, and teaches `svgLayout` to apply both.

Caps, from §3.3: **32,768 rows × 4,096 columns**. A file whose analysis would
exceed either fails through FR-007 with a message naming the `hop-size` (or
`fft-size`) that would bring it inside — the analyst is never shown a truncated
gram. Three minutes at 44.1 kHz with the defaults is 15,502 rows; five minutes
is 25,840; five minutes at 96 kHz needs `hop-size` 2048.

### 5.3 Getting the samples to the browser

| Option | Over `file://` | Authoring cost | Runtime cost | Verdict |
|---|---|---|---|---|
| `fetch(src)` + own decoder | ✗ (§3.1) | none | none | **used when it works** (HTTP, dev server, Vite) |
| Sibling `<name>.wav.js` (`window.GramFrameAudio[name] = "<base64>"`), injected as a `<script>` when `fetch` fails | ✓ | run `node scripts/wav2js.mjs file.wav` once per file; ship the `.js` beside the `.wav` | +33 % on disk for the sidecar; a base64 decode (≈ 20 ms/MB) | **used as the `file://` fallback** |
| Pre-render the gram offline to a PNG, play a separate audio file | ✓ | an offline analysis tool, and re-running it on every parameter change | none | rejected: contradicts interview decision 3 and FR-006, and moves the analysis parameters out of the config table |
| Analyse in real time from the playing element | ✗ (silent over `file://`) | none | continuous | rejected: fails the constraint the product exists for, and forbids seek-ahead |
| `<input type="file">` | ✓ | none | a click per file per visit | rejected: not declarative (Principle IV) |

The sidecar is the smallest change that keeps decision 3 intact everywhere the
product runs. It is looked for only after `fetch` fails, so pages served over
HTTP never need it, and the failure to find it is an FR-007 error naming the
file the author should generate.

### 5.4 Risks carried into the plan

- **WebKit canvas ceiling** (§3.3) — unmeasured; the smoke lane's WebKit run
  should cover a short file, and the row cap may need to be lower on Safari.
- **Sidecar size** — a five-minute 44.1 kHz 16-bit mono WAV is 26 MB and its
  sidecar 35 MB. Training clips of the kind the issue describes are one to
  three minutes; the spec's "under five minutes" cap holds, and 22,050 Hz
  material (plenty for sub-5 kHz machinery noise) halves both figures.
- **Rate change and pitch** — the `<audio>` element preserves pitch by default
  in Chromium (`preservesPitch = true`). The SRD assumes the opposite; the
  plan leaves the browser default and records it, since either satisfies FR-022.
- **Autoplay** — `play()` before a user gesture rejects with `NotAllowedError`;
  the API surfaces that rejection (FR-023).
