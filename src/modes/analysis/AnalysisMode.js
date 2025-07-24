import { BaseMode } from '../BaseMode.js'
import { createSVGLine } from '../../utils/svg.js'
import { createLEDDisplay, createColorPicker } from '../../components/UIComponents.js'
import { notifyStateListeners } from '../../core/state.js'

/**
 * Analysis mode implementation
 * Provides crosshair rendering, basic time/frequency display, and persistent markers
 */
export class AnalysisMode extends BaseMode {
  /**
   * Color palette for markers (reusing harmonics colors)
   * @type {string[]}
   */
  static markerColors = ['#ff6b6b', '#2ecc71', '#f39c12', '#9b59b6', '#ffc93c', '#ff9ff3', '#45b7d1', '#e67e22']
  /**
   * Get guidance text for analysis mode
   * @returns {string} HTML content for the guidance panel
   */
  getGuidanceText() {
    return `
      <h4>Analysis Mode</h4>
      <p>• Hover to view exact frequency/time values</p>
      <p>• Click to place persistent markers</p>
      <p>• Right-click markers to delete them</p>
    `
  }

  /**
   * Handle mouse click events - create persistent markers
   * @param {MouseEvent} event - The mouse click event
   * @param {Object} coords - Coordinate information
   */
  handleClick(event, coords) {
    if (!this.state.cursorPosition) return
    
    // Left-click: add new marker
    this.addMarker(this.state.cursorPosition)
  }

  /**
   * Handle context menu (right-click) events
   * @param {MouseEvent} event - The context menu event
   * @param {Object} coords - Coordinate information
   */
  handleContextMenu(event, coords) {
    if (!this.state.cursorPosition) return
    
    // Find marker at cursor position (within tolerance)
    const markerToDelete = this.findMarkerAtPosition(this.state.cursorPosition)
    if (markerToDelete) {
      this.removeMarker(markerToDelete.id)
      event.preventDefault() // Prevent context menu
    }
  }


  /**
   * Render analysis mode cursor indicators and persistent markers
   * @param {SVGElement} svg - The SVG container element
   */
  render(svg) {
    // Render temporary cursor crosshair if cursor position is available
    if (this.state.cursorPosition) {
      this.renderCursor()
    }
    
    // Render all persistent markers
    this.renderMarkers()
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
    const centerPoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    centerPoint.setAttribute('cx', String(cursorSVGX))
    centerPoint.setAttribute('cy', String(cursorSVGY))
    centerPoint.setAttribute('r', '3')
    centerPoint.setAttribute('class', 'gram-frame-cursor-point')
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
    
    // Vertical line
    const verticalLine = createSVGLine(
      markerSVGX,
      markerSVGY - crosshairSize,
      markerSVGX,
      markerSVGY + crosshairSize,
      'gram-frame-marker-line'
    )
    verticalLine.setAttribute('stroke', marker.color)
    verticalLine.setAttribute('stroke-width', '2')
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
    horizontalLine.setAttribute('stroke-width', '2')
    this.instance.cursorGroup.appendChild(horizontalLine)
    
    // Center point
    const centerPoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    centerPoint.setAttribute('cx', String(markerSVGX))
    centerPoint.setAttribute('cy', String(markerSVGY))
    centerPoint.setAttribute('r', '2')
    centerPoint.setAttribute('fill', marker.color)
    centerPoint.setAttribute('class', 'gram-frame-marker-point')
    this.instance.cursorGroup.appendChild(centerPoint)
  }

  /**
   * Create UI elements for analysis mode
   * @param {HTMLElement} readoutPanel - Container for UI elements
   */
  createUI(readoutPanel) {
    this.uiElements = {}
    
    // Create Time LED display
    this.uiElements.timeLED = createLEDDisplay('Time (s)', '0.00')
    readoutPanel.appendChild(this.uiElements.timeLED)
    
    // Create Frequency LED display
    this.uiElements.freqLED = createLEDDisplay('Frequency (Hz)', '0.00')
    readoutPanel.appendChild(this.uiElements.freqLED)
    
    // Create color picker for marker colors
    this.uiElements.colorPicker = createColorPicker(this.state)
    this.uiElements.colorPicker.querySelector('.gram-frame-color-picker-label').textContent = 'Marker Color'
    readoutPanel.appendChild(this.uiElements.colorPicker)
    
    // Create markers table
    this.createMarkersTable(readoutPanel)
    
    // Store references on instance for compatibility
    this.instance.timeLED = this.uiElements.timeLED
    this.instance.freqLED = this.uiElements.freqLED
    this.instance.colorPicker = this.uiElements.colorPicker
  }

