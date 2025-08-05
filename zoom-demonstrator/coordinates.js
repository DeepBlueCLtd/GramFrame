/**
 * Coordinate System Implementation
 * 
 * Direct SVG-to-data coordinate mapping (1:1) without abstraction layers
 * Key insight: SVG coordinates = data coordinates exactly
 * 
 * Test case: sample/test-image-offset-axes.png
 * - SVG coordinate space: 100-900, 100-500 (matches data coordinates exactly)
 * - Data coordinate space: 100-900 Hz, 100-500 time units
 * - Image dimensions: 1000×500 pixels (physical image size)
 * 
 * @typedef {import('./types.js').DataRange} DataRange
 * @typedef {import('./types.js').Point2D} Point2D
 * @typedef {import('./types.js').SVGViewBox} SVGViewBox
 * @typedef {import('./types.js').ImageDimensions} ImageDimensions
 * @typedef {import('./types.js').ContainerDimensions} ContainerDimensions
 */

export class CoordinateSystem {
    /**
     * @param {DataRange} dataRange - Data coordinate ranges
     * @param {number} imageWidth - Image width in pixels
     * @param {number} imageHeight - Image height in pixels
     */
    constructor(dataRange, imageWidth, imageHeight) {
        if (!dataRange || typeof imageWidth !== 'number' || typeof imageHeight !== 'number') {
            throw new Error('CoordinateSystem requires dataRange, imageWidth, and imageHeight');
        }
        if (imageWidth <= 0 || imageHeight <= 0) {
            throw new Error('Image dimensions must be positive numbers');
        }
        /** @type {SVGViewBox} */
        this.svgViewBox = {
            x: 0,
            y: 0, 
            width: imageWidth,
            height: imageHeight
        };
        
        /** @type {ImageDimensions} */
        this.imageSize = {
            width: imageWidth,   // Physical image width in pixels
            height: imageHeight  // Physical image height in pixels  
        };
        
        /** @type {ContainerDimensions} */
        this.svgContainer = {
            width: imageWidth,
            height: imageHeight
        };
        
        // Now update data range
        this.updateDataRange(dataRange, imageWidth, imageHeight);
        
        this.updateContainerSize();
    }
    
    /**
     * Update data range and image dimensions
     * @param {DataRange} dataRange - New data coordinate ranges
     * @param {number} imageWidth - New image width in pixels
     * @param {number} imageHeight - New image height in pixels
     */
    updateDataRange(dataRange, imageWidth, imageHeight) {
        if (!dataRange || typeof imageWidth !== 'number' || typeof imageHeight !== 'number') {
            throw new Error('updateDataRange requires dataRange, imageWidth, and imageHeight');
        }
        if (imageWidth <= 0 || imageHeight <= 0) {
            throw new Error('Image dimensions must be positive numbers');
        }
        
        this.dataRange = { ...dataRange };
        this.imageSize.width = imageWidth;
        this.imageSize.height = imageHeight;
        
        // Update SVG viewBox to match image dimensions
        this.svgViewBox.width = imageWidth;
        this.svgViewBox.height = imageHeight;
    }
    
    updateContainerSize() {
        const container = document.getElementById('demo-container');
        if (container) {
            const rect = container.getBoundingClientRect();
            this.svgContainer.width = rect.width;
            this.svgContainer.height = rect.height;
        }
    }
    
    /**
     * Convert screen coordinates to SVG coordinates
     * Screen: Mouse position in browser pixels relative to SVG element
     * SVG: Coordinates in SVG viewBox space (with Y-axis inversion)
     */
    screenToSVG(screenX, screenY, invertY = true) {
        this.updateContainerSize();
        
        // Scale from screen pixels to SVG viewBox coordinates
        const scaleX = this.svgViewBox.width / this.svgContainer.width;
        const scaleY = this.svgViewBox.height / this.svgContainer.height;
        
        const svgX = this.svgViewBox.x + (screenX * scaleX);
        // Conditionally invert Y-axis: higher SVG Y values should be further up
        const svgY = invertY ? 
            this.svgViewBox.y + this.svgViewBox.height - (screenY * scaleY) :
            this.svgViewBox.y + (screenY * scaleY);
        
        return { x: svgX, y: svgY };
    }
    
