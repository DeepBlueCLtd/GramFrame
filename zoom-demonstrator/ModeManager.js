/**
 * Mode Manager for Zoom Demonstrator
 * 
 * Manages mode switching and delegates events to the active mode
 * following GramFrame mode management patterns.
 * 
 * @typedef {import('./types.js').InteractionMode} InteractionMode
 * @typedef {import('./types.js').CoordinateSet} CoordinateSet
 */

import { PanMode } from './PanMode.js';
import { ZoomMode } from './ZoomMode.js';

export class ModeManager {
    /**
     * @param {import('./ZoomPanel.js').ZoomPanel} zoomPanel - ZoomPanel instance
     * @param {import('./StateManager.js').StateManager} stateManager - State manager instance
     */
    constructor(zoomPanel, stateManager) {
        /** @type {import('./ZoomPanel.js').ZoomPanel} */
        this.zoomPanel = zoomPanel;
        /** @type {import('./StateManager.js').StateManager} */
        this.stateManager = stateManager;
        
        /** @type {Object.<string, import('./BaseMode.js').BaseMode>} */
        this.modes = {};
        /** @type {import('./BaseMode.js').BaseMode|null} */
        this.activeMode = null;
        /** @type {InteractionMode} */
        this.currentModeName = 'pan';
        
        this.initializeModes();
    }

    /**
     * Initialize all available modes
     */
    initializeModes() {
        // Create mode instances
        this.modes.pan = new PanMode(this.zoomPanel, this.stateManager);
        this.modes.zoom = new ZoomMode(this.zoomPanel, this.stateManager);
        
        // Set initial active mode
        this.setMode('pan');
        
        console.log('ModeManager initialized with modes:', Object.keys(this.modes));
    }

    /**
     * Switch to a different mode
     * @param {InteractionMode} modeName - Name of the mode to switch to
     */
    setMode(modeName) {
        if (!this.modes[modeName]) {
            console.error(`Unknown mode: ${modeName}`);
            return;
        }

        const oldMode = this.activeMode;
        const oldModeName = this.currentModeName;

        // Deactivate current mode
        if (this.activeMode) {
            this.activeMode.deactivate();
        }

        // Switch to new mode
        this.currentModeName = modeName;
        this.activeMode = this.modes[modeName];
        
        // Activate new mode
        this.activeMode.activate();
        
        // Update state
        this.stateManager.setCurrentMode(modeName);
        
        // Update UI cursor
        this.updateCursor();
        
        console.log(`Mode switched from ${oldModeName} to ${modeName}`);
        
        // Notify about mode change (don't include mode instances to avoid circular refs)
        this.stateManager.notifyStateChange({
            action: 'mode_switched',
            oldMode: oldModeName,
            newMode: modeName
        });
    }

    /**
     * Get current active mode
     * @returns {import('./BaseMode.js').BaseMode|null} Active mode instance
     */
    getActiveMode() {
        return this.activeMode;
    }

    /**
     * Get current mode name
     * @returns {InteractionMode} Current mode name
     */
    getCurrentModeName() {
        return this.currentModeName;
    }

    /**
     * Get all available modes
     * @returns {string[]} Array of mode names
     */
    getAvailableModes() {
        return Object.keys(this.modes);
    }

    /**
     * Check if a mode exists
     * @param {string} modeName - Mode name to check
     * @returns {boolean} True if mode exists
     */
    hasMode(modeName) {
        return this.modes.hasOwnProperty(modeName);
    }

    /**
     * Delegate mouse down event to active mode
     * @param {MouseEvent} event - Mouse event
     * @param {CoordinateSet} coords - All coordinate representations
     */
    handleMouseDown(event, coords) {
        if (this.activeMode) {
            this.stateManager.setInteracting(true);
            this.activeMode.handleMouseDown(event, coords);
        }
    }

    /**
     * Delegate mouse move event to active mode
     * @param {MouseEvent} event - Mouse event
     * @param {CoordinateSet} coords - All coordinate representations
     */
    handleMouseMove(event, coords) {
        if (this.activeMode) {
            this.activeMode.handleMouseMove(event, coords);
        }
    }

    /**
     * Delegate mouse up event to active mode
     * @param {MouseEvent} event - Mouse event
     * @param {CoordinateSet} coords - All coordinate representations
     */
    handleMouseUp(event, coords) {
        if (this.activeMode) {
            this.activeMode.handleMouseUp(event, coords);
            this.stateManager.setInteracting(false);
        }
    }

    /**
     * Delegate mouse leave event to active mode
     */
    handleMouseLeave() {
        if (this.activeMode) {
            this.activeMode.handleMouseLeave();
            this.stateManager.setInteracting(false);
        }
    }

    /**
     * Update cursor style based on active mode
     */
    updateCursor() {
        if (this.activeMode && this.zoomPanel.svg) {
            const cursorStyle = this.activeMode.getCursorStyle();
            this.zoomPanel.svg.style.cursor = cursorStyle;
        }
    }

    /**
     * Get guidance text for current mode
     * @returns {string} HTML guidance text
     */
    getCurrentModeGuidance() {
        if (this.activeMode) {
            return this.activeMode.getGuidanceText();
        }
        return '<p>No active mode</p>';
    }

    /**
     * Reset all modes to initial state
     */
    resetAllModes() {
        Object.values(this.modes).forEach(mode => {
            mode.resetState();
        });
        
        this.stateManager.notifyStateChange({
            action: 'all_modes_reset'
        });
    }

    /**
     * Get state snapshot for all modes
     * @returns {*} Combined mode state snapshot
     */
    getAllModeStates() {
        const modeStates = {};
        Object.entries(this.modes).forEach(([name, mode]) => {
            modeStates[name] = mode.getStateSnapshot();
        });
        
        return {
            currentMode: this.currentModeName,
            modes: modeStates
        };
    }

    /**
     * Update displays for active mode
     * @param {CoordinateSet} coords - Current cursor coordinates
     */
    updateDisplays(coords) {
        if (this.activeMode) {
            this.activeMode.updateDisplays(coords);
        }
    }

    /**
     * Render persistent features for active mode
     */
    renderPersistentFeatures() {
        if (this.activeMode) {
            this.activeMode.renderPersistentFeatures();
        }
    }

    /**
     * Render cursor for active mode
     */
    renderCursor() {
        if (this.activeMode) {
            this.activeMode.renderCursor();
        }
    }

    /**
     * Check if active mode handles drag operations
     * @returns {boolean} True if active mode handles dragging
     */
    activeHandlesDrag() {
        return this.activeMode ? this.activeMode.handlesDrag() : false;
    }

    /**
     * Get display name for current mode
     * @returns {string} Display name
     */
    getCurrentModeDisplayName() {
        return this.activeMode ? this.activeMode.getDisplayName() : 'Unknown';
    }

    /**
     * Cleanup and destroy all modes
     */
    destroy() {
        // Deactivate current mode
        if (this.activeMode) {
            this.activeMode.deactivate();
        }
        
        // Clean up all modes
        Object.values(this.modes).forEach(mode => {
            mode.cleanup();
        });
        
        this.modes = {};
        this.activeMode = null;
        
        console.log('ModeManager destroyed');
    }
}