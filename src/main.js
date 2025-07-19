/**
 * GramFrame - A JavaScript component for interactive spectrogram analysis
 */

// Import component styles
import './gramframe.css'

// Initial state object
const initialState = {
  version: '0.0.1',
  timestamp: new Date().toISOString(),
  mode: 'analysis', // 'analysis', 'harmonics', 'doppler'
  rate: 1,
  cursorPosition: null,
  cursors: [],
  imageDetails: {
    url: '',
    naturalWidth: 0,  // Original dimensions of the image
    naturalHeight: 0
  },
  config: {
    timeMin: 0,
    timeMax: 0,
    freqMin: 0,
    freqMax: 0
  },
  displayDimensions: {  // Current display dimensions (responsive)
    width: 0,
    height: 0
  },
  axes: {
    margins: {
      left: 60,    // Space for time axis labels
      bottom: 50,  // Space for frequency axis labels  
      right: 15,   // Small right margin
      top: 15      // Small top margin
    }
  }
}

// State listeners
const stateListeners = []

/**
 * GramFrame class - Main component implementation
 */
class GramFrame {
  constructor(configTable) {
    this.state = { ...initialState }
    this.configTable = configTable
    
    // Create a container to replace the table
    this.container = document.createElement('div')
    this.container.className = 'gram-frame-container'
    
    // Component container is now set up
    
    // Create SVG element for rendering
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    this.svg.setAttribute('class', 'gram-frame-svg')
    this.svg.setAttribute('width', '100%')
    this.svg.setAttribute('height', 'auto')
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
    this.container.appendChild(this.svg)
    
    // Create main group for content with margins for axes
    this.mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    this.mainGroup.setAttribute('class', 'gram-frame-main-group')
    this.svg.appendChild(this.mainGroup)
    
    // Create image element within main group for spectrogram
    this.svgImage = document.createElementNS('http://www.w3.org/2000/svg', 'image')
    this.svgImage.setAttribute('class', 'gram-frame-image')
    this.mainGroup.appendChild(this.svgImage)
    
    // Create groups for axes
    this.timeAxisGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    this.timeAxisGroup.setAttribute('class', 'gram-frame-time-axis')
    this.svg.appendChild(this.timeAxisGroup)
    
    this.freqAxisGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    this.freqAxisGroup.setAttribute('class', 'gram-frame-freq-axis')
    this.svg.appendChild(this.freqAxisGroup)
    
    // Create LED readout panel
    this.readoutPanel = document.createElement('div')
    this.readoutPanel.className = 'gram-frame-readout'
    this.container.appendChild(this.readoutPanel)
    
    // Create initial LED displays
    this._createLEDDisplays()
    
    // Create mode switching UI
    this._createModeSwitchingUI()
    
    // Create rate input
    this._createRateInput()
    
    // Replace the table with our container
    if (configTable && configTable.parentNode) {
      configTable.parentNode.replaceChild(this.container, configTable)
      
      // Store a reference to this instance on the container element
      // This allows the state listener mechanism to access the instance
      this.container.__gramFrameInstance = this
    }
    
    // Extract config data from table
    this._extractConfigData()
    
    // Setup event listeners
    this._setupEventListeners()
    
    // Setup ResizeObserver for responsive behavior
    this._setupResizeObserver()
    
    // Notify listeners of initial state
    this._notifyStateListeners()
  }
  
  _createLEDDisplays() {
    // Create frequency display
    this.freqLED = this._createLEDDisplay('Frequency', '0.00 Hz')
    this.readoutPanel.appendChild(this.freqLED)
    
    // Create time display
    this.timeLED = this._createLEDDisplay('Time', '0.00 s')
    this.readoutPanel.appendChild(this.timeLED)
    
    // Create mode display
    this.modeLED = this._createLEDDisplay('Mode', this._capitalizeFirstLetter(this.state.mode))
    this.readoutPanel.appendChild(this.modeLED)
  }
  