    /**
     * Convert SVG coordinates to data coordinates
     * SVG coordinates are now in pixels (0-1000, 0-500)
     * Data coordinates are logical units (100-900 Hz, 100-500 time)
     */
    svgToData(svgX, svgY) {
        // Map from SVG pixel space to data coordinate space
        const dataX = this.dataRange.minX + (svgX / this.svgViewBox.width) * (this.dataRange.maxX - this.dataRange.minX);
        const dataY = this.dataRange.minY + (svgY / this.svgViewBox.height) * (this.dataRange.maxY - this.dataRange.minY);
        
        return {
            x: dataX,  // Hz (frequency)
            y: dataY   // time units
        };
    }
    
    /**
     * Convert data coordinates to image pixel coordinates
     * Data: Logical coordinates (Hz, time)
     * Image: Physical pixel positions in the source image
     */
    dataToImage(dataX, dataY) {
        // Map data coordinate range to image pixel range
        const pixelX = ((dataX - this.dataRange.minX) / (this.dataRange.maxX - this.dataRange.minX)) * this.imageSize.width;
        const pixelY = ((dataY - this.dataRange.minY) / (this.dataRange.maxY - this.dataRange.minY)) * this.imageSize.height;
        
        return { x: pixelX, y: pixelY };
    }
    
    /**
     * Convert image pixel coordinates to data coordinates  
     * Inverse of dataToImage
     */
    imageToData(pixelX, pixelY) {
        const dataX = this.dataRange.minX + (pixelX / this.imageSize.width) * (this.dataRange.maxX - this.dataRange.minX);
        const dataY = this.dataRange.minY + (pixelY / this.imageSize.height) * (this.dataRange.maxY - this.dataRange.minY);
        
        return { x: dataX, y: dataY };
    }
    
    /**
     * Convert data coordinates to SVG coordinates
     * Inverse of svgToData - maps from data space to SVG pixel space
     */
    dataToSVG(dataX, dataY) {
        // Map from data coordinate space to SVG pixel space
        const svgX = ((dataX - this.dataRange.minX) / (this.dataRange.maxX - this.dataRange.minX)) * this.svgViewBox.width;
        const svgY = ((dataY - this.dataRange.minY) / (this.dataRange.maxY - this.dataRange.minY)) * this.svgViewBox.height;
        
        return {
            x: svgX,
            y: svgY
        };
    }
    
    /**
     * Convert SVG coordinates to screen coordinates
     * Inverse of screenToSVG (with Y-axis inversion)
     */
    svgToScreen(svgX, svgY) {
        this.updateContainerSize();
        
        const scaleX = this.svgContainer.width / this.svgViewBox.width;
        const scaleY = this.svgContainer.height / this.svgViewBox.height;
        
        const screenX = (svgX - this.svgViewBox.x) * scaleX;
        // Invert Y-axis back: SVG Y to screen Y
        const screenY = (this.svgViewBox.y + this.svgViewBox.height - svgY) * scaleY;
        
        return { x: screenX, y: screenY };
    }
    
    /**
     * Chain transformation: Screen -> SVG -> Data
     */
    screenToData(screenX, screenY) {
        const svgCoords = this.screenToSVG(screenX, screenY);
        return this.svgToData(svgCoords.x, svgCoords.y);
    }
    
    /**
     * Chain transformation: Data -> SVG -> Screen  
     */
    dataToScreen(dataX, dataY) {
        const svgCoords = this.dataToSVG(dataX, dataY);
        return this.svgToScreen(svgCoords.x, svgCoords.y);
    }
    
    /**
     * Get data coordinate bounds for current view
     */
    getDataBounds() {
        return {
            minX: this.dataRange.minX,
            maxX: this.dataRange.maxX,
            minY: this.dataRange.minY,
            maxY: this.dataRange.maxY,
            width: this.dataRange.maxX - this.dataRange.minX,
            height: this.dataRange.maxY - this.dataRange.minY
        };
    }
    
    /**
     * Validate coordinate transformations - for unit testing
     */
    validateTransforms() {
        const testCases = [
            // Test corners and center for offset-axes case (with Y inversion)
            { screen: [0, 0], expectedDataApprox: [100, 500] },      // Top-left screen = bottom-left data
            { screen: [425, 225], expectedDataApprox: [500, 300] }, // Center
            { screen: [850, 450], expectedDataApprox: [900, 100] }  // Bottom-right screen = top-right data
        ];
        
        const results = [];
        for (const testCase of testCases) {
            const [screenX, screenY] = testCase.screen;
            const dataCoords = this.screenToData(screenX, screenY);
            
            // Allow 5% tolerance for approximation
            const tolerance = 0.05;
            const [expectedX, expectedY] = testCase.expectedDataApprox;
            const deltaX = Math.abs(dataCoords.x - expectedX) / expectedX;
            const deltaY = Math.abs(dataCoords.y - expectedY) / expectedY;
            
            results.push({
                input: testCase.screen,
                output: [dataCoords.x, dataCoords.y],
                expected: testCase.expectedDataApprox,
                passed: deltaX < tolerance && deltaY < tolerance,
                deltaX,
                deltaY
            });
        }
        
        return results;
    }
}

