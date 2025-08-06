/**
 * GramFrame - A JavaScript component for interactive spectrogram analysis
 */

/// <reference path="./types.js" />

import {
  createInitialState,
  notifyStateListeners,
  getGlobalStateListeners,
  clearGlobalStateListeners
} from './core/state.js'

import {
  updateLEDDisplays,
  createModeSwitchingUI
} from './components/UIComponents.js'
import { 
  createUnifiedLayout, 
  updatePersistentPanels 
} from './components/MainUI.js'
import {
  zoomIn,
  zoomOut, 
  zoomReset,
  setZoom,
  updateZoomControlStates,
  handleResize,
  updateAxes
} from './core/viewport.js'
import { getModeDisplayName } from './utils/calculations.js'

import { extractConfigData } from './core/configuration.js'

import { createGramFrameAPI } from './api/GramFrameAPI.js'

import { ModeFactory } from './modes/ModeFactory.js'
import { FeatureRenderer } from './core/FeatureRenderer.js'

// Cursor indicators removed - using CSS cursor only

import {
  setupEventListeners,
  setupResizeObserver,
  cleanupEventListeners
} from './core/events.js'

import {
  initializeKeyboardControl,
  cleanupKeyboardControl,
  setSelection,
  clearSelection,
  updateSelectionVisuals
} from './core/keyboardControl.js'

