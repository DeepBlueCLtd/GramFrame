import { PinSetMode, MIN_PIN_SPACING } from '../shared/PinSetMode.js'
import { updateSidebandPanelContent, createSidebandPanel } from '../../components/SidebandPanel.js'
import { dataFrequencyRange } from '../../utils/coordinates.js'

/**
 * Sidebands mode implementation (issue #241).
 *
 * A sideband set is a {@link PinSetMode} set whose origin the analyst places:
 * member `n` sits at `fundamentalFreq + n × spacing`, and `n` runs negative as
 * well as positive, so the pins spread both sides of the fundamental. That one
 * difference — where index 0 lands — is the whole of what separates this mode
 * from Harmonics; the pins, labels, hit test, drag and persistence are the
 * shared pin-set machinery.
 *
 * Clicking empty gram sets the fundamental at the click and shows a spread of
 * sidebands either side of it. Dragging the fundamental (member 0) moves the
 * origin; dragging any other member sets the spacing, keeping the grabbed
 * sideband under the cursor.
 */
export class SidebandMode extends PinSetMode {
  /**
   * Number of sidebands a newly placed set spreads across the frequency axis.
   *
   * The seed spacing is the axis span divided by this, so a set dropped in the
   * middle of the gram shows about this many members — an equal count each side
   * when the fundamental is central, and more on the roomier side when it is
   * not. It is only a starting point: the analyst drags a sideband onto the
   * data immediately afterwards, which is what actually sets the spacing.
   * @type {number}
   */
  static INITIAL_SIDEBAND_COUNT = 8

  /**
   * Initialize SidebandMode
   * @param {GramFrame} instance - GramFrame instance
   */
  constructor(instance) {
    super(instance, 'sideband')
  }

  /**
   * The sideband sets, live.
   * @returns {PinSet[]} This mode's sets
   */
  get sets() {
    return this.instance.state.sidebands.sidebandSets
  }

  /**
   * @returns {SelectedFeatureType} Selection type for a sideband set
   */
  get selectionType() {
    return 'sidebandSet'
  }

  /**
   * DOM naming for sideband pins: its own stem, so a selector, a cleanup pass
   * or a test can never confuse a sideband with a harmonic.
   * @returns {PinSetClassNames} Class and attribute names
   */
  get pinNames() {
    return {
      idPrefix: 'sideband',
      lineClass: 'gram-frame-sideband-line',
      miniPinClass: 'gram-frame-sideband-mini-pin',
      labelClass: 'gram-frame-sideband-number',
      setIdAttribute: 'data-sideband-set-id',
      indexAttribute: 'data-sideband-index'
    }
  }

  /**
   * Frequency of sideband `index`, counted out from the fundamental. Negative
   * indices fall below it, positive ones above; index 0 is the fundamental.
   * @param {PinSet} set - Sideband set
   * @param {number} index - Sideband index
   * @returns {number} Frequency in Hz
   */
  freqForIndex(set, index) {
    return this.fundamentalOf(set) + index * set.spacing
  }

  /**
   * The inclusive sideband-index range within the currently visible frequency
   * span. Unlike a harmonic set this is not clamped at zero: sidebands below the
   * fundamental are as real as those above it.
   * @param {PinSet} set - Sideband set
   * @returns {{minIndex: number, maxIndex: number}} Inclusive index range
   */
  visibleIndexRange(set) {
    const { freqMin, freqMax } = this.visibleFrequencySpan()
    const fundamental = this.fundamentalOf(set)
    return {
      minIndex: Math.ceil((freqMin - fundamental) / set.spacing),
      maxIndex: Math.floor((freqMax - fundamental) / set.spacing)
    }
  }

  /**
   * Which sideband a probe frequency is nearest.
   * @param {PinSet} set - Sideband set
   * @param {number} freq - Probe frequency
   * @returns {number} Nearest sideband index
   */
  nearestIndex(set, freq) {
    return Math.round((freq - this.fundamentalOf(set)) / set.spacing)
  }

  /**
   * Label a sideband by its signed offset from the fundamental, so the origin
   * is identifiable at a glance: `0` on the fundamental, `+1`/`-1` either side.
   * @param {number} index - Sideband index
   * @returns {string} Label text
   */
  labelTextFor(index) {
    return index > 0 ? `+${index}` : String(index)
  }

  /**
   * The set's fundamental, tolerating a record that somehow lacks one.
   * @param {PinSet} set - Sideband set
   * @returns {number} Fundamental frequency in Hz
   */
  fundamentalOf(set) {
    return set.fundamentalFreq || 0
  }

  /**
   * Mint a new sideband set at the mousedown position.
   *
   * The click sets the fundamental. The seed spacing spreads roughly
   * {@link SidebandMode.INITIAL_SIDEBAND_COUNT} members across the frequency
   * axis, which puts an equal number either side of a centred fundamental and
   * more on the roomier side of an off-centre one — exactly as the analyst
   * placed it. The drag that follows then sets the real spacing.
   * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
   * @returns {DragTarget|null} A create-kind target, or null if a set cannot be made
   */
  createSetTarget(dataCoords) {
    // Data scale: the seed spacing is compared with, and stored alongside,
    // frequencies that carry the frequency rate (issue #276).
    const { freqMin, freqMax } = dataFrequencyRange(this.getViewport())
    const span = Math.abs(freqMax - freqMin)
    const initialSpacing = Math.max(span / SidebandMode.INITIAL_SIDEBAND_COUNT, MIN_PIN_SPACING)

    const sidebandSet = this.addSidebandSet(dataCoords.time, dataCoords.freq, initialSpacing)
    if (!sidebandSet) {
      return null
    }

    return {
      kind: 'create',
      id: sidebandSet.id,
      type: 'sidebandSet',
      position: dataCoords,
      data: {
        set: sidebandSet,
        // The click landed on the fundamental, so the drag that follows moves
        // the origin — which is how the analyst places it precisely.
        clickedIndex: 0,
        originalAnchorTime: dataCoords.time
      }
    }
  }

