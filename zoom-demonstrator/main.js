/**
 * Main demonstrator class for drag-to-zoom functionality
 * 
 * This module serves as the entry point and coordinator for the drag-to-zoom
 * demonstrator project, integrating coordinate transformations, UI handling,
 * and zoom/pan functionality.
 */

import { createInitialTransform, runCoordinateTests, applyTransform } from './coordinates.js';
import { ZoomDemonstratorUI } from './ui.js';

/**
 * Main demonstrator class that coordinates all functionality
 */
export class ZoomDemonstrator {
    constructor() {
        this.svg = null;
        this.ui = null;
        this.transform = null;
        
        // Initialize on DOM content loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }
    
    /**
     * Initialize the demonstrator
     */
    initialize() {
        console.log('Initializing ZoomDemonstrator...');
        
        // Run coordinate system tests
        const testsPass = runCoordinateTests();
        if (!testsPass) {
            console.warn('Some coordinate tests failed. Check console for details.');
        }
        
        // Get SVG element
        this.svg = document.getElementById('demo-svg');
        if (!this.svg) {
            console.error('SVG element not found');
            return;
        }
        
        // Initialize transform state
        this.transform = createInitialTransform();
        
        // Apply initial transform
        applyTransform(this.svg, this.transform);
        
        // Initialize UI
        this.ui = new ZoomDemonstratorUI();
        this.ui.initialize({
            svg: this.svg,
            transform: this.transform,
            onTransformChange: (transform) => this.onTransformChange(transform)
        });
        
        console.log('ZoomDemonstrator initialized successfully');
        
        // Update status with initialization result
        const statusElement = document.getElementById('status');
        if (statusElement) {
            const testStatus = testsPass ? '✓ All coordinate tests passed' : '⚠ Some coordinate tests failed';
            statusElement.textContent = `Ready. ${testStatus}. Use Pan mode to drag the view, or Zoom mode to select area for zoom in.`;
        }
    }
    
    /**
     * Handle transform changes from UI
     * @param {TransformState} transform - Updated transform state
     */
    onTransformChange(transform) {
        // Log transform changes for debugging
        console.log('Transform changed:', {
            zoomX: transform.zoomLevelX.toFixed(2),
            zoomY: transform.zoomLevelY.toFixed(2),
            pan: `(${Math.round(transform.panOffset.x)}, ${Math.round(transform.panOffset.y)})`
        });
        
        // Here we could notify other systems about transform changes
        // For now, just ensure the SVG is updated
        applyTransform(this.svg, transform);
    }
    
    /**
     * Get current transform state (for external inspection)
     * @returns {TransformState} Current transform state
     */
    getTransform() {
        return { ...this.transform };
    }
    
    /**
     * Set transform state (for external control)
     * @param {TransformState} newTransform - New transform state
     */
    setTransform(newTransform) {
        this.transform = { ...newTransform };
        applyTransform(this.svg, this.transform);
        this.onTransformChange(this.transform);
    }
    
    /**
     * Get current mode from UI
     * @returns {string} Current mode ('pan' or 'zoom')
     */
    getCurrentMode() {
        return this.ui ? this.ui.state.currentMode : 'pan';
    }
    
    /**
     * Set current mode in UI
     * @param {string} mode - Mode to set ('pan' or 'zoom')
     */
    setMode(mode) {
        if (this.ui) {
            this.ui.setMode(mode);
        }
    }
    
    /**
     * Perform zoom operation programmatically
     * @param {number} factor - Zoom factor (2.0 for zoom in, 0.5 for zoom out)
     * @param {Point} center - Optional zoom center point in SVG coordinates
     */
    zoom(factor, center = null) {
        if (!center) {
            // Use center of current view as zoom center
            const svgRect = this.svg.getBoundingClientRect();
            const coords = transformCoordinates(
                svgRect.width / 2, 
                svgRect.height / 2, 
                this.svg, 
                this.transform
            );
            center = coords.svg;
        }
        
        import('./coordinates.js').then(({ zoomAt }) => {
            zoomAt(this.transform, factor, center);
            applyTransform(this.svg, this.transform);
            this.onTransformChange(this.transform);
        });
    }
    
    /**
     * Reset zoom and pan to initial state
     */
    reset() {
        import('./coordinates.js').then(({ resetTransform }) => {
            resetTransform(this.transform);
            applyTransform(this.svg, this.transform);
            this.onTransformChange(this.transform);
        });
    }
    
    /**
     * Clean up and destroy the demonstrator
     */
    destroy() {
        if (this.ui) {
            this.ui.destroy();
            this.ui = null;
        }
        
        this.svg = null;
        this.transform = null;
        
        console.log('ZoomDemonstrator destroyed');
    }
}

// Create and initialize the demonstrator
const demonstrator = new ZoomDemonstrator();

// Make it available globally for debugging
window.zoomDemonstrator = demonstrator;

// Export for module use
export default demonstrator;