/**
 * Drag-to-Zoom Demonstrator - Main Entry Point
 * 
 * Clean implementation approach for validating coordinate transformations
 * Primary test case: sample/test-image-offset-axes.png
 * - Image dimensions: 1000×500 pixels
 * - Data coordinate ranges: 100-900 Hz, 100-500 time units
 * - SVG coordinate space: 100-900, 100-500 (1:1 mapping with data coordinates)
 */

import { CoordinateSystem } from './coordinates.js';
import { UI } from './ui.js';
import { HTMLAxisRenderer } from './htmlAxes.js';

class ZoomDemonstrator {
    constructor() {
        this.currentMode = 'pan';
        this.isMouseDown = false;
        this.startPoint = { x: 0, y: 0 };
        this.dragThreshold = 3; // pixels
        this.isDragging = false;
        
        // Zoom and pan state with separate X/Y levels
        this.zoomState = {
            scaleX: 1.0,
            scaleY: 1.0,
            panX: 0,
            panY: 0
        };
        
        // Test image configurations with native dimensions
        this.testImages = {
            'offset': {
                src: '../sample/test-image-offset-axes.png',
                dataRange: { minX: 100, maxX: 900, minY: 100, maxY: 500 },
                nativeWidth: 1000,
                nativeHeight: 500,
                description: 'Offset Axes (100-900 Hz, 100-500 time)'
            },
            'original': {
                src: '../sample/test-image.png', 
                dataRange: { minX: 0, maxX: 800, minY: 0, maxY: 400 },
                nativeWidth: 800,
                nativeHeight: 400,
                description: 'Original (0-800 Hz, 0-400 time)'
            },
            'scaled': {
                src: '../sample/test-image-scaled.png',
                dataRange: { minX: 0, maxX: 800, minY: 0, maxY: 400 },
                nativeWidth: 900,
                nativeHeight: 300,
                description: 'Scaled (0-800 Hz, 0-400 time)'
            }
        };
        
        this.currentImage = 'offset'; // Default to offset-axes as specified
        
        this.init();
    }
    
    init() {
        // Initialize coordinate system with offset-axes test image
        const imageConfig = this.testImages[this.currentImage];
        this.coordinateSystem = new CoordinateSystem(
            imageConfig.dataRange, 
            imageConfig.nativeWidth, 
            imageConfig.nativeHeight
        );
        
        // Initialize UI
        this.ui = new UI(this);
        
        // Initialize HTML overlay axis renderer
        this.axisRenderer = new HTMLAxisRenderer(this.coordinateSystem, this);
        
        // Get DOM elements
        this.svg = document.getElementById('demo-svg');
        this.demoContainer = document.getElementById('demo-container');
        this.selectionRect = document.getElementById('selection-rect');
        this.testImage = document.getElementById('test-image');
        this.clippedContent = document.getElementById('clipped-content');
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Update initial display
        this.updateDisplay();
        
        // Render initial axes
        this.axisRenderer.updateAxes();
        
        console.log('ZoomDemonstrator initialized with offset-axes test image');
        console.log('Data coordinate ranges:', imageConfig.dataRange);
        console.log('Image dimensions:', imageConfig.nativeWidth, 'x', imageConfig.nativeHeight);
    }
    
