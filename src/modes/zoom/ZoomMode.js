/**
 * Zoom Mode for GramFrame
 * 
 * Simplified zoom mode that works with GramFrame architecture
 */

import { BaseMode } from '../BaseMode.js';

export class ZoomMode extends BaseMode {
    constructor(instance, state) {
        super(instance, state);
        this.modeName = 'zoom';
    }

    /**
     * Get initial state for zoom mode
     * @returns {Object} Initial state object
     */
    static getInitialState() {
        return {
            zoomMode: {
                active: false
            }
        };
    }

    /**
     * Activate zoom mode
     */
    activate() {
        super.activate();
        // Set zoom mode cursor
        if (this.instance.svg) {
            this.instance.svg.style.cursor = 'zoom-in';
        }
    }

    /**
     * Deactivate zoom mode
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
        return '<strong>Zoom Mode</strong><br>Select an area to zoom into, or use zoom controls.';
    }

    /**
     * Handle mouse down events
     * @param {MouseEvent} _event - Mouse event
     * @param {DataCoordinates} _dataCoords - Data coordinates
     */
    handleMouseDown(_event, _dataCoords) {
        // Zoom functionality is handled via zoom controls for now
    }

    /**
     * Handle mouse move events
     * @param {MouseEvent} _event - Mouse event
     * @param {DataCoordinates} _dataCoords - Data coordinates
     */
    handleMouseMove(_event, _dataCoords) {
        // Zoom functionality is handled via zoom controls for now
    }

    /**
     * Handle mouse up events
     * @param {MouseEvent} _event - Mouse event
     * @param {DataCoordinates} _dataCoords - Data coordinates
     */
    handleMouseUp(_event, _dataCoords) {
        // Zoom functionality is handled via zoom controls for now
    }
}