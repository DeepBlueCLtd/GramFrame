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
 * @property {string|null} color - Color used for this doppler curve
 * @property {DataCoordinates|null} tempFirst - Temporary storage for first marker during placement
 * @property {DataCoordinates|null} previewEnd - End point for preview drag
 *
 * Drag bookkeeping lives on `state.drag` (see DragProjection); `tempFirst` and
 * `previewEnd` stay here because they are placement geometry the renderer
 * needs, not drag state.
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
 * @property {number} naturalWidth - Original width of the image in pixels (data-mapping reference + landscape test)
 * @property {number} naturalHeight - Original height of the image in pixels
 * @property {number} [renderWidth] - Base render width the image/axes/overlay are drawn at (before zoom); defaults to naturalWidth
 * @property {number} [renderHeight] - Base render height the image/axes/overlay are drawn at (before zoom); defaults to naturalHeight
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
 * @property {SymbolType} [symbol] - Marker symbol; `cross` (default) draws a crosshair, a shaped symbol draws that mark
 * @property {boolean} [largeSymbols] - EXPERIMENT (temporary): draw this marker's symbol at the large size; not persisted
 */

/**
 * Analysis state object for analysis mode
 * @typedef {Object} AnalysisState
 * @property {Array<AnalysisMarker>} markers - Array of analysis markers
 *
 * Drag bookkeeping lives on `state.drag` (see DragProjection).
 */

/**
 * Individual harmonic data
 * @typedef {Object} HarmonicData
 * @property {number} number - Harmonic number (1x, 2x, 3x, etc.)
 * @property {number} frequency - Frequency value in Hz
 * @property {number} svgX - SVG x coordinate for drawing
 */

/**
 * Symbol style used as a colour-blind-friendly visual code for a feature.
 * `cross` is the symbol-less default (no drawn shape); the remaining values are
 * filled shapes. Any unknown/absent value resolves to `cross`.
 * @typedef {'cross'|'circle'|'square'|'diamond'|'triangle'|'triangle-down'|'star'} SymbolType
 */

/**
 * Harmonic set definition for interactive overlays
 * @typedef {Object} HarmonicSet
 * @property {string} id - Unique identifier for the harmonic set
 * @property {string} color - Display color for harmonic lines
 * @property {number} anchorTime - Time position (Y-axis) in seconds
 * @property {number} spacing - Frequency spacing between harmonics in Hz
 * @property {SymbolType} symbol - Filled shape drawn at the top of each pin and shown in the harmonics table
 * @property {boolean} [showPin] - Whether the vertical pin lines are drawn; absent (legacy/restored) means shown
 * @property {boolean} [largeSymbols] - EXPERIMENT (temporary): draw this set's pin symbols at the large size; not persisted
 */

/**
 * Harmonics mode state
 * @typedef {Object} HarmonicsState
 * @property {number|null} baseFrequency - Base frequency for harmonic calculations
 * @property {HarmonicData[]} harmonicData - Array of calculated harmonic data
 * @property {HarmonicSet[]} harmonicSets - Array of harmonic sets with persistent overlays
 */




/**
 * One column of a DiffingTable.
 * @typedef {Object} TableColumn
 * @property {string} label - Header text
 * @property {string} [width] - CSS width for the header cell
 * @property {string} [cellClassName] - Class applied to every body cell in this column
 */

/**
 * What a consumer supplies to `createDiffingTable`: the meaning, not the
 * mechanism (spec 166, FR-009).
 * @typedef {Object} TableSpec
 * @property {TableColumn[]} columns - Header labels, in order
 * @property {string} rowAttribute - Attribute carrying a row's identity, e.g. 'data-marker-id'
 * @property {function(any, number): string} rowKey - Stable identity for diffing
 * @property {string} [rowClassName] - Class applied to every row
 * @property {function(any, number): Array<string|Node>} cells - Cell content per column
 * @property {string} [deleteSelector] - Selector for the delete control; clicks on it delete rather than select
 * @property {function(string, any, number): void} [onSelect] - Row click
 * @property {function(string, any, number): void} [onDelete] - Delete-control click
 * @property {function(string): boolean} [isSelected] - Whether the row with this key is selected
 */

