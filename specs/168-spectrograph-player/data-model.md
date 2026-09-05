# Data Model: Spectrograph Player

## 1. `state.player` — a new core slice

Present on every instance (so listeners see one shape), inert on image-backed
ones. Added to `initialState` in `core/state.js`; `tests/unit/mode-registration.test.js`'s
frozen key list gains `player`.

```js
player: {
  active: false,      // true iff the config table's first row held an <audio>
  ready: false,       // true once the gram is painted and the transport is live
  progress: 0,        // 0..1 through load → decode → analyse → paint
  source: '',         // the <audio> element's resolved src
  duration: 0,        // seconds, from the decoded file (not the element)
  sampleRate: 0,      // Hz, from the WAV header
  channels: 0,        // 1 or 2 as decoded (analysis and playback are mono-mixed)
  playhead: 0,        // seconds; the element's currentTime as last sampled
  playing: false,     // !audio.paused
  ended: false,       // the element reported `ended` (cleared by play/seek/restart)
  loop: false,
  rate: 1,            // playbackRate
  volume: 1,          // 0..1
  muted: false,
  viewTop: 0,         // time at the top edge of the visible window (D7)
  windowSeconds: 10,  // seconds of audio the unzoomed view spans
  analysis: {
    fftSize: 1024,    // power of two
    hopSize: 512,     // samples between frames; default fftSize / 2
    freqStart: 0,     // Hz, first retained bin's frequency
    freqEnd: null,    // Hz; null until the sample rate is known (default Nyquist)
    columns: 0,       // retained bins = gram naturalWidth
    frames: 0         // analysis frames = gram naturalHeight
  }
}
```

Invariants:

- `viewTop ≤ playhead` at all times (FR-011, FR-016). While `playing`,
  `viewTop === playhead` after every frame.
- `0 ≤ playhead ≤ duration`.
- `ready` implies `config.timeMin === 0`, `config.timeMax === duration`,
  `config.freqMin === analysis.freqStart`, `config.freqMax === analysis.freqEnd`,
  `imageDetails.naturalWidth === analysis.columns`,
  `imageDetails.naturalHeight === analysis.frames`,
  `imageDetails.timeStretch === max(1, duration / windowSeconds)`.
- `progress === 1` iff `ready`.

## 2. `ImageDetails.timeStretch` (optional)

`number | undefined`. Absent or `1` on image-backed instances. On an audio
instance, `duration / windowSeconds` (≥ 1 — a file shorter than the window is
not stretched; the lower part of the view stays blank, spec edge case).

Consumed by `components/svgLayout.js` (element height = `renderHeight ×
timeStretch × zoom.level`) and by `utils/coordinates.calculateVisibleDataRange`
(the zoom-1 shortcut is skipped when `> 1`). Nothing else reads it: the
transforms read the element's live bounds.

## 3. Config rows (FR-003, FR-004)

| Row | Type | Default | Validation |
|---|---|---|---|
| first row `<audio src>` | URL | required for an audio instance | `src` non-empty. An `<img>` in the same table is ignored with a warning |
| `fft-size` | integer | 1024 | power of two in [64, 8192], else error (FR-007) |
| `hop-size` | integer | `fft-size / 2` | integer ≥ 1, else error |
| `freq-start` | number | 0 | ≥ 0 and < `freq-end`, else error |
| `freq-end` | number | Nyquist | > `freq-start`; > Nyquist is clamped with a console warning |
| `window-seconds` | number | 10 | > 0, else error |
| `time-start`, `time-end` | — | — | ignored with a console warning on an audio table |

Parsed by `core/configuration.js` into `state.player.analysis` and
`state.player.windowSeconds` before any DOM is built, so a bad table fails
exactly as an image table does today: error indicator, table restored.

## 4. Derived quantities

| Quantity | Formula |
|---|---|
| frames | `floor((samples − fftSize) / hopSize) + 1` (0 if the file is shorter than one frame → FR-007) |
| bin width | `sampleRate / fftSize` Hz |
| first / last retained bin | `ceil(freqStart / binWidth)` … `floor(freqEnd / binWidth)`, so `columns = last − first + 1` |
| frame time | frame `f` covers `[f·hop, f·hop + fftSize) / sampleRate`; its row is placed at the frame's *end* time so nothing is painted for audio not yet heard at that row |
| reveal epsilon | `hopSize / sampleRate` — a feature at `playhead + ε` is still drawn, so a marker placed on the top row survives a paused-then-resumed frame |
| gram row for time `t` (image space, top = `duration`) | `y = (1 − t / duration) × renderHeight` — the ordinary `dataToSVG` mapping, unchanged |

## 5. Storage fingerprint

`buildGramFingerprint` is unchanged in shape; on an audio instance it reads
`image = basename(player.source)`, `timeMin = 0`, `timeMax = duration`,
`freqMin/Max = analysis.freqStart/freqEnd`. Because `duration` is unknown until
decode, restore runs from `audioSetup.js` when `ready` flips, followed by
`updatePersistentPanels`, `renderAllPersistentFeatures` and
`_setupStorageSaveListener` — the same four calls the constructor makes for an
image instance, in the same order. No schema change (FR-019).

## 6. The transport's DOM (for tests and CSS)

```text
.gram-frame-transport                   div, appended to .gram-frame-main-panel after the SVG
  button.gram-frame-transport-play      aria-pressed = playing; text ▶ / ❚❚
  button.gram-frame-transport-restart   ⏮
  input.gram-frame-transport-seek       type=range, min 0, max duration, step 0.01
  span.gram-frame-transport-time        "mm:ss / mm:ss"
  button.gram-frame-transport-loop      aria-pressed = loop
  select.gram-frame-transport-rate      options 0.5, 1, 1.5, 2
  button.gram-frame-transport-mute      aria-pressed = muted
  input.gram-frame-transport-volume     type=range 0..1 step 0.01
audio.gram-frame-audio                  the element, appended hidden inside the container
```

Container classes: `gram-frame-audio` (audio instance), `gram-frame-analysing`
(until ready; the main panel carries `data-gram-progress="42%"` for the
caption), `gram-frame-playing` (while playing).
