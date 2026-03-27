/**
 * @fileoverview Time formatting utilities for GramFrame
 */

/**
 * Formats elapsed time in seconds to mm:ss format
 * @param {number} seconds - The elapsed time in seconds
 * @returns {string} Time formatted as mm:ss
 */
export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  // Pad both minutes and seconds with leading zero if needed
  const paddedMinutes = minutes.toString().padStart(2, '0');
  const paddedSeconds = remainingSeconds.toString().padStart(2, '0');
  
  return `${paddedMinutes}:${paddedSeconds}`;
}

