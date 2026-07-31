import { BaseMode } from '../BaseMode.js'
// SVG utilities removed - no display element
import { updateHarmonicPanelContent, createHarmonicPanel } from '../../components/HarmonicPanel.js'
import { showManualHarmonicModal } from './ManualHarmonicModal.js'
import { notifyStateListeners } from '../../core/state.js'
import { dataToSVG, getImageBounds } from '../../utils/coordinates.js'
import { BaseDragHandler } from '../shared/BaseDragHandler.js'
import { getUniformTolerance } from '../../utils/tolerance.js'
import { sampledHarmonics } from '../../utils/harmonicSampling.js'
import { createSymbolMark, resolveSymbolScale } from '../../rendering/symbols.js'
import { applyTextHalo } from '../../utils/svg.js'
import { calculateVisibleDataRange, getRenderDimensions } from '../../components/table.js'

/**
 * Harmonics mode implementation
 * Handles harmonic set creation, dragging, and rendering
 */
export class HarmonicsMode extends BaseMode {
  /**
   * Initialize HarmonicsMode with drag handler
   * @param {Object} instance - GramFrame instance
   */
  constructor(instance) {
    super(instance)
    
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
    
    // Auto-select the harmonic set being dragged (consistent with analysis markers)
    const index = this.instance.state.harmonics.harmonicSets.findIndex(set => set.id === harmonicSet.id)
    if (index !== -1) {
      this.instance.setSelection('harmonicSet', harmonicSet.id, index)
    }
    
    // Update legacy drag state for backward compatibility
    this.instance.state.dragState.isDragging = true
    this.instance.state.dragState.dragStartPosition = { ...position }
    this.instance.state.dragState.draggedHarmonicSetId = harmonicSet.id
    this.instance.state.dragState.originalSpacing = harmonicSet.spacing
    this.instance.state.dragState.originalAnchorTime = harmonicSet.anchorTime
    this.instance.state.dragState.clickedHarmonicNumber = clickedHarmonicNumber
  }

