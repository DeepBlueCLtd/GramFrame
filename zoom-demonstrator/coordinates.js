/**
 * Coordinate transformation utilities for drag-to-zoom demonstrator
 * 
 * This module provides functions to convert between different coordinate systems:
 * - Screen coordinates (relative to browser viewport)
 * - SVG coordinates (relative to SVG viewBox)  
 * - Image coordinates (relative to test image)
 * - Data coordinates (time/frequency values)
 * 
 * Includes zoom and pan transformations for interactive navigation
 */

/**
 * @typedef {Object} Point
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 */

/**
 * @typedef {Object} TransformState
 * @property {number} zoomLevel - Current zoom level (1.0 = normal, 2.0 = 2x zoom, etc.)
 * @property {Point} panOffset - Current pan offset in SVG coordinates
 * @property {Point} zoomCenter - Center point for zoom operations in SVG coordinates
 */

/**
 * @typedef {Object} CoordinateResult
 * @property {Point} screen - Screen coordinates
 * @property {Point} svg - SVG coordinates (with zoom/pan applied)
 * @property {Point} image - Image coordinates
 * @property {Point} data - Data coordinates {freq, time}
 */

/**
 * Configuration for coordinate transformations
 */
const CONFIG = {
    // Test image dimensions and positioning - origin at 0,0
    imageX: 0,            // X position of image in SVG (origin at 0,0)
    imageY: 0,            // Y position of image in SVG (origin at 0,0)
    imageWidth: 800,      // Width of image in SVG coordinates (matches data width)
    imageHeight: 400,     // Height of image in SVG coordinates (matches data height)
    
    // Data coordinate ranges (matching actual image data dimensions)
    freqMin: 0,          // Minimum frequency
    freqMax: 800,        // Maximum frequency (matches image width)
    timeMin: 0,          // Minimum time
    timeMax: 400,        // Maximum time (matches image height)
    
    // SVG viewBox dimensions (expanded to show labels)
    svgWidth: 900,
    svgHeight: 500
};

/**
 * Convert screen coordinates to SVG coordinates
 * @param {number} screenX - Screen X coordinate relative to SVG element
 * @param {number} screenY - Screen Y coordinate relative to SVG element
 * @param {SVGSVGElement} svg - SVG element reference
 * @param {TransformState} transform - Current zoom/pan state
 * @returns {Point} SVG coordinates
 */
export function screenToSVGCoordinates(screenX, screenY, svg, transform = null) {
    const svgRect = svg.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;
    
    // Base SVG coordinates
    let svgX, svgY;
    
    if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
        // Scale factors between screen and SVG coordinates
        const scaleX = viewBox.width / svgRect.width;
        const scaleY = viewBox.height / svgRect.height;
        
        svgX = (screenX * scaleX) + viewBox.x;
        svgY = (screenY * scaleY) + viewBox.y;
    } else {
        // Fallback: assume SVG coordinates match screen coordinates
        svgX = screenX;
        svgY = screenY;
    }
    
    // Apply inverse transform to get actual coordinates in the virtual space
    if (transform) {
        svgX = (svgX / transform.zoomLevel) + transform.panOffset.x;
        svgY = (svgY / transform.zoomLevel) + transform.panOffset.y;
    }
    
    return { x: svgX, y: svgY };
}

/**
 * Convert SVG coordinates to image coordinates
 * @param {number} svgX - SVG X coordinate
 * @param {number} svgY - SVG Y coordinate
 * @returns {Point} Image coordinates
 */
export function svgToImageCoordinates(svgX, svgY) {
    // Check if point is within image bounds
    if (svgX < CONFIG.imageX || svgX > CONFIG.imageX + CONFIG.imageWidth ||
        svgY < CONFIG.imageY || svgY > CONFIG.imageY + CONFIG.imageHeight) {
        return null; // Outside image bounds
    }
    
    // Convert to image-relative coordinates
    const imageX = svgX - CONFIG.imageX;
    const imageY = svgY - CONFIG.imageY;
    
    return { x: imageX, y: imageY };
}

/**
 * Convert image coordinates to data coordinates (frequency and time)
 * @param {number} imageX - Image X coordinate
 * @param {number} imageY - Image Y coordinate
 * @returns {Point} Data coordinates {freq, time}
 */
