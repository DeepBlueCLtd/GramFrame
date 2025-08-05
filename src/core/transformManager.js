/**
 * TransformManager - Centralized coordinate transformation handler
 * 
 * Manages all coordinate transformations between screen, SVG, image, and data coordinates
 * Handles zoom/pan state and ensures consistent transformations across the application
 * 
 * @typedef {import('../types/zoom-types.js').ZoomState} ZoomState
 * @typedef {import('../types/zoom-types.js').Point2D} Point2D
 * @typedef {import('../types/zoom-types.js').DataRange} DataRange
 * @typedef {import('../types/zoom-types.js').ImageDimensions} ImageDimensions
 * @typedef {import('../types/zoom-types.js').CoordinateSet} CoordinateSet
 * @typedef {import('../types/zoom-types.js').PanLimits} PanLimits
 * @typedef {import('../types/zoom-types.js').SVGDelta} SVGDelta
 * @typedef {import('../types/zoom-types.js').VisibleDataBounds} VisibleDataBounds
 */
export class TransformManager {
    /**
     * @param {import('./coordinates.js').CoordinateSystem} coordinateSystem - Coordinate system instance
     * @param {HTMLElement} demoContainer - Demo container element
     */
    constructor(coordinateSystem, demoContainer) {
        /** @type {import('./coordinates.js').CoordinateSystem} */
        this.coordinateSystem = coordinateSystem;
        /** @type {HTMLElement} */
        this.demoContainer = demoContainer;
        
        /** @type {ZoomState} */
        this.zoomState = {
            scaleX: 1.0,
            scaleY: 1.0,
            panX: 0,
            panY: 0
        };
    }
    
    /**
     * Update the coordinate system (when switching images)
     * @param {import('./coordinates.js').CoordinateSystem} coordinateSystem - New coordinate system
     */
    updateCoordinateSystem(coordinateSystem) {
        this.coordinateSystem = coordinateSystem;
    }
    
    /**
     * Get current image dimensions
     * @returns {ImageDimensions} Image dimensions in pixels
     */
    getImageDimensions() {
        return {
            width: this.coordinateSystem.imageSize.width,
            height: this.coordinateSystem.imageSize.height
        };
    }
    
    /**
     * Get current data range
     * @returns {DataRange} Data coordinate ranges
     */
    getDataRange() {
        return this.coordinateSystem.dataRange;
    }
    
    /**
     * Set zoom level
     * @param {number} scaleX - X-axis scale factor
     * @param {number} scaleY - Y-axis scale factor
     */
    setZoomLevel(scaleX, scaleY) {
        this.zoomState.scaleX = scaleX;
        this.zoomState.scaleY = scaleY;
    }
    
    /**
     * Set view offset (pan)
     * @param {number} panX - X-axis pan offset
     * @param {number} panY - Y-axis pan offset
     */
    setViewOffset(panX, panY) {
        this.zoomState.panX = panX;
        this.zoomState.panY = panY;
    }
    
    /**
     * Get current zoom state
     * @returns {ZoomState} Current zoom and pan state
     */
    getZoomState() {
        return { ...this.zoomState };
    }
    
    /**
     * Reset zoom and pan to default
     */
    resetTransform() {
        this.zoomState = {
            scaleX: 1.0,
            scaleY: 1.0,
            panX: 0,
            panY: 0
        };
    }
    
    /**
     * Convert screen coordinates to SVG coordinates (without zoom/pan)
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @returns {Point2D} SVG coordinates
     */
    screenToSVG(screenX, screenY) {
        return this.coordinateSystem.screenToSVG(screenX, screenY);
    }
    
    /**
     * Convert screen coordinates to actual SVG coordinates (accounting for zoom/pan)
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @returns {Point2D} Actual SVG coordinates after inverse transform
     */
    screenToActualSVG(screenX, screenY) {
        const svgCoords = this.coordinateSystem.screenToSVG(screenX, screenY);
        
        // Apply inverse of current zoom/pan transform
        const actualSvgX = (svgCoords.x - this.zoomState.panX) / this.zoomState.scaleX;
        const actualSvgY = (svgCoords.y - this.zoomState.panY) / this.zoomState.scaleY;
        
        return { x: actualSvgX, y: actualSvgY };
    }
    
