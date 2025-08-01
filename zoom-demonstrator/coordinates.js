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
 * @property {number} zoomLevelX - X-axis zoom level (1.0 = normal, 2.0 = 2x zoom, etc.)
 * @property {number} zoomLevelY - Y-axis zoom level (for aspect ratio changes)
 * @property {Point} panOffset - Current pan offset in data/SVG coordinates
 * @property {Point} zoomCenter - Center point for zoom operations in data/SVG coordinates
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
 * SVG coordinates now align perfectly with data coordinates (1:1 mapping)
 */
// Default configuration - will be updated by the demonstrator
const CONFIG = {
    // Data coordinate ranges - should be set by calling code
    freqMin: 0,          // Minimum frequency 
    freqMax: 800,        // Maximum frequency
    timeMin: 0,          // Minimum time 
    timeMax: 400,        // Maximum time
    
    // Image dimensions in SVG coordinate space - should match actual image size
    imageWidth: 800,     // SVG width (actual image width)
    imageHeight: 400,    // SVG height (actual image height)
    
    // SVG viewBox dimensions (expanded to show axis labels at negative coordinates)
    svgWidth: 860,       // ViewBox width (imageWidth + 60 for labels)
    svgHeight: 450       // ViewBox height (imageHeight + 50 for labels)
};

/**
 * Update coordinate configuration including image dimensions
 * @param {Object} config - New configuration values
 * @param {number} config.freqMin - Minimum frequency
 * @param {number} config.freqMax - Maximum frequency  
 * @param {number} config.timeMin - Minimum time
 * @param {number} config.timeMax - Maximum time
 * @param {number} [config.imageWidth] - Actual image width in pixels
 * @param {number} [config.imageHeight] - Actual image height in pixels
 */
export function updateConfig(config) {
    Object.assign(CONFIG, config);
    
    // Update viewBox dimensions if image dimensions changed
    if (config.imageWidth || config.imageHeight) {
        CONFIG.svgWidth = CONFIG.imageWidth + 60;  // Add margins for labels
        CONFIG.svgHeight = CONFIG.imageHeight + 50;
    }
    
    console.log('Updated coordinate config:', CONFIG);
}

/**
 * Convert screen coordinates to SVG/Data coordinates
 * Since SVG coordinates now align with data coordinates, this is a direct conversion
 * @param {number} screenX - Screen X coordinate relative to SVG element
 * @param {number} screenY - Screen Y coordinate relative to SVG element
 * @param {SVGSVGElement} svg - SVG element reference
 * @param {TransformState} transform - Current zoom/pan state
 * @returns {Point} SVG coordinates (which equal data coordinates)
 */
export function screenToSVGCoordinates(screenX, screenY, svg, transform = null) {
    const svgRect = svg.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;
    
    // Base SVG coordinates (raw screen-to-SVG conversion)
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
    
    // Apply inverse transform to get actual data coordinates in the virtual space
    if (transform) {
        // Account for zoom and pan to get the actual data coordinate being pointed to
        svgX = (svgX / transform.zoomLevelX) + transform.panOffset.x;
        svgY = (svgY / transform.zoomLevelY) + transform.panOffset.y;
    }
    
    return { x: svgX, y: svgY };
}

// Note: With aligned coordinates, svgToImageCoordinates and imageToDataCoordinates 
// are no longer needed as SVG coordinates now map directly to data coordinates

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
    
    // Convert SVG coordinates to data coordinates using configurable ranges
    // SVG coordinates (0-800, 0-400) map to data ranges (freqMin-freqMax, timeMin-timeMax)
    const dataX = CONFIG.freqMin + (svgCoords.x / CONFIG.imageWidth) * (CONFIG.freqMax - CONFIG.freqMin);
    const dataY = CONFIG.timeMin + ((CONFIG.imageHeight - svgCoords.y) / CONFIG.imageHeight) * (CONFIG.timeMax - CONFIG.timeMin);
    
    // Check if point is within data bounds
    const isInBounds = (dataX >= CONFIG.freqMin && dataX <= CONFIG.freqMax && 
                       dataY >= CONFIG.timeMin && dataY <= CONFIG.timeMax);
    
    const dataCoords = { x: dataX, y: dataY };
    const imageCoords = isInBounds ? { x: dataX, y: svgCoords.y } : null; // Image coords = SVG coords
    
    return {
        screen,
        svg: svgCoords,
        image: imageCoords,
        data: isInBounds ? dataCoords : null
    };
}

/**
 * Constrain pan offset to keep image within bounds
 * @param {TransformState} transform - Transform state to constrain (will be modified)
 */