/**
 * Unit Tests for Coordinate System
 * Run with: runCoordinateTests()
 */
export function runCoordinateTests() {
    console.log('Running coordinate transformation tests...');
    
    // Test with offset-axes configuration
    const coordSystem = new CoordinateSystem({
        minX: 100, maxX: 900,
        minY: 100, maxY: 500
    });
    
    // Test 1: SVG pixel to data coordinate mapping
    console.log('Test 1: SVG pixel to data coordinate mapping');
    const svgToDataTests = [
        { svg: [0, 0], expected: [100, 100] },      // Origin pixel -> min data
        { svg: [500, 250], expected: [500, 300] },  // Center pixel -> center data
        { svg: [1000, 500], expected: [900, 500] }  // Max pixel -> max data
    ];
    
    svgToDataTests.forEach((test, i) => {
        const result = coordSystem.svgToData(test.svg[0], test.svg[1]);
        const tolerance = 0.01;
        const passedX = Math.abs(result.x - test.expected[0]) < tolerance;
        const passedY = Math.abs(result.y - test.expected[1]) < tolerance;
        const passed = passedX && passedY;
        console.log(`  ${i+1}. SVG(${test.svg[0]}, ${test.svg[1]}) -> Data(${result.x.toFixed(1)}, ${result.y.toFixed(1)}) [${passed ? 'PASS' : 'FAIL'}]`);
    });
    
    // Test 2: Data-to-image pixel mapping
    console.log('Test 2: Data-to-image pixel mapping');
    const dataToImageTests = [
        { data: [100, 100], expected: [0, 0] },        // Min data -> pixel origin
        { data: [500, 300], expected: [500, 250] },    // Mid data -> mid pixels
        { data: [900, 500], expected: [1000, 500] }    // Max data -> max pixels
    ];
    
    dataToImageTests.forEach((test, i) => {
        const result = coordSystem.dataToImage(test.data[0], test.data[1]);
        const tolerance = 1; // 1 pixel tolerance
        const passedX = Math.abs(result.x - test.expected[0]) <= tolerance;
        const passedY = Math.abs(result.y - test.expected[1]) <= tolerance;
        const passed = passedX && passedY;
        console.log(`  ${i+1}. Data(${test.data[0]}, ${test.data[1]}) -> Image(${result.x.toFixed(1)}, ${result.y.toFixed(1)}) [${passed ? 'PASS' : 'FAIL'}]`);
    });
    
    // Test 3: Round-trip transformations
    console.log('Test 3: Round-trip transformation accuracy');
    const roundTripTests = [
        [200, 200], [600, 350], [800, 450]
    ];
    
    roundTripTests.forEach((originalData, i) => {
        const [origX, origY] = originalData;
        
        // Data -> SVG -> Data
        const svgCoords = coordSystem.dataToSVG(origX, origY);
        const backToData = coordSystem.svgToData(svgCoords.x, svgCoords.y);
        
        const tolerance = 0.001;
        const passedX = Math.abs(backToData.x - origX) <= tolerance;
        const passedY = Math.abs(backToData.y - origY) <= tolerance;
        const passed = passedX && passedY;
        
        console.log(`  ${i+1}. Data(${origX}, ${origY}) -> SVG -> Data(${backToData.x}, ${backToData.y}) [${passed ? 'PASS' : 'FAIL'}]`);
    });
    
    // Test 4: Validate screen-to-data transformations
    console.log('Test 4: Screen-to-data chain validation');
    const validationResults = coordSystem.validateTransforms();
    validationResults.forEach((result, i) => {
        console.log(`  ${i+1}. Screen(${result.input[0]}, ${result.input[1]}) -> Data(${result.output[0].toFixed(1)}, ${result.output[1].toFixed(1)}) [${result.passed ? 'PASS' : 'FAIL'}]`);
        if (!result.passed) {
            console.log(`    Expected ~(${result.expected[0]}, ${result.expected[1]}), delta: (${(result.deltaX*100).toFixed(1)}%, ${(result.deltaY*100).toFixed(1)}%)`);
        }
    });
    
    console.log('Coordinate transformation tests completed.');
}

// Export for external testing (only in browser environment)
if (typeof window !== 'undefined') {
    window.runCoordinateTests = runCoordinateTests;
}