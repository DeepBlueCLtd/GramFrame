import { BaseMode } from '../BaseMode.js'
// SVG utilities removed - no display element
import { updateHarmonicPanelContent, createHarmonicPanel } from '../../components/HarmonicPanel.js'
import { showManualHarmonicModal } from './ManualHarmonicModal.js'
import { dispatch, markAnnotationsChanged } from '../../core/state.js'
import { dataToSVG, getImageBounds } from '../../utils/coordinates.js'
import { BaseDragHandler } from '../shared/BaseDragHandler.js'
import { getUniformTolerance } from '../../utils/tolerance.js'
import { sampledHarmonics } from '../../utils/harmonicSampling.js'
import { createSymbolMark, resolveSymbolScale } from '../../rendering/symbols.js'
import { applyTextHalo } from '../../utils/svg.js'
import { calculateVisibleDataRange, getRenderDimensions } from '../../utils/coordinates.js'

/**
 * Harmonics mode implementation
 * Handles harmonic set creation, dragging, and rendering
 */
export class HarmonicsMode extends BaseMode {
  /**
   * Initialize HarmonicsMode with drag handler
   * @param {GramFrame} instance - GramFrame instance
   */
  constructor(instance) {
    super(instance)
    
    // One handler for both harmonic drags: moving an existing set (`move`) and
    // creating one by dragging (`create`). They differ only in how the target
    // is resolved — a create mints its set on mousedown — and share every
    // subsequent step (spec 166, FR-004).
    this.dragHandler = new BaseDragHandler(instance, {
      // A feature drag always carries a data position. Only the pan drag passes
      // null, and it runs on its own handler in `core/events.js`.
      resolveTarget: (position) => this.resolveHarmonicDrag(/** @type {DataCoordinates} */ (position)),
      // Hover only ever *finds* — resolveHarmonicDrag mints a new set when the
      // cursor is over empty gram, which is right for a mousedown and wrong for
      // a hover (a hover that creates features floods the gram with sets).
      resolveHoverTarget: (position) => this.findHarmonicSetTarget(/** @type {DataCoordinates} */ (position)),
      onDragStart: (target, position) => this.onHarmonicSetDragStart(target, /** @type {DataCoordinates} */ (position)),
      onDragMove: (target, currentPos, startPos) => this.onHarmonicSetDragUpdate(target, /** @type {DataCoordinates} */ (currentPos), /** @type {DataCoordinates} */ (startPos)),
      onDragEnd: (target, position) => this.onHarmonicSetDragEnd(target, position),
      onDragCancel: (target) => this.onHarmonicSetDragEnd(target, null),
      updateCursor: (style) => this.updateCursorStyle(style)
    }, 'harmonics')
  }

  /**
   * Find harmonic set target for drag handler
   * @param {DataCoordinates} position - Position to check
   * @returns {DragTarget|null} Drag target if found, null otherwise
   */
  findHarmonicSetTarget(position) {
    const harmonicSet = this.findHarmonicSetAt(position)
    if (harmonicSet) {
      return {
        kind: 'move',
        id: harmonicSet.id,
        type: 'harmonicSet',
        position: position,
        data: {
          harmonicSet: harmonicSet,
          clickedHarmonicNumber: this.findClickedHarmonicNumber(harmonicSet, position.freq),
          originalAnchorTime: harmonicSet.anchorTime
        }
      }
    }
    return null
  }

  /**
   * Resolve what a mousedown in harmonics mode starts.
   *
   * Landing on an existing set moves it; landing anywhere else creates one and
   * drags it out from there. The new set is minted here, on mousedown, so the
   * engine has a target id for the whole gesture (contract: drag-engine.md).
   * @param {DataCoordinates} position - Position of the mousedown
   * @returns {DragTarget|null} A move- or create-kind target
   */
  resolveHarmonicDrag(position) {
    const existing = this.findHarmonicSetTarget(position)
    if (existing) {
      return existing
    }
    return this.createHarmonicSetTarget(position)
  }

