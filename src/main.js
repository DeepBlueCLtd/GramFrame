/**
 * GramFrame - A JavaScript component for interactive spectrogram analysis
 */

/// <reference path="./types.js" />

import { 
  screenToSVGCoordinates,
  imageToDataCoordinates,
  dataToSVGCoordinates
} from './utils/coordinates.js'

import {
  createSVGLine,
  createSVGText,
  calculateLayoutDimensions,
  withMarginOffset
} from './utils/svg.js'


import {
  createInitialState,
  notifyStateListeners,
  addGlobalStateListener,
  removeGlobalStateListener,
  getGlobalStateListeners,
  clearGlobalStateListeners
} from './core/state.js'

import {
  createRateInput,
  updateLEDDisplays,
  createLEDDisplay
} from './components/UIComponents.js'
import { capitalizeFirstLetter } from './utils/calculations.js'

import {
  triggerHarmonicsDisplay
} from './core/analysis.js'

import { extractConfigData } from './core/configuration.js'

import { createGramFrameAPI } from './api/GramFrameAPI.js'

import { ModeFactory } from './modes/ModeFactory.js'

import { 
  drawAxes,
  clearAxes,
  handleResize,
  handleSVGResize
} from './rendering/axes.js'

import {
  updateCursorIndicators
} from './rendering/cursors.js'

import {
  setupEventListeners,
  setupResizeObserver,
  cleanupEventListeners
} from './core/events.js'

import { setupComponentTable } from './components/table.js'


/**
 * GramFrame class - Main component implementation
 */
export class GramFrame {
  /**
   * Creates a new GramFrame instance
   * @param {HTMLTableElement} configTable - Configuration table element to replace
   */
  constructor(configTable) {
    this.state = createInitialState()
    this.configTable = configTable
    
    /**
     * Array of state listener functions for this specific instance
     * @type {StateListener[]}
     */
    this.stateListeners = []
    
    /** @type {string} */
    this.instanceId = ''
    
    /** @type {HTMLImageElement} */
    this.spectrogramImage = null
    
    // Initialize DOM element properties (will be populated by setupComponentTable)
    /** @type {HTMLDivElement} */
    this.container = null
    /** @type {HTMLDivElement} */
    this.readoutPanel = null
    /** @type {HTMLDivElement} */
    this.modeCell = null
    /** @type {HTMLButtonElement} */
    this.manualButton = null
    /** @type {HTMLElement} */
    this.modeLED = null
    /** @type {HTMLElement} */
    this.rateLED = null
    
    // Extract config data from table BEFORE replacing it
    extractConfigData(this)
    
    // Create complete component table structure including DOM and SVG
    setupComponentTable(this, configTable)
    
    // Create global status LEDs (mode and rate - shared across all modes)
    const globalLEDs = this.createGlobalStatusLEDs()
    Object.assign(this, globalLEDs)
    
    // Setup manual harmonic button event listener
    if (this.manualButton) {
      this.manualButton.addEventListener('click', () => {
        // Delegate to current mode (only HarmonicsMode handles this)
        if (this.currentMode && typeof this.currentMode.showManualHarmonicModal === 'function') {
          this.currentMode.showManualHarmonicModal()
        }
      })
    }
    
    // Mode switching UI removed - handled by individual modes
    
    // Append LED readout panel to mode cell
    this.modeCell.appendChild(this.readoutPanel)
    
    // Create rate input
    this.rateInput = createRateInput(this.container, this.state, (rate) => this._setRate(rate))
    
    // Harmonic management panel will be created by HarmonicsMode when activated
    
    // Initialize mode infrastructure
    /** @type {Object<string, import('./modes/BaseMode.js').BaseMode>} */
    this.modes = {}
    /** @type {import('./modes/BaseMode.js').BaseMode} */
    this.currentMode = null
    
    // Initialize all modes using factory
    const availableModes = ModeFactory.getAvailableModes()
    availableModes.forEach(modeName => {
      this.modes[modeName] = ModeFactory.createMode(modeName, this, this.state)
    })
    
    // Set initial mode (analysis by default)
    this.currentMode = this.modes['analysis']
    this.currentMode.createUI(this.readoutPanel)
    
    // Guidance panel removed - handled by individual modes
    
    // Apply any globally registered listeners to this new instance
    getGlobalStateListeners().forEach(listener => {
      if (!this.stateListeners.includes(listener)) {
        this.stateListeners.push(listener)
      }
    })
    
    // Setup event listeners
    setupEventListeners(this)
    
    // Setup ResizeObserver for responsive behavior
    setupResizeObserver(this)
    
    // Notify listeners of initial state
    notifyStateListeners(this.state, this.stateListeners)
  }
  
