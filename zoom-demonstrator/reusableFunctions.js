/**
 * Reusable Coordinate Transformation Functions
 * 
 * Extracted functions ready for integration into GramFrame main codebase.
 * These functions are battle-tested and validated across multiple test cases.
 * 
 * @module reusableFunctions
 */

/**
 * Core coordinate transformation utilities
 * Can be integrated into GramFrame's coordinate system
 */
export const CoordinateUtils = {
    /**
     * Convert screen coordinates to SVG coordinates with Y-axis inversion
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @param {Object} viewBox - SVG viewBox {x, y, width, height}
     * @param {Object} container - Container dimensions {width, height}
     * @param {boolean} invertY - Whether to invert Y axis (default: true)
     * @returns {{x: number, y: number}} SVG coordinates
     */
    screenToSVG(screenX, screenY, viewBox, container, invertY = true) {
        const scaleX = viewBox.width / container.width;
        const scaleY = viewBox.height / container.height;
        
        const svgX = viewBox.x + (screenX * scaleX);
        const svgY = invertY ? 
            viewBox.y + viewBox.height - (screenY * scaleY) :
            viewBox.y + (screenY * scaleY);
        
        return { x: svgX, y: svgY };
    },
    
    /**
     * Convert SVG coordinates to data coordinates
     * @param {number} svgX - SVG X coordinate
     * @param {number} svgY - SVG Y coordinate
     * @param {Object} dataRange - Data ranges {minX, maxX, minY, maxY}
     * @param {Object} viewBox - SVG viewBox {width, height}
     * @returns {{x: number, y: number}} Data coordinates
     */
    svgToData(svgX, svgY, dataRange, viewBox) {
        const dataX = dataRange.minX + (svgX / viewBox.width) * (dataRange.maxX - dataRange.minX);
        const dataY = dataRange.minY + (svgY / viewBox.height) * (dataRange.maxY - dataRange.minY);
        
        return { x: dataX, y: dataY };
    },
    
    /**
     * Apply zoom/pan transform to coordinates
     * @param {number} x - Original X coordinate
     * @param {number} y - Original Y coordinate
     * @param {Object} transform - Transform state {scaleX, scaleY, panX, panY}
     * @returns {{x: number, y: number}} Transformed coordinates
     */
    applyTransform(x, y, transform) {
        return {
            x: x * transform.scaleX + transform.panX,
            y: y * transform.scaleY + transform.panY
        };
    },
    
    /**
     * Apply inverse transform to coordinates
     * @param {number} x - Transformed X coordinate
     * @param {number} y - Transformed Y coordinate
     * @param {Object} transform - Transform state {scaleX, scaleY, panX, panY}
     * @returns {{x: number, y: number}} Original coordinates
     */
    applyInverseTransform(x, y, transform) {
        return {
            x: (x - transform.panX) / transform.scaleX,
            y: (y - transform.panY) / transform.scaleY
        };
    }
};

/**
 * Pan limit calculation utilities
 */
export const PanLimitUtils = {
    /**
     * Calculate pan limits to prevent showing beyond image boundaries
     * @param {Object} imageDimensions - Image dimensions {width, height}
     * @param {Object} zoomState - Current zoom state {scaleX, scaleY}
     * @returns {Object} Pan limits {minPanX, maxPanX, minPanY, maxPanY}
     */
    calculatePanLimits(imageDimensions, zoomState) {
        const scaledWidth = imageDimensions.width * zoomState.scaleX;
        const scaledHeight = imageDimensions.height * zoomState.scaleY;
        
        return {
            maxPanX: 0, // Can't pan right (would show empty space on left)
            minPanX: Math.min(0, imageDimensions.width - scaledWidth),
            maxPanY: 0, // Can't pan down (would show empty space on top)
            minPanY: Math.min(0, imageDimensions.height - scaledHeight)
        };
    },
    
    /**
     * Apply pan limits to a pan offset
     * @param {number} panX - Desired X pan offset
     * @param {number} panY - Desired Y pan offset
     * @param {Object} limits - Pan limits from calculatePanLimits
     * @returns {{x: number, y: number}} Constrained pan offset
     */
    applyPanLimits(panX, panY, limits) {
        return {
            x: Math.max(limits.minPanX, Math.min(limits.maxPanX, panX)),
            y: Math.max(limits.minPanY, Math.min(limits.maxPanY, panY))
        };
    }
};

/**
 * Zoom calculation utilities
 */
export const ZoomUtils = {
    /**
     * Calculate zoom to fit a rectangle
     * @param {Object} rect - Rectangle to zoom to {x, y, width, height}
     * @param {Object} viewport - Viewport dimensions {width, height}
     * @returns {Object} Zoom state {scaleX, scaleY, panX, panY}
     */
    calculateZoomToRect(rect, viewport) {
        const scaleX = viewport.width / rect.width;
        const scaleY = viewport.height / rect.height;
        
        const centerX = rect.x + rect.width / 2;
        const centerY = rect.y + rect.height / 2;
        
        const viewCenterX = viewport.width / 2;
        const viewCenterY = viewport.height / 2;
        
        const panX = viewCenterX - (centerX * scaleX);
        const panY = viewCenterY - (centerY * scaleY);
        
        return { scaleX, scaleY, panX, panY };
    },
    
    /**
     * Calculate zoom by factor around a point
     * @param {number} factor - Zoom factor
     * @param {Object} point - Zoom center point {x, y}
     * @param {Object} currentZoom - Current zoom state
     * @param {Object} viewport - Viewport dimensions
     * @returns {Object} New zoom state
     */
    calculateZoomByFactor(factor, point, currentZoom, viewport) {
        // Find what point in the image is at the zoom center
        const imageCenterX = (point.x - currentZoom.panX) / currentZoom.scaleX;
        const imageCenterY = (point.y - currentZoom.panY) / currentZoom.scaleY;
        
        // Apply zoom factor
        const newScaleX = currentZoom.scaleX * factor;
        const newScaleY = currentZoom.scaleY * factor;
        
        // Recalculate pan to keep the same point at the center
        const newPanX = point.x - (imageCenterX * newScaleX);
        const newPanY = point.y - (imageCenterY * newScaleY);
        
        return {
            scaleX: newScaleX,
            scaleY: newScaleY,
            panX: newPanX,
            panY: newPanY
        };
    }
};

