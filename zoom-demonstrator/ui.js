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

import { transformCoordinates, applyTransform, zoomAt, resetTransform, calculateZoomCenter, CONFIG } from './coordinates.js';

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
        
        // Update cursor style based on position
        this.updateCursorStyle(mouseX, mouseY);
        
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
        const avgZoom = Math.sqrt(this.transform.zoomLevelX * this.transform.zoomLevelY);
        if (avgZoom > 1.0) {
            // Zoom out by 50% while maintaining current aspect ratio
            const zoomFactor = 0.5;
            this.transform.zoomLevelX = Math.max(0.1, this.transform.zoomLevelX * zoomFactor);
            this.transform.zoomLevelY = Math.max(0.1, this.transform.zoomLevelY * zoomFactor);
            
            // Adjust pan to keep center point fixed
            const rect = this.elements.svg.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;
            const coords = transformCoordinates(mouseX, mouseY, this.elements.svg, this.transform);
            
            // Keep the clicked point fixed during zoom out
            const clickedPointX = coords.svg.x;
            const clickedPointY = coords.svg.y;
            
            // Calculate where this point should be after zoom (same screen position)
            const screenClickX = mouseX - rect.left;
            const screenClickY = event.clientY - rect.top;
            
            // Calculate the SVG position this screen point should map to after zoom
            // We want: screenClickX/Y -> clickedPointX/Y after transform
            // Work backwards from screen position to required pan offset
            const svgRect = this.elements.svg.getBoundingClientRect();
            const viewBox = this.elements.svg.viewBox.baseVal;
            
            // Convert screen click to SVG without current transform
            const svgClickX = (screenClickX * (viewBox ? viewBox.width / svgRect.width : 1)) + (viewBox ? viewBox.x : 0);
            const svgClickY = (screenClickY * (viewBox ? viewBox.height / svgRect.height : 1)) + (viewBox ? viewBox.y : 0);
            
            // Set pan so that svgClickX/Y maps to clickedPointX/Y
            this.transform.panOffset.x = clickedPointX - svgClickX / this.transform.zoomLevelX;
            this.transform.panOffset.y = clickedPointY - svgClickY / this.transform.zoomLevelY;
            
            this.applyTransformAndNotify();
            
            if (this.transform.zoomLevelX !== this.transform.zoomLevelY) {
                this.updateStatus(`Zoomed out to ${this.transform.zoomLevelX.toFixed(1)}x × ${this.transform.zoomLevelY.toFixed(1)}x`);
            } else {
                this.updateStatus(`Zoomed out to ${this.transform.zoomLevelX.toFixed(1)}x`);
            }
        } else {
            // Reset to 1:1 zoom
            this.transform.zoomLevelX = 1.0;
            this.transform.zoomLevelY = 1.0;
            this.transform.panOffset = { x: 0, y: 0 };
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
        switch (action) {
            case 'in':
                // Uniform zoom in - maintain aspect ratio around current center
                const oldZoomIn = Math.sqrt(this.transform.zoomLevelX * this.transform.zoomLevelY);
                const newZoomIn = Math.max(0.1, Math.min(10.0, oldZoomIn * 2.0));
                
                // Calculate current center of view
                const currentCenterX = this.transform.panOffset.x + (CONFIG.imageWidth / this.transform.zoomLevelX) / 2;
                const currentCenterY = this.transform.panOffset.y + (CONFIG.imageHeight / this.transform.zoomLevelY) / 2;
                
                // Set new zoom levels
                this.transform.zoomLevelX = newZoomIn;
                this.transform.zoomLevelY = newZoomIn;
                
                // Adjust pan to keep center fixed
                this.transform.panOffset.x = currentCenterX - (CONFIG.imageWidth / newZoomIn) / 2;
                this.transform.panOffset.y = currentCenterY - (CONFIG.imageHeight / newZoomIn) / 2;
                
                this.updateStatus(`Zoomed in to ${newZoomIn.toFixed(1)}x`);
                break;
            case 'out':
                // Uniform zoom out - maintain aspect ratio around current center
                const oldZoomOut = Math.sqrt(this.transform.zoomLevelX * this.transform.zoomLevelY);
                const newZoomOut = Math.max(0.1, Math.min(10.0, oldZoomOut * 0.5));
                
                // Calculate current center of view
                const currentCenterXOut = this.transform.panOffset.x + (CONFIG.imageWidth / this.transform.zoomLevelX) / 2;
                const currentCenterYOut = this.transform.panOffset.y + (CONFIG.imageHeight / this.transform.zoomLevelY) / 2;
                
                // Set new zoom levels
                this.transform.zoomLevelX = newZoomOut;
                this.transform.zoomLevelY = newZoomOut;
                
                // Adjust pan to keep center fixed
                this.transform.panOffset.x = currentCenterXOut - (CONFIG.imageWidth / newZoomOut) / 2;
                this.transform.panOffset.y = currentCenterYOut - (CONFIG.imageHeight / newZoomOut) / 2;
                
                this.updateStatus(`Zoomed out to ${newZoomOut.toFixed(1)}x`);
                break;
            case 'reset':
                this.transform.zoomLevelX = 1.0;
                this.transform.zoomLevelY = 1.0;
                this.transform.panOffset = { x: 0, y: 0 };
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
        
        // Convert screen delta to SVG delta (accounting for separate X/Y zoom levels)
        const svgDeltaX = deltaX / this.transform.zoomLevelX;
        const svgDeltaY = deltaY / this.transform.zoomLevelY;
        
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
        
        // Convert to SVG coordinates for zoom calculation (with transform)
        const coords = transformCoordinates(mouseX, mouseY, this.elements.svg, this.transform);
        this.state.selectionStart = coords.svg;
        
        // Log mouse down location in data coordinates
        console.log('DRAG START - Mouse down at data coords:', coords.data ? `(${coords.data.x.toFixed(1)}, ${coords.data.y.toFixed(1)})` : 'outside image');
        console.log('DRAG START - Screen coords:', `(${mouseX}, ${mouseY})`);
        console.log('DRAG START - SVG coords (for zoom calc):', `(${coords.svg.x.toFixed(1)}, ${coords.svg.y.toFixed(1)})`);
        
        // With perfect coordinate alignment, the selection rectangle should be positioned
        // where the cursor visually appears, which is simply the data coordinates converted to SVG
        
        if (coords.data && coords.image) {
            // With perfect alignment: data coords map directly to SVG coords (with Y inversion)
            const visualSvgX = coords.data.x; // Direct mapping for frequency
            const visualSvgY = CONFIG.timeMax - coords.data.y; // Invert Y for time
            
            console.log('DRAG START - Visual SVG position:', `(${visualSvgX.toFixed(1)}, ${visualSvgY.toFixed(1)})`);
            
            // Store and position rectangle at visual location
            this.state.selectionStartScreen = { x: visualSvgX, y: visualSvgY };
            
            this.elements.selectionRect.style.display = 'block';
            this.elements.selectionRect.setAttribute('x', visualSvgX);
            this.elements.selectionRect.setAttribute('y', visualSvgY);
            this.elements.selectionRect.setAttribute('width', 0);
            this.elements.selectionRect.setAttribute('height', 0);
        } else {
            // Fallback to raw coordinates if outside data area
            const rect = this.elements.svg.getBoundingClientRect();
            const viewBox = this.elements.svg.viewBox.baseVal;
            
            const rawSvgX = mouseX * (viewBox.width / rect.width) + viewBox.x;
            const rawSvgY = mouseY * (viewBox.height / rect.height) + viewBox.y;
            
            console.log('DRAG START - Raw SVG coords (fallback):', `(${rawSvgX.toFixed(1)}, ${rawSvgY.toFixed(1)})`);
            
            this.state.selectionStartScreen = { x: rawSvgX, y: rawSvgY };
            
            this.elements.selectionRect.style.display = 'block';
            this.elements.selectionRect.setAttribute('x', rawSvgX);
            this.elements.selectionRect.setAttribute('y', rawSvgY);
            this.elements.selectionRect.setAttribute('width', 0);
            this.elements.selectionRect.setAttribute('height', 0);
        }
        
        this.updateStatus('Drag to select zoom area...');
    }
    
    /**
     * Handle zoom selection drag
     * @param {number} mouseX - Current mouse X coordinate
     * @param {number} mouseY - Current mouse Y coordinate
     */
    handleZoomSelection(mouseX, mouseY) {
        if (!this.state.isSelecting || !this.state.selectionStartScreen) return;
        
        // Get current visual position using the same approach as start
        const coords = transformCoordinates(mouseX, mouseY, this.elements.svg, this.transform);
        let currentVisual;
        
        if (coords.data && coords.image) {
            // With perfect alignment: data coords map directly to SVG coords (with Y inversion)
            currentVisual = { 
                x: coords.data.x, // Direct mapping for frequency
                y: CONFIG.timeMax - coords.data.y // Invert Y for time
            };
        } else {
            // Fallback to raw coordinates if outside data area
            const rect = this.elements.svg.getBoundingClientRect();
            const viewBox = this.elements.svg.viewBox.baseVal;
            
            currentVisual = {
                x: mouseX * (viewBox.width / rect.width) + viewBox.x,
                y: mouseY * (viewBox.height / rect.height) + viewBox.y
            };
        }
        
        const start = this.state.selectionStartScreen;
        
        // Calculate selection rectangle bounds
        const x = Math.min(start.x, currentVisual.x);
        const y = Math.min(start.y, currentVisual.y);
        const width = Math.abs(currentVisual.x - start.x);
        const height = Math.abs(currentVisual.y - start.y);
        
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
        
        // Log mouse release location and rectangle bounds
        console.log('DRAG END - Mouse release at data coords:', coords.data ? `(${coords.data.x.toFixed(1)}, ${coords.data.y.toFixed(1)})` : 'outside image');
        console.log('DRAG END - Screen coords:', `(${mouseX}, ${mouseY})`);
        console.log('DRAG END - SVG coords (for zoom calc):', `(${end.x.toFixed(1)}, ${end.y.toFixed(1)})`);
        
        // Log the actual rectangle bounds as drawn on screen
        const rectElement = this.elements.selectionRect;
        const rectX = parseFloat(rectElement.getAttribute('x'));
        const rectY = parseFloat(rectElement.getAttribute('y'));
        const rectWidth = parseFloat(rectElement.getAttribute('width'));
        const rectHeight = parseFloat(rectElement.getAttribute('height'));
        console.log('DRAG END - Rectangle bounds (SVG):', `x=${rectX.toFixed(1)}, y=${rectY.toFixed(1)}, w=${rectWidth.toFixed(1)}, h=${rectHeight.toFixed(1)}`);
        
        // Calculate selection area
        const width = Math.abs(end.x - start.x);
        const height = Math.abs(end.y - start.y);
        
        // Only zoom if selection is large enough
        if (width > 10 && height > 10) {
            // Calculate the selection bounds
            const selectionLeft = Math.min(start.x, end.x);
            const selectionRight = Math.max(start.x, end.x);
            const selectionBottom = Math.min(start.y, end.y);  
            const selectionTop = Math.max(start.y, end.y);
            
            // Calculate the selection dimensions
            const selectionWidth = selectionRight - selectionLeft;
            const selectionHeight = selectionTop - selectionBottom;
            
            // Calculate zoom factors to stretch selection to fill viewport
            const zoomX = CONFIG.imageWidth / selectionWidth;
            const zoomY = CONFIG.imageHeight / selectionHeight;
            
            // Set separate zoom levels for X and Y to change aspect ratio
            this.transform.zoomLevelX = Math.max(0.1, Math.min(10.0, zoomX));
            this.transform.zoomLevelY = Math.max(0.1, Math.min(10.0, zoomY));
            
            // Set pan offset so the selection fills the viewport exactly
            this.transform.panOffset.x = selectionLeft;
            this.transform.panOffset.y = selectionBottom;
            
            this.applyTransformAndNotify();
            
            const aspectChange = (this.transform.zoomLevelX / this.transform.zoomLevelY).toFixed(2);
            this.updateStatus(`Zoomed to selection (${this.transform.zoomLevelX.toFixed(1)}x × ${this.transform.zoomLevelY.toFixed(1)}x, aspect ${aspectChange})`);
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
        const dataText = coords.image ? 
            `(${coords.data.x.toFixed(1)}, ${coords.data.y.toFixed(1)})` : 
            '(outside image)';
        const zoomText = this.transform.zoomLevelX !== this.transform.zoomLevelY ? 
            `${this.transform.zoomLevelX.toFixed(1)}x × ${this.transform.zoomLevelY.toFixed(1)}x` :
            `${this.transform.zoomLevelX.toFixed(1)}x`;
        const panText = `(${Math.round(this.transform.panOffset.x)}, ${Math.round(this.transform.panOffset.y)})`;
        
        this.elements.coordinates.textContent = 
            `Screen: ${screenText} | SVG: ${svgText} | Image: ${imageText} | Data: ${dataText} | Zoom: ${zoomText} | Pan: ${panText}`;
    }
    
    /**
     * Update cursor style based on mouse position
     * @param {number} mouseX - Mouse X coordinate
     * @param {number} mouseY - Mouse Y coordinate
     */
    updateCursorStyle(mouseX, mouseY) {
        const coords = transformCoordinates(mouseX, mouseY, this.elements.svg, this.transform);
        
        // Set crosshair cursor only when inside the image data area
        if (coords.image) {
            this.elements.svg.style.cursor = 'crosshair';
        } else {
            // Reset to default cursor or mode-specific cursor when outside data area
            if (this.state.isDragging) {
                this.elements.svg.style.cursor = 'grabbing';
            } else if (this.state.currentMode === 'pan') {
                this.elements.svg.style.cursor = 'grab';
            } else {
                this.elements.svg.style.cursor = 'default';
            }
        }
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