/**
 * UI Components and Event Handling
 * 
 * Provides real-time coordinate display and user interface management
 * for the drag-to-zoom demonstrator
 * 
 * @typedef {import('./types.js').CoordinateSet} CoordinateSet
 */

export class UI {
    /**
     * @param {*} zoomDemo - ZoomDemonstrator instance
     */
    constructor(zoomDemo) {
        /** @type {*} */
        this.zoomDemo = zoomDemo;
        /** @type {HTMLElement|null} */
        this.coordinatesElement = document.getElementById('coordinates');
        /** @type {HTMLElement|null} */
        this.statusElement = document.getElementById('status');
        
        this.setupInitialState();
    }
    
    setupInitialState() {
        this.updateStatus('Demonstrator ready. Use Pan mode to drag the view, or Zoom mode to select area for zoom in.');
    }
    
    /**
     * Update real-time coordinate display
     * Shows screen, SVG, image, and data coordinates with zoom/pan state
     * @param {CoordinateSet} coords - All coordinate representations
     */
    updateCoordinates(coords) {
        /** @type {Point2D} */
        const screen = coords.screen;
        /** @type {Point2D} */
        const svg = coords.svg;
        /** @type {Point2D} */
        const image = coords.image;
        /** @type {Point2D} */
        const data = coords.data;
        /** @type {Point2D} */
        const zoom = coords.zoom;
        /** @type {Point2D} */
        const pan = coords.pan;
        
        // Format coordinates with appropriate precision
        const screenStr = `(${screen.x.toFixed(0)}, ${screen.y.toFixed(0)})`;
        const svgStr = `(${svg.x.toFixed(1)}, ${svg.y.toFixed(1)})`;
        const imageStr = `(${image.x.toFixed(0)}, ${image.y.toFixed(0)})`;
        const dataStr = `(${data.x.toFixed(1)} Hz, ${data.y.toFixed(1)} time)`;
        const zoomStr = zoom.x === zoom.y ? 
            `${zoom.x.toFixed(2)}x` : 
            `${zoom.x.toFixed(2)}x × ${zoom.y.toFixed(2)}x`;
        const panStr = `(${pan.x.toFixed(0)}, ${pan.y.toFixed(0)})`;
        
        // Update coordinate display with color coding
        this.coordinatesElement.innerHTML = `
            <span style="color: #00ff00;">Screen: ${screenStr}</span> | 
            <span style="color: #00ccff;">SVG: ${svgStr}</span> | 
            <span style="color: #ffaa00;">Image: ${imageStr}</span> | 
            <span style="color: #ffffff;">Data: ${dataStr}</span> | 
            <span style="color: #ff00ff;">Zoom: ${zoomStr}</span> | 
            <span style="color: #cccccc;">Pan: ${panStr}</span>
        `;
        
        // Validate coordinate transformations in real-time (for debugging)
        this.validateCoordinateAccuracy(coords);
    }
    
    /**
     * Update status message
     * @param {string} message - Status message to display
     */
    updateStatus(message) {
        this.statusElement.textContent = message;
        
        // Auto-clear status messages after 3 seconds (except ready state)
        if (!message.includes('ready') && !message.includes('Ready')) {
            setTimeout(() => {
                if (this.statusElement.textContent === message) {
                    this.statusElement.textContent = 'Ready. Use Pan mode to drag the view, or Zoom mode to select area for zoom in.';
                }
            }, 3000);
        }
    }
    
    /**
     * Validate coordinate transformation accuracy in real-time
     * Useful for debugging coordinate system issues
     */
    validateCoordinateAccuracy(coords) {
        const { screen, svg, data } = coords;
        
        // Check SVG-to-data 1:1 mapping
        const expectedDataX = svg.x;
        const expectedDataY = svg.y;
        const dataError = Math.abs(data.x - expectedDataX) + Math.abs(data.y - expectedDataY);
        
        // Check if we're within the expected data bounds
        const currentConfig = this.zoomDemo.currentImageConfig;
        const inBounds = (
            data.x >= currentConfig.dataRange.minX && 
            data.x <= currentConfig.dataRange.maxX &&
            data.y >= currentConfig.dataRange.minY && 
            data.y <= currentConfig.dataRange.maxY
        );
        
        // Visual feedback for coordinate validation
        if (dataError > 0.1) {
            this.coordinatesElement.style.backgroundColor = '#4a2a2a'; // Darker red for errors
        } else if (!inBounds) {
            this.coordinatesElement.style.backgroundColor = '#3a3a2a'; // Darker yellow for out of bounds
        } else {
            this.coordinatesElement.style.backgroundColor = '#2a2a2a'; // Normal dark background
        }
    }
    
