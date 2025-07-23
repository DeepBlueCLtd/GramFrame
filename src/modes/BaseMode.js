/**
 * Base interface for GramFrame analysis modes
 * Provides common lifecycle methods and event handling interface
 * All mode implementations should extend this base class
 */
export class BaseMode {
  /**
   * Constructor for base mode
   * @param {Object} instance - GramFrame instance
   * @param {Object} state - GramFrame state object
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
   * Handle mouse click events
   * @param {MouseEvent} event - The mouse click event
   * @param {Object} coords - Coordinate information {svgCoords, dataCoords, imageCoords}
   */
  handleClick(event, coords) {
    // Default implementation - override in subclasses
  }

  /**
   * Handle mouse down events
   * @param {MouseEvent} event - The mouse down event
   * @param {Object} coords - Coordinate information {svgCoords, dataCoords, imageCoords}
   */
  handleMouseDown(event, coords) {
    // Default implementation - override in subclasses
  }

  /**
   * Handle mouse move events
   * @param {MouseEvent} event - The mouse move event
   * @param {Object} coords - Coordinate information {svgCoords, dataCoords, imageCoords}
   */
  handleMouseMove(event, coords) {
    // Default implementation - override in subclasses
  }

  /**
   * Handle mouse up events
   * @param {MouseEvent} event - The mouse up event
   * @param {Object} coords - Coordinate information {svgCoords, dataCoords, imageCoords}
   */
  handleMouseUp(event, coords) {
    // Default implementation - override in subclasses
  }

  /**
   * Handle context menu (right-click) events
   * @param {MouseEvent} event - The context menu event
   * @param {Object} coords - Coordinate information {svgCoords, dataCoords, imageCoords}
   */
  handleContextMenu(event, coords) {
    // Default implementation - override in subclasses
  }

  /**
   * Render mode-specific cursor indicators and overlays
   * @param {SVGElement} svg - The SVG container element
   */
  render(svg) {
    // Default implementation - override in subclasses
  }

  /**
   * Update cursor position and related visual indicators
   * @param {Object} coords - Current cursor coordinates {svgCoords, dataCoords, imageCoords}
   */
  updateCursor(coords) {
    // Default implementation - override in subclasses
  }

  /**
   * Update the readout panel with mode-specific information
   * @param {Object} coords - Current cursor coordinates {svgCoords, dataCoords, imageCoords}
   */
  updateReadout(coords) {
    // Default implementation - override in subclasses
  }

  /**
   * Update LED displays with mode-specific values
   * @param {Object} coords - Current cursor coordinates {svgCoords, dataCoords, imageCoords}
   */
  updateLEDs(coords) {
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
   * Get a snapshot of current mode-specific state
   * @returns {Object} Mode-specific state snapshot
   */
  getStateSnapshot() {
    // Default implementation - override in subclasses
    return {}
  }
}