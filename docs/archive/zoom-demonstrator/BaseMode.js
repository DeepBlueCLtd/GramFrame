/**
 * Base Mode for Zoom Demonstrator
 * 
 * Provides common lifecycle methods and event handling interface
 * following GramFrame BaseMode patterns. All mode implementations 
 * should extend this base class.
 * 
 * @typedef {import('./types.js').Point2D} Point2D
 * @typedef {import('./types.js').CoordinateSet} CoordinateSet
 */

export class BaseMode {
    /**
     * Constructor for base mode
     * @param {import('./ZoomPanel.js').ZoomPanel} zoomPanel - ZoomPanel instance
     * @param {import('./StateManager.js').StateManager} stateManager - State manager instance
     */
    constructor(zoomPanel, stateManager) {
        /** @type {import('./ZoomPanel.js').ZoomPanel} */
        this.zoomPanel = zoomPanel;
        /** @type {import('./StateManager.js').StateManager} */
        this.stateManager = stateManager;
        /** @type {string} */
        this.modeName = 'base';
        /** @type {boolean} */
        this.isActive = false;
        /** @type {Object.<string, HTMLElement>} */
        this.uiElements = {};
    }

    /**
     * Activate this mode - called when switching to this mode
     * Override in subclasses to perform mode-specific initialization
     */
    activate() {
        this.isActive = true;
        this.createUI();
        console.log(`${this.modeName} mode activated`);
    }

    /**
     * Deactivate this mode - called when switching away from this mode
     * Override in subclasses to perform mode-specific cleanup
     */
    deactivate() {
        this.isActive = false;
        this.cleanup();
        this.destroyUI();
        console.log(`${this.modeName} mode deactivated`);
    }

    /**
     * Handle mouse down events
     * @param {MouseEvent} event - Mouse event
     * @param {CoordinateSet} coords - All coordinate representations
     */
    handleMouseDown(event, coords) {
        // Default implementation - override in subclasses for mode-specific behavior
    }

    /**
     * Handle mouse move events
     * @param {MouseEvent} event - Mouse event
     * @param {CoordinateSet} coords - All coordinate representations
     */
    handleMouseMove(event, coords) {
        // Default implementation - override in subclasses for mode-specific behavior
    }

    /**
     * Handle mouse up events
     * @param {MouseEvent} event - Mouse event
     * @param {CoordinateSet} coords - All coordinate representations
     */
    handleMouseUp(event, coords) {
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
     * Update displays with mode-specific values
     * @param {CoordinateSet} coords - Current cursor coordinates
     */
    updateDisplays(coords) {
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
     */
    createUI() {
        // Default implementation - initialize uiElements
        this.uiElements = {};
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
                    element.parentNode.removeChild(element);
                }
            });
            this.uiElements = {};
        }
    }

    /**
     * Get a snapshot of current mode-specific state
     * @returns {*} Mode-specific state snapshot
     */
    getStateSnapshot() {
        // Default implementation - override in subclasses
        return {
            modeName: this.modeName,
            isActive: this.isActive
        };
    }

    /**
     * Get initial state for this mode
     * Override in subclasses to provide mode-specific initial state
     * @returns {*} Mode-specific initial state object
     */
    static getInitialState() {
        // Default implementation - override in subclasses
        return {};
    }

    /**
     * Get mode-specific cursor style
     * @returns {string} CSS cursor style
     */
    getCursorStyle() {
        return 'default';
    }

    /**
     * Check if this mode handles drag operations
     * @returns {boolean} True if mode handles dragging
     */
    handlesDrag() {
        return false;
    }

    /**
     * Get mode display name for UI
     * @returns {string} Display name
     */
    getDisplayName() {
        return this.modeName.charAt(0).toUpperCase() + this.modeName.slice(1);
    }
}