  _createModeSwitchingUI() {
    // Create mode buttons container
    this.modesContainer = document.createElement('div')
    this.modesContainer.className = 'gram-frame-modes'
    
    // Create mode buttons
    const modes = ['analysis', 'harmonics', 'doppler']
    this.modeButtons = {}
    
    modes.forEach(mode => {
      const button = document.createElement('button')
      button.className = 'gram-frame-mode-btn'
      button.textContent = this._capitalizeFirstLetter(mode)
      button.dataset.mode = mode
      
      // Set active state for current mode
      if (mode === this.state.mode) {
        button.classList.add('active')
      }
      
      this.modeButtons[mode] = button
      this.modesContainer.appendChild(button)
    })
    
    this.container.appendChild(this.modesContainer)
  }
  
  _createRateInput() {
    // Create rate input container
    const rateContainer = document.createElement('div')
    rateContainer.className = 'gram-frame-rate'
    
    // Create label
    const label = document.createElement('label')
    label.textContent = 'Rate:'
    rateContainer.appendChild(label)
    
    // Create input
    this.rateInput = document.createElement('input')
    this.rateInput.type = 'number'
    this.rateInput.min = '0.1'
    this.rateInput.step = '0.1'
    this.rateInput.value = this.state.rate
    rateContainer.appendChild(this.rateInput)
    
    this.container.appendChild(rateContainer)
  }
  
  _createLEDDisplay(label, value) {
    const led = document.createElement('div')
    led.className = 'gram-frame-led'
    led.innerHTML = `
      <div class="gram-frame-led-label">${label}</div>
      <div class="gram-frame-led-value">${value}</div>
    `
    return led
  }
  
  _setupEventListeners() {
    // Bind event handlers to maintain proper 'this' context
    this._boundHandleMouseMove = this._handleMouseMove.bind(this)
    this._boundHandleMouseLeave = this._handleMouseLeave.bind(this)
    this._boundHandleClick = this._handleClick.bind(this)
    this._boundHandleResize = this._handleResize.bind(this)
    
    // SVG mouse events
    this.svg.addEventListener('mousemove', this._boundHandleMouseMove)
    this.svg.addEventListener('mouseleave', this._boundHandleMouseLeave)
    this.svg.addEventListener('click', this._boundHandleClick)
    
    // Mode button events
    Object.keys(this.modeButtons).forEach(mode => {
      this.modeButtons[mode].addEventListener('click', () => {
        this._switchMode(mode)
      })
    })
    
    // Rate input events
    this.rateInput.addEventListener('change', () => {
      const rate = parseFloat(this.rateInput.value)
      if (!isNaN(rate) && rate > 0) {
        this._setRate(rate)
      }
    })
    
    // Window resize event
    window.addEventListener('resize', this._boundHandleResize)
  }
  
