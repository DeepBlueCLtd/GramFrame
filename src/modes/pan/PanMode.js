import { BaseMode } from '../BaseMode.js'
import { notifyStateListeners } from '../../core/state.js'

/**
 * Pan mode - allows users to pan around the spectrogram when zoomed in
 * Extends BaseMode to provide pan functionality as a proper interaction mode
 */
export class PanMode extends BaseMode {
  /**
   * Constructor for pan mode
   * @param {GramFrame} instance - GramFrame instance
   * @param {GramFrameState} state - GramFrame state object
   */
  constructor(instance, state) {
    super(instance, state)
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
    if (this.instance.svg && this.state.zoom.level > 1.0) {
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
    if (this.state.zoom.level <= 1.0) {
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
    if (!this.isDragging || this.state.zoom.level <= 1.0) {
      return
    }
    
    // Calculate pixel delta
    const deltaX = event.clientX - this.dragState.lastX
    const deltaY = event.clientY - this.dragState.lastY
    
    // Convert pixel delta to normalized delta (considering zoom level)
    const { naturalWidth, naturalHeight } = this.state.imageDetails
    const margins = this.state.axes.margins
    const svgRect = this.instance.svg.getBoundingClientRect()
    
    // Scale factor based on current zoom and SVG size
    const scaleX = (naturalWidth + margins.left + margins.right) / svgRect.width
    const scaleY = (naturalHeight + margins.top + margins.bottom) / svgRect.height
    
    // Convert to normalized coordinates (adjust for zoom level)
    const normalizedDeltaX = -(deltaX * scaleX / naturalWidth) / this.state.zoom.level
    const normalizedDeltaY = -(deltaY * scaleY / naturalHeight) / this.state.zoom.level
    
    // Apply pan
    this.panImage(normalizedDeltaX, normalizedDeltaY)
    
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
    if (this.instance.svg && this.state.zoom.level > 1.0) {
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
      if (this.instance.svg && this.state.zoom.level > 1.0) {
        this.instance.svg.style.cursor = 'grab'
      }
    }
  }

  /**
   * Pan the image by adjusting the center point
   * @param {number} deltaX - Change in X position (normalized -1 to 1)
   * @param {number} deltaY - Change in Y position (normalized -1 to 1)
   */
  panImage(deltaX, deltaY) {
    if (this.state.zoom.level <= 1.0) {
      return // No panning when not zoomed
    }
    
    // Calculate new center point, constrained to valid range
    const newCenterX = Math.max(0, Math.min(1, this.state.zoom.centerX + deltaX))
    const newCenterY = Math.max(0, Math.min(1, this.state.zoom.centerY + deltaY))
    
    // Update zoom with new center point
    this.setZoom(this.state.zoom.level, newCenterX, newCenterY)
  }

  /**
   * Set zoom level and center point
   * @param {number} level - Zoom level (1.0 = no zoom)
   * @param {number} centerX - Center X (0-1 normalized)
   * @param {number} centerY - Center Y (0-1 normalized)
   */
  setZoom(level, centerX, centerY) {
    // Update state
    this.state.zoom.level = level
    this.state.zoom.centerX = centerX
    this.state.zoom.centerY = centerY
    
    // Apply zoom transform
    if (this.instance.svg) {
      import('../../components/table.js').then(({ applyZoomTransform }) => {
        applyZoomTransform(this.instance)
      })
    }
    
    // Note: zoom button states will be updated by the main zoom change handler
    
    // Notify listeners
    notifyStateListeners(this.state, this.instance.stateListeners)
  }

  /**
   * Get guidance text for pan mode
   * @returns {string} HTML content for the guidance panel
   */
  getGuidanceText() {
    return `
      <h4>Pan Mode</h4>
      <p>• Pan is only available when image is zoomed in</p>
      <p>• Click and drag to pan the view when zoomed in</p>
      <p>• Use the zoom controls to zoom in before panning</p>
    `
  }

  /**
   * Reset pan-specific state
   */
  resetState() {
    this.isDragging = false
    this.dragState = { lastX: 0, lastY: 0 }
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