    /**
     * Convert SVG coordinates to data coordinates
     * @param {number} svgX - SVG X coordinate
     * @param {number} svgY - SVG Y coordinate
     * @returns {Point2D} Data coordinates
     */
    svgToData(svgX, svgY) {
        return this.coordinateSystem.svgToData(svgX, svgY);
    }
    
    /**
     * Convert data coordinates to image coordinates
     * @param {number} dataX - Data X coordinate
     * @param {number} dataY - Data Y coordinate
     * @returns {Point2D} Image pixel coordinates
     */
    dataToImage(dataX, dataY) {
        return this.coordinateSystem.dataToImage(dataX, dataY);
    }
    
    /**
     * Full transformation: screen to data coordinates (accounting for zoom/pan)
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @returns {Point2D} Data coordinates
     */
    screenToData(screenX, screenY) {
        const actualSvg = this.screenToActualSVG(screenX, screenY);
        return this.svgToData(actualSvg.x, actualSvg.y);
    }
    
    /**
     * Full transformation: screen to image coordinates (accounting for zoom/pan)
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @returns {Point2D} Image pixel coordinates
     */
    screenToImage(screenX, screenY) {
        const dataCoords = this.screenToData(screenX, screenY);
        return this.dataToImage(dataCoords.x, dataCoords.y);
    }
    
    /**
     * Get all coordinate representations for a screen point
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @returns {CoordinateSet} All coordinate representations
     */
    getAllCoordinates(screenX, screenY) {
        const svgCoords = this.screenToSVG(screenX, screenY);
        const actualSvg = this.screenToActualSVG(screenX, screenY);
        const dataCoords = this.svgToData(actualSvg.x, actualSvg.y);
        const imageCoords = this.dataToImage(dataCoords.x, dataCoords.y);
        
        return {
            screen: { x: screenX, y: screenY },
            svg: actualSvg,
            image: imageCoords,
            data: dataCoords,
            zoom: { 
                x: this.zoomState.scaleX, 
                y: this.zoomState.scaleY 
            },
            pan: { 
                x: this.zoomState.panX, 
                y: this.zoomState.panY 
            }
        };
    }
    
    /**
     * Convert screen delta to SVG delta for pan operations
     * @param {number} deltaX - Screen delta X
     * @param {number} deltaY - Screen delta Y
     * @returns {SVGDelta} SVG delta values
     */
    screenDeltaToSVGDelta(deltaX, deltaY) {
        const dimensions = this.getImageDimensions();
        const svgDeltaX = deltaX * (dimensions.width / this.demoContainer.clientWidth);
        const svgDeltaY = deltaY * (dimensions.height / this.demoContainer.clientHeight);
        return { x: svgDeltaX, y: svgDeltaY };
    }
    
    /**
     * Update pan with screen delta
     * @param {number} deltaX - Screen delta X
     * @param {number} deltaY - Screen delta Y
     */
    updatePan(deltaX, deltaY) {
        const svgDelta = this.screenDeltaToSVGDelta(deltaX, deltaY);
        
        // Calculate new pan values
        let newPanX = this.zoomState.panX + svgDelta.x;
        let newPanY = this.zoomState.panY + svgDelta.y;
        
        // Apply pan limits
        const limits = this.calculatePanLimits();
        newPanX = Math.max(limits.minPanX, Math.min(limits.maxPanX, newPanX));
        newPanY = Math.max(limits.minPanY, Math.min(limits.maxPanY, newPanY));
        
        this.zoomState.panX = newPanX;
        this.zoomState.panY = newPanY;
    }
    
    /**
     * Calculate pan limits to prevent showing beyond image boundaries
     * @returns {PanLimits} Pan limit values
     */
    calculatePanLimits() {
        const dimensions = this.getImageDimensions();
        const viewportWidth = dimensions.width;
        const viewportHeight = dimensions.height;
        const scaledImageWidth = viewportWidth * this.zoomState.scaleX;
        const scaledImageHeight = viewportHeight * this.zoomState.scaleY;
        
        return {
            maxPanX: 0, // Can't pan right (would show empty space on left)
            minPanX: Math.min(0, viewportWidth - scaledImageWidth), // Can pan left to show right edge
            maxPanY: 0, // Can't pan down (would show empty space on top)
            minPanY: Math.min(0, viewportHeight - scaledImageHeight) // Can pan up to show bottom edge
        };
    }
    