  _setupResizeObserver() {
    // Use ResizeObserver to monitor SVG container dimensions
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          this._handleSVGResize(entry.contentRect)
        }
      })
      this.resizeObserver.observe(this.container)
    }
  }
  
  _handleResize() {
    // Delegate to SVG resize handler
    const containerRect = this.container.getBoundingClientRect()
    this._handleSVGResize(containerRect)
  }
  
  _handleSVGResize(containerRect) {
    // Only handle resize if we have a valid image
    if (!this.spectrogramImage) return
    
    // Calculate new dimensions while maintaining aspect ratio
    const originalWidth = this.spectrogramImage.naturalWidth
    const originalHeight = this.spectrogramImage.naturalHeight
    const aspectRatio = originalWidth / originalHeight
    
    // Account for axes margins
    const margins = this.state.axes.margins
    const totalMarginWidth = margins.left + margins.right
    const totalMarginHeight = margins.top + margins.bottom
    
    // Calculate available space for the image
    const availableWidth = containerRect.width - totalMarginWidth
    const availableHeight = availableWidth / aspectRatio
    
    // Set new SVG dimensions (include margins)
    let newWidth = availableWidth + totalMarginWidth
    let newHeight = availableHeight + totalMarginHeight
    
    // Create viewBox that includes margin space
    const viewBoxWidth = originalWidth + totalMarginWidth
    const viewBoxHeight = originalHeight + totalMarginHeight
    
    // Update SVG viewBox and dimensions
    this.svg.setAttribute('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
    this.svg.setAttribute('width', newWidth)
    this.svg.setAttribute('height', newHeight)
    
    // Position image directly in SVG coordinate space (no mainGroup translation)
    this.mainGroup.setAttribute('transform', '')
    
    // Update image element within SVG - position it in the margin area
    this.svgImage.setAttribute('width', originalWidth)
    this.svgImage.setAttribute('height', originalHeight)
    this.svgImage.setAttribute('x', margins.left)
    this.svgImage.setAttribute('y', margins.top)
    
    // Update state with new dimensions
    this.state.displayDimensions = {
      width: Math.round(newWidth),
      height: Math.round(newHeight)
    }
    
    // Redraw axes
    this._drawAxes()
    
    // Notify listeners
    this._notifyStateListeners()
    
    // Log resize event for debugging
    console.log('GramFrame resized:', this.state.displayDimensions)
  }
  
  _handleMouseMove(event) {
    // Only process if we have valid image details
    if (!this.state.imageDetails.naturalWidth || !this.state.imageDetails.naturalHeight) return
    
    // Get mouse position relative to SVG
    const rect = this.svg.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    // Convert screen coordinates to SVG coordinates
    const svgCoords = this._screenToSVGCoordinates(x, y)
    
    // Get coordinates relative to image (image is now positioned at margins.left, margins.top)
    const margins = this.state.axes.margins
    const imageRelativeX = svgCoords.x - margins.left
    const imageRelativeY = svgCoords.y - margins.top
    
    // Only process if mouse is within the image area
    if (imageRelativeX < 0 || imageRelativeY < 0 || 
        imageRelativeX > this.state.imageDetails.naturalWidth || 
        imageRelativeY > this.state.imageDetails.naturalHeight) {
      // Clear cursor position when mouse is outside image bounds
      this.state.cursorPosition = null
      this._updateLEDDisplays()
      this._notifyStateListeners()
      return
    }
    
    // Convert image-relative coordinates to data coordinates
    const dataCoords = this._imageToDataCoordinates(imageRelativeX, imageRelativeY)
    
    // Update cursor position in state with normalized coordinates
    this.state.cursorPosition = { 
      x: Math.round(x), 
      y: Math.round(y), 
      svgX: Math.round(svgCoords.x),
      svgY: Math.round(svgCoords.y),
      imageX: Math.round(imageRelativeX),
      imageY: Math.round(imageRelativeY),
      time: parseFloat(dataCoords.time.toFixed(2)), 
      freq: parseFloat(dataCoords.freq.toFixed(2))
    }
    
    // Update LED displays
    this._updateLEDDisplays()
    
    // Notify listeners
    this._notifyStateListeners()
  }
  
  _handleMouseLeave(event) {
    // Clear cursor position when mouse leaves the SVG area
    this.state.cursorPosition = null
    
    // Update LED displays to show no position
    this._updateLEDDisplays()
    
    // Notify listeners
    this._notifyStateListeners()
  }
  
  _handleClick(event) {
    // This will be implemented in Phase 3
    console.log('Canvas clicked')
  }
  
  /**
   * Clean up event listeners (called when component is destroyed)
   */
  _cleanupEventListeners() {
    if (this.svg && this._boundHandleMouseMove) {
      this.svg.removeEventListener('mousemove', this._boundHandleMouseMove)
      this.svg.removeEventListener('mouseleave', this._boundHandleMouseLeave)
      this.svg.removeEventListener('click', this._boundHandleClick)
    }
    
    if (this._boundHandleResize) {
      window.removeEventListener('resize', this._boundHandleResize)
    }
    
    // Clean up ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }
  }
  
  /**
   * Destroy the component and clean up resources
   */
  destroy() {
    this._cleanupEventListeners()
    
    // Remove from DOM if still attached
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
    }
  }
  
  /**
   * Convert screen coordinates to SVG coordinates
   */
  _screenToSVGCoordinates(screenX, screenY) {
    const svgRect = this.svg.getBoundingClientRect()
    const viewBox = this.svg.viewBox.baseVal
    
    // If viewBox is not set, fall back to using image natural dimensions
    if (!viewBox || viewBox.width === 0 || viewBox.height === 0) {
      if (this.state.imageDetails.naturalWidth && this.state.imageDetails.naturalHeight) {
        const scaleX = this.state.imageDetails.naturalWidth / svgRect.width
        const scaleY = this.state.imageDetails.naturalHeight / svgRect.height
        return {
          x: screenX * scaleX,
          y: screenY * scaleY
        }
      }
      // Default fallback - use screen coordinates
      return { x: screenX, y: screenY }
    }
    
    // Scale factors between screen and SVG coordinates
    const scaleX = viewBox.width / svgRect.width
    const scaleY = viewBox.height / svgRect.height
    
    return {
      x: screenX * scaleX,
      y: screenY * scaleY
    }
  }
  
  /**
   * Convert SVG coordinates to data coordinates (time and frequency)
   */
  _svgToDataCoordinates(svgX, svgY) {
    const margins = this.state.axes.margins
    const imageX = svgX - margins.left
    const imageY = svgY - margins.top
    
    return this._imageToDataCoordinates(imageX, imageY)
  }
  
  /**
   * Convert image-relative coordinates to data coordinates (time and frequency)
   */
  _imageToDataCoordinates(imageX, imageY) {
    const { freqMin, freqMax, timeMin, timeMax } = this.state.config
    const { naturalWidth, naturalHeight } = this.state.imageDetails
    
    // Ensure coordinates are within image bounds
    const boundedX = Math.max(0, Math.min(imageX, naturalWidth))
    const boundedY = Math.max(0, Math.min(imageY, naturalHeight))
    
    // Convert to data coordinates
    const freq = freqMin + (boundedX / naturalWidth) * (freqMax - freqMin)
    const time = timeMax - (boundedY / naturalHeight) * (timeMax - timeMin)
    
    return { freq, time }
  }
  
  /**
   * Convert data coordinates to SVG coordinates
   */
  _dataToSVGCoordinates(freq, time) {
    const { freqMin, freqMax, timeMin, timeMax } = this.state.config
    const { naturalWidth, naturalHeight } = this.state.imageDetails
    
    const x = ((freq - freqMin) / (freqMax - freqMin)) * naturalWidth
    const y = naturalHeight - ((time - timeMin) / (timeMax - timeMin)) * naturalHeight
    
    return { x, y }
  }
  
  /**
   * Convert SVG coordinates to screen coordinates
   */
  _svgToScreenCoordinates(svgX, svgY) {
    const svgRect = this.svg.getBoundingClientRect()
    const viewBox = this.svg.viewBox.baseVal
    
    // If viewBox is not set, fall back to using image natural dimensions
    if (!viewBox || viewBox.width === 0 || viewBox.height === 0) {
      if (this.state.imageDetails.naturalWidth && this.state.imageDetails.naturalHeight) {
        const scaleX = svgRect.width / this.state.imageDetails.naturalWidth
        const scaleY = svgRect.height / this.state.imageDetails.naturalHeight
        return {
          x: svgX * scaleX,
          y: svgY * scaleY
        }
      }
      // Default fallback - use SVG coordinates as screen coordinates
      return { x: svgX, y: svgY }
    }
    
    // Scale factors between SVG and screen coordinates
    const scaleX = svgRect.width / viewBox.width
    const scaleY = svgRect.height / viewBox.height
    
    return {
      x: svgX * scaleX,
      y: svgY * scaleY
    }
  }
  
  /**
   * Draw axes with tick marks and labels
   */
  _drawAxes() {
    if (!this.state.imageDetails.naturalWidth || !this.state.imageDetails.naturalHeight) return
    
    this._clearAxes()
    this._drawFrequencyAxis() // Horizontal axis (bottom)
    this._drawTimeAxis()      // Vertical axis (left)
  }
  
  /**
   * Clear existing axes
   */
  _clearAxes() {
    this.timeAxisGroup.innerHTML = ''
    this.freqAxisGroup.innerHTML = ''
  }
  
  /**
   * Draw time axis (vertical, left)
   */
  _drawTimeAxis() {
    const { timeMin, timeMax } = this.state.config
    const { naturalHeight } = this.state.imageDetails
    const margins = this.state.axes.margins
    
    // Calculate tick marks
    const range = timeMax - timeMin
    const targetTickCount = Math.floor(naturalHeight / 50) // Aim for ticks every ~50px
    const tickCount = Math.max(2, Math.min(targetTickCount, 8))
    const tickInterval = range / (tickCount - 1)
    
    // Draw main axis line (along the left edge of the image)
    const axisLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    axisLine.setAttribute('x1', margins.left)
    axisLine.setAttribute('y1', margins.top)
    axisLine.setAttribute('x2', margins.left)
    axisLine.setAttribute('y2', margins.top + naturalHeight)
    axisLine.setAttribute('class', 'gram-frame-axis-line')
    this.timeAxisGroup.appendChild(axisLine)
    
    // Draw tick marks and labels
    for (let i = 0; i < tickCount; i++) {
      const timeValue = timeMin + (i * tickInterval)
      // Y position: timeMin at bottom, timeMax at top (inverted because SVG y=0 is at top)
      const yPos = margins.top + naturalHeight - (i / (tickCount - 1)) * naturalHeight
      
      // Tick mark (extends into the left margin)
      const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      tick.setAttribute('x1', margins.left - 5)
      tick.setAttribute('y1', yPos)
      tick.setAttribute('x2', margins.left)
      tick.setAttribute('y2', yPos)
      tick.setAttribute('class', 'gram-frame-axis-tick')
      this.timeAxisGroup.appendChild(tick)
      
      // Label (in the left margin)
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      label.setAttribute('x', margins.left - 8)
      label.setAttribute('y', yPos + 4) // Slight offset for better alignment
      label.setAttribute('text-anchor', 'end')
      label.setAttribute('class', 'gram-frame-axis-label')
      label.textContent = timeValue.toFixed(1) + 's'
      this.timeAxisGroup.appendChild(label)
    }
  }
  
  /**
   * Draw frequency axis (horizontal, bottom)
   */
  _drawFrequencyAxis() {
    const { freqMin, freqMax } = this.state.config
    const { naturalWidth, naturalHeight } = this.state.imageDetails
    const margins = this.state.axes.margins
    
    // Calculate tick marks
    const range = freqMax - freqMin
    const targetTickCount = Math.floor(naturalWidth / 80) // Aim for ticks every ~80px
    const tickCount = Math.max(2, Math.min(targetTickCount, 10))
    const tickInterval = range / (tickCount - 1)
    
    // Draw main axis line (along the bottom edge of the image)
    const axisLineY = margins.top + naturalHeight
    const axisLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    axisLine.setAttribute('x1', margins.left)
    axisLine.setAttribute('y1', axisLineY)
    axisLine.setAttribute('x2', margins.left + naturalWidth)
    axisLine.setAttribute('y2', axisLineY)
    axisLine.setAttribute('class', 'gram-frame-axis-line')
    this.freqAxisGroup.appendChild(axisLine)
    
    // Draw tick marks and labels
    for (let i = 0; i < tickCount; i++) {
      const freqValue = freqMin + (i * tickInterval)
      const xPos = margins.left + (i / (tickCount - 1)) * naturalWidth
      
      // Tick mark (extends into the bottom margin)
      const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      tick.setAttribute('x1', xPos)
      tick.setAttribute('y1', axisLineY)
      tick.setAttribute('x2', xPos)
      tick.setAttribute('y2', axisLineY + 5)
      tick.setAttribute('class', 'gram-frame-axis-tick')
      this.freqAxisGroup.appendChild(tick)
      
      // Label (in the bottom margin)
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      label.setAttribute('x', xPos)
      label.setAttribute('y', axisLineY + 18)
      label.setAttribute('text-anchor', 'middle')
      label.setAttribute('class', 'gram-frame-axis-label')
      label.textContent = freqValue.toFixed(0) + 'Hz'
      this.freqAxisGroup.appendChild(label)
    }
  }
  
  _switchMode(mode) {
    // Update state
    this.state.mode = mode
    
    // Update UI
    Object.keys(this.modeButtons).forEach(m => {
      if (m === mode) {
        this.modeButtons[m].classList.add('active')
      } else {
        this.modeButtons[m].classList.remove('active')
      }
    })
    
    // Update LED display
    this._updateModeLED()
    
    // Notify listeners
    this._notifyStateListeners()
  }
  
  _setRate(rate) {
    // Update state
    this.state.rate = rate
    
    // Notify listeners
    this._notifyStateListeners()
  }
  
  _updateLEDDisplays() {
    if (!this.state.cursorPosition) {
      // Show default values when no cursor position
      this.freqLED.querySelector('.gram-frame-led-value').textContent = '0.00 Hz'
      this.timeLED.querySelector('.gram-frame-led-value').textContent = '0.00 s'
      return
    }
    
    // Update frequency LED
    const freqValue = this.state.cursorPosition.freq.toFixed(2)
    this.freqLED.querySelector('.gram-frame-led-value').textContent = `${freqValue} Hz`
    
    // Update time LED
    const timeValue = this.state.cursorPosition.time.toFixed(2)
    this.timeLED.querySelector('.gram-frame-led-value').textContent = `${timeValue} s`
  }
  
  _updateModeLED() {
    // Update mode LED
    this.modeLED.querySelector('.gram-frame-led-value').textContent = 
      this._capitalizeFirstLetter(this.state.mode)
  }
  
  _capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1)
  }
  
  _extractConfigData() {
    if (!this.configTable) return
    
    // Get image URL from the first row
    const imgElement = this.configTable.querySelector('img')
    if (imgElement) {
      this.state.imageDetails.url = imgElement.src
      
      // We'll get actual dimensions when the image loads
      this.spectrogramImage = new Image()
      this.spectrogramImage.onload = () => {
        // Store original image dimensions in imageDetails
        this.state.imageDetails.naturalWidth = this.spectrogramImage.naturalWidth
        this.state.imageDetails.naturalHeight = this.spectrogramImage.naturalHeight
        
        // Calculate initial dimensions based on container size and margins
        const containerWidth = this.container.clientWidth
        const aspectRatio = this.spectrogramImage.naturalWidth / this.spectrogramImage.naturalHeight
        
        // Account for axes margins
        const margins = this.state.axes.margins
        const totalMarginWidth = margins.left + margins.right
        const totalMarginHeight = margins.top + margins.bottom
        
        // Calculate available space for the image
        const availableWidth = containerWidth - totalMarginWidth
        const availableHeight = availableWidth / aspectRatio
        
        // Set initial SVG dimensions (include margins)
        const initialWidth = availableWidth + totalMarginWidth
        const initialHeight = availableHeight + totalMarginHeight
        
        // Update the displayDimensions property for diagnostics
        this.state.displayDimensions = {
          width: Math.round(initialWidth),
          height: Math.round(initialHeight)
        }
        
        // Create viewBox that includes margin space
        const viewBoxWidth = this.spectrogramImage.naturalWidth + totalMarginWidth
        const viewBoxHeight = this.spectrogramImage.naturalHeight + totalMarginHeight
        
        // Set SVG dimensions and viewBox
        this.svg.setAttribute('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
        this.svg.setAttribute('width', initialWidth)
        this.svg.setAttribute('height', initialHeight)
        
        // Position image directly in SVG coordinate space (no mainGroup translation)
        this.mainGroup.setAttribute('transform', '')
        
        // Set the image source in SVG - position it in the margin area
        this.svgImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imgElement.src)
        this.svgImage.setAttribute('width', this.spectrogramImage.naturalWidth)
        this.svgImage.setAttribute('height', this.spectrogramImage.naturalHeight)
        this.svgImage.setAttribute('x', margins.left)
        this.svgImage.setAttribute('y', margins.top)
        
        
        // Draw initial axes
        this._drawAxes()
        
        // Notify listeners of updated state
        this._notifyStateListeners()
      }
      this.spectrogramImage.src = imgElement.src
    }
    
    // Extract min/max values from the table rows
    const rows = this.configTable.querySelectorAll('tr')
    rows.forEach(row => {
      const cells = row.querySelectorAll('td')
      if (cells.length >= 3) {
        const param = cells[0].textContent.trim()
        const min = parseFloat(cells[1].textContent)
        const max = parseFloat(cells[2].textContent)
        
        if (param === 'time') {
          this.state.config.timeMin = min
          this.state.config.timeMax = max
        } else if (param === 'freq') {
          this.state.config.freqMin = min
          this.state.config.freqMax = max
        }
      }
    })
  }
  
  
  _notifyStateListeners() {
    // Log state changes to console for Task 1.4
    console.log('GramFrame State Updated:', JSON.stringify(this.state, null, 2))
    
    // Create a deep copy of the state to prevent direct modification
    const stateCopy = JSON.parse(JSON.stringify(this.state))
    
    // Notify all registered state listeners
    stateListeners.forEach(listener => {
      try {
        listener(stateCopy)
      } catch (error) {
        console.error('Error in state listener:', error)
      }
    })
  }
}

