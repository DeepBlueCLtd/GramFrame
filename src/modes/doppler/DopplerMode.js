import { BaseMode } from '../BaseMode.js'
import { updateLEDDisplays } from '../../components/UIComponents.js'
import { notifyStateListeners } from '../../core/state.js'
// Rendering imports removed - no display element
import { 
  calculateDopplerSpeed,
  isNearMarker
} from '../../utils/doppler.js'
import { calculateMidpoint } from '../../utils/doppler.js'
import { 
  drawDopplerPreview
} from '../../rendering/cursors.js'
import { dataToSVG } from '../../utils/coordinateTransformations.js'
import { BaseDragHandler } from '../shared/BaseDragHandler.js'

// Constants
const MS_TO_KNOTS_CONVERSION = 1.94384

// Doppler marker types
const DopplerDraggedMarker = {
  fPlus: 'fPlus',
  fMinus: 'fMinus', 
  fZero: 'fZero'
}

/**
 * Doppler mode implementation
 * Handles Doppler marker placement, dragging, and speed calculations
 */
export class DopplerMode extends BaseMode {
  /**
   * Initialize DopplerMode with drag handler
   * @param {Object} instance - GramFrame instance
   * @param {Object} state - State object
   */
  constructor(instance, state) {
    super(instance, state)
    
    // Initialize drag handler for existing marker dragging (not preview drag)
    this.dragHandler = new BaseDragHandler(instance, {
      findTargetAt: (position) => this.findDopplerMarkerAtPosition(position),
      onDragStart: (target, position) => this.onMarkerDragStart(target, position),
      onDragUpdate: (target, currentPos, startPos) => this.onMarkerDragUpdate(target, currentPos, startPos),
      onDragEnd: (target, position) => this.onMarkerDragEnd(target, position),
      updateCursor: (style) => this.updateCursorStyle(style)
    })
  }

  /**
   * Find doppler marker at given position
   * Returns a drag target object compatible with BaseDragHandler
   * @param {DataCoordinates} position - Position to check
   * @returns {Object|null} Drag target if found, null otherwise
   */
  findDopplerMarkerAtPosition(position) {
    const doppler = this.state.doppler
    if (!doppler) return null
    
    const mousePos = { x: position.time, y: position.freq } // Simplified conversion
    const tolerance = 20 // SVG pixels tolerance
    
    // Check each marker type
    if (doppler.fPlus) {
      const fPlusSVG = dataToSVG(doppler.fPlus, this.getViewport(), this.instance.spectrogramImage)
      if (this.getMarkerDistance(mousePos, fPlusSVG) < tolerance) {
        return {
          id: 'fPlus',
          type: 'dopplerMarker',
          position: doppler.fPlus,
          data: { markerType: DopplerDraggedMarker.fPlus }
        }
      }
    }
    
    if (doppler.fMinus) {
      const fMinusSVG = dataToSVG(doppler.fMinus, this.getViewport(), this.instance.spectrogramImage)
      if (this.getMarkerDistance(mousePos, fMinusSVG) < tolerance) {
        return {
          id: 'fMinus',
          type: 'dopplerMarker',
          position: doppler.fMinus,
          data: { markerType: DopplerDraggedMarker.fMinus }
        }
      }
    }
    
    if (doppler.fZero) {
      const fZeroSVG = dataToSVG(doppler.fZero, this.getViewport(), this.instance.spectrogramImage)
      if (this.getMarkerDistance(mousePos, fZeroSVG) < tolerance) {
        return {
          id: 'fZero',
          type: 'dopplerMarker',
          position: doppler.fZero,
          data: { markerType: DopplerDraggedMarker.fZero }
        }
      }
    }
    
    return null
  }

  /**
   * Start dragging a doppler marker
   * @param {Object} target - Drag target with id and type
   * @param {DataCoordinates} position - Start position
   */
  onMarkerDragStart(target, _position) {
    const doppler = this.state.doppler
    doppler.isDragging = true
    doppler.draggedMarker = target.data.markerType
  }

