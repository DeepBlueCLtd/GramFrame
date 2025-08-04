/**
 * HTML Overlay Axis Renderer
 * 
 * Creates axis labels as HTML elements positioned absolutely outside the SVG image area.
 * No modifications to SVG coordinate system.
 */

export class HTMLAxisRenderer {
    constructor(coordinateSystem, zoomDemonstrator) {
        this.coordinateSystem = coordinateSystem;
        this.zoomDemo = zoomDemonstrator;
        
        // Get existing SVG axes group for tick marks
        this.axesGroup = document.getElementById('axes-group');
        
        // Create overlay containers
        this.createOverlayContainers();
        
    }
    
    createOverlayContainers() {
        const demoContainer = document.getElementById('demo-container');
        if (!demoContainer) {
            console.error('demo-container not found!');
            return;
        }
        
        // Make demo container relatively positioned for absolute positioning of labels
        demoContainer.style.position = 'relative';
        demoContainer.style.overflow = 'visible'; // Ensure labels outside can be seen
        
        // Create frequency axis labels container (below image)
        this.freqLabelsContainer = document.createElement('div');
        this.freqLabelsContainer.id = 'freq-labels-container';
        this.freqLabelsContainer.style.position = 'absolute';
        this.freqLabelsContainer.style.left = '0';
        this.freqLabelsContainer.style.right = '0';
        this.freqLabelsContainer.style.height = '30px';
        this.freqLabelsContainer.style.zIndex = '1000'; // Ensure it's on top
        this.freqLabelsContainer.style.pointerEvents = 'none'; // Don't interfere with mouse events
        demoContainer.appendChild(this.freqLabelsContainer);
        
        // Create time axis labels container (left of image)
        this.timeLabelsContainer = document.createElement('div');
        this.timeLabelsContainer.id = 'time-labels-container';
        this.timeLabelsContainer.style.position = 'absolute';
        this.timeLabelsContainer.style.top = '0';
        this.timeLabelsContainer.style.bottom = '0';
        this.timeLabelsContainer.style.width = '60px';
        this.timeLabelsContainer.style.zIndex = '1000'; // Ensure it's on top
        this.timeLabelsContainer.style.pointerEvents = 'none';
        demoContainer.appendChild(this.timeLabelsContainer);
        
        this.updateContainerPositions();
    }
    
