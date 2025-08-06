/**
 * @fileoverview Type definitions for GramFrame component
 * This file contains JSDoc type definitions for the spectrogram analysis component.
 */

/**
 * Doppler dragged marker types enum
 * @typedef {'fPlus'|'fMinus'|'fZero'} DopplerDraggedMarker
 */

/**
 * Doppler mode state
 * @typedef {Object} DopplerState
 * @property {DataCoordinates|null} fPlus - f+ marker position
 * @property {DataCoordinates|null} fMinus - f- marker position
 * @property {DataCoordinates|null} fZero - f₀ marker position
 * @property {number|null} speed - Calculated speed in m/s
 * @property {boolean} isDragging - Whether currently dragging a marker
 * @property {string|null} draggedMarker - Which marker is being dragged
 * @property {boolean} isPlacingMarkers - Whether in marker placement mode
 * @property {number} markersPlaced - Number of markers placed (0-2)
 * @property {DataCoordinates|null} tempFirst - Temporary storage for first marker during placement
 * @property {boolean} isPreviewDrag - Whether currently dragging to preview curve
 * @property {DataCoordinates|null} previewEnd - End point for preview drag
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
 * @property {boolean} isDragging - Whether currently dragging a marker
 * @property {string|null} draggedMarkerId - ID of marker being dragged
 * @property {DataCoordinates|null} dragStartPosition - Starting position of drag with freq and time properties
 * @property {string} selectedColor - Currently selected color for markers
 */

/**
 * Individual harmonic data
 * @typedef {Object} HarmonicData
 * @property {number} number - Harmonic number (1x, 2x, 3x, etc.)
 * @property {number} frequency - Frequency value in Hz
 * @property {number} svgX - SVG x coordinate for drawing
 */

/**
 * Harmonic set definition for interactive overlays
 * @typedef {Object} HarmonicSet
 * @property {string} id - Unique identifier for the harmonic set
 * @property {string} color - Display color for harmonic lines
 * @property {number} anchorTime - Time position (Y-axis) in seconds
 * @property {number} spacing - Frequency spacing between harmonics in Hz
 */

/**
 * Harmonics mode state
 * @typedef {Object} HarmonicsState
 * @property {number|null} baseFrequency - Base frequency for harmonic calculations
 * @property {HarmonicData[]} harmonicData - Array of calculated harmonic data
 * @property {HarmonicSet[]} harmonicSets - Array of harmonic sets with persistent overlays
 * @property {string} selectedColor - Currently selected color for new harmonic sets
 */




/**
 * Drag interaction state
 * @typedef {Object} DragState
 * @property {boolean} isDragging - Whether user is currently dragging
 * @property {DataCoordinates|null} dragStartPosition - Starting position of drag
 * @property {string|null} draggedHarmonicSetId - ID of harmonic set being dragged
 * @property {number|null} originalSpacing - Original spacing of dragged harmonic set
 * @property {number|null} originalAnchorTime - Original anchor time of dragged harmonic set  
 * @property {number|null} clickedHarmonicNumber - Which harmonic number was clicked for dragging
 * @property {boolean} isCreatingNewHarmonicSet - Whether currently creating a new harmonic set via drag
 */

/**
 * Analysis mode type
 * @typedef {'analysis'|'harmonics'|'doppler'|'pan'} ModeType
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
 * Selection state for keyboard fine control
 * @typedef {Object} SelectionState
 * @property {string|null} selectedType - Type of selected item ('marker' | 'harmonicSet' | null)
 * @property {string|null} selectedId - ID of selected item
 * @property {number|null} selectedIndex - Index in table for display purposes
 */