export function imageToDataCoordinates(imageX, imageY) {
    // Ensure coordinates are within image bounds
    const boundedX = Math.max(0, Math.min(imageX, CONFIG.imageWidth));
    const boundedY = Math.max(0, Math.min(imageY, CONFIG.imageHeight));
    
    // Convert to data coordinates
    // X-axis = Frequency (horizontal)
    const freq = CONFIG.freqMin + (boundedX / CONFIG.imageWidth) * (CONFIG.freqMax - CONFIG.freqMin);
    // Y-axis = Time (vertical, with time increasing upward - Y=0 at bottom of image)
    const time = CONFIG.timeMax - (boundedY / CONFIG.imageHeight) * (CONFIG.timeMax - CONFIG.timeMin);
    
    return { x: freq, y: time }; // Using x/y for consistency, where x=freq, y=time
}

/**
 * Full coordinate transformation chain from screen to all coordinate systems
 * @param {number} screenX - Screen X coordinate
 * @param {number} screenY - Screen Y coordinate  
 * @param {SVGSVGElement} svg - SVG element reference
 * @param {TransformState} transform - Current zoom/pan state
 * @returns {CoordinateResult} All coordinate representations
 */
export function transformCoordinates(screenX, screenY, svg, transform = null) {
    const screen = { x: screenX, y: screenY };
    const svgCoords = screenToSVGCoordinates(screenX, screenY, svg, transform);
    const imageCoords = svgToImageCoordinates(svgCoords.x, svgCoords.y);
    
    // Always calculate data coordinates, even if outside image bounds
    // For points outside image, use the SVG coordinates directly as data coordinates
    let dataCoords = { x: 0, y: 0 };
    if (imageCoords) {
        dataCoords = imageToDataCoordinates(imageCoords.x, imageCoords.y);
    } else {
        // If outside image, treat SVG coordinates as data coordinates
        // since our image is positioned at origin with 1:1 scale
        dataCoords = { x: svgCoords.x, y: CONFIG.timeMax - svgCoords.y };
    }
    
    return {
        screen,
        svg: svgCoords,
        image: imageCoords,
        data: dataCoords
    };
}

/**
 * Apply zoom transformation to clipped content group
 * @param {SVGSVGElement} svg - SVG element
 * @param {TransformState} transform - Transform state with zoom/pan
 */
export function applyTransform(svg, transform) {
    // Get the clipped content group that should be transformed
    const clippedContent = svg.getElementById('clipped-content');
    
    // Create transform string for zoom and pan
    const scaleX = transform.zoomLevel;
    const scaleY = transform.zoomLevel;
    const translateX = -transform.panOffset.x * transform.zoomLevel;
    const translateY = -transform.panOffset.y * transform.zoomLevel;
    
    const transformString = `translate(${translateX}, ${translateY}) scale(${scaleX}, ${scaleY})`;
    
    // Apply transform to the entire clipped content group
    if (clippedContent) {
        clippedContent.setAttribute('transform', transformString);
    }
    
    // Update axis labels to show current visible range
    updateAxisLabels(svg, transform);
}

/**
 * Calculate appropriate tick interval for a given range
 * @param {number} range - The range of values to cover
 * @param {number} maxTicks - Maximum number of ticks desired
 * @returns {number} Appropriate tick interval
 */
function calculateTickInterval(range, maxTicks = 8) {
    const roughInterval = range / maxTicks;
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughInterval)));
    const normalized = roughInterval / magnitude;
    
    // Choose nice intervals: 1, 2, 5, 10, 25, 50, 100, 250, 500, etc.
    let niceInterval;
    if (normalized <= 1) niceInterval = 1;
    else if (normalized <= 2) niceInterval = 2;
    else if (normalized <= 5) niceInterval = 5;
    else niceInterval = 10;
    
    return niceInterval * magnitude;
}

/**
 * Generate tick positions for a given range and interval
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {number} interval - Tick interval
 * @returns {number[]} Array of tick positions
 */
function generateTicks(min, max, interval) {
    const ticks = [];
    const start = Math.ceil(min / interval) * interval;
    
    for (let tick = start; tick <= max; tick += interval) {
        ticks.push(tick);
    }
    
    return ticks;
}

/**
 * Update axis labels to show current visible coordinate range
 * @param {SVGSVGElement} svg - SVG element
 * @param {TransformState} transform - Current transform state
 */