  /**
   * Update doppler marker position during drag
   * @param {Object} target - Drag target with id and type
   * @param {DataCoordinates} currentPos - Current position
   * @param {DataCoordinates} startPos - Start position
   */
  onMarkerDragUpdate(_target, currentPos, _startPos) {
    this.handleMarkerDrag(currentPos, this.state.doppler)
  }

  /**
   * End dragging a doppler marker
   * @param {Object} target - Drag target with id and type
   * @param {DataCoordinates} position - End position
   */
  onMarkerDragEnd(_target, _position) {
    const doppler = this.state.doppler
    doppler.isDragging = false
    doppler.draggedMarker = null
  }

  /**
   * Update cursor style for drag operations
   * @param {string} style - Cursor style ('crosshair', 'grab', 'grabbing')
   */
  updateCursorStyle(style) {
    if (this.instance.svg) {
      this.instance.svg.style.cursor = style === 'grab' ? 'move' : style
    }
  }
  /**
   * Get guidance text for doppler mode
   * @returns {string} HTML content for the guidance panel
   */
  getGuidanceText() {
    return `
      <h4>Doppler Mode</h4>
      <p>• Click & drag to place markers for f+ and f-</p>
      <p>• Drag markers to adjust positions</p>
      <p>• f₀ marker shows automatically at the midpoint</p>
      <p>• Right-click to reset all markers</p>
    `
  }

  /**
   * Detect which marker is closest to mouse position
   * @param {ScreenCoordinates} mousePos - Mouse position
   * @param {DopplerState} doppler - Doppler state
   * @returns {Object} Closest marker info with type and distance
   */
  detectClosestMarker(mousePos, doppler) {
    let closestMarker = null
    let closestDistance = Infinity
    
    if (doppler.fPlus) {
      const fPlusSVG = dataToSVG(doppler.fPlus, this.getViewport(), this.instance.spectrogramImage)
      if (this.isNearMarker(mousePos, fPlusSVG)) {
        const distance = this.getMarkerDistance(mousePos, fPlusSVG)
        if (distance < closestDistance) {
          closestDistance = distance
          closestMarker = DopplerDraggedMarker.fPlus
        }
      }
    }
    
    if (doppler.fMinus) {
      const fMinusSVG = dataToSVG(doppler.fMinus, this.getViewport(), this.instance.spectrogramImage)
      if (this.isNearMarker(mousePos, fMinusSVG)) {
        const distance = this.getMarkerDistance(mousePos, fMinusSVG)
        if (distance < closestDistance) {
          closestDistance = distance
          closestMarker = DopplerDraggedMarker.fMinus
        }
      }
    }
    
    if (doppler.fZero) {
      const fZeroSVG = dataToSVG(doppler.fZero, this.getViewport(), this.instance.spectrogramImage)
      if (this.isNearMarker(mousePos, fZeroSVG)) {
        const distance = this.getMarkerDistance(mousePos, fZeroSVG)
        if (distance < closestDistance) {
          closestDistance = distance
          closestMarker = DopplerDraggedMarker.fZero
        }
      }
    }
    
    return { marker: closestMarker, distance: closestDistance }
  }

  /**
   * Handle preview drag when placing markers
   * @param {DataCoordinates} dataCoords - Data coordinates
   * @param {DopplerState} doppler - Doppler state
   */
  handlePreviewDrag(dataCoords, doppler) {
    // Update f- position to follow mouse during preview
    doppler.fMinus = {
      time: dataCoords.time,
      freq: dataCoords.freq
    }
    
    // Calculate f₀ as midpoint for preview
    doppler.fZero = this.calculateMidpoint(doppler.fPlus, doppler.fMinus)
    
    // Store end position for renderPreviewCurve compatibility
    doppler.previewEnd = doppler.fMinus
    
    // Render the complete curve preview
    this.renderDopplerFeatures()
  }

