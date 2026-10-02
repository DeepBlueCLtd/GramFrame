/**
 * Base interface for GramFrame analysis modes
 * Provides common lifecycle methods and event handling interface
 * All mode implementations should extend this base class
 *
 * Two kinds of member live here, and the distinction matters (spec 167, FR-005):
 *
 * - **Hooks** — empty here, meant to be overridden. Every one has at least one
 *   real override in a mode. A hook with none is a no-op dressed up as a
 *   contract: a cursor-render hook and a state-snapshot hook were exactly that,
 *   and were deleted along with the coordinator method whose only job was
 *   calling the first of them.
 * - **Concrete helpers** — `getViewport` and `updateCursorStyle`. Zero
 *   overrides, but 17 and 3 callers: the base implementation *is* the whole
 *   contract, so they stay.
 *
 * `renderPersistentFeatures` remains declared here for modes that inherit the
 * no-op, but cross-module callers reach it through the `PersistentFeatureProvider`
 * capability in `modes/capabilities.js` rather than through this base class.
 */

export class BaseMode {
  /**
   * Constructor for base mode
   * @param {GramFrame} instance - GramFrame instance
   */
  constructor(instance) {
    this.instance = instance

    /**
     * This mode's drag handler, when it has one. Pan, Analysis, Harmonics and
     * Doppler each construct one; a mode with no drag interaction leaves it null.
     * @type {import('./shared/BaseDragHandler.js').BaseDragHandler|null}
     */
    this.dragHandler = null

    /**
     * DOM elements this mode created, kept so `destroyUI` can remove them.
     * Populated by `createUI`; the keys are mode-specific.
     * @type {Object<string, HTMLElement|null>}
     */
    this.uiElements = {}
  }

  /**
   * Activate this mode - called when switching to this mode
   * Override in subclasses to perform mode-specific initialization
   */
  activate() {
    // Default implementation - override in subclasses
  }

  /**
   * Deactivate this mode - called when switching away from this mode
   * Override in subclasses to perform mode-specific cleanup
   */
  deactivate() {
    // Default implementation - override in subclasses
  }

  /**
   * Handle mouse move events
   * @param {MouseEvent} _event - Mouse event (unused in base implementation)
   * @param {DataCoordinates} _dataCoords - Data coordinates {freq, time} (unused in base implementation)
   */
  handleMouseMove(_event, _dataCoords) {
    // Default implementation - override in subclasses for mode-specific behavior
  }

  /**
   * Handle mouse down events
   * @param {MouseEvent} _event - Mouse event (unused in base implementation)
   * @param {DataCoordinates} _dataCoords - Data coordinates {freq, time} (unused in base implementation)
   */
  handleMouseDown(_event, _dataCoords) {
    // Default implementation - override in subclasses for mode-specific behavior
  }

  /**
   * Handle mouse up events
   * @param {MouseEvent} _event - Mouse event (unused in base implementation)
   * @param {DataCoordinates} _dataCoords - Data coordinates {freq, time} (unused in base implementation)
   */
  handleMouseUp(_event, _dataCoords) {
    // Default implementation - override in subclasses for mode-specific behavior
  }

  /**
   * Handle mouse leave events
   */
  handleMouseLeave() {
    // Default implementation - override in subclasses for mode-specific behavior
  }

  /**
   * Handle a right-click within the image.
   * @param {MouseEvent} _event - Context-menu event (unused in base implementation)
   * @param {DataCoordinates} _dataCoords - Data coordinates {freq, time} (unused in base implementation)
   */
  handleContextMenu(_event, _dataCoords) {
    // Default implementation - override in subclasses
  }

  /**
   * Render persistent features for this mode
   * Override in subclasses to render mode-specific persistent features
   */
  renderPersistentFeatures() {
    // Default implementation - override in subclasses
  }

  /**
   * Update LED displays with mode-specific values
   * @param {CursorPosition|null} _coords - Current cursor coordinates, or null
   *   when the pointer is not over the image
   */
  updateLEDs(_coords) {
    // Default implementation - override in subclasses
  }

  /**
   * Whether a drag in this mode keeps working when the pointer is not over the
   * gram itself.
   *
   * `false` for every mode that places or moves a feature: a marker has to land
   * on the gram, so an off-image pointer is a mistake and the drag is cancelled.
   * Panning an audio-sourced gram is the exception — see `PanMode`.
   * @returns {boolean} True when the mode wants pointer events off the image
   */
  acceptsOffImageDrag() {
    return false
  }

  /**
   * Get guidance content for this mode
   * @returns {Object} Structured guidance content
   */
  getGuidanceText() {
    return {
      title: 'Base Mode',
      items: [
        'No specific guidance available'
      ]
    }
  }

  /**
   * Get command buttons for this mode
   * Override in subclasses to provide mode-specific command buttons
   * @returns {Array<CommandButton>} Array of command button definitions
   */
  getCommandButtons() {
    return []
  }

  /**
   * Check if this mode is currently enabled
   * Override in subclasses to provide mode-specific enable/disable logic
   * @returns {boolean} True if mode is enabled, false if disabled
   */
  isEnabled() {
    return true
  }

  /**
   * Reset mode-specific state
   * Override in subclasses to clear mode-specific state properties
   */
  resetState() {
    // Default implementation - override in subclasses
  }

  /**
   * Clean up mode-specific state when switching away from this mode
   * Override in subclasses to perform mode-specific state cleanup
   */
  cleanup() {
    // Default implementation - override in subclasses
  }

  /**
   * Create mode-specific UI elements when entering this mode
   * Override in subclasses to create mode-specific UI elements
   * @param {HTMLElement} _readoutPanel - Container for UI elements (unused in base implementation)
   */
  createUI(_readoutPanel) {
    // Default implementation - initialize uiElements
    this.uiElements = {}
  }

  /**
   * Destroy mode-specific UI elements when leaving this mode
   * Override in subclasses to clean up mode-specific UI elements
   */
  destroyUI() {
    // Default implementation - remove all UI elements created by this mode
    if (this.uiElements) {
      Object.values(this.uiElements).forEach(element => {
        if (element && element.parentNode) {
          element.parentNode.removeChild(element)
        }
      })
      this.uiElements = {}
    }
  }

  /**
   * Get initial state for this mode
   * Override in subclasses to provide mode-specific initial state
   * @returns {*} Mode-specific initial state object
   */
  static getInitialState() {
    // Default implementation - override in subclasses
    return {}
  }

  /**
   * Get viewport configuration for coordinate transformations
   * @returns {ViewportConfig} Viewport configuration object
   */
  getViewport() {
    return {
      margins: this.instance.state.margins,
      imageDetails: this.instance.state.imageDetails,
      config: this.instance.state.config,
      zoom: this.instance.state.zoom,
      frequencyRate: this.instance.state.frequencyRate
    }
  }

  /**
   * Update cursor style for drag operations.
   *
   * The style goes on the SVG root, not on the `<image>` inside it. `cursor` is
   * resolved on whatever element the pointer actually hits, and a feature is
   * drawn *over* the image as a sibling of it — a marker circle, a harmonic
   * pin, a Doppler curve. Styling the image therefore left the cursor unchanged
   * at exactly the moment it mattered: over the feature itself, where the hit
   * element inherited the SVG's resting `crosshair` instead. On the root, every
   * descendant inherits the value, so the affordance holds wherever the pointer
   * is inside the component.
   * @param {string} style - A CSS cursor value, as resolved by `utils/cursors.js`
   */
  updateCursorStyle(style) {
    if (this.instance.ui.svg) {
      this.instance.ui.svg.style.cursor = style
    }
  }
}