  /**
   * Start dragging a harmonic set
   * @param {DragTarget} target - Drag target with id and type
   * @param {DataCoordinates} position - Start position
   */
  onHarmonicSetDragStart(target, position) {
    void position
    const harmonicSet = target.data.harmonicSet

    // Auto-select the harmonic set being dragged (consistent with analysis markers)
    const index = this.instance.state.harmonics.harmonicSets.findIndex(set => set.id === harmonicSet.id)
    if (index !== -1) {
      this.instance.interaction.setSelection('harmonicSet', harmonicSet.id, index)
    }
    // Drag bookkeeping belongs to the engine (state.drag) — nothing to mirror.
  }

  /**
   * Update harmonic set during drag
   * @param {DragTarget} target - Drag target
   * @param {DataCoordinates} currentPos - Current position
   * @param {DataCoordinates} startPos - Start position
   */
  onHarmonicSetDragUpdate(target, currentPos, startPos) {
    // Update cursor position so the readouts follow the drag
    this.instance.state.cursorPosition = {
      freq: currentPos.freq,
      time: currentPos.time,
      x: 0, y: 0, svgX: 0, svgY: 0, imageX: 0, imageY: 0 // Minimal values for compatibility
    }

    this.applyHarmonicSetDrag(target, currentPos, startPos)
  }

  /**
   * End dragging a harmonic set
   * @param {Object} _target - Drag target with id and type (unused)
   * @param {DataCoordinates|null} _position - End position (unused)
   */
  onHarmonicSetDragEnd(_target, _position) {
    // Nothing to unwind: the engine clears the drag record itself.
  }

