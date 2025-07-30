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
  createRateInput,
  updateLEDDisplays,
  createLEDDisplay,
  createModeSwitchingUI
} from './components/UIComponents.js'
import { capitalizeFirstLetter } from './utils/calculations.js'

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

import { setupComponentTable, setupSpectrogramImage, updateSVGLayout, renderAxes } from './components/table.js'

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
    
    // Create mode switching UI
    const modeUI = createModeSwitchingUI(this.modeCell, this.state, (mode) => this._switchMode(mode))
    this.modesContainer = modeUI.modesContainer
    this.modeButtons = modeUI.modeButtons
    this.guidancePanel = modeUI.guidancePanel
    
    // Append LED readout panel to mode cell
    this.modeCell.appendChild(this.readoutPanel)
    
    // Create rate input
    this.rateInput = createRateInput(this.container, this.state, (rate) => this._setRate(rate))
    
    // Create zoom controls
    this.createZoomControls()
    
    // Set up spectrogram image if we have one from config extraction
    if (this.state.imageDetails.url) {
      setupSpectrogramImage(this, this.state.imageDetails.url)
    }
    
    // Harmonic management panel will be created by HarmonicsMode when activated
    
    // Initialize mode infrastructure
    /** @type {Object<string, import('./modes/BaseMode.js').BaseMode>} */
    this.modes = {}
    /** @type {import('./modes/BaseMode.js').BaseMode} */
    this.currentMode = null
    
    // Initialize centralized feature renderer
    this.featureRenderer = new FeatureRenderer(this)
    
    // Initialize all modes using factory
    const availableModes = ModeFactory.getAvailableModes()
    availableModes.forEach(modeName => {
      this.modes[modeName] = ModeFactory.createMode(modeName, this, this.state)
    })
    
    // Set initial mode (analysis by default)
    this.currentMode = this.modes['analysis']
    this.currentMode.createUI(this.readoutPanel)
    
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
    
    // Notify listeners of initial state
    notifyStateListeners(this.state, this.stateListeners)
  }
  
  /**
   * Creates LED display elements for showing measurement values
   */
  

  
  
  
  
  /**
   * Create zoom control UI
   */
  createZoomControls() {
    // Create zoom controls container
    const zoomContainer = document.createElement('div')
    zoomContainer.className = 'gram-frame-zoom-controls'
    
    // Zoom in button
    const zoomInButton = document.createElement('button')
    zoomInButton.className = 'gram-frame-zoom-btn'
    zoomInButton.textContent = '+'
    zoomInButton.title = 'Zoom In'
    zoomInButton.addEventListener('click', () => this._zoomIn())
    
    // Zoom out button
    const zoomOutButton = document.createElement('button')
    zoomOutButton.className = 'gram-frame-zoom-btn'
    zoomOutButton.textContent = '−'
    zoomOutButton.title = 'Zoom Out'
    zoomOutButton.addEventListener('click', () => this._zoomOut())
    
    // Reset zoom button
    const zoomResetButton = document.createElement('button')
    zoomResetButton.className = 'gram-frame-zoom-btn gram-frame-zoom-reset'
    zoomResetButton.textContent = '1:1'
    zoomResetButton.title = 'Reset Zoom'
    zoomResetButton.addEventListener('click', () => this._zoomReset())
    
    zoomContainer.appendChild(zoomInButton)
    zoomContainer.appendChild(zoomOutButton)
    zoomContainer.appendChild(zoomResetButton)
    
    // Add to mode cell (next to other controls)
    this.modeCell.appendChild(zoomContainer)
    
    // Store references
    this.zoomControls = {
      container: zoomContainer,
      zoomInButton,
      zoomOutButton,
      zoomResetButton
    }
  }
  
  /**
   * Zoom in by increasing zoom level
   */
  _zoomIn() {
    const currentLevel = this.state.zoom.level
    const newLevel = Math.min(currentLevel * 1.5, 10.0) // Max 10x zoom
    this._setZoom(newLevel, this.state.zoom.centerX, this.state.zoom.centerY)
  }
  
  /**
   * Zoom out by decreasing zoom level
   */
  _zoomOut() {
    const currentLevel = this.state.zoom.level
    const newLevel = Math.max(currentLevel / 1.5, 1.0) // Min 1x zoom
    this._setZoom(newLevel, this.state.zoom.centerX, this.state.zoom.centerY)
  }
  
  /**
   * Reset zoom to 1x
   */
  _zoomReset() {
    this._setZoom(1.0, 0.5, 0.5)
  }
  
  /**
   * Set zoom level and center point
   * @param {number} level - Zoom level (1.0 = no zoom)
   * @param {number} centerX - Center X (0-1 normalized)
   * @param {number} centerY - Center Y (0-1 normalized)
   */
  _setZoom(level, centerX, centerY) {
    // Update state
    this.state.zoom.level = level
    this.state.zoom.centerX = centerX
    this.state.zoom.centerY = centerY
    
    // Apply zoom transform
    if (this.svg) {
      import('./components/table.js').then(({ applyZoomTransform }) => {
        applyZoomTransform(this)
      })
    }
    
    // Update zoom button states
    if (this.zoomControls) {
      this.zoomControls.zoomInButton.disabled = (level >= 10.0)
      this.zoomControls.zoomOutButton.disabled = (level <= 1.0)
      this.zoomControls.zoomResetButton.disabled = (level === 1.0)
    }
    
    // Notify listeners
    notifyStateListeners(this.state, this.stateListeners)
  }
  
  /**
   * Update axes when rate changes
   */
  _updateAxes() {
    if (this.axesGroup) {
      renderAxes(this)
    }
  }
  
  /**
   * Handle resize events
   */
  _handleResize() {
    if (this.svg) {
      updateSVGLayout(this)
      renderAxes(this)
    }
  }
  
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
      this.currentMode.destroyUI()
      this.currentMode.deactivate()
    }
    this.currentMode = this.modes[mode]
    this.currentMode.createUI(this.readoutPanel)
    this.currentMode.activate()
    
    // Update guidance panel using mode's guidance text
    if (this.guidancePanel) {
      this.guidancePanel.innerHTML = this.currentMode.getGuidanceText()
    }
    
    // Update LED display visibility
    this.currentMode.updateLEDs()
    
    // Update LED display values
    updateLEDDisplays(this, this.state)
    
    // Update global status LEDs
    if (this.modeLED) {
      this.modeLED.querySelector('.gram-frame-led-value').textContent = capitalizeFirstLetter(mode)
    }
    
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
    
    // Color picker is now created by individual modes (harmonics and analysis)
    // to ensure proper labels and mode-specific behavior
    
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