    /**
     * Apply pan limits to current state
     */
    applyPanLimits() {
        const limits = this.calculatePanLimits();
        this.zoomState.panX = Math.max(limits.minPanX, Math.min(limits.maxPanX, this.zoomState.panX));
        this.zoomState.panY = Math.max(limits.minPanY, Math.min(limits.maxPanY, this.zoomState.panY));
    }
    
    /**
     * Zoom to a rectangle (in actual SVG coordinates)
     * @param {number} x - Rectangle X coordinate
     * @param {number} y - Rectangle Y coordinate
     * @param {number} width - Rectangle width
     * @param {number} height - Rectangle height
     */
    zoomToRect(x, y, width, height) {
        const dimensions = this.getImageDimensions();
        
        // Calculate zoom factors for both axes
        const newScaleX = dimensions.width / width;
        const newScaleY = dimensions.height / height;
        
        // Calculate the center of the selected rectangle
        const selectionCenterX = x + width / 2;
        const selectionCenterY = y + height / 2;
        
        // Calculate where this center should be positioned after zoom
        const viewCenterX = dimensions.width / 2;
        const viewCenterY = dimensions.height / 2;
        
        // Update zoom state
        this.zoomState.scaleX = newScaleX;
        this.zoomState.scaleY = newScaleY;
        
        // Calculate new pan offset to center the selection
        let newPanX = viewCenterX - (selectionCenterX * newScaleX);
        let newPanY = viewCenterY - (selectionCenterY * newScaleY);
        
        // Apply pan limits
        const limits = this.calculatePanLimits();
        this.zoomState.panX = Math.max(limits.minPanX, Math.min(limits.maxPanX, newPanX));
        this.zoomState.panY = Math.max(limits.minPanY, Math.min(limits.maxPanY, newPanY));
    }
    
    /**
     * Zoom by factor around center
     * @param {number} factor - Zoom factor (>1 zooms in, <1 zooms out)
     */
    zoomByFactor(factor) {
        const dimensions = this.getImageDimensions();
        const viewCenterX = dimensions.width / 2;
        const viewCenterY = dimensions.height / 2;
        
        // Find what point in the image is currently at the center
        const imageCenterX = (viewCenterX - this.zoomState.panX) / this.zoomState.scaleX;
        const imageCenterY = (viewCenterY - this.zoomState.panY) / this.zoomState.scaleY;
        
        // Apply the zoom factor
        this.zoomState.scaleX *= factor;
        this.zoomState.scaleY *= factor;
        
        // Recalculate pan to keep the same image point at the center
        let newPanX = viewCenterX - (imageCenterX * this.zoomState.scaleX);
        let newPanY = viewCenterY - (imageCenterY * this.zoomState.scaleY);
        
        // Apply pan limits
        const limits = this.calculatePanLimits();
        this.zoomState.panX = Math.max(limits.minPanX, Math.min(limits.maxPanX, newPanX));
        this.zoomState.panY = Math.max(limits.minPanY, Math.min(limits.maxPanY, newPanY));
    }
    
    /**
     * Get visible data bounds (for axis rendering)
     * @returns {VisibleDataBounds} Visible data coordinate bounds
     */
    getVisibleDataBounds() {
        const dimensions = this.getImageDimensions();
        const dataRange = this.getDataRange();
        
        // Calculate visible data ranges
        const visibleDataMinX = dataRange.minX + (-this.zoomState.panX / this.zoomState.scaleX) * (dataRange.maxX - dataRange.minX) / dimensions.width;
        const visibleDataMaxX = dataRange.minX + ((dimensions.width - this.zoomState.panX) / this.zoomState.scaleX) * (dataRange.maxX - dataRange.minX) / dimensions.width;
        
        const visibleDataMinY = dataRange.minY + (-this.zoomState.panY / this.zoomState.scaleY) * (dataRange.maxY - dataRange.minY) / dimensions.height;
        const visibleDataMaxY = dataRange.minY + ((dimensions.height - this.zoomState.panY) / this.zoomState.scaleY) * (dataRange.maxY - dataRange.minY) / dimensions.height;
        
        return {
            minX: visibleDataMinX,
            maxX: visibleDataMaxX,
            minY: visibleDataMinY,
            maxY: visibleDataMaxY
        };
    }
    
    /**
     * Get transform string for SVG
     * @returns {string} SVG transform attribute value
     */
    getTransformString() {
        return `translate(${this.zoomState.panX}, ${this.zoomState.panY}) scale(${this.zoomState.scaleX}, ${this.zoomState.scaleY})`;
    }
}