  /**
   * Handle marker dragging
   * @param {DataCoordinates} dataCoords - Data coordinates
   * @param {DopplerState} doppler - Doppler state
   */
  handleMarkerDrag(dataCoords, doppler) {
    const newPoint = {
      time: dataCoords.time,
      freq: dataCoords.freq
    }
    
    if (doppler.draggedMarker === DopplerDraggedMarker.fPlus) {
      doppler.fPlus = newPoint
    } else if (doppler.draggedMarker === DopplerDraggedMarker.fMinus) {
      doppler.fMinus = newPoint
    } else if (doppler.draggedMarker === DopplerDraggedMarker.fZero) {
      doppler.fZero = newPoint
    }
    
    // f₀ remains fixed when dragging f+ or f- - only moves when directly dragged
    
    // Update speed calculation
    this.calculateAndUpdateDopplerSpeed()
    this.renderDopplerFeatures()
    notifyStateListeners(this.state, this.instance.stateListeners)
  }


  /**
   * Handle mouse move events in doppler mode
   * @param {MouseEvent} event - Mouse event
   * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
   */
  handleMouseMove(event, dataCoords) {
    const doppler = this.state.doppler
    
    // Handle preview drag when placing markers (not managed by BaseDragHandler)
    if (doppler.isPreviewDrag && doppler.tempFirst) {
      this.handlePreviewDrag(dataCoords, doppler)
      return
    }
    
    // Handle existing marker dragging through drag handler
    if (this.dragHandler.isDragging()) {
      this.dragHandler.handleMouseMove(dataCoords)
    } else if (doppler.fPlus || doppler.fMinus || doppler.fZero) {
      // Update cursor for hover when not dragging
      this.dragHandler.updateCursorForHover(dataCoords)
    }
  }

  /**
   * Handle mouse down events in doppler mode
   * @param {MouseEvent} event - Mouse event
   * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
   */
  handleMouseDown(event, dataCoords) {
    const doppler = this.state.doppler
    
    // Try to start drag on existing marker
    if (doppler.fPlus || doppler.fMinus || doppler.fZero) {
      const dragStarted = this.dragHandler.startDrag(dataCoords)
      if (dragStarted) {
        notifyStateListeners(this.state, this.instance.stateListeners)
        return
      }
    }
    
    // If no markers placed yet, start new placement
    if (!doppler.fPlus && !doppler.fMinus) {
      doppler.isPlacingMarkers = true
      
      // Immediately set f+ at the current position
      doppler.fPlus = {
        time: dataCoords.time,
        freq: dataCoords.freq
      }
      
      // Start preview drag mode - f- will follow the mouse
      doppler.isPreviewDrag = true
      doppler.tempFirst = doppler.fPlus // Store for reference
      
      // Initial preview with f- at same position as f+
      doppler.previewEnd = {
        time: dataCoords.time,
        freq: dataCoords.freq
      }
      
      // Render initial curve preview
      this.renderDopplerFeatures()
    }
  }

  /**
   * Handle mouse up events in doppler mode
   * @param {MouseEvent} _event - Mouse event (unused)
   * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
   */
  handleMouseUp(_event, dataCoords) {
    const doppler = this.state.doppler
    
    // Complete marker placement (preview drag mode)
    if (doppler.isPreviewDrag && doppler.tempFirst) {
      // Markers are already set during mouse move, just need to finalize
      // Ensure f+ is the later marker (higher time), f- is the earlier marker
      if (doppler.fPlus.time > doppler.fMinus.time) {
        // Correct order - keep as is
      } else {
        // Swap if f+ has earlier time than f-
        const temp = doppler.fPlus
        doppler.fPlus = doppler.fMinus
        doppler.fMinus = temp
      }
      
      // Recalculate f₀ as midpoint for final placement
      doppler.fZero = this.calculateMidpoint(doppler.fPlus, doppler.fMinus)
      
      // Store the color for this doppler curve (only when first created)
      if (!doppler.color) {
        doppler.color = this.state.selectedColor || '#ff0000'
      }
      
      // Clean up placement state
      doppler.isPlacingMarkers = false
      doppler.tempFirst = null
      doppler.isPreviewDrag = false
      doppler.previewEnd = null
      
      // Calculate speed
      this.calculateAndUpdateDopplerSpeed()
      this.renderDopplerFeatures()
      
      notifyStateListeners(this.state, this.instance.stateListeners)
      return
    }
    
    // Complete existing marker dragging through drag handler
    if (this.dragHandler.isDragging()) {
      this.dragHandler.endDrag(dataCoords)
      notifyStateListeners(this.state, this.instance.stateListeners)
    }
  }









