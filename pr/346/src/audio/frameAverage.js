/**
 * Incoherent averaging of successive analysis frames.
 *
 * A single FFT frame of a noisy recording is a poor estimate of the spectrum at
 * that instant: the power in each bin is exponentially distributed about its
 * true value, so a gram painted one frame per row is speckled, and a tonal only
 * a few dB above the background is lost in that speckle. Averaging `count`
 * consecutive frames divides the variance by `count` while leaving the mean
 * alone, which is how a weak steady line is made to stand out — the standard
 * move in every sonar display, and one GramFrame did not have.
 *
 * The averaging is *incoherent*: it is done on power, after the FFT, so phase
 * plays no part and a line does not have to be phase-stable across the group to
 * add up. The cost is time resolution — each painted row now covers
 * `count × hopSize` samples — which is the trade the analyst is being asked to
 * judge.
 *
 * Pure: no DOM, no state.
 */

/**
 * How many painted rows `frames` analysis frames make at this averaging.
 *
 * A trailing group shorter than `count` still makes a row, averaged over what
 * it holds, so the end of the recording is never dropped.
 * @param {number} frames - Analysis frames
 * @param {number} count - Frames averaged into each row, 1 or more
 * @returns {number} Painted rows
 */
export function averagedRowCount(frames, count) {
  return Math.ceil(frames / Math.max(1, Math.floor(count)))
}

/**
 * Average groups of `count` consecutive frames into one row each.
 *
 * `count` of 1 is the identity, and returns the grid it was given rather than a
 * copy — the default path pays nothing for the feature existing.
 * @param {Float32Array} grid - Power grid, `frames × columns`
 * @param {number} frames - Rows in `grid`
 * @param {number} columns - Columns
 * @param {number} count - Frames per averaged row, 1 or more
 * @returns {{grid: Float32Array, frames: number}} The averaged grid and its row count
 */
export function averageFrames(grid, frames, columns, count) {
  const n = Math.max(1, Math.floor(count))
  if (n === 1) {
    return { grid, frames }
  }
  const rows = averagedRowCount(frames, n)
  const out = new Float32Array(rows * columns)
  for (let r = 0; r < rows; r++) {
    const from = r * n
    const to = Math.min(frames, from + n)
    const rowOut = r * columns
    for (let f = from; f < to; f++) {
      const rowIn = f * columns
      for (let k = 0; k < columns; k++) out[rowOut + k] += grid[rowIn + k]
    }
    const divisor = to - from
    for (let k = 0; k < columns; k++) out[rowOut + k] /= divisor
  }
  return { grid: out, frames: rows }
}
