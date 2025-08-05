/**
 * Pan Mode for Zoom Demonstrator
 * 
 * Handles drag-to-pan interactions for moving the view around
 * the spectrogram image. Extends BaseMode following GramFrame patterns.
 * 
 * @typedef {import('./types.js').Point2D} Point2D
 * @typedef {import('./types.js').CoordinateSet} CoordinateSet
 */

import { BaseMode } from './BaseMode.js';

export class PanMode extends BaseMode {
    constructor(zoomPanel, stateManager) {
        super(zoomPanel, stateManager);
        /** @type {string} */
        this.modeName = 'pan';
        /** @type {boolean} */
        this.isMouseDown = false;
        /** @type {boolean} */
        this.isDragging = false;
        /** @type {Point2D} */
        this.startPoint = { x: 0, y: 0 };
        /** @type {number} */
        this.dragThreshold = 3; // pixels
    }

    /**
     * Activate pan mode
     */
    activate() {
        super.activate();
        this.resetState();
        this.zoomPanel.ui.updateStatus('Pan mode active - drag to move the view');
    }

    /**
     * Deactivate pan mode
     */
    deactivate() {
        super.deactivate();
        this.resetState();
    }

    /**
     * Handle mouse down events for pan mode
     * @param {MouseEvent} event - Mouse event
     * @param {CoordinateSet} coords - All coordinate representations
     */
    handleMouseDown(event, coords) {
        event.preventDefault();
        this.isMouseDown = true;
        this.isDragging = false;
        
        this.startPoint = {
            x: coords.screen.x,
            y: coords.screen.y
        };
        
        // Update cursor style
        this.zoomPanel.svg.style.cursor = 'grabbing';
    }

    /**
     * Handle mouse move events for pan mode
     * @param {MouseEvent} event - Mouse event
     * @param {CoordinateSet} coords - All coordinate representations
     */
    handleMouseMove(event, coords) {
        if (!this.isMouseDown) {
            // Update cursor style when hovering
            this.zoomPanel.svg.style.cursor = this.getCursorStyle();
            return;
        }
        
        // Check if we've moved enough to start dragging
        /** @type {number} */
        const deltaX = coords.screen.x - this.startPoint.x;
        /** @type {number} */
        const deltaY = coords.screen.y - this.startPoint.y;
        /** @type {number} */
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance > this.dragThreshold) {
            this.isDragging = true;
        }
        
        if (!this.isDragging) return;
        
        // Perform pan operation
        this.zoomPanel.transformManager.updatePan(deltaX, deltaY);
        
        // Update start point for next delta calculation
        this.startPoint.x = coords.screen.x;
        this.startPoint.y = coords.screen.y;
        
        // Apply the transform
        this.zoomPanel.applyTransform();
        
        // Update state
        this.stateManager.notifyStateChange({
            action: 'pan',
            delta: { x: deltaX, y: deltaY },
            zoomState: this.zoomPanel.transformManager.getZoomState()
        });
    }

    /**
     * Handle mouse up events for pan mode
     * @param {MouseEvent} event - Mouse event
     * @param {CoordinateSet} coords - All coordinate representations
     */
    handleMouseUp(event, coords) {
        if (!this.isMouseDown) return;
        
        this.isMouseDown = false;
        
        if (this.isDragging) {
            this.zoomPanel.ui.updateStatus('Pan completed');
        }
        
        this.isDragging = false;
        
        // Reset cursor style
        this.zoomPanel.svg.style.cursor = this.getCursorStyle();
        
        // Update state
        this.stateManager.notifyStateChange({
            action: 'pan_end',
            zoomState: this.zoomPanel.transformManager.getZoomState()
        });
    }

    /**
     * Handle mouse leave events
     */
    handleMouseLeave() {
        if (this.isMouseDown) {
            this.handleMouseUp(null, null);
        }
    }

    /**
     * Get guidance text for pan mode
     * @returns {string} HTML content for the guidance panel
     */
    getGuidanceText() {
        return `
            <h4>Pan Mode</h4>
            <p>• Click and drag to move the view</p>
            <p>• Right-click to reset zoom</p>
            <p>• Switch to Zoom mode for area selection</p>
        `;
    }

    /**
     * Reset pan mode state
     */
    resetState() {
        this.isMouseDown = false;
        this.isDragging = false;
        this.startPoint = { x: 0, y: 0 };
    }

    /**
     * Clean up pan mode
     */
    cleanup() {
        this.resetState();
        // Reset cursor if we were dragging
        if (this.zoomPanel.svg) {
            this.zoomPanel.svg.style.cursor = 'default';
        }
    }

    /**
     * Get mode-specific cursor style
     * @returns {string} CSS cursor style
     */
    getCursorStyle() {
        return this.isMouseDown ? 'grabbing' : 'grab';
    }

    /**
     * Check if this mode handles drag operations
     * @returns {boolean} True since pan mode handles dragging
     */
    handlesDrag() {
        return true;
    }

    /**
     * Get pan mode state snapshot
     * @returns {*} Pan mode state
     */
    getStateSnapshot() {
        return {
            ...super.getStateSnapshot(),
            isMouseDown: this.isMouseDown,
            isDragging: this.isDragging,
            startPoint: { ...this.startPoint }
        };
    }

    /**
     * Get initial state for pan mode
     * @returns {*} Pan mode initial state
     */
    static getInitialState() {
        return {
            panMode: {
                isMouseDown: false,
                isDragging: false,
                startPoint: { x: 0, y: 0 }
            }
        };
    }
}