/**
 * Coalescing options for a state dispatch.
 * @typedef {Object} DispatchOptions
 * @property {boolean} [frame] - Coalesce at animation-frame cadence instead of
 *                               microtask cadence. For mousemove/wheel/drag paths.
 */

/**
 * What kind of drag is in progress.
 * @typedef {'move'|'create'|'place'|'pan'} DragKind
 */

/**
 * Drag bookkeeping, internal to BaseDragHandler. Not broadcast: listeners see
 * the DragProjection below instead.
 * @typedef {Object} DragState
 * @property {boolean} isDragging - Whether a drag operation is active
 * @property {DragKind|null} kind - What kind of drag is in progress
 * @property {string|null} draggedTargetId - ID of the target being dragged
 * @property {string|null} draggedTargetType - Type of the target being dragged
 * @property {DataCoordinates|null} dragStartPosition - Position the drag began at
 * @property {any} originalData - Snapshot the mode needs to compute deltas
 */

/**
 * Read-only projection of the active drag, derived from the owning
 * BaseDragHandler. Modes MUST NOT write this; it is rebuilt on each transition
 * and is always present, reading `active: false` when idle.
 * @typedef {Object} DragProjection
 * @property {boolean} active - Whether a drag is in progress
 * @property {DragKind|null} kind - What kind of drag
 * @property {ModeType|null} mode - Mode that owns the drag
 * @property {string|null} targetId - Id of the dragged feature, if any
 * @property {string|null} targetType - 'marker' | 'harmonicSet' | 'dopplerMarker' | null
 * @property {DataCoordinates|null} startPosition - Where the drag began, in data coordinates
 */

/**
 * What a mode's target resolver returns on mousedown; null means "not a drag".
 * @typedef {Object} DragTarget
 * @property {DragKind} kind - What kind of drag this starts
 * @property {string|null} id - Feature id for move/place; null for create/pan
 * @property {string|null} type - Feature type; null for pan
 * @property {DataCoordinates|null} [position] - Current position of the target; null for a pixel-space (pan) drag
 * @property {any} [data] - Snapshot the mode needs to compute deltas
 */

/**
 * Lifecycle callbacks a mode supplies to the drag engine.
 * Positions are nullable throughout: a pan drag works in screen pixels and has
 * no meaningful data position, so it passes null and its callbacks ignore the
 * argument. Every feature drag receives a real position.
 * @typedef {Object} DragCallbacks
 * @property {function(DataCoordinates|null, MouseEvent=): DragTarget|null} resolveTarget - Decide whether this mousedown starts a drag, and of what kind
 * @property {function(DragTarget, DataCoordinates|null, MouseEvent=): void} onDragStart - Called once, when the drag starts
 * @property {function(DragTarget, DataCoordinates|null, DataCoordinates|null, MouseEvent=): void} onDragMove - Called per move
 * @property {function(DragTarget, DataCoordinates|null, MouseEvent=): void} onDragEnd - Called on mouseup, or with a null position when a drag is cancelled
 * @property {function(DragTarget): void} [onDragCancel] - Called on mouseleave / cancel; must restore prior state
 * @property {function(string): void} [updateCursor] - Apply a cursor style
 * @property {function(DragKind|null, string): string|null} [cursorFor] - Optional per-kind cursor
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
 * Zoom state configuration
 * @typedef {Object} ZoomState
 * @property {number} level - Current zoom level (1.0 = no zoom)
 * @property {number} centerX - Center point X (0-1 normalized)
 * @property {number} centerY - Center point Y (0-1 normalized)
 */

/**
 * Viewport configuration for coordinate transformations
 * @typedef {Object} ViewportConfig
 * @property {AxesMargins} margins - SVG margins configuration
 * @property {ImageDetails} imageDetails - Image dimensions
 * @property {Config} config - Time/frequency range configuration
 * @property {ZoomState} zoom - Current zoom state
 * @property {number} rate - Frequency divider, applied on the data side only
 */

