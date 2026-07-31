/**
 * State Manager for Zoom Demonstrator
 * 
 * Provides centralized state management with listener pattern
 * following GramFrame state management patterns.
 * Manages mode state, zoom/pan state, and notifies listeners of changes.
 * 
 * @typedef {import('./types.js').ZoomState} ZoomState
 * @typedef {import('./types.js').InteractionMode} InteractionMode
 * @typedef {import('./types.js').TestImageConfig} TestImageConfig
 */

import { PanMode } from './PanMode.js';
import { ZoomMode } from './ZoomMode.js';

/**
 * State change listener function
 * @typedef {function} StateListener
 * @param {*} state - Current state object
 */

export class StateManager {
    constructor() {
        /** @type {StateListener[]} */
        this.listeners = [];
        /** @type {*} */
        this.state = this.createInitialState();
        /** @type {string} */
        this.instanceId = this.generateInstanceId();
    }

    /**
     * Create initial state combining all mode states
     * @returns {*} Initial state object
     */
    createInitialState() {
        // Build mode-specific initial state
        const modeStates = [
            PanMode.getInitialState(),
            ZoomMode.getInitialState()
        ];
        
        // Merge all mode states
        const modeInitialState = Object.assign({}, ...modeStates);
        
        return {
            version: '0.1.0',
            timestamp: new Date().toISOString(),
            instanceId: '',
            
            // Current mode and interaction state
            currentMode: 'pan', // 'pan' | 'zoom'
            isInteracting: false,
            
            // Zoom/pan state
            zoomState: {
                scaleX: 1.0,
                scaleY: 1.0,
                panX: 0,
                panY: 0
            },
            
            // Image and coordinate state
            imageConfig: null,
            coordinateSystem: null,
            
            // UI state
            cursorPosition: null,
            statusMessage: 'Ready',
            
            // Mode-specific states
            ...modeInitialState,
            
            // Event history for debugging
            eventHistory: []
        };
    }

    /**
     * Generate unique instance ID
     * @returns {string} Unique instance identifier
     */
    generateInstanceId() {
        return `zoom-demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Add a state change listener
     * @param {StateListener} listener - Listener function
     */
    addListener(listener) {
        if (typeof listener !== 'function') {
            throw new Error('Listener must be a function');
        }
        this.listeners.push(listener);
    }

    /**
     * Remove a state change listener
     * @param {StateListener} listener - Listener function to remove
     */
    removeListener(listener) {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * Notify all listeners of state changes
     * @param {*} changeData - Data about the state change
     */
    notifyStateChange(changeData) {
        // Update timestamp
        this.state.timestamp = new Date().toISOString();
        
        // Add to event history (keep last 100 events)
        this.state.eventHistory.push({
            timestamp: this.state.timestamp,
            ...changeData
        });
        if (this.state.eventHistory.length > 100) {
            this.state.eventHistory.shift();
        }
        
        // Create deep copy of state to prevent direct modification
        const stateCopy = JSON.parse(JSON.stringify(this.state));
        
        // Notify all listeners
        this.listeners.forEach(listener => {
            try {
                listener(stateCopy);
            } catch (error) {
                console.error('Error in state listener:', error);
            }
        });
    }

    /**
     * Update current mode
     * @param {InteractionMode} mode - New mode
     */
    setCurrentMode(mode) {
        const oldMode = this.state.currentMode;
        this.state.currentMode = mode;
        
        this.notifyStateChange({
            action: 'mode_change',
            oldMode,
            newMode: mode
        });
    }

    /**
     * Update zoom state
     * @param {ZoomState} zoomState - New zoom state
     */
    updateZoomState(zoomState) {
        const oldZoomState = { ...this.state.zoomState };
        this.state.zoomState = { ...zoomState };
        
        this.notifyStateChange({
            action: 'zoom_state_update',
            oldZoomState,
            newZoomState: zoomState
        });
    }

    /**
     * Update interaction state
     * @param {boolean} isInteracting - Whether user is currently interacting
     */
    setInteracting(isInteracting) {
        const wasInteracting = this.state.isInteracting;
        this.state.isInteracting = isInteracting;
        
        if (wasInteracting !== isInteracting) {
            this.notifyStateChange({
                action: 'interaction_state_change',
                isInteracting
            });
        }
    }

    /**
     * Update cursor position
     * @param {*} cursorPosition - Current cursor position data
     */
    updateCursorPosition(cursorPosition) {
        this.state.cursorPosition = cursorPosition;
        
        this.notifyStateChange({
            action: 'cursor_update',
            cursorPosition
        });
    }

    /**
     * Update status message
     * @param {string} message - Status message
     */
    updateStatus(message) {
        const oldMessage = this.state.statusMessage;
        this.state.statusMessage = message;
        
        this.notifyStateChange({
            action: 'status_update',
            oldMessage,
            newMessage: message
        });
    }

    /**
     * Update image configuration
     * @param {TestImageConfig} imageConfig - New image configuration
     */
    updateImageConfig(imageConfig) {
        const oldConfig = this.state.imageConfig;
        this.state.imageConfig = imageConfig;
        
        this.notifyStateChange({
            action: 'image_config_update',
            oldConfig,
            newConfig: imageConfig
        });
    }

    /**
     * Update mode-specific state
     * @param {string} modeName - Name of the mode
     * @param {*} modeState - Mode-specific state data
     */
    updateModeState(modeName, modeState) {
        const stateKey = `${modeName}Mode`;
        const oldState = this.state[stateKey];
        this.state[stateKey] = { ...oldState, ...modeState };
        
        this.notifyStateChange({
            action: 'mode_state_update',
            modeName,
            oldState,
            newState: this.state[stateKey]
        });
    }

    /**
     * Get current state (read-only copy)
     * @returns {*} Current state copy
     */
    getState() {
        return JSON.parse(JSON.stringify(this.state));
    }

    /**
     * Get current mode
     * @returns {InteractionMode} Current mode
     */
    getCurrentMode() {
        return this.state.currentMode;
    }

    /**
     * Get current zoom state
     * @returns {ZoomState} Current zoom state
     */
    getZoomState() {
        return { ...this.state.zoomState };
    }

    /**
     * Reset state to initial values
     */
    resetState() {
        const oldState = this.getState();
        this.state = this.createInitialState();
        this.state.instanceId = this.instanceId; // Preserve instance ID
        
        this.notifyStateChange({
            action: 'state_reset',
            oldState
        });
    }

    /**
     * Get state snapshot for debugging
     * @returns {*} Detailed state information
     */
    getDebugSnapshot() {
        return {
            state: this.getState(),
            listenerCount: this.listeners.length,
            instanceId: this.instanceId,
            created: this.state.timestamp
        };
    }

    /**
     * Export state for external use
     * @returns {*} Exportable state data
     */
    exportState() {
        return {
            version: this.state.version,
            currentMode: this.state.currentMode,
            zoomState: this.getZoomState(),
            imageConfig: this.state.imageConfig,
            timestamp: this.state.timestamp
        };
    }

    /**
     * Import state from external data
     * @param {*} stateData - State data to import
     */
    importState(stateData) {
        if (!stateData || typeof stateData !== 'object') {
            throw new Error('Invalid state data for import');
        }
        
        const oldState = this.getState();
        
        // Merge imported state with current state
        if (stateData.currentMode) this.state.currentMode = stateData.currentMode;
        if (stateData.zoomState) this.state.zoomState = { ...stateData.zoomState };
        if (stateData.imageConfig) this.state.imageConfig = stateData.imageConfig;
        
        this.notifyStateChange({
            action: 'state_import',
            oldState,
            importedData: stateData
        });
    }
}