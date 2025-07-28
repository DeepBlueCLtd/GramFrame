import { BaseMode } from '../BaseMode.js'
import { createSVGLine, createSVGText } from '../../utils/svg.js'
import { createLEDDisplay, createColorPicker } from '../../components/UIComponents.js'
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
    
    // Left-click: add new marker
    this.addMarker(this.state.cursorPosition)
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
   * Render analysis mode cursor indicators and persistent markers
   * @param {SVGElement} _svg - The SVG container element
   */
  render(_svg) {
    // Clear existing cursor indicators first
    this.instance.cursorGroup.innerHTML = ''
    
    // Render temporary cursor crosshair if cursor position is available
    if (this.state.cursorPosition) {
      this.renderCursor()
    }
    
    // Render all persistent features from ALL modes for cross-mode visibility
    this.renderAllPersistentFeatures()
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
    verticalLine.setAttribute('stroke-width', '3')
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
   * Render all persistent features from all modes for cross-mode visibility
   */
  renderAllPersistentFeatures() {
    try {
      // Render analysis markers (always visible)
      this.renderMarkers()
      
      // Render harmonic sets from harmonics mode (always visible)
      this.renderHarmonicSets()
      
      // Render doppler markers (always visible) 
      this.renderDopplerMarkers()
      
      console.log('AnalysisMode: rendered all persistent features for cross-mode visibility')
    } catch (error) {
      console.error('Error rendering persistent features in AnalysisMode:', error)
    }
  }

  /**
   * Render harmonic sets from harmonics mode
   */
  renderHarmonicSets() {
    if (!this.state.harmonics || !this.state.harmonics.harmonicSets) return
    
    // Use the proper harmonic rendering logic from HarmonicsMode
    this.state.harmonics.harmonicSets.forEach(harmonicSet => {
      this.drawHarmonicSetLines(harmonicSet)
    })
  }

  /**
   * Draw harmonic set lines (reusing HarmonicsMode logic)
   * @param {Object} harmonicSet - Harmonic set to render
   */
  drawHarmonicSetLines(harmonicSet) {
    const margins = this.state.axes.margins
    const { naturalWidth, naturalHeight } = this.state.imageDetails
    const { freqMin, freqMax } = this.state.config
    
    // Calculate visible harmonic lines
    const minHarmonic = Math.max(1, Math.ceil(freqMin / harmonicSet.spacing))
    const maxHarmonic = Math.floor(freqMax / harmonicSet.spacing)
    
    // Calculate vertical extent (20% of SVG height, centered on anchor time)
    const lineHeight = naturalHeight * 0.2
    const timeRange = this.state.config.timeMax - this.state.config.timeMin
    const timeRatio = (harmonicSet.anchorTime - this.state.config.timeMin) / timeRange
    // Invert the Y coordinate since Y=0 is at top but timeMin should be at bottom
    const anchorSVGY = margins.top + (1 - timeRatio) * naturalHeight
    const lineStartY = anchorSVGY - lineHeight / 2
    const lineEndY = anchorSVGY + lineHeight / 2
    
    // Draw harmonic lines
    for (let harmonic = minHarmonic; harmonic <= maxHarmonic; harmonic++) {
      const freq = harmonic * harmonicSet.spacing
      
      // Convert frequency to SVG x coordinate
      const freqRatio = (freq - freqMin) / (freqMax - freqMin)
      const svgX = margins.left + freqRatio * naturalWidth
      
      // Draw shadow line for visibility
      const shadowLine = createSVGLine(
        svgX,
        lineStartY,
        svgX,
        lineEndY,
        'gram-frame-harmonic-set-shadow'
      )
      this.instance.cursorGroup.appendChild(shadowLine)
      
      // Draw main line with harmonic set color
      const mainLine = createSVGLine(
        svgX,
        lineStartY,
        svgX,
        lineEndY,
        'gram-frame-harmonic-set-line'
      )
      mainLine.setAttribute('stroke', harmonicSet.color)
      this.instance.cursorGroup.appendChild(mainLine)
    }
  }

  /**
   * Render doppler markers from doppler mode
   */
  renderDopplerMarkers() {
    if (!this.state.doppler) return
    
    // Render fMinus marker
    if (this.state.doppler.fMinus) {
      this.renderDopplerMarker(this.state.doppler.fMinus, '#ff4444', 'f-')
    }
    
    // Render fPlus marker  
    if (this.state.doppler.fPlus) {
      this.renderDopplerMarker(this.state.doppler.fPlus, '#44ff44', 'f+')
    }
    
    // Render fZero marker
    if (this.state.doppler.fZero) {
      this.renderDopplerMarker(this.state.doppler.fZero, '#4444ff', 'f₀')
    }
  }

  /**
   * Render a single doppler marker
   */
  renderDopplerMarker(marker, color, label) {
    const margins = this.state.axes.margins
    
    // Convert data coordinates to image coordinates
    const imageX = (marker.time - this.state.config.timeMin) / 
      (this.state.config.timeMax - this.state.config.timeMin) * this.state.imageDetails.naturalWidth
    const imageY = (this.state.config.freqMax - marker.frequency) / 
      (this.state.config.freqMax - this.state.config.freqMin) * this.state.imageDetails.naturalHeight
    
    const markerSVGX = margins.left + imageX
    const markerSVGY = margins.top + imageY
    
    // Create circle marker
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    circle.setAttribute('cx', String(markerSVGX))
    circle.setAttribute('cy', String(markerSVGY))
    circle.setAttribute('r', '6')
    circle.setAttribute('fill', color)
    circle.setAttribute('stroke', '#ffffff')
    circle.setAttribute('stroke-width', '2')
    circle.setAttribute('opacity', '0.8')
    circle.setAttribute('class', 'gram-frame-doppler-marker')
    this.instance.cursorGroup.appendChild(circle)
    
    // Add label
    const text = createSVGText(markerSVGX + 10, markerSVGY - 10, label, 'gram-frame-doppler-label')
    text.setAttribute('fill', color)
    text.setAttribute('font-weight', 'bold')
    this.instance.cursorGroup.appendChild(text)
  }

  /**
   * Create UI elements for analysis mode
   * @param {HTMLElement} readoutPanel - Container for UI elements
   */
  createUI(readoutPanel) {
    this.uiElements = {}
    
    // Create horizontal layout container
    const layoutContainer = document.createElement('div')
    layoutContainer.className = 'gram-frame-analysis-layout'
    layoutContainer.style.display = 'flex'
    layoutContainer.style.gap = '12px'
    layoutContainer.style.height = '100%'
    
    // Create left column for controls
    const leftColumn = document.createElement('div')
    leftColumn.className = 'gram-frame-analysis-controls'
    leftColumn.style.display = 'flex'
    leftColumn.style.flexDirection = 'column'
    leftColumn.style.gap = '8px'
    leftColumn.style.minWidth = '160px'
    leftColumn.style.flexShrink = '0'
    
    // Create horizontal container for LEDs
    const ledsContainer = document.createElement('div')
    ledsContainer.className = 'gram-frame-analysis-leds'
    ledsContainer.style.display = 'flex'
    ledsContainer.style.gap = '6px'
    
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
    const rightColumn = document.createElement('div')
    rightColumn.className = 'gram-frame-analysis-markers'
    rightColumn.style.flex = '1'
    rightColumn.style.display = 'flex'
    rightColumn.style.flexDirection = 'column'
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
    
    // Log marker creation for debugging and memory log
    console.log(`Feature created: Analysis marker ${marker.id}`, {
      timestamp: new Date().toISOString(),
      event: 'feature_creation',
      featureType: 'analysis_marker',
      featureId: marker.id,
      mode: 'analysis',
      position: { time: marker.time, frequency: marker.freq },
      color: marker.color
    })
    
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
      const removedMarker = this.state.analysis.markers.splice(index, 1)[0]
      
      // Log marker deletion for debugging and memory log
      console.log(`Feature deleted: Analysis marker ${removedMarker.id}`, {
        timestamp: new Date().toISOString(),
        event: 'feature_deletion',
        featureType: 'analysis_marker',
        featureId: removedMarker.id,
        mode: 'analysis',
        position: { time: removedMarker.time, frequency: removedMarker.freq },
        color: removedMarker.color
      })
      
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
    // Note: Markers are now persistent across mode switches
    // No longer clearing markers when leaving analysis mode
    console.log('AnalysisMode cleanup: preserving markers for cross-mode persistence')
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
    // Note: resetState is only called by user action (not mode switching)
    // Markers should only be cleared when explicitly requested
    console.log('AnalysisMode resetState: preserving markers (resetState should only clear when explicitly requested)')
  }
}