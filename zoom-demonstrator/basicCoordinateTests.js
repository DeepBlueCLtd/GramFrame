/**
 * Basic Coordinate Tests (DOM-independent)
 * 
 * Tests core coordinate transformation math without requiring DOM elements.
 * Can run in Node.js environment for CI/testing.
 */

/**
 * Basic coordinate transformation functions (extracted from coordinates.js)
 */
const BasicCoordinates = {
    /**
     * Convert screen to SVG coordinates
     */
    screenToSVG(screenX, screenY, viewBox, containerSize, invertY = true) {
        const scaleX = viewBox.width / containerSize.width;
        const scaleY = viewBox.height / containerSize.height;
        
        const svgX = viewBox.x + (screenX * scaleX);
        const svgY = invertY ? 
            viewBox.y + viewBox.height - (screenY * scaleY) :
            viewBox.y + (screenY * scaleY);
        
        return { x: svgX, y: svgY };
    },
    
    /**
     * Convert SVG to data coordinates
     */
    svgToData(svgX, svgY, dataRange, viewBox) {
        const dataX = dataRange.minX + (svgX / viewBox.width) * (dataRange.maxX - dataRange.minX);
        const dataY = dataRange.minY + (svgY / viewBox.height) * (dataRange.maxY - dataRange.minY);
        
        return { x: dataX, y: dataY };
    },
    
    /**
     * Full chain: screen to data
     */
    screenToData(screenX, screenY, dataRange, imageSize, containerSize) {
        const viewBox = { x: 0, y: 0, width: imageSize.width, height: imageSize.height };
        const svgCoords = this.screenToSVG(screenX, screenY, viewBox, containerSize, true);
        return this.svgToData(svgCoords.x, svgCoords.y, dataRange, viewBox);
    }
};

/**
 * Test configurations
 */
const TEST_CONFIGS = {
    'offset': {
        name: 'Offset Axes',
        dataRange: { minX: 100, maxX: 900, minY: 100, maxY: 500 },
        imageSize: { width: 1000, height: 500 },
        testPoints: [
            { screen: { x: 0, y: 0 }, expectedData: { x: 100, y: 500 } },      // Top-left
            { screen: { x: 500, y: 250 }, expectedData: { x: 500, y: 300 } },  // Center
            { screen: { x: 1000, y: 500 }, expectedData: { x: 900, y: 100 } }  // Bottom-right
        ]
    },
    'original': {
        name: 'Original',
        dataRange: { minX: 0, maxX: 800, minY: 0, maxY: 400 },
        imageSize: { width: 800, height: 400 },
        testPoints: [
            { screen: { x: 0, y: 0 }, expectedData: { x: 0, y: 400 } },        // Top-left
            { screen: { x: 400, y: 200 }, expectedData: { x: 400, y: 200 } }, // Center
            { screen: { x: 800, y: 400 }, expectedData: { x: 800, y: 0 } }     // Bottom-right
        ]
    },
    'scaled': {
        name: 'Scaled',
        dataRange: { minX: 0, maxX: 800, minY: 0, maxY: 400 },
        imageSize: { width: 900, height: 300 },
        testPoints: [
            { screen: { x: 0, y: 0 }, expectedData: { x: 0, y: 400 } },        // Top-left
            { screen: { x: 450, y: 150 }, expectedData: { x: 400, y: 200 } }, // Center
            { screen: { x: 900, y: 300 }, expectedData: { x: 800, y: 0 } }     // Bottom-right
        ]
    }
};

/**
 * Run basic coordinate tests
 */
