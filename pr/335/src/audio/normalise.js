/**
 * Background normalisation of a spectrogram, in decibels.
 *
 * GramFrame's original painting maps one global dB range — the 5th to the
 * 99.9th percentile of the whole file — onto the colour table. That is honest
 * but blunt: machinery and ship noise falls away steeply with frequency, so the
 * loud low end saturates while a genuine tonal higher up sits a decibel or two
 * above its own local background and is painted the same colour as that
 * background. Sonar displays have always solved this by *normalising*: estimate
 * what the background is at each point and show only how far above it the data
 * sits, so a weak line reads the same wherever in the band it lies.
 *
 * Two estimators are offered because they fail in opposite directions, and
 * which failure matters is a question for an analyst rather than for us:
 *
 * - `split-window` estimates the background **along frequency**, from bins
 *   either side of the one being normalised with a guard band between, so a
 *   narrowband line never contributes to the background it is measured against.
 *   This is the classic LOFAR normaliser, and it does not care how long a tonal
 *   lasts — a line present for the whole recording survives it intact. It
 *   cannot, by construction, show broadband structure: anything as wide as the
 *   window is background by definition.
 * - `per-bin` estimates the background **along time**, as each bin's median
 *   level over the recording. It removes a fixed spectral shape and any
 *   steady system noise very cleanly, and keeps broadband events visible — but
 *   a tonal that runs the whole length of the recording is, to this estimator,
 *   exactly what background looks like, and is flattened away with it.
 *
 * Pure: no DOM, no state.
 */

/** Half-width of the split window, in bins: the background is drawn from this far each side. */
export const SPLIT_WINDOW_BINS = 25

/**
 * Half-width of the guard band, in bins.
 *
 * A Hann-windowed tone occupies about four bins, so three each side keeps a
 * line's own energy — and its main-lobe skirts — out of its background estimate.
 */
const SPLIT_GUARD_BINS = 3

/**
 * How far above the first-pass background a value must sit to be treated as
 * signal and excluded from the second pass (the TPSW rejection step).
 */
const SPLIT_REJECT_DB = 3

/** The estimators `normaliseDecibels` understands. `none` leaves the data alone. */
export const NORMALISATION_MODES = ['none', 'split-window', 'per-bin']

/**
 * Power to decibels, with a floor that keeps `log10(0)` out of the data.
 * @param {Float32Array} grid - Power grid
 * @returns {Float32Array} The same cells in dB
 */
export function powerToDecibels(grid) {
  const db = new Float32Array(grid.length)
  for (let i = 0; i < grid.length; i++) db[i] = 10 * Math.log10(grid[i] + 1e-12)
  return db
}

/**
 * Split-window background for one row, written into `out`.
 *
 * Both passes are running sums over a prefix table, so the cost is O(columns)
 * per row however wide the window is — the whole point of doing it this way
 * rather than re-summing a window per bin.
 * @param {Float32Array} row - The row's dB values
 * @param {number} columns - Its length
 * @param {Float32Array} prefix - Scratch, `columns + 1` long
 * @param {Float32Array} out - Where the background goes, `columns` long
 * @param {number} window - Outer half-width, bins
 * @param {number} guard - Guard half-width, bins
 */
function splitWindowPass(row, columns, prefix, out, window, guard) {
  prefix[0] = 0
  for (let k = 0; k < columns; k++) prefix[k + 1] = prefix[k] + row[k]
  for (let k = 0; k < columns; k++) {
    const outerFrom = Math.max(0, k - window)
    const outerTo = Math.min(columns - 1, k + window)
    const innerFrom = Math.max(0, k - guard)
    const innerTo = Math.min(columns - 1, k + guard)
    const count = (outerTo - outerFrom + 1) - (innerTo - innerFrom + 1)
    if (count > 0) {
      const sum = (prefix[outerTo + 1] - prefix[outerFrom]) - (prefix[innerTo + 1] - prefix[innerFrom])
      out[k] = sum / count
    } else {
      // Too few bins either side for a guarded estimate: the whole row is the
      // best background there is.
      out[k] = prefix[columns] / columns
    }
  }
}

