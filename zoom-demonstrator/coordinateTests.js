/**
 * Comprehensive Coordinate Transformation Tests
 * 
 * Validates coordinate transformations across all test images
 * and zoom/pan operations to ensure accuracy.
 * 
 * @typedef {import('./types.js').DataRange} DataRange
 * @typedef {import('./types.js').Point2D} Point2D
 * @typedef {import('./types.js').ZoomState} ZoomState
 */

import { CoordinateSystem } from './coordinates.js';
import { TransformManager } from './transformManager.js';

/**
 * Test configuration for different images
 */
const TEST_CONFIGS = {
    'offset': {
        name: 'Offset Axes',
        dataRange: { minX: 100, maxX: 900, minY: 100, maxY: 500 },
        imageWidth: 1000,
        imageHeight: 500,
        testPoints: [
            { screen: { x: 0, y: 0 }, expectedData: { x: 100, y: 500 } },      // Top-left
            { screen: { x: 500, y: 250 }, expectedData: { x: 500, y: 300 } },  // Center
            { screen: { x: 1000, y: 500 }, expectedData: { x: 900, y: 100 } }  // Bottom-right
        ]
    },
    'original': {
        name: 'Original',
        dataRange: { minX: 0, maxX: 800, minY: 0, maxY: 400 },
        imageWidth: 800,
        imageHeight: 400,
        testPoints: [
            { screen: { x: 0, y: 0 }, expectedData: { x: 0, y: 400 } },        // Top-left
            { screen: { x: 400, y: 200 }, expectedData: { x: 400, y: 200 } }, // Center
            { screen: { x: 800, y: 400 }, expectedData: { x: 800, y: 0 } }     // Bottom-right
        ]
    },
    'scaled': {
        name: 'Scaled',
        dataRange: { minX: 0, maxX: 800, minY: 0, maxY: 400 },
        imageWidth: 900,
        imageHeight: 300,
        testPoints: [
            { screen: { x: 0, y: 0 }, expectedData: { x: 0, y: 400 } },        // Top-left
            { screen: { x: 450, y: 150 }, expectedData: { x: 400, y: 200 } }, // Center
            { screen: { x: 900, y: 300 }, expectedData: { x: 800, y: 0 } }     // Bottom-right
        ]
    }
};

/**
 * Test result structure
 */
class TestResult {
    constructor(name) {
        this.name = name;
        this.passed = true;
        this.errors = [];
        this.details = [];
    }
    
    addError(error) {
        this.errors.push(error);
        this.passed = false;
    }
    
    addDetail(detail) {
        this.details.push(detail);
    }
}

/**
 * Run coordinate transformation tests
 */
export function runCoordinateTests() {
    const results = [];
    
    // Test each image configuration
    for (const [key, config] of Object.entries(TEST_CONFIGS)) {
        const result = new TestResult(`${config.name} (${key})`);
        
        try {
            // Create coordinate system for this configuration
            const coordSystem = new CoordinateSystem(
                config.dataRange,
                config.imageWidth,
                config.imageHeight
            );
            
            // Test basic transformations
            testBasicTransformations(coordSystem, config, result);
            
            // Test with zoom/pan
            testWithZoomPan(coordSystem, config, result);
            
            // Test round-trip accuracy
            testRoundTrip(coordSystem, config, result);
            
        } catch (error) {
            result.addError(`Setup error: ${error.message}`);
        }
        
        results.push(result);
    }
    
    return results;
}

/**
 * Test basic coordinate transformations
 */
function testBasicTransformations(coordSystem, config, result) {
    result.addDetail('Testing basic transformations...');
    
    // Mock DOM elements
    mockDOMElements(config);
    
    for (const testPoint of config.testPoints) {
        try {
            const dataCoords = coordSystem.screenToData(testPoint.screen.x, testPoint.screen.y);
            
            const tolerance = 1.0; // Allow 1 unit tolerance
            const deltaX = Math.abs(dataCoords.x - testPoint.expectedData.x);
            const deltaY = Math.abs(dataCoords.y - testPoint.expectedData.y);
            
            if (deltaX > tolerance || deltaY > tolerance) {
                result.addError(
                    `Screen(${testPoint.screen.x}, ${testPoint.screen.y}) -> ` +
                    `Data(${dataCoords.x.toFixed(1)}, ${dataCoords.y.toFixed(1)}) ` +
                    `Expected(${testPoint.expectedData.x}, ${testPoint.expectedData.y})`
                );
            } else {
                result.addDetail(
                    `✓ Screen(${testPoint.screen.x}, ${testPoint.screen.y}) -> ` +
                    `Data(${dataCoords.x.toFixed(1)}, ${dataCoords.y.toFixed(1)})`
                );
            }
        } catch (error) {
            result.addError(`Transform error: ${error.message}`);
        }
    }
}

