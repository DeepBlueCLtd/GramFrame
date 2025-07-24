import { BaseMode } from '../BaseMode.js'
import { createSVGLine, createSVGText } from '../../utils/svg.js'
import { drawAnalysisMode } from '../../rendering/cursors.js'
import { updateHarmonicPanelContent, createHarmonicPanel, toggleHarmonicPanelVisibility } from '../../components/HarmonicPanel.js'
import { notifyStateListeners } from '../../core/state.js'
import { updateCursorIndicators } from '../../rendering/cursors.js'
import { createManualHarmonicModal, createLEDDisplay, createManualHarmonicButton } from '../../components/UIComponents.js'

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
   * Handle mouse click events - create harmonic sets
   * @param {MouseEvent} event - The mouse click event
   * @param {Object} coords - Coordinate information
   */
  handleClick(event, coords) {
    // Harmonics are now created via click-and-drag in handleMouseDown
    // This function is kept for backward compatibility but no longer creates harmonics
    // The creation logic has been moved to the mousedown handler for live drag creation
  }

  /**
   * Handle mouse down events for harmonic set dragging
   * @param {MouseEvent} event - The mouse down event
   * @param {Object} coords - Coordinate information
   */
  handleMouseDown(event, coords) {
    if (!this.state.cursorPosition) return

    const cursorFreq = this.state.cursorPosition.freq
    
    // Check if we're clicking on an existing harmonic set
    const existingSet = this.findHarmonicSetAtFrequency(cursorFreq)
    
    if (existingSet) {
      // Start dragging existing harmonic set
      this.state.dragState.isDragging = true
      this.state.dragState.dragStartPosition = { ...this.state.cursorPosition }
      this.state.dragState.draggedHarmonicSetId = existingSet.id
      this.state.dragState.originalSpacing = existingSet.spacing
      this.state.dragState.originalAnchorTime = existingSet.anchorTime
      
      // Find which harmonic number was clicked
      const harmonicNumber = Math.round(cursorFreq / existingSet.spacing)
      this.state.dragState.clickedHarmonicNumber = harmonicNumber
    } else {
      // Start creating a new harmonic set with click-and-drag
      this.state.dragState.isDragging = true
      this.state.dragState.dragStartPosition = { ...this.state.cursorPosition }
      this.state.dragState.isCreatingNewHarmonicSet = true
      
      // Create initial harmonic set at click position
      const cursorFreq = this.state.cursorPosition.freq
      const cursorTime = this.state.cursorPosition.time
      const freqOrigin = this.state.config.freqMin
      const initialHarmonicNumber = freqOrigin > 0 ? 10 : 5
      const initialSpacing = cursorFreq / initialHarmonicNumber
      
      // Create the harmonic set and store its ID for live updating
      const harmonicSet = this.addHarmonicSet(cursorTime, initialSpacing)
      this.state.dragState.draggedHarmonicSetId = harmonicSet.id
      this.state.dragState.originalSpacing = initialSpacing
      this.state.dragState.originalAnchorTime = cursorTime
      this.state.dragState.clickedHarmonicNumber = initialHarmonicNumber
      
      // Update displays immediately for the new harmonic set
      updateCursorIndicators(this.instance)
      this.updateHarmonicPanel()
    }
  }

  /**
   * Handle mouse move events during dragging
   * @param {MouseEvent} event - The mouse move event
   * @param {Object} coords - Coordinate information
   */
  handleMouseMove(event, coords) {
    if (this.state.dragState.isDragging) {
      this.handleHarmonicSetDrag()
    }
  }

  /**
   * Handle mouse up events - end dragging
   * @param {MouseEvent} event - The mouse up event
   * @param {Object} coords - Coordinate information
   */
  handleMouseUp(event, coords) {
    if (this.state.dragState.isDragging) {
      const wasDraggingHarmonicSet = !!this.state.dragState.draggedHarmonicSetId
      
      // Clear drag state
      this.state.dragState.isDragging = false
      this.state.dragState.dragStartPosition = null
      this.state.dragState.draggedHarmonicSetId = null
      this.state.dragState.originalSpacing = null
      this.state.dragState.originalAnchorTime = null
      this.state.dragState.clickedHarmonicNumber = null
      this.state.dragState.isCreatingNewHarmonicSet = false
      
      // Clear old harmonics system state (for backward compatibility)
      this.state.harmonics.baseFrequency = null
      this.state.harmonics.harmonicData = []
      
      // Update displays and indicators
      this.instance.updateLEDDisplays(this.instance, this.state)
      updateCursorIndicators(this.instance)
      
      // Update harmonic panel
      this.updateHarmonicPanel()
      
      // Notify listeners of state change
      notifyStateListeners(this.state, this.instance.stateListeners)
    }
  }

  /**
   * Render harmonics mode - draw crosshairs and harmonic sets
   * @param {SVGElement} svg - The SVG container element
   */
  render(svg) {
    // Draw cross-hairs if cursor position is available, but not when dragging harmonics
    // (dragging harmonics would obscure the harmonic sets with the cross-hairs)
    if (this.state.cursorPosition && !this.state.dragState.isDragging) {
      drawAnalysisMode(this.instance)
    }
    
    // Draw persistent harmonic sets (always visible)
    this.state.harmonics.harmonicSets.forEach(harmonicSet => {
      this.drawHarmonicSetLines(harmonicSet)
    })
  }

  /**
   * Create UI elements for harmonics mode
   * @param {HTMLElement} readoutPanel - Container for UI elements
   */
  createUI(readoutPanel) {
    this.uiElements = {}
    
    // Create Manual Harmonic button (first in order)
    this.uiElements.manualButton = createManualHarmonicButton()
    readoutPanel.appendChild(this.uiElements.manualButton)
    
    // Create Frequency LED display
    this.uiElements.freqLED = createLEDDisplay('Frequency (Hz)', '0.00')
    readoutPanel.appendChild(this.uiElements.freqLED)
    
    // Create harmonic management panel
    this.uiElements.harmonicPanel = createHarmonicPanel(readoutPanel, this.instance)
    
    // Show the harmonic panel for harmonics mode
    toggleHarmonicPanelVisibility(this.uiElements.harmonicPanel, 'harmonics')
    
    // Store references on instance for compatibility
    this.instance.freqLED = this.uiElements.freqLED
    this.instance.manualButton = this.uiElements.manualButton
    this.instance.harmonicPanel = this.uiElements.harmonicPanel
    
    // Setup manual harmonic button event listener
    this.uiElements.manualButton.addEventListener('click', () => {
      this.showManualHarmonicModal()
    })
  }

  /**
   * Update LED displays for harmonics mode
   * @param {Object} coords - Current cursor coordinates
   */
  updateLEDs(coords) {
    // Harmonics mode shows Manual button and Frequency LED (created in createUI)
    this.updateModeSpecificLEDs()
  }

  /**
   * Update mode-specific LED values and labels based on current state
   */
  updateModeSpecificLEDs() {
    if (!this.uiElements.freqLED) return

    // Update frequency label based on state
    const freqLabel = this.uiElements.freqLED.querySelector('.gram-frame-led-label')
    if (this.state.dragState.isDragging && this.state.harmonics.baseFrequency !== null) {
      freqLabel.textContent = 'Base Freq (Hz)'
    } else {
      freqLabel.textContent = 'Frequency (Hz)'
    }

    if (!this.state.cursorPosition) {
      // Show default values when no cursor position
      this.uiElements.freqLED.querySelector('.gram-frame-led-value').textContent = '0.00'
      return
    }

    // Mode-specific LED formatting
    if (this.state.dragState.isDragging && this.state.harmonics.baseFrequency !== null) {
      // For Harmonics mode during drag, show base frequency for harmonics
      const baseFreqValue = this.state.harmonics.baseFrequency.toFixed(1)
      this.uiElements.freqLED.querySelector('.gram-frame-led-value').textContent = baseFreqValue
    } else {
      // Standard frequency display
      const freqValue = this.state.cursorPosition.freq.toFixed(1)
      this.uiElements.freqLED.querySelector('.gram-frame-led-value').textContent = freqValue
    }
  }

  /**
   * Reset harmonics-specific state
   */
  resetState() {
    this.state.harmonics.baseFrequency = null
    this.state.harmonics.harmonicData = []
    this.state.harmonics.harmonicSets = []
  }

  /**
   * Clean up harmonics-specific state when switching away from harmonics mode
   */
  cleanup() {
    this.state.harmonics.baseFrequency = null
    this.state.harmonics.harmonicData = []
    this.state.harmonics.harmonicSets = []
  }

  /**
   * Add a new harmonic set
   * @param {number} anchorTime - Time position in seconds
   * @param {number} spacing - Frequency spacing in Hz
   * @returns {Object} The created harmonic set
   */
  addHarmonicSet(anchorTime, spacing) {
    const id = `harmonic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const colorIndex = this.state.harmonics.harmonicSets.length % HarmonicsMode.harmonicColors.length
    const color = HarmonicsMode.harmonicColors[colorIndex]
    
    const harmonicSet = {
      id,
      color,
      anchorTime,
      spacing
    }
    
    this.state.harmonics.harmonicSets.push(harmonicSet)
    
    // Update display and notify listeners
    updateCursorIndicators(this.instance)
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
      
      // Update display and notify listeners
      updateCursorIndicators(this.instance)
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
      
      // Update display and notify listeners
      updateCursorIndicators(this.instance)
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
          const tolerance = harmonicSet.spacing * 0.02 // 2% tolerance
          
          if (Math.abs(freq - expectedFreq) < tolerance) {
            return harmonicSet
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
   * Show manual harmonic spacing modal dialog
   */
  showManualHarmonicModal() {
    createManualHarmonicModal(
      (spacing) => {
        // Get time anchor: current cursor Y position if available, otherwise midpoint
        let anchorTime
        if (this.state.cursorPosition && this.state.cursorPosition.time !== null) {
          anchorTime = this.state.cursorPosition.time
        } else {
          // Use midpoint of image time range
          anchorTime = (this.state.config.timeMin + this.state.config.timeMax) / 2
        }
        
        // Create the harmonic set
        this.addHarmonicSet(anchorTime, spacing)
      },
      () => {
        // Cancel callback - no action needed
      }
    )
  }

  /**
   * Get initial state for harmonics mode
   * @returns {Object} Harmonics-specific initial state
   */
  getInitialState() {
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

  /**
   * Draw harmonic set lines
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
      mainLine.setAttribute('stroke-width', '2')
      this.instance.cursorGroup.appendChild(mainLine)
      
      // Add harmonic number label at the top of the line
      const label = createSVGText(
        svgX + 3, // Slight offset to the right of the line
        lineStartY - 3, // Slightly above the line
        String(harmonic),
        'gram-frame-harmonic-label',
        'start'
      )
      label.setAttribute('fill', harmonicSet.color)
      label.setAttribute('font-size', '12')
      label.setAttribute('font-weight', 'bold')
      this.instance.cursorGroup.appendChild(label)
    }
  }
}