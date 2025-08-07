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
  updateLEDDisplays
} from './components/UIComponents.js'
import { 
  updatePersistentPanels 
} from './components/MainUI.js'

// Initialization modules
import { initializeDOMProperties, setupSpectrogramComponents } from './core/initialization/DOMSetup.js'
import { setupAllEventListeners, setupStateListeners } from './core/initialization/EventBindings.js'
import { initializeModeInfrastructure, setupModeUI } from './core/initialization/ModeInitialization.js'
import { 
  createUnifiedLayoutStructure, 
  setupPersistentContainers, 
  updateModeUIWithCommands,
  setupSpectrogramIfAvailable 
} from './core/initialization/UISetup.js'
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

import { createGramFrameAPI } from './api/GramFrameAPI.js'

// Cursor indicators removed - using CSS cursor only

import {
  cleanupEventListeners
} from './core/events.js'

import {
  cleanupKeyboardControl
} from './core/keyboardControl.js'

/**
 * GramFrame class - Main component implementation
 */
export class GramFrame {
  /**
   * Creates a new GramFrame instance
   * @param {HTMLTableElement} configTable - Configuration table element to replace
   */
  constructor(configTable) {
    // Core state initialization
    this.state = createInitialState()
    this.configTable = configTable
    this.stateListeners = []
    this.instanceId = ''
    
    // Delegate to initialization modules
    initializeDOMProperties(this)
    setupSpectrogramComponents(this)
    createUnifiedLayoutStructure(this)
    setupPersistentContainers(this)
    setupSpectrogramIfAvailable(this)
    initializeModeInfrastructure(this)
    setupModeUI(this)
    updateModeUIWithCommands(this)
    setupAllEventListeners(this)
    setupStateListeners(this)
    
    // Final state notification
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
