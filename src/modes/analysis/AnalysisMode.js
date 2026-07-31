import { BaseMode } from '../BaseMode.js'
import { dispatch, markAnnotationsChanged } from '../../core/state.js'
import { createDiffingTable } from '../../components/DiffingTable.js'

/**
 * Build a marker row's delete button. Markup unchanged from before the table
 * engines were shared, so existing selectors and styling keep working (T2).
 * @returns {HTMLButtonElement} The delete button
 */
function createMarkerDeleteButton() {
  const button = document.createElement('button')
  button.textContent = '×'
  button.className = 'gram-frame-marker-delete-btn'
  button.style.background = 'none'
  button.style.border = 'none'
  button.style.color = '#ff4444'
  button.style.cursor = 'pointer'
  button.style.fontSize = '16px'
  button.style.fontWeight = 'bold'
  return button
}
import { formatTime } from '../../utils/timeFormatter.js'
import { dataToSVG } from '../../utils/coordinates.js'
import { BaseDragHandler } from '../shared/BaseDragHandler.js'
import { getUniformTolerance, isWithinToleranceRadius } from '../../utils/tolerance.js'
import { createSymbolMark, createColorIndicator, resolveSymbolScale } from '../../rendering/symbols.js'

/**
 * Analysis mode implementation
 * Provides crosshair rendering, basic time/frequency display, and persistent markers
 */
export class AnalysisMode extends BaseMode {
  /**
   * Base pixel size (width/height) of a marker's symbol mark when it carries a
   * shaped symbol (feature 161). Roughly matches the crosshair's visual weight.
   * The drawn size is this scaled by the temporary "Large symbols" toggle, so a
   * marker's symbol tracks the harmonic pins' symbols.
   * @type {number}
   */
  static MARKER_SYMBOL_SIZE = 14

  /**
   * Initialize AnalysisMode with drag handler
   * @param {GramFrame} instance - GramFrame instance
   */
  constructor(instance) {
    super(instance)
    
    // Initialize drag handler with analysis-specific callbacks
    this.dragHandler = new BaseDragHandler(instance, {
      resolveTarget: (position) => this.findMarkerAtPosition(position),
      onDragStart: (target, position) => this.onMarkerDragStart(target, position),
      onDragMove: (target, currentPos, startPos) => this.onMarkerDragUpdate(target, currentPos, startPos),
      onDragEnd: (target, position) => this.onMarkerDragEnd(target, position),
      updateCursor: (style) => this.updateCursorStyle(style)
    }, 'analysis')
  }

  /**
   * Start dragging a marker
   * @param {DragTarget} target - Drag target with id and type
   * @param {DataCoordinates} position - Start position
   */
  onMarkerDragStart(target, position) {
    // Drag bookkeeping belongs to the engine (state.drag); this callback only
    // does the mode-specific part.
    void position

    // Auto-select the marker being dragged
    const marker = this.instance.state.analysis.markers.find(m => m.id === target.id)
    if (marker) {
      const index = this.instance.state.analysis.markers.findIndex(m => m.id === target.id)
      this.instance.setSelection('marker', target.id, index)
    }
  }

  /**
   * Update marker position during drag
   * @param {DragTarget} target - Drag target with id and type
   * @param {DataCoordinates} currentPos - Current position
   * @param {DataCoordinates} _startPos - Start position (unused)
   */
  onMarkerDragUpdate(target, currentPos, _startPos) {
    const marker = this.instance.state.analysis.markers.find(m => m.id === target.id)
    if (marker) {
      // Update marker position
      marker.freq = currentPos.freq
      marker.time = currentPos.time
      markAnnotationsChanged(this.instance)
      
      // Re-render persistent features
      if (this.instance.featureRenderer) {
        this.instance.featureRenderer.renderAllPersistentFeatures()
      }
      
      // Throttle table updates - use requestAnimationFrame
      if (!this.updateTableScheduled) {
        this.updateTableScheduled = true
        requestAnimationFrame(() => {
          this.updateMarkersTable()
          this.updateTableScheduled = false
        })
      }
      
      // Notify listeners
      dispatch(this.instance, { frame: true })
    }
  }