function updateAxisLabels(svg, transform) {
    // Calculate visible range based on current zoom and pan
    const viewLeft = transform.panOffset.x;
    const viewRight = transform.panOffset.x + (CONFIG.imageWidth / transform.zoomLevel);
    
    // For time axis: need to account for inverted coordinate system
    // When panOffset.y increases (panning up), we're seeing higher time values
    const viewTimeBottom = CONFIG.timeMax - (transform.panOffset.y + (CONFIG.imageHeight / transform.zoomLevel));
    const viewTimeTop = CONFIG.timeMax - transform.panOffset.y;
    
    // Clear existing dynamic labels
    const existingLabels = svg.querySelectorAll('.dynamic-label');
    existingLabels.forEach(label => label.remove());
    
    const existingTicks = svg.querySelectorAll('.dynamic-tick');
    existingTicks.forEach(tick => tick.remove());
    
    // Generate frequency axis labels and ticks
    const freqRange = viewRight - viewLeft;
    const freqInterval = calculateTickInterval(freqRange);
    const freqTicks = generateTicks(viewLeft, viewRight, freqInterval);
    
    freqTicks.forEach(tickValue => {
        if (tickValue >= 0 && tickValue <= CONFIG.freqMax) {
            const x = (tickValue - viewLeft) / (viewRight - viewLeft) * CONFIG.imageWidth;
            
            if (x >= 0 && x <= CONFIG.imageWidth) {
                // Create tick mark
                const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                tick.setAttribute('x1', x);
                tick.setAttribute('y1', '395');
                tick.setAttribute('x2', x);
                tick.setAttribute('y2', '405');
                tick.setAttribute('stroke', '#333');
                tick.setAttribute('stroke-width', '1');
                tick.setAttribute('class', 'dynamic-tick');
                svg.appendChild(tick);
                
                // Create label
                const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                label.setAttribute('x', x);
                label.setAttribute('y', '415');
                label.setAttribute('text-anchor', 'middle');
                label.setAttribute('font-size', '10');
                label.setAttribute('fill', '#333');
                label.setAttribute('class', 'dynamic-label');
                label.textContent = Math.round(tickValue).toString();
                svg.appendChild(label);
            }
        }
    });
    
    // Generate time axis labels and ticks (time increases upward)
    const timeRange = viewTop - viewBottom;
    const timeInterval = calculateTickInterval(timeRange);
    const timeTicks = generateTicks(viewBottom, viewTop, timeInterval);
    
    timeTicks.forEach(tickValue => {
        if (tickValue >= 0 && tickValue <= CONFIG.timeMax) {
            // For time axis: SVG y=0 is at top, but we want time=0 at bottom
            // So time value maps to: y = CONFIG.imageHeight - (tickValue / CONFIG.timeMax) * CONFIG.imageHeight
            const y = CONFIG.imageHeight - (tickValue - viewBottom) / (viewTop - viewBottom) * CONFIG.imageHeight;
            
            if (y >= 0 && y <= CONFIG.imageHeight) {
                // Create tick mark
                const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                tick.setAttribute('x1', '-5');
                tick.setAttribute('y1', y);
                tick.setAttribute('x2', '5');
                tick.setAttribute('y2', y);
                tick.setAttribute('stroke', '#333');
                tick.setAttribute('stroke-width', '1');
                tick.setAttribute('class', 'dynamic-tick');
                svg.appendChild(tick);
                
                // Create label - show the actual time value (not inverted)
                const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                label.setAttribute('x', '-5');
                label.setAttribute('y', y + 4); // Offset for better alignment
                label.setAttribute('text-anchor', 'end');
                label.setAttribute('font-size', '10');
                label.setAttribute('fill', '#333');
                label.setAttribute('class', 'dynamic-label');
                label.textContent = Math.round(tickValue).toString();
                svg.appendChild(label);
            }
        }
    });
}

/**
 * Calculate zoom center point for zoom operations
 * @param {Point} mousePos - Mouse position in SVG coordinates
 * @param {TransformState} currentTransform - Current transform state
 * @returns {Point} Zoom center point
 */
export function calculateZoomCenter(mousePos, currentTransform) {
    // The zoom center should be the mouse position adjusted for current pan offset
    return {
        x: mousePos.x - currentTransform.panOffset.x,
        y: mousePos.y - currentTransform.panOffset.y
    };
}

/**
 * Apply zoom at a specific point
 * @param {TransformState} transform - Current transform state (will be modified)
 * @param {number} zoomFactor - Zoom factor to apply (2.0 for zoom in, 0.5 for zoom out)
 * @param {Point} zoomCenter - Center point for zoom in SVG coordinates
 */