    updateContainerPositions() {
        const dimensions = this.zoomDemo.getCurrentImageDimensions();
        
        // Position frequency labels below the SVG
        this.freqLabelsContainer.style.top = `${dimensions.height + 5}px`;
        
        // Position time labels to the left of the SVG  
        this.timeLabelsContainer.style.left = `-65px`;
        
    }
    
    
    /**
     * Calculate optimal tick spacing
     */
    calculateTickSpacing(dataMin, dataMax, availablePixels) {
        const dataRange = dataMax - dataMin;
        const targetTickCount = Math.max(5, Math.min(15, Math.floor(availablePixels / 60))); // More frequent labels
        
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
     * Add SVG tick marks to existing axes
     */
    updateSVGTickMarks() {
        if (!this.axesGroup) return;
        
        // Clear existing tick marks
        const existingTicks = this.axesGroup.querySelectorAll('.svg-tick');
        existingTicks.forEach(el => el.remove());
        
        const dimensions = this.zoomDemo.getCurrentImageDimensions();
        const dataRange = this.coordinateSystem.dataRange;
        const zoomState = this.zoomDemo.zoomState;
        
        // Calculate visible data ranges
        const visibleDataMinX = dataRange.minX + (-zoomState.panX / zoomState.scaleX) * (dataRange.maxX - dataRange.minX) / dimensions.width;
        const visibleDataMaxX = dataRange.minX + ((dimensions.width - zoomState.panX) / zoomState.scaleX) * (dataRange.maxX - dataRange.minX) / dimensions.width;
        
        const visibleDataMinY = dataRange.minY + (-zoomState.panY / zoomState.scaleY) * (dataRange.maxY - dataRange.minY) / dimensions.height;
        const visibleDataMaxY = dataRange.minY + ((dimensions.height - zoomState.panY) / zoomState.scaleY) * (dataRange.maxY - dataRange.minY) / dimensions.height;
        
        // Frequency axis tick marks (horizontal)
        const freqTickInterval = this.calculateTickSpacing(visibleDataMinX, visibleDataMaxX, dimensions.width);
        const freqTicks = this.generateTicks(visibleDataMinX, visibleDataMaxX, freqTickInterval);
        
        freqTicks.forEach(tickValue => {
            const svgX = ((tickValue - dataRange.minX) / (dataRange.maxX - dataRange.minX)) * dimensions.width;
            const displayX = svgX * zoomState.scaleX + zoomState.panX;
            
            if (displayX >= -10 && displayX <= dimensions.width + 10) {
                const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                tick.setAttribute('class', 'svg-tick freq-tick');
                tick.setAttribute('x1', displayX.toString());
                tick.setAttribute('y1', '0');
                tick.setAttribute('x2', displayX.toString());
                tick.setAttribute('y2', '8'); // 8px tick extending down from axis
                tick.setAttribute('stroke', '#333');
                tick.setAttribute('stroke-width', '1');
                this.axesGroup.appendChild(tick);
            }
        });
        
        // Time axis tick marks (vertical)
        const timeTickInterval = this.calculateTickSpacing(visibleDataMinY, visibleDataMaxY, dimensions.height);
        const timeTicks = this.generateTicks(visibleDataMinY, visibleDataMaxY, timeTickInterval);
        
        timeTicks.forEach(tickValue => {
            const svgY = dimensions.height - ((tickValue - dataRange.minY) / (dataRange.maxY - dataRange.minY)) * dimensions.height;
            const displayY = svgY * zoomState.scaleY + zoomState.panY;
            
            if (displayY >= -10 && displayY <= dimensions.height + 10) {
                const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                tick.setAttribute('class', 'svg-tick time-tick');
                tick.setAttribute('x1', '0');
                tick.setAttribute('y1', displayY.toString());
                tick.setAttribute('x2', '8'); // 8px tick extending right from axis
                tick.setAttribute('y2', displayY.toString());
                tick.setAttribute('stroke', '#333');
                tick.setAttribute('stroke-width', '1');
                this.axesGroup.appendChild(tick);
            }
        });
    }
    
    /**
     * Update frequency axis labels (horizontal)
     */
    updateFrequencyLabels() {
        // Clear existing labels
        this.freqLabelsContainer.innerHTML = '';
        
        const dimensions = this.zoomDemo.getCurrentImageDimensions();
        const dataRange = this.coordinateSystem.dataRange;
        const zoomState = this.zoomDemo.zoomState;
        const svgRect = document.getElementById('demo-svg').getBoundingClientRect();
        const containerRect = document.getElementById('demo-container').getBoundingClientRect();
        
        // Calculate visible data range
        const visibleDataMinX = dataRange.minX + (-zoomState.panX / zoomState.scaleX) * (dataRange.maxX - dataRange.minX) / dimensions.width;
        const visibleDataMaxX = dataRange.minX + ((dimensions.width - zoomState.panX) / zoomState.scaleX) * (dataRange.maxX - dataRange.minX) / dimensions.width;
        
        // Calculate tick spacing and generate ticks
        const tickInterval = this.calculateTickSpacing(visibleDataMinX, visibleDataMaxX, dimensions.width);
        const ticks = this.generateTicks(visibleDataMinX, visibleDataMaxX, tickInterval);
        
        ticks.forEach(tickValue => {
            // Convert data coordinate to SVG coordinate
            const svgX = ((tickValue - dataRange.minX) / (dataRange.maxX - dataRange.minX)) * dimensions.width;
            
            // Apply zoom/pan transform
            const displayX = svgX * zoomState.scaleX + zoomState.panX;
            
            // Convert SVG coordinate to screen pixels relative to container
            const screenX = (displayX / dimensions.width) * containerRect.width;
            
            // Only render if visible within container bounds
            if (screenX >= -30 && screenX <= containerRect.width + 30) {
                const label = document.createElement('div');
                label.className = 'axis-label freq-label';
                label.textContent = this.formatLabel(tickValue);
                
                // Style the label
                label.style.position = 'absolute';
                label.style.left = `${screenX}px`;
                label.style.top = '5px';
                label.style.transform = 'translateX(-50%)'; // Center horizontally
                label.style.fontSize = '11px';
                label.style.color = '#333';
                label.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                label.style.padding = '1px 2px';
                label.style.fontFamily = 'Arial, sans-serif';
                label.style.whiteSpace = 'nowrap';
                
                this.freqLabelsContainer.appendChild(label);
            }
        });
    }
    
    /**
     * Update time axis labels (vertical)
     */
    updateTimeLabels() {
        // Clear existing labels
        this.timeLabelsContainer.innerHTML = '';
        
        const dimensions = this.zoomDemo.getCurrentImageDimensions();
        const dataRange = this.coordinateSystem.dataRange;
        const zoomState = this.zoomDemo.zoomState;
        const containerRect = document.getElementById('demo-container').getBoundingClientRect();
        
        // Calculate visible data range (with Y inversion)
        const visibleDataMinY = dataRange.minY + (-zoomState.panY / zoomState.scaleY) * (dataRange.maxY - dataRange.minY) / dimensions.height;
        const visibleDataMaxY = dataRange.minY + ((dimensions.height - zoomState.panY) / zoomState.scaleY) * (dataRange.maxY - dataRange.minY) / dimensions.height;
        
        // Calculate tick spacing and generate ticks
        const tickInterval = this.calculateTickSpacing(visibleDataMinY, visibleDataMaxY, dimensions.height);
        const ticks = this.generateTicks(visibleDataMinY, visibleDataMaxY, tickInterval);
        
        ticks.forEach(tickValue => {
            // Convert data coordinate to SVG coordinate (with Y inversion)
            const svgY = dimensions.height - ((tickValue - dataRange.minY) / (dataRange.maxY - dataRange.minY)) * dimensions.height;
            
            // Apply zoom/pan transform
            const displayY = svgY * zoomState.scaleY + zoomState.panY;
            
            // Convert SVG coordinate to screen pixels relative to container
            const screenY = (displayY / dimensions.height) * containerRect.height;
            
            // Only render if visible within container bounds
            if (screenY >= -20 && screenY <= containerRect.height + 20) {
                const label = document.createElement('div');
                label.className = 'axis-label time-label';
                label.textContent = this.formatLabel(tickValue);
                
                // Style the label
                label.style.position = 'absolute';
                label.style.right = '5px';
                label.style.top = `${screenY}px`;
                label.style.transform = 'translateY(-50%)'; // Center vertically
                label.style.fontSize = '11px';
                label.style.color = '#333';
                label.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                label.style.padding = '1px 2px';
                label.style.fontFamily = 'Arial, sans-serif';
                label.style.whiteSpace = 'nowrap';
                label.style.textAlign = 'right';
                
                this.timeLabelsContainer.appendChild(label);
            }
        });
    }
    
    /**
     * Update both axes
     */
    updateAxes() {
        this.updateContainerPositions();
        this.updateSVGTickMarks(); // Add SVG tick marks first
        this.updateFrequencyLabels();
        this.updateTimeLabels();
    }
    
    /**
     * Clean up - remove overlay containers
     */
    destroy() {
        if (this.freqLabelsContainer) {
            this.freqLabelsContainer.remove();
        }
        if (this.timeLabelsContainer) {
            this.timeLabelsContainer.remove();
        }
    }
}