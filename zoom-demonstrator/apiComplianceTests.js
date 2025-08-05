/**
 * API Compliance Tests for GramFrame Integration
 * 
 * Validates that the zoom demonstrator follows GramFrame API patterns
 * and is ready for integration into the main codebase.
 */

import { BaseMode } from './BaseMode.js';
import { PanMode } from './PanMode.js';
import { ZoomMode } from './ZoomMode.js';
import { StateManager } from './StateManager.js';
import { ModeManager } from './ModeManager.js';

/**
 * Test API compliance with GramFrame patterns
 */
export function testAPICompliance() {
    let output = 'API Compliance Test Results\n';
    output += '===========================\n\n';
    
    const results = {
        baseMode: testBaseModeCompliance(),
        stateManager: testStateManagerCompliance(),
        modeManager: testModeManagerCompliance(),
        lifecycle: testLifecycleCompliance()
    };
    
    // Format results
    for (const [category, result] of Object.entries(results)) {
        output += `${category.toUpperCase()} Compliance:\n`;
        output += `Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
        
        if (result.details.length > 0) {
            output += 'Details:\n';
            result.details.forEach(detail => {
                output += `  ${detail}\n`;
            });
        }
        
        if (result.errors.length > 0) {
            output += 'Errors:\n';
            result.errors.forEach(error => {
                output += `  ❌ ${error}\n`;
            });
        }
        
        output += '\n';
    }
    
    // Summary
    const totalPassed = Object.values(results).filter(r => r.passed).length;
    const totalTests = Object.keys(results).length;
    output += `\nSummary: ${totalPassed}/${totalTests} categories passed\n`;
    
    return output;
}

/**
 * Test BaseMode API compliance
 */
function testBaseModeCompliance() {
    const result = { passed: true, details: [], errors: [] };
    
    // Required methods from GramFrame BaseMode
    const requiredMethods = [
        'activate',
        'deactivate',
        'handleMouseDown',
        'handleMouseMove',
        'handleMouseUp',
        'handleMouseLeave',
        'renderPersistentFeatures',
        'renderCursor',
        'updateDisplays',
        'getGuidanceText',
        'resetState',
        'cleanup',
        'createUI',
        'destroyUI',
        'getStateSnapshot',
        'getCursorStyle',
        'handlesDrag',
        'getDisplayName'
    ];
    
    const requiredStaticMethods = ['getInitialState'];
    
    // Test BaseMode
    try {
        const mockZoomPanel = { svg: {} };
        const mockStateManager = new StateManager();
        const baseMode = new BaseMode(mockZoomPanel, mockStateManager);
        
        // Check instance methods
        for (const method of requiredMethods) {
            if (typeof baseMode[method] === 'function') {
                result.details.push(`✓ BaseMode.${method}() exists`);
            } else {
                result.errors.push(`BaseMode.${method}() is missing`);
                result.passed = false;
            }
        }
        
        // Check static methods
        for (const method of requiredStaticMethods) {
            if (typeof BaseMode[method] === 'function') {
                result.details.push(`✓ BaseMode.${method}() exists (static)`);
            } else {
                result.errors.push(`BaseMode.${method}() is missing (static)`);
                result.passed = false;
            }
        }
        
        // Test PanMode extends BaseMode properly
        const panMode = new PanMode(mockZoomPanel, mockStateManager);
        if (panMode instanceof BaseMode) {
            result.details.push('✓ PanMode extends BaseMode');
        } else {
            result.errors.push('PanMode does not extend BaseMode');
            result.passed = false;
        }
        
        // Test ZoomMode extends BaseMode properly
        const zoomMode = new ZoomMode(mockZoomPanel, mockStateManager);
        if (zoomMode instanceof BaseMode) {
            result.details.push('✓ ZoomMode extends BaseMode');
        } else {
            result.errors.push('ZoomMode does not extend BaseMode');
            result.passed = false;
        }
        
    } catch (error) {
        result.errors.push(`BaseMode instantiation error: ${error.message}`);
        result.passed = false;
    }
    
    return result;
}

/**
 * Test StateManager API compliance
 */
function testStateManagerCompliance() {
    const result = { passed: true, details: [], errors: [] };
    
    const requiredMethods = [
        'addListener',
        'removeListener',
        'notifyStateChange',
        'getState',
        'createInitialState'
    ];
    
    try {
        const stateManager = new StateManager();
        
        // Check methods
        for (const method of requiredMethods) {
            if (typeof stateManager[method] === 'function') {
                result.details.push(`✓ StateManager.${method}() exists`);
            } else {
                result.errors.push(`StateManager.${method}() is missing`);
                result.passed = false;
            }
        }
        
        // Test listener pattern
        let listenerCalled = false;
        const testListener = (state) => {
            listenerCalled = true;
            if (typeof state !== 'object') {
                result.errors.push('State passed to listener is not an object');
                result.passed = false;
            }
        };
        
        stateManager.addListener(testListener);
        stateManager.notifyStateChange({ action: 'test' });
        
        if (listenerCalled) {
            result.details.push('✓ Listener pattern works correctly');
        } else {
            result.errors.push('Listener was not called');
            result.passed = false;
        }
        
        // Test state immutability
        const state1 = stateManager.getState();
        state1.test = 'modified';
        const state2 = stateManager.getState();
        
        if (!state2.test) {
            result.details.push('✓ State is immutable (deep copied)');
        } else {
            result.errors.push('State is mutable - not properly deep copied');
            result.passed = false;
        }
        
    } catch (error) {
        result.errors.push(`StateManager error: ${error.message}`);
        result.passed = false;
    }
    
    return result;
}

/**
 * Test ModeManager API compliance
 */
function testModeManagerCompliance() {
    const result = { passed: true, details: [], errors: [] };
    
    const requiredMethods = [
        'setMode',
        'getActiveMode',
        'getCurrentModeName',
        'getAvailableModes',
        'hasMode',
        'handleMouseDown',
        'handleMouseMove',
        'handleMouseUp',
        'handleMouseLeave'
    ];
    
    try {
        // Mock dependencies
        const mockZoomPanel = {
            svg: { style: {} },
            ui: { updateStatus: () => {} }
        };
        const stateManager = new StateManager();
        const modeManager = new ModeManager(mockZoomPanel, stateManager);
        
        // Check methods
        for (const method of requiredMethods) {
            if (typeof modeManager[method] === 'function') {
                result.details.push(`✓ ModeManager.${method}() exists`);
            } else {
                result.errors.push(`ModeManager.${method}() is missing`);
                result.passed = false;
            }
        }
        
        // Test mode switching
        const initialMode = modeManager.getCurrentModeName();
        if (initialMode === 'pan') {
            result.details.push('✓ Default mode is pan');
        } else {
            result.errors.push(`Default mode is ${initialMode}, expected pan`);
            result.passed = false;
        }
        
        // Test available modes
        const availableModes = modeManager.getAvailableModes();
        if (availableModes.includes('pan') && availableModes.includes('zoom')) {
            result.details.push('✓ Pan and zoom modes are available');
        } else {
            result.errors.push('Required modes (pan, zoom) are not available');
            result.passed = false;
        }
        
    } catch (error) {
        result.errors.push(`ModeManager error: ${error.message}`);
        result.passed = false;
    }
    
    return result;
}

/**
 * Test lifecycle compliance
 */
function testLifecycleCompliance() {
    const result = { passed: true, details: [], errors: [] };
    
    try {
        // Mock dependencies
        const mockZoomPanel = {
            svg: { style: {} },
            ui: { updateStatus: () => {} }
        };
        const stateManager = new StateManager();
        
        // Test mode lifecycle
        const panMode = new PanMode(mockZoomPanel, stateManager);
        
        // Test activation
        panMode.activate();
        if (panMode.isActive) {
            result.details.push('✓ Mode activation sets isActive');
        } else {
            result.errors.push('Mode activation failed to set isActive');
            result.passed = false;
        }
        
        // Test deactivation
        panMode.deactivate();
        if (!panMode.isActive) {
            result.details.push('✓ Mode deactivation clears isActive');
        } else {
            result.errors.push('Mode deactivation failed to clear isActive');
            result.passed = false;
        }
        
        // Test state cleanup
        const initialState = PanMode.getInitialState();
        if (typeof initialState === 'object' && initialState.panMode) {
            result.details.push('✓ Mode provides initial state');
        } else {
            result.errors.push('Mode getInitialState() does not return proper structure');
            result.passed = false;
        }
        
    } catch (error) {
        result.errors.push(`Lifecycle test error: ${error.message}`);
        result.passed = false;
    }
    
    return result;
}

/**
 * Test coordinate transformation API
 */
export function testCoordinateAPI() {
    const results = [];
    
    // Test TransformManager API
    const transformMethods = [
        'getAllCoordinates',
        'screenToSVG',
        'screenToActualSVG',
        'svgToData',
        'dataToImage',
        'screenToData',
        'screenToImage',
        'getZoomState',
        'updatePan',
        'zoomToRect',
        'zoomByFactor',
        'resetTransform'
    ];
    
    // This would be tested with actual instance
    results.push({
        name: 'TransformManager API',
        methods: transformMethods,
        note: 'Methods validated in coordinate tests'
    });
    
    return results;
}