  /**
   * Update cursor style for drag operations
   * @param {string} style - Cursor style ('crosshair', 'grab', 'grabbing')
   */
  updateCursorStyle(style) {
    if (this.instance.ui.svg) {
      this.instance.ui.svg.style.cursor = style
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
   * Maximum pin lines rendered per harmonic set. At the 0.1 Hz minimum spacing
   * a standard 0–20 kHz config has 200,000 visible harmonics; drawing an SVG
   * line for each — rebuilt on every drag frame — locked the browser (BH-2).
   * Past this cap the drawn lines are a regular sample of the range; well
   * beyond typical screen widths, adjacent pins merge on screen anyway, so the
   * thinning is invisible until the set is already a solid block.
   * @type {number}
   */
  static MAX_PIN_LINES = 1000

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
    // Both the move and create drags run through the one handler
    if (this.dragHandler.isDragging()) {
      this.dragHandler.handleMouseMove(dataCoords)
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
    
    // The resolver decides whether this moves an existing set or creates one
    this.dragHandler.startDrag(dataCoords, event)
  }

  /**
   * Handle mouse up events in harmonics mode
   * @param {MouseEvent} _event - Mouse event
   * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
   */
  handleMouseUp(_event, dataCoords) {
    // One exit for both kinds; the engine restores the cursor
    this.dragHandler.endDrag(dataCoords)
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

      this.instance.ui.harmonicPanel = this.uiElements.harmonicPanel
      return
    }
    
    // Create Manual button and add to existing container
    this.uiElements.manualButton = this.createManualButton()
    if (buttonContainer) {
      buttonContainer.appendChild(this.uiElements.manualButton)
    }
    
    // Create harmonic management panel in the persistent container
    this.uiElements.harmonicPanel = createHarmonicPanel(harmonicsContainer, this.instance)
    
    // Store references on instance for compatibility

    this.instance.ui.harmonicPanel = this.uiElements.harmonicPanel
    
    // Central color picker is managed by unified layout
    this.instance.ui.colorPicker = this.instance.ui.colorPicker || null
    
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
    const id = `harmonic-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    
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
    markAnnotationsChanged(this.instance)
    
    // Auto-select the newly created harmonic set
    const index = this.instance.state.harmonics.harmonicSets.length - 1
    this.instance.interaction.setSelection('harmonicSet', harmonicSet.id, index)
    
    // Update visual elements
    if (this.instance.ui.harmonicPanel) {
      updateHarmonicPanelContent(this.instance.ui.harmonicPanel, this.instance)
    }
    
    // Trigger re-render of persistent features to show the new harmonic set
    if (this.instance.featureRenderer) {
      this.instance.featureRenderer.renderAllPersistentFeatures()
    }
    
    dispatch(this.instance, { frame: true })
    
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
      markAnnotationsChanged(this.instance)

      // Update visual elements
      if (this.instance.ui.harmonicPanel) {
        updateHarmonicPanelContent(this.instance.ui.harmonicPanel, this.instance)
      }
      
      // Trigger re-render of persistent features to show updated harmonic set
      if (this.instance.featureRenderer) {
        this.instance.featureRenderer.renderAllPersistentFeatures()
      }
      
      dispatch(this.instance, { frame: true })
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
        this.instance.interaction.clearSelection()
      }
      
      this.instance.state.harmonics.harmonicSets.splice(setIndex, 1)
      markAnnotationsChanged(this.instance)

      // Update visual elements
      if (this.instance.ui.harmonicPanel) {
        updateHarmonicPanelContent(this.instance.ui.harmonicPanel, this.instance)
      }
      
      // Trigger re-render of persistent features to remove the harmonic set
      if (this.instance.featureRenderer) {
        this.instance.featureRenderer.renderAllPersistentFeatures()
      }
      
      dispatch(this.instance, { frame: true })
    }
  }

  /**
   * Find the harmonic set whose drawn geometry contains the given position.
   *
   * Hit-testing follows exactly what is drawn — nothing more, nothing less.
   * Every visible part of a pin grabs it: the pin line's fixed-pixel span AND
   * the number label + symbol stacked above it. A set with its pin hidden is
   * grabbable by its label/symbol stack alone; the span where its line would
   * have been is empty on screen, so it is empty to the mouse too.
   *
   * Takes the probe position as a parameter rather than reading
   * `state.cursorPosition`: the stored cursor goes stale during pans (wheel-pan
   * suppresses mousemove), and a click tested against the pre-pan time missed
   * the pin and minted a duplicate set on top of it (BH-13).
   *
   * Bounded work per set (BH-2): the range is the VISIBLE one (zoom-aware, the
   * same source the renderer uses), only the harmonic nearest the probe
   * frequency (±1) is line-tested — no other line can be within frequency
   * tolerance — and the stack test walks just the thinned labelled subset.
   * The full-range loop this replaces iterated 200,000 harmonics per hover at
   * the minimum spacing on a standard config.
   *
   * @param {DataCoordinates} position - Probe position {freq, time}
   * @returns {HarmonicSet|null} The harmonic set if found, null otherwise
   */
  findHarmonicSetAt(position) {
    if (!position) return null
    const { freq, time } = position

    for (const harmonicSet of this.instance.state.harmonics.harmonicSets) {
      // Check if frequency is close to any harmonic line in this set
      if (harmonicSet.spacing > 0) {
        const { minHarmonic, maxHarmonic } = this.getVisibleHarmonicRange(harmonicSet)
        if (maxHarmonic < minHarmonic) continue

        // Pins are a fixed pixel height, so hit-test vertically in SVG pixels
        // against the same geometry the renderer draws.
        const { lineHeight, lineTop } = this.calculateHarmonicLineDimensions(harmonicSet)
        const stack = this.calculateLabelStackBounds(lineTop, harmonicSet)
        // Only the thinned subset is labelled, so only those pins carry a stack.
        const labelled = this.getLabelledHarmonics(minHarmonic, maxHarmonic)
        // A hidden pin draws no lines, so its line span is not a grab region.
        const pinDrawn = harmonicSet.showPin !== false

        const tolerance = getUniformTolerance(this.getViewport(), this.instance.ui.spectrogramImage)
        const cursorSVG = dataToSVG(
          { freq, time },
          this.getViewport(),
          this.instance.ui.spectrogramImage
        )

        // The pin line: frequency tolerance horizontally, the line span
        // vertically. Only the harmonic(s) nearest the probe frequency can
        // pass the horizontal test, so only they are checked.
        if (pinDrawn && cursorSVG.y >= lineTop && cursorSVG.y <= lineTop + lineHeight) {
          const nearest = Math.round(freq / harmonicSet.spacing)
          const from = Math.max(minHarmonic, nearest - 1)
          const to = Math.min(maxHarmonic, nearest + 1)
          for (let h = from; h <= to; h++) {
            if (Math.abs(freq - h * harmonicSet.spacing) < tolerance.freq) {
              return harmonicSet
            }
          }
        }

        // The label/symbol stack above the line: measured in SVG pixels, since
        // the digits and symbol are a fixed pixel size regardless of zoom.
        if (cursorSVG.y >= stack.top && cursorSVG.y <= stack.bottom) {
          for (const h of labelled) {
            if (Math.abs(cursorSVG.x - this.harmonicLineX(harmonicSet, h)) <= this.labelStackHalfWidth(harmonicSet, h)) {
              return harmonicSet
            }
          }
        }
      }
    }
    return null
  }

  /**
   * Mint a new harmonic set at the mousedown position and return it as a
   * `create`-kind drag target, so the rest of the gesture is an ordinary drag.
   *
   * The initial spacing places the cursor on a sensible harmonic — the 10th
   * when the frequency axis starts above zero, the 5th when it starts at zero —
   * which is what keeps the first drawn set legible.
   * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
   * @returns {DragTarget|null} A create-kind target, or null if a set cannot be made
   */
  createHarmonicSetTarget(dataCoords) {
    const { freqMin } = this.instance.state.config

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

    // Create the harmonic set immediately, so the drag has something to move
    const harmonicSet = this.addHarmonicSet(dataCoords.time, initialSpacing)
    if (!harmonicSet) {
      return null
    }

    return {
      kind: 'create',
      id: harmonicSet.id,
      type: 'harmonicSet',
      position: dataCoords,
      data: {
        harmonicSet,
        clickedHarmonicNumber,
        originalAnchorTime: dataCoords.time
      }
    }
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
   * Apply a harmonic-set drag — the shared step for both the `move` and
   * `create` kinds, which differ only in how their target was resolved.
   * @param {DragTarget} target - The drag target from the engine
   * @param {DataCoordinates} currentPos - Current pointer position
   * @param {DataCoordinates} startPos - Where the drag began
   */
  applyHarmonicSetDrag(target, currentPos, startPos) {
    if (!target || !currentPos || !startPos) return

    const setId = target.id
    if (!setId) return

    const harmonicSet = this.instance.state.harmonics.harmonicSets.find(set => set.id === setId)
    if (!harmonicSet) return

    let newSpacing, newAnchorTime

    // For both new creation and existing drags, keep the clicked harmonic under the cursor
    const clickedHarmonicNumber = (target.data && target.data.clickedHarmonicNumber) || 1

    // Calculate spacing so the clicked harmonic stays at cursor position
    newSpacing = currentPos.freq / clickedHarmonicNumber

    // Ensure minimum spacing
    newSpacing = Math.max(newSpacing, 0.1)

    // Allow vertical movement for both new creation and existing drags.
    // Clamped to the configured time range, matching the keyboard-move path:
    // an unclamped drag could push the anchor off the gram, store it there
    // unvalidated, and have the set snap back on the first arrow key (BH-25).
    const originalAnchorTime = target.data && target.data.originalAnchorTime !== undefined
      ? target.data.originalAnchorTime
      : harmonicSet.anchorTime
    const deltaTime = currentPos.time - startPos.time
    const { timeMin, timeMax } = this.instance.state.config
    newAnchorTime = Math.max(timeMin, Math.min(timeMax, originalAnchorTime + deltaTime))

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

    if (this.instance.ui.harmonicPanel) {
      updateHarmonicPanelContent(this.instance.ui.harmonicPanel, this.instance)
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
   * Re-render this mode's persistent panel from current state.
   *
   * The `PanelOwner` capability. `MainUI` used to reach in by name, resolve the
   * panel element on this mode's behalf, and call `updateHarmonicPanel` through
   * an `any` cast. Resolving the panel reference belongs here — it is this
   * mode's own UI element — so it is absorbed rather than left outside
   * (spec 167, FR-006, AS-4.2).
   */
  refreshPanel() {
    // The panel may have been created by a previous instance of this mode's UI
    // (mode switches destroy and rebuild it), so re-resolve it when missing.
    if (!this.instance.ui.harmonicPanel && this.instance.ui.harmonicsContainer) {
      const existingPanel = /** @type {HTMLElement|null} */ (
        this.instance.ui.harmonicsContainer.querySelector('.gram-frame-harmonic-panel')
      )
      if (existingPanel) {
        this.instance.ui.harmonicPanel = existingPanel
      }
    }
    this.updateHarmonicPanel()
  }

  /**
   * Whether this mode currently owns any persistent feature.
   *
   * Half of the `PersistentFeatureProvider` capability. Lived on
   * `FeatureRenderer` as `hasHarmonicFeatures()` until spec 167 moved it onto
   * the mode that owns the state it reads.
   * @returns {boolean} True if at least one harmonic set exists
   */
  hasPersistentFeatures() {
    const harmonics = this.instance.state.harmonics
    return !!(harmonics && harmonics.harmonicSets && harmonics.harmonicSets.length > 0)
  }

  /**
   * Render persistent features for harmonics mode
   */
  renderPersistentFeatures() {
    if (!this.instance.ui.cursorGroup || !this.instance.state.harmonics?.harmonicSets) {
      return
    }
    
    // Clear existing harmonic lines and their symbol marks. Scope the symbol
    // cleanup to harmonic pin symbols (which carry data-harmonic-set-id) so it
    // never removes analysis-marker symbols that share the base symbol class.
    const existingHarmonics = this.instance.ui.cursorGroup.querySelectorAll('.gram-frame-harmonic-line')
    existingHarmonics.forEach(line => line.remove())
    const existingSymbols = this.instance.ui.cursorGroup.querySelectorAll('.gram-frame-harmonic-symbol[data-harmonic-set-id]')
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
   * The visible range comes from `calculateVisibleDataRange` (the same
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
    const { freqMin, freqMax } = calculateVisibleDataRange(this.instance.state, this.instance.ui.spectrogramImage)
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
    const { renderHeight } = getRenderDimensions(this.instance.state)
    const lineHeight = renderHeight * HarmonicsMode.PIN_HEIGHT_RATIO
    const anchorPoint = { freq: harmonicSet.spacing, time: harmonicSet.anchorTime }
    const anchorSVG = dataToSVG(anchorPoint, this.getViewport(), this.instance.ui.spectrogramImage)
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
    const imageTop = getImageBounds(this.getViewport(), this.instance.ui.spectrogramImage).top
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
    return dataToSVG(harmonicPoint, this.getViewport(), this.instance.ui.spectrogramImage).x
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
    if (!this.instance.ui.cursorGroup) {
      return
    }

    const { minHarmonic, maxHarmonic } = this.getVisibleHarmonicRange(harmonicSet)
    if (maxHarmonic < minHarmonic) {
      return
    }

    const { lineHeight, lineTop } = this.calculateHarmonicLineDimensions(harmonicSet)
    const imageTop = getImageBounds(this.getViewport(), this.instance.ui.spectrogramImage).top

    // Draw every pin line in the visible span (FR-001) — unless this set is set
    // to hide its pin. Sets restored from storage without the flag are pinned.
    // Beyond MAX_PIN_LINES the lines are a regular sample of the span (BH-2):
    // by then adjacent pins have long merged on screen, and an uncapped loop
    // rebuilt hundreds of thousands of SVG elements per drag frame.
    if (harmonicSet.showPin !== false) {
      const visibleCount = maxHarmonic - minHarmonic + 1
      const stride = Math.max(1, Math.ceil(visibleCount / HarmonicsMode.MAX_PIN_LINES))
      for (let harmonicNumber = minHarmonic; harmonicNumber <= maxHarmonic; harmonicNumber += stride) {
        const lineX = this.harmonicLineX(harmonicSet, harmonicNumber)
        const line = this.createHarmonicLine(harmonicNumber, harmonicSet, lineX, lineTop, lineHeight)
        this.instance.ui.cursorGroup.appendChild(line)
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
        this.instance.ui.cursorGroup.appendChild(symbol)
      }
      this.instance.ui.cursorGroup.appendChild(label)
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
    }
  }

}