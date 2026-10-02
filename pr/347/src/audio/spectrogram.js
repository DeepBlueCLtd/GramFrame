/**
 * Spectrogram analysis for the spectrograph player (spec 168, FR-004, FR-006).
 *
 * Turns a mono sample array into a grid of per-frame power spectra: one row per
 * analysis frame (every `hopSize` samples, `fftSize` wide, Hann-windowed), one
 * column per retained frequency bin (those inside `[freqStart, freqEnd]`).
 *
 * `analyse` runs the frame loop in time slices of at most `sliceMs` and yields
 * to the event loop between them, so a three-minute file never holds the main
 * thread for longer than a frame (SC-002; research.md §3.2 measured 14 ms
 * slices). With an unbounded slice it runs to completion in one go, which is
 * how the unit lane exercises it.
 *
 * Pure: no DOM. `analyse` needs only `setTimeout`.
 */

import { createFFT, isPowerOfTwo } from './fft.js'

/**
 * What the caller asks for.
 * @typedef {Object} AnalysisRequest
 * @property {number} sampleRate - Samples per second
 * @property {number} sampleCount - Total samples
 * @property {number} fftSize - Frame length, a power of two
 * @property {number} hopSize - Samples between frame starts
 * @property {number} freqStart - Lowest frequency to keep, Hz
 * @property {number|null} freqEnd - Highest frequency to keep, Hz; null means Nyquist
 */

/**
 * The resolved analysis geometry.
 * @typedef {Object} AnalysisPlan
 * @property {number} sampleRate - Samples per second
 * @property {number} fftSize - Frame length
 * @property {number} hopSize - Samples between frame starts
 * @property {number} frames - Row count
 * @property {number} binWidth - Hz per bin
 * @property {number} firstBin - Index of the first retained bin
 * @property {number} lastBin - Index of the last retained bin (inclusive)
 * @property {number} columns - Retained bin count, `lastBin - firstBin + 1`
 * @property {number} freqStart - The first retained bin's frequency, Hz
 * @property {number} freqEnd - The last retained bin's frequency, Hz (after any Nyquist clamp)
 * @property {boolean} clamped - Whether `freqEnd` was clamped to Nyquist
 */

/**
 * Resolve the frame and bin geometry for a request.
 *
 * `freqEnd` above Nyquist is clamped (spec edge case), and the returned
 * `freqStart`/`freqEnd` are the retained bins' exact frequencies, so the axis
 * the gram is drawn against says what the pixels actually hold.
 * @param {AnalysisRequest} request - What the caller asks for
 * @returns {AnalysisPlan} The geometry
 * @throws {Error} When the request yields no frames or no bins
 */
export function planAnalysis(request) {
  const { sampleRate, sampleCount, fftSize, hopSize } = request
  if (!isPowerOfTwo(fftSize)) {
    throw new Error(`fft-size must be a power of two, got ${fftSize}`)
  }
  if (!Number.isInteger(hopSize) || hopSize < 1) {
    throw new Error(`hop-size must be a positive integer, got ${hopSize}`)
  }
  const frames = Math.floor((sampleCount - fftSize) / hopSize) + 1
  if (frames < 1) {
    throw new Error(`The recording (${sampleCount} samples) is shorter than one analysis frame (${fftSize} samples)`)
  }

  const nyquist = sampleRate / 2
  const binWidth = sampleRate / fftSize
  const requestedEnd = request.freqEnd === null || request.freqEnd === undefined ? nyquist : request.freqEnd
  const clamped = requestedEnd > nyquist
  const freqEndTarget = clamped ? nyquist : requestedEnd
  if (request.freqStart < 0) {
    throw new Error(`freq-start must not be negative, got ${request.freqStart}`)
  }
  if (request.freqStart >= freqEndTarget) {
    throw new Error(`freq-start (${request.freqStart}) must be below freq-end (${freqEndTarget})`)
  }

  const firstBin = Math.ceil(request.freqStart / binWidth)
  // The last retained bin is the highest whose frequency does not exceed the
  // target; bin fftSize/2 is Nyquist itself.
  const lastBin = Math.min(fftSize / 2, Math.floor(freqEndTarget / binWidth))
  const columns = lastBin - firstBin + 1
  if (columns < 1) {
    throw new Error(`The frequency range ${request.freqStart}–${freqEndTarget} Hz holds no whole bin at ${binWidth} Hz per bin; widen it or raise fft-size`)
  }

  return {
    sampleRate,
    fftSize,
    hopSize,
    frames,
    binWidth,
    firstBin,
    lastBin,
    columns,
    freqStart: firstBin * binWidth,
    freqEnd: lastBin * binWidth,
    clamped
  }
}

