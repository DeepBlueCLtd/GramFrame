import { PinSetMode, MIN_PIN_SPACING } from '../shared/PinSetMode.js'
import { updateHarmonicPanelContent, createHarmonicPanel } from '../../components/HarmonicPanel.js'
import { showManualHarmonicModal } from './ManualHarmonicModal.js'

/**
 * Harmonics mode implementation.
 *
 * A harmonic set is a {@link PinSetMode} set whose origin is fixed at 0 Hz:
 * member `n` sits at `n × spacing`, and only members `n >= 1` exist. Everything
 * else — the pin geometry, the label/symbol stack, the hit test, the render
 * loop and the drag wiring — is the shared pin-set machinery, which Sidebands
 * mode (issue #241) drives with a different origin.
 */
export class HarmonicsMode extends PinSetMode {
  /**
   * Initialize HarmonicsMode
   * @param {GramFrame} instance - GramFrame instance
   */
  constructor(instance) {
    super(instance, 'harmonics')
  }

  /**
   * The harmonic sets, live.
   * @returns {PinSet[]} This mode's sets
   */
  get sets() {
    return this.instance.state.harmonics.harmonicSets
  }

  /**
   * @returns {SelectedFeatureType} Selection type for a harmonic set
   */
  get selectionType() {
    return 'harmonicSet'
  }

  /**
   * DOM naming for harmonic pins. Unchanged from before the pin machinery was
   * shared, so every existing CSS selector, test and helper keeps working.
   * @returns {PinSetClassNames} Class and attribute names
   */
  get pinNames() {
    return {
      idPrefix: 'harmonic',
      lineClass: 'gram-frame-harmonic-line',
      miniPinClass: 'gram-frame-harmonic-mini-pin',
      labelClass: 'gram-frame-harmonic-number',
      setIdAttribute: 'data-harmonic-set-id',
      indexAttribute: 'data-harmonic-number'
    }
  }

  /**
   * Frequency of the nth harmonic: the origin is 0 Hz, so it is a plain
   * multiple of the spacing.
   * @param {PinSet} set - Harmonic set
   * @param {number} index - Harmonic number
   * @returns {number} Frequency in Hz
   */
  freqForIndex(set, index) {
    return index * set.spacing
  }

  /**
   * Get the inclusive harmonic-number range of a set that falls within the
   * currently visible frequency span.
   *
   * Harmonic numbers start at 1: there is no zeroth harmonic, and a set never
   * draws below its own origin.
   * @param {PinSet} set - Harmonic set
   * @returns {{minIndex: number, maxIndex: number}} Inclusive harmonic range
   */
  visibleIndexRange(set) {
    const { freqMin, freqMax } = this.visibleFrequencySpan()
    return {
      minIndex: Math.max(1, Math.ceil(freqMin / set.spacing)),
      maxIndex: Math.floor(freqMax / set.spacing)
    }
  }

  /**
   * Find which harmonic number a frequency is nearest.
   * @param {PinSet} set - Harmonic set
   * @param {number} freq - Probe frequency
   * @returns {number} Harmonic number (1, 2, 3, ...)
   */
  nearestIndex(set, freq) {
    return Math.max(1, Math.round(freq / set.spacing))
  }

  /**
   * The harmonics table's Ratio column is the cursor frequency over the set's
   * spacing, so it is stale the moment the pointer moves.
   * @returns {boolean} True — this table follows the cursor
   */
  get panelTracksCursor() {
    return true
  }

  /**
   * @param {number} index - Harmonic number
   * @returns {string} The harmonic number, as drawn
   */
  labelTextFor(index) {
    return String(index)
  }

