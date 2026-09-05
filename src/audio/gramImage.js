/**
 * From a power grid to the spectrogram image (spec 168, D5, D6).
 *
 * The analysed grid becomes an ordinary image: the existing `<image>` element
 * receives a PNG data URL and the coordinate pipeline treats the recording as
 * a picture `columns` wide and `frames` tall, exactly as it treats a PNG an
 * author supplied. A 2-D canvas is used once, off screen, to encode that PNG;
 * it is never attached to the page and draws no overlay (plan.md, Constitution
 * Check, Principle I).
 *
 * `powerToLevels` is pure and unit-tested; the colour table and pixel layout
 * live in `colourMap.js`; `paintGram` needs a DOM.
 */

import { levelsToPixels } from './colourMap.js'

/**
 * Hard caps on the gram, from research.md §3.3: inside Chromium's canvas
 * limits with a 2× margin, and where PNG encoding stays under a few seconds.
 * A file that would exceed either is refused (FR-007), never truncated.
 */
const MAX_GRAM_ROWS = 32768
const MAX_GRAM_COLUMNS = 4096

/**
 * Refuse a gram the render path cannot hold.
 * @param {number} frames - Rows
 * @param {number} columns - Columns
 * @param {{fftSize: number, hopSize: number, sampleRate: number}} plan - For the advice in the message
 * @throws {Error} Naming the parameter that would bring the gram inside the cap
 */
export function checkGramSize(frames, columns, plan) {
  if (frames > MAX_GRAM_ROWS) {
    // The smallest power-of-two hop that fits; hop need not be a power of two
    // but a round number is easier to type into a config table.
    let hop = plan.hopSize
    while (Math.ceil(frames * plan.hopSize / hop) > MAX_GRAM_ROWS) hop *= 2
    throw new Error(
      `The analysed spectrogram would be ${frames} rows tall, above the ${MAX_GRAM_ROWS}-row limit. ` +
      `Set hop-size to ${hop} (or shorten the recording).`
    )
  }
  if (columns > MAX_GRAM_COLUMNS) {
    throw new Error(
      `The analysed spectrogram would be ${columns} columns wide, above the ${MAX_GRAM_COLUMNS}-column limit. ` +
      `Lower fft-size (currently ${plan.fftSize}) or narrow freq-start/freq-end.`
    )
  }
}

/**
 * Map power to 8-bit display levels.
 *
 * Power is taken to dB; the display range runs from the file's 5th percentile
 * (floor, level 0) to its 99.9th percentile (ceiling, level 255), measured on
 * an even subsample of at most one million values so the cost is bounded on
 * any file. Percentiles rather than a fixed span below the peak: a recording
 * with one loud transient would otherwise push its steady tonals into the
 * dark. Deterministic for a given grid.
 * @param {Float32Array} grid - Power grid from `spectrogram.js`
 * @returns {Uint8Array} One level per cell, same layout as `grid`
 */
export function powerToLevels(grid) {
  const n = grid.length
  const stride = Math.max(1, Math.floor(n / 1000000))
  const sampleCount = Math.floor((n - 1) / stride) + 1
  const sample = new Float32Array(sampleCount)
  for (let i = 0, j = 0; i < n; i += stride, j++) {
    sample[j] = 10 * Math.log10(grid[i] + 1e-12)
  }
  sample.sort()
  const floor = sample[Math.floor(0.05 * (sampleCount - 1))]
  let ceiling = sample[Math.floor(0.999 * (sampleCount - 1))]
  if (ceiling <= floor) {
    ceiling = floor + 1 // silence: everything at level 0 rather than 0/0
  }
  const scale = 255 / (ceiling - floor)

  const levels = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    const db = 10 * Math.log10(grid[i] + 1e-12)
    const v = (db - floor) * scale
    levels[i] = v <= 0 ? 0 : v >= 255 ? 255 : Math.round(v)
  }
  return levels
}

/**
 * Encode the gram as a PNG data URL through an off-screen canvas.
 * @param {Uint8Array} levels - From {@link powerToLevels}
 * @param {number} frames - Rows
 * @param {number} columns - Columns
 * @returns {string} A `data:image/png;base64,…` URL
 * @throws {Error} When the browser refuses a canvas of this size
 */
export function paintGram(levels, frames, columns) {
  const canvas = document.createElement('canvas')
  canvas.width = columns
  canvas.height = frames
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error(`Could not create a ${columns}×${frames} canvas to paint the spectrogram`)
  }
  const image = context.createImageData(columns, frames)
  image.data.set(levelsToPixels(levels, frames, columns))
  context.putImageData(image, 0, 0)
  const url = canvas.toDataURL('image/png')
  if (!url || !url.startsWith('data:image/png')) {
    throw new Error(`The browser could not encode a ${columns}×${frames} spectrogram image`)
  }
  return url
}
