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
  updateGuidanceContent,
  createManualHarmonicModal
} from './components/UIComponents.js'

import {
  createHarmonicPanel,
  updateHarmonicPanelContent,
  toggleHarmonicPanelVisibility
} from './components/HarmonicPanel.js'

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
  updateCursorIndicators,
  drawAnalysisMode,
  drawHarmonicsMode
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
    
    // Extract config data from table BEFORE replacing it
    extractConfigData(this)
    
    // Create complete component table structure including DOM and SVG
    setupComponentTable(this, configTable)
    
    // Create initial LED displays
    const ledElements = createLEDDisplays(this.readoutPanel, this.state)
    Object.assign(this, ledElements)
    
    // Setup manual harmonic button event listener
    if (this.manualButton) {
      this.manualButton.addEventListener('click', () => {
        this._showManualHarmonicModal()
      })
    }
    
    // Create mode switching UI
    const modeUI = createModeSwitchingUI(this.modeCell, this.state, (mode) => this._switchMode(mode))
    this.modesContainer = modeUI.modesContainer
    this.modeButtons = modeUI.modeButtons
    this.guidancePanel = modeUI.guidancePanel
    
    // Append LED readout panel to mode cell
    this.modeCell.appendChild(this.readoutPanel)
    
    // Create rate input
    this.rateInput = createRateInput(this.container, this.state, (rate) => this._setRate(rate))
    
    // Create harmonic management panel (add to readout panel)
    this.harmonicPanel = createHarmonicPanel(this.readoutPanel, this)
    
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
      this.state.harmonics.harmonicSets = []
    }
    
    // Clear Doppler state when switching away from Doppler mode
    if (mode !== 'doppler') {
      this.state.doppler.fPlus = null
      this.state.doppler.fMinus = null
      this.state.doppler.fZero = null
      this.state.doppler.speed = null
      this.state.doppler.isDragging = false
      this.state.doppler.draggedMarker = null
      this.state.doppler.isPlacingMarkers = false
      this.state.doppler.markersPlaced = 0
      this.state.doppler.tempFirst = null
      this.state.doppler.isPreviewDrag = false
      this.state.doppler.previewEnd = null
      
      // Speed LED display is now handled by standard LED system
      // No cleanup needed - it will be hidden by updateDisplayVisibility
    }
    
    
    // Clear drag state when switching modes
    this.state.dragState.isDragging = false
    this.state.dragState.dragStartPosition = null
    this.state.dragState.draggedHarmonicSetId = null
    this.state.dragState.originalSpacing = null
    this.state.dragState.originalAnchorTime = null
    this.state.dragState.clickedHarmonicNumber = null
    
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
    
    // Update container class for mode-specific styling
    if (this.container) {
      // Remove all mode classes
      this.container.classList.remove('gram-frame-analysis-mode', 'gram-frame-harmonics-mode')
      // Add current mode class
      this.container.classList.add(`gram-frame-${mode}-mode`)
    }
    
    // Switch to new mode instance and activate it (all modes now use polymorphic pattern)
    if (this.currentMode) {
      this.currentMode.deactivate()
    }
    this.currentMode = this.modes[mode]
    this.currentMode.activate()
    
    // Update guidance panel using mode's guidance text
    if (this.guidancePanel) {
      this.guidancePanel.innerHTML = this.currentMode.getGuidanceText()
    }
    
    // Update LED display visibility
    this.currentMode.updateLEDs()
    
    // Update LED display values
    updateLEDDisplays(this, this.state)
    
    // Clear existing cursor indicators and redraw for new mode
    updateCursorIndicators(this)
    
    // Update harmonic panel visibility and content
    if (this.harmonicPanel) {
      toggleHarmonicPanelVisibility(this.harmonicPanel, mode)
      updateHarmonicPanelContent(this.harmonicPanel, this)
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
    
    
    // Notify listeners
    notifyStateListeners(this.state, this.stateListeners)
  }

  /**
   * Color palette for harmonic sets
   * @type {string[]}
   */
  static harmonicColors = ['#ff6b6b', '#2ecc71', '#f39c12', '#9b59b6', '#ffc93c', '#ff9ff3', '#45b7d1', '#e67e22']

  /**
   * Add a new harmonic set
   * @param {number} anchorTime - Time position in seconds
   * @param {number} spacing - Frequency spacing in Hz
   * @returns {HarmonicSet} The created harmonic set
   */
  _addHarmonicSet(anchorTime, spacing) {
    const id = `harmonic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const colorIndex = this.state.harmonics.harmonicSets.length % GramFrame.harmonicColors.length
    const color = GramFrame.harmonicColors[colorIndex]
    
    const harmonicSet = {
      id,
      color,
      anchorTime,
      spacing
    }
    
    this.state.harmonics.harmonicSets.push(harmonicSet)
    
    // Update display and notify listeners
    updateCursorIndicators(this)
    if (this.harmonicPanel) {
      updateHarmonicPanelContent(this.harmonicPanel, this)
    }
    notifyStateListeners(this.state, this.stateListeners)
    
    return harmonicSet
  }

  /**
   * Show manual harmonic spacing modal dialog
   */
  _showManualHarmonicModal() {
    if (this.state.mode !== 'harmonics') {
      return
    }

    createManualHarmonicModal(
      (spacing) => {
        // Get time anchor: current cursor Y position if available, otherwise midpoint
        let anchorTime
        if (this.state.cursorPosition && this.state.cursorPosition.time !== null) {
          anchorTime = this.state.cursorPosition.time
        } else {
          // Use midpoint of image time range
          anchorTime = (this.state.config.timeMin + this.state.config.timeMax) / 2
        }
        
        // Create the harmonic set
        this._addHarmonicSet(anchorTime, spacing)
      },
      () => {
        // Cancel callback - no action needed
      }
    )
  }

  /**
   * Update an existing harmonic set
   * @param {string} id - Harmonic set ID
   * @param {Partial<HarmonicSet>} updates - Properties to update
   */
  _updateHarmonicSet(id, updates) {
    const setIndex = this.state.harmonics.harmonicSets.findIndex(set => set.id === id)
    if (setIndex !== -1) {
      Object.assign(this.state.harmonics.harmonicSets[setIndex], updates)
      
      // Update display and notify listeners
      updateCursorIndicators(this)
      if (this.harmonicPanel) {
        updateHarmonicPanelContent(this.harmonicPanel, this)
      }
      notifyStateListeners(this.state, this.stateListeners)
    }
  }

  /**
   * Remove a harmonic set
   * @param {string} id - Harmonic set ID
   */
  _removeHarmonicSet(id) {
    const setIndex = this.state.harmonics.harmonicSets.findIndex(set => set.id === id)
    if (setIndex !== -1) {
      this.state.harmonics.harmonicSets.splice(setIndex, 1)
      
      // Update display and notify listeners
      updateCursorIndicators(this)
      if (this.harmonicPanel) {
        updateHarmonicPanelContent(this.harmonicPanel, this)
      }
      notifyStateListeners(this.state, this.stateListeners)
    }
  }

  /**
   * Find harmonic set containing given frequency coordinate
   * @param {number} freq - Frequency in Hz to check
   * @returns {HarmonicSet|null} The harmonic set if found, null otherwise
   */
  _findHarmonicSetAtFrequency(freq) {
    for (const harmonicSet of this.state.harmonics.harmonicSets) {
      // Check if frequency is close to any harmonic line in this set
      if (harmonicSet.spacing > 0) {
        // Only consider harmonics within the visible frequency range
        const freqMin = this.state.config.freqMin
        const freqMax = this.state.config.freqMax
        
        const minHarmonic = Math.max(1, Math.ceil(freqMin / harmonicSet.spacing))
        const maxHarmonic = Math.floor(freqMax / harmonicSet.spacing)
        
        for (let h = minHarmonic; h <= maxHarmonic; h++) {
          const expectedFreq = h * harmonicSet.spacing
          const tolerance = harmonicSet.spacing * 0.02 // 2% tolerance
          
          if (Math.abs(freq - expectedFreq) < tolerance) {
            return harmonicSet
          }
        }
      }
    }
    return null
  }
  
  /**
   * Reset Doppler mode - clear all markers and calculations
   */
  _resetDoppler() {
    this.state.doppler.fPlus = null
    this.state.doppler.fMinus = null
    this.state.doppler.fZero = null
    this.state.doppler.speed = null
    this.state.doppler.isDragging = false
    this.state.doppler.draggedMarker = null
    this.state.doppler.isPlacingMarkers = false
    this.state.doppler.markersPlaced = 0
    this.state.doppler.tempFirst = null
    this.state.doppler.isPreviewDrag = false
    this.state.doppler.previewEnd = null
    
    // Speed LED display is now handled by standard LED system
    // No cleanup needed - it will be hidden by updateDisplayVisibility
    
    // Update displays
    updateCursorIndicators(this)
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
