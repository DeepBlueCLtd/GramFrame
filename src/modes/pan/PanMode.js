import { BaseMode } from '../BaseMode.js'
import { getVersion } from '../../utils/version.js'
import { pixelDeltaToNormalizedPan, panByNormalized } from '../../core/viewport.js'
import { WHEEL_NAV_GUIDANCE } from '../../utils/wheelGuidance.js'

/**
 * Pan mode - allows users to pan around the spectrogram when zoomed in
 * Extends BaseMode to provide pan functionality as a proper interaction mode
 */
export class PanMode extends BaseMode {
  /**
   * Constructor for pan mode
   * @param {GramFrame} instance - GramFrame instance
   */
  constructor(instance) {
    super(instance)
    this.isDragging = false
    this.dragState = {
      lastX: 0,
      lastY: 0
    }
  }

  /**
   * Activate pan mode
   */
  activate() {
    // Set cursor to grab if zoomed
    if (this.instance.svg && this.instance.state.zoom.level > 1.0) {
      this.instance.svg.style.cursor = 'grab'
    }
    
    // Reset any existing drag state
    this.isDragging = false
    this.dragState = { lastX: 0, lastY: 0 }
  }

  /**
   * Deactivate pan mode
   */
  deactivate() {
    // Reset cursor
    if (this.instance.svg) {
      this.instance.svg.style.cursor = 'crosshair'
    }
    
    // Clear drag state
    this.isDragging = false
    this.dragState = { lastX: 0, lastY: 0 }
  }

  /**
   * Handle mouse down events - start pan drag
   * @param {MouseEvent} event - Mouse event
   * @param {DataCoordinates} _dataCoords - Data coordinates (unused)
   */
  handleMouseDown(event, _dataCoords) {
    // Only allow panning when zoomed
    if (this.instance.state.zoom.level <= 1.0) {
      return
    }
    
    // Start drag
    this.isDragging = true
    this.dragState = {
      lastX: event.clientX,
      lastY: event.clientY
    }
    
    // Change cursor to grabbing
    if (this.instance.svg) {
      this.instance.svg.style.cursor = 'grabbing'
    }
    
    // Prevent default to avoid text selection
    event.preventDefault()
  }

  /**
   * Handle mouse move events - perform pan if dragging
   * @param {MouseEvent} event - Mouse event
   * @param {DataCoordinates} _dataCoords - Data coordinates (unused)
   */
  handleMouseMove(event, _dataCoords) {
    if (!this.isDragging || this.instance.state.zoom.level <= 1.0) {
      return
    }
    
    // Calculate pixel delta
    const deltaX = event.clientX - this.dragState.lastX
    const deltaY = event.clientY - this.dragState.lastY

    // Convert pixel delta to normalized delta (shared with wheel-pan) and apply
    const { normalizedDeltaX, normalizedDeltaY } = pixelDeltaToNormalizedPan(this.instance, deltaX, deltaY)
    panByNormalized(this.instance, normalizedDeltaX, normalizedDeltaY)

    // Update drag state
    this.dragState.lastX = event.clientX
    this.dragState.lastY = event.clientY
  }

  /**
   * Handle mouse up events - end pan drag
   * @param {MouseEvent} _event - Mouse event (unused)
   * @param {DataCoordinates} _dataCoords - Data coordinates (unused)
   */
  handleMouseUp(_event, _dataCoords) {
    if (!this.isDragging) {
      return
    }
    
    // End drag
    this.isDragging = false
    
    // Restore cursor to grab (pan mode still active)
    if (this.instance.svg && this.instance.state.zoom.level > 1.0) {
      this.instance.svg.style.cursor = 'grab'
    }
  }

  /**
   * Handle mouse leave events
   */
  handleMouseLeave() {
    // End drag if mouse leaves the SVG area
    if (this.isDragging) {
      this.isDragging = false
      
      // Restore cursor
      if (this.instance.svg && this.instance.state.zoom.level > 1.0) {
        this.instance.svg.style.cursor = 'grab'
      }
    }
  }

  /**
   * Get guidance content for pan mode.
   *
   * Pan is the initial mode, so its guidance carries the global mouse-wheel
   * instructions (which apply in every mode) as their own titled section, plus a
   * section for the pan-specific interactions.
   * @returns {Object} Structured guidance content (multi-section)
   */
  getGuidanceText() {
    return {
      sections: [
        {
          title: 'Mouse-Wheel',
          items: WHEEL_NAV_GUIDANCE
        },
        {
          title: 'Pan Mode',
          items: [
            'Click and drag to pan the view (when zoomed in)',
            'Use + / − to zoom in and out',
            `GramFrame v${getVersion()}`
          ]
        }
      ]
    }
  }

  /**
   * Reset pan-specific state
   */
  resetState() {
    this.isDragging = false
    this.dragState = { lastX: 0, lastY: 0 }
  }

  /**
   * Check if pan mode is enabled.
   *
   * Pan mode is always selectable — it is the initial mode, and staying in it at
   * zoom level 1 is the intended way to avoid accidentally placing markers on a
   * click. Panning itself is still gated on being zoomed in (see handleMouseDown
   * / panByNormalized); at zoom 1 a click simply does nothing.
   * @returns {boolean} Always true
   */
  isEnabled() {
    return true
  }

  /**
   * Get command buttons for pan mode
   * @returns {Array<CommandButton>} Array of command button definitions
   */
  getCommandButtons() {
    return [
      {
        label: '−',
        title: 'Zoom Out',
        action: () => this.instance._zoomOut(),
        isEnabled: () => this.instance.state.zoom.level > 1.0
      },
      {
        label: '+',
        title: 'Zoom In',
        action: () => this.instance._zoomIn(),
        isEnabled: () => this.instance.state.zoom.level < 10.0
      }
    ]
  }

  /**
   * Get initial state for pan mode
   * @returns {Object} Pan mode initial state
   */
  static getInitialState() {
    return {
      // Pan mode doesn't need persistent state
      // Pan position is stored in zoom.centerX/centerY
    }
  }
}