    /**
     * Create visual debugging overlay for coordinate system
     * Shows grid lines at key coordinate positions
     */
    createDebugOverlay() {
        const svg = document.getElementById('demo-svg');
        const existingDebug = document.getElementById('debug-overlay');
        if (existingDebug) {
            existingDebug.remove();
        }
        
        // Create debug overlay group with Y-axis inversion
        const debugGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        debugGroup.id = 'debug-overlay';
        debugGroup.style.pointerEvents = 'none';
        debugGroup.setAttribute('transform', 'scale(1, -1) translate(0, -500)');
        
        const currentConfig = this.zoomDemo.currentImageConfig;
        const { minX, maxX, minY, maxY } = currentConfig.dataRange;
        
        // Add pink boundary around the entire SVG viewBox area
        const boundary = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        boundary.setAttribute('x', '0');
        boundary.setAttribute('y', '0');
        boundary.setAttribute('width', '1000');
        boundary.setAttribute('height', '500');
        boundary.setAttribute('fill', 'none');
        boundary.setAttribute('stroke', '#ff00ff');
        boundary.setAttribute('stroke-width', '2');
        debugGroup.appendChild(boundary);
        
        // Create grid lines at regular intervals
        const gridSpacingX = (maxX - minX) / 8; // 8 divisions
        const gridSpacingY = (maxY - minY) / 4; // 4 divisions
        
        // Vertical grid lines (frequency - X axis)
        for (let i = 0; i <= 8; i++) {
            const dataX = minX + (i * gridSpacingX);
            const svgCoords = this.zoomDemo.coordinateSystem.dataToSVG(dataX, minY);
            const svgX = svgCoords.x;
            
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', svgX);
            line.setAttribute('y1', 0);
            line.setAttribute('x2', svgX);
            line.setAttribute('y2', 500);
            line.setAttribute('stroke', '#ff00ff');
            line.setAttribute('stroke-width', '1');
            line.setAttribute('stroke-opacity', '0.3');
            debugGroup.appendChild(line);
            
            // Add frequency labels along X-axis (bottom)
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', svgX);
            text.setAttribute('y', -15);
            text.setAttribute('fill', '#ff00ff');
            text.setAttribute('font-size', '10');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('transform', `translate(0, -15) scale(1, -1) translate(0, 15)`);
            text.textContent = `${dataX.toFixed(0)} Hz`;
            debugGroup.appendChild(text);
        }
        
        // Horizontal grid lines (time - Y axis)
        for (let i = 0; i <= 4; i++) {
            const dataY = minY + (i * gridSpacingY);
            const svgCoords = this.zoomDemo.coordinateSystem.dataToSVG(minX, dataY);
            const svgY = svgCoords.y;
            
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', 0);
            line.setAttribute('y1', svgY);
            line.setAttribute('x2', 1000);
            line.setAttribute('y2', svgY);
            line.setAttribute('stroke', '#ff00ff');
            line.setAttribute('stroke-width', '1');
            line.setAttribute('stroke-opacity', '0.3');
            debugGroup.appendChild(line);
            
            // Add time labels along Y-axis (right side)
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', 1010);
            text.setAttribute('y', svgY);
            text.setAttribute('fill', '#ff00ff');
            text.setAttribute('font-size', '10');
            text.setAttribute('text-anchor', 'start');
            text.setAttribute('transform', `translate(1010, ${svgY}) scale(1, -1) translate(-1010, ${-svgY})`);
            text.textContent = `${dataY.toFixed(0)} time`;
            debugGroup.appendChild(text);
        }
        
        // Add corner markers to validate coordinate mapping
        const corners = [
            { x: minX, y: minY, label: 'MIN' },
            { x: maxX, y: minY, label: 'MAX-X' },
            { x: minX, y: maxY, label: 'MAX-Y' },
            { x: maxX, y: maxY, label: 'MAX' }
        ];
        
        corners.forEach(corner => {
            const svgCoords = this.zoomDemo.coordinateSystem.dataToSVG(corner.x, corner.y);
            
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', svgCoords.x);
            circle.setAttribute('cy', svgCoords.y);
            circle.setAttribute('r', '3');
            circle.setAttribute('fill', '#ff00ff');
            debugGroup.appendChild(circle);
            
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', svgCoords.x + 5);
            text.setAttribute('y', svgCoords.y + 5);
            text.setAttribute('fill', '#ff00ff');
            text.setAttribute('font-size', '8');
            text.setAttribute('transform', `translate(${svgCoords.x + 5}, ${svgCoords.y + 5}) scale(1, -1) translate(${-(svgCoords.x + 5)}, ${-(svgCoords.y + 5)})`);
            text.textContent = corner.label;
            debugGroup.appendChild(text);
        });
        
        svg.appendChild(debugGroup);
        
        this.updateStatus('Debug overlay enabled - showing coordinate grid and markers');
    }
    
