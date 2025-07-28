import { BaseMode } from '../BaseMode.js'
import { createSVGLine, createSVGCircle } from '../../utils/svg.js'
import { createLEDDisplay, createColorPicker, createFullFlexLayout, createFlexColumn } from '../../components/UIComponents.js'
import { notifyStateListeners } from '../../core/state.js'
import { updateCursorIndicators } from '../../rendering/cursors.js'
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
   * Handle mouse click events - create persistent markers
   * @param {MouseEvent} _event - The mouse click event
   * @param {Object} _coords - Coordinate information
   */
  handleClick(_event, _coords) {
    if (!this.state.cursorPosition) return
    
    // Only add marker if we're not dragging
    if (!this.state.dragState.isDragging) {
      // Left-click: add new marker
      this.addMarker(this.state.cursorPosition)
    }
  }

  /**
   * Handle mouse down events for marker dragging
   * @param {MouseEvent} _event - The mouse down event
   * @param {Object} _coords - Coordinate information
   */
  handleMouseDown(_event, _coords) {
    if (!this.state.cursorPosition) return
    
    // Check if we're clicking on an existing marker
    const existingMarker = this.findMarkerAtPosition(this.state.cursorPosition)
    
    if (existingMarker) {
      // Start dragging existing marker
      this.state.dragState.isDragging = true
      this.state.dragState.dragStartPosition = { ...this.state.cursorPosition }
      this.state.dragState.draggedMarkerId = existingMarker.id
      this.state.dragState.originalMarkerPosition = {
        time: existingMarker.time,
        freq: existingMarker.freq,
        imageX: existingMarker.imageX,
        imageY: existingMarker.imageY
      }
    }
  }

  /**
   * Handle mouse move events during dragging
   * @param {MouseEvent} _event - The mouse move event
   * @param {Object} _coords - Coordinate information
   */
  handleMouseMove(_event, _coords) {
    if (!this.state.cursorPosition) return
    
    // Update cursor style when hovering over markers
    const hoveredMarker = this.findMarkerAtPosition(this.state.cursorPosition)
    if (hoveredMarker && !this.state.dragState.isDragging) {
      this.instance.svg.style.cursor = 'grab'
    } else if (!this.state.dragState.isDragging) {
      this.instance.svg.style.cursor = 'crosshair'
    }
    
    // Handle marker dragging
    if (this.state.dragState.isDragging && this.state.dragState.draggedMarkerId) {
      this.handleMarkerDrag()
    }
  }

  /**
   * Handle mouse up events - end dragging
   * @param {MouseEvent} _event - The mouse up event
   * @param {Object} _coords - Coordinate information
   */
  handleMouseUp(_event, _coords) {
    if (this.state.dragState.isDragging) {
      // Clear drag state
      this.state.dragState.isDragging = false
      this.state.dragState.dragStartPosition = null
      this.state.dragState.draggedMarkerId = null
      this.state.dragState.originalMarkerPosition = null
      
      // Reset cursor
      this.instance.svg.style.cursor = 'crosshair'
      
      // Update markers table
      this.updateMarkersTable()
      
      // Trigger visual re-render
      updateCursorIndicators(this.instance)
      
      // Notify listeners of state change
      notifyStateListeners(this.state, this.instance.stateListeners)
    }
  }

  /**
   * Handle context menu (right-click) events
   * @param {MouseEvent} event - The context menu event
   * @param {Object} _coords - Coordinate information
   */
  handleContextMenu(event, _coords) {
    if (!this.state.cursorPosition) return
    
    // Find marker at cursor position (within tolerance)
    const markerToDelete = this.findMarkerAtPosition(this.state.cursorPosition)
    if (markerToDelete) {
      this.removeMarker(markerToDelete.id)
      event.preventDefault() // Prevent context menu
    }
  }


  /**
   * Handle marker dragging - update marker position based on cursor movement
   */
  handleMarkerDrag() {
    if (!this.state.cursorPosition || !this.state.dragState.draggedMarkerId) return
    
    // Find the marker being dragged
    const marker = this.state.analysis.markers.find(m => m.id === this.state.dragState.draggedMarkerId)
    if (!marker) return
    
    // Update marker position to current cursor position
    marker.time = this.state.cursorPosition.time
    marker.freq = this.state.cursorPosition.freq
    marker.imageX = this.state.cursorPosition.imageX
    marker.imageY = this.state.cursorPosition.imageY
    
    // Update visual representation immediately
    updateCursorIndicators(this.instance)
    
    // Update the SVG cursor during drag
    this.instance.svg.style.cursor = 'grabbing'
  }

  /**
   * Render analysis mode cursor indicators and persistent markers
   * @param {SVGElement} _svg - The SVG container element
   */
  render(_svg) {
    // Clear existing cursor indicators first
    this.instance.cursorGroup.innerHTML = ''
    
    // Render temporary cursor crosshair if cursor position is available
    // Don't render crosshairs while dragging markers
    if (this.state.cursorPosition && !this.state.dragState.isDragging) {
      this.renderCursor()
    }
    
    // Cross-mode persistent features are now handled by FeatureRenderer
    // Only render our own markers here
    this.renderMarkers()
  }

  /**
   * Render only analysis mode's own persistent features
   * Used by FeatureRenderer for centralized cross-mode rendering
   * @param {SVGElement} _cursorGroup - The cursor group element (not used, we use this.instance.cursorGroup)
   */
  renderOwnFeatures(_cursorGroup) {
    // Only render analysis markers
    this.renderMarkers()
  }

  /**
   * Render analysis mode's own cursor indicators (temporary/hover state)
   * Used by FeatureRenderer for current mode cursor rendering
   */
  renderOwnCursor() {
    if (this.state.cursorPosition) {
      this.renderCursor()
    }
  }

  /**
   * Render temporary cursor crosshair
   */
  renderCursor() {
    const margins = this.state.axes.margins
    const { naturalWidth, naturalHeight } = this.state.imageDetails
    
    // Calculate cursor position in SVG coordinates (accounting for margins)
    const cursorSVGX = margins.left + this.state.cursorPosition.imageX
    const cursorSVGY = margins.top + this.state.cursorPosition.imageY
    
    // Create vertical crosshair lines (time indicator) - shadow first, then main line
    const verticalShadow = createSVGLine(
      cursorSVGX,
      margins.top,
      cursorSVGX,
      margins.top + naturalHeight,
      'gram-frame-cursor-shadow'
    )
    this.instance.cursorGroup.appendChild(verticalShadow)
    
    const verticalLine = createSVGLine(
      cursorSVGX,
      margins.top,
      cursorSVGX,
      margins.top + naturalHeight,
      'gram-frame-cursor-vertical'
    )
    this.instance.cursorGroup.appendChild(verticalLine)
    
    // Create horizontal crosshair lines (frequency indicator) - shadow first, then main line
    const horizontalShadow = createSVGLine(
      margins.left,
      cursorSVGY,
      margins.left + naturalWidth,
      cursorSVGY,
      'gram-frame-cursor-shadow'
    )
    this.instance.cursorGroup.appendChild(horizontalShadow)
    
    const horizontalLine = createSVGLine(
      margins.left,
      cursorSVGY,
      margins.left + naturalWidth,
      cursorSVGY,
      'gram-frame-cursor-horizontal'
    )
    this.instance.cursorGroup.appendChild(horizontalLine)
    
    // Create center point indicator
    const centerPoint = createSVGCircle(cursorSVGX, cursorSVGY, 3, 'gram-frame-cursor-point')
    this.instance.cursorGroup.appendChild(centerPoint)
  }

  /**
   * Render all persistent markers
   */
  renderMarkers() {
    if (!this.state.analysis || !this.state.analysis.markers) return
    
    const margins = this.state.axes.margins
    
    this.state.analysis.markers.forEach(marker => {
      this.renderMarker(marker, margins)
    })
  }

  /**
   * Render a single persistent marker
   * @param {{id: string, color: string, time: number, freq: number, imageX: number, imageY: number}} marker - Marker data
   * @param {Object} margins - SVG margins
   */
  renderMarker(marker, margins) {
    const markerSVGX = margins.left + marker.imageX
    const markerSVGY = margins.top + marker.imageY
    
    // Create crosshair with marker color (20x20px size)
    const crosshairSize = 10 // Half size for each direction
    
    // Check if this mode is currently active to determine cursor style
    const isActiveMode = this.instance.state.mode === 'analysis'
    const cursorStyle = isActiveMode ? 'grab' : 'default'
    const pointerEvents = isActiveMode ? 'auto' : 'none'
    
    // Vertical line
    const verticalLine = createSVGLine(
      markerSVGX,
      markerSVGY - crosshairSize,
      markerSVGX,
      markerSVGY + crosshairSize,
      'gram-frame-marker-line'
    )
    verticalLine.setAttribute('stroke', marker.color)
    verticalLine.setAttribute('stroke-width', '3')
    verticalLine.style.pointerEvents = pointerEvents
    verticalLine.style.cursor = cursorStyle
    this.instance.cursorGroup.appendChild(verticalLine)
    
    // Horizontal line
    const horizontalLine = createSVGLine(
      markerSVGX - crosshairSize,
      markerSVGY,
      markerSVGX + crosshairSize,
      markerSVGY,
      'gram-frame-marker-line'
    )
    horizontalLine.setAttribute('stroke', marker.color)
    horizontalLine.setAttribute('stroke-width', '3')
    horizontalLine.style.pointerEvents = pointerEvents
    horizontalLine.style.cursor = cursorStyle
    this.instance.cursorGroup.appendChild(horizontalLine)
    
    // Center point
    const centerPoint = createSVGCircle(markerSVGX, markerSVGY, 2, 'gram-frame-marker-point')
    centerPoint.setAttribute('fill', marker.color)
    centerPoint.style.pointerEvents = pointerEvents
    centerPoint.style.cursor = cursorStyle
    this.instance.cursorGroup.appendChild(centerPoint)
  }



  /**
   * Create UI elements for analysis mode
   * @param {HTMLElement} readoutPanel - Container for UI elements
   */
  createUI(readoutPanel) {
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
   * @param {Object} position - Cursor position data
   */
  addMarker(position) {
    if (!this.state.analysis) {
      this.state.analysis = { markers: [] }
    }
    
    // Get color from color picker
    const color = this.state.harmonics?.selectedColor || '#ff6b6b'
    
    const marker = {
      id: `marker-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      color,
      time: position.time,
      freq: position.freq,
      imageX: position.imageX,
      imageY: position.imageY
    }
    
    this.state.analysis.markers.push(marker)
    
    
    // Update markers table
    this.updateMarkersTable()
    
    // Trigger visual re-render to update marker display immediately
    updateCursorIndicators(this.instance)
    
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
      
      // Trigger visual re-render to update marker display immediately
      updateCursorIndicators(this.instance)
      
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