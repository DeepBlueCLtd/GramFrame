/**
 * @fileoverview Type definitions for GramFrame component
 * This file contains JSDoc type definitions for the spectrogram analysis component.
 */

/**
 * Doppler point with time and frequency coordinates
 * @typedef {Object} DopplerPoint
 * @property {number} time - Time in seconds
 * @property {number} frequency - Frequency in Hz
 */

/**
 * Doppler mode state
 * @typedef {Object} DopplerState
 * @property {DopplerPoint|null} fPlus - f+ marker position
 * @property {DopplerPoint|null} fMinus - f- marker position
 * @property {DopplerPoint|null} fZero - f₀ marker position
 * @property {number|null} speed - Calculated speed in m/s
 * @property {boolean} isDragging - Whether currently dragging a marker
 * @property {string|null} draggedMarker - Which marker is being dragged
 * @property {boolean} isPlacingMarkers - Whether in marker placement mode
 * @property {number} markersPlaced - Number of markers placed (0-2)
 * @property {DopplerPoint|null} tempFirst - Temporary storage for first marker during placement
 * @property {boolean} isPreviewDrag - Whether currently dragging to preview curve
 * @property {DopplerPoint|null} previewEnd - End point for preview drag
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
 * Drag interaction state
 * @typedef {Object} DragState
 * @property {boolean} isDragging - Whether user is currently dragging
 * @property {CursorPosition|null} dragStartPosition - Starting position of drag
 * @property {string|null} draggedHarmonicSetId - ID of harmonic set being dragged
 * @property {number|null} originalSpacing - Original spacing of dragged harmonic set
 * @property {number|null} originalAnchorTime - Original anchor time of dragged harmonic set  
 * @property {number|null} clickedHarmonicNumber - Which harmonic number was clicked for dragging
 * @property {boolean} isCreatingNewHarmonicSet - Whether currently creating a new harmonic set via drag
 */

/**
 * Analysis mode type
 * @typedef {'analysis'|'harmonics'|'doppler'} ModeType
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
 * Zoom state configuration
 * @typedef {Object} ZoomState
 * @property {number} level - Current zoom level (1.0 = no zoom)
 * @property {number} centerX - Center point X (0-1 normalized)
 * @property {number} centerY - Center point Y (0-1 normalized)
 * @property {boolean} panMode - Whether pan mode is active
 */

/**
 * Main component state object
 * @typedef {Object} GramFrameState
 * @property {string} version - Component version
 * @property {string} timestamp - Timestamp of state creation
 * @property {string} instanceId - Unique instance identifier
 * @property {ModeType} mode - Current analysis mode
 * @property {number} rate - Rate value affecting frequency calculations (Hz/s)
 * @property {CursorPosition|null} cursorPosition - Current cursor position data
 * @property {Array<CursorPosition>} cursors - Array of cursor positions (future use)
 * @property {HarmonicsState} harmonics - Harmonics mode state
 * @property {DopplerState} doppler - Doppler mode state
 * @property {AnalysisState} analysis - Analysis mode state
 * @property {DragState} dragState - Drag interaction state
 * @property {ImageDetails} imageDetails - Image source and dimensions
 * @property {Config} config - Time and frequency configuration
 * @property {DisplayDimensions} displayDimensions - Current display dimensions
 * @property {AxesConfig} axes - Axes configuration
 * @property {ZoomState} zoom - Zoom state configuration
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