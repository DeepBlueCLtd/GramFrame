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
    this._boundHandleResize = this._handleResize.bind(this)
    
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
          this._handleSVGResize(entry.contentRect)
        }
      })
      this.resizeObserver.observe(this.container)
    }
  }
  
  /**
   * Handles window resize events
   */
  _handleResize() {
    // Delegate to SVG resize handler
    const containerRect = this.container.getBoundingClientRect()
    this._handleSVGResize(containerRect)
  }
  
  /**
   * Handles SVG container resize
   * @param {DOMRect} containerRect - Container dimensions
   */
  _handleSVGResize(containerRect) {
    // Only handle resize if we have a valid image
    if (!this.spectrogramImage) return
    
    // Calculate new dimensions while maintaining aspect ratio
    const originalWidth = this.spectrogramImage.naturalWidth
    const originalHeight = this.spectrogramImage.naturalHeight
    const aspectRatio = originalWidth / originalHeight
    
    // Calculate layout dimensions with margins
    const margins = this.state.axes.margins
    const layout = calculateLayoutDimensions(
      containerRect.width,
      aspectRatio,
      originalWidth,
      originalHeight,
      margins
    )
    
    // Set new SVG dimensions (include margins)
    let newWidth = layout.newWidth
    let newHeight = layout.newHeight
    
    // Create viewBox that includes margin space
    const viewBoxWidth = layout.viewBoxWidth
    const viewBoxHeight = layout.viewBoxHeight
    
    // Update SVG viewBox and dimensions
    this.svg.setAttribute('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
    this.svg.setAttribute('width', String(newWidth))
    this.svg.setAttribute('height', String(newHeight))
    
    // Position image directly in SVG coordinate space (no mainGroup translation)
    this.mainGroup.setAttribute('transform', '')
    
    // Update image element within SVG - position it in the margin area
    this.svgImage.setAttribute('width', String(originalWidth))
    this.svgImage.setAttribute('height', String(originalHeight))
    this.svgImage.setAttribute('x', String(margins.left))
    this.svgImage.setAttribute('y', String(margins.top))
    
    // Update state with new dimensions
    this.state.displayDimensions = {
      width: Math.round(newWidth),
      height: Math.round(newHeight)
    }
    
    // Redraw axes
    this._drawAxes()
    
    // Notify listeners
    notifyStateListeners(this.state, this.stateListeners)
    
    // Log resize event for debugging
    console.log('GramFrame resized:', this.state.displayDimensions)
  }
  
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
    this._updateCursorIndicators()
    
    // In Analysis mode, update harmonics during drag
    if (this.state.mode === 'analysis' && this.state.dragState.isDragging) {
      triggerHarmonicsDisplay(
        this.state, 
        () => updateLEDDisplays(this, this.state),
        () => this._updateCursorIndicators(), 
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
    this._updateCursorIndicators()
    
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
        () => this._updateCursorIndicators(), 
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
      this._updateCursorIndicators()
      
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
    this._updateCursorIndicators()
    
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
   * Draw axes with tick marks and labels
   */
  _drawAxes() {
    if (!this.state.imageDetails.naturalWidth || !this.state.imageDetails.naturalHeight) return
    
    this._clearAxes()
    this._drawFrequencyAxis() // Horizontal axis (bottom)
    this._drawTimeAxis()      // Vertical axis (left)
  }
  
  /**
   * Clear existing axes
   */
  _clearAxes() {
    this.timeAxisGroup.innerHTML = ''
    this.freqAxisGroup.innerHTML = ''
  }
  
  /**
   * Draw time axis (vertical, left)
   */
  /**
   * Draw time axis (vertical, left)
   */
  _drawTimeAxis() {
    const { timeMin, timeMax } = this.state.config
    const { naturalHeight } = this.state.imageDetails
    const margins = this.state.axes.margins
    
    // Calculate tick marks
    const range = timeMax - timeMin
    const targetTickCount = Math.floor(naturalHeight / 50) // Aim for ticks every ~50px
    const tickCount = Math.max(2, Math.min(targetTickCount, 8))
    const tickInterval = range / (tickCount - 1)
    
    // Draw main axis line (along the left edge of the image)
    const axisLine = createSVGLine(
      margins.left,
      margins.top,
      margins.left,
      margins.top + naturalHeight,
      'gram-frame-axis-line'
    )
    this.timeAxisGroup.appendChild(axisLine)
    
    // Draw tick marks and labels
    for (let i = 0; i < tickCount; i++) {
      const timeValue = timeMin + (i * tickInterval)
      // Y position: timeMin at bottom, timeMax at top (inverted because SVG y=0 is at top)
      const yPos = margins.top + naturalHeight - (i / (tickCount - 1)) * naturalHeight
      
      // Tick mark (extends into the left margin)
      const tick = createSVGLine(
        margins.left - 5,
        yPos,
        margins.left,
        yPos,
        'gram-frame-axis-tick'
      )
      this.timeAxisGroup.appendChild(tick)
      
      // Label (in the left margin)
      const label = createSVGText(
        margins.left - 8,
        yPos + 4, // Slight offset for better alignment
        timeValue.toFixed(1) + 's',
        'gram-frame-axis-label',
        'end'
      )
      label.setAttribute('font-size', '10')
      this.timeAxisGroup.appendChild(label)
    }
  }
  
  /**
   * Draw frequency axis (horizontal, bottom)
   */
  /**
   * Draw frequency axis (horizontal, bottom)
   */
  _drawFrequencyAxis() {
    const { freqMin, freqMax } = this.state.config
    const { naturalWidth, naturalHeight } = this.state.imageDetails
    const margins = this.state.axes.margins
    
    // Calculate nice tick marks using tidy algorithm
    const range = freqMax - freqMin
    const targetTickCount = Math.floor(naturalWidth / 80) // Aim for ticks every ~80px
    const roughInterval = range / Math.max(1, targetTickCount - 1)
    
    // Find nice interval from standard set
    const niceIntervals = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]
    let tickInterval = niceIntervals[0]
    
    for (const interval of niceIntervals) {
      if (interval >= roughInterval) {
        tickInterval = interval
        break
      }
    }
    
    // Calculate actual tick positions
    const startTick = Math.ceil(freqMin / tickInterval) * tickInterval
    const endTick = Math.floor(freqMax / tickInterval) * tickInterval
    const tickCount = Math.floor((endTick - startTick) / tickInterval) + 1
    
    // Draw main axis line (along the bottom edge of the image)
    const axisLineY = margins.top + naturalHeight
    const axisLine = createSVGLine(
      margins.left,
      axisLineY,
      margins.left + naturalWidth,
      axisLineY,
      'gram-frame-axis-line'
    )
    this.freqAxisGroup.appendChild(axisLine)
    
    // Draw tick marks and labels
    for (let i = 0; i < tickCount; i++) {
      const freqValue = startTick + (i * tickInterval)
      // Convert frequency value to pixel position
      const normalizedX = (freqValue - freqMin) / (freqMax - freqMin)
      const xPos = margins.left + normalizedX * naturalWidth
      
      // Tick mark (extends into the bottom margin)
      const tick = createSVGLine(
        xPos,
        axisLineY,
        xPos,
        axisLineY + 5,
        'gram-frame-axis-tick'
      )
      this.freqAxisGroup.appendChild(tick)
      
      // Label (in the bottom margin)
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      label.setAttribute('x', String(xPos))
      label.setAttribute('y', String(axisLineY + 18))
      label.setAttribute('text-anchor', 'middle')
      label.setAttribute('class', 'gram-frame-axis-label')
      label.setAttribute('font-size', '10')
      label.textContent = freqValue.toFixed(0) + 'Hz'
      this.freqAxisGroup.appendChild(label)
    }
  }
  
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
    this._updateCursorIndicators()
    
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
  _updateCursorIndicators() {
    // Clear existing cursor indicators
    this.cursorGroup.innerHTML = ''
    
    // Only draw indicators if cursor position is available
    if (!this.state.cursorPosition || !this.state.imageDetails.naturalWidth || !this.state.imageDetails.naturalHeight) {
      return
    }
    
    // Handle different modes
    if (this.state.mode === 'analysis') {
      this._drawAnalysisMode()
      
      // In Analysis mode, also draw harmonics if dragging
      if (this.state.dragState.isDragging && this.state.harmonics.baseFrequency !== null) {
        this._drawHarmonicsMode()
      }
    } else if (this.state.mode === 'doppler') {
      this._drawDopplerMode()
    }
  }
  
  /**
   * Draw cursor indicators for analysis mode
   */
  _drawAnalysisMode() {
    if (!this.state.cursorPosition) return
    
    const margins = this.state.axes.margins
    const { naturalWidth, naturalHeight } = this.state.imageDetails
    
    // Calculate cursor position in SVG coordinates (accounting for margins)
    const cursorSVGX = margins.left + this.state.cursorPosition.imageX
    const cursorSVGY = margins.top + this.state.cursorPosition.imageY
    
    // Create vertical crosshair lines (time indicator) - shadow first, then main line
    const verticalShadow = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    verticalShadow.setAttribute('x1', String(cursorSVGX))
    verticalShadow.setAttribute('y1', String(margins.top))
    verticalShadow.setAttribute('x2', String(cursorSVGX))
    verticalShadow.setAttribute('y2', String(margins.top + naturalHeight))
    verticalShadow.setAttribute('class', 'gram-frame-cursor-shadow')
    this.cursorGroup.appendChild(verticalShadow)
    
    const verticalLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    verticalLine.setAttribute('x1', String(cursorSVGX))
    verticalLine.setAttribute('y1', String(margins.top))
    verticalLine.setAttribute('x2', String(cursorSVGX))
    verticalLine.setAttribute('y2', String(margins.top + naturalHeight))
    verticalLine.setAttribute('class', 'gram-frame-cursor-vertical')
    this.cursorGroup.appendChild(verticalLine)
    
    // Create horizontal crosshair lines (frequency indicator) - shadow first, then main line
    const horizontalShadow = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    horizontalShadow.setAttribute('x1', String(margins.left))
    horizontalShadow.setAttribute('y1', String(cursorSVGY))
    horizontalShadow.setAttribute('x2', String(margins.left + naturalWidth))
    horizontalShadow.setAttribute('y2', String(cursorSVGY))
    horizontalShadow.setAttribute('class', 'gram-frame-cursor-shadow')
    this.cursorGroup.appendChild(horizontalShadow)
    
    const horizontalLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    horizontalLine.setAttribute('x1', String(margins.left))
    horizontalLine.setAttribute('y1', String(cursorSVGY))
    horizontalLine.setAttribute('x2', String(margins.left + naturalWidth))
    horizontalLine.setAttribute('y2', String(cursorSVGY))
    horizontalLine.setAttribute('class', 'gram-frame-cursor-horizontal')
    this.cursorGroup.appendChild(horizontalLine)
    
    // Create center point indicator
    const centerPoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    centerPoint.setAttribute('cx', String(cursorSVGX))
    centerPoint.setAttribute('cy', String(cursorSVGY))
    centerPoint.setAttribute('r', '3')
    centerPoint.setAttribute('class', 'gram-frame-cursor-point')
    this.cursorGroup.appendChild(centerPoint)
  }
  
  
  /**
   * Draw harmonic indicators
   */
  _drawHarmonicsMode() {
    // This method now only draws the harmonics that have been calculated
    // It doesn't calculate them - that's done in _triggerHarmonicsDisplay
    const harmonics = this.state.harmonics.harmonicData
    
    // Draw harmonic lines and labels
    harmonics.forEach((harmonic, index) => {
      this._drawHarmonicLine(harmonic, index === 0)
      this._drawHarmonicLabels(harmonic, index === 0)
    })
  }
  
  
  /**
   * Draw a single harmonic line
   * @param {HarmonicData} harmonic - Harmonic data
   * @param {boolean} isMainLine - Whether this is the main (1x) line
   */
  _drawHarmonicLine(harmonic, isMainLine) {
    const margins = this.state.axes.margins
    const { naturalHeight } = this.state.imageDetails
    
    // Draw shadow line first for visibility
    const shadowLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    shadowLine.setAttribute('x1', String(harmonic.svgX))
    shadowLine.setAttribute('y1', String(margins.top))
    shadowLine.setAttribute('x2', String(harmonic.svgX))
    shadowLine.setAttribute('y2', String(margins.top + naturalHeight))
    shadowLine.setAttribute('class', 'gram-frame-harmonic-shadow')
    this.cursorGroup.appendChild(shadowLine)
    
    // Draw main line
    const mainLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    mainLine.setAttribute('x1', String(harmonic.svgX))
    mainLine.setAttribute('y1', String(margins.top))
    mainLine.setAttribute('x2', String(harmonic.svgX))
    mainLine.setAttribute('y2', String(margins.top + naturalHeight))
    
    // Use distinct styling for the main line (1×) as specified
    if (isMainLine) {
      mainLine.setAttribute('class', 'gram-frame-harmonic-main')
    } else {
      mainLine.setAttribute('class', 'gram-frame-harmonic-line')
    }
    
    this.cursorGroup.appendChild(mainLine)
  }
  
  /**
   * Draw labels for a harmonic line
   * @param {HarmonicData} harmonic - Harmonic data
   * @param {boolean} isMainLine - Whether this is the main (1x) line
   */
  _drawHarmonicLabels(harmonic, isMainLine) {
    const margins = this.state.axes.margins
    const labelY = margins.top + 15 // Position labels near the top
    
    // Create harmonic number label (left side of line)
    const numberLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    numberLabel.setAttribute('x', String(harmonic.svgX - 5))
    numberLabel.setAttribute('y', String(labelY))
    numberLabel.setAttribute('text-anchor', 'end')
    numberLabel.setAttribute('class', 'gram-frame-harmonic-label')
    numberLabel.setAttribute('font-size', '10')
    numberLabel.textContent = `${harmonic.number}×`
    this.cursorGroup.appendChild(numberLabel)
    
    // Create frequency label (right side of line)
    const frequencyLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    frequencyLabel.setAttribute('x', String(harmonic.svgX + 5))
    frequencyLabel.setAttribute('y', String(labelY))
    frequencyLabel.setAttribute('text-anchor', 'start')
    frequencyLabel.setAttribute('class', 'gram-frame-harmonic-label')
    frequencyLabel.setAttribute('font-size', '10')
    frequencyLabel.textContent = `${Math.round(harmonic.frequency)} Hz`
    this.cursorGroup.appendChild(frequencyLabel)
  }
  
  /**
   * Draw Doppler mode indicators
   */
  _drawDopplerMode() {
    // Draw normal crosshairs for current cursor position
    if (this.state.cursorPosition) {
      this._drawAnalysisMode()
    }
    
    // Draw start point marker if set
    if (this.state.doppler.startPoint) {
      this._drawDopplerPoint(this.state.doppler.startPoint, 'start')
    }
    
    // Draw end point marker and line if both points are set
    if (this.state.doppler.endPoint) {
      this._drawDopplerPoint(this.state.doppler.endPoint, 'end')
      this._drawDopplerLine()
    }
  }
  
  /**
   * Draw a Doppler measurement point
   * @param {DopplerPoint} point - Point data
   * @param {'start'|'end'} type - Point type
   */
  _drawDopplerPoint(point, type) {
    const margins = this.state.axes.margins
    
    // Convert data coordinates to SVG coordinates
    const dataCoords = dataToSVGCoordinates(point.freq, point.time, this.state.config, this.state.imageDetails, this.state.rate)
    const svgX = margins.left + dataCoords.x
    const svgY = margins.top + dataCoords.y
    
    // Draw point marker
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    marker.setAttribute('cx', String(svgX))
    marker.setAttribute('cy', String(svgY))
    marker.setAttribute('r', '5')
    marker.setAttribute('class', `gram-frame-doppler-${type}-point`)
    this.cursorGroup.appendChild(marker)
    
    // Draw point label
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    label.setAttribute('x', String(svgX + 8))
    label.setAttribute('y', String(svgY - 8))
    label.setAttribute('class', 'gram-frame-doppler-label')
    label.setAttribute('font-size', '12')
    label.textContent = type === 'start' ? '1' : '2'
    this.cursorGroup.appendChild(label)
  }
  
  /**
   * Draw line between Doppler measurement points
   */
  _drawDopplerLine() {
    if (!this.state.doppler.startPoint || !this.state.doppler.endPoint) {
      return
    }
    
    const margins = this.state.axes.margins
    
    // Convert data coordinates to SVG coordinates
    const startCoords = dataToSVGCoordinates(this.state.doppler.startPoint.freq, this.state.doppler.startPoint.time, this.state.config, this.state.imageDetails, this.state.rate)
    const endCoords = dataToSVGCoordinates(this.state.doppler.endPoint.freq, this.state.doppler.endPoint.time, this.state.config, this.state.imageDetails, this.state.rate)
    
    const startX = margins.left + startCoords.x
    const startY = margins.top + startCoords.y
    const endX = margins.left + endCoords.x
    const endY = margins.top + endCoords.y
    
    // Draw shadow line for visibility
    const shadowLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    shadowLine.setAttribute('x1', String(startX))
    shadowLine.setAttribute('y1', String(startY))
    shadowLine.setAttribute('x2', String(endX))
    shadowLine.setAttribute('y2', String(endY))
    shadowLine.setAttribute('stroke-width', '4')
    shadowLine.setAttribute('class', 'gram-frame-doppler-line-shadow')
    this.cursorGroup.appendChild(shadowLine)
    
    // Draw main line
    const mainLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    mainLine.setAttribute('x1', String(startX))
    mainLine.setAttribute('y1', String(startY))
    mainLine.setAttribute('x2', String(endX))
    mainLine.setAttribute('y2', String(endY))
    mainLine.setAttribute('stroke-width', '2')
    mainLine.setAttribute('class', 'gram-frame-doppler-line')
    this.cursorGroup.appendChild(mainLine)
  }
  
  
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