  /**
   * Create UI elements for doppler mode
   * @param {HTMLElement} _leftColumn - Container for UI elements (unused)
   */
  createUI(_leftColumn) {
    // Initialize uiElements
    this.uiElements = {}
    
    // Speed LED is now managed centrally in the unified layout and always visible
    // Store references for central speed LED
    this.instance.speedLED = this.instance.speedLED || null
  }

  /**
   * Update LED displays for doppler mode
   * @param {CursorPosition} _coords - Current cursor coordinates
   */
  updateLEDs(_coords) {
    // Doppler mode shows Speed LED only (created in createUI)
    this.updateModeSpecificLEDs()
  }

  /**
   * Update mode-specific LED values based on current state
   */
  updateModeSpecificLEDs() {
    // Speed LED is updated via updateSpeedLED() when speed is calculated
    // No cursor-based updates needed for doppler mode
  }

  /**
   * Reset doppler-specific state
   */
  resetState() {
    this.state.doppler.fPlus = null
    this.state.doppler.fMinus = null
    this.state.doppler.fZero = null
    this.state.doppler.speed = null
    this.state.doppler.color = null
    this.state.doppler.isDragging = false
    this.state.doppler.draggedMarker = null
    this.state.doppler.isPlacingMarkers = false
    this.state.doppler.markersPlaced = 0
    this.state.doppler.tempFirst = null
    this.state.doppler.isPreviewDrag = false
    this.state.doppler.previewEnd = null
    
    // Visual updates removed - no display element
    notifyStateListeners(this.state, this.instance.stateListeners)
  }

  /**
   * Clean up doppler-specific state when switching away from doppler mode
   */
  cleanup() {
    // Only clear transient drag state, preserve marker positions
    this.state.doppler.isDragging = false
    this.state.doppler.draggedMarker = null
    this.state.doppler.isPlacingMarkers = false
    this.state.doppler.tempFirst = null
    this.state.doppler.isPreviewDrag = false
    this.state.doppler.previewEnd = null
  }
  
  /**
   * Deactivate doppler mode - hide speed LED
   */
  deactivate() {
    // Speed LED now stays visible across all modes
  }



  /**
   * Calculate and update Doppler speed
   */
  calculateAndUpdateDopplerSpeed() {
    const doppler = this.state.doppler
    
    if (doppler.fPlus && doppler.fMinus && doppler.fZero) {
      const speed = calculateDopplerSpeed(doppler.fPlus, doppler.fMinus, doppler.fZero)
      this.state.doppler.speed = speed
      
      // Update speed LED with calculated value
      this.updateSpeedLED()
      
      // Update LED displays with speed
      updateLEDDisplays(this.instance, this.state)
      notifyStateListeners(this.state, this.instance.stateListeners)
    }
  }

  /**
   * Get initial state for doppler mode
   * @returns {DopplerInitialState} Doppler-specific initial state
   */
  static getInitialState() {
    return {
      doppler: {
        fPlus: null,  // DataCoordinates: { time, frequency }
        fMinus: null, // DataCoordinates: { time, frequency }
        fZero: null,  // DataCoordinates: { time, frequency }
        speed: null,  // calculated speed in m/s
        color: null,  // color used for this doppler curve
        isDragging: false,
        draggedMarker: null, // 'fPlus', 'fMinus', 'fZero'
        isPlacingMarkers: false,
        markersPlaced: 0, // 0 = none, 1 = first placed, 2 = both placed
        tempFirst: null, // temporary storage for first marker during placement
        isPreviewDrag: false, // whether currently dragging to preview curve
        previewEnd: null // end point for preview drag
      }
    }
  }

  /**
   * Update the speed LED display with current speed value
   */
  updateSpeedLED() {
    if (this.instance.speedLED && this.state.doppler.speed !== null) {
      // Convert m/s to knots: 1 m/s = 1.94384 knots
      const speedInKnots = this.state.doppler.speed * MS_TO_KNOTS_CONVERSION
      this.instance.speedLED.querySelector('.gram-frame-led-value').textContent = speedInKnots.toFixed(1)
    } else if (this.instance.speedLED) {
      this.instance.speedLED.querySelector('.gram-frame-led-value').textContent = '0.0'
    }
  }