/**
 * Test transformations with zoom and pan
 */
function testWithZoomPan(coordSystem, config, result) {
    result.addDetail('Testing with zoom/pan...');
    
    // Create transform manager
    const container = { clientWidth: config.imageWidth, clientHeight: config.imageHeight };
    const transformManager = new TransformManager(coordSystem, container);
    
    // Test zoom scenarios
    const zoomScenarios = [
        { name: '2x zoom', scaleX: 2.0, scaleY: 2.0, panX: -config.imageWidth/4, panY: -config.imageHeight/4 },
        { name: 'Aspect zoom', scaleX: 3.0, scaleY: 1.5, panX: 0, panY: 0 },
        { name: 'Pan only', scaleX: 1.0, scaleY: 1.0, panX: 100, panY: 50 }
    ];
    
    for (const scenario of zoomScenarios) {
        transformManager.setZoomLevel(scenario.scaleX, scenario.scaleY);
        transformManager.setViewOffset(scenario.panX, scenario.panY);
        
        // Test center point transformation
        const centerScreen = { x: config.imageWidth / 2, y: config.imageHeight / 2 };
        const coords = transformManager.getAllCoordinates(centerScreen.x, centerScreen.y);
        
        result.addDetail(
            `✓ ${scenario.name}: Center -> Data(${coords.data.x.toFixed(1)}, ${coords.data.y.toFixed(1)})`
        );
        
        // Verify zoom state
        const zoomState = transformManager.getZoomState();
        if (zoomState.scaleX !== scenario.scaleX || zoomState.scaleY !== scenario.scaleY) {
            result.addError(`Zoom state mismatch in ${scenario.name}`);
        }
    }
}

/**
 * Test round-trip transformation accuracy
 */
function testRoundTrip(coordSystem, config, result) {
    result.addDetail('Testing round-trip accuracy...');
    
    const testDataPoints = [
        { x: config.dataRange.minX, y: config.dataRange.minY },
        { x: (config.dataRange.minX + config.dataRange.maxX) / 2, 
          y: (config.dataRange.minY + config.dataRange.maxY) / 2 },
        { x: config.dataRange.maxX, y: config.dataRange.maxY }
    ];
    
    for (const dataPoint of testDataPoints) {
        // Data -> SVG -> Data
        const svgCoords = coordSystem.dataToSVG(dataPoint.x, dataPoint.y);
        const backToData = coordSystem.svgToData(svgCoords.x, svgCoords.y);
        
        const tolerance = 0.001;
        const deltaX = Math.abs(backToData.x - dataPoint.x);
        const deltaY = Math.abs(backToData.y - dataPoint.y);
        
        if (deltaX > tolerance || deltaY > tolerance) {
            result.addError(
                `Round-trip failed: Data(${dataPoint.x}, ${dataPoint.y}) -> ` +
                `SVG -> Data(${backToData.x}, ${backToData.y})`
            );
        } else {
            result.addDetail(
                `✓ Round-trip: Data(${dataPoint.x}, ${dataPoint.y}) accurate`
            );
        }
    }
}

/**
 * Mock DOM elements for testing
 */
function mockDOMElements(config) {
    // Mock container element
    if (typeof document === 'undefined') {
        global.document = {
            getElementById: (id) => {
                if (id === 'demo-container') {
                    return {
                        getBoundingClientRect: () => ({
                            width: config.imageWidth,
                            height: config.imageHeight
                        })
                    };
                }
                return null;
            }
        };
    }
}

/**
 * Format test results for display
 */
export function formatTestResults(results) {
    let output = 'Coordinate Transformation Test Results\n';
    output += '=====================================\n\n';
    
    let totalPassed = 0;
    let totalFailed = 0;
    
    for (const result of results) {
        output += `Test: ${result.name}\n`;
        output += `Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
        
        if (result.details.length > 0) {
            output += '\nDetails:\n';
            result.details.forEach(detail => {
                output += `  ${detail}\n`;
            });
        }
        
        if (result.errors.length > 0) {
            output += '\nErrors:\n';
            result.errors.forEach(error => {
                output += `  ❌ ${error}\n`;
            });
        }
        
        output += '\n' + '-'.repeat(50) + '\n\n';
        
        if (result.passed) totalPassed++;
        else totalFailed++;
    }
    
    output += `Summary: ${totalPassed} passed, ${totalFailed} failed\n`;
    
    return output;
}

/**
 * Run tests and display results
 */
export function runAndDisplayTests() {
    console.log('Running comprehensive coordinate transformation tests...');
    
    const results = runCoordinateTests();
    const formatted = formatTestResults(results);
    
    console.log(formatted);
    
    // Return summary for programmatic use
    return {
        results,
        summary: {
            total: results.length,
            passed: results.filter(r => r.passed).length,
            failed: results.filter(r => !r.passed).length
        }
    };
}