    /**
     * Remove debug overlay
     */
    removeDebugOverlay() {
        const existingDebug = document.getElementById('debug-overlay');
        if (existingDebug) {
            existingDebug.remove();
            this.updateStatus('Debug overlay disabled');
        }
    }
    
    /**
     * Toggle debug overlay visibility
     */
    toggleDebugOverlay() {
        const existingDebug = document.getElementById('debug-overlay');
        if (existingDebug) {
            this.removeDebugOverlay();
        } else {
            this.createDebugOverlay();
        }
    }
    
    /**
     * Display coordinate transformation test results
     */
    displayTestResults(results) {
        const resultsWindow = window.open('', '_blank', 'width=600,height=400');
        resultsWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Coordinate Test Results</title>
                <style>
                    body { font-family: monospace; margin: 20px; background: #1a1a1a; color: #00ff00; }
                    .pass { color: #00ff00; }
                    .fail { color: #ff0000; }
                    .test-section { margin: 20px 0; padding: 10px; border: 1px solid #333; }
                    pre { background: #2a2a2a; padding: 10px; }
                </style>
            </head>
            <body>
                <h1>Coordinate Transformation Test Results</h1>
                <div class="test-section">
                    <h2>Test Results:</h2>
                    <pre>${JSON.stringify(results, null, 2)}</pre>
                </div>
                <div class="test-section">
                    <button onclick="window.close()">Close</button>
                </div>
            </body>
            </html>
        `);
        resultsWindow.document.close();
    }
}

/**
 * Add keyboard shortcuts for enhanced testing
 */
document.addEventListener('keydown', (event) => {
    if (!window.zoomDemo) return;
    
    // Only handle keys when not in input fields
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
    
    switch (event.key.toLowerCase()) {
        case 'd':
            // Toggle debug overlay
            window.zoomDemo.ui.toggleDebugOverlay();
            event.preventDefault();
            break;
            
        case 't':
            // Run coordinate tests
            import('./coordinates.js').then(module => {
                const results = module.runCoordinateTests();
                window.zoomDemo.ui.updateStatus('Coordinate tests completed - check console');
            });
            event.preventDefault();
            break;
            
        case 'r':
            // Reset zoom
            window.zoomDemo.resetZoom();
            event.preventDefault();
            break;
            
        case '1':
            // Switch to original image
            window.zoomDemo.switchTestImage('original');
            event.preventDefault();
            break;
            
        case '2':
            // Switch to scaled image
            window.zoomDemo.switchTestImage('scaled');
            event.preventDefault();
            break;
            
        case '3':
            // Switch to offset image
            window.zoomDemo.switchTestImage('offset');
            event.preventDefault();
            break;
            
        case 'p':
            // Switch to pan mode
            window.zoomDemo.setMode('pan');
            event.preventDefault();
            break;
            
        case 'z':
            // Switch to zoom mode
            window.zoomDemo.setMode('zoom');
            event.preventDefault();
            break;
    }
});

// Add keyboard shortcut legend to the page
document.addEventListener('DOMContentLoaded', () => {
    const helpText = document.createElement('div');
    helpText.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0,0,0,0.8);
        color: #00ff00;
        padding: 10px;
        font-family: monospace;
        font-size: 12px;
        border-radius: 4px;
        z-index: 1000;
        opacity: 0.7;
    `;
    helpText.innerHTML = `
        <strong>Keyboard Shortcuts:</strong><br>
        D - Toggle debug overlay<br>
        T - Run coordinate tests<br>
        R - Reset zoom<br>
        P - Pan mode<br>
        Z - Zoom mode<br>
        1/2/3 - Switch test images
    `;
    document.body.appendChild(helpText);
});