  /**
   * End dragging a marker
   * @param {Object} _target - Drag target with id and type (unused)
   * @param {DataCoordinates} _position - End position (unused)
   */
  onMarkerDragEnd(_target, _position) {
    // Nothing to unwind: the engine clears the drag record itself.
  }

  /**
   * Update cursor style for drag operations
   * @param {string} style - Cursor style ('crosshair', 'grab', 'grabbing')
   */
  updateCursorStyle(style) {
    if (this.instance.svg) {
      this.instance.svg.style.cursor = style
    }
  }

  /**
   * Get guidance content for analysis mode
   * @returns {Object} Structured guidance content
   */
  getGuidanceText() {
    return {
      title: 'Cross Cursor Mode',
      items: [
        'Click to place persistent markers',
        'Drag existing markers to reposition them',
        'Right-click markers to delete them',
        'Click table row + arrow keys (Shift for larger steps)'
      ]
    }
  }

  /**
   * Handle mouse move events in analysis mode
   * @param {MouseEvent} _event - Mouse event (unused in current implementation)
   * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
   */
  handleMouseMove(_event, dataCoords) {
    // Handle drag operations through drag handler
    if (this.dragHandler.isDragging()) {
      this.dragHandler.handleMouseMove(dataCoords)
    } else {
      // Update cursor style for hover
      this.dragHandler.updateCursorForHover(dataCoords)
    }
    
    // Universal cursor readouts are now handled centrally in main.js
    // Analysis mode specific handling can be added here if needed
  }

  /**
   * Handle mouse down events in analysis mode
   * @param {MouseEvent} event - Mouse event
   * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
   */
  handleMouseDown(event, dataCoords) {
    // Only handle left clicks
    if (event.button !== 0) {
      return
    }
    
    // Try to start drag on existing marker
    const dragStarted = this.dragHandler.startDrag(dataCoords)
    
    if (!dragStarted) {
      // No marker found, create new marker at click location
      this.createMarkerAtPosition(dataCoords)
    }
  }

  /**
   * Handle mouse up events in analysis mode
   * @param {MouseEvent} _event - Mouse event (unused in current implementation)
   * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
   */
  handleMouseUp(_event, dataCoords) {
    // End drag operation through drag handler
    this.dragHandler.endDrag(dataCoords)
  }

  /**
   * Handle mouse leave events in analysis mode
   */
  handleMouseLeave() {
    // Universal cursor clearing is now handled centrally
    // Analysis mode specific cleanup can be added here if needed
  }

  /**
   * Handle context menu (right-click) events in analysis mode
   * @param {MouseEvent} event - Mouse event
   * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
   */
  handleContextMenu(event, dataCoords) {
    event.preventDefault() // Prevent default context menu
    
    // Find marker at right-click position
    const target = this.findMarkerAtPosition(dataCoords)
    if (target) {
      // Delete the marker
      this.removeMarker(target.id)
    }
  }

  // Cursor position updates are now handled universally in main.js
  // No need for mode-specific cursor position management