/**
 * Main component state object
 * @typedef {Object} GramFrameState
 * @property {string} version - Component version
 * @property {string} timestamp - Timestamp of state creation
 * @property {string} instanceId - Unique instance identifier
 * @property {ModeType} mode - Current analysis mode
 * @property {ModeType|null} previousMode - Previous analysis mode
 * @property {number} rate - Rate value affecting frequency calculations (Hz/s)
 * @property {CursorPosition|null} cursorPosition - Current cursor position data
 * @property {Array<CursorPosition>} cursors - Array of cursor positions (future use)
 * @property {HarmonicsState} harmonics - Harmonics mode state
 * @property {DopplerState} doppler - Doppler mode state
 * @property {AnalysisState} analysis - Analysis mode state
 * @property {DragState} dragState - Drag interaction state
 * @property {SelectionState} selection - Selection state for keyboard control
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

/**
 * GramFrame class interface for JSDoc type checking
 * Note: This interface may be partially initialized during startup
 * @typedef {Object} GramFrame
 * @property {GramFrameState} [state] - Main state object
 * @property {string} [instanceId] - Unique instance identifier  
 * @property {StateListener[]} [stateListeners] - Array of state listeners
 * @property {HTMLTableElement} [configTable] - Original configuration table
 * @property {HTMLDivElement|null} [table] - Component table element
 * @property {HTMLDivElement|null} [modeRow] - Mode selection row
 * @property {HTMLDivElement|null} [mainRow] - Main display row
 * 
 * @property {HTMLDivElement|null} [container] - Main container element
 * @property {SVGSVGElement|null} [svg] - Main SVG element
 * @property {SVGImageElement|null} [spectrogramImage] - Spectrogram image element
 * @property {SVGGElement|null} [cursorGroup] - SVG group for cursor elements
 * @property {SVGGElement|null} [axesGroup] - SVG group for axes
 * @property {SVGRectElement|null} [imageClipRect] - Clipping rectangle for image
 * @property {HTMLDivElement|null} [readoutPanel] - Container for readouts
 * @property {HTMLDivElement|null} [modeCell] - Mode selection cell
 * @property {HTMLDivElement|null} [mainCell] - Main display cell
 * @property {HTMLElement|null} [colorPicker] - Color picker component
 * @property {HTMLElement|null} [timeLED] - Time display LED
 * @property {HTMLElement|null} [freqLED] - Frequency display LED
 * @property {HTMLElement|null} [speedLED] - Speed display LED
 * @property {HTMLElement|null} [modeLED] - Mode display LED
 * @property {HTMLElement|null} [rateLED] - Rate display LED
 * @property {HTMLDivElement|null} [markersContainer] - Container for markers
 * @property {HTMLDivElement|null} [harmonicsContainer] - Container for harmonics
 * @property {HTMLDivElement|null} [leftColumn] - Left column layout
 * @property {HTMLDivElement|null} [middleColumn] - Middle column layout
 * @property {HTMLDivElement|null} [rightColumn] - Right column layout
 * @property {HTMLDivElement|null} [unifiedLayoutContainer] - Main layout container
 * @property {Object<string, HTMLButtonElement>|null} [modeButtons] - Mode switching buttons
 * @property {HTMLDivElement|null} [guidancePanel] - Guidance text panel
 * 
 * @property {Object<string, *>|null} [modes] - Available modes
 * @property {*|null} [currentMode] - Current active mode
 * @property {*|null} [featureRenderer] - Feature rendering coordinator
 * 
 * @property {ResizeObserver|null} [resizeObserver] - Resize observer instance
 * @property {(function(KeyboardEvent): void)|null} [keyboardHandler] - Keyboard event handler
 * @property {(function(Event): void)|null} [_boundHandleResize] - Bound resize handler
 * @property {Object|null} [_panDragState] - Pan drag state
 * @property {Object|null} [zoomControls] - Zoom control elements
 * @property {HTMLElement|null} [harmonicPanel] - Harmonic panel element
 * 
 * @property {function(DataCoordinates): void} [updateUniversalCursorReadouts] - Update cursor readouts
 * @property {function(): void} [updatePersistentPanels] - Update markers and harmonics panels
 * @property {function(): void} [destroy] - Clean up and destroy instance
 * @property {function(number, number): void} [_panImage] - Pan the image
 * @property {function(number, number, number): void} [_setZoom] - Set zoom level
 * @property {function(): void} [_handleResize] - Handle resize events
 * @property {function(ModeType): void} [_switchMode] - Switch between modes
 * @property {function(string, string, number): void} [setSelection] - Set selection
 * @property {function(): void} [clearSelection] - Clear selection  
 * @property {function(): void} [updateSelectionVisuals] - Update selection visuals
 * @property {function(): void} [createUnifiedLayout] - Create unified layout
 * @property {function(): void} [createZoomControls] - Create zoom controls
 */

/**
 * Movement vector for keyboard navigation
 * @typedef {Object} MovementVector
 * @property {number} dx - Horizontal movement delta
 * @property {number} dy - Vertical movement delta
 */

/**
 * RGB color object
 * @typedef {Object} RGBColor
 * @property {number} r - Red component (0-255)
 * @property {number} g - Green component (0-255) 
 * @property {number} b - Blue component (0-255)
 */

/**
 * Collection of mode UI elements
 * @typedef {Object} ModeUIElements
 * @property {HTMLDivElement} modesContainer - Container for mode buttons
 * @property {Object<string, HTMLButtonElement>} modeButtons - Mode switching buttons
 * @property {HTMLDivElement} guidancePanel - Guidance text panel
 */

