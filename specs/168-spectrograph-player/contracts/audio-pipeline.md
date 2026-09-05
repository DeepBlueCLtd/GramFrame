# Contract: `src/audio/*` — the signal chain

All four analysis modules are pure (no DOM except `gramImage`'s canvas, no
`instance`), synchronous except where noted, and Vitest-tested in Node.

## `wavDecoder.js`

```js
/** @returns {{samples: Float32Array, sampleRate: number, channels: number, duration: number}} */
export function decodeWav(arrayBuffer)
```
- Accepts RIFF/WAVE with `fmt ` format 1 (PCM, 8/16/24/32-bit), 3 (IEEE float
  32-bit) and 0xFFFE (EXTENSIBLE wrapping either). 8-bit is unsigned.
- Stereo (and any channel count > 1) is mixed to mono by averaging.
- `samples` is normalised to [−1, 1]. `duration = samples.length / sampleRate`.
- Throws `Error` with a specific message on: not RIFF/WAVE, unsupported
  format tag or bit depth, missing `fmt `/`data` chunk, truncated data.

## `fft.js`

```js
export function createFFT(size)          // size: power of two ≥ 2
// returns { size, forward(re, im) }     // in-place, Float32Array, both length `size`
```
- Iterative radix-2 Cooley–Tukey, DIT, bit-reversal and twiddle tables cached
  per instance. `forward` is deterministic (no allocation, no randomness).

## `spectrogram.js`

```js
export function planAnalysis({ sampleRate, sampleCount, fftSize, hopSize, freqStart, freqEnd })
// → { frames, firstBin, lastBin, columns, binWidth, freqEnd (clamped), clamped: boolean }
//   throws when frames === 0 or columns === 0

export function analyseSync(samples, plan)     // → Float32Array(frames × columns), power per bin; for tests

export function analyse(samples, plan, { sliceMs = 12, onProgress, yield: fn })
// → Promise<Float32Array>; yields via setTimeout(0) between slices, calls onProgress(f/frames)
```
- Hann window `0.5 − 0.5·cos(2πn/(N−1))`, applied per frame.
- Row `f` is the frame starting at sample `f·hopSize`; the grid is in
  *increasing* frame order (row 0 = earliest). `gramImage` flips it.
- The known-tone test: a 300 Hz tone at 8 kHz / 1024 peaks in bin
  `round(300 / (8000/1024)) = 38`.

## `gramImage.js`

```js
export const MAX_GRAM_ROWS = 32768, MAX_GRAM_COLUMNS = 4096
export function checkGramSize(frames, columns, plan)   // throws an FR-007 Error naming the hop-size that would fit
export function powerToLevels(grid, frames, columns)   // → Uint8Array levels 0..255 (percentile-normalised dB)
export function paintGram(levels, frames, columns)     // → data: URL (PNG); needs a DOM
export const COLOUR_LUT                                 // 256 × [r, g, b]
```
- dB: `10·log10(power + 1e-12)`; floor = 5th percentile, ceiling = 99.9th
  percentile of a ≤ 1M-value even subsample; linear between; clamped.
- Row 0 of the *image* is the **last** frame (time increases upward).

## `audioSource.js`

```js
export function loadAudioBytes(src, { doc = document })  // → Promise<ArrayBuffer>
```
1. `fetch(src)`; on `ok` return `arrayBuffer()`.
2. Otherwise (thrown, or `!ok`) inject `<script src="${src}.js">` into `doc.head`
   and wait for `load`; then return the decoded bytes of
   `window.GramFrameAudio[basename(src)]` (base64 → `ArrayBuffer`).
3. If the script errors or the key is absent, reject with an `Error` that names
   `${src}.js` and the command that produces it.

Sidecar shape (`scripts/wav2js.mjs`):
```js
window.GramFrameAudio = window.GramFrameAudio || {};
window.GramFrameAudio["diesel-generator.wav"] = "UklGRi…";
```