    setupEventListeners() {
        // Mouse events for pan/zoom interactions
        this.svg.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.svg.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.svg.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.svg.addEventListener('contextmenu', this.handleRightClick.bind(this));
        
        // Prevent context menu
        this.svg.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Mode switching
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setMode(e.target.dataset.mode);
            });
        });
        
        // Zoom controls
        document.getElementById('zoom-in').addEventListener('click', () => this.zoomByFactor(2.0));
        document.getElementById('zoom-out').addEventListener('click', () => this.zoomByFactor(0.5));
        document.getElementById('zoom-reset').addEventListener('click', () => this.resetZoom());
        
        // Image switching
        document.getElementById('image-original').addEventListener('click', () => this.switchTestImage('original'));
        document.getElementById('image-scaled').addEventListener('click', () => this.switchTestImage('scaled'));
        document.getElementById('image-offset').addEventListener('click', () => this.switchTestImage('offset'));
    }
    
    handleMouseDown(event) {
        event.preventDefault();
        this.isMouseDown = true;
        this.isDragging = false;
        
        const rect = this.svg.getBoundingClientRect();
        this.startPoint = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
        
        if (this.currentMode === 'zoom') {
            this.startSelectionRect();
        }
    }
    
    handleMouseMove(event) {
        const rect = this.svg.getBoundingClientRect();
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;
        
        // Update coordinate display regardless of mouse state
        this.updateCoordinateDisplay(screenX, screenY);
        
        if (!this.isMouseDown) return;
        
        // Check if we've moved enough to start dragging
        const deltaX = screenX - this.startPoint.x;
        const deltaY = screenY - this.startPoint.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance > this.dragThreshold) {
            this.isDragging = true;
        }
        
        if (!this.isDragging) return;
        
        if (this.currentMode === 'pan') {
            this.updatePan(deltaX, deltaY);
            // Update start point for next delta calculation
            this.startPoint.x = screenX;
            this.startPoint.y = screenY;
        } else if (this.currentMode === 'zoom') {
            this.updateSelectionRect(screenX, screenY);
        }
    }
    
    handleMouseUp(event) {
        if (!this.isMouseDown) return;
        
        this.isMouseDown = false;
        
        if (this.currentMode === 'zoom' && this.isDragging) {
            this.finishZoomSelection();
        }
        
        this.isDragging = false;
        this.hideSelectionRect();
    }
    
    handleRightClick(event) {
        event.preventDefault();
                
        this.resetZoom();
    }
    
    setMode(mode) {
        this.currentMode = mode;
        
        // Update UI
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        this.ui.updateStatus(`Switched to ${mode} mode`);
    }
    
    getCurrentImageDimensions() {
        const config = this.testImages[this.currentImage];
        return {
            width: config.nativeWidth,
            height: config.nativeHeight
        };
    }
    
    updatePan(deltaX, deltaY) {
        // Pan should move 1:1 with mouse movement in screen space
        // No need to divide by scale - we want direct movement
        const dimensions = this.getCurrentImageDimensions();
        const svgDeltaX = deltaX * (dimensions.width / this.demoContainer.clientWidth);
        const svgDeltaY = deltaY * (dimensions.height / this.demoContainer.clientHeight);
        
        // Calculate new pan values
        let newPanX = this.zoomState.panX + svgDeltaX;
        let newPanY = this.zoomState.panY + svgDeltaY;
        
        // Calculate pan limits to prevent showing beyond image boundaries
        const viewportWidth = dimensions.width;
        const viewportHeight = dimensions.height;
        const scaledImageWidth = viewportWidth * this.zoomState.scaleX;
        const scaledImageHeight = viewportHeight * this.zoomState.scaleY;
        
        // Pan limits: keep image edges within viewport
        const maxPanX = 0; // Can't pan right (would show empty space on left)
        const minPanX = Math.min(0, viewportWidth - scaledImageWidth); // Can pan left to show right edge
        const maxPanY = 0; // Can't pan down (would show empty space on top)
        const minPanY = Math.min(0, viewportHeight - scaledImageHeight); // Can pan up to show bottom edge
        
        // Apply limits
        newPanX = Math.max(minPanX, Math.min(maxPanX, newPanX));
        newPanY = Math.max(minPanY, Math.min(maxPanY, newPanY));
        
        // Update pan state
        this.zoomState.panX = newPanX;
        this.zoomState.panY = newPanY;
        
        this.applyTransform();
    }
    
    startSelectionRect() {
        // Get coordinates without Y inversion for selection rectangle
        const svgPoint = this.coordinateSystem.screenToSVG(this.startPoint.x, this.startPoint.y, false);
        
        this.selectionRect.setAttribute('x', svgPoint.x);
        this.selectionRect.setAttribute('y', svgPoint.y);
        this.selectionRect.setAttribute('width', 0);
        this.selectionRect.setAttribute('height', 0);
        this.selectionRect.style.display = 'block';
    }
    
    updateSelectionRect(screenX, screenY) {
        // Get coordinates without Y inversion for selection rectangle
        const startSVG = this.coordinateSystem.screenToSVG(this.startPoint.x, this.startPoint.y, false);
        const currentSVG = this.coordinateSystem.screenToSVG(screenX, screenY, false);
        
        const x = Math.min(startSVG.x, currentSVG.x);
        const y = Math.min(startSVG.y, currentSVG.y);
        const width = Math.abs(currentSVG.x - startSVG.x);
        const height = Math.abs(currentSVG.y - startSVG.y);
        
        this.selectionRect.setAttribute('x', x);
        this.selectionRect.setAttribute('y', y);
        this.selectionRect.setAttribute('width', width);
        this.selectionRect.setAttribute('height', height);
    }
    
    finishZoomSelection() {
        const rect = this.selectionRect;
        const x = parseFloat(rect.getAttribute('x'));
        const y = parseFloat(rect.getAttribute('y'));
        const width = parseFloat(rect.getAttribute('width'));
        const height = parseFloat(rect.getAttribute('height'));
        
        // Minimum selection size to prevent accidental tiny zooms
        if (width < 10 || height < 10) {
            this.ui.updateStatus('Selection too small for zoom');
            return;
        }
        
        // Apply inverse transform to get actual coordinates in image space
        const actualX = (x - this.zoomState.panX) / this.zoomState.scaleX;
        const actualY = (y - this.zoomState.panY) / this.zoomState.scaleY;
        const actualWidth = width / this.zoomState.scaleX;
        const actualHeight = height / this.zoomState.scaleY;
        
        this.zoomToRect(actualX, actualY, actualWidth, actualHeight);
    }
    
    zoomToRect(x, y, width, height) {
        // x, y, width, height are in actual SVG coordinates (already inverse-transformed)
        
        // Calculate zoom factors for both axes (allowing aspect ratio changes)
        const dimensions = this.getCurrentImageDimensions();
        const currentViewWidth = dimensions.width; // SVG viewBox width in pixels
        const currentViewHeight = dimensions.height; // SVG viewBox height in pixels
        
        // Calculate absolute zoom levels needed
        const newScaleX = currentViewWidth / width;
        const newScaleY = currentViewHeight / height;
        
        // Calculate the center of the selected rectangle in actual SVG coordinates
        const selectionCenterX = x + width / 2;
        const selectionCenterY = y + height / 2;
        
        // Calculate where this center should be positioned after zoom
        const viewCenterX = dimensions.width / 2; // SVG viewBox center X
        const viewCenterY = dimensions.height / 2; // SVG viewBox center Y
        
        // Update zoom state with absolute scale values
        this.zoomState.scaleX = newScaleX;
        this.zoomState.scaleY = newScaleY;
        
        // Calculate new pan offset to center the selection
        // Transform: displayPoint = (imagePoint * scale) + pan
        // So: pan = displayPoint - (imagePoint * scale)
        let newPanX = viewCenterX - (selectionCenterX * newScaleX);
        let newPanY = viewCenterY - (selectionCenterY * newScaleY);
        
        // Apply pan limits (but allow negative pan for centering)
        const viewportWidth = dimensions.width;
        const viewportHeight = dimensions.height;
        const scaledImageWidth = viewportWidth * newScaleX;
        const scaledImageHeight = viewportHeight * newScaleY; 
        
        // For zoom operations, we need to allow negative pan to center properly
        // The limits should be based on keeping the image edges within the viewport
        const maxPanX = 0; // Can't pan right (would show empty space on left)
        const minPanX = Math.min(0, viewportWidth - scaledImageWidth); // Can pan left to show right edge
        const maxPanY = 0; // Can't pan down (would show empty space on top)
        const minPanY = Math.min(0, viewportHeight - scaledImageHeight); // Can pan up to show bottom edge
        
        this.zoomState.panX = Math.max(minPanX, Math.min(maxPanX, newPanX));
        this.zoomState.panY = Math.max(minPanY, Math.min(maxPanY, newPanY));
        
        this.applyTransform();
        this.ui.updateStatus(`Zoomed: ${newScaleX.toFixed(2)}x × ${newScaleY.toFixed(2)}x`);
    }
    
    hideSelectionRect() {
        this.selectionRect.style.display = 'none';
    }
    
    zoomByFactor(factor) {
        // Calculate the center of the current view
        const dimensions = this.getCurrentImageDimensions();
        const viewCenterX = dimensions.width / 2; // Center of viewport in SVG pixels
        const viewCenterY = dimensions.height / 2;
        
        // Find what point in the image is currently at the center
        const imageCenterX = (viewCenterX - this.zoomState.panX) / this.zoomState.scaleX;
        const imageCenterY = (viewCenterY - this.zoomState.panY) / this.zoomState.scaleY;
        
        // Apply the zoom factor
        this.zoomState.scaleX *= factor;
        this.zoomState.scaleY *= factor;
        
        // Recalculate pan to keep the same image point at the center
        let newPanX = viewCenterX - (imageCenterX * this.zoomState.scaleX);
        let newPanY = viewCenterY - (imageCenterY * this.zoomState.scaleY);
        
        // Apply pan limits (allow negative pan for centering)
        const viewportWidth = dimensions.width;
        const viewportHeight = dimensions.height;
        const scaledImageWidth = viewportWidth * this.zoomState.scaleX;
        const scaledImageHeight = viewportHeight * this.zoomState.scaleY;
        
        const maxPanX = 0;
        const minPanX = Math.min(0, viewportWidth - scaledImageWidth);
        const maxPanY = 0;
        const minPanY = Math.min(0, viewportHeight - scaledImageHeight);
        
        this.zoomState.panX = Math.max(minPanX, Math.min(maxPanX, newPanX));
        this.zoomState.panY = Math.max(minPanY, Math.min(maxPanY, newPanY));
        
        this.applyTransform();
        this.ui.updateStatus(`Zoom: ${factor}x applied around center`);
    }
    
    zoomOut() {
        const factor = 0.8;
        this.zoomByFactor(factor);
        this.ui.updateStatus(`Right-click zoom out: ${factor}x`);
    }
    
    resetZoom() {
        this.zoomState = {
            scaleX: 1.0,
            scaleY: 1.0,
            panX: 0,
            panY: 0
        };
        this.applyTransform();
        this.ui.updateStatus('Zoom reset to 1:1 scale');
    }
    
    applyTransform() {
        // Apply transform to the clipped content group
        const transform = `translate(${this.zoomState.panX}, ${this.zoomState.panY}) scale(${this.zoomState.scaleX}, ${this.zoomState.scaleY})`;
        this.clippedContent.setAttribute('transform', transform);
        
        this.updateDisplay();
        
        // Update axes after zoom/pan
        this.axisRenderer.updateAxes();
    }
    
    switchTestImage(imageKey) {
        this.currentImage = imageKey;
        const config = this.testImages[imageKey];
        
        // Update test image source and use native dimensions
        this.testImage.setAttribute('href', config.src);
        this.testImage.setAttribute('x', '0');
        this.testImage.setAttribute('y', '0');
        this.testImage.setAttribute('width', config.nativeWidth.toString());
        this.testImage.setAttribute('height', config.nativeHeight.toString());
        
        // Update SVG viewBox and container to match image dimensions
        this.svg.setAttribute('viewBox', `0 0 ${config.nativeWidth} ${config.nativeHeight}`);
        this.demoContainer.style.width = `${config.nativeWidth}px`;
        this.demoContainer.style.height = `${config.nativeHeight}px`;
        
        // Update clipping path to match image dimensions
        const clipRect = document.querySelector('#data-area-clip rect');
        clipRect.setAttribute('width', config.nativeWidth.toString());
        clipRect.setAttribute('height', config.nativeHeight.toString());
        
        // Update UI layer transform for coordinate system inversion
        const uiLayer = document.getElementById('ui-layer');
        uiLayer.setAttribute('transform', `scale(1, -1) translate(0, -${config.nativeHeight})`);
        
        // Update border rectangle in UI layer
        const borderRect = document.querySelector('#ui-layer rect');
        borderRect.setAttribute('width', config.nativeWidth.toString());
        borderRect.setAttribute('height', config.nativeHeight.toString());
        
        // Update axes
        const freqAxis = document.querySelector('#axes-group line:first-child');
        const timeAxis = document.querySelector('#axes-group line:last-child');
        freqAxis.setAttribute('x2', config.nativeWidth.toString());
        timeAxis.setAttribute('y2', config.nativeHeight.toString());
        
        // Update coordinate system with new dimensions
        this.coordinateSystem.updateDataRange(config.dataRange, config.nativeWidth, config.nativeHeight);
        
        // Update axis renderer coordinate system reference
        this.axisRenderer.coordinateSystem = this.coordinateSystem;
        
        // Reset zoom state
        this.resetZoom();
        
        // Update axes for new image
        this.axisRenderer.updateAxes();
        
        // Update UI
        document.querySelectorAll('.zoom-btn[id^="image-"]').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`image-${imageKey}`).classList.add('active');
        
        this.ui.updateStatus(`Switched to ${config.description} (${config.nativeWidth}×${config.nativeHeight}px)`);
    }
    
    updateCoordinateDisplay(screenX, screenY) {
        const svgCoords = this.coordinateSystem.screenToSVG(screenX, screenY);
        
        // Apply inverse of current zoom/pan transform to get actual coordinates
        const actualSvgX = (svgCoords.x - this.zoomState.panX) / this.zoomState.scaleX;
        const actualSvgY = (svgCoords.y - this.zoomState.panY) / this.zoomState.scaleY;
        
        const dataCoords = this.coordinateSystem.svgToData(actualSvgX, actualSvgY);
        const imageCoords = this.coordinateSystem.dataToImage(dataCoords.x, dataCoords.y);
        
        this.ui.updateCoordinates({
            screen: { x: screenX, y: screenY },
            svg: { x: actualSvgX, y: actualSvgY },
            image: imageCoords,
            data: dataCoords,
            zoom: { scaleX: this.zoomState.scaleX, scaleY: this.zoomState.scaleY },
            pan: { x: this.zoomState.panX, y: this.zoomState.panY }
        });
    }
    
    updateDisplay() {
        // Update coordinate display if mouse is over SVG
        // This will be called by mouse move handler
    }
}

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
    window.zoomDemo = new ZoomDemonstrator();
});