/**
 * Collection of DOM elements from table setup
 * @typedef {Object} TableElements
 * @property {HTMLDivElement} container - Main container element
 * @property {HTMLDivElement} table - Table element
 * @property {HTMLDivElement} modeRow - Mode row element
 * @property {HTMLDivElement} mainRow - Main row element
 * @property {HTMLDivElement} modeCell - Mode cell element
 * @property {HTMLDivElement} mainCell - Main cell element
 * @property {HTMLDivElement} readoutPanel - Readout panel element
 * @property {SVGSVGElement} svg - SVG element
 * @property {SVGImageElement} spectrogramImage - Spectrogram image element
 * @property {SVGGElement} cursorGroup - SVG cursor group element
 * @property {SVGGElement} axesGroup - SVG axes group element
 * @property {SVGRectElement} imageClipRect - SVG image clipping rectangle
 */

/**
 * Visible data range information
 * @typedef {Object} DataRange
 * @property {number} timeMin - Minimum visible time
 * @property {number} timeMax - Maximum visible time
 * @property {number} freqMin - Minimum visible frequency
 * @property {number} freqMax - Maximum visible frequency
 */

/**
 * Harmonics color state for analysis mode
 * @typedef {Object} HarmonicsColorState
 * @property {string} selectedColor - Selected marker color
 */

/**
 * Analysis mode initial state object
 * @typedef {Object} AnalysisInitialState
 * @property {AnalysisState} analysis - Analysis state
 * @property {HarmonicsColorState} harmonics - Harmonics color state
 */

/**
 * Doppler mode initial state object
 * @typedef {Object} DopplerInitialState
 * @property {DopplerState} doppler - Doppler state
 */

/**
 * Harmonics mode initial state object
 * @typedef {Object} HarmonicsInitialState
 * @property {HarmonicsState} harmonics - Harmonics state
 * @property {DragState} dragState - Drag interaction state
 */

/**
 * Base mode state snapshot (generic)
 * @typedef {Object} ModeStateSnapshot
 * @property {string} mode - Current mode type
 * @property {*} [state] - Mode-specific state data
 */

/**
 * GramFrame API object
 * @typedef {Object} GramFrameAPI
 * @property {function(): GramFrame[]} init - Initialize all config tables
 * @property {function(Document|HTMLElement): GramFrame[]} detectAndReplaceConfigTables - Detect and replace config tables
 * @property {function(StateListener): StateListener} addStateListener - Add state listener
 * @property {function(StateListener): boolean} removeStateListener - Remove state listener
 * @property {function(HTMLTableElement, string): void} _addErrorIndicator - Add error indicator to table
 * @property {GramFrame[]} [_instances] - Internal instances array
 * @property {function(): void} [__test__forceUpdate] - Test method to force update
 * @property {function(): GramFrame[]} [__test__getInstances] - Test method to get instances
 * @property {function(string): GramFrame|null} [__test__getInstance] - Test method to get instance by ID
 */

/**
 * Test parameter object for Playwright tests
 * @typedef {Object} TestParams
 * @property {*} gramFramePage - GramFrame page object
 */

/**
 * Mouse position object for tests
 * @typedef {Object} TestPosition
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 */

/**
 * SVG bounds object for test calculations
 * @typedef {Object} TestSVGBounds
 * @property {number} x - Left boundary
 * @property {number} y - Top boundary  
 * @property {number} width - Width of SVG
 * @property {number} height - Height of SVG
 */

/**
 * Test position result object
 * @typedef {Object} TestPositions
 * @property {TestPosition} topLeft - Top-left position
 * @property {TestPosition} topRight - Top-right position
 * @property {TestPosition} bottomLeft - Bottom-left position
 * @property {TestPosition} bottomRight - Bottom-right position
 * @property {TestPosition} center - Center position
 */

/**
 * Test tolerance object for comparisons
 * @typedef {Object} TestTolerance
 * @property {number} [time] - Time tolerance
 * @property {number} [freq] - Frequency tolerance
 */

/**
 * Test context object for fixtures
 * @typedef {Object} TestContext
 * @property {*} gramFramePage - GramFrame page object
 */

/**
 * Expected harmonic set properties for test verification
 * @typedef {Object} TestHarmonicSetProps
 * @property {number} [fundamentalFreq] - Expected fundamental frequency
 * @property {number} [rate] - Expected rate
 * @property {string} [color] - Expected color
 */

/**
 * Screen to data coordinate conversion result
 * @typedef {Object} ScreenToDataResult
 * @property {SVGCoordinates} svgCoords - SVG coordinates
 * @property {number} imageX - Image X coordinate
 * @property {number} imageY - Image Y coordinate
 * @property {DataCoordinates} dataCoords - Data coordinates
 */