  /**
   * Create markers table for displaying active markers
   * @param {HTMLElement} readoutPanel - Container for UI elements
   */
  createMarkersTable(readoutPanel) {
    const tableContainer = document.createElement('div')
    tableContainer.className = 'gram-frame-markers-container'
    
    const tableLabel = document.createElement('h4')
    tableLabel.textContent = 'Active Markers'
    tableLabel.className = 'gram-frame-markers-label'
    tableContainer.appendChild(tableLabel)
    
    const table = document.createElement('table')
    table.className = 'gram-frame-markers-table'
    
    // Create table header
    const thead = document.createElement('thead')
    const headerRow = document.createElement('tr')
    
    const colorHeader = document.createElement('th')
    colorHeader.textContent = 'Color'
    headerRow.appendChild(colorHeader)
    
    const timeHeader = document.createElement('th')
    timeHeader.textContent = 'Time (s)'
    headerRow.appendChild(timeHeader)
    
    const freqHeader = document.createElement('th')
    freqHeader.textContent = 'Freq (Hz)'
    headerRow.appendChild(freqHeader)
    
    const deleteHeader = document.createElement('th')
    deleteHeader.textContent = 'Delete'
    headerRow.appendChild(deleteHeader)
    
    thead.appendChild(headerRow)
    table.appendChild(thead)
    
    // Create table body
    const tbody = document.createElement('tbody')
    table.appendChild(tbody)
    
    tableContainer.appendChild(table)
    readoutPanel.appendChild(tableContainer)
    
    // Store all UI elements for proper cleanup
    this.uiElements.markersContainer = tableContainer
    this.uiElements.markersTable = table
    this.uiElements.markersTableBody = tbody
  }

  /**
   * Update LED displays for analysis mode
   * @param {Object} coords - Current cursor coordinates
   */
  updateLEDs(coords) {
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
        markers: [],
        nextColorIndex: 0
      },
      harmonics: {
        selectedColor: AnalysisMode.markerColors[0] // Default color for markers
      }
    }
  }

  /**
   * Add a new persistent marker
   * @param {Object} position - Cursor position data
   */
  addMarker(position) {
    if (!this.state.analysis) {
      this.state.analysis = { markers: [], nextColorIndex: 0 }
    }
    
    // Get color from color picker or use next color in rotation
    let color
    if (this.state.harmonics && this.state.harmonics.selectedColor) {
      color = this.state.harmonics.selectedColor
    } else {
      color = AnalysisMode.markerColors[this.state.analysis.nextColorIndex % AnalysisMode.markerColors.length]
      this.state.analysis.nextColorIndex++
    }
    
    const marker = {
      id: `marker-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      color,
      time: position.time,
      freq: position.freq,
      imageX: position.imageX,
      imageY: position.imageY
    }
    
    this.state.analysis.markers.push(marker)
    
    // Log marker addition for debugging
    console.log(`Added marker at time: ${marker.time.toFixed(2)}s, freq: ${marker.freq.toFixed(1)}Hz, color: ${marker.color}`)
    
    // Update markers table
    this.updateMarkersTable()
    
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
      const removedMarker = this.state.analysis.markers.splice(index, 1)[0]
      console.log(`Removed marker at time: ${removedMarker.time.toFixed(2)}s, freq: ${removedMarker.freq.toFixed(1)}Hz`)
      
      // Update markers table
      this.updateMarkersTable()
      
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
      timeCell.textContent = marker.time.toFixed(2)
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
      deleteButton.addEventListener('click', () => {
        this.removeMarker(marker.id)
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
        this.uiElements.timeLED.querySelector('.gram-frame-led-value').textContent = '0.00'
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
      const timeValue = this.state.cursorPosition.time.toFixed(2)
      this.uiElements.timeLED.querySelector('.gram-frame-led-value').textContent = timeValue
    }
  }

  /**
   * Clean up analysis mode state
   */
  cleanup() {
    // Clear all markers when leaving analysis mode
    if (this.state.analysis) {
      this.state.analysis.markers = []
      this.state.analysis.nextColorIndex = 0
      this.updateMarkersTable()
    }
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
    if (this.state.analysis) {
      this.state.analysis.markers = []
      this.state.analysis.nextColorIndex = 0
      this.updateMarkersTable()
    }
  }
}