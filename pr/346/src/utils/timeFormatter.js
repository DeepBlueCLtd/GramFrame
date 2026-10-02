/**
 * @fileoverview Time formatting utilities for GramFrame
 */

import { decimalsForInterval } from './axisFormat.js'

/**
 * Formats elapsed time in seconds to mm:ss format
 * @param {number} seconds - The elapsed time in seconds
 * @returns {string} Time formatted as mm:ss
 */
export function formatTime(seconds) {
  // Negative times exist on an audio-sourced gram before play starts: the view
  // holds `[-window, 0]`, and its axis reads "-00:10" … "00:00" (spec 168).
  const sign = seconds < 0 ? '-' : '';
  const magnitude = Math.abs(seconds);
  const minutes = Math.floor(magnitude / 60);
  const remainingSeconds = Math.floor(magnitude % 60);
  
  // Pad both minutes and seconds with leading zero if needed
  const paddedMinutes = minutes.toString().padStart(2, '0');
  const paddedSeconds = remainingSeconds.toString().padStart(2, '0');
  
  return `${sign}${paddedMinutes}:${paddedSeconds}`;
}


/**
 * Format a time-axis tick label at a precision the tick interval justifies.
 *
 * `formatTime` floors to whole seconds, which is right for a cursor readout
 * but wrong for an axis: on a 0-10 s gram the ticks fall every 2.5 s and three
 * of the five labels used to read one to five hundred milliseconds low
 * (`00:00 00:02 00:05 00:07 00:10`), and zoomed in far enough every label
 * collapsed onto the same second (`00:04 00:04 00:05 00:05 00:05`) — R9-07.
 *
 * The interval decides the precision, so a label is never more precise than
 * the tick it names and never less precise than it needs to be to differ from
 * its neighbour. Whole-second intervals keep the familiar `mm:ss`.
 * @param {number} seconds - The tick's time value, which may be negative
 * @param {number} interval - Spacing between ticks in seconds
 * @returns {string} `mm:ss`, or `mm:ss.d` / `mm:ss.dd` / `mm:ss.ddd` when the interval is sub-second
 */
export function formatAxisTime(seconds, interval) {
  const decimals = decimalsForInterval(interval)
  if (decimals === 0) {
    return formatTime(seconds)
  }

  const sign = seconds < 0 ? '-' : ''
  const magnitude = Math.abs(seconds)
  const minutes = Math.floor(magnitude / 60)
  const remainingSeconds = magnitude % 60

  const paddedMinutes = minutes.toString().padStart(2, '0')
  // Pad the whole fixed-point string, not the integer part: "4.5" needs to
  // become "04.5", so the target width is two digits, the point, and the
  // decimals.
  const secondsText = remainingSeconds.toFixed(decimals).padStart(decimals + 3, '0')

  return `${sign}${paddedMinutes}:${secondsText}`
}
