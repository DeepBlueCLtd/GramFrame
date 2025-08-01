/**
 * Simple Axis Renderer - Works within existing coordinate space
 * 
 * Adds tick marks and labels to the existing axes without modifying
 * the SVG coordinate system or viewBox.
 */

export class SimpleAxisRenderer {
    constructor(coordinateSystem, zoomDemonstrator) {
        this.coordinateSystem = coordinateSystem;
        this.zoomDemo = zoomDemonstrator;
        
        // Get existing axis group from HTML
        this.axesGroup = document.getElementById('axes-group');
    }
    
    /**
     * Calculate optimal tick spacing
     */
    calculateTickSpacing(dataMin, dataMax, availablePixels) {
        const dataRange = dataMax - dataMin;
        const targetTickCount = Math.max(3, Math.min(10, Math.floor(availablePixels / 100)));
        
        const roughInterval = dataRange / targetTickCount;
        const magnitude = Math.pow(10, Math.floor(Math.log10(roughInterval)));
        const normalizedInterval = roughInterval / magnitude;
        
        let niceInterval;
        if (normalizedInterval <= 1) {
            niceInterval = 1;
        } else if (normalizedInterval <= 2) {
            niceInterval = 2;
        } else if (normalizedInterval <= 5) {
            niceInterval = 5;
        } else {
            niceInterval = 10;
        }
        
        return niceInterval * magnitude;
    }
    
    /**
     * Generate tick positions
     */
    generateTicks(dataMin, dataMax, interval) {
        const ticks = [];
        const start = Math.ceil(dataMin / interval) * interval;
        
        for (let value = start; value <= dataMax; value += interval) {
            const roundedValue = Math.round(value / interval) * interval;
            if (roundedValue >= dataMin && roundedValue <= dataMax) {
                ticks.push(roundedValue);
            }
        }
        
        return ticks;
    }
    
    /**
     * Format tick labels
     */
    formatLabel(value) {
        if (Math.abs(value) >= 1000) {
            return `${(value / 1000).toFixed(1)}k`;
        }
        return Math.round(value).toString();
    }
    
    /**
     * Update axis ticks and labels
     */
    updateAxes() {
        if (!this.axesGroup) return;
        
        // Clear existing ticks and labels (but keep the main axis lines)
        const existingTicks = this.axesGroup.querySelectorAll('.axis-tick, .axis-label');
        existingTicks.forEach(el => el.remove());
        
        const dimensions = this.zoomDemo.getCurrentImageDimensions();
        const dataRange = this.coordinateSystem.dataRange;
        const zoomState = this.zoomDemo.zoomState;
        
        // Calculate visible data ranges (accounting for zoom/pan)
        const visibleDataMinX = dataRange.minX + (-zoomState.panX / zoomState.scaleX) * (dataRange.maxX - dataRange.minX) / dimensions.width;
        const visibleDataMaxX = dataRange.minX + ((dimensions.width - zoomState.panX) / zoomState.scaleX) * (dataRange.maxX - dataRange.minX) / dimensions.width;
        
        const visibleDataMinY = dataRange.minY + (-zoomState.panY / zoomState.scaleY) * (dataRange.maxY - dataRange.minY) / dimensions.height;
        const visibleDataMaxY = dataRange.minY + ((dimensions.height - zoomState.panY) / zoomState.scaleY) * (dataRange.maxY - dataRange.minY) / dimensions.height;
        
        // Frequency axis (horizontal)
        const freqTickInterval = this.calculateTickSpacing(visibleDataMinX, visibleDataMaxX, dimensions.width);
        const freqTicks = this.generateTicks(visibleDataMinX, visibleDataMaxX, freqTickInterval);
        
        freqTicks.forEach(tickValue => {
            // Convert data coordinate to SVG pixel coordinate
            const svgX = ((tickValue - dataRange.minX) / (dataRange.maxX - dataRange.minX)) * dimensions.width;
            
            // Apply zoom/pan transform
            const displayX = svgX * zoomState.scaleX + zoomState.panX;
            
            // Only render if visible
            if (displayX >= -20 && displayX <= dimensions.width + 20) {
                // Tick mark (small line extending down from axis)
                const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                tick.setAttribute('class', 'axis-tick');
                tick.setAttribute('x1', displayX.toString());
                tick.setAttribute('y1', '0');
                tick.setAttribute('x2', displayX.toString());
                tick.setAttribute('y2', '8'); // 8px tick mark going down from axis
                tick.setAttribute('stroke', '#333');
                tick.setAttribute('stroke-width', '1');
                this.axesGroup.appendChild(tick);
                
                // Label (below the tick mark)
                const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                label.setAttribute('class', 'axis-label');
                label.setAttribute('x', displayX.toString());
                label.setAttribute('y', '20'); // 20px below axis (inside visible area)
                label.setAttribute('text-anchor', 'middle');
                label.setAttribute('font-family', 'Arial, sans-serif');
                label.setAttribute('font-size', '11');
                label.setAttribute('fill', '#333');
                label.textContent = this.formatLabel(tickValue);
                this.axesGroup.appendChild(label);
            }
        });
        
        // Time axis (vertical)
        const timeTickInterval = this.calculateTickSpacing(visibleDataMinY, visibleDataMaxY, dimensions.height);
        const timeTicks = this.generateTicks(visibleDataMinY, visibleDataMaxY, timeTickInterval);
        
        timeTicks.forEach(tickValue => {
            // Convert data coordinate to SVG pixel coordinate (with Y inversion)
            const svgY = dimensions.height - ((tickValue - dataRange.minY) / (dataRange.maxY - dataRange.minY)) * dimensions.height;
            
            // Apply zoom/pan transform
            const displayY = svgY * zoomState.scaleY + zoomState.panY;
            
            // Only render if visible
            if (displayY >= -20 && displayY <= dimensions.height + 20) {
                // Tick mark (small line extending right from axis)
                const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                tick.setAttribute('class', 'axis-tick');
                tick.setAttribute('x1', '0');
                tick.setAttribute('y1', displayY.toString());
                tick.setAttribute('x2', '8'); // 8px tick mark going right from axis
                tick.setAttribute('y2', displayY.toString());
                tick.setAttribute('stroke', '#333');
                tick.setAttribute('stroke-width', '1');
                this.axesGroup.appendChild(tick);
                
                // Label (to the right of the tick mark, inside visible area)
                const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                label.setAttribute('class', 'axis-label');
                label.setAttribute('x', '12'); // 12px to the right of axis (inside visible area)
                label.setAttribute('y', (displayY + 4).toString()); // +4 for vertical centering
                label.setAttribute('text-anchor', 'start');
                label.setAttribute('font-family', 'Arial, sans-serif');
                label.setAttribute('font-size', '11');
                label.setAttribute('fill', '#333');
                label.textContent = this.formatLabel(tickValue);
                this.axesGroup.appendChild(label);
            }
        });
    }
}