export function runBasicCoordinateTests() {
    const results = [];
    
    console.log('Running basic coordinate transformation tests...\n');
    
    for (const [key, config] of Object.entries(TEST_CONFIGS)) {
        console.log(`Testing ${config.name} (${key}):`);
        
        let passed = true;
        const errors = [];
        const details = [];
        
        for (const testPoint of config.testPoints) {
            try {
                const containerSize = { 
                    width: config.imageSize.width, 
                    height: config.imageSize.height 
                };
                
                const dataCoords = BasicCoordinates.screenToData(
                    testPoint.screen.x, 
                    testPoint.screen.y,
                    config.dataRange,
                    config.imageSize,
                    containerSize
                );
                
                const tolerance = 1.0; // Allow 1 unit tolerance
                const deltaX = Math.abs(dataCoords.x - testPoint.expectedData.x);
                const deltaY = Math.abs(dataCoords.y - testPoint.expectedData.y);
                
                if (deltaX > tolerance || deltaY > tolerance) {
                    const error = `Screen(${testPoint.screen.x}, ${testPoint.screen.y}) -> ` +
                                `Data(${dataCoords.x.toFixed(1)}, ${dataCoords.y.toFixed(1)}) ` +
                                `Expected(${testPoint.expectedData.x}, ${testPoint.expectedData.y}) ` +
                                `Delta(${deltaX.toFixed(1)}, ${deltaY.toFixed(1)})`;
                    errors.push(error);
                    console.log(`  ❌ ${error}`);
                    passed = false;
                } else {
                    const detail = `Screen(${testPoint.screen.x}, ${testPoint.screen.y}) -> ` +
                                 `Data(${dataCoords.x.toFixed(1)}, ${dataCoords.y.toFixed(1)}) ✓`;
                    details.push(detail);
                    console.log(`  ✅ ${detail}`);
                }
            } catch (error) {
                errors.push(`Transform error: ${error.message}`);
                console.log(`  ❌ Transform error: ${error.message}`);
                passed = false;
            }
        }
        
        results.push({
            name: config.name,
            key,
            passed,
            errors,
            details
        });
        
        console.log(`  Result: ${passed ? '✅ PASSED' : '❌ FAILED'}\n`);
    }
    
    // Summary
    const totalPassed = results.filter(r => r.passed).length;
    const totalTests = results.length;
    console.log(`Summary: ${totalPassed}/${totalTests} configurations passed`);
    
    return {
        results,
        summary: {
            total: totalTests,
            passed: totalPassed,
            failed: totalTests - totalPassed
        }
    };
}

/**
 * Test zoom transform calculations
 */
export function testZoomTransforms() {
    console.log('\nTesting zoom transform calculations...\n');
    
    const testCases = [
        {
            name: '2x uniform zoom',
            transform: { scaleX: 2.0, scaleY: 2.0, panX: -250, panY: -125 },
            point: { x: 500, y: 250 },
            expected: { x: 750, y: 375 }
        },
        {
            name: 'Aspect ratio zoom',
            transform: { scaleX: 3.0, scaleY: 1.5, panX: 0, panY: 0 },
            point: { x: 100, y: 100 },
            expected: { x: 300, y: 150 }
        }
    ];
    
    const results = [];
    
    for (const testCase of testCases) {
        const result = applyTransform(testCase.point, testCase.transform);
        const deltaX = Math.abs(result.x - testCase.expected.x);
        const deltaY = Math.abs(result.y - testCase.expected.y);
        const tolerance = 0.1;
        
        const passed = deltaX < tolerance && deltaY < tolerance;
        
        console.log(`${testCase.name}:`);
        console.log(`  Point(${testCase.point.x}, ${testCase.point.y}) -> ` +
                   `Transformed(${result.x}, ${result.y}) ` +
                   `Expected(${testCase.expected.x}, ${testCase.expected.y}) ` +
                   `${passed ? '✅' : '❌'}`);
        
        results.push({
            name: testCase.name,
            passed,
            result,
            expected: testCase.expected
        });
    }
    
    return results;
}

/**
 * Apply transform to a point
 */
function applyTransform(point, transform) {
    return {
        x: point.x * transform.scaleX + transform.panX,
        y: point.y * transform.scaleY + transform.panY
    };
}

/**
 * Run all basic tests
 */
export function runAllBasicTests() {
    console.log('='.repeat(50));
    console.log('BASIC COORDINATE TRANSFORMATION TESTS');
    console.log('='.repeat(50));
    
    const coordinateResults = runBasicCoordinateTests();
    const zoomResults = testZoomTransforms();
    
    console.log('\n' + '='.repeat(50));
    console.log('SUMMARY');
    console.log('='.repeat(50));
    console.log(`Coordinate tests: ${coordinateResults.summary.passed}/${coordinateResults.summary.total} passed`);
    console.log(`Zoom tests: ${zoomResults.filter(r => r.passed).length}/${zoomResults.length} passed`);
    
    const allPassed = coordinateResults.summary.failed === 0 && zoomResults.every(r => r.passed);
    console.log(`\nOverall result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    return {
        coordinate: coordinateResults,
        zoom: zoomResults,
        allPassed
    };
}

// Allow running from command line
if (typeof process !== 'undefined' && process.argv && process.argv[1].endsWith('basicCoordinateTests.js')) {
    runAllBasicTests();
}