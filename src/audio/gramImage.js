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

/// <reference path="../types.js" />

import { levelsToPixels } from './colourMap.js'
import { powerToDecibels, normaliseDecibels } from './normalise.js'

/**
 * Hard caps on the gram, from research.md §3.3: inside Chromium's canvas
 * limits with a 2× margin, and where PNG encoding stays under a few seconds.
 * A file that would exceed the row cap is offered at a coarser hop instead of
 * refused (spec 171, FR-023); one that would exceed the column cap is still
 * refused. Neither is ever truncated.
 */
const MAX_GRAM_ROWS = 32768
const MAX_GRAM_COLUMNS = 4096

/**
 * What the render caps changed about a requested analysis (spec 171, FR-024).
 * @typedef {Object} DegradedAnalysis
 * @property {string} parameter - The config-table parameter that was changed
 * @property {number} requested - The value the table asked for
 * @property {number} used - The value the gram was rendered at
 */

/**
 * The hop size that would bring a too-tall gram inside the row cap.
 *
 * The smallest power-of-two multiple of the requested hop that fits: hop need
 * not be a power of two, but a round number is easier to reason about and to
 * type into a config table.
 * @param {number} frames - Rows the requested hop would produce
 * @param {number} hopSize - The requested hop, in samples
 * @returns {number} A hop size that fits
 */
function fittingHopSize(frames, hopSize) {
  let hop = hopSize
  while (Math.ceil(frames * hopSize / hop) > MAX_GRAM_ROWS) hop *= 2
  return hop
}

/**
 * Decide what to do about a gram the render path cannot hold as requested.
 *
 * A too-tall gram is *offered* at a coarser hop rather than refused (spec 171,
 * FR-023): the fitting hop was already being computed in order to name it in
 * the refusal message, and nobody in the acoustic family refuses a long
 * recording outright. A too-wide one is still refused — no single parameter
 * this function can substitute brings it inside the cap (FR-025), and the
 * message names the two the author can change.
 * @param {number} frames - Rows
 * @param {number} columns - Columns
 * @param {{fftSize: number, hopSize: number}} plan - The requested analysis
 * @returns {DegradedAnalysis|null} What to change, or null when the gram fits as asked
 * @throws {Error} When no substitution can bring the gram inside the caps
 */
export function fitGramSize(frames, columns, plan) {
  if (columns > MAX_GRAM_COLUMNS) {
    throw new Error(
      `The analysed spectrogram would be ${columns} columns wide, above the ${MAX_GRAM_COLUMNS}-column limit. ` +
      `Lower fft-size (currently ${plan.fftSize}) or narrow freq-start/freq-end.`
    )
  }
  if (frames <= MAX_GRAM_ROWS) {
    return null
  }
  return { parameter: 'hop-size', requested: plan.hopSize, used: fittingHopSize(frames, plan.hopSize) }
}

/**
 * Refuse a gram that is still outside the caps after {@link fitGramSize} has
 * had its say — the existing refusal, kept for the recording no substitution
 * rescues (FR-025).
 * @param {number} frames - Rows
 * @param {number} columns - Columns
 * @param {{fftSize: number, hopSize: number}} plan - The analysis actually planned
 * @throws {Error} Naming the parameter that would bring the gram inside the cap
 */
export function checkGramSize(frames, columns, plan) {
  if (frames > MAX_GRAM_ROWS) {
    throw new Error(
      `The analysed spectrogram would be ${frames} rows tall, above the ${MAX_GRAM_ROWS}-row limit. ` +
      `Set hop-size to ${fittingHopSize(frames, plan.hopSize)} (or shorten the recording).`
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
 * How the analysed grid is turned into display levels.
 * @typedef {Object} LevelOptions
 * @property {string} [normalisation='none'] - One of `NORMALISATION_MODES`
 * @property {number} [frames=0] - Rows; required by the normalisers
 * @property {number} [columns=0] - Columns; required by the normalisers
 * @property {number} [floorPercentile=5] - Percentile painted as level 0
 * @property {number} [ceilingPercentile=99.9] - Percentile painted as level 255
 */

/**
 * Map a dB grid to 8-bit display levels between two percentiles of itself.
 *
 * The percentiles are measured on an even subsample of at most one million
 * values, so the cost is bounded on any file. Percentiles rather than a fixed
 * span below the peak: a recording with one loud transient would otherwise push
 * its steady tonals into the dark.
 *
 * The two ends are worth understanding as *destructive*: everything below the
 * floor is level 0 and everything above the ceiling is 255, and no later
 * control — the contrast sliders included, since they re-map levels that have
 * already been painted — can recover what was clipped here. Widening the floor
 * toward 0 is what brings the quietest 5 % of a recording back into the picture.
 * Deterministic for a given grid.
 * @param {Float32Array} db - Levels in dB
 * @param {LevelOptions} [options] - The two percentiles; the rest is ignored
 * @returns {Uint8Array} One level per cell, same layout as `db`
 */
function decibelsToLevels(db, options = {}) {
  const floorPercentile = options.floorPercentile === undefined ? 5 : options.floorPercentile
  const ceilingPercentile = options.ceilingPercentile === undefined ? 99.9 : options.ceilingPercentile
  const n = db.length
  const stride = Math.max(1, Math.floor(n / 1000000))
  const sampleCount = Math.floor((n - 1) / stride) + 1
  const sample = new Float32Array(sampleCount)
  for (let i = 0, j = 0; i < n; i += stride, j++) sample[j] = db[i]
  sample.sort()
  const at = (/** @type {number} */ percentile) =>
    sample[Math.min(sampleCount - 1, Math.max(0, Math.floor(percentile / 100 * (sampleCount - 1))))]
  const floor = at(floorPercentile)
  let ceiling = at(ceilingPercentile)
  if (ceiling <= floor) {
    ceiling = floor + 1 // silence, or two percentiles that met: everything at level 0 rather than 0/0
  }
  const scale = 255 / (ceiling - floor)

  const levels = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    const v = (db[i] - floor) * scale
    levels[i] = v <= 0 ? 0 : v >= 255 ? 255 : Math.round(v)
  }
  return levels
}

/**
 * Map power to 8-bit display levels, normalising first when asked to.
 *
 * Called with a grid alone this is what it has always been: dB, then the 5th to
 * 99.9th percentile of the whole file onto 0..255.
 * @param {Float32Array} grid - Power grid from `spectrogram.js`
 * @param {LevelOptions} [options] - Normalisation and the display percentiles
 * @returns {Uint8Array} One level per cell, same layout as `grid`
 */
export function powerToLevels(grid, options = {}) {
  const db = powerToDecibels(grid)
  const normalisation = options.normalisation || 'none'
  const normalised = normalisation === 'none'
    ? db
    : normaliseDecibels(db, options.frames || 0, options.columns || 0, normalisation)
  return decibelsToLevels(normalised, options)
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