  /**
   * What a horizontal drag means for a sideband set.
   *
   * Grabbing the fundamental moves the whole set along the frequency axis;
   * grabbing any other sideband holds it under the cursor, which sets the
   * spacing. Dragging a sideband past the fundamental would invert the spacing,
   * so it is floored at the shared minimum rather than allowed to go negative.
   * @param {PinSet} set - The set being dragged
   * @param {number} clickedIndex - Sideband index the drag grabbed
   * @param {DataCoordinates} currentPos - Current pointer position
   * @returns {Partial<PinSet>} Updates to apply
   */
  freqUpdatesForDrag(set, clickedIndex, currentPos) {
    if (clickedIndex === 0) {
      const { freqMin, freqMax } = dataFrequencyRange(this.getViewport())
      const lower = Math.min(freqMin, freqMax)
      const upper = Math.max(freqMin, freqMax)
      return { fundamentalFreq: Math.max(lower, Math.min(upper, currentPos.freq)) }
    }

    const spacing = (currentPos.freq - this.fundamentalOf(set)) / clickedIndex
    return { spacing: Math.max(spacing, MIN_PIN_SPACING) }
  }

  /**
   * Add a new sideband set
   * @param {number} anchorTime - Time position in seconds
   * @param {number} fundamentalFreq - Fundamental frequency in Hz
   * @param {number} spacing - Frequency spacing between adjacent sidebands in Hz
   * @returns {PinSet} The created sideband set
   */
  addSidebandSet(anchorTime, fundamentalFreq, spacing) {
    return this.addSet({ anchorTime, fundamentalFreq, spacing })
  }

  /**
   * Update an existing sideband set
   * @param {string} id - Sideband set ID
   * @param {Partial<PinSet>} updates - Properties to update
   */
  updateSidebandSet(id, updates) {
    this.updateSet(id, updates)
  }

  /**
   * Remove a sideband set
   * @param {string} id - Sideband set ID
   */
  removeSidebandSet(id) {
    this.removeSet(id)
  }

  /**
   * Find the sideband set whose drawn geometry contains the given position.
   * @param {DataCoordinates} position - Probe position {freq, time}
   * @returns {PinSet|null} The sideband set if found, null otherwise
   */
  findSidebandSetAt(position) {
    return this.findSetAt(position)
  }

  /**
   * Get guidance content for sidebands mode
   * @returns {Object} Structured guidance content
   */
  getGuidanceText() {
    return {
      items: [
        { trigger: 'Click & drag', outcome: 'to place a sideband set at that frequency' },
        { trigger: 'Drag the 0 line', outcome: 'to move the fundamental' },
        { trigger: 'Drag any other line', outcome: 'to adjust sideband spacing' },
        { trigger: 'Row + \u2190 \u2192', outcome: 'to nudge (Shift for larger steps)' }
      ]
    }
  }

  /**
   * Create UI elements for sidebands mode
   * @param {HTMLElement} sidebandsContainer - Persistent container for the sidebands table
   */
  createUI(sidebandsContainer) {
    this.uiElements = {}
    this.uiElements.sidebandsContainer = sidebandsContainer

    // Check if the panel already exists (a mode switch rebuilds this mode's UI
    // against the same persistent container) to prevent duplicates.
    const existingPanel = /** @type {HTMLElement|null} */ (
      sidebandsContainer.querySelector('.gram-frame-sideband-panel')
    )
    this.uiElements.sidebandPanel = existingPanel || createSidebandPanel(sidebandsContainer, this.instance)
    this.instance.ui.sidebandPanel = this.uiElements.sidebandPanel

    // Populate the panel with any sets restored from storage
    this.updatePanel()
  }

  /**
   * Destroy mode-specific UI elements when leaving this mode.
   *
   * The panel and its container are persistent — the sidebands table stays
   * visible in every mode, as the markers and harmonics tables do — so this
   * deliberately does NOT call `super.destroyUI()`.
   */
  destroyUI() {
    // Nothing to remove.
  }

  /**
   * Update the sidebands table
   */
  updatePanel() {
    if (this.instance.ui.sidebandPanel) {
      updateSidebandPanelContent(this.instance.ui.sidebandPanel, this.instance)
    }
  }

  /**
   * Re-render this mode's persistent panel from current state.
   *
   * The `PanelOwner` capability.
   * @see {@link module:modes/capabilities}
   */
  refreshPanel() {
    // The panel may have been created by a previous instance of this mode's UI,
    // so re-resolve it when the reference is missing.
    if (!this.instance.ui.sidebandPanel && this.instance.ui.sidebandsContainer) {
      const existingPanel = /** @type {HTMLElement|null} */ (
        this.instance.ui.sidebandsContainer.querySelector('.gram-frame-sideband-panel')
      )
      if (existingPanel) {
        this.instance.ui.sidebandPanel = existingPanel
      }
    }
    this.updatePanel()
  }

  /**
   * Get initial state for sidebands mode
   * @returns {SidebandsInitialState} Sidebands-specific initial state
   */
  static getInitialState() {
    return {
      sidebands: {
        sidebandSets: []
      }
    }
  }
}
