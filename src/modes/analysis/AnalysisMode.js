import { BaseMode } from '../BaseMode.js'
import { notifyStateListeners } from '../../core/state.js'
import { formatTime } from '../../utils/timeFormatter.js'

/**
 * Analysis mode implementation
 * Provides crosshair rendering, basic time/frequency display, and persistent markers
 */
export class AnalysisMode extends BaseMode {
  /**
   * Get guidance text for analysis mode
   * @returns {string} HTML content for the guidance panel
   */
  getGuidanceText() {
    return `
      <h4>Cross Cursor Mode</h4>
      <p>• Hover to view exact frequency/time values</p>
      <p>• Click to place persistent markers</p>
      <p>• Drag existing markers to reposition them</p>
      <p>• Right-click markers to delete them</p>
    `
  }

  /**
   * Handle mouse move events in analysis mode
   * @param {MouseEvent} _event - Mouse event (unused in current implementation)
   * @param {Object} dataCoords - Data coordinates {freq, time}
   */
  handleMouseMove(_event, dataCoords) {
    // Handle marker dragging
    if (this.state.analysis.isDragging && this.state.analysis.draggedMarkerId) {
      const marker = this.state.analysis.markers.find(m => m.id === this.state.analysis.draggedMarkerId)
      if (marker) {
        // Update marker position
        marker.freq = dataCoords.freq
        marker.time = dataCoords.time
        
        // Re-render persistent features and update table
        if (this.instance.featureRenderer) {
          this.instance.featureRenderer.renderAllPersistentFeatures()
        }
        this.updateMarkersTable()
        
        // Notify listeners
        notifyStateListeners(this.state, this.instance.stateListeners)
      }
    }
    
    // Universal cursor readouts are now handled centrally in main.js
    // Analysis mode specific handling can be added here if needed
  }

  /**
   * Handle mouse down events in analysis mode
   * @param {MouseEvent} event - Mouse event
   * @param {Object} dataCoords - Data coordinates {freq, time}
   */
  handleMouseDown(event, dataCoords) {
    // Only handle left clicks
    if (event.button !== 0) {
      return
    }
    
    // Check if clicking on an existing marker for dragging
    const existingMarker = this.findMarkerAtPosition(dataCoords)
    
    if (existingMarker) {
      // Start dragging existing marker
      this.state.analysis.isDragging = true
      this.state.analysis.draggedMarkerId = existingMarker.id
      this.state.analysis.dragStartPosition = { ...dataCoords }
      
      // Auto-select the marker being dragged
      const index = this.state.analysis.markers.findIndex(m => m.id === existingMarker.id)
      this.instance.setSelection('marker', existingMarker.id, index)
    } else {
      // Create marker at click location
      this.createMarkerAtPosition(dataCoords)
    }
  }

  /**
   * Handle mouse up events in analysis mode
   * @param {MouseEvent} _event - Mouse event (unused in current implementation)
   * @param {DataCoordinates} _dataCoords - Data coordinates {freq, time} (unused in current implementation)
   */
  handleMouseUp(_event, _dataCoords) {
    // End marker dragging
    if (this.state.analysis.isDragging) {
      this.state.analysis.isDragging = false
      this.state.analysis.draggedMarkerId = null
      this.state.analysis.dragStartPosition = null
    }
  }

  /**
   * Handle mouse leave events in analysis mode
   */
  handleMouseLeave() {
    // Universal cursor clearing is now handled centrally
    // Analysis mode specific cleanup can be added here if needed
  }

  // Cursor position updates are now handled universally in main.js
  // No need for mode-specific cursor position management

