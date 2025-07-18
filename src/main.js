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
    this.container.innerHTML = '<div class="gram-frame-message">GramFrame initialized</div>'
    
    // Replace the table with our container
    if (configTable && configTable.parentNode) {
      configTable.parentNode.replaceChild(this.container, configTable)
    }
    
    // Extract config data from table
    this._extractConfigData()
    
    // Notify listeners of initial state
    this._notifyStateListeners()
  }
  
  _extractConfigData() {
    if (!this.configTable) return
    
    // Get image URL from the first row
    const imgElement = this.configTable.querySelector('img')
    if (imgElement) {
      this.state.imageDetails.url = imgElement.src
      
      // We'll get actual dimensions when the image loads
      const img = new Image()
      img.onload = () => {
        this.state.imageDetails.width = img.width
        this.state.imageDetails.height = img.height
        this._notifyStateListeners()
      }
      img.src = imgElement.src
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
    // Create a deep copy of the state to prevent direct modification
    const stateCopy = JSON.parse(JSON.stringify(this.state))
    
    // Notify all registered listeners
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
  }
}

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize component
  const instances = GramFrameAPI.init()
  
  // Add a message to confirm the component loaded
  const div = document.createElement('div')
  div.textContent = `Hello World from GramFrame! Initialized ${instances.length} instance(s).`
  div.style = 'margin: 2em; padding: 1em; background: #eef;'
  document.body.appendChild(div)
  
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
