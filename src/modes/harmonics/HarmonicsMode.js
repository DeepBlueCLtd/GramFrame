import { BaseMode } from '../BaseMode.js'
// SVG utilities removed - no display element
import { updateHarmonicPanelContent, createHarmonicPanel } from '../../components/HarmonicPanel.js'
import { showManualHarmonicModal } from './ManualHarmonicModal.js'
import { notifyStateListeners } from '../../core/state.js'
import { calculateZoomAwarePosition, getImageBounds } from '../../utils/coordinateTransformations.js'
import { BaseDragHandler } from '../shared/BaseDragHandler.js'

/**
 * Harmonics mode implementation
 * Handles harmonic set creation, dragging, and rendering
 */
export class HarmonicsMode extends BaseMode {
  /**
   * Initialize HarmonicsMode with drag handler
   * @param {Object} instance - GramFrame instance
   * @param {Object} state - State object
   */
  constructor(instance, state) {
    super(instance, state)
    
    // Initialize drag handler for existing harmonic set dragging (not for new creation)
    this.dragHandler = new BaseDragHandler(instance, {
      findTargetAt: (position) => this.findHarmonicSetTarget(position),
      onDragStart: (target, position) => this.onHarmonicSetDragStart(target, position),
      onDragUpdate: (target, currentPos, startPos) => this.onHarmonicSetDragUpdate(target, currentPos, startPos),
      onDragEnd: (target, position) => this.onHarmonicSetDragEnd(target, position),
      updateCursor: (style) => this.updateCursorStyle(style)
    })
  }

  /**
   * Find harmonic set target for drag handler
   * @param {DataCoordinates} position - Position to check
   * @returns {Object|null} Drag target if found, null otherwise
   */
  findHarmonicSetTarget(position) {
    const harmonicSet = this.findHarmonicSetAtFrequency(position.freq)
    if (harmonicSet) {
      return {
        id: harmonicSet.id,
        type: 'harmonicSet',
        position: position,
        data: {
          harmonicSet: harmonicSet,
          clickedHarmonicNumber: this.findClickedHarmonicNumber(harmonicSet, position.freq)
        }
      }
    }
    return null
  }

  /**
   * Start dragging a harmonic set
   * @param {Object} target - Drag target with id and type
   * @param {DataCoordinates} position - Start position
   */
  onHarmonicSetDragStart(target, position) {
    const harmonicSet = target.data.harmonicSet
    const clickedHarmonicNumber = target.data.clickedHarmonicNumber
    
    // Update legacy drag state for backward compatibility
    this.state.dragState.isDragging = true
    this.state.dragState.dragStartPosition = { ...position }
    this.state.dragState.draggedHarmonicSetId = harmonicSet.id
    this.state.dragState.originalSpacing = harmonicSet.spacing
    this.state.dragState.originalAnchorTime = harmonicSet.anchorTime
    this.state.dragState.clickedHarmonicNumber = clickedHarmonicNumber
  }

  /**
   * Update harmonic set during drag
   * @param {Object} _target - Drag target with id and type (unused)
   * @param {DataCoordinates} currentPos - Current position
   * @param {DataCoordinates} _startPos - Start position (unused)
   */
  onHarmonicSetDragUpdate(_target, currentPos, _startPos) {
    // Update cursor position for legacy compatibility
    this.state.cursorPosition = {
      freq: currentPos.freq,
      time: currentPos.time,
      x: 0, y: 0, svgX: 0, svgY: 0, imageX: 0, imageY: 0 // Minimal values for compatibility
    }
    
    // Use existing drag handling logic
    this.handleHarmonicSetDrag()
  }