  /**
   * Creates LED display elements for showing measurement values
   */
  

  
  
  
  
  /**
   * Destroy the component and clean up resources
   */
  destroy() {
    cleanupEventListeners(this)
    
    // Remove from DOM if still attached
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
    }
  }
  
  
  
  
  
  
  /**
   * Draw axes with tick marks and labels
   */
  
  /**
   * Switch between analysis modes
   * @param {ModeType} mode - Target mode
   */
  _switchMode(mode) {
    // Update state
    this.state.mode = mode
    
    // Clear drag state when switching modes
    this.state.dragState.isDragging = false
    this.state.dragState.dragStartPosition = null
    this.state.dragState.draggedHarmonicSetId = null
    this.state.dragState.originalSpacing = null
    this.state.dragState.originalAnchorTime = null
    this.state.dragState.clickedHarmonicNumber = null
    
    // Mode button UI removed - handled by individual modes
    
    // Update container class for mode-specific styling
    if (this.container) {
      // Remove all mode classes
      this.container.classList.remove('gram-frame-analysis-mode', 'gram-frame-harmonics-mode')
      // Add current mode class
      this.container.classList.add(`gram-frame-${mode}-mode`)
    }
    
    // Switch to new mode instance and activate it (all modes now use polymorphic pattern)
    if (this.currentMode) {
      this.currentMode.cleanup()
      this.currentMode.destroyUI()
      this.currentMode.deactivate()
    }
    this.currentMode = this.modes[mode]
    this.currentMode.createUI(this.readoutPanel)
    this.currentMode.activate()
    
    // Guidance panel removed - handled by individual modes
    
    // Update LED display visibility
    this.currentMode.updateLEDs()
    
    // Update LED display values
    updateLEDDisplays(this, this.state)
    
    // Update global status LEDs
    if (this.modeLED) {
      this.modeLED.querySelector('.gram-frame-led-value').textContent = capitalizeFirstLetter(mode)
    }
    
    // Clear existing cursor indicators and redraw for new mode
    updateCursorIndicators(this)
    
    // Notify listeners
    notifyStateListeners(this.state, this.stateListeners)
  }

  /**
   * Create global status LEDs (mode and rate displays)
   * @returns {Object} Object containing global LED element references
   */
  createGlobalStatusLEDs() {
    const globalLEDs = {}
    
    // Create Mode LED display (hidden by default, shown by tests)
    globalLEDs.modeLED = createLEDDisplay('Mode', capitalizeFirstLetter(this.state.mode))
    globalLEDs.modeLED.style.display = 'none'
    this.readoutPanel.appendChild(globalLEDs.modeLED)
    
    // Create Rate LED display (hidden by default)
    globalLEDs.rateLED = createLEDDisplay('Rate (Hz/s)', `${this.state.rate}`)
    globalLEDs.rateLED.style.display = 'none'
    this.readoutPanel.appendChild(globalLEDs.rateLED)
    
    return globalLEDs
  }
  
  /**
   * Set the rate value for frequency calculations
   * @param {number} rate - Rate value in Hz/s
   */
  _setRate(rate) {
    // Update state
    this.state.rate = rate
    
    // Update rate LED display (handled by updateLEDDisplays)
    
    
    // Notify listeners
    notifyStateListeners(this.state, this.stateListeners)
  }

  // Harmonic set management methods moved to HarmonicsMode class

  // Manual harmonic modal method moved to HarmonicsMode class

  // Harmonic set removal method moved to HarmonicsMode class

  // Harmonic set frequency search method moved to HarmonicsMode class
  
  // Doppler reset method moved to DopplerMode class
  
  /**
   * Update cursor visual indicators based on current mode and state
   */
  
  
}

// Create and setup the GramFrame API
const GramFrameAPI = createGramFrameAPI(GramFrame)

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
    const oldListeners = getGlobalStateListeners()
    
    // Clear existing listeners
    clearGlobalStateListeners()
    
    // Re-initialize the component
    const instances = GramFrameAPI.init()
    
    // Restore state listeners
    oldListeners.forEach(listener => {
      GramFrameAPI.addStateListener(listener)
    })
    
    console.log('✅ GramFrame hot reload complete')
  })
}
