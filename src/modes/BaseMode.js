/**
 * Base interface for GramFrame analysis modes
 * Provides common lifecycle methods and event handling interface
 * All mode implementations should extend this base class
 */
export class BaseMode {
  /**
   * Constructor for base mode
   * @param {Object} instance - GramFrame instance
   * @param {GramFrameState} state - GramFrame state object
   */
  constructor(instance, state) {
    this.instance = instance
    this.state = state
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
   * @param {Object} _dataCoords - Data coordinates {freq, time} (unused in base implementation)
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
   * Render persistent features for this mode
   * Override in subclasses to render mode-specific persistent features
   */
  renderPersistentFeatures() {
    // Default implementation - override in subclasses
  }

  /**
   * Render current cursor for this mode
   * Override in subclasses to render mode-specific cursor indicators
   */
  renderCursor() {
    // Default implementation - override in subclasses
  }

  /**
   * Update LED displays with mode-specific values
   * @param {Object} _coords - Current cursor coordinates {svgCoords, dataCoords, imageCoords}
   */
  updateLEDs(_coords) {
    // Default implementation - override in subclasses
  }

  /**
   * Get guidance text for this mode
   * @returns {string} HTML content for the guidance panel
   */
  getGuidanceText() {
    return `
      <h4>Base Mode</h4>
      <p>• No specific guidance available</p>
    `
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
   * Get a snapshot of current mode-specific state
   * @returns {Object} Mode-specific state snapshot
   */
  getStateSnapshot() {
    // Default implementation - override in subclasses
    return {}
  }

  /**
   * Get initial state for this mode
   * Override in subclasses to provide mode-specific initial state
   * @returns {Object} Mode-specific initial state object
   */
  static getInitialState() {
    // Default implementation - override in subclasses
    return {}
  }
}