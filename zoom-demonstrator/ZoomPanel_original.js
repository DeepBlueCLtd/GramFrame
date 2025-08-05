/**
 * ZoomPanel Component
 * 
 * Encapsulates zoom/pan functionality for spectrograms
 * Designed to be integrated into GramFrame as one of many features
 * 
 * @typedef {import('./types.js').TestImageConfig} TestImageConfig
 * @typedef {import('./types.js').Point2D} Point2D
 * @typedef {import('./types.js').InteractionMode} InteractionMode
 * @typedef {import('./types.js').ZoomState} ZoomState
 * @typedef {import('./types.js').CoordinateSet} CoordinateSet
 */

import { CoordinateSystem } from './coordinates.js';
import { UI } from './ui.js';
import { HTMLAxisRenderer } from './htmlAxes.js';
import { TransformManager } from './transformManager.js';

export class ZoomPanel {
    /**
     * @param {HTMLElement} container - Container element for the zoom panel
     * @param {TestImageConfig} initialImageConfig - Initial image configuration
     */
    constructor(container, initialImageConfig) {
        /** @type {HTMLElement} */
        this.container = container;
        
        /** @type {InteractionMode} */
        this.currentMode = 'pan';
        /** @type {boolean} */
        this.isMouseDown = false;
        /** @type {Point2D} */
        this.startPoint = { x: 0, y: 0 };
        /** @type {number} */
        this.dragThreshold = 3; // pixels
        /** @type {boolean} */
        this.isDragging = false;
        
        /** @type {TestImageConfig} */
        this.currentImageConfig = initialImageConfig;
        
        this.initializeComponents();
        this.setupEventListeners();
        this.updateDisplay();
    }
    
    /**
     * Initialize internal components
     */
    initializeComponents() {
        // Get DOM elements
        this.svg = this.container.querySelector('#demo-svg');
        this.demoContainer = this.container.querySelector('#demo-container');
        this.selectionRect = this.container.querySelector('#selection-rect');
        this.testImage = this.container.querySelector('#test-image');
        this.clippedContent = this.container.querySelector('#clipped-content');
        
        if (!this.svg || !this.demoContainer || !this.selectionRect || !this.testImage || !this.clippedContent) {
            throw new Error('Required DOM elements not found in container');
        }
        
        // Initialize coordinate system
        this.coordinateSystem = new CoordinateSystem(
            this.currentImageConfig.dataRange, 
            this.currentImageConfig.nativeWidth, 
            this.currentImageConfig.nativeHeight
        );
        
        // Initialize TransformManager
        this.transformManager = new TransformManager(this.coordinateSystem, this.demoContainer);
        
        // Initialize UI
        this.ui = new UI(this);
        
        // Initialize HTML overlay axis renderer
        this.axisRenderer = new HTMLAxisRenderer(this.transformManager, this);
        
        console.log('ZoomPanel initialized with image:', this.currentImageConfig.description);
    }
    
    /**
     * Set up event listeners for zoom/pan interactions
     */
    setupEventListeners() {
        // Mouse events for pan/zoom interactions
        this.svg.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.svg.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.svg.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.svg.addEventListener('contextmenu', this.handleRightClick.bind(this));
        
        // Prevent context menu
        this.svg.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    /**
     * Handle mouse down events
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseDown(event) {
        event.preventDefault();
        this.isMouseDown = true;
        this.isDragging = false;
        
        /** @type {DOMRect} */
        const rect = this.svg.getBoundingClientRect();
        this.startPoint = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
        
        if (this.currentMode === 'zoom') {
            this.startSelectionRect();
        }
    }
    
    /**
     * Handle mouse move events
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseMove(event) {
        /** @type {DOMRect} */
        const rect = this.svg.getBoundingClientRect();
        /** @type {number} */
        const screenX = event.clientX - rect.left;
        /** @type {number} */
        const screenY = event.clientY - rect.top;
        
        // Update coordinate display regardless of mouse state
        this.updateCoordinateDisplay(screenX, screenY);
        
        if (!this.isMouseDown) return;
        
