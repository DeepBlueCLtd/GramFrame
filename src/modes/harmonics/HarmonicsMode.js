import { BaseMode } from '../BaseMode.js'
// SVG utilities removed - no display element
import { updateHarmonicPanelContent, createHarmonicPanel } from '../../components/HarmonicPanel.js'
import { showManualHarmonicModal } from './ManualHarmonicModal.js'
import { notifyStateListeners } from '../../core/state.js'

/**
 * Harmonics mode implementation
 * Handles harmonic set creation, dragging, and rendering
 */
export class HarmonicsMode extends BaseMode {
  /**
   * Color palette for harmonic sets
   * @type {string[]}
   */
  static harmonicColors = ['#ff6b6b', '#2ecc71', '#f39c12', '#9b59b6', '#ffc93c', '#ff9ff3', '#45b7d1', '#e67e22']

  /**
   * Get guidance text for harmonics mode
   * @returns {string} HTML content for the guidance panel
   */
  getGuidanceText() {
    return `
      <h4>Harmonics Mode</h4>
      <p>• Click & drag to generate harmonic lines</p>
      <p>• Drag existing harmonic lines to adjust spacing intervals</p>
      <p>• Manually add harmonic lines using [+ Manual] button</p>
      <p>• Click table row + arrow keys (Shift for larger steps)</p>
    `
  }

  /**
   * Handle mouse move events in harmonics mode
   * @param {MouseEvent} _event - Mouse event
   * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
   */
  handleMouseMove(_event, dataCoords) {
    // Update cursor style based on whether we're hovering over a harmonic line
    const harmonicSet = this.findHarmonicSetAtFrequency(dataCoords.freq)
    if (harmonicSet && this.instance.spectrogramImage && !this.state.dragState.isDragging && !this.state.dragState.isCreatingNewHarmonicSet) {
      this.instance.spectrogramImage.style.cursor = 'grab'
    } else if (!this.state.dragState.isDragging && !this.state.dragState.isCreatingNewHarmonicSet) {
      this.instance.spectrogramImage.style.cursor = 'crosshair'
    }
    
    // Handle dragging if active (existing harmonic sets or new creation)
    if (this.state.dragState.isDragging || this.state.dragState.isCreatingNewHarmonicSet) {
      this.handleHarmonicSetDrag()
    }
    
    // Don't update harmonic panel on every mouse move - it causes flicker
    // The rate updates are not critical enough to justify the performance cost
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
    
    // Check if clicking on existing harmonic line for dragging
    const existingHarmonicSet = this.findHarmonicSetAtFrequency(dataCoords.freq)
    
    if (existingHarmonicSet) {
      // Start dragging existing harmonic set
      this.startHarmonicSetDrag(existingHarmonicSet, dataCoords)
    } else {
      // Start creating new harmonic set - wait for drag to complete
      this.startNewHarmonicSetCreation(dataCoords)
    }
  }

