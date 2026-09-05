/**
 * @fileoverview Time formatting utilities for GramFrame
 */

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

