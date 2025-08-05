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
import { TransformManager } from './transformManager.js';

class ZoomDemonstrator {
    constructor() {
        this.currentMode = 'pan';
        this.isMouseDown = false;
        this.startPoint = { x: 0, y: 0 };
        this.dragThreshold = 3; // pixels
        this.isDragging = false;
        
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
            },
            'mock': {
                src: '../sample/mock-gram.png',
                dataRange: { minX: 0, maxX: 150, minY: 0, maxY: 60 },
                nativeWidth: 902,
                nativeHeight: 237,
                description: 'Mock Gram (0-150 Hz, 0-60 s)'
            }
        };
        
        this.currentImage = 'offset'; // Default to offset-axes as specified
        
        this.init();
    }
    
    init() {
        // Get DOM elements first
        this.svg = document.getElementById('demo-svg');
        this.demoContainer = document.getElementById('demo-container');
        this.selectionRect = document.getElementById('selection-rect');
        this.testImage = document.getElementById('test-image');
        this.clippedContent = document.getElementById('clipped-content');
        
        // Initialize coordinate system with offset-axes test image
        const imageConfig = this.testImages[this.currentImage];
        this.coordinateSystem = new CoordinateSystem(
            imageConfig.dataRange, 
            imageConfig.nativeWidth, 
            imageConfig.nativeHeight
        );
        
        // Initialize TransformManager
        this.transformManager = new TransformManager(this.coordinateSystem, this.demoContainer);
        
        // Initialize UI
        this.ui = new UI(this);
        
        // Initialize HTML overlay axis renderer with TransformManager
        this.axisRenderer = new HTMLAxisRenderer(this.transformManager, this);
        
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
        document.getElementById('image-mock').addEventListener('click', () => this.switchTestImage('mock'));
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
            this.transformManager.updatePan(deltaX, deltaY);
            // Update start point for next delta calculation
            this.startPoint.x = screenX;
            this.startPoint.y = screenY;
            this.applyTransform();
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
        return this.transformManager.getImageDimensions();
    }
    
    // Compatibility property for components that expect zoomState
    get zoomState() {
        return this.transformManager.getZoomState();
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
        this.transformManager.zoomToRect(x, y, width, height);
        this.applyTransform();
        const zoomState = this.transformManager.getZoomState();
        this.ui.updateStatus(`Zoomed: ${zoomState.scaleX.toFixed(2)}x × ${zoomState.scaleY.toFixed(2)}x`);
    }
    
    hideSelectionRect() {
        this.selectionRect.style.display = 'none';
    }
    
    zoomByFactor(factor) {
        this.transformManager.zoomByFactor(factor);
        this.applyTransform();
        this.ui.updateStatus(`Zoom: ${factor}x applied around center`);
    }
    
    zoomOut() {
        const factor = 0.8;
        this.zoomByFactor(factor);
        this.ui.updateStatus(`Right-click zoom out: ${factor}x`);
    }
    
    resetZoom() {
        this.transformManager.resetTransform();
        this.applyTransform();
        this.ui.updateStatus('Zoom reset to 1:1 scale');
    }
    
    applyTransform() {
        // Apply transform to the clipped content group
        const transform = this.transformManager.getTransformString();
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
        
        // Update TransformManager with new coordinate system
        this.transformManager.updateCoordinateSystem(this.coordinateSystem);
        
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
        const coords = this.transformManager.getAllCoordinates(screenX, screenY);
        this.ui.updateCoordinates(coords);
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