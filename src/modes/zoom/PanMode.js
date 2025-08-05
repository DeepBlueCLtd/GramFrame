/**
 * Pan Mode for GramFrame
 * 
 * Simplified pan mode that works with GramFrame architecture
 */

import { BaseMode } from '../BaseMode.js';

export class PanMode extends BaseMode {
    constructor(instance, state) {
        super(instance, state);
        this.modeName = 'pan';
    }

    /**
     * Get initial state for pan mode
     * @returns {Object} Initial state object
     */
    static getInitialState() {
        return {
            panMode: {
                active: false
            }
        };
    }

    /**
     * Activate pan mode
     */
    activate() {
        super.activate();
        // Set pan mode active
        if (this.instance.svg) {
            this.instance.svg.style.cursor = 'grab';
        }
    }

    /**
     * Deactivate pan mode
     */
    deactivate() {
        super.deactivate();
        // Reset cursor
        if (this.instance.svg) {
            this.instance.svg.style.cursor = 'crosshair';
        }
    }

    /**
     * Get guidance text for this mode
     * @returns {string} HTML guidance text
     */
    getGuidanceText() {
        return '<strong>Pan Mode</strong><br>Drag to move the view around the spectrogram when zoomed in.';
    }

    /**
     * Handle mouse down events
     * @param {MouseEvent} _event - Mouse event
     * @param {DataCoordinates} _dataCoords - Data coordinates
     */
    handleMouseDown(_event, _dataCoords) {
        // Pan functionality is handled in events.js
    }

    /**
     * Handle mouse move events
     * @param {MouseEvent} _event - Mouse event
     * @param {DataCoordinates} _dataCoords - Data coordinates
     */
    handleMouseMove(_event, _dataCoords) {
        // Pan functionality is handled in events.js
    }

    /**
     * Handle mouse up events
     * @param {MouseEvent} _event - Mouse event
     * @param {DataCoordinates} _dataCoords - Data coordinates
     */
    handleMouseUp(_event, _dataCoords) {
        // Pan functionality is handled in events.js
    }
}