  /**
   * Create a marker at the specified position
   * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
   */
  createMarkerAtPosition(dataCoords) {
    // Get the current marker color and symbol from global state
    const color = this.instance.state.selectedColor || '#ff6b6b'
    const symbol = this.instance.state.selectedSymbol || 'cross'

    // Create marker object (we only need time/freq for positioning)
    /** @type {AnalysisMarker} */
    const marker = {
      id: `marker-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      color,
      time: dataCoords.time,
      freq: dataCoords.freq,
      symbol,
      // EXPERIMENT (temporary): symbol size is carried per marker, seeded from
      // the toggle's next-feature default, so both sizes can coexist.
      largeSymbols: !!this.instance.state.largeSymbols
    }
    
    // Add marker to state
    this.addMarker(marker)
  }

  /**
   * Whether this mode currently owns any persistent feature.
   *
   * Half of the `PersistentFeatureProvider` capability. Lived on
   * `FeatureRenderer` as `hasAnalysisFeatures()` until spec 167 moved it onto
   * the mode that owns the state it reads.
   * @returns {boolean} True if at least one marker exists
   */
  hasPersistentFeatures() {
    const analysis = this.instance.state.analysis
    return !!(analysis && analysis.markers && analysis.markers.length > 0)
  }

  /**
   * Render persistent features for analysis mode
   */
  renderPersistentFeatures() {
    if (!this.instance.cursorGroup || !this.instance.state.analysis?.markers) {
      return
    }
    
    // Clear existing analysis markers
    const existingMarkers = this.instance.cursorGroup.querySelectorAll('.gram-frame-analysis-marker')
    existingMarkers.forEach(marker => marker.remove())
    
    // Render all markers
    this.instance.state.analysis.markers.forEach(marker => {
      this.renderMarker(marker)
    })
  }

  /**
   * Render a single marker as a crosshair
   * @param {AnalysisMarker} marker - Marker object
   */
  renderMarker(marker) {
    if (!this.instance.cursorGroup) {
      return
    }
    
    // Calculate current position based on time/freq values and current zoom/pan state using utility
    const markerPoint = { freq: marker.freq, time: marker.time }
    const markerSVG = dataToSVG(markerPoint, this.getViewport(), this.instance.spectrogramImage)
    const currentX = markerSVG.x
    const currentY = markerSVG.y
    
    // Create marker group
    const markerGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    markerGroup.setAttribute('class', 'gram-frame-analysis-marker')
    markerGroup.setAttribute('data-marker-id', marker.id)

    // A marker carrying a shaped symbol is drawn as that colour-coded symbol
    // (feature 161, FR-009); a marker with the `cross` (symbol-less) style
    // continues to render as the crosshair.
    const symbolSize = AnalysisMode.MARKER_SYMBOL_SIZE * resolveSymbolScale(marker)
    const symbolMark = createSymbolMark(marker.symbol, currentX, currentY, symbolSize, marker.color)

    if (symbolMark) {
      // Use a marker-specific class so the harmonics renderer's symbol cleanup
      // (which clears `.gram-frame-harmonic-symbol` from the overlay) never
      // removes a marker's symbol. `data-symbol`/fill from createSymbolMark are
      // preserved. (Fixes symbols vanishing when a harmonic set is present.)
      symbolMark.setAttribute('class', 'gram-frame-marker-symbol')
      symbolMark.setAttribute('data-marker-id', marker.id)
      markerGroup.appendChild(symbolMark)
    } else {
      // Crosshair rendering (cross style / default)
      const crosshairSize = 15

      // Horizontal line
      const hLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      hLine.setAttribute('x1', String(currentX - crosshairSize))
      hLine.setAttribute('y1', String(currentY))
      hLine.setAttribute('x2', String(currentX + crosshairSize))
      hLine.setAttribute('y2', String(currentY))
      hLine.setAttribute('stroke', marker.color)
      hLine.setAttribute('stroke-width', '2')
      hLine.setAttribute('stroke-linecap', 'round')

      // Vertical line
      const vLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      vLine.setAttribute('x1', String(currentX))
      vLine.setAttribute('y1', String(currentY - crosshairSize))
      vLine.setAttribute('x2', String(currentX))
      vLine.setAttribute('y2', String(currentY + crosshairSize))
      vLine.setAttribute('stroke', marker.color)
      vLine.setAttribute('stroke-width', '2')
      vLine.setAttribute('stroke-linecap', 'round')

      // Center circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      circle.setAttribute('cx', String(currentX))
      circle.setAttribute('cy', String(currentY))
      circle.setAttribute('r', '3')
      circle.setAttribute('fill', marker.color)
      circle.setAttribute('stroke', '#fff')
      circle.setAttribute('stroke-width', '1')

      markerGroup.appendChild(hLine)
      markerGroup.appendChild(vLine)
      markerGroup.appendChild(circle)
    }

    this.instance.cursorGroup.appendChild(markerGroup)
  }









  /**
   * Create UI elements for analysis mode
   * @param {HTMLElement} markersContainer - Persistent container for markers table
   */
  createUI(markersContainer) {
    // Initialize uiElements
    this.uiElements = {}
    
    // Use the provided persistent markers container (already has label)
    this.uiElements.markersContainer = markersContainer
    
    // Create markers table in the persistent container
    this.createMarkersTable(markersContainer)
    
    // Store references to existing table elements if they exist
    this.uiElements.markersTable = markersContainer.querySelector('.gram-frame-table')
    
    // Store references for central color picker and LEDs (managed by unified layout)
    this.instance.colorPicker = this.instance.colorPicker || null
    this.instance.timeLED = this.instance.timeLED || null
    this.instance.freqLED = this.instance.freqLED || null
  }

  /**
   * Create markers table for displaying active markers
   *
   * The table wrapper sits inside a `gram-frame-table-area` element that claims
   * the column's remaining height; the wrapper fills it absolutely and scrolls,
   * so adding markers never grows the surrounding layout (the header row stays
   * pinned via sticky `th`).
   *
   * @param {HTMLElement} markersContainer - Persistent container for markers (already has label)
   */
  createMarkersTable(markersContainer) {
    // Check if table already exists to prevent duplicates
    if (markersContainer.querySelector('.gram-frame-table')) {
      return
    }

    // The container already has a label, so we just add the table wrapper.
    // Mechanism (scroll wrapper, header, row diffing, click-to-select, delete
    // propagation) comes from the shared component; everything below is what
    // makes this the *markers* table (spec 166, FR-009).
    this.markersTable = createDiffingTable(markersContainer, {
      columns: [
        { label: '', width: '15%', cellClassName: 'gram-frame-marker-color' },
        { label: 'Time (mm:ss)', width: '35%' },
        { label: 'Freq (Hz)', width: '35%' },
        { label: '', width: '15%' }
      ],
      rowAttribute: 'data-marker-id',
      rowKey: (marker) => marker.id,
      cells: (marker) => [
        // Colour/symbol cell — a shaped symbol shows the colour-coded symbol;
        // the cross (symbol-less) style shows a filled colour rectangle (FR-010).
        createColorIndicator(marker.symbol, marker.color, 20),
        formatTime(marker.time),
        marker.freq.toFixed(2),
        createMarkerDeleteButton()
      ],
      deleteSelector: '.gram-frame-marker-delete-btn',
      onSelect: (markerId, _marker, index) => {
        // Toggle selection
        if (this.instance.state.selection.selectedType === 'marker' &&
            this.instance.state.selection.selectedId === markerId) {
          this.instance.clearSelection()
        } else {
          this.instance.setSelection('marker', markerId, index)
        }
      },
      onDelete: (markerId) => this.removeMarker(markerId),
      isSelected: (markerId) => (
        this.instance.state.selection.selectedType === 'marker' &&
        this.instance.state.selection.selectedId === markerId
      )
    })

    // Store all UI elements for proper cleanup
    this.uiElements.markersTable = this.markersTable.element

    // Populate table with existing markers when UI is created
    this.updateMarkersTable()
  }

  /**
   * Re-render this mode's persistent panel from current state.
   *
   * The `PanelOwner` capability. `MainUI` used to reach in by name and call
   * `updateMarkersTable` through an `any` cast; it now asks every mode that
   * owns a panel to refresh it (spec 167, FR-006, AS-4.2).
   */
  refreshPanel() {
    this.updateMarkersTable()
  }

  /**
   * Update markers table with current markers
   */
  updateMarkersTable() {
    if (!this.markersTable) return
    if (!this.instance.state.analysis || !this.instance.state.analysis.markers) return

    this.markersTable.update(this.instance.state.analysis.markers)
  }

  /**
   * Update LED displays for analysis mode
   * @param {CursorPosition} _coords - Current cursor coordinates
   */
  updateLEDs(_coords) {
    // Time and Frequency LEDs are now managed centrally
    // Analysis mode specific LED updates can be added here if needed
  }

  /**
   * Get initial state for analysis mode
   * @returns {AnalysisInitialState} Analysis mode state including markers
   */
  static getInitialState() {
    return {
      analysis: {
        markers: []
      }
    }
  }

  /**
   * Add a new persistent marker
   * @param {AnalysisMarker} marker - Marker object with all properties
   */
  addMarker(marker) {
    if (!this.instance.state.analysis) {
      this.instance.state.analysis = { markers: [] }
    }
    
    this.instance.state.analysis.markers.push(marker)
    markAnnotationsChanged(this.instance)
    
    // Auto-select the newly created marker
    const index = this.instance.state.analysis.markers.length - 1
    this.instance.setSelection('marker', marker.id, index)
    
    // Update markers table
    this.updateMarkersTable()
    
    // Re-render all persistent features to show the new marker
    if (this.instance.featureRenderer) {
      this.instance.featureRenderer.renderAllPersistentFeatures()
    }
    
    // Notify listeners
    dispatch(this.instance, { frame: true })
  }

  /**
   * Remove a marker by ID
   * @param {string} markerId - ID of marker to remove
   */
  removeMarker(markerId) {
    if (!this.instance.state.analysis || !this.instance.state.analysis.markers) return
    
    const index = this.instance.state.analysis.markers.findIndex(m => m.id === markerId)
    if (index !== -1) {
      // Clear selection if removing the selected marker
      if (this.instance.state.selection.selectedType === 'marker' && 
          this.instance.state.selection.selectedId === markerId) {
        this.instance.clearSelection()
      }
      
      this.instance.state.analysis.markers.splice(index, 1)
      markAnnotationsChanged(this.instance)

      // Update markers table
      this.updateMarkersTable()
      
      // Re-render all persistent features to remove the marker
      if (this.instance.featureRenderer) {
        this.instance.featureRenderer.renderAllPersistentFeatures()
      }
      
      // Notify listeners
      dispatch(this.instance, { frame: true })
    }
  }

  /**
   * Find marker at given position (with tolerance)
   * Returns a drag target object compatible with BaseDragHandler
   * @param {DataCoordinates} position - Position to check
   * @returns {DragTarget|null} Drag target if found, null otherwise
   */
  findMarkerAtPosition(position) {
    if (!this.instance.state.analysis || !this.instance.state.analysis.markers) return null
    
    const tolerance = getUniformTolerance(this.getViewport(), this.instance.spectrogramImage)
    
    // Check each marker to see if position hits the crosshair lines
    const marker = this.instance.state.analysis.markers.find(marker => {
      // Check if we're close to the marker center (original behavior)
      if (isWithinToleranceRadius(
        position, 
        { freq: marker.freq, time: marker.time },
        tolerance
      )) {
        return true
      }
      
      // Additionally check if we're on the crosshair lines
      // The crosshair extends 15 pixels in each direction in SVG space
      // We need to convert this to data space for comparison
      
      // Convert marker position to SVG coordinates
      const markerPoint = { freq: marker.freq, time: marker.time }
      const markerSVG = dataToSVG(markerPoint, this.getViewport(), this.instance.spectrogramImage)
      
      // Convert click position to SVG coordinates
      const clickSVG = dataToSVG(position, this.getViewport(), this.instance.spectrogramImage)
      
      const crosshairSize = 15 // pixels in SVG space
      const lineThickness = 3 // effective hit area around the line (half of stroke-width + tolerance)
      
      // Check horizontal line: Y must be close, X must be within crosshair extent
      const onHorizontalLine = 
        Math.abs(clickSVG.y - markerSVG.y) <= lineThickness &&
        Math.abs(clickSVG.x - markerSVG.x) <= crosshairSize
      
      // Check vertical line: X must be close, Y must be within crosshair extent  
      const onVerticalLine = 
        Math.abs(clickSVG.x - markerSVG.x) <= lineThickness &&
        Math.abs(clickSVG.y - markerSVG.y) <= crosshairSize
      
      return onHorizontalLine || onVerticalLine
    })
    
    if (marker) {
      return {
        kind: 'move',
        id: marker.id,
        type: 'marker',
        position: { freq: marker.freq, time: marker.time },
        data: marker
      }
    }
    
    return null
  }

  /**
   * Update mode-specific LED values based on cursor position
   */
  updateModeSpecificLEDs() {
    // Time and frequency LEDs are now managed centrally
    // Analysis mode doesn't have mode-specific LEDs
  }

  /**
   * Clean up analysis mode state
   */
  cleanup() {
  }

  /**
   * Destroy mode-specific UI elements when leaving this mode
   */
  destroyUI() {
    // Central LEDs and color picker are managed by unified layout
    // Markers table and container are persistent and should not be removed
    
    // Don't call super.destroyUI() because it removes persistent elements from DOM
    // Analysis mode elements are all persistent, so no cleanup needed
  }

  /**
   * Reset analysis mode state
   */
  resetState() {
  }
}