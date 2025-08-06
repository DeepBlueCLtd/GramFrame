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
  createLEDDisplay,
  createModeSwitchingUI,
  createFullFlexLayout,
  createFlexColumn,
  createColorPicker
} from './components/UIComponents.js'
import { updateCommandButtonStates, updateModeButtonStates } from './components/ModeButtons.js'
import { getModeDisplayName } from './utils/calculations.js'
import { formatTime } from './utils/timeFormatter.js'

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
    this.createUnifiedLayout()
    
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
  

  
  
  
  
  /**
   * Create unified 3-column layout for readouts
   */
  createUnifiedLayout() {
    // Create main container for unified layout
    /** @type {HTMLDivElement} */
    this.unifiedLayoutContainer = /** @type {HTMLDivElement} */ (createFullFlexLayout('gram-frame-unified-layout', '2px'))
    this.unifiedLayoutContainer.style.flexDirection = 'row'
    this.unifiedLayoutContainer.style.flexWrap = 'nowrap'
    
    // Left Panel (450px) - Multi-column horizontal layout
    this.leftColumn = /** @type {HTMLDivElement} */ (createFullFlexLayout('gram-frame-left-column', '4px'))
    this.leftColumn.style.flex = '0 0 450px'
    this.leftColumn.style.width = '450px'
    this.leftColumn.style.flexDirection = 'row'
    
    // Column 1: Mode buttons 
    this.modeColumn = /** @type {HTMLDivElement} */ (createFlexColumn('gram-frame-mode-column', '8px'))
    this.modeColumn.style.flex = '0 0 130px'
    this.modeColumn.style.width = '130px'
    
    // Column 2: Guidance panel  
    this.guidanceColumn = /** @type {HTMLDivElement} */ (createFlexColumn('gram-frame-guidance-column', '8px'))
    this.guidanceColumn.style.flex = '1'
    this.guidanceColumn.style.minWidth = '150px'
    
    // Column 3: Controls (time/freq displays, speed, color selector)
    this.controlsColumn = /** @type {HTMLDivElement} */ (createFlexColumn('gram-frame-controls-column', '8px'))
    this.controlsColumn.style.flex = '0 0 170px'
    this.controlsColumn.style.width = '170px'
    
    // Create universal cursor readouts in controls column
    const cursorContainer = document.createElement('div')
    cursorContainer.className = 'gram-frame-cursor-leds'
    this.timeLED = createLEDDisplay('Time (mm:ss)', formatTime(0))
    cursorContainer.appendChild(this.timeLED)
    
    this.freqLED = createLEDDisplay('Frequency (Hz)', '0.0')
    cursorContainer.appendChild(this.freqLED)
    
    // Create doppler speed LED (spans full width)
    this.speedLED = createLEDDisplay('Doppler Speed (knots)', '0.0')
    this.speedLED.style.gridColumn = '1 / -1' // Span both columns
    cursorContainer.appendChild(this.speedLED)
    
    this.controlsColumn.appendChild(cursorContainer)
    
    // Create color picker in controls column
    this.colorPicker = createColorPicker(this.state)
    this.colorPicker.querySelector('.gram-frame-color-picker-label').textContent = 'Color'
    this.controlsColumn.appendChild(this.colorPicker)
    
    // Add columns to left panel
    this.leftColumn.appendChild(this.modeColumn)
    this.leftColumn.appendChild(this.guidanceColumn)
    this.leftColumn.appendChild(this.controlsColumn)
    
    // Middle Column (180px) - Analysis Markers table
    this.middleColumn = /** @type {HTMLDivElement} */ (createFlexColumn('gram-frame-middle-column'))
    this.middleColumn.style.flex = '0 0 180px'
    this.middleColumn.style.width = '180px'
    
    // Create markers container in middle column
    this.markersContainer = document.createElement('div')
    this.markersContainer.className = 'gram-frame-markers-persistent-container'
    this.markersContainer.style.flex = '1'
    this.markersContainer.style.display = 'flex'
    this.markersContainer.style.flexDirection = 'column'
    this.markersContainer.style.minHeight = '0'
    
    const markersLabel = document.createElement('h4')
    markersLabel.textContent = 'Markers'
    markersLabel.style.margin = '0 0 8px 0'
    markersLabel.style.textAlign = 'left'
    markersLabel.style.flexShrink = '0'
    this.markersContainer.appendChild(markersLabel)
    
    this.middleColumn.appendChild(this.markersContainer)
    
    // Right Column (flexible) - Harmonics sets table
    this.rightColumn = /** @type {HTMLDivElement} */ (createFlexColumn('gram-frame-right-column'))
    this.rightColumn.style.flex = '1'
    this.rightColumn.style.minWidth = '200px'
    this.rightColumn.style.width = '300px'
    
    // Create harmonics container in right column
    this.harmonicsContainer = document.createElement('div')
    this.harmonicsContainer.className = 'gram-frame-harmonics-persistent-container'
    this.harmonicsContainer.style.flex = '1'
    this.harmonicsContainer.style.display = 'flex'
    this.harmonicsContainer.style.flexDirection = 'column'
    this.harmonicsContainer.style.minHeight = '0'
    
    // Create header container with title and button area
    const harmonicsHeader = document.createElement('div')
    harmonicsHeader.className = 'gram-frame-harmonics-header'
    harmonicsHeader.style.display = 'flex'
    harmonicsHeader.style.justifyContent = 'space-between'
    harmonicsHeader.style.alignItems = 'center'
    harmonicsHeader.style.margin = '0 0 8px 0'
    harmonicsHeader.style.flexShrink = '0'
    
    const harmonicsLabel = document.createElement('h4')
    harmonicsLabel.textContent = 'Harmonic Sets'
    harmonicsLabel.style.margin = '0'
    harmonicsLabel.style.textAlign = 'left'
    harmonicsLabel.style.flexShrink = '0'
    
    const harmonicsButtonContainer = document.createElement('div')
    harmonicsButtonContainer.className = 'gram-frame-harmonics-button-container'
    harmonicsButtonContainer.style.flexShrink = '0'
    
    harmonicsHeader.appendChild(harmonicsLabel)
    harmonicsHeader.appendChild(harmonicsButtonContainer)
    this.harmonicsContainer.appendChild(harmonicsHeader)
    
    this.rightColumn.appendChild(this.harmonicsContainer)
    
    // Assemble the unified layout
    this.unifiedLayoutContainer.appendChild(this.leftColumn)
    this.unifiedLayoutContainer.appendChild(this.middleColumn)
    this.unifiedLayoutContainer.appendChild(this.rightColumn)
  }
  
  /**
   * Update universal cursor readouts (time/freq LEDs) regardless of active mode
   * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
   */
  updateUniversalCursorReadouts(dataCoords) {
    if (this.timeLED) {
      const timeValue = this.timeLED.querySelector('.gram-frame-led-value')
      if (timeValue) {
        timeValue.textContent = formatTime(dataCoords.time)
      }
    }
    
    if (this.freqLED) {
      const freqValue = this.freqLED.querySelector('.gram-frame-led-value')
      if (freqValue) {
        freqValue.textContent = dataCoords.freq.toFixed(1)
      }
    }
  }
  
  /**
   * Update persistent panels (markers and harmonics) regardless of active mode
   */
  updatePersistentPanels() {
    // Update analysis markers table
    const analysisMode = /** @type {any} */ (this.modes['analysis'])
    if (analysisMode && typeof analysisMode.updateMarkersTable === 'function') {
      analysisMode.updateMarkersTable()
    }
    
    // Update harmonics panel - ensure panel reference is always available
    const harmonicsMode = /** @type {any} */ (this.modes['harmonics'])
    if (harmonicsMode) {



      // Make sure the panel reference is set
      if (!harmonicsMode.instance.harmonicPanel && this.harmonicsContainer) {
        const existingPanel = this.harmonicsContainer.querySelector('.gram-frame-harmonic-panel')

        if (existingPanel) {

          harmonicsMode.instance.harmonicPanel = existingPanel
        }
      }
      
      if (typeof harmonicsMode.updateHarmonicPanel === 'function') {
        harmonicsMode.updateHarmonicPanel()
      }
    }
  }
  
  // Zoom controls removed - now handled by pan mode command buttons
  
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
    this._updateZoomControlStates()
    
    // Notify listeners
    notifyStateListeners(this.state, this.stateListeners)
  }
  
  
  /**
   * Update zoom control button states based on current zoom level
   */
  _updateZoomControlStates() {
    
    // Update command button states for all modes (zoom buttons are now in pan mode)
    if (this.commandButtons && this.modes) {
      updateCommandButtonStates(this.commandButtons, this.modes)
    }
    
    // Update mode button states (enabled/disabled)
    if (this.modeButtons && this.modes) {
      updateModeButtonStates(this.modeButtons, this.modes)
      
      // Switch away from pan mode if currently active but now disabled
      if (this.state.mode === 'pan' && this.modes.pan && !this.modes.pan.isEnabled() && this.state.previousMode) {
        this._switchMode(this.state.previousMode)
      }
    }
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
    this.updatePersistentPanels()
    
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