/**
 * The shared frame loop. Analyses frames `[from, to)` into `grid`.
 * @param {Float32Array} samples - Mono samples
 * @param {AnalysisPlan} plan - Geometry
 * @param {Float32Array} grid - Output, `frames × columns`
 * @param {{fft: import('./fft.js').FFT, window: Float32Array, re: Float32Array, im: Float32Array}} scratch - Reusable buffers
 * @param {number} from - First frame
 * @param {number} to - One past the last frame
 */
function analyseFrames(samples, plan, grid, scratch, from, to) {
  const { fftSize, hopSize, firstBin, columns } = plan
  const { fft, window, re, im } = scratch
  for (let f = from; f < to; f++) {
    const offset = f * hopSize
    for (let i = 0; i < fftSize; i++) {
      re[i] = samples[offset + i] * window[i]
      im[i] = 0
    }
    fft.forward(re, im)
    const row = f * columns
    for (let k = 0; k < columns; k++) {
      const bin = firstBin + k
      grid[row + k] = re[bin] * re[bin] + im[bin] * im[bin]
    }
  }
}

/**
 * Build the reusable buffers one analysis needs.
 * @param {AnalysisPlan} plan - Geometry
 * @returns {{fft: import('./fft.js').FFT, window: Float32Array, re: Float32Array, im: Float32Array}} Scratch buffers
 */
function makeScratch(plan) {
  const { fftSize } = plan
  // Hann window: main lobe four bins wide, first sidelobe −31 dB — the usual
  // choice for picking tonals out of broadband noise (Harris 1978).
  const window = new Float32Array(fftSize)
  for (let i = 0; i < fftSize; i++) {
    window[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (fftSize - 1))
  }
  return {
    fft: createFFT(fftSize),
    window,
    re: new Float32Array(fftSize),
    im: new Float32Array(fftSize)
  }
}

/**
 * Options for the sliced analysis.
 * @typedef {Object} AnalyseOptions
 * @property {number} [sliceMs=12] - Longest run before yielding to the event loop
 * @property {function(number): void} [onProgress] - Called with 0..1 after each slice
 * @property {function(): Promise<void>} [yieldToLoop] - How to yield; defaults to `setTimeout(0)`
 */

/**
 * Analyse a whole recording without blocking the page.
 *
 * The frame loop is cut into runs of at most `sliceMs` wall-clock
 * milliseconds, with a macrotask yield between them so input, rendering and
 * the progress caption all get their turn (FR-006). The output does not depend
 * on where the cuts fall.
 * @param {Float32Array} samples - Mono samples
 * @param {AnalysisPlan} plan - From {@link planAnalysis}
 * @param {AnalyseOptions} [options] - Slicing and progress
 * @returns {Promise<Float32Array>} The power grid
 */
export async function analyse(samples, plan, options = {}) {
  const sliceMs = options.sliceMs === undefined ? 12 : options.sliceMs
  const onProgress = options.onProgress || (() => {})
  const yieldToLoop = options.yieldToLoop || (() => new Promise(resolve => setTimeout(resolve, 0)))
  const now = typeof performance !== 'undefined' && performance.now
    ? () => performance.now()
    : () => Date.now()

  const grid = new Float32Array(plan.frames * plan.columns)
  const scratch = makeScratch(plan)
  // Frames per probe of the clock: checking `now()` after every frame would
  // cost more than the frame on small sizes.
  const batch = Math.max(1, Math.round(4096 / plan.fftSize) * 8)

  let frame = 0
  while (frame < plan.frames) {
    const sliceStart = now()
    // At least one batch per slice, whatever the clock says, so progress is
    // guaranteed even with a zero budget (the unit lane uses one).
    do {
      const to = Math.min(plan.frames, frame + batch)
      analyseFrames(samples, plan, grid, scratch, frame, to)
      frame = to
    } while (frame < plan.frames && now() - sliceStart < sliceMs)
    onProgress(frame / plan.frames)
    if (frame < plan.frames) {
      await yieldToLoop()
    }
  }
  return grid
}