function constrainPan(transform) {
    // Calculate the visible viewport size in image coordinates
    const viewportWidth = CONFIG.imageWidth / transform.zoomLevelX;
    const viewportHeight = CONFIG.imageHeight / transform.zoomLevelY;
    
    // Calculate the maximum pan offsets to keep image within bounds
    const minPanX = 0; // Left edge of image at left edge of viewport
    const maxPanX = Math.max(0, CONFIG.imageWidth - viewportWidth); // Right edge of image at right edge of viewport
    const minPanY = 0; // Bottom edge of image at bottom edge of viewport  
    const maxPanY = Math.max(0, CONFIG.imageHeight - viewportHeight); // Top edge of image at top edge of viewport
    
    // Apply constraints
    transform.panOffset.x = Math.max(minPanX, Math.min(maxPanX, transform.panOffset.x));
    transform.panOffset.y = Math.max(minPanY, Math.min(maxPanY, transform.panOffset.y));
}

/**
 * Apply zoom transformation to clipped content group
 * @param {SVGSVGElement} svg - SVG element
 * @param {TransformState} transform - Transform state with zoom/pan
 */
export function applyTransform(svg, transform) {
    // Constrain pan to keep image within bounds - updated for aligned coordinates
    constrainPan(transform);
    
    // Get the clipped content group that should be transformed
    const clippedContent = svg.getElementById('clipped-content');
    
    // Create transform string for zoom and pan with separate X/Y scaling
    const scaleX = transform.zoomLevelX;
    const scaleY = transform.zoomLevelY;
    const translateX = -transform.panOffset.x * scaleX;
    const translateY = -transform.panOffset.y * scaleY;
    
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
    // Calculate visible range in DATA coordinates (not SVG coordinates)
    // Convert SVG viewport to data coordinate ranges
    const svgViewLeft = transform.panOffset.x;
    const svgViewRight = transform.panOffset.x + (CONFIG.imageWidth / transform.zoomLevelX);
    const svgViewBottom = transform.panOffset.y;
    const svgViewTop = transform.panOffset.y + (CONFIG.imageHeight / transform.zoomLevelY);
    
    // Convert SVG ranges to data coordinate ranges
    const viewLeft = CONFIG.freqMin + (svgViewLeft / CONFIG.imageWidth) * (CONFIG.freqMax - CONFIG.freqMin);
    const viewRight = CONFIG.freqMin + (svgViewRight / CONFIG.imageWidth) * (CONFIG.freqMax - CONFIG.freqMin);
    
    // For time: SVG Y=0 is top, but time increases upward in data coordinates
    const viewTimeBottom = CONFIG.timeMin + ((CONFIG.imageHeight - svgViewTop) / CONFIG.imageHeight) * (CONFIG.timeMax - CONFIG.timeMin);
    const viewTimeTop = CONFIG.timeMin + ((CONFIG.imageHeight - svgViewBottom) / CONFIG.imageHeight) * (CONFIG.timeMax - CONFIG.timeMin);
    
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
        if (tickValue >= CONFIG.freqMin && tickValue <= CONFIG.freqMax) {
            // Convert data coordinate back to SVG coordinate for positioning
            const x = ((tickValue - CONFIG.freqMin) / (CONFIG.freqMax - CONFIG.freqMin)) * CONFIG.imageWidth;
            
            if (x >= 0 && x <= CONFIG.imageWidth) {
                // Create tick mark - positioned at top of data area
                const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                tick.setAttribute('x1', x);
                tick.setAttribute('y1', '0'); // Top of data area
                tick.setAttribute('x2', x);
                tick.setAttribute('y2', '-10'); // Extend above data area
                tick.setAttribute('stroke', '#333');
                tick.setAttribute('stroke-width', '1');
                tick.setAttribute('class', 'dynamic-tick');
                svg.appendChild(tick);
                
                // Create label - positioned below data area using negative coordinates
                const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                label.setAttribute('x', x);
                label.setAttribute('y', '-20'); // Above data area (negative Y)
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
    const timeRange = viewTimeTop - viewTimeBottom;
    const timeInterval = calculateTickInterval(timeRange);
    const timeTicks = generateTicks(viewTimeBottom, viewTimeTop, timeInterval);
    
    timeTicks.forEach(tickValue => {
        if (tickValue >= CONFIG.timeMin && tickValue <= CONFIG.timeMax) {
            // Convert data coordinate back to SVG coordinate for positioning
            // timeMin should be at bottom (y=imageHeight), timeMax should be at top (y=0)
            const y = CONFIG.imageHeight - ((tickValue - CONFIG.timeMin) / (CONFIG.timeMax - CONFIG.timeMin)) * CONFIG.imageHeight;
            
            if (y >= 0 && y <= CONFIG.imageHeight) {
                // Create tick mark - positioned at left of data area
                const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                tick.setAttribute('x1', '-5'); // Left of data area
                tick.setAttribute('y1', y);
                tick.setAttribute('x2', '0'); // To edge of data area
                tick.setAttribute('y2', y);
                tick.setAttribute('stroke', '#333');
                tick.setAttribute('stroke-width', '1');
                tick.setAttribute('class', 'dynamic-tick');
                svg.appendChild(tick);
                
                // Create label - positioned left of data area using negative coordinates
                const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                label.setAttribute('x', '-10'); // Left of data area
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
    const oldZoomX = transform.zoomLevelX;
    const oldZoomY = transform.zoomLevelY;
    const newZoomX = Math.max(0.1, Math.min(10.0, oldZoomX * zoomFactor)); // Constrain zoom level
    const newZoomY = Math.max(0.1, Math.min(10.0, oldZoomY * zoomFactor)); // Constrain zoom level
    
    if (newZoomX !== oldZoomX || newZoomY !== oldZoomY) {
        // For element-based transforms, adjust pan offset to keep zoom center fixed
        const scaleFactorX = newZoomX / oldZoomX;
        const scaleFactorY = newZoomY / oldZoomY;
        
        // Calculate how much the zoom center will move due to scaling
        const centerMoveX = zoomCenter.x * (scaleFactorX - 1);
        const centerMoveY = zoomCenter.y * (scaleFactorY - 1);
        
        // Adjust pan offset to compensate for the movement
        transform.panOffset.x += centerMoveX / newZoomX;
        transform.panOffset.y += centerMoveY / newZoomY;
        
        transform.zoomLevelX = newZoomX;
        transform.zoomLevelY = newZoomY;
        transform.zoomCenter = zoomCenter;
    }
}

/**
 * Reset zoom and pan to default state
 * @param {TransformState} transform - Transform state to reset (will be modified)
 */
export function resetTransform(transform) {
    transform.zoomLevelX = 1.0;
    transform.zoomLevelY = 1.0;
    transform.panOffset = { x: 0, y: 0 };
    transform.zoomCenter = { x: CONFIG.imageWidth / 2, y: CONFIG.imageHeight / 2 };
}

/**
 * Create initial transform state
 * @returns {TransformState} Initial transform state
 */
export function createInitialTransform() {
    return {
        zoomLevelX: 1.0,
        zoomLevelY: 1.0,
        panOffset: { x: 0, y: 0 },
        zoomCenter: { x: CONFIG.imageWidth / 2, y: CONFIG.imageHeight / 2 }
    };
}

/**
 * Unit tests for coordinate transformations
 * @returns {boolean} True if all tests pass
 */
export function runCoordinateTests() {
    console.log('Running coordinate transformation tests...');
    
    let allTestsPassed = true;
    
    // Test 1: Data coordinate bounds - corners should map correctly
    // With aligned coordinates, SVG coords should equal data coords
    const testCorners = [
        { data: { x: 0, y: 0 }, desc: 'bottom-left corner' },
        { data: { x: 800, y: 0 }, desc: 'bottom-right corner' },
        { data: { x: 0, y: 400 }, desc: 'top-left corner' },
        { data: { x: 800, y: 400 }, desc: 'top-right corner' },
        { data: { x: 400, y: 200 }, desc: 'center point' }
    ];
    
    testCorners.forEach((test, index) => {
        // In aligned coordinate system, data coords should equal SVG coords (with Y inversion)
        const expectedSvgY = CONFIG.timeMax - test.data.y; // Y-axis inversion
        console.log(`Test ${index + 1}: ${test.desc} - Data(${test.data.x}, ${test.data.y}) should map to SVG(${test.data.x}, ${expectedSvgY})`);
    });
    
    // Test 2: Transform state operations
    const transform = createInitialTransform();
    const originalZoomX = transform.zoomLevelX;
    const originalZoomY = transform.zoomLevelY;
    
    // Test zoom in
    zoomAt(transform, 2.0, { x: 400, y: 200 });
    if (transform.zoomLevelX !== originalZoomX * 2 || transform.zoomLevelY !== originalZoomY * 2) {
        console.error('Test 2a failed: Zoom in incorrect', { zoomX: transform.zoomLevelX, zoomY: transform.zoomLevelY }, { expectedX: originalZoomX * 2, expectedY: originalZoomY * 2 });
        allTestsPassed = false;
    } else {
        console.log('Test 2a passed: Zoom in correct');
    }
    
    // Test reset
    resetTransform(transform);
    if (transform.zoomLevelX !== 1.0 || transform.zoomLevelY !== 1.0 || transform.panOffset.x !== 0 || transform.panOffset.y !== 0) {
        console.error('Test 2b failed: Transform reset incorrect', transform);
        allTestsPassed = false;
    } else {
        console.log('Test 2b passed: Transform reset correct');
    }
    
    console.log(`Coordinate tests completed. All tests passed: ${allTestsPassed}`);
    return allTestsPassed;
}

// Export configuration for external use
export { CONFIG };