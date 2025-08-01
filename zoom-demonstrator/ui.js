/**
 * UI components and event handling for drag-to-zoom demonstrator
 * 
 * This module handles:
 * - Mode switching (Pan/Zoom)
 * - Mouse event handling for interactions
 * - Real-time coordinate display
 * - Zoom control buttons
 * - Visual feedback for user interactions
 */

import { transformCoordinates, applyTransform, zoomAt, resetTransform, calculateZoomCenter } from './coordinates.js';

/**
 * @typedef {Object} UIState
 * @property {string} currentMode - Current interaction mode ('pan' or 'zoom')
 * @property {boolean} isDragging - Whether user is currently dragging
 * @property {Point} dragStart - Starting point of current drag operation
 * @property {Point} lastPanPoint - Last point during pan operation
 * @property {boolean} isSelecting - Whether user is making zoom selection
 */

export class ZoomDemonstratorUI {
    constructor() {
        this.svg = null;
        this.transform = null;
        this.onTransformChange = null;
        
        // UI state
        this.state = {
            currentMode: 'pan',
            isDragging: false,
            dragStart: null,
            lastPanPoint: null,
            isSelecting: false
        };
        
        // DOM elements
        this.elements = {
            container: null,
            svg: null,
            coordinates: null,
            status: null,
            selectionRect: null,
            modeButtons: null,
            zoomButtons: null
        };
        
        // Bound event handlers
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);
        this.handleContextMenu = this.handleContextMenu.bind(this);
        this.handleModeChange = this.handleModeChange.bind(this);
        this.handleZoomButton = this.handleZoomButton.bind(this);
        this.handleImageSwitch = this.handleImageSwitch.bind(this);
    }
    
    /**
     * Initialize the UI with DOM elements and event listeners
     * @param {Object} config - Configuration object
     * @param {SVGSVGElement} config.svg - SVG element
     * @param {TransformState} config.transform - Transform state object
     * @param {Function} config.onTransformChange - Callback for transform changes
     */
    initialize(config) {
        this.svg = config.svg;
        this.transform = config.transform;
        this.onTransformChange = config.onTransformChange;
        
        // Get DOM elements
        this.elements.container = document.getElementById('demo-container');
        this.elements.svg = this.svg;
        this.elements.coordinates = document.getElementById('coordinates');
        this.elements.status = document.getElementById('status');
        this.elements.selectionRect = document.getElementById('selection-rect');
        this.elements.modeButtons = document.querySelectorAll('.mode-btn');
        this.elements.zoomButtons = {
            zoomIn: document.getElementById('zoom-in'),
            zoomOut: document.getElementById('zoom-out'),
            zoomReset: document.getElementById('zoom-reset')
        };
        this.elements.imageButtons = {
            original: document.getElementById('image-original'),
            scaled: document.getElementById('image-scaled')
        };
        this.elements.testImage = document.getElementById('test-image');
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize UI state
        this.updateStatus();
        this.updateCoordinateDisplay(400, 200); // Start with center coordinates
        
        console.log('ZoomDemonstratorUI initialized');
    }
    
    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Mouse events on SVG
        this.elements.svg.addEventListener('mousemove', this.handleMouseMove);
        this.elements.svg.addEventListener('mousedown', this.handleMouseDown);
        this.elements.svg.addEventListener('mouseup', this.handleMouseUp);
        this.elements.svg.addEventListener('mouseleave', this.handleMouseLeave);
        this.elements.svg.addEventListener('contextmenu', this.handleContextMenu);
        
        // Mode buttons
        this.elements.modeButtons.forEach(button => {
            button.addEventListener('click', this.handleModeChange);
        });
        
        // Zoom buttons
        this.elements.zoomButtons.zoomIn.addEventListener('click', () => this.handleZoomButton('in'));
        this.elements.zoomButtons.zoomOut.addEventListener('click', () => this.handleZoomButton('out'));
        this.elements.zoomButtons.zoomReset.addEventListener('click', () => this.handleZoomButton('reset'));
        
        // Image switch buttons
        this.elements.imageButtons.original.addEventListener('click', () => this.handleImageSwitch('original'));
        this.elements.imageButtons.scaled.addEventListener('click', () => this.handleImageSwitch('scaled'));
        
        // Prevent drag on images and other elements
        this.elements.container.addEventListener('dragstart', (e) => e.preventDefault());
    }
    
    /**
     * Handle mouse move events
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseMove(event) {
        const rect = this.elements.svg.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        // Update coordinate display
        this.updateCoordinateDisplay(mouseX, mouseY);
        
        // Handle mode-specific mouse move
        if (this.state.currentMode === 'pan' && this.state.isDragging) {
            this.handlePanDrag(mouseX, mouseY);
        } else if (this.state.currentMode === 'zoom' && this.state.isSelecting) {
            this.handleZoomSelection(mouseX, mouseY);
        }
    }
    
    /**
     * Handle mouse down events
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseDown(event) {
        if (event.button !== 0) return; // Only handle left mouse button
        
        const rect = this.elements.svg.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        this.state.dragStart = { x: mouseX, y: mouseY };
        
        if (this.state.currentMode === 'pan') {
            this.startPan(mouseX, mouseY);
        } else if (this.state.currentMode === 'zoom') {
            this.startZoomSelection(mouseX, mouseY);
        }
        
        event.preventDefault();
    }
    
    /**
     * Handle mouse up events
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseUp(event) {
        if (event.button !== 0) return; // Only handle left mouse button
        
        const rect = this.elements.svg.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        if (this.state.currentMode === 'pan' && this.state.isDragging) {
            this.endPan();
        } else if (this.state.currentMode === 'zoom' && this.state.isSelecting) {
            this.endZoomSelection(mouseX, mouseY);
        }
        
        event.preventDefault();
    }
    
    /**
     * Handle mouse leave events
     */
    handleMouseLeave() {
        if (this.state.isDragging) {
            this.endPan();
        }
        if (this.state.isSelecting) {
            this.cancelZoomSelection();
        }
    }
    
    /**
     * Handle context menu (right-click) events
     * @param {MouseEvent} event - Mouse event
     */
    handleContextMenu(event) {
        event.preventDefault();
        
        // Right-click zooms out or resets zoom
        if (this.transform.zoomLevel > 1.0) {
            const rect = this.elements.svg.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;
            
            const coords = transformCoordinates(mouseX, mouseY, this.elements.svg, this.transform);
            const zoomCenter = calculateZoomCenter(coords.svg, this.transform);
            
            zoomAt(this.transform, 0.5, zoomCenter);
            this.applyTransformAndNotify();
            this.updateStatus(`Zoomed out to ${this.transform.zoomLevel.toFixed(1)}x`);
        } else {
            resetTransform(this.transform);
            this.applyTransformAndNotify();
            this.updateStatus('Zoom reset to 1.0x');
        }
    }
    
    /**
     * Handle mode change button clicks
     * @param {Event} event - Click event
     */
    handleModeChange(event) {
        const newMode = event.target.dataset.mode;
        if (newMode && newMode !== this.state.currentMode) {
            this.setMode(newMode);
        }
    }
    
    /**
     * Handle image switch button clicks
     * @param {string} imageType - Image type ('original', 'scaled')
     */
    handleImageSwitch(imageType) {
        // Update button states
        this.elements.imageButtons.original.classList.toggle('active', imageType === 'original');
        this.elements.imageButtons.scaled.classList.toggle('active', imageType === 'scaled');
        
        // Switch the image source
        const imagePath = imageType === 'original' ? 
            '../sample/test-image.png' : 
            '../sample/test-image-scaled.png';
            
        this.elements.testImage.setAttribute('href', imagePath);
        
        // Reset zoom and pan when switching images
        import('./coordinates.js').then(({ resetTransform }) => {
            resetTransform(this.transform);
            this.applyTransformAndNotify();
            this.updateStatus(`Switched to ${imageType} test image and reset zoom`);
        });
        
        console.log(`Switched to ${imageType} test image`);
    }
    
    /**
     * Handle zoom button clicks
     * @param {string} action - Zoom action ('in', 'out', 'reset')
     */
    handleZoomButton(action) {
        // Use the center of the image data area (400, 200) as zoom center
        const zoomCenter = { x: 400, y: 200 };
        
        switch (action) {
            case 'in':
                zoomAt(this.transform, 2.0, zoomCenter);
                this.updateStatus(`Zoomed in to ${this.transform.zoomLevel.toFixed(1)}x`);
                break;
            case 'out':
                zoomAt(this.transform, 0.5, zoomCenter);
                this.updateStatus(`Zoomed out to ${this.transform.zoomLevel.toFixed(1)}x`);
                break;
            case 'reset':
                resetTransform(this.transform);
                this.updateStatus('Zoom reset to 1.0x');
                break;
        }
        
        this.applyTransformAndNotify();
    }
    
    /**
     * Set the current interaction mode
     * @param {string} mode - Mode to set ('pan' or 'zoom')
     */
    setMode(mode) {
        // Clean up current mode
        if (this.state.isDragging) {
            this.endPan();
        }
        if (this.state.isSelecting) {
            this.cancelZoomSelection();
        }
        
        this.state.currentMode = mode;
        
        // Update UI
        this.elements.modeButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.mode === mode);
        });
        
        // Update cursor style
        this.elements.container.style.cursor = mode === 'pan' ? 'grab' : 'crosshair';
        
        this.updateStatus();
        console.log(`Mode changed to: ${mode}`);
    }
    
    /**
     * Start pan operation
     * @param {number} mouseX - Mouse X coordinate
     * @param {number} mouseY - Mouse Y coordinate
     */
    startPan(mouseX, mouseY) {
        this.state.isDragging = true;
        this.state.lastPanPoint = { x: mouseX, y: mouseY };
        this.elements.container.style.cursor = 'grabbing';
        this.updateStatus('Panning view...');
    }
    
    /**
     * Handle pan drag operation
     * @param {number} mouseX - Current mouse X coordinate
     * @param {number} mouseY - Current mouse Y coordinate
     */
    handlePanDrag(mouseX, mouseY) {
        if (!this.state.isDragging || !this.state.lastPanPoint) return;
        
        const deltaX = mouseX - this.state.lastPanPoint.x;
        const deltaY = mouseY - this.state.lastPanPoint.y;
        
        // Convert screen delta to SVG delta (accounting for zoom)
        const svgDeltaX = deltaX / this.transform.zoomLevel;
        const svgDeltaY = deltaY / this.transform.zoomLevel;
        
        // Update pan offset
        this.transform.panOffset.x -= svgDeltaX;
        this.transform.panOffset.y -= svgDeltaY;
        
        this.state.lastPanPoint = { x: mouseX, y: mouseY };
        
        this.applyTransformAndNotify();
    }
    
    /**
     * End pan operation
     */
    endPan() {
        this.state.isDragging = false;
        this.state.lastPanPoint = null;
        this.elements.container.style.cursor = this.state.currentMode === 'pan' ? 'grab' : 'crosshair';
        this.updateStatus();
    }
    
    /**
     * Start zoom selection
     * @param {number} mouseX - Mouse X coordinate
     * @param {number} mouseY - Mouse Y coordinate
     */
    startZoomSelection(mouseX, mouseY) {
        this.state.isSelecting = true;
        
        // Convert to SVG coordinates for selection rectangle
        const coords = transformCoordinates(mouseX, mouseY, this.elements.svg, this.transform);
        this.state.selectionStart = coords.svg;
        
        // Show selection rectangle
        this.elements.selectionRect.style.display = 'block';
        this.elements.selectionRect.setAttribute('x', coords.svg.x);
        this.elements.selectionRect.setAttribute('y', coords.svg.y);
        this.elements.selectionRect.setAttribute('width', 0);
        this.elements.selectionRect.setAttribute('height', 0);
        
        this.updateStatus('Drag to select zoom area...');
    }
    
    /**
     * Handle zoom selection drag
     * @param {number} mouseX - Current mouse X coordinate
     * @param {number} mouseY - Current mouse Y coordinate
     */
    handleZoomSelection(mouseX, mouseY) {
        if (!this.state.isSelecting || !this.state.selectionStart) return;
        
        const coords = transformCoordinates(mouseX, mouseY, this.elements.svg, this.transform);
        const current = coords.svg;
        const start = this.state.selectionStart;
        
        // Calculate selection rectangle
        const x = Math.min(start.x, current.x);
        const y = Math.min(start.y, current.y);
        const width = Math.abs(current.x - start.x);
        const height = Math.abs(current.y - start.y);
        
        // Update selection rectangle
        this.elements.selectionRect.setAttribute('x', x);
        this.elements.selectionRect.setAttribute('y', y);
        this.elements.selectionRect.setAttribute('width', width);
        this.elements.selectionRect.setAttribute('height', height);
    }
    
    /**
     * End zoom selection and perform zoom
     * @param {number} mouseX - Final mouse X coordinate
     * @param {number} mouseY - Final mouse Y coordinate
     */
    endZoomSelection(mouseX, mouseY) {
        if (!this.state.isSelecting || !this.state.selectionStart) return;
        
        const coords = transformCoordinates(mouseX, mouseY, this.elements.svg, this.transform);
        const end = coords.svg;
        const start = this.state.selectionStart;
        
        // Calculate selection area
        const width = Math.abs(end.x - start.x);
        const height = Math.abs(end.y - start.y);
        
        // Only zoom if selection is large enough
        if (width > 10 && height > 10) {
            // Calculate zoom to fit selection
            const svgWidth = this.elements.svg.viewBox.baseVal.width || 800;
            const svgHeight = this.elements.svg.viewBox.baseVal.height || 400;
            
            const zoomX = svgWidth / width;
            const zoomY = svgHeight / height;
            const zoomFactor = Math.min(zoomX, zoomY) * 0.9; // Leave some margin
            
            // Calculate center of selection
            const centerX = (start.x + end.x) / 2;
            const centerY = (start.y + end.y) / 2;
            
            // Apply zoom
            const newZoom = Math.max(0.1, Math.min(10.0, this.transform.zoomLevel * zoomFactor));
            if (newZoom !== this.transform.zoomLevel) {
                this.transform.zoomLevel = newZoom;
                this.transform.panOffset.x = centerX - svgWidth / (2 * newZoom);
                this.transform.panOffset.y = centerY - svgHeight / (2 * newZoom);
                
                this.applyTransformAndNotify();
                this.updateStatus(`Zoomed to selection (${newZoom.toFixed(1)}x)`);
            }
        }
        
        this.cancelZoomSelection();
    }
    
    /**
     * Cancel zoom selection
     */
    cancelZoomSelection() {
        this.state.isSelecting = false;
        this.state.selectionStart = null;
        this.elements.selectionRect.style.display = 'none';
        this.updateStatus();
    }
    
    /**
     * Apply transform to SVG and notify of changes
     */
    applyTransformAndNotify() {
        applyTransform(this.elements.svg, this.transform);
        if (this.onTransformChange) {
            this.onTransformChange(this.transform);
        }
    }
    
    /**
     * Update coordinate display
     * @param {number} mouseX - Mouse X coordinate
     * @param {number} mouseY - Mouse Y coordinate
     */
    updateCoordinateDisplay(mouseX, mouseY) {
        const coords = transformCoordinates(mouseX, mouseY, this.elements.svg, this.transform);
        
        const screenText = `(${Math.round(coords.screen.x)}, ${Math.round(coords.screen.y)})`;
        const svgText = `(${Math.round(coords.svg.x)}, ${Math.round(coords.svg.y)})`;
        const imageText = coords.image ? 
            `(${Math.round(coords.image.x)}, ${Math.round(coords.image.y)})` : 
            '(outside)';
        const dataText = `(${coords.data.x.toFixed(1)}, ${coords.data.y.toFixed(1)})`;
        const zoomText = `${this.transform.zoomLevel.toFixed(1)}x`;
        const panText = `(${Math.round(this.transform.panOffset.x)}, ${Math.round(this.transform.panOffset.y)})`;
        
        this.elements.coordinates.textContent = 
            `Screen: ${screenText} | SVG: ${svgText} | Image: ${imageText} | Data: ${dataText} | Zoom: ${zoomText} | Pan: ${panText}`;
    }
    
    /**
     * Update status message
     * @param {string} message - Status message to display
     */
    updateStatus(message = null) {
        if (message) {
            this.elements.status.textContent = message;
        } else {
            // Default status based on current mode
            const modeText = this.state.currentMode === 'pan' ? 
                'Pan mode: Drag to move the view around' : 
                'Zoom mode: Drag to select area for zoom in, right-click to zoom out';
            this.elements.status.textContent = modeText;
        }
    }
    
    /**
     * Clean up event listeners and resources
     */
    destroy() {
        // Remove event listeners
        this.elements.svg.removeEventListener('mousemove', this.handleMouseMove);
        this.elements.svg.removeEventListener('mousedown', this.handleMouseDown);
        this.elements.svg.removeEventListener('mouseup', this.handleMouseUp);
        this.elements.svg.removeEventListener('mouseleave', this.handleMouseLeave);
        this.elements.svg.removeEventListener('contextmenu', this.handleContextMenu);
        
        this.elements.modeButtons.forEach(button => {
            button.removeEventListener('click', this.handleModeChange);
        });
        
        console.log('ZoomDemonstratorUI destroyed');
    }
}