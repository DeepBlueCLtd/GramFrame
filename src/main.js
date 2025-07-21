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
  updateLEDDisplays
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
    
    // Create a container to replace the table
    this.container = document.createElement('div')
    this.container.className = 'gram-frame-container'
    
    // Create table structure for proper resizing
    this.table = document.createElement('div')
    this.table.className = 'gram-frame-table'
    this.container.appendChild(this.table)
    
    // Create mode header row
    this.modeRow = document.createElement('div')
    this.modeRow.className = 'gram-frame-row'
    this.table.appendChild(this.modeRow)
    
    this.modeCell = document.createElement('div')
    this.modeCell.className = 'gram-frame-cell gram-frame-mode-header'
    this.modeRow.appendChild(this.modeCell)
    
    // Create main panel row (stretches)
    this.mainRow = document.createElement('div')
    this.mainRow.className = 'gram-frame-row'
    this.mainRow.style.height = '100%'
    this.table.appendChild(this.mainRow)
    
    this.mainCell = document.createElement('div')
    this.mainCell.className = 'gram-frame-cell gram-frame-main-panel'
    this.mainRow.appendChild(this.mainCell)
    
    // Create display panel row
    this.displayRow = document.createElement('div')
    this.displayRow.className = 'gram-frame-row'
    this.table.appendChild(this.displayRow)
    
    this.displayCell = document.createElement('div')
    this.displayCell.className = 'gram-frame-cell gram-frame-display-panel'
    this.displayRow.appendChild(this.displayCell)
    
    // Create SVG element for rendering inside main panel
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    this.svg.setAttribute('class', 'gram-frame-svg')
    this.svg.setAttribute('width', '100%')
    this.svg.setAttribute('height', 'auto')
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
    this.mainCell.appendChild(this.svg)
    
    // Create main group for content with margins for axes
    this.mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    this.mainGroup.setAttribute('class', 'gram-frame-main-group')
    this.svg.appendChild(this.mainGroup)
    
    // Create image element within main group for spectrogram
    this.svgImage = document.createElementNS('http://www.w3.org/2000/svg', 'image')
    this.svgImage.setAttribute('class', 'gram-frame-image')
    this.mainGroup.appendChild(this.svgImage)
    
    // Create groups for axes
    this.timeAxisGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    this.timeAxisGroup.setAttribute('class', 'gram-frame-time-axis')
    this.svg.appendChild(this.timeAxisGroup)
    
    this.freqAxisGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    this.freqAxisGroup.setAttribute('class', 'gram-frame-freq-axis')
    this.svg.appendChild(this.freqAxisGroup)
    
    // Create cursor indicator group
    this.cursorGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    this.cursorGroup.setAttribute('class', 'gram-frame-cursor-group')
    this.svg.appendChild(this.cursorGroup)
    
    // Create LED readout panel in display cell
    this.readoutPanel = document.createElement('div')
    this.readoutPanel.className = 'gram-frame-readout'
    this.displayCell.appendChild(this.readoutPanel)
    
    // Create initial LED displays
    const ledElements = createLEDDisplays(this.readoutPanel, this.state)
    Object.assign(this, ledElements)
    
    // Create mode switching UI
    const modeUI = createModeSwitchingUI(this.modeCell, this.state, (mode) => this._switchMode(mode))
    this.modesContainer = modeUI.modesContainer
    this.modeButtons = modeUI.modeButtons
    
    // Create rate input
    this.rateInput = createRateInput(this.container, this.state, (rate) => this._setRate(rate))
    
    // Replace the table with our container
    if (configTable && configTable.parentNode) {
      configTable.parentNode.replaceChild(this.container, configTable)
      
      // Store a reference to this instance on the container element
      // This allows the state listener mechanism to access the instance
      // @ts-ignore - Adding custom property to DOM element
      this.container.__gramFrameInstance = this
    }
    
    // Apply any globally registered listeners to this new instance
    getGlobalStateListeners().forEach(listener => {
      if (!this.stateListeners.includes(listener)) {
        this.stateListeners.push(listener)
      }
    })
    
    // Extract config data from table
    extractConfigData(this)
    
    // Setup event listeners
    this._setupEventListeners()
    
    // Setup ResizeObserver for responsive behavior
    this._setupResizeObserver()
    
    // Notify listeners of initial state
    notifyStateListeners(this.state, this.stateListeners)
  }
  
  /**
   * Creates LED display elements for showing measurement values
   */
  

  
  
  
  /**
   * Sets up event listeners for mouse interactions and UI controls
   */
  _setupEventListeners() {
    // Bind event handlers to maintain proper 'this' context
    this._boundHandleMouseMove = this._handleMouseMove.bind(this)
    this._boundHandleMouseLeave = this._handleMouseLeave.bind(this)
    this._boundHandleClick = this._handleClick.bind(this)
    this._boundHandleMouseDown = this._handleMouseDown.bind(this)
    this._boundHandleMouseUp = this._handleMouseUp.bind(this)
    this._boundHandleResize = () => handleResize(this)
    
    // SVG mouse events
    this.svg.addEventListener('mousemove', this._boundHandleMouseMove)
    this.svg.addEventListener('mouseleave', this._boundHandleMouseLeave)
    this.svg.addEventListener('click', this._boundHandleClick)
    this.svg.addEventListener('mousedown', this._boundHandleMouseDown)
    this.svg.addEventListener('mouseup', this._boundHandleMouseUp)
    
    // Mode button events
    Object.keys(this.modeButtons || {}).forEach(mode => {
      const button = this.modeButtons[mode]
      if (button) {
        button.addEventListener('click', () => {
          this._switchMode(/** @type {'analysis'|'doppler'} */ (mode))
        })
      }
    })
    
    // Rate input events
    if (this.rateInput) {
      this.rateInput.addEventListener('change', () => {
        if (this.rateInput) {
          const rate = parseFloat(this.rateInput.value)
          if (!isNaN(rate) && rate >= 0.1) {
            this._setRate(rate)
          } else {
            // Reset to previous valid value if invalid input
            this.rateInput.value = String(this.state.rate)
          }
        }
      })
    }
    
    // Also handle input events for real-time validation feedback
    if (this.rateInput) {
      this.rateInput.addEventListener('input', () => {
        if (this.rateInput) {
          const rate = parseFloat(this.rateInput.value)
          if (!isNaN(rate) && rate >= 0.1) {
            this.rateInput.style.borderColor = '#ddd'
          } else {
            this.rateInput.style.borderColor = '#ff6b6b'
          }
        }
      })
    }
    
    // Window resize event
    window.addEventListener('resize', this._boundHandleResize)
  }
  
  /**
   * Sets up ResizeObserver to monitor container dimensions
   */
  _setupResizeObserver() {
    // Use ResizeObserver to monitor SVG container dimensions
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          handleSVGResize(this, entry.contentRect)
        }
      })
      this.resizeObserver.observe(this.container)
    }
  }
  
  /**
   * Handles window resize events
   */
  
  /**
   * Handles mouse move events over the SVG
   * @param {MouseEvent} event - Mouse event
   */
  _handleMouseMove(event) {
    // Only process if we have valid image details
    if (!this.state.imageDetails.naturalWidth || !this.state.imageDetails.naturalHeight) return
    
    // Use SVG's built-in coordinate transformation for accurate positioning
    let svgCoords
    try {
      const pt = this.svg.createSVGPoint()
      pt.x = event.clientX
      pt.y = event.clientY
      const transformedPt = pt.matrixTransform(this.svg.getScreenCTM().inverse())
      svgCoords = { x: transformedPt.x, y: transformedPt.y }
    } catch (e) {
      // Fallback to manual calculation
      const rect = this.svg.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      svgCoords = screenToSVGCoordinates(x, y, this.svg, this.state.imageDetails)
    }
    
    // Get coordinates relative to image (image is now positioned at margins.left, margins.top)
    const margins = this.state.axes.margins
    const imageRelativeX = svgCoords.x - margins.left
    const imageRelativeY = svgCoords.y - margins.top
    
    // Only process if mouse is within the image area
    if (imageRelativeX < 0 || imageRelativeY < 0 || 
        imageRelativeX > this.state.imageDetails.naturalWidth || 
        imageRelativeY > this.state.imageDetails.naturalHeight) {
      // Clear cursor position when mouse is outside image bounds
      this.state.cursorPosition = null
      updateLEDDisplays(this, this.state)
      notifyStateListeners(this.state, this.stateListeners)
      return
    }
    
    // Convert image-relative coordinates to data coordinates
    const dataCoords = imageToDataCoordinates(imageRelativeX, imageRelativeY, this.state.config, this.state.imageDetails, this.state.rate)
    
    // Calculate screen coordinates for state (relative to SVG)
    const rect = this.svg.getBoundingClientRect()
    const screenX = event.clientX - rect.left
    const screenY = event.clientY - rect.top

    // Update cursor position in state with normalized coordinates
    this.state.cursorPosition = { 
      x: Math.round(screenX), 
      y: Math.round(screenY), 
      svgX: Math.round(svgCoords.x),
      svgY: Math.round(svgCoords.y),
      imageX: Math.round(imageRelativeX),
      imageY: Math.round(imageRelativeY),
      time: parseFloat(dataCoords.time.toFixed(2)), 
      freq: parseFloat(dataCoords.freq.toFixed(2))
    }
    
    // Update LED displays
    updateLEDDisplays(this, this.state)
    
    // Update visual cursor indicators
    updateCursorIndicators(this)
    
    // In Analysis mode, update harmonics during drag
    if (this.state.mode === 'analysis' && this.state.dragState.isDragging) {
      triggerHarmonicsDisplay(
        this.state, 
        () => updateLEDDisplays(this, this.state),
        () => updateCursorIndicators(this), 
        notifyStateListeners, 
        this.stateListeners
      )
    }
    
    // Notify listeners
    notifyStateListeners(this.state, this.stateListeners)
  }
  
  /**
   * Handles mouse leave events
   * @param {MouseEvent} event - Mouse event
   */
  _handleMouseLeave(event) {
    // Clear cursor position when mouse leaves the SVG area
    this.state.cursorPosition = null
    
    // Update LED displays to show no position
    updateLEDDisplays(this, this.state)
    
    // Clear visual cursor indicators
    updateCursorIndicators(this)
    
    // Notify listeners
    notifyStateListeners(this.state, this.stateListeners)
  }
  
  /**
   * Handles mouse down events for drag interactions
   * @param {MouseEvent} event - Mouse event
   */
  _handleMouseDown(event) {
    // Only process if we have valid image details
    if (!this.state.imageDetails.naturalWidth || !this.state.imageDetails.naturalHeight) return
    
    // Start drag state in Analysis mode for harmonics
    if (this.state.mode === 'analysis' && this.state.cursorPosition) {
      this.state.dragState.isDragging = true
      this.state.dragState.dragStartPosition = { ...this.state.cursorPosition }
      
      // Trigger harmonics display immediately on mouse down
      triggerHarmonicsDisplay(
        this.state, 
        () => updateLEDDisplays(this, this.state),
        () => updateCursorIndicators(this), 
        notifyStateListeners, 
        this.stateListeners
      )
    }
  }
  
  /**
   * Handles mouse up events to end drag interactions
   * @param {MouseEvent} event - Mouse event
   */
  _handleMouseUp(event) {
    // End drag state
    if (this.state.dragState.isDragging) {
      this.state.dragState.isDragging = false
      this.state.dragState.dragStartPosition = null
      
      // Clear harmonics state when drag ends
      this.state.harmonics.baseFrequency = null
      this.state.harmonics.harmonicData = []
      
      // Update displays and indicators
      updateLEDDisplays(this, this.state)
      updateCursorIndicators(this)
      
      // Notify listeners of state change
      notifyStateListeners(this.state, this.stateListeners)
    }
  }
  
  /**
   * Handles click events for Doppler mode measurements
   * @param {MouseEvent} event - Mouse event
   */
  _handleClick(event) {
    // Only process if we have valid image details and are in Doppler mode
    if (!this.state.imageDetails.naturalWidth || !this.state.imageDetails.naturalHeight || this.state.mode !== 'doppler') {
      return
    }
    
    // Only process if mouse is within the image area
    if (!this.state.cursorPosition) {
      return
    }
    
    // Handle Doppler mode clicks
    if (this.state.mode === 'doppler') {
      this._handleDopplerClick()
    }
  }
  
  /**
   * Processes Doppler mode click to set measurement points
   */
  _handleDopplerClick() {
    // Create point data from current cursor position
    if (!this.state.cursorPosition) return
    
    const clickPoint = {
      time: this.state.cursorPosition.time,
      freq: this.state.cursorPosition.freq,
      svgX: this.state.cursorPosition.svgX,
      svgY: this.state.cursorPosition.svgY
    }
    
    if (!this.state.doppler.startPoint) {
      // Set start point
      this.state.doppler.startPoint = clickPoint
      this.state.doppler.endPoint = null
      this.state.doppler.deltaTime = null
      this.state.doppler.deltaFrequency = null
      this.state.doppler.speed = null
    } else if (!this.state.doppler.endPoint) {
      // Set end point and calculate measurements
      this.state.doppler.endPoint = clickPoint
      calculateDopplerMeasurements(this.state)
    } else {
      // Both points are set, start a new measurement
      this.state.doppler.startPoint = clickPoint
      this.state.doppler.endPoint = null
      this.state.doppler.deltaTime = null
      this.state.doppler.deltaFrequency = null
      this.state.doppler.speed = null
    }
    
    // Update displays and indicators
    updateLEDDisplays(this, this.state)
    updateCursorIndicators(this)
    
    // Notify listeners of state change
    notifyStateListeners(this.state, this.stateListeners)
  }
  
  /**
   * Calculates Doppler measurements from start and end points
   */
  
  /**
   * Clean up event listeners (called when component is destroyed)
   */
  _cleanupEventListeners() {
    if (this.svg) {
      if (this._boundHandleMouseMove) {
        this.svg.removeEventListener('mousemove', this._boundHandleMouseMove)
      }
      if (this._boundHandleMouseLeave) {
        this.svg.removeEventListener('mouseleave', this._boundHandleMouseLeave)
      }
      if (this._boundHandleClick) {
        this.svg.removeEventListener('click', this._boundHandleClick)
      }
      if (this._boundHandleMouseDown) {
        this.svg.removeEventListener('mousedown', this._boundHandleMouseDown)
      }
      if (this._boundHandleMouseUp) {
        this.svg.removeEventListener('mouseup', this._boundHandleMouseUp)
      }
    }
    
    if (this._boundHandleResize) {
      window.removeEventListener('resize', this._boundHandleResize)
    }
    
    // Clean up ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }
  }
  
  /**
   * Destroy the component and clean up resources
   */
  destroy() {
    this._cleanupEventListeners()
    
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
   * @param {'analysis'|'doppler'} mode - Target mode
   */
  _switchMode(mode) {
    // Update state
    this.state.mode = mode
    
    // Clear harmonics state when switching away from analysis mode
    if (mode !== 'analysis') {
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