/**
 * Normalise along frequency, row by row (the LOFAR split-window normaliser).
 * @param {Float32Array} db - dB grid, `frames × columns`
 * @param {number} frames - Rows
 * @param {number} columns - Columns
 * @returns {Float32Array} dB above the local background
 */
function splitWindowNormalise(db, frames, columns) {
  // Narrow grams cannot support the standard window; shrink it rather than
  // decline, and let the guard shrink with it so an estimate still exists.
  const window = Math.min(SPLIT_WINDOW_BINS, Math.max(1, Math.floor((columns - 1) / 2)))
  const guard = Math.min(SPLIT_GUARD_BINS, Math.max(0, window - 1))

  const out = new Float32Array(db.length)
  const row = new Float32Array(columns)
  const clipped = new Float32Array(columns)
  const background = new Float32Array(columns)
  const prefix = new Float32Array(columns + 1)

  for (let f = 0; f < frames; f++) {
    const start = f * columns
    for (let k = 0; k < columns; k++) row[k] = db[start + k]

    // Pass one estimates the background with the lines still in it, which
    // biases it upward wherever the band is busy.
    splitWindowPass(row, columns, prefix, background, window, guard)
    // Pass two repeats the estimate with everything that looked like signal
    // replaced by that first estimate, so a strong line no longer raises the
    // floor its weaker neighbours are measured against.
    for (let k = 0; k < columns; k++) {
      clipped[k] = row[k] > background[k] + SPLIT_REJECT_DB ? background[k] : row[k]
    }
    splitWindowPass(clipped, columns, prefix, background, window, guard)

    for (let k = 0; k < columns; k++) out[start + k] = row[k] - background[k]
  }
  return out
}

/**
 * Each bin's median level over time, subsampled so the cost is bounded.
 *
 * A median rather than a mean: the statistic has to describe the background,
 * and a mean is pulled upward by every transient in the recording.
 * @param {Float32Array} db - dB grid
 * @param {number} frames - Rows
 * @param {number} columns - Columns
 * @returns {Float32Array} One background level per column
 */
function perBinMedians(db, frames, columns) {
  // At most this many rows go into each median. A background level does not
  // become meaningfully truer for being measured on 30000 rows rather than
  // 4096, and the sort is the expensive part.
  const cap = 4096
  const stride = Math.max(1, Math.floor(frames / cap))
  const count = Math.floor((frames - 1) / stride) + 1
  const sample = new Float32Array(count)
  const medians = new Float32Array(columns)
  for (let k = 0; k < columns; k++) {
    for (let f = 0, j = 0; f < frames; f += stride, j++) sample[j] = db[f * columns + k]
    const sorted = Float32Array.from(sample).sort()
    medians[k] = sorted[Math.floor(0.5 * (count - 1))]
  }
  return medians
}

/**
 * Normalise a dB grid against its background.
 * @param {Float32Array} db - dB grid, `frames × columns`
 * @param {number} frames - Rows
 * @param {number} columns - Columns
 * @param {string} mode - One of {@link NORMALISATION_MODES}
 * @returns {Float32Array} The normalised grid, or `db` itself when `mode` is `none`
 */
export function normaliseDecibels(db, frames, columns, mode) {
  if (mode === 'split-window') {
    return splitWindowNormalise(db, frames, columns)
  }
  if (mode === 'per-bin') {
    const medians = perBinMedians(db, frames, columns)
    const out = new Float32Array(db.length)
    for (let f = 0; f < frames; f++) {
      const start = f * columns
      for (let k = 0; k < columns; k++) out[start + k] = db[start + k] - medians[k]
    }
    return out
  }
  return db
}