export function zoomAt(transform, zoomFactor, zoomCenter) {
    const oldZoom = transform.zoomLevel;
    const newZoom = Math.max(0.1, Math.min(10.0, oldZoom * zoomFactor)); // Constrain zoom level
    
    if (newZoom !== oldZoom) {
        // For element-based transforms, adjust pan offset to keep zoom center fixed
        const scaleFactor = newZoom / oldZoom;
        
        // Calculate how much the zoom center will move due to scaling
        const centerMoveX = zoomCenter.x * (scaleFactor - 1);
        const centerMoveY = zoomCenter.y * (scaleFactor - 1);
        
        // Adjust pan offset to compensate for the movement
        transform.panOffset.x += centerMoveX / newZoom;
        transform.panOffset.y += centerMoveY / newZoom;
        
        transform.zoomLevel = newZoom;
        transform.zoomCenter = zoomCenter;
    }
}

/**
 * Reset zoom and pan to default state
 * @param {TransformState} transform - Transform state to reset (will be modified)
 */
export function resetTransform(transform) {
    transform.zoomLevel = 1.0;
    transform.panOffset = { x: 0, y: 0 };
    transform.zoomCenter = { x: CONFIG.svgWidth / 2, y: CONFIG.svgHeight / 2 };
}

/**
 * Create initial transform state
 * @returns {TransformState} Initial transform state
 */
export function createInitialTransform() {
    return {
        zoomLevel: 1.0,
        panOffset: { x: 0, y: 0 },
        zoomCenter: { x: CONFIG.svgWidth / 2, y: CONFIG.svgHeight / 2 }
    };
}

/**
 * Unit tests for coordinate transformations
 * @returns {boolean} True if all tests pass
 */
export function runCoordinateTests() {
    console.log('Running coordinate transformation tests...');
    
    let allTestsPassed = true;
    
    // Test 1: SVG to Image coordinates - center of image
    const imageCenterSVG = { x: CONFIG.imageX + CONFIG.imageWidth / 2, y: CONFIG.imageY + CONFIG.imageHeight / 2 };
    const imageCenterImage = svgToImageCoordinates(imageCenterSVG.x, imageCenterSVG.y);
    const expectedImageCenter = { x: CONFIG.imageWidth / 2, y: CONFIG.imageHeight / 2 };
    
    if (!imageCenterImage || Math.abs(imageCenterImage.x - expectedImageCenter.x) > 1 || 
        Math.abs(imageCenterImage.y - expectedImageCenter.y) > 1) {
        console.error('Test 1 failed: Image center coordinates incorrect', imageCenterImage, expectedImageCenter);
        allTestsPassed = false;
    } else {
        console.log('Test 1 passed: Image center coordinates correct');
    }
    
    // Test 2: Image to Data coordinates - center should give middle frequency/time
    if (imageCenterImage) {
        const dataCenter = imageToDataCoordinates(imageCenterImage.x, imageCenterImage.y);
        const expectedFreq = (CONFIG.freqMin + CONFIG.freqMax) / 2;
        const expectedTime = (CONFIG.timeMin + CONFIG.timeMax) / 2;
        
        if (Math.abs(dataCenter.x - expectedFreq) > 1 || Math.abs(dataCenter.y - expectedTime) > 1) {
            console.error('Test 2 failed: Data center coordinates incorrect', dataCenter, { freq: expectedFreq, time: expectedTime });
            allTestsPassed = false;
        } else {
            console.log('Test 2 passed: Data center coordinates correct');
        }
    }
    
    // Test 3: Transform state operations
    const transform = createInitialTransform();
    const originalZoom = transform.zoomLevel;
    
    // Test zoom in
    zoomAt(transform, 2.0, { x: 400, y: 200 });
    if (transform.zoomLevel !== originalZoom * 2) {
        console.error('Test 3a failed: Zoom in incorrect', transform.zoomLevel, originalZoom * 2);
        allTestsPassed = false;
    } else {
        console.log('Test 3a passed: Zoom in correct');
    }
    
    // Test reset
    resetTransform(transform);
    if (transform.zoomLevel !== 1.0 || transform.panOffset.x !== 0 || transform.panOffset.y !== 0) {
        console.error('Test 3b failed: Transform reset incorrect', transform);
        allTestsPassed = false;
    } else {
        console.log('Test 3b passed: Transform reset correct');
    }
    
    console.log(`Coordinate tests completed. All tests passed: ${allTestsPassed}`);
    return allTestsPassed;
}

// Export configuration for external use
export { CONFIG };