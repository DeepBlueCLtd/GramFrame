import { BaseMode } from '../BaseMode.js'
import { updateLEDDisplays } from '../../components/UIComponents.js'
import { notifyStateListeners } from '../../core/state.js'
import { updateCursorIndicators } from '../../rendering/cursors.js'
import { 
  calculateDopplerSpeed,
  screenToDopplerData,
  isNearMarker,
  dopplerDataToSVG
} from '../../utils/doppler.js'
// Import Doppler rendering functions
import {
  drawDopplerMarker,
  drawDopplerCurve,
  drawDopplerVerticalExtensions,
  drawDopplerPreview
} from '../../rendering/cursors.js'

/**
 * Doppler mode implementation
 * Handles Doppler marker placement, dragging, and speed calculations
 */
export class DopplerMode extends BaseMode {
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
   * Handle mouse click events - place Doppler markers
   * @param {MouseEvent} event - The mouse click event
   * @param {Object} coords - Coordinate information
   */
  handleClick(event, coords) {
    const doppler = this.state.doppler
    
    // If we're placing markers
    if (doppler.markersPlaced < 2) {
      const dataCoords = {
        time: coords.dataCoords.time,
        frequency: coords.dataCoords.freq
      }
      
      if (doppler.markersPlaced === 0) {
        // Start drag preview mode - don't place marker yet
        this.state.doppler.tempFirst = dataCoords
        this.state.doppler.isPreviewDrag = true
        this.state.doppler.previewEnd = dataCoords
      } else if (doppler.markersPlaced === 1) {
        // Place second marker and determine which is f+ vs f- based on time
        const firstMarker = this.state.doppler.tempFirst
        const secondMarker = dataCoords
        
        // Assign f- and f+ based on time order (f- = earlier, f+ = later)
        if (firstMarker.time < secondMarker.time) {
          this.state.doppler.fMinus = firstMarker  // earlier time = f-
          this.state.doppler.fPlus = secondMarker  // later time = f+
        } else {
          this.state.doppler.fMinus = secondMarker  // earlier time = f-
          this.state.doppler.fPlus = firstMarker   // later time = f+
        }
        
        // Clean up temporary marker
        this.state.doppler.tempFirst = null
        this.state.doppler.markersPlaced = 2
        
        // Calculate initial f₀ as midpoint
        this.state.doppler.fZero = {
          time: (this.state.doppler.fMinus.time + this.state.doppler.fPlus.time) / 2,
          frequency: (this.state.doppler.fMinus.frequency + this.state.doppler.fPlus.frequency) / 2
        }
        
        // Calculate initial speed
        this.calculateAndUpdateDopplerSpeed()
      }
      
      // Update displays
      updateCursorIndicators(this.instance)
      notifyStateListeners(this.state, this.instance.stateListeners)
    }
  }

  /**
   * Handle mouse down events for Doppler marker dragging
   * @param {MouseEvent} event - The mouse down event
   * @param {Object} coords - Coordinate information
   */
  handleMouseDown(event, coords) {
    const doppler = this.state.doppler
    const cursorPos = { 
      x: coords.svgCoords.x,
      y: coords.svgCoords.y
    }
    
    // Check if we're clicking near any existing markers for dragging
    if (doppler.fPlus) {
      const fPlusSVG = dopplerDataToSVG(doppler.fPlus, this.instance)
      if (isNearMarker(cursorPos, fPlusSVG, 15)) {
        this.state.doppler.isDragging = true
        this.state.doppler.draggedMarker = 'fPlus'
        return
      }
    }
    
    if (doppler.fMinus) {
      const fMinusSVG = dopplerDataToSVG(doppler.fMinus, this.instance)
      if (isNearMarker(cursorPos, fMinusSVG, 15)) {
        this.state.doppler.isDragging = true
        this.state.doppler.draggedMarker = 'fMinus'
        return
      }
    }
    
    if (doppler.fZero) {
      const fZeroSVG = dopplerDataToSVG(doppler.fZero, this.instance)
      if (isNearMarker(cursorPos, fZeroSVG, 15)) {
        this.state.doppler.isDragging = true
        this.state.doppler.draggedMarker = 'fZero'
        return
      }
    }
    
    // If not near any markers, handle normal click for placement
    this.handleClick(event, coords)
  }

  /**
   * Handle mouse move events during dragging
   * @param {MouseEvent} event - The mouse move event
   * @param {Object} coords - Coordinate information
   */
  handleMouseMove(event, coords) {
    if (this.state.doppler.isDragging) {
      this.handleDopplerMarkerDrag(coords)
    } else if (this.state.doppler.isPreviewDrag) {
      this.handleDopplerPreviewDrag(coords)
    }
  }

