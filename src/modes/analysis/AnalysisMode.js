import { BaseMode } from '../BaseMode.js'
import { notifyStateListeners } from '../../core/state.js'
import { formatTime } from '../../utils/timeFormatter.js'
import { calculateZoomAwarePosition } from '../../utils/coordinateTransformations.js'
import { BaseDragHandler } from '../shared/BaseDragHandler.js'
import { getUniformTolerance, isWithinToleranceRadius } from '../../utils/tolerance.js'

/**
 * Analysis mode implementation
 * Provides crosshair rendering, basic time/frequency display, and persistent markers
 */
export class AnalysisMode extends BaseMode {
  /**
   * Initialize AnalysisMode with drag handler
   * @param {Object} instance - GramFrame instance
   * @param {Object} state - State object
   */
  constructor(instance, state) {
    super(instance, state)
    
    // Initialize drag handler with analysis-specific callbacks
    this.dragHandler = new BaseDragHandler(instance, {
      findTargetAt: (position) => this.findMarkerAtPosition(position),
      onDragStart: (target, position) => this.onMarkerDragStart(target, position),
      onDragUpdate: (target, currentPos, startPos) => this.onMarkerDragUpdate(target, currentPos, startPos),
      onDragEnd: (target, position) => this.onMarkerDragEnd(target, position),
      updateCursor: (style) => this.updateCursorStyle(style)
    })
  }

  /**
   * Start dragging a marker
   * @param {Object} target - Drag target with id and type
   * @param {DataCoordinates} position - Start position
   */
  onMarkerDragStart(target, position) {
    // Store drag state in analysis state
    this.state.analysis.isDragging = true
    this.state.analysis.draggedMarkerId = target.id
    this.state.analysis.dragStartPosition = { ...position }
    
    // Auto-select the marker being dragged
    const marker = this.state.analysis.markers.find(m => m.id === target.id)
    if (marker) {
      const index = this.state.analysis.markers.findIndex(m => m.id === target.id)
      this.instance.setSelection('marker', target.id, index)
    }
  }

  /**
   * Update marker position during drag
   * @param {Object} target - Drag target with id and type
   * @param {DataCoordinates} currentPos - Current position
   * @param {DataCoordinates} _startPos - Start position (unused)
   */
  onMarkerDragUpdate(target, currentPos, _startPos) {
    const marker = this.state.analysis.markers.find(m => m.id === target.id)
    if (marker) {
      // Update marker position
      marker.freq = currentPos.freq
      marker.time = currentPos.time
      
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
      notifyStateListeners(this.state, this.instance.stateListeners)
    }
  }

  /**
   * End dragging a marker
   * @param {Object} _target - Drag target with id and type (unused)
   * @param {DataCoordinates} _position - End position (unused)
   */
  onMarkerDragEnd(_target, _position) {
    // Clear analysis drag state
    this.state.analysis.isDragging = false
    this.state.analysis.draggedMarkerId = null
    this.state.analysis.dragStartPosition = null
  }