        // Check if we've moved enough to start dragging
        /** @type {number} */
        const deltaX = screenX - this.startPoint.x;
        /** @type {number} */
        const deltaY = screenY - this.startPoint.y;
        /** @type {number} */
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance > this.dragThreshold) {
            this.isDragging = true;
        }
        
        if (!this.isDragging) return;
        
        if (this.currentMode === 'pan') {
            this.transformManager.updatePan(deltaX, deltaY);
            // Update start point for next delta calculation
            this.startPoint.x = screenX;
            this.startPoint.y = screenY;
            this.applyTransform();
        } else if (this.currentMode === 'zoom') {
            this.updateSelectionRect(screenX, screenY);
        }
    }
    
    /**
     * Handle mouse up events
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseUp(event) {
        if (!this.isMouseDown) return;
        
        this.isMouseDown = false;
        
        if (this.currentMode === 'zoom' && this.isDragging) {
            this.finishZoomSelection();
        }
        
        this.isDragging = false;
        this.hideSelectionRect();
    }
    
    /**
     * Handle right click events
     * @param {MouseEvent} event - Mouse event
     */
    handleRightClick(event) {
        event.preventDefault();
        this.resetZoom();
    }
    
    /**
     * Set interaction mode
     * @param {InteractionMode} mode - New interaction mode
     */
    setMode(mode) {
        this.currentMode = mode;
        this.ui.updateStatus(`Switched to ${mode} mode`);
    }
    
    /**
     * Switch to a new image configuration
     * @param {TestImageConfig} imageConfig - New image configuration
     */
    switchImage(imageConfig) {
        this.currentImageConfig = imageConfig;
        
        // Update test image source and use native dimensions
        this.testImage.setAttribute('href', imageConfig.src);
        this.testImage.setAttribute('x', '0');
        this.testImage.setAttribute('y', '0');
        this.testImage.setAttribute('width', imageConfig.nativeWidth.toString());
        this.testImage.setAttribute('height', imageConfig.nativeHeight.toString());
        
        // Update SVG viewBox and container to match image dimensions
        this.svg.setAttribute('viewBox', `0 0 ${imageConfig.nativeWidth} ${imageConfig.nativeHeight}`);
        this.demoContainer.style.width = `${imageConfig.nativeWidth}px`;
        this.demoContainer.style.height = `${imageConfig.nativeHeight}px`;
        
        // Update clipping path to match image dimensions
        /** @type {SVGRectElement} */
        const clipRect = this.container.querySelector('#data-area-clip rect');
        clipRect.setAttribute('width', imageConfig.nativeWidth.toString());
        clipRect.setAttribute('height', imageConfig.nativeHeight.toString());
        
        // Update UI layer transform for coordinate system inversion
        /** @type {SVGGElement} */
        const uiLayer = this.container.querySelector('#ui-layer');
        uiLayer.setAttribute('transform', `scale(1, -1) translate(0, -${imageConfig.nativeHeight})`);
        
        // Update border rectangle in UI layer
        /** @type {SVGRectElement} */
        const borderRect = this.container.querySelector('#ui-layer rect');
        borderRect.setAttribute('width', imageConfig.nativeWidth.toString());
        borderRect.setAttribute('height', imageConfig.nativeHeight.toString());
        
        // Update axes
        /** @type {SVGLineElement} */
        const freqAxis = this.container.querySelector('#axes-group line:first-child');
        /** @type {SVGLineElement} */
        const timeAxis = this.container.querySelector('#axes-group line:last-child');
        freqAxis.setAttribute('x2', imageConfig.nativeWidth.toString());
        timeAxis.setAttribute('y2', imageConfig.nativeHeight.toString());
        
        // Update coordinate system with new dimensions
        this.coordinateSystem.updateDataRange(
            imageConfig.dataRange, 
            imageConfig.nativeWidth, 
            imageConfig.nativeHeight
        );
        
        // Update TransformManager with new coordinate system
        this.transformManager.updateCoordinateSystem(this.coordinateSystem);
        
        // Reset zoom state
        this.resetZoom();
        
        // Update axes for new image
        this.axisRenderer.updateAxes();
        
        this.ui.updateStatus(`Switched to ${imageConfig.description} (${imageConfig.nativeWidth}×${imageConfig.nativeHeight}px)`);
    }
    
    /**
     * Get current image dimensions
     * @returns {import('./types.js').ImageDimensions} Current image dimensions
     */
    getCurrentImageDimensions() {
        return this.transformManager.getImageDimensions();
    }
    
    /**
     * Get current zoom state (compatibility property)
     * @returns {ZoomState} Current zoom state
     */
    get zoomState() {
        return this.transformManager.getZoomState();
    }
    
    /**
     * Start selection rectangle for zoom mode
     */
    startSelectionRect() {
        // Get coordinates without Y inversion for selection rectangle
        /** @type {Point2D} */
        const svgPoint = this.coordinateSystem.screenToSVG(this.startPoint.x, this.startPoint.y, false);
        
        this.selectionRect.setAttribute('x', svgPoint.x.toString());
        this.selectionRect.setAttribute('y', svgPoint.y.toString());
        this.selectionRect.setAttribute('width', '0');
        this.selectionRect.setAttribute('height', '0');
        this.selectionRect.style.display = 'block';
    }
    
    /**
     * Update selection rectangle during zoom drag
     * @param {number} screenX - Current screen X coordinate
     * @param {number} screenY - Current screen Y coordinate
     */
    updateSelectionRect(screenX, screenY) {
        // Get coordinates without Y inversion for selection rectangle
        /** @type {Point2D} */
        const startSVG = this.coordinateSystem.screenToSVG(this.startPoint.x, this.startPoint.y, false);
        /** @type {Point2D} */
        const currentSVG = this.coordinateSystem.screenToSVG(screenX, screenY, false);
        
        /** @type {number} */
        const x = Math.min(startSVG.x, currentSVG.x);
        /** @type {number} */
        const y = Math.min(startSVG.y, currentSVG.y);
        /** @type {number} */
        const width = Math.abs(currentSVG.x - startSVG.x);
        /** @type {number} */
        const height = Math.abs(currentSVG.y - startSVG.y);
        
        this.selectionRect.setAttribute('x', x.toString());
        this.selectionRect.setAttribute('y', y.toString());
        this.selectionRect.setAttribute('width', width.toString());
        this.selectionRect.setAttribute('height', height.toString());
    }
    
    /**
     * Finish zoom selection and apply zoom
     */
    finishZoomSelection() {
        /** @type {SVGRectElement} */
        const rect = this.selectionRect;
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
            this.ui.updateStatus('Selection too small for zoom');
            return;
        }
        
        // Apply inverse transform to get actual coordinates in image space
        /** @type {ZoomState} */
        const zoomState = this.zoomState;
        /** @type {number} */
        const actualX = (x - zoomState.panX) / zoomState.scaleX;
        /** @type {number} */
        const actualY = (y - zoomState.panY) / zoomState.scaleY;
        /** @type {number} */
        const actualWidth = width / zoomState.scaleX;
        /** @type {number} */
        const actualHeight = height / zoomState.scaleY;
        
        this.zoomToRect(actualX, actualY, actualWidth, actualHeight);
    }
    
    /**
     * Zoom to a rectangle in SVG coordinates
     * @param {number} x - Rectangle X coordinate
     * @param {number} y - Rectangle Y coordinate  
     * @param {number} width - Rectangle width
     * @param {number} height - Rectangle height
     */
    zoomToRect(x, y, width, height) {
        this.transformManager.zoomToRect(x, y, width, height);
        this.applyTransform();
        /** @type {ZoomState} */
        const zoomState = this.transformManager.getZoomState();
        this.ui.updateStatus(`Zoomed: ${zoomState.scaleX.toFixed(2)}x × ${zoomState.scaleY.toFixed(2)}x`);
    }
    
    /**
     * Hide selection rectangle
     */
    hideSelectionRect() {
        this.selectionRect.style.display = 'none';
    }
    
    /**
     * Zoom by factor around center
     * @param {number} factor - Zoom factor
     */
    zoomByFactor(factor) {
        this.transformManager.zoomByFactor(factor);
        this.applyTransform();
        this.ui.updateStatus(`Zoom: ${factor}x applied around center`);
    }
    
    /**
     * Reset zoom to 1:1 scale
     */
    resetZoom() {
        this.transformManager.resetTransform();
        this.applyTransform();
        this.ui.updateStatus('Zoom reset to 1:1 scale');
    }
    
    /**
     * Apply current transform to the SVG
     */
    applyTransform() {
        // Apply transform to the clipped content group
        /** @type {string} */
        const transform = this.transformManager.getTransformString();
        this.clippedContent.setAttribute('transform', transform);
        
        this.updateDisplay();
        
        // Update axes after zoom/pan
        this.axisRenderer.updateAxes();
    }
    
    /**
     * Update coordinate display for given screen coordinates
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     */
    updateCoordinateDisplay(screenX, screenY) {
        /** @type {CoordinateSet} */
        const coords = this.transformManager.getAllCoordinates(screenX, screenY);
        this.ui.updateCoordinates(coords);
    }
    
    /**
     * Update display (placeholder for future enhancements)
     */
    updateDisplay() {
        // This will be called after transforms are applied
        // Future enhancements can be added here
    }
    
    /**
     * Destroy the zoom panel and clean up resources
     */
    destroy() {
        this.axisRenderer.destroy();
        // Remove event listeners if needed
        // Additional cleanup can be added here
    }
}