  /**
   * Handle mouse up events - end dragging or place markers
   * @param {MouseEvent} event - The mouse up event
   * @param {Object} coords - Coordinate information
   */
  handleMouseUp(event, coords) {
    // End Doppler preview drag and place markers
    if (this.state.doppler.isPreviewDrag) {
      const firstMarker = this.state.doppler.tempFirst
      const secondMarker = this.state.doppler.previewEnd
      
      // Assign f- and f+ based on time order (f- = earlier, f+ = later)
      if (firstMarker.time < secondMarker.time) {
        this.state.doppler.fMinus = firstMarker  // earlier time = f-
        this.state.doppler.fPlus = secondMarker  // later time = f+
      } else {
        this.state.doppler.fMinus = secondMarker  // earlier time = f-
        this.state.doppler.fPlus = firstMarker   // later time = f+
      }
      
      // Calculate initial f₀ as midpoint
      this.state.doppler.fZero = {
        time: (this.state.doppler.fMinus.time + this.state.doppler.fPlus.time) / 2,
        frequency: (this.state.doppler.fMinus.frequency + this.state.doppler.fPlus.frequency) / 2
      }
      
      // Calculate initial speed
      this.calculateAndUpdateDopplerSpeed()
      
      // Clean up preview state
      this.state.doppler.isPreviewDrag = false
      this.state.doppler.tempFirst = null
      this.state.doppler.previewEnd = null
      this.state.doppler.markersPlaced = 2
      
      // Update displays
      updateCursorIndicators(this.instance)
      notifyStateListeners(this.state, this.instance.stateListeners)
    }
    // End Doppler drag state
    else if (this.state.doppler.isDragging) {
      this.state.doppler.isDragging = false
      this.state.doppler.draggedMarker = null
      notifyStateListeners(this.state, this.instance.stateListeners)
    }
  }

  /**
   * Handle right-click context menu for reset
   * @param {MouseEvent} event - The context menu event
   */
  handleContextMenu(event) {
    event.preventDefault()
    this.resetState()
    return false
  }

  /**
   * Render doppler mode indicators and curve
   * @param {SVGElement} svg - The SVG container element
   */
  render(svg) {
    const doppler = this.state.doppler
    
    // Draw preview during drag
    if (doppler.isPreviewDrag && doppler.tempFirst && doppler.previewEnd) {
      drawDopplerPreview(this.instance, doppler.tempFirst, doppler.previewEnd)
    }
    // Draw final markers and curve if placed
    else {
      // Draw markers if they exist
      if (doppler.fMinus) {
        drawDopplerMarker(this.instance, doppler.fMinus, 'fMinus')
      }
      if (doppler.fPlus) {
        drawDopplerMarker(this.instance, doppler.fPlus, 'fPlus')
      }
      if (doppler.fZero) {
        drawDopplerMarker(this.instance, doppler.fZero, 'fZero')
      }
      
      // Draw the curve if both f+ and f- exist
      if (doppler.fPlus && doppler.fMinus) {
        drawDopplerCurve(this.instance, doppler.fPlus, doppler.fMinus, doppler.fZero)
        drawDopplerVerticalExtensions(this.instance, doppler.fPlus, doppler.fMinus)
      }
    }
  }

  /**
   * Update LED displays for doppler mode
   * @param {Object} coords - Current cursor coordinates
   */
  updateLEDs(coords) {
    // Doppler mode: show Speed LED only, hide Time and Frequency
    if (this.instance.timeLED) {
      this.instance.timeLED.style.display = 'none'
    }
    if (this.instance.freqLED) {
      this.instance.freqLED.style.display = 'none'
    }
    if (this.instance.speedLED) {
      this.instance.speedLED.style.display = ''
    }
    if (this.instance.manualButton) {
      this.instance.manualButton.style.display = 'none'
    }
  }

  /**
   * Reset doppler-specific state
   */
  resetState() {
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
    
    // Update displays
    updateCursorIndicators(this.instance)
    notifyStateListeners(this.state, this.instance.stateListeners)
  }

  /**
   * Clean up doppler-specific state when switching away from doppler mode
   */
  cleanup() {
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
  }

  /**
   * Handle dragging of Doppler markers
   * @param {Object} coords - Current cursor coordinates
   */
  handleDopplerMarkerDrag(coords) {
    const doppler = this.state.doppler
    const draggedMarker = doppler.draggedMarker
    
    if (!draggedMarker || !coords.dataCoords) return
    
    // Convert current cursor position to data coordinates
    const newDataCoords = {
      time: coords.dataCoords.time,
      frequency: coords.dataCoords.freq
    }
    
    // Update the dragged marker
    this.state.doppler[draggedMarker] = newDataCoords
    
    // If dragging f+ or f-, update f₀ to midpoint
    if (draggedMarker === 'fPlus' || draggedMarker === 'fMinus') {
      if (doppler.fPlus && doppler.fMinus) {
        this.state.doppler.fZero = {
          time: (doppler.fPlus.time + doppler.fMinus.time) / 2,
          frequency: (doppler.fPlus.frequency + doppler.fMinus.frequency) / 2
        }
      }
    }
    
    // Recalculate speed
    this.calculateAndUpdateDopplerSpeed()
    
    // Update display
    updateCursorIndicators(this.instance)
  }

  /**
   * Handle Doppler preview drag during initial line drawing
   * @param {Object} coords - Current cursor coordinates
   */
  handleDopplerPreviewDrag(coords) {
    if (!coords.dataCoords) return
    
    // Update preview end point to current cursor position
    this.state.doppler.previewEnd = {
      time: coords.dataCoords.time,
      frequency: coords.dataCoords.freq
    }
    
    // Update display
    updateCursorIndicators(this.instance)
  }

  /**
   * Calculate and update Doppler speed
   */
  calculateAndUpdateDopplerSpeed() {
    const doppler = this.state.doppler
    
    if (doppler.fPlus && doppler.fMinus && doppler.fZero) {
      const speed = calculateDopplerSpeed(doppler.fPlus, doppler.fMinus, doppler.fZero)
      this.state.doppler.speed = speed
      
      // Update LED displays with speed
      updateLEDDisplays(this.instance, this.state)
      notifyStateListeners(this.state, this.instance.stateListeners)
    }
  }
}