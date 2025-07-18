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
    
    // Create canvas element for rendering
    this.canvas = document.createElement('canvas')
    this.canvas.className = 'gram-frame-canvas'
    this.container.appendChild(this.canvas)
    
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
    
    // Setup canvas context
    this.ctx = this.canvas.getContext('2d')
    
    // Setup event listeners
    this._setupEventListeners()
    
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
    // Canvas mouse events
    this.canvas.addEventListener('mousemove', this._handleMouseMove.bind(this))
    this.canvas.addEventListener('click', this._handleClick.bind(this))
    
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
    window.addEventListener('resize', this._handleResize.bind(this))
  }
  
  _handleResize() {
    // Only handle resize if we have a valid image
    if (!this.spectrogramImage) return
    
    // Get the current container width
    const containerWidth = this.container.clientWidth
    
    // Calculate new dimensions while maintaining aspect ratio
    const originalWidth = this.spectrogramImage.naturalWidth
    const originalHeight = this.spectrogramImage.naturalHeight
    const aspectRatio = originalWidth / originalHeight
    
    // Set new canvas dimensions
    let newWidth = containerWidth
    let newHeight = containerWidth / aspectRatio
    
    // Update canvas dimensions
    this.canvas.width = newWidth
    this.canvas.height = newHeight
    
    // Update state with new dimensions
    this.state.displayDimensions = {
      width: Math.round(newWidth),
      height: Math.round(newHeight)
    }
    
    // Re-render the image
    this._renderSpectrogramImage()
    
    // Notify listeners
    this._notifyStateListeners()
    
    // Log resize event for debugging
    console.log('GramFrame resized:', this.state.displayDimensions)
  }
  
  _handleMouseMove(event) {
    // Only process if we have valid image dimensions
    if (!this.canvas.width || !this.canvas.height) return
    
    // Get mouse position relative to canvas
    const rect = this.canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    // Calculate time and frequency based on position
    const freq = this._calculateFrequency(x)
    const time = this._calculateTime(y)
    
    // Update cursor position in state with normalized coordinates
    this.state.cursorPosition = { 
      x: Math.round(x), 
      y: Math.round(y), 
      time: parseFloat(time.toFixed(2)), 
      freq: parseFloat(freq.toFixed(2))
    }
    
    // Update LED displays
    this._updateLEDDisplays()
    
    // Notify listeners
    this._notifyStateListeners()
  }
  
  _handleClick(event) {
    // This will be implemented in Phase 3
    console.log('Canvas clicked')
  }
  
  _calculateFrequency(x) {
    // Calculate frequency based on x position
    const { freqMin, freqMax } = this.state.config
    const canvasWidth = this.canvas.width
    
    // Ensure x is within canvas bounds
    const boundedX = Math.max(0, Math.min(x, canvasWidth))
    
    return freqMin + (boundedX / canvasWidth) * (freqMax - freqMin)
  }
  
  _calculateTime(y) {
    // Calculate time based on y position (inverted, as y=0 is top)
    const { timeMin, timeMax } = this.state.config
    const canvasHeight = this.canvas.height
    
    // Ensure y is within canvas bounds
    const boundedY = Math.max(0, Math.min(y, canvasHeight))
    
    return timeMax - (boundedY / canvasHeight) * (timeMax - timeMin)
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
    if (!this.state.cursorPosition) return
    
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
        
        // Calculate initial dimensions based on container size
        const containerWidth = this.container.clientWidth
        const aspectRatio = this.spectrogramImage.naturalWidth / this.spectrogramImage.naturalHeight
        
        // Set initial canvas dimensions
        const initialWidth = containerWidth
        const initialHeight = containerWidth / aspectRatio
        
        // Update the displayDimensions property for diagnostics
        this.state.displayDimensions = {
          width: Math.round(initialWidth),
          height: Math.round(initialHeight)
        }
        
        // Set canvas dimensions
        this.canvas.width = initialWidth
        this.canvas.height = initialHeight
        
        // Render the image on the canvas
        this._renderSpectrogramImage()
        
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
  
  _renderSpectrogramImage() {
    if (!this.ctx || !this.spectrogramImage) return
    
    // Clear the canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    
    // Draw the spectrogram image
    this.ctx.drawImage(this.spectrogramImage, 0, 0, this.canvas.width, this.canvas.height)
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
