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
  createLEDDisplays,
  updateDisplayVisibility,
  createModeSwitchingUI,
  createRateInput,
  updateLEDDisplays,
  updateGuidanceContent
} from './components/UIComponents.js'

import {
  calculateDopplerMeasurements,
  triggerHarmonicsDisplay
} from './core/analysis.js'

import { extractConfigData } from './core/configuration.js'

import { createGramFrameAPI } from './api/GramFrameAPI.js'

import { 
  drawAxes,
  clearAxes,
  handleResize,
  handleSVGResize
} from './rendering/axes.js'

import {
  updateCursorIndicators,
  drawAnalysisMode,
  drawHarmonicsMode,
  drawDopplerMode
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
    
    // Extract config data from table BEFORE replacing it
    extractConfigData(this)
    
    // Create complete component table structure including DOM and SVG
    setupComponentTable(this, configTable)
    
    // Create initial LED displays
    const ledElements = createLEDDisplays(this.readoutPanel, this.state)
    Object.assign(this, ledElements)
    
    // Create mode switching UI
    const modeUI = createModeSwitchingUI(this.modeCell, this.state, (mode) => this._switchMode(mode))
    this.modesContainer = modeUI.modesContainer
    this.modeButtons = modeUI.modeButtons
    this.guidancePanel = modeUI.guidancePanel
    
    // Create rate input
    this.rateInput = createRateInput(this.container, this.state, (rate) => this._setRate(rate))
    
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
   * @param {'analysis'|'harmonics'|'doppler'} mode - Target mode
   */
  _switchMode(mode) {
    // Update state
    this.state.mode = mode
    
    // Clear harmonics state when switching away from harmonics mode
    if (mode !== 'harmonics') {
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
    updateCursorIndicators(this)
    
    // Update LED display
    updateLEDDisplays(this, this.state)
    
    // Update display visibility based on new mode
    updateDisplayVisibility(this, this.state.mode)
    
    // Update guidance panel content
    if (this.guidancePanel) {
      updateGuidanceContent(this.guidancePanel, mode)
    }
    
    // Notify listeners
    notifyStateListeners(this.state, this.stateListeners)
  }
  
  /**
   * Set the rate value for frequency calculations
   * @param {number} rate - Rate value in Hz/s
   */
  _setRate(rate) {
    // Update state
    this.state.rate = rate
    
    // Update rate LED display (handled by updateLEDDisplays)
    
    // If in Doppler mode and we have measurements, recalculate speed with new rate
    if (this.state.mode === 'doppler' && this.state.doppler.startPoint && this.state.doppler.endPoint) {
      calculateDopplerMeasurements(this.state)
      updateLEDDisplays(this, this.state)
    }
    
    // Notify listeners
    notifyStateListeners(this.state, this.stateListeners)
  }
  
  
  
  
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
