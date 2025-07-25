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

/**
 * Formats elapsed time in seconds to mm:ss format with decimal precision
 * @param {number} seconds - The elapsed time in seconds
 * @param {number} decimals - Number of decimal places for seconds (default: 0)
 * @returns {string} Time formatted as mm:ss.dd
 */
export function formatTimeWithDecimals(seconds, decimals = 0) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  // Pad minutes with leading zero
  const paddedMinutes = minutes.toString().padStart(2, '0');
  
  // Format seconds with specified decimal places
  let formattedSeconds;
  if (decimals > 0) {
    formattedSeconds = remainingSeconds.toFixed(decimals);
    // Pad with leading zero if needed (e.g., 5.50 -> 05.50)
    if (remainingSeconds < 10) {
      formattedSeconds = '0' + formattedSeconds;
    }
  } else {
    formattedSeconds = Math.floor(remainingSeconds).toString().padStart(2, '0');
  }
  
  return `${paddedMinutes}:${formattedSeconds}`;
}

/**
 * Formats time as decimal seconds (for LED displays)
 * @param {number} seconds - The time in seconds
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Time formatted as decimal seconds (e.g., "1.23")
 */
export function formatTimeAsDecimal(seconds, decimals = 2) {
  return seconds.toFixed(decimals);
}