  /**
   * End dragging a harmonic set
   * @param {Object} _target - Drag target with id and type (unused)
   * @param {DataCoordinates} _position - End position (unused)
   */
  onHarmonicSetDragEnd(_target, _position) {
    // Clear legacy drag state
    this.state.dragState.isDragging = false
    this.state.dragState.dragStartPosition = null
    this.state.dragState.draggedHarmonicSetId = null
    this.state.dragState.originalSpacing = null
    this.state.dragState.originalAnchorTime = null
    this.state.dragState.clickedHarmonicNumber = null
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
   * Color palette for harmonic sets
   * @type {string[]}
   */
  static harmonicColors = ['#ff6b6b', '#2ecc71', '#f39c12', '#9b59b6', '#ffc93c', '#ff9ff3', '#45b7d1', '#e67e22']

  /**
   * Get guidance content for harmonics mode
   * @returns {Object} Structured guidance content
   */
  getGuidanceText() {
    return {
      title: 'Harmonics Mode',
      items: [
        'Click & drag to generate harmonic lines',
        'Drag existing harmonic lines to adjust spacing intervals',
        'Manually add harmonic lines using [+ Manual] button',
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
   * Handle mouse move events in harmonics mode
   * @param {MouseEvent} _event - Mouse event
   * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
   */
  handleMouseMove(_event, dataCoords) {
    // Handle existing harmonic set dragging through drag handler
    if (this.dragHandler.isDragging()) {
      this.dragHandler.handleMouseMove(dataCoords)
    } else if (this.state.dragState.isCreatingNewHarmonicSet) {
      // Handle new creation drag (not managed by BaseDragHandler)
      // Update cursor position for legacy compatibility
      this.state.cursorPosition = {
        freq: dataCoords.freq,
        time: dataCoords.time,
        x: 0, y: 0, svgX: 0, svgY: 0, imageX: 0, imageY: 0 // Minimal values
      }
      this.handleHarmonicSetDrag()
    } else {
      // Update cursor for hover when not dragging
      this.dragHandler.updateCursorForHover(dataCoords)
    }
    
    // Update harmonic panel ratio values on mouse movement to reflect current cursor position
    // This ensures existing harmonic sets show their ratio relative to the current mouse position
    if (this.state.harmonics.harmonicSets.length > 0) {
      this.updateHarmonicPanel()
    }
  }

  /**
   * Handle mouse down events in harmonics mode
   * @param {MouseEvent} event - Mouse event
   * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
   */
  handleMouseDown(event, dataCoords) {
    // Only handle left clicks
    if (event.button !== 0) {
      return
    }
    
    // Try to start drag on existing harmonic set
    const dragStarted = this.dragHandler.startDrag(dataCoords)
    
    if (!dragStarted) {
      // No existing harmonic set found, start creating new harmonic set
      this.startNewHarmonicSetCreation(dataCoords)
    }
  }

  /**
   * Handle mouse up events in harmonics mode
   * @param {MouseEvent} _event - Mouse event
   * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
   */
  handleMouseUp(_event, dataCoords) {
    // End existing harmonic set dragging through drag handler
    if (this.dragHandler.isDragging()) {
      this.dragHandler.endDrag(dataCoords)
    }
    
    // Complete new harmonic set creation if in creation mode (not managed by BaseDragHandler)
    if (this.state.dragState.isCreatingNewHarmonicSet) {
      this.completeNewHarmonicSetCreation(dataCoords)
      // Reset cursor after creation
      if (this.instance.spectrogramImage) {
        this.instance.spectrogramImage.style.cursor = 'crosshair'
      }
    }
  }









  /**
   * Create UI elements for harmonics mode
   * @param {HTMLElement} harmonicsContainer - Persistent container for harmonics table
   */
  createUI(harmonicsContainer) {
    // Initialize uiElements
    this.uiElements = {}


    
    // Use the provided persistent harmonics container (already has label)
    this.uiElements.harmonicsContainer = harmonicsContainer
    
    // Find the button container created in main.js
    const buttonContainer = harmonicsContainer.querySelector('.gram-frame-harmonics-button-container')
    
    // Check if UI already exists to prevent duplicates
    if (buttonContainer && buttonContainer.querySelector('.gram-frame-manual-button')) {
      // Find existing elements and store references
      this.uiElements.manualButton = buttonContainer.querySelector('.gram-frame-manual-button')
      this.uiElements.harmonicPanel = harmonicsContainer.querySelector('.gram-frame-harmonic-panel')

      this.instance.harmonicPanel = this.uiElements.harmonicPanel
      return
    }
    
    // Create Manual button and add to existing container
    this.uiElements.manualButton = this.createManualButton()
    if (buttonContainer) {
      buttonContainer.appendChild(this.uiElements.manualButton)
    }
    
    // Create harmonic management panel in the persistent container
    this.uiElements.harmonicPanel = createHarmonicPanel(harmonicsContainer)
    
    // Store references on instance for compatibility

    this.instance.harmonicPanel = this.uiElements.harmonicPanel
    
    // Central color picker is managed by unified layout
    this.instance.colorPicker = this.instance.colorPicker || null
    
    // Populate panel with existing harmonic sets when UI is created
    this.updateHarmonicPanel()
  }

  /**
   * Update LED displays for harmonics mode
   * @param {CursorPosition} _coords - Current cursor coordinates
   */
  updateLEDs(_coords) {
    // Harmonics mode specific updates (harmonic panel refresh)
    this.updateModeSpecificLEDs()
  }

  /**
   * Update mode-specific LED values and labels based on current state
   */
  updateModeSpecificLEDs() {
    // Update harmonic panel to show current rate values
    this.updateHarmonicPanel()
  }

  /**
   * Reset harmonics-specific state
   */
  resetState() {
    // Only clear when explicitly requested by user (not during mode switches)
    this.state.harmonics.baseFrequency = null
    this.state.harmonics.harmonicData = []
    // Note: harmonicSets are only cleared by explicit user action, not by resetState
  }

  /**
   * Clean up harmonics-specific state when switching away from harmonics mode
   */
  cleanup() {
    // Only clear transient state, preserve harmonic sets for cross-mode persistence
    this.state.harmonics.baseFrequency = null
    this.state.harmonics.harmonicData = []
    // Note: harmonicSets are intentionally preserved
  }

  /**
   * Destroy mode-specific UI elements when leaving this mode
   */
  destroyUI() {

    // Central color picker is managed by unified layout
    // Harmonics panel and container are persistent and should not be removed
    // Only remove non-persistent elements if any
    
    // Don't call super.destroyUI() because it removes persistent elements from DOM
    // Instead, just clear references to non-persistent elements
    

  }

  /**
   * Add a new harmonic set
   * @param {number} anchorTime - Time position in seconds
   * @param {number} spacing - Frequency spacing in Hz
   * @returns {HarmonicSet} The created harmonic set
   */
  addHarmonicSet(anchorTime, spacing) {
    const id = `harmonic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Use selected color from global state, fallback to cycling through predefined colors
    let color
    if (this.state.selectedColor) {
      color = this.state.selectedColor
    } else {
      const colorIndex = this.state.harmonics.harmonicSets.length % HarmonicsMode.harmonicColors.length
      color = HarmonicsMode.harmonicColors[colorIndex]
    }
    
    /** @type {HarmonicSet} */
    const harmonicSet = {
      id,
      color,
      anchorTime,
      spacing
    }
    
    this.state.harmonics.harmonicSets.push(harmonicSet)
    
    // Auto-select the newly created harmonic set
    const index = this.state.harmonics.harmonicSets.length - 1
    this.instance.setSelection('harmonicSet', harmonicSet.id, index)
    
    // Update visual elements
    if (this.instance.harmonicPanel) {
      updateHarmonicPanelContent(this.instance.harmonicPanel, this.instance)
    }
    
    // Trigger re-render of persistent features to show the new harmonic set
    if (this.instance.featureRenderer) {
      this.instance.featureRenderer.renderAllPersistentFeatures()
    }
    
    notifyStateListeners(this.state, this.instance.stateListeners)
    
    return harmonicSet
  }

  /**
   * Update an existing harmonic set
   * @param {string} id - Harmonic set ID
   * @param {Partial<HarmonicSet>} updates - Properties to update
   */
  updateHarmonicSet(id, updates) {
    const setIndex = this.state.harmonics.harmonicSets.findIndex(set => set.id === id)
    if (setIndex !== -1) {
      Object.assign(this.state.harmonics.harmonicSets[setIndex], updates)
      
      // Update visual elements
      if (this.instance.harmonicPanel) {
        updateHarmonicPanelContent(this.instance.harmonicPanel, this.instance)
      }
      
      // Trigger re-render of persistent features to show updated harmonic set
      if (this.instance.featureRenderer) {
        this.instance.featureRenderer.renderAllPersistentFeatures()
      }
      
      notifyStateListeners(this.state, this.instance.stateListeners)
    }
  }

  /**
   * Remove a harmonic set
   * @param {string} id - Harmonic set ID
   */
  removeHarmonicSet(id) {
    const setIndex = this.state.harmonics.harmonicSets.findIndex(set => set.id === id)
    if (setIndex !== -1) {
      // Clear selection if removing the selected harmonic set
      if (this.state.selection.selectedType === 'harmonicSet' && 
          this.state.selection.selectedId === id) {
        this.instance.clearSelection()
      }
      
      this.state.harmonics.harmonicSets.splice(setIndex, 1)
      
      // Update visual elements
      if (this.instance.harmonicPanel) {
        updateHarmonicPanelContent(this.instance.harmonicPanel, this.instance)
      }
      
      // Trigger re-render of persistent features to remove the harmonic set
      if (this.instance.featureRenderer) {
        this.instance.featureRenderer.renderAllPersistentFeatures()
      }
      
      notifyStateListeners(this.state, this.instance.stateListeners)
    }
  }

  /**
   * Find harmonic set containing given frequency coordinate
   * @param {number} freq - Frequency in Hz to check
   * @returns {HarmonicSet|null} The harmonic set if found, null otherwise
   */
  findHarmonicSetAtFrequency(freq) {
    if (!this.state.cursorPosition) return null
    
    const cursorTime = this.state.cursorPosition.time
    
    for (const harmonicSet of this.state.harmonics.harmonicSets) {
      // Check if frequency is close to any harmonic line in this set
      if (harmonicSet.spacing > 0) {
        // Only consider harmonics within the visible frequency range
        const freqMin = this.state.config.freqMin
        const freqMax = this.state.config.freqMax
        
        const minHarmonic = Math.max(1, Math.ceil(freqMin / harmonicSet.spacing))
        const maxHarmonic = Math.floor(freqMax / harmonicSet.spacing)
        
        for (let h = minHarmonic; h <= maxHarmonic; h++) {
          const expectedFreq = h * harmonicSet.spacing
          // Use a 5-pixel tolerance for clicking on lines
          const pixelTolerance = 5
          const freqRange = freqMax - freqMin
          const { naturalWidth } = this.state.imageDetails
          // Convert pixel tolerance to frequency units
          const tolerance = (pixelTolerance / naturalWidth) * freqRange
          
          if (Math.abs(freq - expectedFreq) < tolerance) {
            // Also check if cursor is within the vertical range of the harmonic line
            // Harmonic lines have 20% of SVG height, centered on anchor time
            const { naturalHeight } = this.state.imageDetails
            const lineHeight = naturalHeight * 0.2
            const timeRange = this.state.config.timeMax - this.state.config.timeMin
            const lineHeightInTime = (lineHeight / naturalHeight) * timeRange
            
            const lineStartTime = harmonicSet.anchorTime - lineHeightInTime / 2
            const lineEndTime = harmonicSet.anchorTime + lineHeightInTime / 2
            
            // Check if cursor is within the vertical range of the harmonic line
            if (cursorTime >= lineStartTime && cursorTime <= lineEndTime) {
              return harmonicSet
            }
          }
        }
      }
    }
    return null
  }

  /**
   * Create a new harmonic set immediately and start drag mode for updates
   * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
   */
  startNewHarmonicSetCreation(dataCoords) {
    // Calculate initial spacing based on frequency axis origin
    const freqMin = this.state.config.freqMin
    let initialSpacing
    let clickedHarmonicNumber
    
    if (freqMin > 0) {
      // Origin > 0, position at 10th harmonic
      clickedHarmonicNumber = 10
      initialSpacing = dataCoords.freq / clickedHarmonicNumber
    } else {
      // Origin at 0, position at 5th harmonic
      clickedHarmonicNumber = 5
      initialSpacing = dataCoords.freq / clickedHarmonicNumber
    }
    
    // Ensure minimum spacing
    initialSpacing = Math.max(initialSpacing, 0.1)
    
    // Create the harmonic set immediately
    const harmonicSet = this.addHarmonicSet(dataCoords.time, initialSpacing)
    
    // Set creation mode for drag updates
    this.state.dragState.isCreatingNewHarmonicSet = true
    this.state.dragState.dragStartPosition = { ...dataCoords }
    this.state.dragState.draggedHarmonicSetId = harmonicSet.id
    this.state.dragState.originalSpacing = initialSpacing
    this.state.dragState.originalAnchorTime = dataCoords.time
    this.state.dragState.clickedHarmonicNumber = clickedHarmonicNumber
    
    // Change cursor to indicate drag interaction
    if (this.instance.spectrogramImage) {
      this.instance.spectrogramImage.style.cursor = 'grabbing'
    }
  }

  /**
   * Complete the drag update of the newly created harmonic set
   * @param {DataCoordinates} _dataCoords - Final drag position coordinates (unused)
   */
  completeNewHarmonicSetCreation(_dataCoords) {
    // Just clear the creation state - harmonic set was already created and updated during drag
    this.state.dragState.isCreatingNewHarmonicSet = false
    this.state.dragState.dragStartPosition = null
    this.state.dragState.draggedHarmonicSetId = null
    this.state.dragState.originalSpacing = null
    this.state.dragState.originalAnchorTime = null
    this.state.dragState.clickedHarmonicNumber = null
  }


  /**
   * Find which harmonic number was clicked
   * @param {HarmonicSet} harmonicSet - The harmonic set
   * @param {number} freq - The clicked frequency
   * @returns {number} The harmonic number (1, 2, 3, etc.)
   */
  findClickedHarmonicNumber(harmonicSet, freq) {
    const harmonicNumber = Math.round(freq / harmonicSet.spacing)
    return Math.max(1, harmonicNumber)
  }

  /**
   * Handle harmonic set dragging (both existing sets and new creation)
   */
  handleHarmonicSetDrag() {
    if (!this.state.cursorPosition || !this.state.dragState.dragStartPosition) return

    const currentPos = this.state.cursorPosition
    const startPos = this.state.dragState.dragStartPosition
    const setId = this.state.dragState.draggedHarmonicSetId

    if (!setId) return

    const harmonicSet = this.state.harmonics.harmonicSets.find(set => set.id === setId)
    if (!harmonicSet) return

    let newSpacing, newAnchorTime

    // For both new creation and existing drags, keep the clicked harmonic under the cursor
    const clickedHarmonicNumber = this.state.dragState.clickedHarmonicNumber || 1
    
    // Calculate spacing so the clicked harmonic stays at cursor position
    newSpacing = currentPos.freq / clickedHarmonicNumber
    
    // Ensure minimum spacing
    newSpacing = Math.max(newSpacing, 0.1)
    
    // Allow vertical movement for both new creation and existing drags
    const deltaTime = currentPos.time - startPos.time
    newAnchorTime = this.state.dragState.originalAnchorTime + deltaTime

    // Apply updates
    const updates = {}
    if (newSpacing > 0) {
      updates.spacing = newSpacing
    }
    updates.anchorTime = newAnchorTime

    this.updateHarmonicSet(setId, updates)
    
    // Update harmonic management panel
    this.updateHarmonicPanel()
  }

  /**
   * Update harmonic management panel
   */
  updateHarmonicPanel() {

    if (this.instance.harmonicPanel) {
      updateHarmonicPanelContent(this.instance.harmonicPanel, this.instance)
    } else {

    }
  }

  /**
   * Create manual harmonic button
   * @returns {HTMLElement} The manual button element
   */
  createManualButton() {
    const button = document.createElement('button')
    button.className = 'gram-frame-manual-button'
    button.textContent = '+ Manual'
    button.title = 'Manually add a set of harmonics at a specific spacing'
    
    button.addEventListener('click', () => {
      this.showManualHarmonicModal()
    })
    
    return button
  }

  /**
   * Show manual harmonic modal dialog
   */
  showManualHarmonicModal() {
    showManualHarmonicModal(this.state, this.addHarmonicSet.bind(this))
  }

  /**
   * Render persistent features for harmonics mode
   */
  renderPersistentFeatures() {
    if (!this.instance.cursorGroup || !this.state.harmonics?.harmonicSets) {
      return
    }
    
    // Clear existing harmonic lines
    const existingHarmonics = this.instance.cursorGroup.querySelectorAll('.gram-frame-harmonic-line')
    existingHarmonics.forEach(line => line.remove())
    
    // Render all harmonic sets
    this.state.harmonics.harmonicSets.forEach(harmonicSet => {
      this.renderHarmonicSet(harmonicSet)
    })
  }

  /**
   * Get visible harmonics within frequency range
   * @param {HarmonicSet} harmonicSet - Harmonic set configuration
   * @param {Config} config - Configuration object
   * @returns {number[]} Array of harmonic numbers to render
   */
  getVisibleHarmonics(harmonicSet, config) {
    const { freqMin, freqMax } = config
    const minHarmonic = Math.max(1, Math.ceil(freqMin / harmonicSet.spacing))
    const maxHarmonic = Math.floor(freqMax / harmonicSet.spacing)
    
    const harmonics = []
    for (let h = minHarmonic; h <= maxHarmonic; h++) {
      harmonics.push(h)
    }
    return harmonics
  }

  /**
   * Calculate harmonic line dimensions and positions
   * @param {HarmonicSet} harmonicSet - Harmonic set configuration
   * @returns {Object} Line dimensions with height and top position
   */
  calculateHarmonicLineDimensions(harmonicSet) {
    const { naturalHeight } = this.state.imageDetails
    const margins = this.state.axes.margins
    const zoomLevel = this.state.zoom.level
    const { timeMin, timeMax } = this.state.config
    
    // Calculate harmonic line height (20% of spectrogram height)
    const lineHeightRatio = 0.2
    let lineHeight, lineTop
    
    if (zoomLevel === 1.0) {
      lineHeight = naturalHeight * lineHeightRatio
      // Center the line on anchor time
      const normalizedAnchorTime = 1.0 - (harmonicSet.anchorTime - timeMin) / (timeMax - timeMin)
      const anchorY = margins.top + normalizedAnchorTime * naturalHeight
      lineTop = anchorY - lineHeight / 2
    } else {
      // Zoomed - calculate position based on current image transform
      const imageBounds = getImageBounds(this.getViewport(), this.instance.spectrogramImage)
      lineHeight = imageBounds.height * lineHeightRatio
      const anchorPoint = { freq: harmonicSet.spacing, time: harmonicSet.anchorTime }
      const anchorSVG = calculateZoomAwarePosition(anchorPoint, this.getViewport(), this.instance.spectrogramImage)
      lineTop = anchorSVG.y - lineHeight / 2
    }
    
    return { lineHeight, lineTop }
  }

  /**
   * Create SVG line element for a harmonic
   * @param {number} harmonicNumber - Harmonic number
   * @param {HarmonicSet} harmonicSet - Harmonic set configuration
   * @param {number} lineX - X position for the line
   * @param {number} lineTop - Top Y position for the line
   * @param {number} lineHeight - Height of the line
   * @returns {SVGLineElement} SVG line element
   */
  createHarmonicLine(harmonicNumber, harmonicSet, lineX, lineTop, lineHeight) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('class', 'gram-frame-harmonic-line')
    line.setAttribute('data-harmonic-set-id', harmonicSet.id)
    line.setAttribute('data-harmonic-number', String(harmonicNumber))
    line.setAttribute('x1', String(lineX))
    line.setAttribute('y1', String(lineTop))
    line.setAttribute('x2', String(lineX))
    line.setAttribute('y2', String(lineTop + lineHeight))
    line.setAttribute('stroke', harmonicSet.color)
    line.setAttribute('stroke-width', '2')
    line.setAttribute('stroke-linecap', 'round')
    line.setAttribute('opacity', '0.9')
    return line
  }

  /**
   * Create SVG text label for a harmonic number
   * @param {number} harmonicNumber - Harmonic number
   * @param {HarmonicSet} harmonicSet - Harmonic set configuration
   * @param {number} lineX - X position for the label
   * @param {number} lineTop - Top Y position for the label
   * @returns {SVGTextElement} SVG text element
   */
  createHarmonicLabel(harmonicNumber, harmonicSet, lineX, lineTop) {
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    label.setAttribute('class', 'gram-frame-harmonic-number')
    label.setAttribute('x', String(lineX + 3)) // 3 pixels to the right of line
    label.setAttribute('y', String(lineTop + 12)) // 12 pixels down from top
    label.setAttribute('fill', harmonicSet.color)
    label.setAttribute('font-size', '12')
    label.setAttribute('font-weight', 'bold')
    label.setAttribute('font-family', 'Arial, sans-serif')
    label.textContent = String(harmonicNumber)
    return label
  }

  /**
   * Render a single harmonic set as vertical lines
   * @param {HarmonicSet} harmonicSet - Harmonic set to render
   */
  renderHarmonicSet(harmonicSet) {
    if (!this.instance.cursorGroup) {
      return
    }
    
    // Get visible harmonics and line dimensions
    const visibleHarmonics = this.getVisibleHarmonics(harmonicSet, this.state.config)
    const { lineHeight, lineTop } = this.calculateHarmonicLineDimensions(harmonicSet)
    
    // Render each harmonic line in this set
    visibleHarmonics.forEach(harmonicNumber => {
      const harmonicFreq = harmonicNumber * harmonicSet.spacing
      
      // Calculate X position using coordinate transformation utility
      const harmonicPoint = { freq: harmonicFreq, time: harmonicSet.anchorTime }
      const harmonicSVG = calculateZoomAwarePosition(harmonicPoint, this.getViewport(), this.instance.spectrogramImage)
      const lineX = harmonicSVG.x
      
      // Create and append line and label elements
      const line = this.createHarmonicLine(harmonicNumber, harmonicSet, lineX, lineTop, lineHeight)
      const label = this.createHarmonicLabel(harmonicNumber, harmonicSet, lineX, lineTop)
      
      this.instance.cursorGroup.appendChild(line)
      this.instance.cursorGroup.appendChild(label)
    })
  }

  /**
   * Get initial state for harmonics mode
   * @returns {HarmonicsInitialState} Harmonics-specific initial state
   */
  static getInitialState() {
    return {
      harmonics: {
        baseFrequency: null,
        harmonicData: [],
        harmonicSets: []
      },
      dragState: {
        isDragging: false,
        dragStartPosition: null,
        draggedHarmonicSetId: null,
        originalSpacing: null,
        originalAnchorTime: null,
        clickedHarmonicNumber: null,
        isCreatingNewHarmonicSet: false
      }
    }
  }

}