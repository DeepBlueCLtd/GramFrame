/**
 * @fileoverview Type definitions for GramFrame component
 * This file contains JSDoc type definitions for the spectrogram analysis component.
 */

/**
 * Configuration object for min/max values of time and frequency
 * @typedef {Object} Config
 * @property {number} timeMin - Minimum time value in seconds
 * @property {number} timeMax - Maximum time value in seconds  
 * @property {number} freqMin - Minimum frequency value in Hz
 * @property {number} freqMax - Maximum frequency value in Hz
 */

/**
 * Image details including source and dimensions
 * @typedef {Object} ImageDetails
 * @property {string} url - Source URL of the spectrogram image
 * @property {number} naturalWidth - Original width of the image in pixels
 * @property {number} naturalHeight - Original height of the image in pixels
 */

/**
 * Current display dimensions (responsive)
 * @typedef {Object} DisplayDimensions
 * @property {number} width - Current display width in pixels
 * @property {number} height - Current display height in pixels
 */

/**
 * Cursor position information
 * @typedef {Object} CursorPosition
 * @property {number} x - Screen x coordinate
 * @property {number} y - Screen y coordinate
 * @property {number} svgX - SVG x coordinate
 * @property {number} svgY - SVG y coordinate
 * @property {number} imageX - Image-relative x coordinate
 * @property {number} imageY - Image-relative y coordinate
 * @property {number} time - Time value in seconds
 * @property {number} freq - Frequency value in Hz
 */

/**
 * Point data for Doppler measurements
 * @typedef {Object} DopplerPoint
 * @property {number} time - Time value in seconds
 * @property {number} freq - Frequency value in Hz
 * @property {number} svgX - SVG x coordinate
 * @property {number} svgY - SVG y coordinate
 */

/**
 * Doppler mode state
 * @typedef {Object} DopplerState
 * @property {DopplerPoint|null} startPoint - First measurement point
 * @property {DopplerPoint|null} endPoint - Second measurement point
 * @property {number|null} deltaTime - Time difference in seconds
 * @property {number|null} deltaFrequency - Frequency difference in Hz
 * @property {number|null} speed - Calculated speed in knots
 */

/**
 * Individual harmonic data
 * @typedef {Object} HarmonicData
 * @property {number} number - Harmonic number (1x, 2x, 3x, etc.)
 * @property {number} frequency - Frequency value in Hz
 * @property {number} svgX - SVG x coordinate for drawing
 */

/**
 * Harmonics mode state
 * @typedef {Object} HarmonicsState
 * @property {number|null} baseFrequency - Base frequency for harmonic calculations
 * @property {HarmonicData[]} harmonicData - Array of calculated harmonic data
 */

/**
 * Drag interaction state
 * @typedef {Object} DragState
 * @property {boolean} isDragging - Whether user is currently dragging
 * @property {CursorPosition|null} dragStartPosition - Starting position of drag
 */

/**
 * Axes margin configuration
 * @typedef {Object} AxesMargins
 * @property {number} left - Left margin for time axis labels
 * @property {number} bottom - Bottom margin for frequency axis labels
 * @property {number} right - Right margin
 * @property {number} top - Top margin
 */

/**
 * Axes configuration
 * @typedef {Object} AxesConfig
 * @property {AxesMargins} margins - Margin configuration for axes
 */

/**
 * Main component state object
 * @typedef {Object} GramFrameState
 * @property {string} version - Component version
 * @property {string} timestamp - Timestamp of state creation
 * @property {Object} metadata - Component instance metadata
 * @property {string} metadata.instanceId - Unique instance identifier
 * @property {'analysis'|'doppler'} mode - Current analysis mode
 * @property {number} rate - Rate value affecting frequency calculations (Hz/s)
 * @property {CursorPosition|null} cursorPosition - Current cursor position data
 * @property {Array<CursorPosition>} cursors - Array of cursor positions (future use)
 * @property {HarmonicsState} harmonics - Harmonics mode state
 * @property {DopplerState} doppler - Doppler mode state
 * @property {DragState} dragState - Drag interaction state
 * @property {ImageDetails} imageDetails - Image source and dimensions
 * @property {Config} config - Time and frequency configuration
 * @property {DisplayDimensions} displayDimensions - Current display dimensions
 * @property {AxesConfig} axes - Axes configuration
 */

/**
 * Data coordinates (time and frequency values)
 * @typedef {Object} DataCoordinates
 * @property {number} freq - Frequency value in Hz
 * @property {number} time - Time value in seconds
 */

/**
 * SVG coordinates
 * @typedef {Object} SVGCoordinates
 * @property {number} x - SVG x coordinate
 * @property {number} y - SVG y coordinate
 */

/**
 * Screen coordinates
 * @typedef {Object} ScreenCoordinates
 * @property {number} x - Screen x coordinate
 * @property {number} y - Screen y coordinate
 */

/**
 * State listener callback function
 * @typedef {function(GramFrameState): void} StateListener
 */

/**
 * Event handler callback for mouse events
 * @typedef {function(MouseEvent): void} MouseEventHandler
 */

/**
 * Event handler callback for resize events
 * @typedef {function(ResizeObserverEntry[]): void} ResizeEventHandler
 */