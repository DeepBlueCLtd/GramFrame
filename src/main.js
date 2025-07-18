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
    width: 0,
    height: 0
  },
  config: {
    timeMin: 0,
    timeMax: 0,
    freqMin: 0,
    freqMax: 0
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
    
    // Add Hello World message for Task 1.3
    const helloWorld = document.createElement('div')
    helloWorld.className = 'gram-frame-hello-world'
    helloWorld.textContent = 'Hello World from GramFrame!'
    this.container.appendChild(helloWorld)
    
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
  }
  
  _handleMouseMove(event) {
    // Get mouse position relative to canvas
    const rect = this.canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    // Calculate time and frequency based on position
    const freq = this._calculateFrequency(x)
    const time = this._calculateTime(y)
    
    // Update cursor position in state
    this.state.cursorPosition = { x, y, time, freq }
    
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
    
    return freqMin + (x / canvasWidth) * (freqMax - freqMin)
  }
  
  _calculateTime(y) {
    // Calculate time based on y position (inverted, as y=0 is top)
    const { timeMin, timeMax } = this.state.config
    const canvasHeight = this.canvas.height
    
    return timeMax - (y / canvasHeight) * (timeMax - timeMin)
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
        // Update state with image dimensions
        this.state.imageDetails.width = this.spectrogramImage.width
        this.state.imageDetails.height = this.spectrogramImage.height
        
        // Set canvas dimensions to match the image
        this.canvas.width = this.spectrogramImage.width
        this.canvas.height = this.spectrogramImage.height
        
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
  
  // Add a state listener
  addStateListener(callback) {
    if (typeof callback === 'function' && !stateListeners.includes(callback)) {
      stateListeners.push(callback)
    }
  },
  
  // Remove a state listener
  removeStateListener(callback) {
    const index = stateListeners.indexOf(callback)
    if (index !== -1) {
      stateListeners.splice(index, 1)
    }
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
    // This will be implemented in Phase 3
    console.log('Force update')
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