/**
 * A point in image space: pixels relative to the image's top-left, expressed
 * against the base render size so it is independent of the current zoom.
 * @typedef {Object} ImageCoordinates
 * @property {number} x - Image-relative x coordinate, in render pixels
 * @property {number} y - Image-relative y coordinate, in render pixels
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
 * @property {string} selectedColor - Colour for the NEXT created feature (when nothing is selected); when a feature is selected the picker restyles it instead
 * @property {SymbolType} selectedSymbol - Symbol for the NEXT created harmonic set or marker (when nothing is selected); when a feature is selected the picker restyles it instead
 * @property {boolean} showHarmonicPin - Pin visibility for the NEXT created harmonic set; session preference, on by default
 * @property {boolean} largeSymbols - EXPERIMENT (temporary): large-symbol size for the NEXT created feature (when nothing is selected); in-memory only, never persisted
 * @property {CursorPosition|null} cursorPosition - Current cursor position data
 * @property {Array<CursorPosition>} cursors - Array of cursor positions (future use)
 * @property {number} annotationRevision - Bumped by every annotation mutation; lets the storage listener skip pure cursor moves
 * @property {HarmonicsState} harmonics - Harmonics mode state
 * @property {DopplerState} doppler - Doppler mode state
 * @property {AnalysisState} analysis - Analysis mode state
 * @property {DragProjection} drag - Read-only projection of the active drag
 * @property {SelectionState} selection - Selection state for keyboard control
 * @property {ImageDetails} imageDetails - Image source and dimensions
 * @property {Config} config - Time and frequency configuration
 * @property {DisplayDimensions} displayDimensions - Current display dimensions
 * @property {AxesMargins} margins - Axes margin configuration
 * @property {ZoomState} zoom - Zoom state configuration
 * @property {boolean} [imageExpanded] - Whether the image is expanded to fill available space (in-memory only)
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
 * Stored annotation set persisted in browser storage for a single GramFrame instance
 * @typedef {Object} StoredAnnotations
 * @property {number} version - Schema version (currently 1)
 * @property {string} savedAt - ISO 8601 timestamp of last save
 * @property {StoredAnalysisData} analysis - Stored analysis mode annotations
 * @property {StoredHarmonicsData} harmonics - Stored harmonics mode annotations
 * @property {StoredDopplerData} doppler - Stored doppler mode annotations
 */

/**
 * Stored analysis data
 * @typedef {Object} StoredAnalysisData
 * @property {Array<StoredMarker>} markers - All analysis markers
 */

/**
 * Stored marker (persisted subset of AnalysisMarker)
 * @typedef {Object} StoredMarker
 * @property {string} id - Unique marker identifier
 * @property {string} color - Marker colour (hex)
 * @property {number} time - Time position in seconds
 * @property {number} freq - Frequency position in Hz
 * @property {SymbolType} [symbol] - Persisted symbol; ABSENT in legacy records (default `cross` on restore)
 */

/**
 * Stored harmonics data
 * @typedef {Object} StoredHarmonicsData
 * @property {Array<StoredHarmonicSet>} harmonicSets - All harmonic sets
 */

/**
 * Stored harmonic set (persisted subset of HarmonicSet)
 * @typedef {Object} StoredHarmonicSet
 * @property {string} id - Unique identifier
 * @property {string} color - Display colour (hex)
 * @property {number} anchorTime - Y-axis position in seconds
 * @property {number} spacing - Frequency spacing between harmonics in Hz
 * @property {SymbolType} [symbol] - Persisted symbol; ABSENT in legacy (pre-feature) records
 * @property {boolean} [showPin] - Persisted pin visibility; ABSENT in records saved before the pin toggle (restores as shown)
 */

