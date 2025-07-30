import { BaseMode } from '../BaseMode.js'
import { createLEDDisplay, createColorPicker, createFullFlexLayout, createFlexColumn } from '../../components/UIComponents.js'
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
      <h4>Analysis Mode</h4>
      <p>• Hover to view exact frequency/time values</p>
      <p>• Click to place persistent markers</p>
      <p>• Drag existing markers to reposition them</p>
      <p>• Right-click markers to delete them</p>
    `
  }

  /**
   * Handle mouse move events in analysis mode
   * @param {MouseEvent} event - Mouse event
   * @param {Object} dataCoords - Data coordinates {freq, time}
   */
  handleMouseMove(event, dataCoords) {
    // Update cursor position in existing LED displays
    this.updateCursorPosition(dataCoords)
    
    // Analysis mode specific handling can be added here
  }

  /**
   * Handle mouse down events in analysis mode
   * @param {MouseEvent} event - Mouse event
   * @param {Object} dataCoords - Data coordinates {freq, time}
   */
  handleMouseDown(event, dataCoords) {
    // Only handle left clicks for marker creation
    if (event.button !== 0) {
      return
    }
    
    // Create marker at click location
    this.createMarkerAtPosition(dataCoords)
  }

  /**
   * Handle mouse up events in analysis mode
   * @param {MouseEvent} _event - Mouse event (unused in current implementation)
   * @param {Object} _dataCoords - Data coordinates {freq, time} (unused in current implementation)
   */
  handleMouseUp(_event, _dataCoords) {
    // Analysis mode specific handling
  }

  /**
   * Handle mouse leave events in analysis mode
   */
  handleMouseLeave() {
    // Clear cursor position displays
    this.clearCursorPosition()
  }

  /**
   * Update cursor position in LED displays
   * @param {Object} dataCoords - Data coordinates {freq, time}
   */
  updateCursorPosition(dataCoords) {
    if (this.uiElements.freqLED) {
      const freqValue = this.uiElements.freqLED.querySelector('.gram-frame-led-value')
      if (freqValue) {
        freqValue.textContent = dataCoords.freq.toFixed(1)
      }
    }
    
    if (this.uiElements.timeLED) {
      const timeValue = this.uiElements.timeLED.querySelector('.gram-frame-led-value')
      if (timeValue) {
        timeValue.textContent = formatTime(dataCoords.time)
      }
    }
  }

  /**
   * Clear cursor position displays
   */
  clearCursorPosition() {
    if (this.uiElements.freqLED) {
      const freqValue = this.uiElements.freqLED.querySelector('.gram-frame-led-value')
      if (freqValue) {
        freqValue.textContent = '0.00'
      }
    }
    
    if (this.uiElements.timeLED) {
      const timeValue = this.uiElements.timeLED.querySelector('.gram-frame-led-value')
      if (timeValue) {
        timeValue.textContent = formatTime(0)
      }
    }
  }

  /**
   * Create a marker at the specified position
   * @param {Object} dataCoords - Data coordinates {freq, time}
   */
  createMarkerAtPosition(dataCoords) {
    // Get the current marker color from the color picker
    const color = this.state.harmonics?.selectedColor || '#ff6b6b'
    
    // Create marker object (we only need time/freq for positioning)
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
   * @param {HTMLElement} readoutPanel - Container for UI elements
   */
  createUI(readoutPanel) {
    // Initialize uiElements
    this.uiElements = {}
    
    // Create horizontal layout container
    const layoutContainer = createFullFlexLayout('gram-frame-analysis-layout', '12px')
    
    // Create left column for controls
    const leftColumn = createFlexColumn('gram-frame-analysis-controls', '8px')
    leftColumn.style.minWidth = '160px'
    leftColumn.style.flexShrink = '0'
    
    // Create horizontal container for LEDs
    const ledsContainer = createFullFlexLayout('gram-frame-analysis-leds', '6px')
    
    // Create Time LED display
    this.uiElements.timeLED = createLEDDisplay('Time (mm:ss)', formatTime(0))
    this.uiElements.timeLED.style.flex = '1'
    this.uiElements.timeLED.style.minWidth = '0'
    ledsContainer.appendChild(this.uiElements.timeLED)
    
    // Create Frequency LED display
    this.uiElements.freqLED = createLEDDisplay('Frequency (Hz)', '0.00')
    this.uiElements.freqLED.style.flex = '1'
    this.uiElements.freqLED.style.minWidth = '0'
    ledsContainer.appendChild(this.uiElements.freqLED)
    
    leftColumn.appendChild(ledsContainer)
    
    // Create color picker for marker colors
    this.uiElements.colorPicker = createColorPicker(this.state)
    this.uiElements.colorPicker.querySelector('.gram-frame-color-picker-label').textContent = 'Marker Color'
    leftColumn.appendChild(this.uiElements.colorPicker)
    
    // Create right column for markers table
    const rightColumn = createFlexColumn('gram-frame-analysis-markers')
    rightColumn.style.flex = '1'
    rightColumn.style.minHeight = '0' // Allow flex shrinking
    
    // Create markers table in right column
    this.createMarkersTable(rightColumn)
    
    // Assemble layout
    layoutContainer.appendChild(leftColumn)
    layoutContainer.appendChild(rightColumn)
    readoutPanel.appendChild(layoutContainer)
    
    // Store layout containers for cleanup
    this.uiElements.layoutContainer = layoutContainer
    this.uiElements.leftColumn = leftColumn
    this.uiElements.rightColumn = rightColumn
    this.uiElements.ledsContainer = ledsContainer
    
    // Store references on instance for compatibility
    this.instance.timeLED = this.uiElements.timeLED
    this.instance.freqLED = this.uiElements.freqLED
    this.instance.colorPicker = this.uiElements.colorPicker
  }

  /**
   * Create markers table for displaying active markers
   * @param {HTMLElement} rightColumn - Container for UI elements
   */
  createMarkersTable(rightColumn) {
    const tableContainer = document.createElement('div')
    tableContainer.className = 'gram-frame-markers-container'
    tableContainer.style.flex = '1'
    tableContainer.style.display = 'flex'
    tableContainer.style.flexDirection = 'column'
    tableContainer.style.minHeight = '0'
    
    const tableLabel = document.createElement('h4')
    tableLabel.textContent = 'Active Markers'
    tableLabel.className = 'gram-frame-markers-label'
    tableLabel.style.margin = '0 0 8px 0'
    tableLabel.style.flexShrink = '0'
    tableContainer.appendChild(tableLabel)
    
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
    deleteHeader.style.width = '20%'
    headerRow.appendChild(deleteHeader)
    
    thead.appendChild(headerRow)
    table.appendChild(thead)
    
    // Create table body
    const tbody = document.createElement('tbody')
    table.appendChild(tbody)
    
    tableWrapper.appendChild(table)
    tableContainer.appendChild(tableWrapper)
    rightColumn.appendChild(tableContainer)
    
    // Store all UI elements for proper cleanup
    this.uiElements.markersContainer = tableContainer
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
    // Analysis mode shows Time and Frequency LEDs (created in createUI)
    this.updateModeSpecificLEDs()
  }

  /**
   * Get initial state for analysis mode
   * @returns {Object} Analysis mode state including markers and harmonics for color picker
   */
  static getInitialState() {
    return {
      analysis: {
        markers: []
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
      this.state.analysis = { markers: [] }
    }
    
    this.state.analysis.markers.push(marker)
    
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
    
    // Clear existing rows
    this.uiElements.markersTableBody.innerHTML = ''
    
    if (!this.state.analysis || !this.state.analysis.markers) return
    
    // Add rows for each marker
    this.state.analysis.markers.forEach((marker) => {
      const row = document.createElement('tr')
      
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
  }

  /**
   * Update mode-specific LED values based on cursor position
   */
  updateModeSpecificLEDs() {
    if (!this.state.cursorPosition) {
      // Show default values when no cursor position
      if (this.uiElements.freqLED) {
        this.uiElements.freqLED.querySelector('.gram-frame-led-value').textContent = '0.00'
      }
      if (this.uiElements.timeLED) {
        this.uiElements.timeLED.querySelector('.gram-frame-led-value').textContent = formatTime(0)
      }
      return
    }

    // Update frequency LED
    if (this.uiElements.freqLED) {
      const freqValue = this.state.cursorPosition.freq.toFixed(1)
      this.uiElements.freqLED.querySelector('.gram-frame-led-value').textContent = freqValue
    }

    // Update time LED
    if (this.uiElements.timeLED) {
      const timeValue = formatTime(this.state.cursorPosition.time)
      this.uiElements.timeLED.querySelector('.gram-frame-led-value').textContent = timeValue
    }
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
    // Remove instance references
    if (this.instance.timeLED === this.uiElements.timeLED) {
      this.instance.timeLED = null
    }
    if (this.instance.freqLED === this.uiElements.freqLED) {
      this.instance.freqLED = null
    }
    if (this.instance.colorPicker === this.uiElements.colorPicker) {
      this.instance.colorPicker = null
    }
    
    // Call parent destroy to remove all UI elements
    super.destroyUI()
  }

  /**
   * Reset analysis mode state
   */
  resetState() {
  }
}