/**
 * Base mode class for demonstrator modes
 * Following the GramFrame BaseMode pattern
 */

export class BaseMode {
    /**
     * Constructor for base mode
     * @param {ZoomDemonstrator} instance - Demonstrator instance
     * @param {Object} state - Demonstrator state object
     */
    constructor(instance, state) {
        this.instance = instance;
        this.state = state;
        this.uiElements = {};
    }

    /**
     * Activate this mode - called when switching to this mode
     */
    activate() {
        // Default implementation - override in subclasses
    }

    /**
     * Deactivate this mode - called when switching away from this mode
     */
    deactivate() {
        // Default implementation - override in subclasses
    }

    /**
     * Handle mouse move events
     * @param {MouseEvent} event - Mouse event
     * @param {Object} coords - Coordinate data
     */
    handleMouseMove(event, coords) {
        // Default implementation - override in subclasses
    }

    /**
     * Handle mouse down events
     * @param {MouseEvent} event - Mouse event
     * @param {Object} coords - Coordinate data
     */
    handleMouseDown(event, coords) {
        // Default implementation - override in subclasses
    }

    /**
     * Handle mouse up events
     * @param {MouseEvent} event - Mouse event
     * @param {Object} coords - Coordinate data
     */
    handleMouseUp(event, coords) {
        // Default implementation - override in subclasses
    }

    /**
     * Handle mouse leave events
     */
    handleMouseLeave() {
        // Default implementation - override in subclasses
    }

    /**
     * Handle context menu (right-click) events
     * @param {MouseEvent} event - Mouse event
     * @param {Object} coords - Coordinate data
     */
    handleContextMenu(event, coords) {
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
        `;
    }

    /**
     * Reset mode-specific state
     */
    resetState() {
        // Default implementation - override in subclasses
    }

    /**
     * Clean up mode-specific state
     */
    cleanup() {
        // Default implementation - override in subclasses
    }

    /**
     * Create mode-specific UI elements
     * @param {HTMLElement} container - Container for UI elements
     */
    createUI(container) {
        // Default implementation - initialize uiElements
        this.uiElements = {};
    }

    /**
     * Destroy mode-specific UI elements
     */
    destroyUI() {
        if (this.uiElements) {
            Object.values(this.uiElements).forEach(element => {
                if (element && element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            });
            this.uiElements = {};
        }
    }

    /**
     * Get a snapshot of current mode-specific state
     * @returns {Object} Mode-specific state snapshot
     */
    getStateSnapshot() {
        return {};
    }

    /**
     * Get initial state for this mode
     * @returns {Object} Mode-specific initial state object
     */
    static getInitialState() {
        return {};
    }
}