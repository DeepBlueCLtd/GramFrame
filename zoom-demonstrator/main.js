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
        
        // Test image configurations
        this.testImages = {
            'offset': {
                src: '../sample/test-image-offset-axes.png',
                dataRange: { minX: 100, maxX: 900, minY: 100, maxY: 500 },
                description: 'Offset Axes (100-900 Hz, 100-500 time)'
            },
            'original': {
                src: '../sample/test-image.png', 
                dataRange: { minX: 0, maxX: 800, minY: 0, maxY: 400 },
                description: 'Original (0-800 Hz, 0-400 time)'
            },
            'scaled': {
                src: '../sample/test-image-scaled.png',
                dataRange: { minX: 0, maxX: 800, minY: 0, maxY: 400 },
                description: 'Scaled (0-800 Hz, 0-400 time)'
            }
        };
        
        this.currentImage = 'offset'; // Default to offset-axes as specified
        
        this.init();
    }
    
    init() {
        // Initialize coordinate system with offset-axes test image
        const imageConfig = this.testImages[this.currentImage];
        this.coordinateSystem = new CoordinateSystem(imageConfig.dataRange);
        
        // Initialize UI
        this.ui = new UI(this);
        
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
        
        console.log('ZoomDemonstrator initialized with offset-axes test image');
        console.log('Data coordinate ranges:', imageConfig.dataRange);
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
        this.zoomOut();
    }
    
    setMode(mode) {
        this.currentMode = mode;
        
        // Update UI
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        this.ui.updateStatus(`Switched to ${mode} mode`);
    }
    
    updatePan(deltaX, deltaY) {
        // Convert screen delta to SVG coordinate delta (accounting for current zoom)
        const svgDeltaX = deltaX / this.zoomState.scaleX;
        const svgDeltaY = deltaY / this.zoomState.scaleY;
        
        // Update pan offset
        this.zoomState.panX += svgDeltaX;
        this.zoomState.panY += svgDeltaY;
        
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
        const currentViewWidth = 1000; // SVG viewBox width in pixels
        const currentViewHeight = 500; // SVG viewBox height in pixels
        
        // The zoom factors are relative to the current view
        const zoomFactorX = currentViewWidth / (width * this.zoomState.scaleX);
        const zoomFactorY = currentViewHeight / (height * this.zoomState.scaleY);
        
        // Calculate the center of the selected rectangle in actual SVG coordinates
        const selectionCenterX = x + width / 2;
        const selectionCenterY = y + height / 2;
        
        // Calculate where this center should be positioned after zoom
        const viewCenterX = 500; // SVG viewBox center X (0 + 1000/2)
        const viewCenterY = 250; // SVG viewBox center Y (0 + 500/2)
        
        // Update zoom state
        this.zoomState.scaleX *= zoomFactorX;
        this.zoomState.scaleY *= zoomFactorY;
        
        // Calculate new pan offset to center the selection
        // We want: viewCenter = (selectionCenter * newScale) + newPan
        // So: newPan = viewCenter - (selectionCenter * newScale)
        this.zoomState.panX = viewCenterX - (selectionCenterX * this.zoomState.scaleX);
        this.zoomState.panY = viewCenterY - (selectionCenterY * this.zoomState.scaleY);
        
        this.applyTransform();
        this.ui.updateStatus(`Zoomed to selection: ${zoomFactorX.toFixed(2)}x × ${zoomFactorY.toFixed(2)}x`);
    }
    
    hideSelectionRect() {
        this.selectionRect.style.display = 'none';
    }
    
    zoomByFactor(factor) {
        // Calculate the center of the current view
        const viewCenterX = 500; // Center of viewport in SVG pixels
        const viewCenterY = 250;
        
        // Find what point in the image is currently at the center
        const imageCenterX = (viewCenterX - this.zoomState.panX) / this.zoomState.scaleX;
        const imageCenterY = (viewCenterY - this.zoomState.panY) / this.zoomState.scaleY;
        
        // Apply the zoom factor
        this.zoomState.scaleX *= factor;
        this.zoomState.scaleY *= factor;
        
        // Recalculate pan to keep the same image point at the center
        this.zoomState.panX = viewCenterX - (imageCenterX * this.zoomState.scaleX);
        this.zoomState.panY = viewCenterY - (imageCenterY * this.zoomState.scaleY);
        
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
    }
    
    switchTestImage(imageKey) {
        this.currentImage = imageKey;
        const config = this.testImages[imageKey];
        
        // Update test image source and position
        this.testImage.setAttribute('href', config.src);
        this.testImage.setAttribute('x', '0');
        this.testImage.setAttribute('y', '0');
        this.testImage.setAttribute('width', '1000');
        this.testImage.setAttribute('height', '500');
        
        // Update coordinate system
        this.coordinateSystem.updateDataRange(config.dataRange);
        
        // Reset zoom state
        this.resetZoom();
        
        // Update UI
        document.querySelectorAll('.zoom-btn[id^="image-"]').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`image-${imageKey}`).classList.add('active');
        
        this.ui.updateStatus(`Switched to ${config.description}`);
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