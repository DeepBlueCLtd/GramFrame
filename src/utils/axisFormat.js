/**
 * Shared numeric formatting for axis-derived text.
 *
 * The rule both axes follow is that the tick interval decides the precision: a
 * label is never finer than the tick it names, and never coarser than it needs
 * to be to differ from its neighbour (issue #259). That rule lived twice — as
 * `formatAtInterval` in `rendering/axes.js` and as `decimalsForInterval` in
 * `utils/timeFormatter.js` — and is now stated once here, so the region-zoom
 * readout can show a span in the same units and to the same precision the axes
 * use (spec 170, FR-005) without a third copy.
 *
 * Pure numbers in, strings out: no DOM, so the unit lane covers it.
 */

/**
 * How many decimal places a tick interval needs to be written exactly.
 *
 * The question is not "is the interval sub-unit" but "can this interval be
 * written at this precision without losing anything". A 2.5 s interval is
 * greater than a second and still needs a decimal place: writing it at whole
 * seconds is exactly the `00:00 00:02 00:05 00:07 00:10` defect, where three
 * of five labels understate their own tick.
 *
 * Capped at three. A millisecond is finer than any gram this component is
 * asked to render, and an unbounded cap would turn a floating-point interval
 * like 0.30000000000000004 into a label nobody can read.
 * @param {number} interval - Spacing between ticks, in the value's own unit
 * @returns {number} Decimal places, 0-3
 */
export function decimalsForInterval(interval) {
  if (!Number.isFinite(interval) || interval <= 0) {
    return 0
  }
  for (let decimals = 0; decimals < 3; decimals++) {
    const scaled = interval * Math.pow(10, decimals)
    if (Math.abs(scaled - Math.round(scaled)) < 1e-9) {
      return decimals
    }
  }
  return 3
}

/**
 * Render a value at the smallest precision that writes its tick interval
 * exactly, capped at three decimals.
 * @param {number} value - Value to render
 * @param {number} interval - Spacing between ticks, in the same unit
 * @returns {string} The value, at a precision the interval justifies
 */
function formatAtInterval(value, interval) {
  if (!Number.isFinite(interval) || interval <= 0) {
    return String(Math.round(value))
  }
  return value.toFixed(decimalsForInterval(interval))
}

/**
 * Format a frequency at a precision the tick interval justifies.
 *
 * Rounding to whole hertz duplicated labels on a narrow band: a gram spanning
 * a few hertz gets sub-hertz tick intervals, and every tick then printed the
 * same integer (issue #259).
 * @param {number} frequency - Frequency value in Hz
 * @param {number} [interval] - Spacing between major ticks in Hz
 * @returns {string} Formatted label
 */
export function formatFrequencyLabel(frequency, interval = 1) {
  return formatAtInterval(frequency, interval) + 'Hz'
}

/**
 * A tick-like interval for a value that has no ticks of its own — the span of a
 * region selection, say.
 *
 * The axes get their precision from an interval the tick engine chose; a span
 * has to derive one. Two significant figures below the span's own magnitude is
 * the same answer the tick engine would give for a range of that size, so a
 * 1.5 kHz span reads `1500Hz` and a 3 Hz one reads `3.2Hz`.
 * @param {number} span - The span being described, in its own unit
 * @returns {number} An interval to format that span at
 */
export function precisionIntervalFor(span) {
  if (!Number.isFinite(span) || span <= 0) {
    return 1
  }
  return Math.pow(10, Math.floor(Math.log10(span)) - 1)
}
