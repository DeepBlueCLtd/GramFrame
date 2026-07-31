/**
 * ZoomPanel Component - Phase 2 with BaseMode Architecture
 * 
 * Encapsulates zoom/pan functionality using BaseMode pattern
 * Integrates with centralized state management and mode switching
 * following GramFrame architecture patterns.
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
import { StateManager } from './StateManager.js';
import { ModeManager } from './ModeManager.js';

export class ZoomPanel {
    /**
     * @param {HTMLElement} container - Container element for the zoom panel
     * @param {TestImageConfig} initialImageConfig - Initial image configuration
     */
    constructor(container, initialImageConfig) {
        /** @type {HTMLElement} */
        this.container = container;
        /** @type {TestImageConfig} */
        this.currentImageConfig = initialImageConfig;
        
        this.initializeComponents();
        this.setupEventListeners();
        this.setupResizeObserver();
        this.updateDisplay();
        
        console.log('ZoomPanel Phase 2 initialized with BaseMode architecture');
    }
    
    /**
     * Initialize internal components with BaseMode architecture
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
        
        // Initialize State Manager with listener pattern
        this.stateManager = new StateManager();
        this.setupStateListeners();
        
        // Initialize UI first (before ModeManager)
        this.ui = new UI(this);
        
        // Initialize HTML overlay axis renderer
        this.axisRenderer = new HTMLAxisRenderer(this.transformManager, this);
        
        // Initialize Mode Manager after UI is ready
        this.modeManager = new ModeManager(this, this.stateManager);
        
        // Update initial state
        this.stateManager.updateImageConfig(this.currentImageConfig);
        this.stateManager.updateZoomState(this.transformManager.getZoomState());
    }
    
    /**
     * Set up state change listeners
     */
    setupStateListeners() {
        this.stateManager.addListener((state) => {
            // Handle state changes that affect the UI
            if (state.eventHistory.length > 0) {
                const lastEvent = state.eventHistory[state.eventHistory.length - 1];
                
                switch (lastEvent.action) {
                    case 'mode_change':
                        this.onModeChanged(lastEvent.newMode);
                        break;
                    case 'zoom_state_update':
                        this.onZoomStateChanged(lastEvent.newZoomState);
                        break;
                    case 'status_update':
                        // UI already handles this
                        break;
                }
            }
        });
    }
    
    /**
     * Handle mode change events
     * @param {InteractionMode} newMode - New active mode
     */
    onModeChanged(newMode) {
        // Update UI to reflect mode change
        console.log(`ZoomPanel: Mode changed to ${newMode}`);
        
        // Update any mode-specific UI elements
        this.updateModeUI(newMode);
    }
    
    /**
     * Handle zoom state change events
     * @param {ZoomState} newZoomState - New zoom state
     */
    onZoomStateChanged(newZoomState) {
        // Sync TransformManager if needed
        const currentState = this.transformManager.getZoomState();
        if (JSON.stringify(currentState) !== JSON.stringify(newZoomState)) {
            // State is out of sync, update TransformManager
            this.transformManager.setZoomLevel(newZoomState.scaleX, newZoomState.scaleY);
            this.transformManager.setViewOffset(newZoomState.panX, newZoomState.panY);
        }
    }
    
    /**
     * Update mode-specific UI elements
     * @param {InteractionMode} mode - Current mode
     */
    updateModeUI(mode) {
        // Update cursor and other mode-specific UI
        if (this.modeManager) {
            this.modeManager.updateCursor();
            
            // Update any mode indicators in the UI
            const modeDisplayName = this.modeManager.getCurrentModeDisplayName();
            // Could update a mode indicator here if needed
        }
    }
    
    /**
     * Set up event listeners for zoom/pan interactions
     */
    setupEventListeners() {
        // Mouse events - delegate to ModeManager
        this.svg.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.svg.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.svg.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.svg.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        this.svg.addEventListener('contextmenu', this.handleRightClick.bind(this));
        
        // Prevent context menu
        this.svg.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    /**
     * Setup ResizeObserver for responsive behavior
     */
    setupResizeObserver() {
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(entries => {
                this.handleResize(entries);
            });
            
            // Observe the container
            this.resizeObserver.observe(this.demoContainer);
            
            console.log('ResizeObserver initialized');
        } else {
            console.warn('ResizeObserver not available');
        }
    }
    
    /**
     * Handle resize events
     * @param {ResizeObserverEntry[]} entries - Resize observer entries
     */
    handleResize(entries) {
        // Update coordinate system for new container size
        this.coordinateSystem.updateContainerSize();
        
        // Update axis renderer
        this.axisRenderer.updateAxes();
        
        // Notify state manager
        this.stateManager.notifyStateChange({
            action: 'resize',
            containerSize: {
                width: this.demoContainer.clientWidth,
                height: this.demoContainer.clientHeight
            }
        });
    }
    
    /**
     * Handle mouse down events - delegate to ModeManager
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseDown(event) {
        const coords = this.getCoordinatesForEvent(event);
        this.modeManager.handleMouseDown(event, coords);
    }
    
    /**
     * Handle mouse move events - delegate to ModeManager
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseMove(event) {
        const coords = this.getCoordinatesForEvent(event);
        
        // Always update coordinate display
        this.updateCoordinateDisplay(coords.screen.x, coords.screen.y);
        
        // Delegate to mode manager
        this.modeManager.handleMouseMove(event, coords);
    }
    
    /**
     * Handle mouse up events - delegate to ModeManager
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseUp(event) {
        const coords = this.getCoordinatesForEvent(event);
        this.modeManager.handleMouseUp(event, coords);
    }
    
    /**
     * Handle mouse leave events - delegate to ModeManager
     */
    handleMouseLeave() {
        this.modeManager.handleMouseLeave();
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
     * Get coordinates for a mouse event
     * @param {MouseEvent} event - Mouse event
     * @returns {CoordinateSet} All coordinate representations
     */
    getCoordinatesForEvent(event) {
        /** @type {DOMRect} */
        const rect = this.svg.getBoundingClientRect();
        /** @type {number} */
        const screenX = event.clientX - rect.left;
        /** @type {number} */
        const screenY = event.clientY - rect.top;
        
        return this.transformManager.getAllCoordinates(screenX, screenY);
    }
    
    /**
     * Set interaction mode - delegate to ModeManager
     * @param {InteractionMode} mode - New interaction mode
     */
    setMode(mode) {
        this.modeManager.setMode(mode);
    }
    
    /**
     * Get current mode
     * @returns {InteractionMode} Current mode
     */
    getCurrentMode() {
        return this.modeManager.getCurrentModeName();
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
        if (clipRect) {
            clipRect.setAttribute('width', imageConfig.nativeWidth.toString());
            clipRect.setAttribute('height', imageConfig.nativeHeight.toString());
        }
        
        // Update UI layer transform for coordinate system inversion
        /** @type {SVGGElement} */
        const uiLayer = this.container.querySelector('#ui-layer');
        if (uiLayer) {
            uiLayer.setAttribute('transform', `scale(1, -1) translate(0, -${imageConfig.nativeHeight})`);
        }
        
        // Update border rectangle in UI layer
        /** @type {SVGRectElement} */
        const borderRect = this.container.querySelector('#ui-layer rect');
        if (borderRect) {
            borderRect.setAttribute('width', imageConfig.nativeWidth.toString());
            borderRect.setAttribute('height', imageConfig.nativeHeight.toString());
        }
        
        // Update axes
        /** @type {SVGLineElement} */
        const freqAxis = this.container.querySelector('#axes-group line:first-child');
        /** @type {SVGLineElement} */
        const timeAxis = this.container.querySelector('#axes-group line:last-child');
        if (freqAxis) freqAxis.setAttribute('x2', imageConfig.nativeWidth.toString());
        if (timeAxis) timeAxis.setAttribute('y2', imageConfig.nativeHeight.toString());
        
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
        this.axisRenderer.clearLabels();
        this.axisRenderer.updateAxes();
        
        // Update state manager
        this.stateManager.updateImageConfig(imageConfig);
        
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
     * Zoom by factor around center
     * @param {number} factor - Zoom factor
     */
    zoomByFactor(factor) {
        this.transformManager.zoomByFactor(factor);
        this.applyTransform();
        this.ui.updateStatus(`Zoom: ${factor}x applied around center`);
        
        // Update state
        this.stateManager.updateZoomState(this.transformManager.getZoomState());
    }
    
    /**
     * Reset zoom to 1:1 scale
     */
    resetZoom() {
        this.transformManager.resetTransform();
        this.applyTransform();
        this.ui.updateStatus('Zoom reset to 1:1 scale');
        
        // Update state
        this.stateManager.updateZoomState(this.transformManager.getZoomState());
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
        
        // Update state
        this.stateManager.updateZoomState(this.transformManager.getZoomState());
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
        
        // Update state with cursor position
        this.stateManager.updateCursorPosition(coords);
        
        // Update mode displays
        this.modeManager.updateDisplays(coords);
    }
    
    /**
     * Update display (placeholder for future enhancements)
     */
    updateDisplay() {
        // Render persistent features for active mode
        this.modeManager.renderPersistentFeatures();
        
        // Render cursor for active mode
        this.modeManager.renderCursor();
    }
    
    /**
     * Get current state snapshot
     * @returns {*} Current state
     */
    getState() {
        return this.stateManager.getState();
    }
    
    /**
     * Get mode manager instance
     * @returns {ModeManager} Mode manager
     */
    getModeManager() {
        return this.modeManager;
    }
    
    /**
     * Get state manager instance
     * @returns {StateManager} State manager
     */
    getStateManager() {
        return this.stateManager;
    }
    
    /**
     * Destroy the zoom panel and clean up resources
     */
    destroy() {
        // Clean up resize observer
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        
        // Clean up mode manager
        this.modeManager.destroy();
        
        // Clean up axis renderer
        this.axisRenderer.destroy();
        
        // Clean up state listeners
        this.stateManager.listeners = [];
        
        console.log('ZoomPanel Phase 2 destroyed');
    }
}