  /**
   * Get mouse position relative to SVG
   * @param {MouseEvent} event - Mouse event
   * @returns {ScreenCoordinates} Mouse position with x, y coordinates
   */
  getMousePosition(event) {
    const svgRect = this.instance.svg.getBoundingClientRect()
    const viewBox = this.instance.svg.viewBox.baseVal
    
    // Get screen coordinates relative to SVG element
    const screenX = event.clientX - svgRect.left
    const screenY = event.clientY - svgRect.top
    
    // Convert to SVG coordinate space if viewBox is set
    if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
      const scaleX = viewBox.width / svgRect.width
      const scaleY = viewBox.height / svgRect.height
      
      return {
        x: (screenX * scaleX) + viewBox.x,
        y: (screenY * scaleY) + viewBox.y
      }
    }
    
    // Fallback: return screen coordinates
    return {
      x: screenX,
      y: screenY
    }
  }

  /**
   * Helper to prepare viewport object for coordinate transformations
   * @returns {Object} Viewport object with margins, imageDetails, config, zoom
   */
  getViewport() {
    return {
      margins: this.instance.state.axes.margins,
      imageDetails: this.instance.state.imageDetails,
      config: this.instance.state.config,
      zoom: this.instance.state.zoom
    }
  }

  /**
   * Check if mouse is near a marker
   * @param {ScreenCoordinates} mousePos - Mouse position with x, y coordinates
   * @param {SVGCoordinates} markerSVG - Marker SVG position with x, y coordinates
   * @returns {boolean} True if mouse is near the marker
   */
  isNearMarker(mousePos, markerSVG) {
    // Use smaller threshold to avoid overlap with small curves
    return isNearMarker(mousePos, markerSVG, 20)
  }

  /**
   * Calculate distance between mouse and marker
   * @param {ScreenCoordinates} mousePos - Mouse position with x, y coordinates
   * @param {SVGCoordinates} markerSVG - Marker SVG position with x, y coordinates
   * @returns {number} Distance in pixels
   */
  getMarkerDistance(mousePos, markerSVG) {
    const dx = mousePos.x - markerSVG.x
    const dy = mousePos.y - markerSVG.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * Calculate midpoint between two markers
   * @param {DataCoordinates} fPlus - f+ marker
   * @param {DataCoordinates} fMinus - f- marker
   * @returns {DataCoordinates} Midpoint coordinates
   */
  calculateMidpoint(fPlus, fMinus) {
    return calculateMidpoint(fPlus, fMinus)
  }

  /**
   * Handle context menu (right-click) events in doppler mode
   * @param {MouseEvent} event - Mouse event
   */
  handleContextMenu(event) {
    event.preventDefault()
    this.resetState()
    this.updateSpeedLED() // Reset the speed LED display
    this.renderDopplerFeatures()
  }

  /**
   * Render all doppler features (markers and curves)
   */
  renderDopplerFeatures() {
    if (!this.instance.cursorGroup) return
    
    // Clear existing doppler features
    const existingFeatures = this.instance.cursorGroup.querySelectorAll('.doppler-feature, .gram-frame-doppler-preview, .gram-frame-doppler-curve, .gram-frame-doppler-extension, .gram-frame-doppler-fPlus, .gram-frame-doppler-fMinus, .gram-frame-doppler-crosshair')
    existingFeatures.forEach(element => element.remove())
    
    const doppler = this.state.doppler
    
    // Render preview during placement OR final markers and curves
    if (doppler.fPlus && doppler.fMinus && doppler.fZero) {
      this.renderMarkers()
      this.renderDopplerCurve()
      
      // If in preview mode, render with preview styling
      if (doppler.isPreviewDrag) {
        // Add preview styling to indicate this is temporary
        const elements = this.instance.cursorGroup.querySelectorAll('.gram-frame-doppler-curve, .gram-frame-doppler-extension')
        elements.forEach(element => {
          element.setAttribute('opacity', '0.8')
          element.setAttribute('stroke-dasharray', '5,5')
        })
      }
    }
  }

  /**
   * Render preview curve during marker placement
   * @param {DataCoordinates} start - Start point
   * @param {DataCoordinates} end - End point
   */
  renderPreviewCurve(start, end) {
    // Use the proper drawDopplerPreview function from cursors.js
    drawDopplerPreview(this.instance, start, end)
  }


  /**
   * Render doppler markers (f+, f-, f₀) with zoom awareness
   */
  renderMarkers() {
    const doppler = this.state.doppler
    
    // Use stored color for existing curve, or global selectedColor for new curves
    const color = doppler.color || this.state.selectedColor || '#ff0000'
    
    // f+ marker (colored dot)
    if (doppler.fPlus) {
      const fPlusSVG = dataToSVG(doppler.fPlus, this.getViewport(), this.instance.spectrogramImage)
      const fPlusMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      fPlusMarker.setAttribute('class', 'gram-frame-doppler-fPlus')
      fPlusMarker.setAttribute('cx', fPlusSVG.x.toString())
      fPlusMarker.setAttribute('cy', fPlusSVG.y.toString())
      fPlusMarker.setAttribute('r', '4')
      fPlusMarker.setAttribute('fill', color)
      fPlusMarker.setAttribute('stroke', '#ffffff')
      fPlusMarker.setAttribute('stroke-width', '1')
      this.instance.cursorGroup.appendChild(fPlusMarker)
    }
    
    // f- marker (colored dot)
    if (doppler.fMinus) {
      const fMinusSVG = dataToSVG(doppler.fMinus, this.getViewport(), this.instance.spectrogramImage)
      const fMinusMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      fMinusMarker.setAttribute('class', 'gram-frame-doppler-fMinus')
      fMinusMarker.setAttribute('cx', fMinusSVG.x.toString())
      fMinusMarker.setAttribute('cy', fMinusSVG.y.toString())
      fMinusMarker.setAttribute('r', '4')
      fMinusMarker.setAttribute('fill', color)
      fMinusMarker.setAttribute('stroke', '#ffffff')
      fMinusMarker.setAttribute('stroke-width', '1')
      this.instance.cursorGroup.appendChild(fMinusMarker)
    }
    
    // f₀ marker (green crosshair) - keep green as it's the midpoint indicator
    if (doppler.fZero) {
      const fZeroSVG = dataToSVG(doppler.fZero, this.getViewport(), this.instance.spectrogramImage)
      
      // Horizontal line
      const hLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      hLine.setAttribute('class', 'gram-frame-doppler-crosshair')
      hLine.setAttribute('x1', (fZeroSVG.x - 8).toString())
      hLine.setAttribute('y1', fZeroSVG.y.toString())
      hLine.setAttribute('x2', (fZeroSVG.x + 8).toString())
      hLine.setAttribute('y2', fZeroSVG.y.toString())
      hLine.setAttribute('stroke', '#00ff00')
      hLine.setAttribute('stroke-width', '2')
      this.instance.cursorGroup.appendChild(hLine)
      
      // Vertical line
      const vLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      vLine.setAttribute('class', 'gram-frame-doppler-crosshair')
      vLine.setAttribute('x1', fZeroSVG.x.toString())
      vLine.setAttribute('y1', (fZeroSVG.y - 8).toString())
      vLine.setAttribute('x2', fZeroSVG.x.toString())
      vLine.setAttribute('y2', (fZeroSVG.y + 8).toString())
      vLine.setAttribute('stroke', '#00ff00')
      vLine.setAttribute('stroke-width', '2')
      this.instance.cursorGroup.appendChild(vLine)
    }
  }

  /**
   * Render Doppler curve between markers with vertical extensions (zoom-aware)
   */
  renderDopplerCurve() {
    const doppler = this.state.doppler
    if (!doppler.fPlus || !doppler.fMinus || !doppler.fZero) return
    
    // Use stored color for existing curve, or global selectedColor for new curves
    const color = doppler.color || this.state.selectedColor || '#ff0000'
    
    const fPlusSVG = dataToSVG(doppler.fPlus, this.getViewport(), this.instance.spectrogramImage)
    const fMinusSVG = dataToSVG(doppler.fMinus, this.getViewport(), this.instance.spectrogramImage)
    const fZeroSVG = dataToSVG(doppler.fZero, this.getViewport(), this.instance.spectrogramImage)
    
    // Create S-curve path
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('class', 'gram-frame-doppler-curve')
    
    // Simple S-curve with vertical tangents (same logic as cursors.js but zoom-aware)
    const controlPoint1X = fMinusSVG.x
    const controlPoint1Y = fMinusSVG.y + (fZeroSVG.y - fMinusSVG.y) * 0.7
    const controlPoint2X = fPlusSVG.x  
    const controlPoint2Y = fPlusSVG.y + (fZeroSVG.y - fPlusSVG.y) * 0.7
    
    const pathData = `M ${fMinusSVG.x} ${fMinusSVG.y} C ${controlPoint1X} ${controlPoint1Y} ${controlPoint2X} ${controlPoint2Y} ${fPlusSVG.x} ${fPlusSVG.y}`
    
    path.setAttribute('d', pathData)
    path.setAttribute('stroke', color)
    path.setAttribute('stroke-width', '2')
    path.setAttribute('fill', 'none')
    
    this.instance.cursorGroup.appendChild(path)
    
    // Vertical extensions - clip to intersection of zoomed view and spectrogram data area
    const margins = this.instance.state.axes.margins
    const { naturalHeight } = this.instance.state.imageDetails
    const zoomLevel = this.instance.state.zoom.level
    
    // Original spectrogram data bounds (never changes)
    const spectrogramTop = margins.top
    const spectrogramBottom = margins.top + naturalHeight
    
    // Get zoomed/panned view bounds
    let zoomedTop = spectrogramTop
    let zoomedBottom = spectrogramBottom
    
    if (zoomLevel !== 1.0 && this.instance.spectrogramImage) {
      const zoomedImageTop = parseFloat(this.instance.spectrogramImage.getAttribute('y') || String(margins.top))
      const zoomedImageHeight = parseFloat(this.instance.spectrogramImage.getAttribute('height') || String(naturalHeight))
      zoomedTop = zoomedImageTop
      zoomedBottom = zoomedImageTop + zoomedImageHeight
    }
    
    // Calculate intersection bounds - extensions should not go beyond either limit
    const clippedTop = Math.max(spectrogramTop, zoomedTop)
    const clippedBottom = Math.min(spectrogramBottom, zoomedBottom)
    
    // Extension from f+ upward - only if f+ is below the clipped top
    if (fPlusSVG.y > clippedTop) {
      const fPlusExtension = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      fPlusExtension.setAttribute('class', 'gram-frame-doppler-extension')
      fPlusExtension.setAttribute('x1', fPlusSVG.x.toString())
      fPlusExtension.setAttribute('y1', fPlusSVG.y.toString())
      fPlusExtension.setAttribute('x2', fPlusSVG.x.toString())
      fPlusExtension.setAttribute('y2', clippedTop.toString())
      fPlusExtension.setAttribute('stroke', color)
      fPlusExtension.setAttribute('stroke-width', '2')
      this.instance.cursorGroup.appendChild(fPlusExtension)
    }
    
    // Extension from f- downward - only if f- is above the clipped bottom
    if (fMinusSVG.y < clippedBottom) {
      const fMinusExtension = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      fMinusExtension.setAttribute('class', 'gram-frame-doppler-extension')
      fMinusExtension.setAttribute('x1', fMinusSVG.x.toString())
      fMinusExtension.setAttribute('y1', fMinusSVG.y.toString())
      fMinusExtension.setAttribute('x2', fMinusSVG.x.toString())
      fMinusExtension.setAttribute('y2', clippedBottom.toString())
      fMinusExtension.setAttribute('stroke', color)
      fMinusExtension.setAttribute('stroke-width', '2')
      this.instance.cursorGroup.appendChild(fMinusExtension)
    }
  }


  /**
   * Render persistent features (for FeatureRenderer)
   */
  renderPersistentFeatures() {
    this.renderDopplerFeatures()
  }
}