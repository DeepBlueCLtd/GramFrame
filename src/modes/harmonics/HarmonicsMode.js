import { BaseMode } from '../BaseMode.js'
// SVG utilities removed - no display element
import { updateHarmonicPanelContent, createHarmonicPanel } from '../../components/HarmonicPanel.js'
import { notifyStateListeners } from '../../core/state.js'
import { createLEDDisplay, createColorPicker, createFullFlexLayout, createFlexColumn, createFlexLayout } from '../../components/UIComponents.js'

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
    `
  }

  /**
   * Handle mouse move events in harmonics mode
   * @param {MouseEvent} event - Mouse event
   * @param {Object} dataCoords - Data coordinates {freq, time}
   */
  handleMouseMove(event, dataCoords) {
    // Harmonics mode specific handling can be added here
  }

  /**
   * Handle mouse down events in harmonics mode
   * @param {MouseEvent} _event - Mouse event (unused in current implementation)
   * @param {Object} _dataCoords - Data coordinates {freq, time} (unused in current implementation)
   */
  handleMouseDown(_event, _dataCoords) {
    // Harmonics mode specific handling
  }

  /**
   * Handle mouse up events in harmonics mode
   * @param {MouseEvent} _event - Mouse event (unused in current implementation)
   * @param {Object} _dataCoords - Data coordinates {freq, time} (unused in current implementation)
   */
  handleMouseUp(_event, _dataCoords) {
    // Harmonics mode specific handling
  }









  /**
   * Create UI elements for harmonics mode
   * @param {HTMLElement} readoutPanel - Container for UI elements
   */
  createUI(readoutPanel) {
    // Initialize uiElements
    this.uiElements = {}
    
    // Create main layout container with two columns
    const layoutContainer = createFullFlexLayout('gram-frame-harmonics-layout', '10px')
    
    // Create left column for controls (40% width)
    const leftColumn = createFlexColumn('gram-frame-harmonics-controls', '10px')
    leftColumn.style.flex = '0 0 40%'
    
    // Create top row in left column (Manual button only)
    const topRow = createFlexLayout('gram-frame-harmonics-top-row', '10px')
    
    // Create Manual button and add to top row
    this.uiElements.manualButton = this.createManualButton()
    topRow.appendChild(this.uiElements.manualButton)
    
    // Add top row to left column
    leftColumn.appendChild(topRow)
    
    // Create color picker for harmonics and add below
    this.uiElements.colorPicker = createColorPicker(this.state)
    leftColumn.appendChild(this.uiElements.colorPicker)
    
    // Create right column for harmonic panel (60% width)
    const rightColumn = createFlexColumn('gram-frame-harmonics-table-column')
    rightColumn.style.flex = '0 0 60%'
    rightColumn.style.minWidth = '0'
    
    // Add columns to layout container
    layoutContainer.appendChild(leftColumn)
    layoutContainer.appendChild(rightColumn)
    
    // Add layout container to readout panel
    readoutPanel.appendChild(layoutContainer)
    
    // Create harmonic management panel in right column
    this.uiElements.harmonicPanel = createHarmonicPanel(rightColumn)
    
    // Store references on instance for compatibility (removed freqLED)
    this.instance.colorPicker = this.uiElements.colorPicker
    this.instance.harmonicPanel = this.uiElements.harmonicPanel
    this.instance.manualButton = this.uiElements.manualButton
    
    // Store layout container for cleanup
    this.uiElements.layoutContainer = layoutContainer
    
    // Populate panel with existing harmonic sets when UI is created
    this.updateHarmonicPanel()
  }

  /**
   * Update LED displays for harmonics mode
   * @param {Object} _coords - Current cursor coordinates
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
    // Remove instance references
    if (this.instance.colorPicker === this.uiElements.colorPicker) {
      this.instance.colorPicker = null
    }
    if (this.instance.harmonicPanel === this.uiElements.harmonicPanel) {
      this.instance.harmonicPanel = null
    }
    if (this.instance.manualButton === this.uiElements.manualButton) {
      this.instance.manualButton = null
    }
    
    // Call parent destroy to remove all UI elements
    super.destroyUI()
  }

  /**
   * Add a new harmonic set
   * @param {number} anchorTime - Time position in seconds
   * @param {number} spacing - Frequency spacing in Hz
   * @returns {Object} The created harmonic set
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
    
    const harmonicSet = {
      id,
      color,
      anchorTime,
      spacing
    }
    
    this.state.harmonics.harmonicSets.push(harmonicSet)
    
    
    // Visual updates removed - no display element
    if (this.instance.harmonicPanel) {
      updateHarmonicPanelContent(this.instance.harmonicPanel, this.instance)
    }
    notifyStateListeners(this.state, this.instance.stateListeners)
    
    return harmonicSet
  }

  /**
   * Update an existing harmonic set
   * @param {string} id - Harmonic set ID
   * @param {Object} updates - Properties to update
   */
  updateHarmonicSet(id, updates) {
    const setIndex = this.state.harmonics.harmonicSets.findIndex(set => set.id === id)
    if (setIndex !== -1) {
      Object.assign(this.state.harmonics.harmonicSets[setIndex], updates)
      
      // Visual updates removed - no display element
      if (this.instance.harmonicPanel) {
        updateHarmonicPanelContent(this.instance.harmonicPanel, this.instance)
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
      this.state.harmonics.harmonicSets.splice(setIndex, 1)
      
      
      // Visual updates removed - no display element
      if (this.instance.harmonicPanel) {
        updateHarmonicPanelContent(this.instance.harmonicPanel, this.instance)
      }
      notifyStateListeners(this.state, this.instance.stateListeners)
    }
  }

  /**
   * Find harmonic set containing given frequency coordinate
   * @param {number} freq - Frequency in Hz to check
   * @returns {Object|null} The harmonic set if found, null otherwise
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
          // Use a more generous tolerance with a reasonable minimum
          // 10% of spacing OR at least 20Hz, whichever is larger
          const tolerance = Math.max(harmonicSet.spacing * 0.1, 20)
          
          if (Math.abs(freq - expectedFreq) < tolerance) {
            // Also check if cursor is within the vertical range of the harmonic line
            // Harmonic lines have 20% of SVG height, centered on anchor time
            const { naturalHeight } = this.state.imageDetails
            const lineHeight = naturalHeight * 0.2
            const timeRange = this.state.config.timeMax - this.state.config.timeMin
            const lineHeightInTime = (lineHeight / naturalHeight) * timeRange
            
            const lineStartTime = harmonicSet.anchorTime - lineHeightInTime / 2
            const lineEndTime = harmonicSet.anchorTime + lineHeightInTime / 2
            
            // Add some extra tolerance to time range (±10% of line height)
            const timeToleranceExtra = lineHeightInTime * 0.1
            
            if (cursorTime >= (lineStartTime - timeToleranceExtra) && 
                cursorTime <= (lineEndTime + timeToleranceExtra)) {
              return harmonicSet
            }
          }
        }
      }
    }
    return null
  }

  /**
   * Handle harmonic set dragging
   */
  handleHarmonicSetDrag() {
    if (!this.state.cursorPosition || !this.state.dragState.dragStartPosition) return

    const currentPos = this.state.cursorPosition
    const startPos = this.state.dragState.dragStartPosition
    const setId = this.state.dragState.draggedHarmonicSetId

    if (!setId) return

    const harmonicSet = this.state.harmonics.harmonicSets.find(set => set.id === setId)
    if (!harmonicSet) return

    // Calculate changes from drag start
    const deltaFreq = currentPos.freq - startPos.freq
    const deltaTime = currentPos.time - startPos.time

    // Update spacing based on horizontal drag
    // The dragged harmonic should stay under cursor
    const clickedHarmonicNumber = this.state.dragState.clickedHarmonicNumber || 1
    const newSpacing = (this.state.dragState.originalSpacing + deltaFreq / clickedHarmonicNumber)
    
    // Update anchor time based on vertical drag  
    const newAnchorTime = this.state.dragState.originalAnchorTime + deltaTime

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
    // Create modal overlay
    const overlay = document.createElement('div')
    overlay.className = 'gram-frame-modal-overlay'
    
    // Create modal dialog
    const modal = document.createElement('div')
    modal.className = 'gram-frame-modal'
    
    // Create modal content
    modal.innerHTML = `
      <div class="gram-frame-modal-header">
        <h3>Add Manual Harmonics</h3>
      </div>
      <div class="gram-frame-modal-body">
        <label for="harmonic-spacing-input">Harmonic spacing (Hz):</label>
        <input type="number" id="harmonic-spacing-input" min="1.0" step="0.1" placeholder="Enter spacing in Hz">
        <div class="gram-frame-modal-error" id="spacing-error" style="display: none; color: red; font-size: 12px; margin-top: 5px;">
          Please enter a number ≥ 1.0
        </div>
      </div>
      <div class="gram-frame-modal-footer">
        <button class="gram-frame-modal-cancel" id="cancel-button">Cancel</button>
        <button class="gram-frame-modal-add" id="add-button" disabled>Add</button>
      </div>
    `
    
    overlay.appendChild(modal)
    document.body.appendChild(overlay)
    
    // Get modal elements
    const spacingInput = /** @type {HTMLInputElement} */ (modal.querySelector('#harmonic-spacing-input'))
    const errorDiv = /** @type {HTMLDivElement} */ (modal.querySelector('#spacing-error'))
    const cancelButton = /** @type {HTMLButtonElement} */ (modal.querySelector('#cancel-button'))
    const addButton = /** @type {HTMLButtonElement} */ (modal.querySelector('#add-button'))
    
    // Input validation
    const validateInput = () => {
      const value = parseFloat(spacingInput.value)
      const isValid = !isNaN(value) && value >= 1.0
      
      if (spacingInput.value.trim() === '') {
        // Empty input - hide error, disable button
        errorDiv.style.display = 'none'
        addButton.disabled = true
      } else if (!isValid) {
        // Invalid input - show error, disable button
        errorDiv.style.display = 'block'
        addButton.disabled = true
      } else {
        // Valid input - hide error, enable button
        errorDiv.style.display = 'none'
        addButton.disabled = false
      }
    }
    
    // Add input event listeners
    spacingInput.addEventListener('input', validateInput)
    spacingInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !addButton.disabled) {
        addHarmonic()
      } else if (e.key === 'Escape') {
        closeModal()
      }
    })
    
    // Close modal function
    const closeModal = () => {
      document.body.removeChild(overlay)
    }
    
    // Add harmonic function
    const addHarmonic = () => {
      const spacing = parseFloat(spacingInput.value)
      if (!isNaN(spacing) && spacing >= 1.0) {
        // Determine anchor time: use cursor position if available, otherwise midpoint
        let anchorTime
        if (this.state.cursorPosition) {
          anchorTime = this.state.cursorPosition.time
        } else {
          // Use midpoint of time range
          anchorTime = (this.state.config.timeMin + this.state.config.timeMax) / 2
        }
        
        // Add the harmonic set
        this.addHarmonicSet(anchorTime, spacing)
        
        // Close modal
        closeModal()
      }
    }
    
    // Event listeners
    cancelButton.addEventListener('click', closeModal)
    addButton.addEventListener('click', addHarmonic)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal()
      }
    })
    
    // Focus the input
    spacingInput.focus()
  }


  /**
   * Get initial state for harmonics mode
   * @returns {Object} Harmonics-specific initial state
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