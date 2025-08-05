/**
 * Zoom Mode for Zoom Demonstrator
 * 
 * Handles rectangle selection for zoom-in operations.
 * Extends BaseMode following GramFrame patterns.
 * 
 * @typedef {import('./types.js').Point2D} Point2D
 * @typedef {import('./types.js').CoordinateSet} CoordinateSet
 * @typedef {import('./types.js').ZoomState} ZoomState
 */

import { BaseMode } from './BaseMode.js';

export class ZoomMode extends BaseMode {
    constructor(zoomPanel, stateManager) {
        super(zoomPanel, stateManager);
        /** @type {string} */
        this.modeName = 'zoom';
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
     * Activate zoom mode
     */
    activate() {
        super.activate();
        this.resetState();
        this.zoomPanel.ui.updateStatus('Zoom mode active - drag to select area for zoom in');
    }

    /**
     * Deactivate zoom mode
     */
    deactivate() {
        super.deactivate();
        this.resetState();
        this.hideSelectionRect();
    }

    /**
     * Handle mouse down events for zoom mode
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
        
        this.startSelectionRect();
    }

    /**
     * Handle mouse move events for zoom mode
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
        
        // Update selection rectangle
        this.updateSelectionRect(coords.screen.x, coords.screen.y);
        
        // Update state
        this.stateManager.notifyStateChange({
            action: 'zoom_select',
            selectionRect: this.getSelectionRectData(),
            startPoint: { ...this.startPoint },
            currentPoint: { x: coords.screen.x, y: coords.screen.y }
        });
    }

    /**
     * Handle mouse up events for zoom mode
     * @param {MouseEvent} event - Mouse event
     * @param {CoordinateSet} coords - All coordinate representations
     */
    handleMouseUp(event, coords) {
        if (!this.isMouseDown) return;
        
        this.isMouseDown = false;
        
        if (this.isDragging) {
            this.finishZoomSelection();
        }
        
        this.isDragging = false;
        this.hideSelectionRect();
        
        // Update state
        this.stateManager.notifyStateChange({
            action: 'zoom_end',
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
     * Start selection rectangle for zoom
     */
    startSelectionRect() {
        // Get coordinates without Y inversion for selection rectangle
        /** @type {Point2D} */
        const svgPoint = this.zoomPanel.coordinateSystem.screenToSVG(this.startPoint.x, this.startPoint.y, false);
        
        this.zoomPanel.selectionRect.setAttribute('x', svgPoint.x.toString());
        this.zoomPanel.selectionRect.setAttribute('y', svgPoint.y.toString());
        this.zoomPanel.selectionRect.setAttribute('width', '0');
        this.zoomPanel.selectionRect.setAttribute('height', '0');
        this.zoomPanel.selectionRect.style.display = 'block';
    }

    /**
     * Update selection rectangle during drag
     * @param {number} screenX - Current screen X coordinate
     * @param {number} screenY - Current screen Y coordinate
     */
    updateSelectionRect(screenX, screenY) {
        // Get coordinates without Y inversion for selection rectangle
        /** @type {Point2D} */
        const startSVG = this.zoomPanel.coordinateSystem.screenToSVG(this.startPoint.x, this.startPoint.y, false);
        /** @type {Point2D} */
        const currentSVG = this.zoomPanel.coordinateSystem.screenToSVG(screenX, screenY, false);
        
        /** @type {number} */
        const x = Math.min(startSVG.x, currentSVG.x);
        /** @type {number} */
        const y = Math.min(startSVG.y, currentSVG.y);
        /** @type {number} */
        const width = Math.abs(currentSVG.x - startSVG.x);
        /** @type {number} */
        const height = Math.abs(currentSVG.y - startSVG.y);
        
        this.zoomPanel.selectionRect.setAttribute('x', x.toString());
        this.zoomPanel.selectionRect.setAttribute('y', y.toString());
        this.zoomPanel.selectionRect.setAttribute('width', width.toString());
        this.zoomPanel.selectionRect.setAttribute('height', height.toString());
    }

    /**
     * Finish zoom selection and apply zoom
     */
    finishZoomSelection() {
        /** @type {SVGRectElement} */
        const rect = this.zoomPanel.selectionRect;
        /** @type {number} */
        const x = parseFloat(rect.getAttribute('x'));
        /** @type {number} */
        const y = parseFloat(rect.getAttribute('y'));
        /** @type {number} */
        const width = parseFloat(rect.getAttribute('width'));
        /** @type {number} */
        const height = parseFloat(rect.getAttribute('height'));
        
        // Minimum selection size to prevent accidental tiny zooms
        if (width < 10 || height < 10) {
            this.zoomPanel.ui.updateStatus('Selection too small for zoom');
            return;
        }
        
        // Apply inverse transform to get actual coordinates in image space
        /** @type {ZoomState} */
        const zoomState = this.zoomPanel.transformManager.getZoomState();
        /** @type {number} */
        const actualX = (x - zoomState.panX) / zoomState.scaleX;
        /** @type {number} */
        const actualY = (y - zoomState.panY) / zoomState.scaleY;
        /** @type {number} */
        const actualWidth = width / zoomState.scaleX;
        /** @type {number} */
        const actualHeight = height / zoomState.scaleY;
        
        // Perform zoom operation
        this.zoomPanel.transformManager.zoomToRect(actualX, actualY, actualWidth, actualHeight);
        this.zoomPanel.applyTransform();
        
        /** @type {ZoomState} */
        const newZoomState = this.zoomPanel.transformManager.getZoomState();
        this.zoomPanel.ui.updateStatus(`Zoomed: ${newZoomState.scaleX.toFixed(2)}x × ${newZoomState.scaleY.toFixed(2)}x`);
        
        // Update state
        this.stateManager.notifyStateChange({
            action: 'zoom_applied',
            selectionRect: { x: actualX, y: actualY, width: actualWidth, height: actualHeight },
            zoomState: newZoomState
        });
    }

    /**
     * Hide selection rectangle
     */
    hideSelectionRect() {
        if (this.zoomPanel.selectionRect) {
            this.zoomPanel.selectionRect.style.display = 'none';
        }
    }

    /**
     * Get current selection rectangle data
     * @returns {Object} Selection rectangle data
     */
    getSelectionRectData() {
        if (!this.zoomPanel.selectionRect) return null;
        
        return {
            x: parseFloat(this.zoomPanel.selectionRect.getAttribute('x') || '0'),
            y: parseFloat(this.zoomPanel.selectionRect.getAttribute('y') || '0'),
            width: parseFloat(this.zoomPanel.selectionRect.getAttribute('width') || '0'),
            height: parseFloat(this.zoomPanel.selectionRect.getAttribute('height') || '0')
        };
    }

    /**
     * Get guidance text for zoom mode
     * @returns {string} HTML content for the guidance panel
     */
    getGuidanceText() {
        return `
            <h4>Zoom Mode</h4>
            <p>• Click and drag to select area for zoom in</p>
            <p>• Right-click to reset zoom</p>
            <p>• Switch to Pan mode for view movement</p>
            <p>• Minimum selection size required</p>
        `;
    }

    /**
     * Reset zoom mode state
     */
    resetState() {
        this.isMouseDown = false;
        this.isDragging = false;
        this.startPoint = { x: 0, y: 0 };
        this.hideSelectionRect();
    }

    /**
     * Clean up zoom mode
     */
    cleanup() {
        this.resetState();
        // Reset cursor
        if (this.zoomPanel.svg) {
            this.zoomPanel.svg.style.cursor = 'default';
        }
    }

    /**
     * Get mode-specific cursor style
     * @returns {string} CSS cursor style
     */
    getCursorStyle() {
        return 'crosshair';
    }

    /**
     * Check if this mode handles drag operations
     * @returns {boolean} True since zoom mode handles dragging
     */
    handlesDrag() {
        return true;
    }

    /**
     * Get zoom mode state snapshot
     * @returns {*} Zoom mode state
     */
    getStateSnapshot() {
        return {
            ...super.getStateSnapshot(),
            isMouseDown: this.isMouseDown,
            isDragging: this.isDragging,
            startPoint: { ...this.startPoint },
            selectionRect: this.getSelectionRectData()
        };
    }

    /**
     * Get initial state for zoom mode
     * @returns {*} Zoom mode initial state
     */
    static getInitialState() {
        return {
            zoomMode: {
                isMouseDown: false,
                isDragging: false,
                startPoint: { x: 0, y: 0 },
                selectionRect: null
            }
        };
    }
}