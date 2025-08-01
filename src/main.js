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
  createColorPicker,
  createZoomToggleButton
} from './components/UIComponents.js'
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
    
    // Create mode switching UI
    const modeUI = createModeSwitchingUI(this.modeCell, this.state, (mode) => this._switchMode(mode))
    this.modesContainer = modeUI.modesContainer
    this.modeButtons = modeUI.modeButtons
    this.guidancePanel = modeUI.guidancePanel
    
    // Append unified layout to readout panel
    this.readoutPanel.appendChild(this.unifiedLayoutContainer)
    
    // Append readout panel to mode cell
    this.modeCell.appendChild(this.readoutPanel)
    
    // Rate input UI removed - backend functionality preserved for frequency calculations
    this.rateInput = null
    
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
    
    // Initialize all persistent containers with their respective content
    // Analysis markers in middle column (always visible)
    this.modes['analysis'].createUI(this.markersContainer)
    
    // Harmonics sets in right column (always visible)  
    this.modes['harmonics'].createUI(this.harmonicsContainer)
    
    // Set initial mode (analysis by default)
    this.currentMode = this.modes['analysis']
    
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
    
    // Left Column (250px) - Common controls
    this.leftColumn = /** @type {HTMLDivElement} */ (createFlexColumn('gram-frame-left-column', '8px'))
    this.leftColumn.style.flex = '0 0 250px'
    this.leftColumn.style.width = '250px'
    
    // Create universal cursor readouts
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
    
    this.leftColumn.appendChild(cursorContainer)
    
    // Create color picker
    this.colorPicker = createColorPicker(this.state)
    this.colorPicker.querySelector('.gram-frame-color-picker-label').textContent = 'Color'
    this.leftColumn.appendChild(this.colorPicker)
    
    // Middle Column (300px) - Analysis Markers table
    this.middleColumn = /** @type {HTMLDivElement} */ (createFlexColumn('gram-frame-middle-column'))
    this.middleColumn.style.flex = '0 0 230px'
    this.middleColumn.style.width = '230px'
    
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
    
    // Right Column (300px) - Harmonics sets table
    this.rightColumn = /** @type {HTMLDivElement} */ (createFlexColumn('gram-frame-right-column'))
    this.rightColumn.style.flex = '0 0 300px'
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
    
    // Region zoom toggle button
    const regionZoomButton = createZoomToggleButton((isActive) => this._toggleRegionZoom(isActive))
    regionZoomButton.classList.add('gram-frame-zoom-btn')
    
    // Pan toggle button
    const panToggleButton = document.createElement('button')
    panToggleButton.className = 'gram-frame-zoom-btn gram-frame-pan-toggle'
    panToggleButton.textContent = '↔' // Horizontal arrows
    panToggleButton.title = 'Toggle Pan Mode'
    panToggleButton.addEventListener('click', () => this._togglePan())
    
    // Reset zoom button
    const zoomResetButton = document.createElement('button')
    zoomResetButton.className = 'gram-frame-zoom-btn gram-frame-zoom-reset'
    zoomResetButton.textContent = '1:1'
    zoomResetButton.title = 'Reset Zoom'
    zoomResetButton.addEventListener('click', () => this._zoomReset())
    
    zoomContainer.appendChild(zoomInButton)
    zoomContainer.appendChild(zoomOutButton)
    zoomContainer.appendChild(regionZoomButton)
    zoomContainer.appendChild(panToggleButton)
    zoomContainer.appendChild(zoomResetButton)
    
    // Add to main panel (positioned over the spectrogram)
    this.mainCell.appendChild(zoomContainer)
    
    // Store references
    this.zoomControls = {
      container: zoomContainer,
      zoomInButton,
      zoomOutButton,
      regionZoomButton,
      panToggleButton,
      zoomResetButton
    }
    
    // Set initial button states (all disabled except zoom in, since we start at 1:1)
    this._updateZoomControlStates()
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
   * Zoom out by decreasing zoom level or returning to previous zoom state
   */
  _zoomOut() {
    // If we have zoom history, go back to previous state
    if (this.state.zoom.zoomHistory.length > 0) {
      const previousState = this.state.zoom.zoomHistory.pop()
      if (previousState.levelX && previousState.levelY) {
        // Restore separate X and Y levels if they exist
        this._setZoomXY(previousState.levelX, previousState.levelY, previousState.centerX, previousState.centerY)
      } else {
        // Fallback to uniform zoom for older history entries
        this._setZoom(previousState.level, previousState.centerX, previousState.centerY)
      }
    } else {
      // Otherwise, just zoom out by factor
      const currentLevelX = this.state.zoom.levelX || this.state.zoom.level
      const currentLevelY = this.state.zoom.levelY || this.state.zoom.level
      const newLevelX = Math.max(currentLevelX / 1.5, 1.0) // Min 1x zoom
      const newLevelY = Math.max(currentLevelY / 1.5, 1.0) // Min 1x zoom
      this._setZoomXY(newLevelX, newLevelY, this.state.zoom.centerX, this.state.zoom.centerY)
    }
  }
  
  /**
   * Reset zoom to 1x
   */
  _zoomReset() {
    // Clear zoom history and selection bounds when resetting
    this.state.zoom.zoomHistory = []
    this.state.zoom.selectionBounds = null
    this._setZoom(1.0, 0.5, 0.5)
  }
  
  /**
   * Toggle region zoom mode
   * @param {boolean} isActive - Whether region zoom mode should be active
   */
  _toggleRegionZoom(isActive) {
    this.state.zoom.regionMode = isActive
    
    // Deactivate pan mode if region zoom is activated (mutual exclusion)
    if (isActive && this.state.zoom.panMode) {
      this.state.zoom.panMode = false
      if (this.zoomControls && this.zoomControls.panToggleButton) {
        this.zoomControls.panToggleButton.classList.remove('active')
        this.zoomControls.panToggleButton.title = 'Toggle Pan Mode'
      }
    }
    
    // Update cursor style for SVG
    if (this.svg) {
      if (this.state.zoom.regionMode) {
        this.svg.style.cursor = 'crosshair'
      } else if (this.state.zoom.panMode && this.state.zoom.level > 1.0) {
        this.svg.style.cursor = 'grab'
      } else {
        this.svg.style.cursor = 'crosshair'
      }
    }
    
    // Clear any active selection
    this.state.zoom.isSelecting = false
    this.state.zoom.selectionStart = null
    this.state.zoom.selectionEnd = null
    this._clearSelectionVisual()
    
    // Notify listeners
    notifyStateListeners(this.state, this.stateListeners)
  }
  
  /**
   * Toggle pan mode
   */
  _togglePan() {
    this.state.zoom.panMode = !this.state.zoom.panMode
    
    // Deactivate region zoom mode if pan is activated (mutual exclusion)
    if (this.state.zoom.panMode && this.state.zoom.regionMode) {
      this.state.zoom.regionMode = false
      if (this.zoomControls && this.zoomControls.regionZoomButton) {
        this.zoomControls.regionZoomButton.classList.remove('active')
        this.zoomControls.regionZoomButton.title = 'Toggle Region Zoom Mode'
      }
    }
    
    // Update button appearance
    if (this.zoomControls && this.zoomControls.panToggleButton) {
      if (this.state.zoom.panMode) {
        this.zoomControls.panToggleButton.classList.add('active')
        this.zoomControls.panToggleButton.title = 'Pan Mode Active - Click to disable'
      } else {
        this.zoomControls.panToggleButton.classList.remove('active')
        this.zoomControls.panToggleButton.title = 'Toggle Pan Mode'
      }
    }
    
    // Update cursor style for SVG
    if (this.svg) {
      if (this.state.zoom.panMode && this.state.zoom.level > 1.0) {
        this.svg.style.cursor = 'grab'
      } else if (this.state.zoom.regionMode) {
        this.svg.style.cursor = 'crosshair'
      } else {
        this.svg.style.cursor = 'crosshair'
      }
    }
    
    // Notify listeners
    notifyStateListeners(this.state, this.stateListeners)
  }
  
  /**
   * Set zoom level and center point
   * @param {number} level - Uniform zoom level (1.0 = no zoom)
   * @param {number} centerX - Center X (0-1 normalized)
   * @param {number} centerY - Center Y (0-1 normalized)
   */
  _setZoom(level, centerX, centerY) {
    // Update state with uniform scaling
    this.state.zoom.level = level
    this.state.zoom.levelX = level
    this.state.zoom.levelY = level
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
   * Set separate zoom levels for X and Y axes (aspect ratio change)
   * @param {number} levelX - X-axis zoom level (1.0 = no zoom)
   * @param {number} levelY - Y-axis zoom level (1.0 = no zoom)
   * @param {number} centerX - Center X (0-1 normalized)
   * @param {number} centerY - Center Y (0-1 normalized)
   */
  _setZoomXY(levelX, levelY, centerX, centerY) {
    // Update state with separate X and Y scaling
    this.state.zoom.level = Math.max(levelX, levelY) // Keep level for backward compatibility
    this.state.zoom.levelX = levelX
    this.state.zoom.levelY = levelY
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
   * Pan the image by adjusting the center point
   * @param {number} deltaX - Change in X position (normalized -1 to 1)
   * @param {number} deltaY - Change in Y position (normalized -1 to 1)
   */
  _panImage(deltaX, deltaY) {
    const levelX = this.state.zoom.levelX || this.state.zoom.level
    const levelY = this.state.zoom.levelY || this.state.zoom.level
    
    if (levelX <= 1.0 && levelY <= 1.0) {
      return // No panning when not zoomed
    }
    
    // Calculate new center point, constrained to valid range
    const newCenterX = Math.max(0, Math.min(1, this.state.zoom.centerX + deltaX))
    const newCenterY = Math.max(0, Math.min(1, this.state.zoom.centerY + deltaY))
    
    // Update zoom with new center point, preserving separate X and Y levels
    this._setZoomXY(levelX, levelY, newCenterX, newCenterY)
  }
  
  /**
   * Clear the region selection visual overlay
   */
  _clearSelectionVisual() {
    if (this.svg) {
      const existingSelection = this.svg.querySelector('.gram-frame-region-selection')
      if (existingSelection) {
        existingSelection.remove()
      }
    }
  }
  
  /**
   * Update the region selection visual overlay
   */
  _updateSelectionVisual() {
    if (!this.state.zoom.isSelecting || !this.state.zoom.selectionStart || !this.state.zoom.selectionEnd) {
      this._clearSelectionVisual()
      return
    }
    
    const start = this.state.zoom.selectionStart
    const end = this.state.zoom.selectionEnd
    
    // Calculate rectangle bounds
    const x = Math.min(start.x, end.x)
    const y = Math.min(start.y, end.y)
    const width = Math.abs(end.x - start.x)
    const height = Math.abs(end.y - start.y)
    
    // Get or create selection rectangle
    let selectionRect = this.svg.querySelector('.gram-frame-region-selection')
    if (!selectionRect) {
      selectionRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      selectionRect.classList.add('gram-frame-region-selection')
      selectionRect.setAttribute('fill', 'rgba(0, 150, 255, 0.2)')
      selectionRect.setAttribute('stroke', 'rgba(0, 150, 255, 0.8)')
      selectionRect.setAttribute('stroke-width', '2')
      selectionRect.setAttribute('stroke-dasharray', '5,5')
      this.svg.appendChild(selectionRect)
    }
    
    // Update rectangle attributes
    selectionRect.setAttribute('x', String(x))
    selectionRect.setAttribute('y', String(y))
    selectionRect.setAttribute('width', String(width))
    selectionRect.setAttribute('height', String(height))
  }
  
  /**
   * Zoom to the selected region
   */
  _zoomToRegion() {
    if (!this.state.zoom.selectionStart || !this.state.zoom.selectionEnd) {
      return
    }
    
    const margins = this.state.axes.margins
    const { naturalWidth, naturalHeight } = this.state.imageDetails
    
    console.log('=== CONFIG DEBUG ===')
    console.log('Config data ranges:', this.state.config)
    
    // Get selection bounds in SVG coordinates
    const start = this.state.zoom.selectionStart
    const end = this.state.zoom.selectionEnd
    const x1 = Math.min(start.x, end.x)
    const y1 = Math.min(start.y, end.y)
    const x2 = Math.max(start.x, end.x)
    const y2 = Math.max(start.y, end.y)
    
    // Convert to image coordinates
    const imageX1 = x1 - margins.left
    const imageY1 = y1 - margins.top
    const imageX2 = x2 - margins.left
    const imageY2 = y2 - margins.top
    
    // Ensure selection is within image bounds
    const clampedX1 = Math.max(0, Math.min(imageX1, naturalWidth))
    const clampedY1 = Math.max(0, Math.min(imageY1, naturalHeight))
    const clampedX2 = Math.max(0, Math.min(imageX2, naturalWidth))
    const clampedY2 = Math.max(0, Math.min(imageY2, naturalHeight))
    
    // Calculate selection dimensions
    const selectionWidth = clampedX2 - clampedX1
    const selectionHeight = clampedY2 - clampedY1
    
    // Minimum selection size (prevent zooming to tiny areas)
    const minSelectionSize = 10
    if (selectionWidth < minSelectionSize || selectionHeight < minSelectionSize) {
      return
    }
    
    // Save current zoom state to history
    this.state.zoom.zoomHistory.push({
      level: this.state.zoom.level,
      levelX: this.state.zoom.levelX,
      levelY: this.state.zoom.levelY,
      centerX: this.state.zoom.centerX,
      centerY: this.state.zoom.centerY
    })
    
    // Calculate new zoom levels for X and Y separately (aspect ratio change)
    const zoomX = naturalWidth / selectionWidth
    const zoomY = naturalHeight / selectionHeight
    
    // Cap zoom levels at 10.0 to prevent extreme zoom
    const newZoomLevelX = Math.min(zoomX, 10.0)
    const newZoomLevelY = Math.min(zoomY, 10.0)
    
    // Calculate center point of selection (normalized to 0-1)
    const centerX = (clampedX1 + selectionWidth / 2) / naturalWidth
    const centerY = (clampedY1 + selectionHeight / 2) / naturalHeight
    
    console.log('=== REGION ZOOM DEBUG ===')
    console.log('Selection in SVG coords:', { x1, y1, x2, y2 })
    console.log('Selection in image coords:', { imageX1, imageY1, imageX2, imageY2 })
    console.log('Clamped selection:', { clampedX1, clampedY1, clampedX2, clampedY2 })
    console.log('Selection dimensions:', { selectionWidth, selectionHeight })
    console.log('Image dimensions:', { naturalWidth, naturalHeight })
    console.log('Zoom levels:', { zoomX, zoomY, newZoomLevelX, newZoomLevelY })
    console.log('Center point (normalized):', { centerX, centerY })
    
    // Store the selection bounds for the zoom transform
    this.state.zoom.selectionBounds = {
      left: clampedX1 / naturalWidth,
      top: clampedY1 / naturalHeight,
      right: clampedX2 / naturalWidth,
      bottom: clampedY2 / naturalHeight
    }
    
    // Apply the zoom with separate X and Y levels
    this._setZoomXY(newZoomLevelX, newZoomLevelY, centerX, centerY)
    
    // Clear selection
    this.state.zoom.isSelecting = false
    this.state.zoom.selectionStart = null
    this.state.zoom.selectionEnd = null
    this._clearSelectionVisual()
    
    // Keep region zoom mode active for continued use
    // User can manually toggle it off when done
  }
  
  /**
   * Update zoom control button states based on current zoom level
   */
  _updateZoomControlStates() {
    if (!this.zoomControls) {
      return
    }
    
    const levelX = this.state.zoom.levelX || this.state.zoom.level
    const levelY = this.state.zoom.levelY || this.state.zoom.level
    const maxLevel = Math.max(levelX, levelY)
    const isAtOriginalScale = levelX === 1.0 && levelY === 1.0
    
    // Zoom in: disabled when at max zoom (10.0)
    this.zoomControls.zoomInButton.disabled = (maxLevel >= 10.0)
    
    // Zoom out: disabled when at 1:1 scale or below and no zoom history
    this.zoomControls.zoomOutButton.disabled = (isAtOriginalScale && this.state.zoom.zoomHistory.length === 0)
    
    // Reset zoom: disabled when already at 1:1 scale
    this.zoomControls.zoomResetButton.disabled = isAtOriginalScale
    
    // Pan toggle: disabled when at 1:1 scale
    this.zoomControls.panToggleButton.disabled = isAtOriginalScale
    
    // Update pan mode and button state when zoom level changes
    if (isAtOriginalScale) {
      this.state.zoom.panMode = false
      this.zoomControls.panToggleButton.classList.remove('active')
      if (this.svg) {
        this.svg.style.cursor = this.state.zoom.regionMode ? 'crosshair' : 'crosshair'
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
