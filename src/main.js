/**
 * GramFrame - A JavaScript component for interactive spectrogram analysis
 */

/// <reference path="./types.js" />

/**
 * Initial state object for GramFrame component
 * @type {GramFrameState}
 */
const initialState = {
  version: '0.0.1',
  timestamp: new Date().toISOString(),
  metadata: {
    instanceId: ''
  },
  mode: 'analysis', // 'analysis', 'harmonics', 'doppler'
  rate: 1,
  cursorPosition: null,
  cursors: [],
  harmonics: {
    baseFrequency: null,
    harmonicData: []
  },
  doppler: {
    startPoint: null,
    endPoint: null,
    deltaTime: null,
    deltaFrequency: null,
    speed: null
  },
  dragState: {
    isDragging: false,
    dragStartPosition: null
  },
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

/**
 * Global registry of listeners that should be applied to all instances
 * @type {StateListener[]}
 */
const globalStateListeners = []

/**
 * GramFrame class - Main component implementation
 */
class GramFrame {
  /**
   * Creates a new GramFrame instance
   * @param {HTMLTableElement} configTable - Configuration table element to replace
   */
  constructor(configTable) {
    this.state = JSON.parse(JSON.stringify(initialState))
    this.configTable = configTable
    
    /**
     * Array of state listener functions for this specific instance
     * @type {StateListener[]}
     */
    this.stateListeners = []
    
    /** @type {string} */
    this.instanceId = ''
    
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
    
    // Create cursor indicator group
    this.cursorGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    this.cursorGroup.setAttribute('class', 'gram-frame-cursor-group')
    this.svg.appendChild(this.cursorGroup)
    
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
      // @ts-ignore - Adding custom property to DOM element
      this.container.__gramFrameInstance = this
    }
    
    // Apply any globally registered listeners to this new instance
    globalStateListeners.forEach(listener => {
      if (!this.stateListeners.includes(listener)) {
        this.stateListeners.push(listener)
      }
    })
    
    // Extract config data from table
    this._extractConfigData()
    
    // Setup event listeners
    this._setupEventListeners()
    
    // Setup ResizeObserver for responsive behavior
    this._setupResizeObserver()
    
    // Notify listeners of initial state
    this._notifyStateListeners()
  }
  
  /**
   * Creates LED display elements for showing measurement values
   */
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
    
    // Create doppler-specific displays (initially hidden)
    this.deltaTimeLED = this._createLEDDisplay('ΔTime', '0.00 s')
    this.deltaTimeLED.style.display = 'none'
    this.readoutPanel.appendChild(this.deltaTimeLED)
    
    this.deltaFreqLED = this._createLEDDisplay('ΔFreq', '0 Hz')
    this.deltaFreqLED.style.display = 'none'
    this.readoutPanel.appendChild(this.deltaFreqLED)
    
    this.speedLED = this._createLEDDisplay('Speed', '0.0 knots')
    this.speedLED.style.display = 'none'
    this.readoutPanel.appendChild(this.speedLED)
    
    // Create rate display
    this.rateLED = this._createLEDDisplay('Rate', `${this.state.rate} Hz/s`)
    this.readoutPanel.appendChild(this.rateLED)
  }
  
  /**
   * Creates mode switching button UI
   */
  _createModeSwitchingUI() {
    // Create mode buttons container
    /** @type {HTMLDivElement} */
    this.modesContainer = document.createElement('div')
    this.modesContainer.className = 'gram-frame-modes'
    
    // Create mode buttons
    const modes = ['analysis', 'harmonics', 'doppler']
    /** @type {Record<string, HTMLButtonElement>} */
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
      if (this.modesContainer) {
        this.modesContainer.appendChild(button)
      }
    })
    
    this.container.appendChild(this.modesContainer)
  }
  
  /**
   * Creates rate input control
   */
  _createRateInput() {
    // Create rate input container
    const rateContainer = document.createElement('div')
    rateContainer.className = 'gram-frame-rate'
    
    // Create label
    const label = document.createElement('label')
    label.textContent = 'Rate:'
    rateContainer.appendChild(label)
    
    // Create input
    /** @type {HTMLInputElement} */
    this.rateInput = document.createElement('input')
    this.rateInput.type = 'number'
    this.rateInput.min = '0.1'
    this.rateInput.step = '0.1'
    this.rateInput.value = String(this.state.rate)
    this.rateInput.title = 'Rate value affects Doppler speed calculations'
    rateContainer.appendChild(this.rateInput)
    
    // Create unit indicator
    const unit = document.createElement('span')
    unit.textContent = 'Hz/s'
    unit.className = 'gram-frame-rate-unit'
    rateContainer.appendChild(unit)
    
    this.container.appendChild(rateContainer)
  }
  
  /**
   * Creates a single LED display element
   * @param {string} label - Display label
   * @param {string} value - Initial display value
   * @returns {HTMLDivElement} The LED display element
   */
  _createLEDDisplay(label, value) {
    const led = document.createElement('div')
    led.className = 'gram-frame-led'
    led.innerHTML = `
      <div class="gram-frame-led-label">${label}</div>
      <div class="gram-frame-led-value">${value}</div>
    `
    return led
  }
  
  /**
   * Sets up event listeners for mouse interactions and UI controls
   */
  _setupEventListeners() {
    // Bind event handlers to maintain proper 'this' context
    this._boundHandleMouseMove = this._handleMouseMove.bind(this)
    this._boundHandleMouseLeave = this._handleMouseLeave.bind(this)
    this._boundHandleClick = this._handleClick.bind(this)
    this._boundHandleMouseDown = this._handleMouseDown.bind(this)
    this._boundHandleMouseUp = this._handleMouseUp.bind(this)
    this._boundHandleResize = this._handleResize.bind(this)
    
    // SVG mouse events
    this.svg.addEventListener('mousemove', this._boundHandleMouseMove)
    this.svg.addEventListener('mouseleave', this._boundHandleMouseLeave)
    this.svg.addEventListener('click', this._boundHandleClick)
    this.svg.addEventListener('mousedown', this._boundHandleMouseDown)
    this.svg.addEventListener('mouseup', this._boundHandleMouseUp)
    
    // Mode button events
    Object.keys(this.modeButtons || {}).forEach(mode => {
      const button = this.modeButtons[mode]
      if (button) {
        button.addEventListener('click', () => {
          this._switchMode(/** @type {'analysis'|'doppler'} */ (mode))
        })
      }
    })
    
    // Rate input events
    if (this.rateInput) {
      this.rateInput.addEventListener('change', () => {
        if (this.rateInput) {
          const rate = parseFloat(this.rateInput.value)
          if (!isNaN(rate) && rate >= 0.1) {
            this._setRate(rate)
          } else {
            // Reset to previous valid value if invalid input
            this.rateInput.value = String(this.state.rate)
          }
        }
      })
    }
    
    // Also handle input events for real-time validation feedback
    if (this.rateInput) {
      this.rateInput.addEventListener('input', () => {
        if (this.rateInput) {
          const rate = parseFloat(this.rateInput.value)
          if (!isNaN(rate) && rate >= 0.1) {
            this.rateInput.style.borderColor = '#ddd'
          } else {
            this.rateInput.style.borderColor = '#ff6b6b'
          }
        }
      })
    }
    
    // Window resize event
    window.addEventListener('resize', this._boundHandleResize)
  }
  
  /**
   * Sets up ResizeObserver to monitor container dimensions
   */
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
  
  /**
   * Handles window resize events
   */
  _handleResize() {
    // Delegate to SVG resize handler
    const containerRect = this.container.getBoundingClientRect()
    this._handleSVGResize(containerRect)
  }
  
  /**
   * Handles SVG container resize
   * @param {DOMRect} containerRect - Container dimensions
   */
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
    this.svg.setAttribute('width', String(newWidth))
    this.svg.setAttribute('height', String(newHeight))
    
    // Position image directly in SVG coordinate space (no mainGroup translation)
    this.mainGroup.setAttribute('transform', '')
    
    // Update image element within SVG - position it in the margin area
    this.svgImage.setAttribute('width', String(originalWidth))
    this.svgImage.setAttribute('height', String(originalHeight))
    this.svgImage.setAttribute('x', String(margins.left))
    this.svgImage.setAttribute('y', String(margins.top))
    
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
  
  /**
   * Handles mouse move events over the SVG
   * @param {MouseEvent} event - Mouse event
   */
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
    
    // Update visual cursor indicators
    this._updateCursorIndicators()
    
    // In Analysis mode, update harmonics during drag
    if (this.state.mode === 'analysis' && this.state.dragState.isDragging) {
      this._triggerHarmonicsDisplay()
    }
    
    // Notify listeners
    this._notifyStateListeners()
  }
  
  /**
   * Handles mouse leave events
   * @param {MouseEvent} event - Mouse event
   */
  _handleMouseLeave(event) {
    // Clear cursor position when mouse leaves the SVG area
    this.state.cursorPosition = null
    
    // Update LED displays to show no position
    this._updateLEDDisplays()
    
    // Clear visual cursor indicators
    this._updateCursorIndicators()
    
    // Notify listeners
    this._notifyStateListeners()
  }
  
  /**
   * Handles mouse down events for drag interactions
   * @param {MouseEvent} event - Mouse event
   */
  _handleMouseDown(event) {
    // Only process if we have valid image details
    if (!this.state.imageDetails.naturalWidth || !this.state.imageDetails.naturalHeight) return
    
    // Start drag state in Analysis mode for harmonics
    if (this.state.mode === 'analysis' && this.state.cursorPosition) {
      this.state.dragState.isDragging = true
      this.state.dragState.dragStartPosition = { ...this.state.cursorPosition }
      
      // Trigger harmonics display immediately on mouse down
      this._triggerHarmonicsDisplay()
    }
  }
  
  /**
   * Handles mouse up events to end drag interactions
   * @param {MouseEvent} event - Mouse event
   */
  _handleMouseUp(event) {
    // End drag state
    if (this.state.dragState.isDragging) {
      this.state.dragState.isDragging = false
      this.state.dragState.dragStartPosition = null
      
      // Clear harmonics state when drag ends
      this.state.harmonics.baseFrequency = null
      this.state.harmonics.harmonicData = []
      
      // Update displays and indicators
      this._updateLEDDisplays()
      this._updateCursorIndicators()
      
      // Notify listeners of state change
      this._notifyStateListeners()
    }
  }
  
  /**
   * Handles click events for Doppler mode measurements
   * @param {MouseEvent} event - Mouse event
   */
  _handleClick(event) {
    // Only process if we have valid image details and are in Doppler mode
    if (!this.state.imageDetails.naturalWidth || !this.state.imageDetails.naturalHeight || this.state.mode !== 'doppler') {
      return
    }
    
    // Only process if mouse is within the image area
    if (!this.state.cursorPosition) {
      return
    }
    
    // Handle Doppler mode clicks
    if (this.state.mode === 'doppler') {
      this._handleDopplerClick()
    }
  }
  
  /**
   * Processes Doppler mode click to set measurement points
   */
  _handleDopplerClick() {
    // Create point data from current cursor position
    if (!this.state.cursorPosition) return
    
    const clickPoint = {
      time: this.state.cursorPosition.time,
      freq: this.state.cursorPosition.freq,
      svgX: this.state.cursorPosition.svgX,
      svgY: this.state.cursorPosition.svgY
    }
    
    if (!this.state.doppler.startPoint) {
      // Set start point
      this.state.doppler.startPoint = clickPoint
      this.state.doppler.endPoint = null
      this.state.doppler.deltaTime = null
      this.state.doppler.deltaFrequency = null
      this.state.doppler.speed = null
    } else if (!this.state.doppler.endPoint) {
      // Set end point and calculate measurements
      this.state.doppler.endPoint = clickPoint
      this._calculateDopplerMeasurements()
    } else {
      // Both points are set, start a new measurement
      this.state.doppler.startPoint = clickPoint
      this.state.doppler.endPoint = null
      this.state.doppler.deltaTime = null
      this.state.doppler.deltaFrequency = null
      this.state.doppler.speed = null
    }
    
    // Update displays and indicators
    this._updateLEDDisplays()
    this._updateCursorIndicators()
    
    // Notify listeners of state change
    this._notifyStateListeners()
  }
  
  /**
   * Calculates Doppler measurements from start and end points
   */
  _calculateDopplerMeasurements() {
    if (!this.state.doppler.startPoint || !this.state.doppler.endPoint) {
      return
    }
    
    const start = this.state.doppler.startPoint
    const end = this.state.doppler.endPoint
    
    // Calculate delta values
    this.state.doppler.deltaTime = end.time - start.time
    this.state.doppler.deltaFrequency = end.freq - start.freq
    
    // Speed calculation incorporating rate: ΔT * ΔF * rate
    this.state.doppler.speed = Math.abs(this.state.doppler.deltaTime * this.state.doppler.deltaFrequency * this.state.rate)
  }
  
  /**
   * Clean up event listeners (called when component is destroyed)
   */
  _cleanupEventListeners() {
    if (this.svg) {
      if (this._boundHandleMouseMove) {
        this.svg.removeEventListener('mousemove', this._boundHandleMouseMove)
      }
      if (this._boundHandleMouseLeave) {
        this.svg.removeEventListener('mouseleave', this._boundHandleMouseLeave)
      }
      if (this._boundHandleClick) {
        this.svg.removeEventListener('click', this._boundHandleClick)
      }
      if (this._boundHandleMouseDown) {
        this.svg.removeEventListener('mousedown', this._boundHandleMouseDown)
      }
      if (this._boundHandleMouseUp) {
        this.svg.removeEventListener('mouseup', this._boundHandleMouseUp)
      }
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
  /**
   * Convert screen coordinates to SVG coordinates
   * @param {number} screenX - Screen X coordinate
   * @param {number} screenY - Screen Y coordinate
   * @returns {SVGCoordinates} SVG coordinates
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
  /**
   * Convert SVG coordinates to data coordinates (time and frequency)
   * @param {number} svgX - SVG X coordinate
   * @param {number} svgY - SVG Y coordinate
   * @returns {DataCoordinates} Data coordinates
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
  /**
   * Convert image-relative coordinates to data coordinates (time and frequency)
   * @param {number} imageX - Image X coordinate
   * @param {number} imageY - Image Y coordinate
   * @returns {DataCoordinates} Data coordinates
   */
  _imageToDataCoordinates(imageX, imageY) {
    const { freqMin, freqMax, timeMin, timeMax } = this.state.config
    const { naturalWidth, naturalHeight } = this.state.imageDetails
    
    // Ensure coordinates are within image bounds
    const boundedX = Math.max(0, Math.min(imageX, naturalWidth))
    const boundedY = Math.max(0, Math.min(imageY, naturalHeight))
    
    // Convert to data coordinates
    const rawFreq = freqMin + (boundedX / naturalWidth) * (freqMax - freqMin)
    const time = timeMax - (boundedY / naturalHeight) * (timeMax - timeMin)
    
    // Apply rate scaling to frequency - rate acts as a frequency divider
    const freq = rawFreq / this.state.rate
    
    return { freq, time }
  }
  
  /**
   * Convert data coordinates to SVG coordinates
   */
  /**
   * Convert data coordinates to SVG coordinates
   * @param {number} freq - Frequency in Hz
   * @param {number} time - Time in seconds
   * @returns {SVGCoordinates} SVG coordinates
   */
  _dataToSVGCoordinates(freq, time) {
    const { freqMin, freqMax, timeMin, timeMax } = this.state.config
    const { naturalWidth, naturalHeight } = this.state.imageDetails
    
    // Convert frequency back to raw frequency space for positioning
    const rawFreq = freq * this.state.rate
    
    const x = ((rawFreq - freqMin) / (freqMax - freqMin)) * naturalWidth
    const y = naturalHeight - ((time - timeMin) / (timeMax - timeMin)) * naturalHeight
    
    return { x, y }
  }
  
  /**
   * Convert SVG coordinates to screen coordinates
   */
  /**
   * Convert SVG coordinates to screen coordinates
   * @param {number} svgX - SVG X coordinate
   * @param {number} svgY - SVG Y coordinate
   * @returns {ScreenCoordinates} Screen coordinates
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
    axisLine.setAttribute('x1', String(margins.left))
    axisLine.setAttribute('y1', String(margins.top))
    axisLine.setAttribute('x2', String(margins.left))
    axisLine.setAttribute('y2', String(margins.top + naturalHeight))
    axisLine.setAttribute('class', 'gram-frame-axis-line')
    this.timeAxisGroup.appendChild(axisLine)
    
    // Draw tick marks and labels
    for (let i = 0; i < tickCount; i++) {
      const timeValue = timeMin + (i * tickInterval)
      // Y position: timeMin at bottom, timeMax at top (inverted because SVG y=0 is at top)
      const yPos = margins.top + naturalHeight - (i / (tickCount - 1)) * naturalHeight
      
      // Tick mark (extends into the left margin)
      const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      tick.setAttribute('x1', String(margins.left - 5))
      tick.setAttribute('y1', String(yPos))
      tick.setAttribute('x2', String(margins.left))
      tick.setAttribute('y2', String(yPos))
      tick.setAttribute('class', 'gram-frame-axis-tick')
      this.timeAxisGroup.appendChild(tick)
      
      // Label (in the left margin)
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      label.setAttribute('x', String(margins.left - 8))
      label.setAttribute('y', String(yPos + 4)) // Slight offset for better alignment
      label.setAttribute('text-anchor', 'end')
      label.setAttribute('class', 'gram-frame-axis-label')
      label.textContent = timeValue.toFixed(1) + 's'
      this.timeAxisGroup.appendChild(label)
    }
  }
  
  /**
   * Draw frequency axis (horizontal, bottom)
   */
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
    axisLine.setAttribute('x1', String(margins.left))
    axisLine.setAttribute('y1', String(axisLineY))
    axisLine.setAttribute('x2', String(margins.left + naturalWidth))
    axisLine.setAttribute('y2', String(axisLineY))
    axisLine.setAttribute('class', 'gram-frame-axis-line')
    this.freqAxisGroup.appendChild(axisLine)
    
    // Draw tick marks and labels
    for (let i = 0; i < tickCount; i++) {
      const freqValue = freqMin + (i * tickInterval)
      const xPos = margins.left + (i / (tickCount - 1)) * naturalWidth
      
      // Tick mark (extends into the bottom margin)
      const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      tick.setAttribute('x1', String(xPos))
      tick.setAttribute('y1', String(axisLineY))
      tick.setAttribute('x2', String(xPos))
      tick.setAttribute('y2', String(axisLineY + 5))
      tick.setAttribute('class', 'gram-frame-axis-tick')
      this.freqAxisGroup.appendChild(tick)
      
      // Label (in the bottom margin)
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      label.setAttribute('x', String(xPos))
      label.setAttribute('y', String(axisLineY + 18))
      label.setAttribute('text-anchor', 'middle')
      label.setAttribute('class', 'gram-frame-axis-label')
      label.textContent = freqValue.toFixed(0) + 'Hz'
      this.freqAxisGroup.appendChild(label)
    }
  }
  
  /**
   * Switch between analysis modes
   * @param {'analysis'|'doppler'} mode - Target mode
   */
  _switchMode(mode) {
    // Update state
    this.state.mode = mode
    
    // Clear harmonics state when switching away from analysis mode
    if (mode !== 'analysis') {
      this.state.harmonics.baseFrequency = null
      this.state.harmonics.harmonicData = []
    }
    
    // Clear doppler state when switching away from doppler mode
    if (mode !== 'doppler') {
      this.state.doppler.startPoint = null
      this.state.doppler.endPoint = null
      this.state.doppler.deltaTime = null
      this.state.doppler.deltaFrequency = null
      this.state.doppler.speed = null
    }
    
    // Clear drag state when switching modes
    this.state.dragState.isDragging = false
    this.state.dragState.dragStartPosition = null
    
    // Update UI
    if (this.modeButtons) {
      Object.keys(this.modeButtons).forEach(m => {
        const button = this.modeButtons[m]
        if (button) {
          if (m === mode) {
            button.classList.add('active')
          } else {
            button.classList.remove('active')
          }
        }
      })
    }
    
    // Clear existing cursor indicators and redraw for new mode
    this._updateCursorIndicators()
    
    // Update LED display
    this._updateModeLED()
    this._updateLEDDisplays()
    
    // Notify listeners
    this._notifyStateListeners()
  }
  
  /**
   * Set the rate value for frequency calculations
   * @param {number} rate - Rate value in Hz/s
   */
  _setRate(rate) {
    // Update state
    this.state.rate = rate
    
    // Update rate LED display
    this._updateRateLED()
    
    // If in Doppler mode and we have measurements, recalculate speed with new rate
    if (this.state.mode === 'doppler' && this.state.doppler.startPoint && this.state.doppler.endPoint) {
      this._calculateDopplerMeasurements()
      this._updateLEDDisplays()
    }
    
    // Notify listeners
    this._notifyStateListeners()
  }
  
  /**
   * Update LED display values based on current state
   */
  _updateLEDDisplays() {
    // Hide/show doppler-specific LEDs based on mode
    if (this.state.mode === 'doppler') {
      this.deltaTimeLED.style.display = 'block'
      this.deltaFreqLED.style.display = 'block'
      this.speedLED.style.display = 'block'
      
      // Update doppler-specific values if available
      if (this.state.doppler.deltaTime !== null) {
        this.deltaTimeLED.querySelector('.gram-frame-led-value').textContent = `ΔT: ${this.state.doppler.deltaTime.toFixed(2)} s`
      } else {
        this.deltaTimeLED.querySelector('.gram-frame-led-value').textContent = 'ΔT: 0.00 s'
      }
      
      if (this.state.doppler.deltaFrequency !== null) {
        this.deltaFreqLED.querySelector('.gram-frame-led-value').textContent = `ΔF: ${this.state.doppler.deltaFrequency.toFixed(0)} Hz`
      } else {
        this.deltaFreqLED.querySelector('.gram-frame-led-value').textContent = 'ΔF: 0 Hz'
      }
      
      if (this.state.doppler.speed !== null) {
        this.speedLED.querySelector('.gram-frame-led-value').textContent = `Speed: ${this.state.doppler.speed.toFixed(1)} knots`
      } else {
        this.speedLED.querySelector('.gram-frame-led-value').textContent = 'Speed: 0.0 knots'
      }
    } else {
      this.deltaTimeLED.style.display = 'none'
      this.deltaFreqLED.style.display = 'none'
      this.speedLED.style.display = 'none'
    }
    
    if (!this.state.cursorPosition) {
      // Show default values when no cursor position
      this.freqLED.querySelector('.gram-frame-led-value').textContent = 'Freq: 0.00 Hz'
      this.timeLED.querySelector('.gram-frame-led-value').textContent = 'Time: 0.00 s'
      return
    }
    
    // Mode-specific LED formatting
    if (this.state.mode === 'analysis' && this.state.dragState.isDragging && this.state.harmonics.baseFrequency !== null) {
      // For Analysis mode during drag, show base frequency for harmonics
      const baseFreqValue = this.state.harmonics.baseFrequency.toFixed(1)
      this.freqLED.querySelector('.gram-frame-led-value').textContent = `Base: ${baseFreqValue} Hz`
      
      // Still show time
      const timeValue = this.state.cursorPosition.time.toFixed(2)
      this.timeLED.querySelector('.gram-frame-led-value').textContent = `Time: ${timeValue} s`
    } else {
      // For normal mode operation - use 1 decimal place for frequency as per spec
      const freqValue = this.state.cursorPosition.freq.toFixed(1)
      this.freqLED.querySelector('.gram-frame-led-value').textContent = `Freq: ${freqValue} Hz`
      
      // Update time LED - use 2 decimal places as per spec
      const timeValue = this.state.cursorPosition.time.toFixed(2)
      this.timeLED.querySelector('.gram-frame-led-value').textContent = `Time: ${timeValue} s`
    }
  }
  
  /**
   * Update mode LED display
   */
  _updateModeLED() {
    // Update mode LED
    this.modeLED.querySelector('.gram-frame-led-value').textContent = 
      this._capitalizeFirstLetter(this.state.mode)
  }
  
  /**
   * Update rate LED display
   */
  _updateRateLED() {
    // Update rate LED
    this.rateLED.querySelector('.gram-frame-led-value').textContent = `${this.state.rate} Hz/s`
  }
  
  /**
   * Update cursor visual indicators based on current mode and state
   */
  _updateCursorIndicators() {
    // Clear existing cursor indicators
    this.cursorGroup.innerHTML = ''
    
    // Only draw indicators if cursor position is available
    if (!this.state.cursorPosition || !this.state.imageDetails.naturalWidth || !this.state.imageDetails.naturalHeight) {
      // In harmonics mode, if we have harmonic data but no cursor position, clear the harmonics
      if (this.state.mode === 'harmonics' && this.state.harmonics.baseFrequency !== null) {
        // Keep harmonics state but don't draw anything when cursor is outside
        return
      }
      return
    }
    
    // Handle different modes
    if (this.state.mode === 'analysis') {
      this._drawAnalysisMode()
      
      // In Analysis mode, also draw harmonics if dragging
      if (this.state.dragState.isDragging && this.state.harmonics.baseFrequency !== null) {
        this._drawHarmonicsMode()
      }
    } else if (this.state.mode === 'doppler') {
      this._drawDopplerMode()
    }
  }
  
  /**
   * Draw cursor indicators for analysis mode
   */
  _drawAnalysisMode() {
    if (!this.state.cursorPosition) return
    
    const margins = this.state.axes.margins
    const { naturalWidth, naturalHeight } = this.state.imageDetails
    
    // Calculate cursor position in SVG coordinates (accounting for margins)
    const cursorSVGX = margins.left + this.state.cursorPosition.imageX
    const cursorSVGY = margins.top + this.state.cursorPosition.imageY
    
    // Create vertical crosshair lines (time indicator) - shadow first, then main line
    const verticalShadow = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    verticalShadow.setAttribute('x1', String(cursorSVGX))
    verticalShadow.setAttribute('y1', String(margins.top))
    verticalShadow.setAttribute('x2', String(cursorSVGX))
    verticalShadow.setAttribute('y2', String(margins.top + naturalHeight))
    verticalShadow.setAttribute('class', 'gram-frame-cursor-shadow')
    this.cursorGroup.appendChild(verticalShadow)
    
    const verticalLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    verticalLine.setAttribute('x1', String(cursorSVGX))
    verticalLine.setAttribute('y1', String(margins.top))
    verticalLine.setAttribute('x2', String(cursorSVGX))
    verticalLine.setAttribute('y2', String(margins.top + naturalHeight))
    verticalLine.setAttribute('class', 'gram-frame-cursor-vertical')
    this.cursorGroup.appendChild(verticalLine)
    
    // Create horizontal crosshair lines (frequency indicator) - shadow first, then main line
    const horizontalShadow = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    horizontalShadow.setAttribute('x1', String(margins.left))
    horizontalShadow.setAttribute('y1', String(cursorSVGY))
    horizontalShadow.setAttribute('x2', String(margins.left + naturalWidth))
    horizontalShadow.setAttribute('y2', String(cursorSVGY))
    horizontalShadow.setAttribute('class', 'gram-frame-cursor-shadow')
    this.cursorGroup.appendChild(horizontalShadow)
    
    const horizontalLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    horizontalLine.setAttribute('x1', String(margins.left))
    horizontalLine.setAttribute('y1', String(cursorSVGY))
    horizontalLine.setAttribute('x2', String(margins.left + naturalWidth))
    horizontalLine.setAttribute('y2', String(cursorSVGY))
    horizontalLine.setAttribute('class', 'gram-frame-cursor-horizontal')
    this.cursorGroup.appendChild(horizontalLine)
    
    // Create center point indicator
    const centerPoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    centerPoint.setAttribute('cx', String(cursorSVGX))
    centerPoint.setAttribute('cy', String(cursorSVGY))
    centerPoint.setAttribute('r', '3')
    centerPoint.setAttribute('class', 'gram-frame-cursor-point')
    this.cursorGroup.appendChild(centerPoint)
  }
  
  /**
   * Trigger harmonics calculation and display during drag
   */
  _triggerHarmonicsDisplay() {
    // Only trigger if we have a cursor position, are in analysis mode, and are dragging
    if (!this.state.cursorPosition || this.state.mode !== 'analysis' || !this.state.dragState.isDragging) {
      return
    }
    
    const baseFrequency = this.state.cursorPosition.freq
    
    // Calculate harmonic frequencies and their positions
    const harmonics = this._calculateHarmonics(baseFrequency)
    
    // Update state with harmonic data
    this.state.harmonics.baseFrequency = baseFrequency
    this.state.harmonics.harmonicData = harmonics
    
    // Update LED displays to show base frequency
    this._updateLEDDisplays()
    
    // Redraw cursor indicators to show harmonics
    this._updateCursorIndicators()
    
    // Notify listeners of state change
    this._notifyStateListeners()
  }
  
  /**
   * Draw harmonic indicators
   */
  _drawHarmonicsMode() {
    // This method now only draws the harmonics that have been calculated
    // It doesn't calculate them - that's done in _triggerHarmonicsDisplay
    const harmonics = this.state.harmonics.harmonicData
    
    // Draw harmonic lines and labels
    harmonics.forEach((harmonic, index) => {
      this._drawHarmonicLine(harmonic, index === 0)
      this._drawHarmonicLabels(harmonic, index === 0)
    })
  }
  
  /**
   * Calculate harmonic frequencies and their positions
   * @param {number} baseFrequency - Base frequency in Hz
   * @returns {HarmonicData[]} Array of harmonic data
   */
  _calculateHarmonics(baseFrequency) {
    const { freqMin, freqMax } = this.state.config
    const { width } = this.state.displayDimensions
    const harmonics = []
    
    // Start with the base frequency (1x harmonic)
    let harmonicNumber = 1
    let harmonicFreq = baseFrequency * harmonicNumber
    
    // Add harmonics while they're within the visible frequency range
    // Continue until we exceed the maximum frequency or reach the right edge of the component
    while (harmonicFreq <= freqMax) {
      if (harmonicFreq >= freqMin) {
        // Convert frequency to SVG x-coordinate
        const dataCoords = this._dataToSVGCoordinates(harmonicFreq, 0)
        const svgX = this.state.axes.margins.left + dataCoords.x
        
        // If we've reached the right edge of the component, stop adding harmonics
        const rightEdge = this.state.axes.margins.left + width - this.state.axes.margins.right
        if (svgX > rightEdge) {
          break
        }
        
        harmonics.push({
          number: harmonicNumber,
          frequency: harmonicFreq,
          svgX: svgX
        })
      }
      
      harmonicNumber++
      harmonicFreq = baseFrequency * harmonicNumber
    }
    
    return harmonics
  }
  
  /**
   * Draw a single harmonic line
   * @param {HarmonicData} harmonic - Harmonic data
   * @param {boolean} isMainLine - Whether this is the main (1x) line
   */
  _drawHarmonicLine(harmonic, isMainLine) {
    const margins = this.state.axes.margins
    const { naturalHeight } = this.state.imageDetails
    
    // Draw shadow line first for visibility
    const shadowLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    shadowLine.setAttribute('x1', String(harmonic.svgX))
    shadowLine.setAttribute('y1', String(margins.top))
    shadowLine.setAttribute('x2', String(harmonic.svgX))
    shadowLine.setAttribute('y2', String(margins.top + naturalHeight))
    shadowLine.setAttribute('class', 'gram-frame-harmonic-shadow')
    this.cursorGroup.appendChild(shadowLine)
    
    // Draw main line
    const mainLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    mainLine.setAttribute('x1', String(harmonic.svgX))
    mainLine.setAttribute('y1', String(margins.top))
    mainLine.setAttribute('x2', String(harmonic.svgX))
    mainLine.setAttribute('y2', String(margins.top + naturalHeight))
    
    // Use distinct styling for the main line (1×) as specified
    if (isMainLine) {
      mainLine.setAttribute('class', 'gram-frame-harmonic-main')
    } else {
      mainLine.setAttribute('class', 'gram-frame-harmonic-line')
    }
    
    this.cursorGroup.appendChild(mainLine)
  }
  
  /**
   * Draw labels for a harmonic line
   * @param {HarmonicData} harmonic - Harmonic data
   * @param {boolean} isMainLine - Whether this is the main (1x) line
   */
  _drawHarmonicLabels(harmonic, isMainLine) {
    const margins = this.state.axes.margins
    const labelY = margins.top + 15 // Position labels near the top
    
    // Create harmonic number label (left side of line)
    const numberLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    numberLabel.setAttribute('x', String(harmonic.svgX - 5))
    numberLabel.setAttribute('y', String(labelY))
    numberLabel.setAttribute('text-anchor', 'end')
    numberLabel.setAttribute('class', 'gram-frame-harmonic-label')
    numberLabel.textContent = `${harmonic.number}×`
    this.cursorGroup.appendChild(numberLabel)
    
    // Create frequency label (right side of line)
    const frequencyLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    frequencyLabel.setAttribute('x', String(harmonic.svgX + 5))
    frequencyLabel.setAttribute('y', String(labelY))
    frequencyLabel.setAttribute('text-anchor', 'start')
    frequencyLabel.setAttribute('class', 'gram-frame-harmonic-label')
    frequencyLabel.textContent = `${Math.round(harmonic.frequency)} Hz`
    this.cursorGroup.appendChild(frequencyLabel)
  }
  
  /**
   * Draw Doppler mode indicators
   */
  _drawDopplerMode() {
    // Draw normal crosshairs for current cursor position
    if (this.state.cursorPosition) {
      this._drawAnalysisMode()
    }
    
    // Draw start point marker if set
    if (this.state.doppler.startPoint) {
      this._drawDopplerPoint(this.state.doppler.startPoint, 'start')
    }
    
    // Draw end point marker and line if both points are set
    if (this.state.doppler.endPoint) {
      this._drawDopplerPoint(this.state.doppler.endPoint, 'end')
      this._drawDopplerLine()
    }
  }
  
  /**
   * Draw a Doppler measurement point
   * @param {DopplerPoint} point - Point data
   * @param {'start'|'end'} type - Point type
   */
  _drawDopplerPoint(point, type) {
    const margins = this.state.axes.margins
    
    // Convert data coordinates to SVG coordinates
    const dataCoords = this._dataToSVGCoordinates(point.freq, point.time)
    const svgX = margins.left + dataCoords.x
    const svgY = margins.top + dataCoords.y
    
    // Draw point marker
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    marker.setAttribute('cx', String(svgX))
    marker.setAttribute('cy', String(svgY))
    marker.setAttribute('r', '5')
    marker.setAttribute('class', `gram-frame-doppler-${type}-point`)
    this.cursorGroup.appendChild(marker)
    
    // Draw point label
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    label.setAttribute('x', String(svgX + 8))
    label.setAttribute('y', String(svgY - 8))
    label.setAttribute('class', 'gram-frame-doppler-label')
    label.textContent = type === 'start' ? '1' : '2'
    this.cursorGroup.appendChild(label)
  }
  
  /**
   * Draw line between Doppler measurement points
   */
  _drawDopplerLine() {
    if (!this.state.doppler.startPoint || !this.state.doppler.endPoint) {
      return
    }
    
    const margins = this.state.axes.margins
    
    // Convert data coordinates to SVG coordinates
    const startCoords = this._dataToSVGCoordinates(this.state.doppler.startPoint.freq, this.state.doppler.startPoint.time)
    const endCoords = this._dataToSVGCoordinates(this.state.doppler.endPoint.freq, this.state.doppler.endPoint.time)
    
    const startX = margins.left + startCoords.x
    const startY = margins.top + startCoords.y
    const endX = margins.left + endCoords.x
    const endY = margins.top + endCoords.y
    
    // Draw shadow line for visibility
    const shadowLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    shadowLine.setAttribute('x1', String(startX))
    shadowLine.setAttribute('y1', String(startY))
    shadowLine.setAttribute('x2', String(endX))
    shadowLine.setAttribute('y2', String(endY))
    shadowLine.setAttribute('stroke-width', '4')
    shadowLine.setAttribute('class', 'gram-frame-doppler-line-shadow')
    this.cursorGroup.appendChild(shadowLine)
    
    // Draw main line
    const mainLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    mainLine.setAttribute('x1', String(startX))
    mainLine.setAttribute('y1', String(startY))
    mainLine.setAttribute('x2', String(endX))
    mainLine.setAttribute('y2', String(endY))
    mainLine.setAttribute('stroke-width', '2')
    mainLine.setAttribute('class', 'gram-frame-doppler-line')
    this.cursorGroup.appendChild(mainLine)
  }
  
  /**
   * Capitalize first letter of a string
   * @param {string} string - Input string
   * @returns {string} Capitalized string
   */
  _capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1)
  }
  
  /**
   * Extract configuration data from the config table
   */
  _extractConfigData() {
    if (!this.configTable) {
      console.warn('GramFrame: No config table provided for configuration extraction')
      return
    }
    
    try {
      // Get image URL from the first row
      const imgElement = this.configTable.querySelector('img')
      if (!imgElement) {
        throw new Error('No image element found in config table')
      }
      
      if (!imgElement.src) {
        throw new Error('Image element has no src attribute')
      }
      
      this.state.imageDetails.url = imgElement.src
      console.log('GramFrame: Found image URL:', imgElement.src)
      
      // We'll get actual dimensions when the image loads
      this.spectrogramImage = new Image()
      
      this.spectrogramImage.onerror = () => {
        console.error('GramFrame: Failed to load spectrogram image:', imgElement.src)
        // Set error state but don't throw - allow component to continue
        this.state.imageDetails.url = ''
      }
      
      this.spectrogramImage.onload = () => {
        try {
          // Store original image dimensions in imageDetails
          if (this.spectrogramImage) {
            this.state.imageDetails.naturalWidth = this.spectrogramImage.naturalWidth
            this.state.imageDetails.naturalHeight = this.spectrogramImage.naturalHeight
            
            console.log('GramFrame: Image loaded successfully', {
              url: imgElement.src,
              dimensions: `${this.spectrogramImage.naturalWidth}x${this.spectrogramImage.naturalHeight}`
            })
          
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
          this.svg.setAttribute('width', String(initialWidth))
          this.svg.setAttribute('height', String(initialHeight))
          
          // Position image directly in SVG coordinate space (no mainGroup translation)
          this.mainGroup.setAttribute('transform', '')
          
            // Set the image source in SVG - position it in the margin area
            this.svgImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imgElement.src)
            this.svgImage.setAttribute('width', String(this.spectrogramImage.naturalWidth))
            this.svgImage.setAttribute('height', String(this.spectrogramImage.naturalHeight))
          this.svgImage.setAttribute('x', String(margins.left))
          this.svgImage.setAttribute('y', String(margins.top))
          
            
            // Draw initial axes
            this._drawAxes()
            
            // Notify listeners of updated state
            this._notifyStateListeners()
          }
        } catch (error) {
          console.error('GramFrame: Error during image setup:', error)
        }
      }
      this.spectrogramImage.src = imgElement.src
    } catch (error) {
      console.error('GramFrame: Error setting up image:', error.message)
    }
    
    // Extract min/max values from the table rows with error handling
    try {
      const rows = this.configTable.querySelectorAll('tr')
      let foundTimeConfig = false
      let foundFreqConfig = false
      
      rows.forEach((row, index) => {
        try {
          const cells = row.querySelectorAll('td')
          if (cells.length >= 3) {
            const param = cells[0].textContent?.trim() || ''
            const minText = cells[1].textContent?.trim() || '0'
            const maxText = cells[2].textContent?.trim() || '0'
            
            const min = parseFloat(minText)
            const max = parseFloat(maxText)
            
            if (isNaN(min) || isNaN(max)) {
              console.warn(`GramFrame: Invalid numeric values in row ${index + 1}: min="${minText}", max="${maxText}"`)
              return
            }
            
            if (min >= max) {
              console.warn(`GramFrame: Invalid range in row ${index + 1}: min (${min}) >= max (${max})`)
              return
            }
            
            if (param === 'time') {
              this.state.config.timeMin = min
              this.state.config.timeMax = max
              foundTimeConfig = true
              console.log(`GramFrame [${this.instanceId}]: Time range configured: ${min}s to ${max}s`)
            } else if (param === 'freq') {
              this.state.config.freqMin = min
              this.state.config.freqMax = max
              foundFreqConfig = true
              console.log(`GramFrame [${this.instanceId}]: Frequency range configured: ${min}Hz to ${max}Hz`)
            }
          }
        } catch (error) {
          console.warn(`GramFrame: Error parsing row ${index + 1}:`, error.message)
        }
      })
      
      // Validate that we found required configuration
      if (!foundTimeConfig) {
        console.warn('GramFrame: No valid time configuration found, using defaults (0-60s)')
        this.state.config.timeMin = 0
        this.state.config.timeMax = 60
      }
      
      if (!foundFreqConfig) {
        console.warn('GramFrame: No valid frequency configuration found, using defaults (0-100Hz)')
        this.state.config.freqMin = 0
        this.state.config.freqMax = 100
      }
      
    } catch (error) {
      console.error('GramFrame: Error extracting configuration data:', error.message)
      // Set safe defaults
      this.state.config = {
        timeMin: 0,
        timeMax: 60,
        freqMin: 0,
        freqMax: 100
      }
    }
  }
  
  
  /**
   * Notify all registered state listeners of state changes
   */
  _notifyStateListeners() {
    // Log state changes to console for Task 1.4
    console.log('GramFrame State Updated:', JSON.stringify(this.state, null, 2))
    
    // Create a deep copy of the state to prevent direct modification
    const stateCopy = JSON.parse(JSON.stringify(this.state))
    
    // Notify all registered state listeners for this instance
    this.stateListeners.forEach(listener => {
      try {
        listener(stateCopy)
      } catch (error) {
        console.error('Error in state listener:', error)
      }
    })
  }
}