  /**
   * Update harmonic set during drag
   * @param {Object} _target - Drag target with id and type (unused)
   * @param {DataCoordinates} currentPos - Current position
   * @param {DataCoordinates} _startPos - Start position (unused)
   */
  onHarmonicSetDragUpdate(_target, currentPos, _startPos) {
    // Update cursor position for legacy compatibility
    this.instance.state.cursorPosition = {
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
    this.instance.state.dragState.isDragging = false
    this.instance.state.dragState.dragStartPosition = null
    this.instance.state.dragState.draggedHarmonicSetId = null
    this.instance.state.dragState.originalSpacing = null
    this.instance.state.dragState.originalAnchorTime = null
    this.instance.state.dragState.clickedHarmonicNumber = null
  }

  /**
   * Update cursor style for drag operations
   * @param {string} style - Cursor style ('crosshair', 'grab', 'grabbing')
   */
  updateCursorStyle(style) {
    if (this.instance.svg) {
      this.instance.svg.style.cursor = style
    }
  }

  /**
   * Color palette for harmonic sets
   * @type {string[]}
   */
  static harmonicColors = ['#ff6b6b', '#2ecc71', '#f39c12', '#9b59b6', '#ffc93c', '#ff9ff3', '#45b7d1', '#e67e22']

  /**
   * Base pixel size (width/height) of a pin's symbol mark. The effective size is
   * this scaled by the "Large symbols" experiment toggle — use
   * {@link HarmonicsMode#symbolSize} rather than reading this directly.
   * @type {number}
   */
  static SYMBOL_SIZE = 10

  /**
   * Height of a pin line, as a fraction of the *base* (unzoomed) render height.
   *
   * The resulting height is a fixed pixel length, not a span of time: it is
   * derived from the viewport's base render size (which tracks expand, not zoom)
   * rather than from the zoomed image element. Pins therefore keep the same
   * on-screen height at every zoom level, growing/shrinking only when the
   * component itself is resized.
   * @type {number}
   */
  static PIN_HEIGHT_RATIO = 0.2

  /**
   * Font size (px) of a pin's number label; also used as its approximate ascent
   * when clamping the label/symbol stack to the image's top edge.
   * @type {number}
   */
  static LABEL_FONT_SIZE = 12

  /**
   * Approximate width of one label digit as a fraction of the label font size,
   * used to size the label's grab region (bold Arial digits are ~0.6 em wide).
   * @type {number}
   */
  static LABEL_CHAR_WIDTH_RATIO = 0.6

  /**
   * Vertical gap (px) between the pin's number label and its symbol.
   * @type {number}
   */
  static LABEL_GAP = 3

  /**
   * Minimum padding (px) kept between the top of a pin's label and the top edge
   * of the spectrogram image.
   * @type {number}
   */
  static STACK_TOP_PAD = 1

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
   * Handle mouse move events in harmonics mode
   * @param {MouseEvent} _event - Mouse event
   * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
   */
  handleMouseMove(_event, dataCoords) {
    // Handle existing harmonic set dragging through drag handler
    if (this.dragHandler.isDragging()) {
      this.dragHandler.handleMouseMove(dataCoords)
    } else if (this.instance.state.dragState.isCreatingNewHarmonicSet) {
      // Handle new creation drag (not managed by BaseDragHandler)
      // Update cursor position for legacy compatibility
      this.instance.state.cursorPosition = {
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
    if (this.instance.state.harmonics.harmonicSets.length > 0) {
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
    if (this.instance.state.dragState.isCreatingNewHarmonicSet) {
      this.completeNewHarmonicSetCreation(dataCoords)
      // Reset cursor after creation
      if (this.instance.svg) {
        this.instance.svg.style.cursor = 'crosshair'
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
    this.instance.state.harmonics.baseFrequency = null
    this.instance.state.harmonics.harmonicData = []
    // Note: harmonicSets are only cleared by explicit user action, not by resetState
  }

  /**
   * Clean up harmonics-specific state when switching away from harmonics mode
   */
  cleanup() {
    // Only clear transient state, preserve harmonic sets for cross-mode persistence
    this.instance.state.harmonics.baseFrequency = null
    this.instance.state.harmonics.harmonicData = []
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
    if (this.instance.state.selectedColor) {
      color = this.instance.state.selectedColor
    } else {
      const colorIndex = this.instance.state.harmonics.harmonicSets.length % HarmonicsMode.harmonicColors.length
      color = HarmonicsMode.harmonicColors[colorIndex]
    }
    
    // Use selected symbol from global state, defaulting to the symbol-less cross
    const symbol = this.instance.state.selectedSymbol || 'cross'

    // Use the session's pin-visibility preference (on unless the analyst turned
    // it off via the Symbol panel toggle)
    const showPin = this.instance.state.showHarmonicPin !== false

    /** @type {HarmonicSet} */
    const harmonicSet = {
      id,
      color,
      anchorTime,
      spacing,
      symbol,
      showPin,
      // EXPERIMENT (temporary): symbol size is carried per set, seeded from the
      // toggle's next-feature default, so sets at both sizes can coexist.
      largeSymbols: !!this.instance.state.largeSymbols
    }
    
    this.instance.state.harmonics.harmonicSets.push(harmonicSet)
    
    // Auto-select the newly created harmonic set
    const index = this.instance.state.harmonics.harmonicSets.length - 1
    this.instance.setSelection('harmonicSet', harmonicSet.id, index)
    
    // Update visual elements
    if (this.instance.harmonicPanel) {
      updateHarmonicPanelContent(this.instance.harmonicPanel, this.instance)
    }
    
    // Trigger re-render of persistent features to show the new harmonic set
    if (this.instance.featureRenderer) {
      this.instance.featureRenderer.renderAllPersistentFeatures()
    }
    
    notifyStateListeners(this.instance.state, this.instance.stateListeners)
    
    return harmonicSet
  }

  /**
   * Update an existing harmonic set
   * @param {string} id - Harmonic set ID
   * @param {Partial<HarmonicSet>} updates - Properties to update
   */
  updateHarmonicSet(id, updates) {
    const setIndex = this.instance.state.harmonics.harmonicSets.findIndex(set => set.id === id)
    if (setIndex !== -1) {
      Object.assign(this.instance.state.harmonics.harmonicSets[setIndex], updates)
      
      // Update visual elements
      if (this.instance.harmonicPanel) {
        updateHarmonicPanelContent(this.instance.harmonicPanel, this.instance)
      }
      
      // Trigger re-render of persistent features to show updated harmonic set
      if (this.instance.featureRenderer) {
        this.instance.featureRenderer.renderAllPersistentFeatures()
      }
      
      notifyStateListeners(this.instance.state, this.instance.stateListeners)
    }
  }

  /**
   * Remove a harmonic set
   * @param {string} id - Harmonic set ID
   */
  removeHarmonicSet(id) {
    const setIndex = this.instance.state.harmonics.harmonicSets.findIndex(set => set.id === id)
    if (setIndex !== -1) {
      // Clear selection if removing the selected harmonic set
      if (this.instance.state.selection.selectedType === 'harmonicSet' && 
          this.instance.state.selection.selectedId === id) {
        this.instance.clearSelection()
      }
      
      this.instance.state.harmonics.harmonicSets.splice(setIndex, 1)
      
      // Update visual elements
      if (this.instance.harmonicPanel) {
        updateHarmonicPanelContent(this.instance.harmonicPanel, this.instance)
      }
      
      // Trigger re-render of persistent features to remove the harmonic set
      if (this.instance.featureRenderer) {
        this.instance.featureRenderer.renderAllPersistentFeatures()
      }
      
      notifyStateListeners(this.instance.state, this.instance.stateListeners)
    }
  }

  /**
   * Find harmonic set containing given frequency coordinate.
   *
   * Hit-testing follows exactly what is drawn — nothing more, nothing less.
   * Every visible part of a pin grabs it: the pin line's fixed-pixel span AND
   * the number label + symbol stacked above it. A set with its pin hidden is
   * grabbable by its label/symbol stack alone; the span where its line would
   * have been is empty on screen, so it is empty to the mouse too.
   *
   * @param {number} freq - Frequency in Hz to check
   * @returns {HarmonicSet|null} The harmonic set if found, null otherwise
   */
  findHarmonicSetAtFrequency(freq) {
    if (!this.instance.state.cursorPosition) return null

    const cursorTime = this.instance.state.cursorPosition.time

    for (const harmonicSet of this.instance.state.harmonics.harmonicSets) {
      // Check if frequency is close to any harmonic line in this set
      if (harmonicSet.spacing > 0) {
        // Only consider harmonics within the visible frequency range
        const freqMin = this.instance.state.config.freqMin
        const freqMax = this.instance.state.config.freqMax

        const minHarmonic = Math.max(1, Math.ceil(freqMin / harmonicSet.spacing))
        const maxHarmonic = Math.floor(freqMax / harmonicSet.spacing)

        // Pins are a fixed pixel height, so hit-test vertically in SVG pixels
        // against the same geometry the renderer draws.
        const { lineHeight, lineTop } = this.calculateHarmonicLineDimensions(harmonicSet)
        const stack = this.calculateLabelStackBounds(lineTop, harmonicSet)
        // Only the thinned subset is labelled, so only those pins carry a stack.
        const labelled = new Set(this.getLabelledHarmonics(minHarmonic, maxHarmonic))
        // A hidden pin draws no lines, so its line span is not a grab region.
        const pinDrawn = harmonicSet.showPin !== false

        const tolerance = getUniformTolerance(this.getViewport(), this.instance.spectrogramImage)
        const cursorSVG = dataToSVG(
          { freq, time: cursorTime },
          this.getViewport(),
          this.instance.spectrogramImage
        )

        for (let h = minHarmonic; h <= maxHarmonic; h++) {
          const expectedFreq = h * harmonicSet.spacing

          // The pin line: frequency tolerance horizontally, the line span vertically.
          if (pinDrawn && Math.abs(freq - expectedFreq) < tolerance.freq &&
              cursorSVG.y >= lineTop && cursorSVG.y <= lineTop + lineHeight) {
            return harmonicSet
          }

          // The label/symbol stack above the line: measured in SVG pixels, since
          // the digits and symbol are a fixed pixel size regardless of zoom.
          if (labelled.has(h) &&
              cursorSVG.y >= stack.top && cursorSVG.y <= stack.bottom &&
              Math.abs(cursorSVG.x - this.harmonicLineX(harmonicSet, h)) <= this.labelStackHalfWidth(harmonicSet, h)) {
            return harmonicSet
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
    const freqMin = this.instance.state.config.freqMin
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
    this.instance.state.dragState.isCreatingNewHarmonicSet = true
    this.instance.state.dragState.dragStartPosition = { ...dataCoords }
    this.instance.state.dragState.draggedHarmonicSetId = harmonicSet.id
    this.instance.state.dragState.originalSpacing = initialSpacing
    this.instance.state.dragState.originalAnchorTime = dataCoords.time
    this.instance.state.dragState.clickedHarmonicNumber = clickedHarmonicNumber
    
    // Change cursor to indicate drag interaction
    if (this.instance.svg) {
      this.instance.svg.style.cursor = 'grabbing'
    }
  }

  /**
   * Complete the drag update of the newly created harmonic set
   * @param {DataCoordinates} _dataCoords - Final drag position coordinates (unused)
   */
  completeNewHarmonicSetCreation(_dataCoords) {
    // Just clear the creation state - harmonic set was already created and updated during drag
    this.instance.state.dragState.isCreatingNewHarmonicSet = false
    this.instance.state.dragState.dragStartPosition = null
    this.instance.state.dragState.draggedHarmonicSetId = null
    this.instance.state.dragState.originalSpacing = null
    this.instance.state.dragState.originalAnchorTime = null
    this.instance.state.dragState.clickedHarmonicNumber = null
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
    if (!this.instance.state.cursorPosition || !this.instance.state.dragState.dragStartPosition) return

    const currentPos = this.instance.state.cursorPosition
    const startPos = this.instance.state.dragState.dragStartPosition
    const setId = this.instance.state.dragState.draggedHarmonicSetId

    if (!setId) return

    const harmonicSet = this.instance.state.harmonics.harmonicSets.find(set => set.id === setId)
    if (!harmonicSet) return

    let newSpacing, newAnchorTime

    // For both new creation and existing drags, keep the clicked harmonic under the cursor
    const clickedHarmonicNumber = this.instance.state.dragState.clickedHarmonicNumber || 1
    
    // Calculate spacing so the clicked harmonic stays at cursor position
    newSpacing = currentPos.freq / clickedHarmonicNumber
    
    // Ensure minimum spacing
    newSpacing = Math.max(newSpacing, 0.1)
    
    // Allow vertical movement for both new creation and existing drags
    const deltaTime = currentPos.time - startPos.time
    newAnchorTime = this.instance.state.dragState.originalAnchorTime + deltaTime

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
    showManualHarmonicModal(this.instance.state, this.addHarmonicSet.bind(this), this.instance)
  }

  /**
   * Render persistent features for harmonics mode
   */
  renderPersistentFeatures() {
    if (!this.instance.cursorGroup || !this.instance.state.harmonics?.harmonicSets) {
      return
    }
    
    // Clear existing harmonic lines and their symbol marks. Scope the symbol
    // cleanup to harmonic pin symbols (which carry data-harmonic-set-id) so it
    // never removes analysis-marker symbols that share the base symbol class.
    const existingHarmonics = this.instance.cursorGroup.querySelectorAll('.gram-frame-harmonic-line')
    existingHarmonics.forEach(line => line.remove())
    const existingSymbols = this.instance.cursorGroup.querySelectorAll('.gram-frame-harmonic-symbol[data-harmonic-set-id]')
    existingSymbols.forEach(symbol => symbol.remove())
    
    // Render all harmonic sets
    this.instance.state.harmonics.harmonicSets.forEach(harmonicSet => {
      this.renderHarmonicSet(harmonicSet)
    })
  }

  /**
   * Get the inclusive harmonic-number range of a set that falls within the
   * currently visible frequency span.
   *
   * The visible range comes from `calculateVisibleDataRange(instance)` (the same
   * source the frequency axis uses), so it is viewport-aware: zooming in narrows
   * the span (fewer harmonics), zooming out / panning widens it. At zoom 1.0 the
   * visible range equals the full data range.
   *
   * Every harmonic in this range is drawn as a pin line (spec 159, FR-001); the
   * label/symbol subset is a regularly-sampled slice of it (see
   * {@link getLabelledHarmonics}).
   *
   * @param {HarmonicSet} harmonicSet - Harmonic set configuration
   * @returns {{minHarmonic: number, maxHarmonic: number}} Inclusive harmonic range
   */
  getVisibleHarmonicRange(harmonicSet) {
    const { freqMin, freqMax } = calculateVisibleDataRange(this.instance)
    const minHarmonic = Math.max(1, Math.ceil(freqMin / harmonicSet.spacing))
    const maxHarmonic = Math.floor(freqMax / harmonicSet.spacing)
    return { minHarmonic, maxHarmonic }
  }

  /**
   * Get the "major" subset of harmonic numbers that receive a number label and
   * symbol, thinned to at most the label limit (default 25) by regular sampling.
   *
   * Reuses the spec-158 sampling maths, but that limit now governs
   * labels/symbols only — every pin line is still drawn (spec 159). When the
   * visible range already fits under the limit the subset is the whole range, so
   * every drawn pin is labelled (FR-005).
   *
   * @param {number} minHarmonic - Lowest visible harmonic number (>= 1)
   * @param {number} maxHarmonic - Highest visible harmonic number
   * @returns {number[]} Ascending harmonic numbers to label/symbol (length <= cap)
   */
  getLabelledHarmonics(minHarmonic, maxHarmonic) {
    return sampledHarmonics(minHarmonic, maxHarmonic).harmonics
  }

  /**
   * Calculate harmonic line dimensions and positions.
   *
   * The height is a fixed pixel length taken from the *base* (unzoomed) render
   * height, so a pin covers the same number of screen pixels no matter how far
   * the user has zoomed in — it is not a span of time that stretches with the
   * image. Only the centre is zoom-aware: the pin stays centred on the set's
   * anchor time (the original click location), so it tracks the feature while
   * keeping a constant height.
   *
   * @param {HarmonicSet} harmonicSet - Harmonic set configuration
   * @returns {{lineHeight: number, lineTop: number}} Fixed pixel height and top Y position
   */
  calculateHarmonicLineDimensions(harmonicSet) {
    const { renderHeight } = getRenderDimensions(this.instance)
    const lineHeight = renderHeight * HarmonicsMode.PIN_HEIGHT_RATIO
    const anchorPoint = { freq: harmonicSet.spacing, time: harmonicSet.anchorTime }
    const anchorSVG = dataToSVG(anchorPoint, this.getViewport(), this.instance.spectrogramImage)
    const lineTop = anchorSVG.y - lineHeight / 2

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
   * Create SVG text label for a harmonic number.
   *
   * Centred horizontally on the pin's line (`text-anchor: middle` at `lineX`) and
   * positioned above the pin's symbol (baseline at `labelY`), so the vertical
   * stack over a pin reads label -> symbol -> line (spec 159, FR-009/FR-010).
   *
   * The digits are drawn black inside a white halo rather than in the set's
   * colour: a single colour is only legible over part of a gram, whereas the
   * halo reads over both dark and light backgrounds. Set identity is still
   * carried by the pin's line and symbol colour.
   *
   * @param {number} harmonicNumber - Harmonic number
   * @param {HarmonicSet} harmonicSet - Harmonic set configuration
   * @param {number} lineX - X position of the pin line (label is centred on it)
   * @param {number} labelY - Baseline Y position for the label text
   * @returns {SVGTextElement} SVG text element
   */
  createHarmonicLabel(harmonicNumber, harmonicSet, lineX, labelY) {
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    label.setAttribute('class', 'gram-frame-harmonic-number')
    label.setAttribute('data-harmonic-set-id', harmonicSet.id)
    label.setAttribute('data-harmonic-number', String(harmonicNumber))
    label.setAttribute('x', String(lineX)) // centred on the pin line
    label.setAttribute('y', String(labelY)) // above the symbol
    label.setAttribute('text-anchor', 'middle')
    applyTextHalo(/** @type {SVGTextElement} */ (label))
    label.setAttribute('font-size', String(HarmonicsMode.LABEL_FONT_SIZE))
    label.setAttribute('font-weight', 'bold')
    label.setAttribute('font-family', 'Arial, sans-serif')
    label.textContent = String(harmonicNumber)
    return label
  }

  /**
   * Effective pixel size of a set's symbol marks: the base size scaled by that
   * set's own "Large symbols" flag, so sets at both sizes can share a gram. The
   * whole label/symbol stack layout derives from this, so the label spacing and
   * top-edge clamping follow the set's chosen size.
   * @param {HarmonicSet} harmonicSet - Harmonic set configuration
   * @returns {number} Symbol diameter in px
   */
  symbolSize(harmonicSet) {
    return HarmonicsMode.SYMBOL_SIZE * resolveSymbolScale(harmonicSet)
  }

  /**
   * Create the filled symbol mark drawn between a pin's number label and the top
   * of its line.
   *
   * The vertical position (`symbolCy`) is computed once per set by
   * {@link calculateLabelStackPositions} so the whole label/symbol stack shares a
   * consistent, on-screen layout.
   *
   * @param {HarmonicSet} harmonicSet - Harmonic set configuration
   * @param {number} lineX - X position of the pin line (symbol is centred on it)
   * @param {number} symbolCy - Centre Y position for the symbol
   * @returns {SVGElement|null} SVG symbol element, or null for the `cross` (symbol-less) style
   */
  createHarmonicSymbol(harmonicSet, lineX, symbolCy) {
    const symbol = createSymbolMark(
      harmonicSet.symbol, lineX, symbolCy, this.symbolSize(harmonicSet), harmonicSet.color
    )
    // `cross` sets draw no symbol shape (the pin keeps its line and label).
    if (!symbol) {
      return null
    }
    symbol.setAttribute('data-harmonic-set-id', harmonicSet.id)
    return symbol
  }

  /**
   * Compute the shared vertical layout of a pin's label/symbol stack.
   *
   * Ideal (top-to-bottom): label baseline, then symbol, then the pin line top,
   * so the symbol caps the line and the label sits above the symbol. When the
   * stack's top would clip above the spectrogram's top edge, the whole stack
   * (label + symbol) is nudged down by the overflow so it stays legible
   * (spec 159, FR-011).
   *
   * @param {number} lineTop - Top Y position of the pin lines (SVG coords)
   * @param {number} imageTop - Top edge of the spectrogram image in SVG coords
   * @param {HarmonicSet} harmonicSet - Harmonic set being laid out (its symbol size drives the stack)
   * @returns {{symbolCy: number, labelY: number}} Symbol centre and label baseline Y
   */
  calculateLabelStackPositions(lineTop, imageTop, harmonicSet) {
    const r = this.symbolSize(harmonicSet) / 2
    const gap = HarmonicsMode.LABEL_GAP
    const fontSize = HarmonicsMode.LABEL_FONT_SIZE

    // Symbol caps the line; label baseline sits just above the symbol.
    let symbolCy = lineTop - r
    let labelY = symbolCy - r - gap

    // Keep the top of the label (approx one ascent above its baseline) on-screen.
    const labelTop = labelY - fontSize
    const minTop = imageTop + HarmonicsMode.STACK_TOP_PAD
    if (labelTop < minTop) {
      const shift = minTop - labelTop
      symbolCy += shift
      labelY += shift
    }

    return { symbolCy, labelY }
  }

  /**
   * Vertical extent (SVG coords) of a pin's label/symbol stack, for hit-testing.
   *
   * Derived from the same {@link calculateLabelStackPositions} layout the
   * renderer uses, so the grab region tracks the drawn stack — including the
   * downward nudge applied near the image's top edge. The bottom is clamped to
   * the pin line's top so the stack region and the line region always meet with
   * no dead gap between them.
   *
   * @param {number} lineTop - Top Y position of the pin lines (SVG coords)
   * @param {HarmonicSet} harmonicSet - Harmonic set being hit-tested
   * @returns {{top: number, bottom: number}} Top and bottom Y of the stack region
   */
  calculateLabelStackBounds(lineTop, harmonicSet) {
    const imageTop = getImageBounds(this.getViewport(), this.instance.spectrogramImage).top
    const { symbolCy, labelY } = this.calculateLabelStackPositions(lineTop, imageTop, harmonicSet)
    const r = this.symbolSize(harmonicSet) / 2

    return {
      // One ascent above the label's baseline is the top of the digits.
      top: labelY - HarmonicsMode.LABEL_FONT_SIZE,
      bottom: Math.max(lineTop, symbolCy + r)
    }
  }

  /**
   * Half-width (SVG px) of a pin's label/symbol stack, for hit-testing.
   *
   * The wider of the symbol mark and the number label, so both are grabbable:
   * a `cross` set has no symbol but still shows its digits, and a "Large
   * symbols" set's mark is wider than its digits. Label width is estimated from
   * the digit count rather than measured, which is ample for a grab region.
   *
   * @param {HarmonicSet} harmonicSet - Harmonic set being hit-tested
   * @param {number} harmonicNumber - Harmonic number whose label is drawn
   * @returns {number} Half-width in SVG pixels
   */
  labelStackHalfWidth(harmonicSet, harmonicNumber) {
    const digits = String(harmonicNumber).length
    const labelHalfWidth = digits * HarmonicsMode.LABEL_FONT_SIZE * HarmonicsMode.LABEL_CHAR_WIDTH_RATIO / 2

    return Math.max(this.symbolSize(harmonicSet) / 2, labelHalfWidth)
  }

  /**
   * Compute the SVG x-coordinate of a harmonic's vertical pin line.
   * @param {HarmonicSet} harmonicSet - Harmonic set configuration
   * @param {number} harmonicNumber - Harmonic number
   * @returns {number} SVG x-coordinate of the pin line
   */
  harmonicLineX(harmonicSet, harmonicNumber) {
    const harmonicPoint = { freq: harmonicNumber * harmonicSet.spacing, time: harmonicSet.anchorTime }
    return dataToSVG(harmonicPoint, this.getViewport(), this.instance.spectrogramImage).x
  }

  /**
   * Render a single harmonic set as vertical pin lines.
   *
   * Spec 159: draw a pin line for EVERY harmonic in the visible span (no pins are
   * dropped, even if they merge into a solid block), then draw a number label and
   * symbol only for the thinned "major" subset so the overlay stays readable.
   * Lines are appended first so the labels/symbols paint on top of them.
   *
   * A set with `showPin === false` skips the lines entirely and renders as its
   * symbols and numbers alone — the low-clutter style for stacking many sets over
   * dense data. The label/symbol geometry is unchanged, so toggling the pin adds
   * or removes the lines without moving anything else; the set is then grabbed
   * by its label/symbol stack, since hit-testing only covers what is drawn.
   *
   * @param {HarmonicSet} harmonicSet - Harmonic set to render
   */
  renderHarmonicSet(harmonicSet) {
    if (!this.instance.cursorGroup) {
      return
    }

    const { minHarmonic, maxHarmonic } = this.getVisibleHarmonicRange(harmonicSet)
    if (maxHarmonic < minHarmonic) {
      return
    }

    const { lineHeight, lineTop } = this.calculateHarmonicLineDimensions(harmonicSet)
    const imageTop = getImageBounds(this.getViewport(), this.instance.spectrogramImage).top

    // Draw every pin line in the visible span (FR-001) — unless this set is set
    // to hide its pin. Sets restored from storage without the flag are pinned.
    if (harmonicSet.showPin !== false) {
      for (let harmonicNumber = minHarmonic; harmonicNumber <= maxHarmonic; harmonicNumber++) {
        const lineX = this.harmonicLineX(harmonicSet, harmonicNumber)
        const line = this.createHarmonicLine(harmonicNumber, harmonicSet, lineX, lineTop, lineHeight)
        this.instance.cursorGroup.appendChild(line)
      }
    }

    // Draw labels + symbols only on the thinned major subset (FR-002), stacked
    // above each pin line with a shared, on-screen vertical layout.
    const labelledHarmonics = this.getLabelledHarmonics(minHarmonic, maxHarmonic)
    const { symbolCy, labelY } = this.calculateLabelStackPositions(lineTop, imageTop, harmonicSet)

    labelledHarmonics.forEach(harmonicNumber => {
      const lineX = this.harmonicLineX(harmonicSet, harmonicNumber)
      const symbol = this.createHarmonicSymbol(harmonicSet, lineX, symbolCy)
      const label = this.createHarmonicLabel(harmonicNumber, harmonicSet, lineX, labelY)
      // `cross` sets have no symbol mark; the number label is still drawn.
      if (symbol) {
        this.instance.cursorGroup.appendChild(symbol)
      }
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