/**
 * Public API
 */
const GramFrameAPI = {
  // Initialize all config tables on the page
  init() {
    const configTables = document.querySelectorAll('table.spectro-config')
    const instances = []
    
    configTables.forEach(table => {
      instances.push(new GramFrame(table))
    })
    
    return instances
  },
  
  /**
   * Add a state listener that will be called whenever the component state changes
   * @param {Function} callback - Function to be called with the current state
   * @returns {Function} - Returns the callback function for chaining
   * @example
   * // Basic usage
   * GramFrame.addStateListener(state => {
   *   console.log('State updated:', state)
   * })
   * 
   * // With error handling
   * GramFrame.addStateListener(state => {
   *   try {
   *     // Process state
   *     updateUI(state.cursorPosition)
   *   } catch (err) {
   *     console.error('Error processing state:', err)
   *   }
   * })
   */
  addStateListener(callback) {
    if (typeof callback !== 'function') {
      throw new Error('State listener must be a function')
    }
    
    if (!stateListeners.includes(callback)) {
      stateListeners.push(callback)
      
      // Immediately call the listener with the current state if available
      const instances = document.querySelectorAll('.gram-frame-container')
      if (instances.length > 0) {
        // Find the first GramFrame instance
        const instance = instances[0].__gramFrameInstance
        if (instance && instance.state) {
          try {
            // Create a deep copy of the state
            const stateCopy = JSON.parse(JSON.stringify(instance.state))
            // Call the listener with the current state
            callback(stateCopy)
          } catch (error) {
            console.error('Error calling state listener with initial state:', error)
          }
        }
      }
    }
    
    return callback
  },
  
  /**
   * Remove a previously added state listener
   * @param {Function} callback - The callback function to remove
   * @returns {boolean} - Returns true if the listener was found and removed, false otherwise
   * @example
   * // Add a listener and store the reference
   * const myListener = GramFrame.addStateListener(state => {
   *   console.log('State updated:', state)
   * })
   * 
   * // Later, remove the listener
   * GramFrame.removeStateListener(myListener)
   */
  removeStateListener(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function')
    }
    
    const index = stateListeners.indexOf(callback)
    if (index !== -1) {
      stateListeners.splice(index, 1)
      return true
    }
    return false
  },
  
  // Toggle canvas bounds overlay
  toggleCanvasBoundsOverlay() {
    // This will be implemented in Phase 5
    console.log('Toggle canvas bounds overlay')
  },
  
  // Set debug grid visibility
  setDebugGrid(visible) {
    // This will be implemented in Phase 5
    console.log('Set debug grid visibility:', visible)
  },
  
  // Switch mode
  switchMode(mode) {
    // This will be implemented in Phase 4
    console.log('Switch mode:', mode)
  },
  
  // Set rate value
  setRate(value) {
    // This will be implemented in Phase 4
    console.log('Set rate:', value)
  },
  
  // Force update
  forceUpdate() {
    // Find the first GramFrame instance and trigger a state update
    const instances = document.querySelectorAll('.gram-frame-container')
    if (instances.length > 0) {
      const instance = instances[0].__gramFrameInstance
      if (instance) {
        // Trigger a state update by calling _notifyStateListeners
        instance._notifyStateListeners()
      }
    }
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  window.GramFrame = GramFrameAPI
  GramFrameAPI.init()
  // Connect to state display if we're on the debug page
  const stateDisplay = document.getElementById('state-display')
  if (stateDisplay) {
    GramFrameAPI.addStateListener((state) => {
      stateDisplay.textContent = JSON.stringify(state, null, 2)
    })
  }
})

// Export the API
window.GramFrame = GramFrameAPI

// Hot Module Replacement (HMR) support for Task 1.4
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log('🔄 GramFrame component updated - Hot reloading')
    
    // Store old state listeners before replacing the API
    const oldListeners = [...stateListeners]
    
    // Clear existing listeners
    stateListeners.length = 0
    
    // Re-initialize the component
    const instances = GramFrameAPI.init()
    
    // Restore state listeners
    oldListeners.forEach(listener => {
      GramFrameAPI.addStateListener(listener)
    })
    
    console.log('✅ GramFrame hot reload complete')
  })
}