import { setupComponentTable, setupSpectrogramImage } from './components/table.js'
import { BaseMode } from './modes/BaseMode.js'

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
    
    /** @type {SVGImageElement} */
    this.spectrogramImage = null
    
    // Initialize DOM element properties (will be populated by setupComponentTable)
    /** @type {HTMLDivElement} */
    this.container = null
    /** @type {HTMLDivElement} */
    this.readoutPanel = null
    /** @type {HTMLDivElement} */
    this.modeCell = null
    /** @type {HTMLDivElement} */
    this.mainCell = null
    /** @type {HTMLButtonElement} */
    this.manualButton = null
    /** @type {HTMLElement} */
    this.modeLED = null
    /** @type {HTMLElement} */
    this.rateLED = null
    /** @type {HTMLElement} */
    this.colorPicker = null
    /** @type {SVGSVGElement} */
    this.svg = null
    /** @type {SVGGElement} */
    this.cursorGroup = null
    /** @type {SVGGElement} */
    this.axesGroup = null
    /** @type {SVGRectElement} */
    this.imageClipRect = null
    /** @type {SVGRectElement} */
    this.cursorClipRect = null
    
    // Unified layout containers
    /** @type {HTMLDivElement} */
    this.leftColumn = null
    /** @type {HTMLDivElement} */
    this.middleColumn = null
    /** @type {HTMLDivElement} */
    this.rightColumn = null
    /** @type {HTMLDivElement} */
    this.unifiedLayoutContainer = null
    /** @type {HTMLElement} */
    this.timeLED = null
    /** @type {HTMLElement} */
    this.freqLED = null
    /** @type {HTMLElement} */
    this.speedLED = null
    /** @type {HTMLDivElement} */
    this.markersContainer = null
    /** @type {HTMLDivElement} */
    this.harmonicsContainer = null
    
    // Extract config data from table BEFORE replacing it
    extractConfigData(this)
    
    // Create complete component table structure including DOM and SVG
    setupComponentTable(this, configTable)
    
    // Create unified layout
    createUnifiedLayout(this)
    
    // Create mode switching UI initially (will be updated after modes are initialized)
    const tempContainer = document.createElement('div')
    const modeUI = createModeSwitchingUI(tempContainer, this.state, (mode) => this._switchMode(mode))
    this.modesContainer = modeUI.modesContainer
    this.modeButtons = modeUI.modeButtons
    this.commandButtons = modeUI.commandButtons
    this.guidancePanel = modeUI.guidancePanel
    
    // Add mode UI to appropriate columns
    this.modeColumn.appendChild(this.modesContainer)
    this.guidanceColumn.appendChild(this.guidancePanel)
    
    // Append unified layout to readout panel
    this.readoutPanel.appendChild(this.unifiedLayoutContainer)
    
    // Append readout panel to mode cell
    this.modeCell.appendChild(this.readoutPanel)
    
    // Rate input UI removed - backend functionality preserved for frequency calculations
    this.rateInput = null
    
    // Zoom controls are now integrated into pan mode command buttons
    
    // Set up spectrogram image if we have one from config extraction
    if (this.state.imageDetails.url) {
      setupSpectrogramImage(this, this.state.imageDetails.url)
    }
    
    // Harmonic management panel will be created by HarmonicsMode when activated
    
    // Initialize mode infrastructure
    /** @type {Object<string, BaseMode>} */
    this.modes = {}
    /** @type {BaseMode} */
    this.currentMode = null
    
    // Initialize centralized feature renderer
    this.featureRenderer = new FeatureRenderer(this)
    
    // Initialize all modes using factory
    const availableModes = ModeFactory.getAvailableModes()
    availableModes.forEach(modeName => {
      this.modes[modeName] = ModeFactory.createMode(modeName, this, this.state)
    })
    
    // Initialize all persistent containers with their respective content
    // Analysis markers in middle column (always visible)
    this.modes['analysis'].createUI(this.markersContainer)
    
    // Harmonics sets in right column (always visible)  
    this.modes['harmonics'].createUI(this.harmonicsContainer)
    
    // Set initial mode (analysis by default)
    this.currentMode = this.modes['analysis']
    
    // Recreate mode UI with command buttons now that modes are available
    this.modeColumn.removeChild(this.modesContainer)
    this.guidanceColumn.removeChild(this.guidancePanel)
    
    const tempContainer2 = document.createElement('div')
    const modeUIWithButtons = createModeSwitchingUI(tempContainer2, this.state, (mode) => this._switchMode(mode), this.modes)
    this.modesContainer = modeUIWithButtons.modesContainer
    this.modeButtons = modeUIWithButtons.modeButtons
    this.commandButtons = modeUIWithButtons.commandButtons
    this.guidancePanel = modeUIWithButtons.guidancePanel
    
    // Add updated mode UI back to appropriate columns
    this.modeColumn.appendChild(this.modesContainer)
    this.guidanceColumn.appendChild(this.guidancePanel)
    
    // Initialize guidance panel with analysis mode guidance
    if (this.guidancePanel) {
      this.guidancePanel.innerHTML = this.currentMode.getGuidanceText()
    }
    
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
    
    // Initialize keyboard control for fine positioning
    initializeKeyboardControl(this)
    
    // Store keyboard control functions on instance for easy access
    this.setSelection = (type, id, index) => setSelection(this, type, id, index)
    this.clearSelection = () => clearSelection(this)
    this.updateSelectionVisuals = () => updateSelectionVisuals(this)
    
    // Notify listeners of initial state
    notifyStateListeners(this.state, this.stateListeners)
  }
  
  /**
   * Creates LED display elements for showing measurement values
   */
  

  
  
  
  
  
  
  
  // Zoom controls removed - now handled by pan mode command buttons
  
  /**
   * Zoom in by increasing zoom level
   */
  _zoomIn() {
    zoomIn(this)
  }
  
  /**
   * Zoom out by decreasing zoom level
   */
  _zoomOut() {
    zoomOut(this)
  }
  
  /**
   * Reset zoom to 1x
   */
  _zoomReset() {
    zoomReset(this)
  }
  
  
  /**
   * Set zoom level and center point
   * @param {number} level - Zoom level (1.0 = no zoom)
   * @param {number} centerX - Center X (0-1 normalized)
   * @param {number} centerY - Center Y (0-1 normalized)
   */
  _setZoom(level, centerX, centerY) {
    setZoom(this, level, centerX, centerY)
  }
  
  
  /**
   * Update zoom control button states based on current zoom level
   */
  _updateZoomControlStates() {
    updateZoomControlStates(this)
  }
  
  /**
   * Update axes when rate changes
   */
  _updateAxes() {
    updateAxes(this)
  }
  
  /**
   * Handle resize events
   */
  _handleResize() {
    handleResize(this)
  }
  
  /**
   * Destroy the component and clean up resources
   */
  destroy() {
    cleanupEventListeners(this)
    cleanupKeyboardControl(this)
    
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
    // Prevent switching to pan mode when not zoomed
    if (mode === 'pan' && this.state.zoom.level <= 1.0) {
      console.warn('Cannot switch to pan mode when zoom level is 1:1 or less')
      return
    }
    
    // Track previous mode
    this.state.previousMode = this.state.mode
    
    // Update state
    this.state.mode = mode
    
    // Clear drag state when switching modes
    this.state.dragState.isDragging = false
    this.state.dragState.dragStartPosition = null
    this.state.dragState.draggedHarmonicSetId = null
    this.state.dragState.originalSpacing = null
    this.state.dragState.originalAnchorTime = null
    this.state.dragState.clickedHarmonicNumber = null
    
    // Cursor styling removed - no display element
    
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

      this.currentMode.cleanup()
      this.currentMode.deactivate()

    }
    this.currentMode = this.modes[mode]
    
    // The unified layout containers should always display their content
    // No need to clear/recreate UI since all tables should be persistent
    
    this.currentMode.activate()
    
    // Update guidance panel using mode's guidance text
    if (this.guidancePanel) {
      this.guidancePanel.innerHTML = this.currentMode.getGuidanceText()
    }
    
    // Update LED display visibility
    this.currentMode.updateLEDs(this.state.cursorPosition)
    
    // Update LED display values
    updateLEDDisplays(this, this.state)
    
    // Update global status LEDs
    if (this.modeLED) {
      this.modeLED.querySelector('.gram-frame-led-value').textContent = getModeDisplayName(mode)
    }
    
    // Update persistent panels regardless of active mode
    updatePersistentPanels(this)
    
    // Update cursor indicators
    if (this.featureRenderer) {
      this.featureRenderer.renderAllPersistentFeatures()
    }
    
    // Cursor indicators removed - using CSS cursor only
    
    // CSS now handles cursor behavior properly, no need for explicit reset
    
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
    
    // Update axes to reflect rate change
    this._updateAxes()
    
    // Notify listeners
    notifyStateListeners(this.state, this.stateListeners)
  }

  // Zoom functionality removed - no display element

  
  
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
    
    // Store old state listeners before replacing the API
    const oldListeners = getGlobalStateListeners()
    
    // Clear existing listeners
    clearGlobalStateListeners()
    
    // Re-initialize the component
    GramFrameAPI.init()
    
    // Restore state listeners
    oldListeners.forEach(listener => {
      GramFrameAPI.addStateListener(listener)
    })
    
  })
}