/**
 * Stored doppler data
 * @typedef {Object} StoredDopplerData
 * @property {DataCoordinates|null} fPlus - Upper frequency marker position
 * @property {DataCoordinates|null} fMinus - Lower frequency marker position
 * @property {DataCoordinates|null} fZero - Centre frequency marker position
 * @property {string|null} color - Curve colour (hex)
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
 * The GramFrame component itself.
 *
 * Resolved from the class rather than restated here. This used to be a
 * hand-written interface of ~70 optional, nullable members, prefaced with
 * "this interface may be partially initialized during startup" — which was
 * true when `initializeDOMProperties` set every field to `null` and later
 * steps filled them in. It is no longer: the constructor assigns each field
 * from the step that builds it, so the class declarations are the truth and a
 * second copy here could only drift from them (spec 167, FR-009).
 * @typedef {import('./main.js').GramFrame} GramFrame
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
 * Command button definition for modes
 * @typedef {Object} CommandButton
 * @property {string} label - Button text/symbol
 * @property {string} title - Button tooltip
 * @property {function(): void} action - Button click handler
 * @property {function(): boolean} [isEnabled] - Optional function to determine if button should be enabled
 */

/**
 * Collection of mode UI elements
 * @typedef {Object} ModeUIElements
 * @property {HTMLDivElement} modesContainer - Container for mode buttons
 * @property {Object<string, HTMLButtonElement>} modeButtons - Mode switching buttons
 * @property {Object<string, HTMLButtonElement[]>} commandButtons - Command buttons by mode
 * @property {HTMLDivElement} guidancePanel - Guidance text panel
 */

/**
 * The selection and restyle functions bound by `setupAllEventListeners`.
 * @typedef {Object} SelectionControls
 * @property {function(string): void} removeHarmonicSet - Delete a harmonic set by id
 * @property {function(string, string, number): void} setSelection - Select a feature
 * @property {function(): void} clearSelection - Clear the selection
 * @property {function(): void} updateSelectionVisuals - Re-render selection styling
 * @property {function(string): boolean} applyColorToSelectedFeature - Restyle colour in place
 * @property {function(SymbolType): boolean} applySymbolToSelectedFeature - Restyle symbol in place
 * @property {function(boolean): boolean} applyPinToSelectedFeature - Show/hide pin lines
 * @property {function(boolean): boolean} applyLargeSymbolsToSelectedFeature - Resize symbols
 */

/**
 * The columns, LED displays and panel containers built by `createUnifiedLayout`.
 * @typedef {Object} UnifiedLayoutElements
 * @property {HTMLDivElement} unifiedLayoutContainer - Main layout container
 * @property {HTMLDivElement} leftColumn - Readout column
 * @property {HTMLDivElement} middleColumn - Markers column
 * @property {HTMLDivElement} rightColumn - Harmonics column
 * @property {HTMLDivElement} modeColumn - Mode buttons column
 * @property {HTMLDivElement} guidanceColumn - Guidance text column
 * @property {HTMLDivElement} controlsColumn - Controls column
 * @property {HTMLDivElement} markersContainer - Markers table container
 * @property {HTMLDivElement} harmonicsContainer - Harmonics panel container
 * @property {HTMLElement} timeLED - Time readout
 * @property {HTMLElement} freqLED - Frequency readout
 * @property {HTMLElement} speedLED - Speed readout
 * @property {HTMLElement} colorPicker - Colour picker control
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
 * @property {HTMLButtonElement} [expandToggleButton] - Expand/collapse toggle button (landscape only)
 * @property {SVGGElement} cursorGroup - SVG cursor group element
 * @property {SVGGElement} axesGroup - SVG axes group element
 * @property {SVGRectElement} imageClipRect - SVG image clipping rectangle
 * @property {SVGRectElement} cursorClipRect - SVG cursor group clipping rectangle
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
 * Analysis mode initial state object
 * @typedef {Object} AnalysisInitialState
 * @property {AnalysisState} analysis - Analysis state
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
 * @property {function(): boolean} [getExpandState] - Get current expand state (first instance)
 * @property {function(boolean): void} [setExpandState] - Expand/collapse landscape instances
 * @property {function(HTMLTableElement, string): void} _addErrorIndicator - Add error indicator to table
 * @property {function(HTMLTableElement, Node|null, Node|null): void} _restoreConfigTable - Put a config table back after a failed init
 * @property {function(): GramFrame[]} _getInstances - The API's single instance registry
 * @property {function(): void} [__test__flushDispatches] - Deliver every instance's pending notification (debug pages only)
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