  /**
   * Create a marker at the specified position
   * @param {Object} dataCoords - Data coordinates {freq, time}
   */
  createMarkerAtPosition(dataCoords) {
    // Get the current marker color from the central color picker
    const color = this.state.harmonics?.selectedColor || '#ff6b6b'
    
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
   * @param {Object} marker - Marker object
   */
  renderMarker(marker) {
    if (!this.instance.cursorGroup) {
      return
    }
    
    // Calculate current position based on time/freq values and current zoom/pan state
    const { naturalWidth, naturalHeight } = this.state.imageDetails
    const margins = this.state.axes.margins
    const zoomLevel = this.state.zoom.level
    
    // Convert time/freq to normalized coordinates (0-1)
    const { timeMin, timeMax, freqMin, freqMax } = this.state.config
    const normalizedX = (marker.freq - freqMin) / (freqMax - freqMin)
    const normalizedY = 1.0 - (marker.time - timeMin) / (timeMax - timeMin) // Invert Y for SVG coordinates
    
    let currentX, currentY
    
    if (zoomLevel === 1.0) {
      // No zoom - use base image position
      currentX = margins.left + normalizedX * naturalWidth
      currentY = margins.top + normalizedY * naturalHeight
    } else {
      // Zoomed - calculate position based on current image transform
      if (this.instance.spectrogramImage) {
        const imageLeft = parseFloat(this.instance.spectrogramImage.getAttribute('x') || String(margins.left))
        const imageTop = parseFloat(this.instance.spectrogramImage.getAttribute('y') || String(margins.top))
        const imageWidth = parseFloat(this.instance.spectrogramImage.getAttribute('width') || String(naturalWidth))
        const imageHeight = parseFloat(this.instance.spectrogramImage.getAttribute('height') || String(naturalHeight))
        
        currentX = imageLeft + normalizedX * imageWidth
        currentY = imageTop + normalizedY * imageHeight
      } else {
        currentX = margins.left + normalizedX * naturalWidth
        currentY = margins.top + normalizedY * naturalHeight
      }
    }
    
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
    this.uiElements.markersTable = markersContainer.querySelector('.gram-frame-markers-table')
    this.uiElements.markersTableBody = markersContainer.querySelector('.gram-frame-markers-table tbody')
    
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
    if (markersContainer.querySelector('.gram-frame-markers-table')) {
      return
    }
    
    // The container already has a label, so we just add the table wrapper
    
    const tableWrapper = document.createElement('div')
    tableWrapper.style.flex = '1'
    tableWrapper.style.overflow = 'auto'
    tableWrapper.style.minHeight = '0'
    
    const table = document.createElement('table')
    table.className = 'gram-frame-markers-table'
    table.style.height = '100%'
    
    // Create table header
    const thead = document.createElement('thead')
    const headerRow = document.createElement('tr')
    
    const colorHeader = document.createElement('th')
    colorHeader.textContent = 'Color'
    colorHeader.style.width = '20%'
    headerRow.appendChild(colorHeader)
    
    const timeHeader = document.createElement('th')
    timeHeader.textContent = 'Time (mm:ss)'
    timeHeader.style.width = '30%'
    headerRow.appendChild(timeHeader)
    
    const freqHeader = document.createElement('th')
    freqHeader.textContent = 'Freq (Hz)'
    freqHeader.style.width = '30%'
    headerRow.appendChild(freqHeader)
    
    const deleteHeader = document.createElement('th')
    deleteHeader.textContent = 'Del'
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
   * @param {Object} _coords - Current cursor coordinates
   */
  updateLEDs(_coords) {
    // Time and Frequency LEDs are now managed centrally
    // Analysis mode specific LED updates can be added here if needed
  }

  /**
   * Get initial state for analysis mode
   * @returns {Object} Analysis mode state including markers and harmonics for color picker
   */
  static getInitialState() {
    return {
      analysis: {
        markers: [],
        isDragging: false,
        draggedMarkerId: null,
        dragStartPosition: null
      },
      harmonics: {
        selectedColor: '#ff6b6b' // Default color for markers
      }
    }
  }

  /**
   * Add a new persistent marker
   * @param {Object} marker - Marker object with all properties
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
   * @param {Object} position - Position to check
   * @returns {Object|null} Marker if found, null otherwise
   */
  findMarkerAtPosition(position) {
    if (!this.state.analysis || !this.state.analysis.markers) return null
    
    const tolerance = {
      time: (this.state.config.timeMax - this.state.config.timeMin) * 0.02, // 2% of time range
      freq: (this.state.config.freqMax - this.state.config.freqMin) * 0.02  // 2% of freq range
    }
    
    return this.state.analysis.markers.find(marker => 
      Math.abs(marker.time - position.time) < tolerance.time &&
      Math.abs(marker.freq - position.freq) < tolerance.freq
    )
  }

  /**
   * Update markers table with current markers
   */
  updateMarkersTable() {
    if (!this.uiElements.markersTableBody) return
    
    // Store current selection to restore after table update
    const currentSelection = this.state.selection
    
    // Clear existing rows
    this.uiElements.markersTableBody.innerHTML = ''
    
    if (!this.state.analysis || !this.state.analysis.markers) return
    
    // Add rows for each marker
    this.state.analysis.markers.forEach((marker, index) => {
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
      freqCell.textContent = marker.freq.toFixed(1)
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
    })
    
    // Restore selection highlighting after table update
    if (currentSelection.selectedType === 'marker' && currentSelection.selectedId) {
      this.instance.updateSelectionVisuals()
    }
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