  /**
   * Handle mouse up events in harmonics mode
   * @param {MouseEvent} _event - Mouse event
   * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
   */
  handleMouseUp(_event, dataCoords) {
    // End dragging if active
    if (this.state.dragState.isDragging) {
      this.endHarmonicSetDrag()
    }
    
    // Complete new harmonic set creation if in creation mode
    if (this.state.dragState.isCreatingNewHarmonicSet) {
      this.completeNewHarmonicSetCreation(dataCoords)
    }
    
    // Reset cursor
    if (this.instance.spectrogramImage) {
      this.instance.spectrogramImage.style.cursor = 'crosshair'
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
    
    // Use selected color from color picker, fallback to cycling through predefined colors
    let color
    if (this.state.harmonics && this.state.harmonics.selectedColor) {
      color = this.state.harmonics.selectedColor
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
    initialSpacing = Math.max(initialSpacing, 1.0)
    
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
   * Start dragging a harmonic set
   * @param {HarmonicSet} harmonicSet - The harmonic set to drag
   * @param {DataCoordinates} dataCoords - Current cursor coordinates
   */
  startHarmonicSetDrag(harmonicSet, dataCoords) {
    // Find which harmonic number the user clicked on
    const clickedHarmonicNumber = this.findClickedHarmonicNumber(harmonicSet, dataCoords.freq)
    
    // Initialize drag state
    this.state.dragState.isDragging = true
    this.state.dragState.dragStartPosition = { ...dataCoords }
    this.state.dragState.draggedHarmonicSetId = harmonicSet.id
    this.state.dragState.originalSpacing = harmonicSet.spacing
    this.state.dragState.originalAnchorTime = harmonicSet.anchorTime
    this.state.dragState.clickedHarmonicNumber = clickedHarmonicNumber
    
    // Change cursor to grabbing
    if (this.instance.spectrogramImage) {
      this.instance.spectrogramImage.style.cursor = 'grabbing'
    }
  }

  /**
   * End dragging a harmonic set
   */
  endHarmonicSetDrag() {
    this.state.dragState.isDragging = false
    this.state.dragState.dragStartPosition = null
    this.state.dragState.draggedHarmonicSetId = null
    this.state.dragState.originalSpacing = null
    this.state.dragState.originalAnchorTime = null
    this.state.dragState.clickedHarmonicNumber = null
    this.state.dragState.isCreatingNewHarmonicSet = false
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
    newSpacing = Math.max(newSpacing, 1.0)
    
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
   * Render a single harmonic set as vertical lines
   * @param {HarmonicSet} harmonicSet - Harmonic set to render
   */
  renderHarmonicSet(harmonicSet) {
    if (!this.instance.cursorGroup) {
      return
    }
    
    const { naturalWidth, naturalHeight } = this.state.imageDetails
    const margins = this.state.axes.margins
    const zoomLevel = this.state.zoom.level
    const { timeMin, timeMax, freqMin, freqMax } = this.state.config
    
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
      if (this.instance.spectrogramImage) {
        const imageTop = parseFloat(this.instance.spectrogramImage.getAttribute('y') || String(margins.top))
        const imageHeight = parseFloat(this.instance.spectrogramImage.getAttribute('height') || String(naturalHeight))
        
        lineHeight = imageHeight * lineHeightRatio
        const normalizedAnchorTime = 1.0 - (harmonicSet.anchorTime - timeMin) / (timeMax - timeMin)
        const anchorY = imageTop + normalizedAnchorTime * imageHeight
        lineTop = anchorY - lineHeight / 2
      } else {
        lineHeight = naturalHeight * lineHeightRatio
        const normalizedAnchorTime = 1.0 - (harmonicSet.anchorTime - timeMin) / (timeMax - timeMin)
        const anchorY = margins.top + normalizedAnchorTime * naturalHeight
        lineTop = anchorY - lineHeight / 2
      }
    }
    
    // Calculate frequency range to render
    const minHarmonic = Math.max(1, Math.ceil(freqMin / harmonicSet.spacing))
    const maxHarmonic = Math.floor(freqMax / harmonicSet.spacing)
    
    // Render each harmonic line in this set
    for (let h = minHarmonic; h <= maxHarmonic; h++) {
      const harmonicFreq = h * harmonicSet.spacing
      
      // Calculate X position
      const normalizedX = (harmonicFreq - freqMin) / (freqMax - freqMin)
      let lineX
      
      if (zoomLevel === 1.0) {
        lineX = margins.left + normalizedX * naturalWidth
      } else {
        if (this.instance.spectrogramImage) {
          const imageLeft = parseFloat(this.instance.spectrogramImage.getAttribute('x') || String(margins.left))
          const imageWidth = parseFloat(this.instance.spectrogramImage.getAttribute('width') || String(naturalWidth))
          lineX = imageLeft + normalizedX * imageWidth
        } else {
          lineX = margins.left + normalizedX * naturalWidth
        }
      }
      
      // Create harmonic line (solid)
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      line.setAttribute('class', 'gram-frame-harmonic-line')
      line.setAttribute('data-harmonic-set-id', harmonicSet.id)
      line.setAttribute('data-harmonic-number', String(h))
      line.setAttribute('x1', String(lineX))
      line.setAttribute('y1', String(lineTop))
      line.setAttribute('x2', String(lineX))
      line.setAttribute('y2', String(lineTop + lineHeight))
      line.setAttribute('stroke', harmonicSet.color)
      line.setAttribute('stroke-width', '2')
      line.setAttribute('stroke-linecap', 'round')
      line.setAttribute('opacity', '0.9')
      
      this.instance.cursorGroup.appendChild(line)
      
      // Add harmonic number label at top-left of line
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      label.setAttribute('class', 'gram-frame-harmonic-number')
      label.setAttribute('x', String(lineX + 3)) // 3 pixels to the right of line
      label.setAttribute('y', String(lineTop + 12)) // 12 pixels down from top
      label.setAttribute('fill', harmonicSet.color)
      label.setAttribute('font-size', '12')
      label.setAttribute('font-weight', 'bold')
      label.setAttribute('font-family', 'Arial, sans-serif')
      label.textContent = String(h)
      
      this.instance.cursorGroup.appendChild(label)
    }
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
        harmonicSets: [],
        selectedColor: '#ff6b6b'
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