/**
 * Public API for GramFrame component
 * @type {Object}
 */
const GramFrameAPI = {
  /**
   * Initialize all config tables on the page
   * @returns {GramFrame[]} Array of GramFrame instances
   */
  init() {
    return this.detectAndReplaceConfigTables()
  },
  
  /**
   * Detect and replace all config tables with interactive GramFrame components
   * @param {Document|HTMLElement} [container=document] - Container to search within
   * @returns {GramFrame[]} Array of GramFrame instances created
   */
  detectAndReplaceConfigTables(container = document) {
    const configTables = container.querySelectorAll('table.spectro-config')
    /** @type {GramFrame[]} */
    const instances = []
    const errors = []
    
    console.log(`GramFrame: Found ${configTables.length} config tables to process`)
    
    configTables.forEach((table, index) => {
      try {
        // Generate unique ID for each component instance
        const instanceId = `gramframe-${Date.now()}-${index}`
        
        // Log table detection
        console.log(`GramFrame: Processing table ${index + 1}/${configTables.length}`, {
          id: table.id || instanceId,
          position: table.getBoundingClientRect(),
          hasImage: !!table.querySelector('img')
        })
        
        // Validate table structure before processing
        const validationResult = this._validateConfigTable(table)
        if (!validationResult.isValid) {
          throw new Error(`Invalid config table structure: ${validationResult.errors.join(', ')}`)
        }
        
        // Debug: Log table details before creating instance
        console.log(`GramFrame: About to create instance for table ${index + 1}:`, {
          tableIndex: index,
          imgSrc: table.querySelector('img')?.src,
          tableCells: Array.from(table.querySelectorAll('td')).map(td => td.textContent?.trim()),
          tableHTML: table.outerHTML.substring(0, 300)
        })
        
        // Create GramFrame instance
        const instance = new GramFrame(/** @type {HTMLTableElement} */ (table))
        
        // Store instance ID for debugging and API access
        instance.instanceId = instanceId
        instance.state.metadata = {
          ...instance.state.metadata,
          instanceId: instanceId
        }
        
        console.log(`GramFrame: Successfully created instance [${instanceId}] with config:`, {
          timeRange: `${instance.state.config.timeMin}-${instance.state.config.timeMax}s`,
          freqRange: `${instance.state.config.freqMin}-${instance.state.config.freqMax}Hz`,
          imageUrl: instance.state.imageDetails.url
        })
        
        instances.push(instance)
        
        console.log(`GramFrame: Successfully created instance ${instanceId}`)
        
      } catch (error) {
        const errorMsg = `Failed to initialize GramFrame for table ${index + 1}: ${error.message}`
        console.error('GramFrame Error:', errorMsg, error)
        errors.push({ table, error: errorMsg, index })
        
        // Add error indicator to the table (don't replace it)
        this._addErrorIndicator(table, errorMsg)
      }
    })
    
    // Log summary
    if (instances.length > 0) {
      console.log(`GramFrame: Successfully initialized ${instances.length} component${instances.length === 1 ? '' : 's'}`)
    }
    
    if (errors.length > 0) {
      console.warn(`GramFrame: ${errors.length} error${errors.length === 1 ? '' : 's'} encountered during initialization`, errors)
    }
    
    // Store instances for global access
    this._instances = instances
    
    return instances
  },
  
  /**
   * Initialize a specific config table manually
   * @param {HTMLTableElement|string} tableOrSelector - Table element or CSS selector
   * @returns {GramFrame|null} GramFrame instance or null if failed
   */
  initializeTable(tableOrSelector) {
    try {
      let table
      
      if (typeof tableOrSelector === 'string') {
        table = document.querySelector(tableOrSelector)
        if (!table) {
          throw new Error(`Table not found with selector: ${tableOrSelector}`)
        }
      } else {
        table = tableOrSelector
      }
      
      if (!(table instanceof HTMLTableElement)) {
        throw new Error('Provided element is not a table')
      }
      
      // Check if table has the correct class
      if (!table.classList.contains('spectro-config')) {
        console.warn('GramFrame: Table does not have "spectro-config" class, adding it')
        table.classList.add('spectro-config')
      }
      
      // Validate table structure
      const validationResult = this._validateConfigTable(table)
      if (!validationResult.isValid) {
        throw new Error(`Invalid config table structure: ${validationResult.errors.join(', ')}`)
      }
      
      // Create instance
      const instance = new GramFrame(table)
      instance.instanceId = `gramframe-manual-${Date.now()}`
      
      // Add to instances array
      if (!this._instances) {
        this._instances = []
      }
      this._instances.push(instance)
      
      console.log(`GramFrame: Manually initialized instance ${instance.instanceId}`)
      
      return instance
      
    } catch (error) {
      console.error('GramFrame: Manual initialization failed:', error.message, error)
      return null
    }
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
  /**
   * Add a state listener that will be called whenever the component state changes
   * @param {StateListener} callback - Function to be called with the current state
   * @returns {StateListener} Returns the callback function for chaining
   */
  addStateListener(callback) {
    if (typeof callback !== 'function') {
      throw new Error('State listener must be a function')
    }
    
    // Add to global registry for future instances
    if (!globalStateListeners.includes(callback)) {
      globalStateListeners.push(callback)
    }
    
    // Add the listener to all existing instances
    const instances = document.querySelectorAll('.gram-frame-container')
    instances.forEach(container => {
      // @ts-ignore - Custom property on DOM element
      const instance = container.__gramFrameInstance
      if (instance && !instance.stateListeners.includes(callback)) {
        instance.stateListeners.push(callback)
        
        // Immediately call the listener with the current state
        if (instance.state) {
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
    })
    
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
  /**
   * Remove a previously added state listener
   * @param {StateListener} callback - The callback function to remove
   * @returns {boolean} Returns true if the listener was found and removed, false otherwise
   */
  removeStateListener(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function')
    }
    
    let removed = false
    
    // Remove from global registry
    const globalIndex = globalStateListeners.indexOf(callback)
    if (globalIndex !== -1) {
      globalStateListeners.splice(globalIndex, 1)
      removed = true
    }
    
    // Remove the listener from all instances
    const instances = document.querySelectorAll('.gram-frame-container')
    instances.forEach(container => {
      // @ts-ignore - Custom property on DOM element
      const instance = container.__gramFrameInstance
      if (instance) {
        const index = instance.stateListeners.indexOf(callback)
        if (index !== -1) {
          instance.stateListeners.splice(index, 1)
          removed = true
        }
      }
    })
    return removed
  },
  
  /**
   * Toggle canvas bounds overlay (future implementation)
   */
  toggleCanvasBoundsOverlay() {
    // This will be implemented in Phase 5
    console.log('Toggle canvas bounds overlay')
  },
  
  /**
   * Set debug grid visibility (future implementation)
   * @param {boolean} visible - Whether to show the debug grid
   */
  setDebugGrid(visible) {
    // This will be implemented in Phase 5
    console.log('Set debug grid visibility:', visible)
  },
  
  /**
   * Force update of the component state
   */
  forceUpdate() {
    // Trigger state update on all GramFrame instances
    const instances = document.querySelectorAll('.gram-frame-container')
    instances.forEach(container => {
      // @ts-ignore - Custom property on DOM element
      const instance = container.__gramFrameInstance
      if (instance) {
        // Trigger a state update by calling _notifyStateListeners
        instance._notifyStateListeners()
      }
    })
  },
  
  /**
   * Get all active GramFrame instances
   * @returns {GramFrame[]} Array of active instances
   */
  getInstances() {
    return this._instances || []
  },
  
  /**
   * Get instance by ID
   * @param {string} instanceId - Instance ID to find
   * @returns {GramFrame|null} Instance or null if not found
   */
  getInstance(instanceId) {
    if (!this._instances) return null
    return this._instances.find(instance => instance.instanceId === instanceId) || null
  },
  
  /**
   * Validate config table structure
   * @private
   * @param {HTMLTableElement} table - Table to validate
   * @returns {{isValid: boolean, errors: string[]}} Validation result
   */
  _validateConfigTable(table) {
    const errors = []
    
    // Check if table exists
    if (!table) {
      errors.push('Table element is null or undefined')
      return { isValid: false, errors }
    }
    
    // Check if it's actually a table
    if (!(table instanceof HTMLTableElement)) {
      errors.push('Element is not a table')
      return { isValid: false, errors }
    }
    
    // Check for image
    const imgElement = table.querySelector('img')
    if (!imgElement) {
      errors.push('No image found in table')
    } else if (!imgElement.src) {
      errors.push('Image has no src attribute')
    }
    
    // Check for parameter rows
    const rows = table.querySelectorAll('tr')
    let hasTimeRow = false
    let hasFreqRow = false
    
    rows.forEach(row => {
      const cells = row.querySelectorAll('td')
      if (cells.length >= 3) {
        const param = cells[0].textContent?.trim().toLowerCase()
        const min = cells[1].textContent?.trim()
        const max = cells[2].textContent?.trim()
        
        if (param === 'time') {
          hasTimeRow = true
          if (isNaN(parseFloat(min)) || isNaN(parseFloat(max))) {
            errors.push('Time row has invalid numeric values')
          }
        } else if (param === 'freq') {
          hasFreqRow = true
          if (isNaN(parseFloat(min)) || isNaN(parseFloat(max))) {
            errors.push('Frequency row has invalid numeric values')
          }
        }
      }
    })
    
    if (!hasTimeRow) {
      errors.push('Missing time parameter row')
    }
    
    if (!hasFreqRow) {
      errors.push('Missing frequency parameter row')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  },
  
  /**
   * Add error indicator to a table that failed to initialize
   * @private
   * @param {HTMLTableElement} table - Table that failed
   * @param {string} errorMsg - Error message to display
   */
  _addErrorIndicator(table, errorMsg) {
    try {
      // Create error overlay
      const errorDiv = document.createElement('div')
      errorDiv.className = 'gramframe-error-indicator'
      errorDiv.style.cssText = `
        position: relative;
        background-color: #ffe6e6;
        border: 2px solid #ff6b6b;
        border-radius: 4px;
        padding: 10px;
        margin: 10px 0;
        color: #d32f2f;
        font-family: monospace;
        font-size: 14px;
      `
      
      errorDiv.innerHTML = `
        <strong>GramFrame Initialization Error:</strong><br>
        ${errorMsg}<br>
        <small>Check the browser console for detailed error information.</small>
      `
      
      // Insert error indicator after the table
      if (table.parentNode) {
        table.parentNode.insertBefore(errorDiv, table.nextSibling)
      }
      
    } catch (e) {
      console.error('GramFrame: Failed to add error indicator:', e)
    }
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // @ts-ignore - Adding to global window object
  window.GramFrame = GramFrameAPI
  GramFrameAPI.init()
  // Connect to state display if we're on the debug page
  const stateDisplay = document.getElementById('state-display')
  if (stateDisplay) {
    GramFrameAPI.addStateListener(/** @param {any} state */ (state) => {
      stateDisplay.textContent = JSON.stringify(state, null, 2)
    })
  }
})

// Export the API
// @ts-ignore - Adding to global window object
window.GramFrame = GramFrameAPI

// Hot Module Replacement (HMR) support for Task 1.4
// @ts-ignore - Vite HMR API
if (import.meta.hot) {
  // @ts-ignore - Vite HMR API
  import.meta.hot.accept(() => {
    console.log('🔄 GramFrame component updated - Hot reloading')
    
    // Store old state listeners before replacing the API
    const oldListeners = [...globalStateListeners]
    
    // Clear existing listeners
    globalStateListeners.length = 0
    
    // Re-initialize the component
    const instances = GramFrameAPI.init()
    
    // Restore state listeners
    oldListeners.forEach(listener => {
      GramFrameAPI.addStateListener(listener)
    })
    
    console.log('✅ GramFrame hot reload complete')
  })
}