/**
 * State management utilities following GramFrame patterns
 */
export const StateUtils = {
    /**
     * Create deep copy of state object
     * @param {Object} state - State object to copy
     * @returns {Object} Deep copy of state
     */
    deepCopyState(state) {
        return JSON.parse(JSON.stringify(state));
    },
    
    /**
     * Merge mode states into initial state
     * @param {Array} modeStates - Array of mode initial states
     * @returns {Object} Merged state object
     */
    mergeModeStates(modeStates) {
        return Object.assign({}, ...modeStates);
    },
    
    /**
     * Create state change notification
     * @param {string} action - Action name
     * @param {Object} data - Change data
     * @returns {Object} State change object
     */
    createStateChange(action, data) {
        return {
            timestamp: new Date().toISOString(),
            action,
            ...data
        };
    }
};

/**
 * Mode management utilities
 */
export const ModeUtils = {
    /**
     * Validate mode implements required BaseMode interface
     * @param {Object} mode - Mode instance to validate
     * @returns {boolean} True if valid
     */
    validateModeInterface(mode) {
        const requiredMethods = [
            'activate', 'deactivate',
            'handleMouseDown', 'handleMouseMove', 'handleMouseUp',
            'getGuidanceText', 'resetState', 'cleanup'
        ];
        
        return requiredMethods.every(method => 
            typeof mode[method] === 'function'
        );
    },
    
    /**
     * Create mode lifecycle wrapper
     * @param {Object} mode - Mode instance
     * @returns {Object} Wrapped mode with lifecycle logging
     */
    wrapModeLifecycle(mode) {
        const wrapped = Object.create(mode);
        
        const originalActivate = mode.activate.bind(mode);
        wrapped.activate = function() {
            console.log(`Activating mode: ${mode.modeName}`);
            return originalActivate();
        };
        
        const originalDeactivate = mode.deactivate.bind(mode);
        wrapped.deactivate = function() {
            console.log(`Deactivating mode: ${mode.modeName}`);
            return originalDeactivate();
        };
        
        return wrapped;
    }
};

/**
 * Transform string generation for SVG
 */
export const TransformStringUtils = {
    /**
     * Generate SVG transform string
     * @param {Object} transform - Transform state {scaleX, scaleY, panX, panY}
     * @returns {string} SVG transform attribute value
     */
    generateTransformString(transform) {
        return `translate(${transform.panX}, ${transform.panY}) scale(${transform.scaleX}, ${transform.scaleY})`;
    },
    
    /**
     * Parse SVG transform string
     * @param {string} transformString - SVG transform string
     * @returns {Object} Transform state
     */
    parseTransformString(transformString) {
        const transform = { scaleX: 1, scaleY: 1, panX: 0, panY: 0 };
        
        // Parse translate
        const translateMatch = transformString.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (translateMatch) {
            transform.panX = parseFloat(translateMatch[1]);
            transform.panY = parseFloat(translateMatch[2]);
        }
        
        // Parse scale
        const scaleMatch = transformString.match(/scale\(([^,]+)(?:,\s*([^)]+))?\)/);
        if (scaleMatch) {
            transform.scaleX = parseFloat(scaleMatch[1]);
            transform.scaleY = scaleMatch[2] ? parseFloat(scaleMatch[2]) : transform.scaleX;
        }
        
        return transform;
    }
};

/**
 * Validation utilities
 */
export const ValidationUtils = {
    /**
     * Validate data range
     * @param {Object} dataRange - Data range to validate
     * @returns {boolean} True if valid
     */
    validateDataRange(dataRange) {
        return dataRange &&
            typeof dataRange.minX === 'number' &&
            typeof dataRange.maxX === 'number' &&
            typeof dataRange.minY === 'number' &&
            typeof dataRange.maxY === 'number' &&
            dataRange.minX < dataRange.maxX &&
            dataRange.minY < dataRange.maxY;
    },
    
    /**
     * Validate image dimensions
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @returns {boolean} True if valid
     */
    validateImageDimensions(width, height) {
        return typeof width === 'number' && width > 0 &&
               typeof height === 'number' && height > 0;
    },
    
    /**
     * Validate zoom state
     * @param {Object} zoomState - Zoom state to validate
     * @returns {boolean} True if valid
     */
    validateZoomState(zoomState) {
        return zoomState &&
            typeof zoomState.scaleX === 'number' && zoomState.scaleX > 0 &&
            typeof zoomState.scaleY === 'number' && zoomState.scaleY > 0 &&
            typeof zoomState.panX === 'number' &&
            typeof zoomState.panY === 'number';
    }
};

/**
 * Export all utilities as a single object for easy integration
 */
export const ZoomDemonstratorUtils = {
    coordinate: CoordinateUtils,
    panLimit: PanLimitUtils,
    zoom: ZoomUtils,
    state: StateUtils,
    mode: ModeUtils,
    transform: TransformStringUtils,
    validation: ValidationUtils
};