  /**
   * Update cursor style for drag operations
   * @param {string} style - Cursor style ('crosshair', 'grab', 'grabbing')
   */
  updateCursorStyle(style) {
    if (this.instance.spectrogramImage) {
      this.instance.spectrogramImage.style.cursor = style
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
   * Helper to prepare viewport object for coordinate transformations
   * @returns {Object} Viewport object with margins, imageDetails, config, zoom
   */
  getViewport() {
    return {
      margins: this.instance.state.axes.margins,
      imageDetails: this.instance.state.imageDetails,
      config: this.instance.state.config,
      zoom: this.instance.state.zoom
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
    // Get the current marker color from global state
    const color = this.state.selectedColor || '#ff6b6b'
    
    // Create marker object (we only need time/freq for positioning)
    /** @type {AnalysisMarker} */
    const marker = {
      id: `marker-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      color,
      time: dataCoords.time,
      freq: dataCoords.freq
    }
    
    // Add marker to state
    this.addMarker(marker)
  }

  /**
   * Render persistent features for analysis mode
   */
  renderPersistentFeatures() {
    if (!this.instance.cursorGroup || !this.state.analysis?.markers) {
      return
    }
    
    // Clear existing analysis markers
    const existingMarkers = this.instance.cursorGroup.querySelectorAll('.gram-frame-analysis-marker')
    existingMarkers.forEach(marker => marker.remove())
    
    // Render all markers
    this.state.analysis.markers.forEach(marker => {
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
    const markerSVG = calculateZoomAwarePosition(markerPoint, this.getViewport(), this.instance.spectrogramImage)
    const currentX = markerSVG.x
    const currentY = markerSVG.y
    
    // Create marker group
    const markerGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    markerGroup.setAttribute('class', 'gram-frame-analysis-marker')
    markerGroup.setAttribute('data-marker-id', marker.id)
    
    // Create crosshair lines
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
    this.uiElements.markersTableBody = markersContainer.querySelector('.gram-frame-table tbody')
    
    // Store references for central color picker and LEDs (managed by unified layout)
    this.instance.colorPicker = this.instance.colorPicker || null
    this.instance.timeLED = this.instance.timeLED || null
    this.instance.freqLED = this.instance.freqLED || null
  }

  /**
   * Create markers table for displaying active markers
   * @param {HTMLElement} markersContainer - Persistent container for markers (already has label)
   */
  createMarkersTable(markersContainer) {
    // Check if table already exists to prevent duplicates
    if (markersContainer.querySelector('.gram-frame-table')) {
      return
    }
    
    // The container already has a label, so we just add the table wrapper
    
    const tableWrapper = document.createElement('div')
    tableWrapper.className = 'gram-frame-table-container'
    
    const table = document.createElement('table')
    table.className = 'gram-frame-table'
    
    // Create table header
    const thead = document.createElement('thead')
    const headerRow = document.createElement('tr')
    
    const colorHeader = document.createElement('th')
    colorHeader.textContent = ''
    colorHeader.style.width = '15%'
    headerRow.appendChild(colorHeader)
    
    const timeHeader = document.createElement('th')
    timeHeader.textContent = 'Time (mm:ss)'
    timeHeader.style.width = '35%'
    headerRow.appendChild(timeHeader)
    
    const freqHeader = document.createElement('th')
    freqHeader.textContent = 'Freq (Hz)'
    freqHeader.style.width = '35%'
    headerRow.appendChild(freqHeader)
    
    const deleteHeader = document.createElement('th')
    deleteHeader.textContent = ''
    deleteHeader.style.width = '15%'
    headerRow.appendChild(deleteHeader)
    
    thead.appendChild(headerRow)
    table.appendChild(thead)
    
    // Create table body
    const tbody = document.createElement('tbody')
    table.appendChild(tbody)
    
    tableWrapper.appendChild(table)
    markersContainer.appendChild(tableWrapper)
    
    // Store all UI elements for proper cleanup
    this.uiElements.markersTable = table
    this.uiElements.markersTableBody = tbody
    
    // Populate table with existing markers when UI is created
    this.updateMarkersTable()
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
        markers: [],
        // Note: isDragging, draggedMarkerId, dragStartPosition are now managed by BaseDragHandler
        // but kept here for backward compatibility with existing code
        isDragging: false,
        draggedMarkerId: null,
        dragStartPosition: null
      }
    }
  }

  /**
   * Add a new persistent marker
   * @param {AnalysisMarker} marker - Marker object with all properties
   */
  addMarker(marker) {
    if (!this.state.analysis) {
      this.state.analysis = { 
        markers: [],
        isDragging: false,
        draggedMarkerId: null,
        dragStartPosition: null
      }
    }
    
    this.state.analysis.markers.push(marker)
    
    // Auto-select the newly created marker
    const index = this.state.analysis.markers.length - 1
    this.instance.setSelection('marker', marker.id, index)
    
    // Update markers table
    this.updateMarkersTable()
    
    // Re-render all persistent features to show the new marker
    if (this.instance.featureRenderer) {
      this.instance.featureRenderer.renderAllPersistentFeatures()
    }
    
    // Notify listeners
    notifyStateListeners(this.state, this.instance.stateListeners)
  }

  /**
   * Remove a marker by ID
   * @param {string} markerId - ID of marker to remove
   */
  removeMarker(markerId) {
    if (!this.state.analysis || !this.state.analysis.markers) return
    
    const index = this.state.analysis.markers.findIndex(m => m.id === markerId)
    if (index !== -1) {
      // Clear selection if removing the selected marker
      if (this.state.selection.selectedType === 'marker' && 
          this.state.selection.selectedId === markerId) {
        this.instance.clearSelection()
      }
      
      this.state.analysis.markers.splice(index, 1)
      
      // Update markers table
      this.updateMarkersTable()
      
      // Re-render all persistent features to remove the marker
      if (this.instance.featureRenderer) {
        this.instance.featureRenderer.renderAllPersistentFeatures()
      }
      
      // Notify listeners
      notifyStateListeners(this.state, this.instance.stateListeners)
    }
  }

  /**
   * Find marker at given position (with tolerance)
   * Returns a drag target object compatible with BaseDragHandler
   * @param {DataCoordinates} position - Position to check
   * @returns {Object|null} Drag target if found, null otherwise
   */
  findMarkerAtPosition(position) {
    if (!this.state.analysis || !this.state.analysis.markers) return null
    
    const tolerance = getUniformTolerance(this.getViewport(), this.instance.spectrogramImage)
    
    const marker = this.state.analysis.markers.find(marker => 
      isWithinToleranceRadius(
        position, 
        { freq: marker.freq, time: marker.time },
        tolerance
      )
    )
    
    if (marker) {
      return {
        id: marker.id,
        type: 'marker',
        position: { freq: marker.freq, time: marker.time },
        data: marker
      }
    }
    
    return null
  }

  /**
   * Update markers table with current markers
   */
  updateMarkersTable() {
    if (!this.uiElements.markersTableBody) return
    
    if (!this.state.analysis || !this.state.analysis.markers) return
    
    const existingRows = this.uiElements.markersTableBody.querySelectorAll('tr')
    const markers = this.state.analysis.markers
    
    // Update existing rows or create new ones
    markers.forEach((marker, index) => {
      let row = existingRows[index]
      
      if (row && row.getAttribute('data-marker-id') === marker.id) {
        // Update existing row - only update the cells that change
        this.updateMarkerRow(row, marker)
      } else {
        // Need to rebuild from this point (marker added/removed/reordered)
        this.rebuildMarkersTableFrom(index)
        return
      }
    })
    
    // Remove extra rows if markers were deleted
    for (let i = markers.length; i < existingRows.length; i++) {
      existingRows[i].remove()
    }
  }
  
  /**
   * Update only the changing cells in an existing marker row
   * @param {HTMLTableRowElement} row - The table row to update
   * @param {AnalysisMarker} marker - The marker data
   */
  updateMarkerRow(row, marker) {
    // Update time cell (second cell)
    const timeCell = row.cells[1]
    if (timeCell) {
      const newTime = formatTime(marker.time)
      if (timeCell.textContent !== newTime) {
        timeCell.textContent = newTime
      }
    }
    
    // Update frequency cell (third cell)
    const freqCell = row.cells[2]
    if (freqCell) {
      const newFreq = marker.freq.toFixed(2)
      if (freqCell.textContent !== newFreq) {
        freqCell.textContent = newFreq
      }
    }
  }
  
  /**
   * Rebuild the markers table from a specific index
   * @param {number} startIndex - Index to start rebuilding from
   */
  rebuildMarkersTableFrom(startIndex) {
    if (!this.uiElements.markersTableBody) return
    
    const markers = this.state.analysis.markers
    const existingRows = this.uiElements.markersTableBody.querySelectorAll('tr')
    
    // Remove rows from startIndex onward
    for (let i = startIndex; i < existingRows.length; i++) {
      existingRows[i].remove()
    }
    
    // Add new rows from startIndex
    for (let index = startIndex; index < markers.length; index++) {
      const marker = markers[index]
      const row = document.createElement('tr')
      row.setAttribute('data-marker-id', marker.id)
      
      // Add click handler for selection
      row.addEventListener('click', (event) => {
        // Don't trigger selection if clicking delete button
        if (event.target && /** @type {Element} */ (event.target).closest('.gram-frame-marker-delete-btn')) {
          return
        }
        
        // Toggle selection
        if (this.state.selection.selectedType === 'marker' && 
            this.state.selection.selectedId === marker.id) {
          this.instance.clearSelection()
        } else {
          this.instance.setSelection('marker', marker.id, index)
        }
      })
      
      // Color swatch cell
      const colorCell = document.createElement('td')
      const colorSwatch = document.createElement('div')
      colorSwatch.className = 'gram-frame-color-swatch'
      colorSwatch.style.backgroundColor = marker.color
      colorSwatch.style.width = '20px'
      colorSwatch.style.height = '20px'
      colorSwatch.style.borderRadius = '3px'
      colorSwatch.style.border = '1px solid #ccc'
      colorCell.appendChild(colorSwatch)
      row.appendChild(colorCell)
      
      // Time cell
      const timeCell = document.createElement('td')
      timeCell.textContent = formatTime(marker.time)
      row.appendChild(timeCell)
      
      // Frequency cell
      const freqCell = document.createElement('td')
      freqCell.textContent = marker.freq.toFixed(2)
      row.appendChild(freqCell)
      
      // Delete button cell
      const deleteCell = document.createElement('td')
      const deleteButton = document.createElement('button')
      deleteButton.textContent = '×'
      deleteButton.className = 'gram-frame-marker-delete-btn'
      deleteButton.style.background = 'none'
      deleteButton.style.border = 'none'
      deleteButton.style.color = '#ff4444'
      deleteButton.style.cursor = 'pointer'
      deleteButton.style.fontSize = '16px'
      deleteButton.style.fontWeight = 'bold'
      // Capture the marker ID in a closure to avoid scope issues
      const markerId = marker.id
      deleteButton.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        this.removeMarker(markerId)
      })
      deleteCell.appendChild(deleteButton)
      row.appendChild(deleteCell)
      
      this.uiElements.markersTableBody.appendChild(row)
    }
    
    // Restore selection highlighting if needed
    this.instance.updateSelectionVisuals()
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