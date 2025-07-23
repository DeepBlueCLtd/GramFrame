/**
 * @fileoverview Type definitions for Doppler mode
 * This file contains JSDoc type definitions specific to Doppler analysis functionality.
 */

/**
 * Doppler point with time and frequency coordinates
 * @typedef {Object} DopplerPoint
 * @property {number} time - Time in seconds
 * @property {number} frequency - Frequency in Hz
 */

/**
 * Doppler fit data with all markers and calculated speed
 * @typedef {Object} DopplerFit
 * @property {DopplerPoint} fPlus - f+ marker (end frequency)
 * @property {DopplerPoint} fMinus - f- marker (start frequency)
 * @property {DopplerPoint} fZero - f₀ marker (inflexion point)
 * @property {number} speed - Calculated speed in m/s
 */

/**
 * Doppler mode state
 * @typedef {Object} DopplerState
 * @property {DopplerPoint|null} fPlus - f+ marker position
 * @property {DopplerPoint|null} fMinus - f- marker position
 * @property {DopplerPoint|null} fZero - f₀ marker position
 * @property {number|null} speed - Calculated speed in m/s
 * @property {boolean} isDragging - Whether currently dragging a marker
 * @property {string|null} draggedMarker - Which marker is being dragged ('fPlus', 'fMinus', 'fZero')
 * @property {boolean} isPlacingMarkers - Whether in marker placement mode
 * @property {number} markersPlaced - Number of markers placed (0-2)
 * @property {DopplerPoint|null} tempFirst - Temporary storage for first marker during placement
 * @property {boolean} isPreviewDrag - Whether currently dragging to preview curve
 * @property {DopplerPoint|null} previewEnd - End point for preview drag
 */