import { BaseMode } from '../BaseMode.js'
import { updateLEDDisplays, createLEDDisplay } from '../../components/UIComponents.js'
import { notifyStateListeners } from '../../core/state.js'
// Rendering imports removed - no display element
import { 
  calculateDopplerSpeed
} from '../../utils/doppler.js'

// Constants
const MS_TO_KNOTS_CONVERSION = 1.94384

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

  // Mouse event handlers removed - no display element









  /**
   * Create UI elements for doppler mode
   * @param {HTMLElement} readoutPanel - Container for UI elements
   */
  createUI(readoutPanel) {
    this.uiElements = {}
    
    // Create Speed LED display
    this.uiElements.speedLED = createLEDDisplay('Speed (knots)', '0.0')
    readoutPanel.appendChild(this.uiElements.speedLED)
    
    // Store references on instance for compatibility
    this.instance.speedLED = this.uiElements.speedLED
  }

  /**
   * Update LED displays for doppler mode
   * @param {Object} _coords - Current cursor coordinates
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
   * @returns {Object} Doppler-specific initial state
   */
  static getInitialState() {
    return {
      doppler: {
        fPlus: null,  // DopplerPoint: { time, frequency }
        fMinus: null, // DopplerPoint: { time, frequency }
        fZero: null,  // DopplerPoint: { time, frequency }
        speed: null,  // calculated speed in m/s
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
    if (this.uiElements.speedLED && this.state.doppler.speed !== null) {
      // Convert m/s to knots: 1 m/s = 1.94384 knots
      const speedInKnots = this.state.doppler.speed * MS_TO_KNOTS_CONVERSION
      this.uiElements.speedLED.querySelector('.gram-frame-led-value').textContent = speedInKnots.toFixed(1)
    } else if (this.uiElements.speedLED) {
      this.uiElements.speedLED.querySelector('.gram-frame-led-value').textContent = '0.0'
    }
  }
}