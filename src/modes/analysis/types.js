/**
 * @fileoverview Type definitions for Analysis mode
 */

/**
 * Marker object for analysis mode
 * @typedef {Object} AnalysisMarker
 * @property {string} id - Unique marker identifier
 * @property {string} color - Marker color
 * @property {number} time - Time coordinate
 * @property {number} freq - Frequency coordinate
 */

/**
 * Analysis state object for analysis mode
 * @typedef {Object} AnalysisState
 * @property {Array<AnalysisMarker>} markers - Array of analysis markers
 */