  /**
   * Mint a new harmonic set at the mousedown position.
   *
   * The initial spacing places the cursor on a sensible harmonic — the 10th
   * when the frequency axis starts above zero, the 5th when it starts at zero —
   * which is what keeps the first drawn set legible.
   * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
   * @returns {DragTarget|null} A create-kind target, or null if a set cannot be made
   */
  createSetTarget(dataCoords) {
    const { freqMin } = this.instance.state.config

    // Origin > 0 positions the cursor at the 10th harmonic; origin at 0, the 5th.
    const clickedIndex = freqMin > 0 ? 10 : 5
    const initialSpacing = Math.max(dataCoords.freq / clickedIndex, MIN_PIN_SPACING)

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
        set: harmonicSet,
        clickedIndex,
        originalAnchorTime: dataCoords.time
      }
    }
  }

  /**
   * Dragging a harmonic keeps that harmonic under the cursor, which is the same
   * as scaling the spacing.
   * @param {PinSet} _set - Harmonic set being dragged
   * @param {number} clickedIndex - Harmonic number the drag grabbed
   * @param {DataCoordinates} currentPos - Current pointer position
   * @returns {Partial<PinSet>} Spacing update
   */
  freqUpdatesForDrag(_set, clickedIndex, currentPos) {
    const spacing = Math.max(currentPos.freq / (clickedIndex || 1), MIN_PIN_SPACING)
    return { spacing }
  }

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
   * Create UI elements for harmonics mode
   * @param {HTMLElement} harmonicsContainer - Persistent container for harmonics table
   */
  createUI(harmonicsContainer) {
    // Initialize uiElements
    this.uiElements = {}

    // Use the provided persistent harmonics container (already has label)
    this.uiElements.harmonicsContainer = harmonicsContainer

    // Find the button container created in MainUI
    const buttonContainer = harmonicsContainer.querySelector('.gram-frame-harmonics-button-container')

    // Check if UI already exists to prevent duplicates
    if (buttonContainer && buttonContainer.querySelector('.gram-frame-manual-button')) {
      // Find existing elements and store references
      this.uiElements.manualButton = /** @type {HTMLElement|null} */ (buttonContainer.querySelector('.gram-frame-manual-button'))
      this.uiElements.harmonicPanel = /** @type {HTMLElement|null} */ (harmonicsContainer.querySelector('.gram-frame-harmonic-panel'))

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
    this.updatePanel()
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
    // Update harmonic panel to show current ratio values
    this.updatePanel()
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
    // Central color picker is managed by unified layout.
    // The harmonics panel and container are persistent and must survive a mode
    // switch, so this deliberately does NOT call super.destroyUI(), which would
    // remove them from the DOM.
  }

  /**
   * Add a new harmonic set
   * @param {number} anchorTime - Time position in seconds
   * @param {number} spacing - Frequency spacing in Hz
   * @returns {PinSet} The created harmonic set
   */
  addHarmonicSet(anchorTime, spacing) {
    return this.addSet({ anchorTime, spacing })
  }

  /**
   * Update an existing harmonic set
   * @param {string} id - Harmonic set ID
   * @param {Partial<PinSet>} updates - Properties to update
   */
  updateHarmonicSet(id, updates) {
    this.updateSet(id, updates)
  }

  /**
   * Remove a harmonic set
   * @param {string} id - Harmonic set ID
   */
  removeHarmonicSet(id) {
    this.removeSet(id)
  }

  /**
   * Find the harmonic set whose drawn geometry contains the given position.
   * @param {DataCoordinates} position - Probe position {freq, time}
   * @returns {PinSet|null} The harmonic set if found, null otherwise
   */
  findHarmonicSetAt(position) {
    return this.findSetAt(position)
  }

  /**
   * Update harmonic management panel
   */
  updatePanel() {
    if (this.instance.ui.harmonicPanel) {
      updateHarmonicPanelContent(this.instance.ui.harmonicPanel, this.instance)
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
   * panel element on this mode's behalf, and call the panel update through an
   * `any` cast. Resolving the panel reference belongs here — it is this mode's
   * own UI element — so it is absorbed rather than left outside
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
    this.updatePanel()
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
