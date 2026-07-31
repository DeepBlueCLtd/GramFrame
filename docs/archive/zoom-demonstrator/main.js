/**
 * Drag-to-Zoom Demonstrator - Thin Main Entry Point
 * 
 * Lightweight initialization that creates a ZoomPanel component
 * and handles external UI events (mode switching, image switching, zoom controls)
 * 
 * This approach prepares the component for integration into GramFrame
 * where it will be just one feature among many.
 */

import { ZoomPanel } from './ZoomPanel.js';
import { testImageConfigs, getImageConfig, getDefaultImageKey } from './imageConfigs.js';

class ZoomDemonstrator {
    constructor() {
        this.init();
    }
    
    /**
     * Initialize the demonstrator
     */
    init() {
        // Get the container element
        /** @type {HTMLElement} */
        const container = document.body; // In GramFrame, this would be passed in
        
        // Get initial image configuration
        /** @type {string} */
        const defaultImageKey = getDefaultImageKey();
        /** @type {import('./types.js').TestImageConfig} */
        const initialImageConfig = getImageConfig(defaultImageKey);
        
        // Create the ZoomPanel component
        this.zoomPanel = new ZoomPanel(container, initialImageConfig);
        
        // Set up external UI event handlers
        this.setupUIEventHandlers();
        
        console.log('ZoomDemonstrator initialized with ZoomPanel architecture');
    }
    
    /**
     * Set up event handlers for external UI controls
     * These would be handled by GramFrame in the final integration
     */
    setupUIEventHandlers() {
        // Mode switching buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                /** @type {import('./types.js').InteractionMode} */
                const mode = e.target.dataset.mode;
                this.setMode(mode);
            });
        });
        
        // Zoom control buttons
        const zoomInBtn = document.getElementById('zoom-in');
        const zoomOutBtn = document.getElementById('zoom-out');
        const zoomResetBtn = document.getElementById('zoom-reset');
        
        if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.zoomByFactor(2.0));
        if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.zoomByFactor(0.5));
        if (zoomResetBtn) zoomResetBtn.addEventListener('click', () => this.resetZoom());
        
        // Image switching buttons
        const imageButtons = [
            { id: 'image-original', key: 'original' },
            { id: 'image-scaled', key: 'scaled' },
            { id: 'image-offset', key: 'offset' },
            { id: 'image-mock', key: 'mock' }
        ];
        
        imageButtons.forEach(({ id, key }) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => this.switchTestImage(key));
            }
        });
    }
    
    /**
     * Set interaction mode (delegated to ZoomPanel)
     * @param {import('./types.js').InteractionMode} mode - New interaction mode
     */
    setMode(mode) {
        this.zoomPanel.setMode(mode);
        
        // Update UI state
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
    }
    
    /**
     * Switch test image (delegated to ZoomPanel)
     * @param {string} imageKey - Image configuration key
     */
    switchTestImage(imageKey) {
        try {
            /** @type {import('./types.js').TestImageConfig} */
            const imageConfig = getImageConfig(imageKey);
            this.zoomPanel.switchImage(imageConfig);
            
            // Update UI state
            document.querySelectorAll('.zoom-btn[id^="image-"]').forEach(btn => {
                btn.classList.remove('active');
            });
            const activeBtn = document.getElementById(`image-${imageKey}`);
            if (activeBtn) {
                activeBtn.classList.add('active');
            }
        } catch (error) {
            console.error('Failed to switch image:', error);
        }
    }
    
    /**
     * Zoom by factor (delegated to ZoomPanel)
     * @param {number} factor - Zoom factor
     */
    zoomByFactor(factor) {
        this.zoomPanel.zoomByFactor(factor);
    }
    
    /**
     * Reset zoom (delegated to ZoomPanel)
     */
    resetZoom() {
        this.zoomPanel.resetZoom();
    }
    
    /**
     * Get current zoom state (for external access)
     * @returns {import('./types.js').ZoomState} Current zoom state
     */
    get zoomState() {
        return this.zoomPanel.zoomState;
    }
    
    /**
     * Get current image dimensions (for external access)
     * @returns {import('./types.js').ImageDimensions} Current image dimensions
     */
    getCurrentImageDimensions() {
        return this.zoomPanel.getCurrentImageDimensions();
    }
    
    /**
     * Destroy the demonstrator and clean up resources
     */
    destroy() {
        if (this.zoomPanel) {
            this.zoomPanel.destroy();
        }
    }
}

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
    window.zoomDemo = new ZoomDemonstrator();
});