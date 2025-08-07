/**
 * Base drag handler for shared drag functionality across modes
 * 
 * This module provides common drag patterns and lifecycle management
 * that can be used by Analysis, Harmonics, and Doppler modes to eliminate
 * duplicate drag handling code.
 */

/// <reference path="../../types.js" />

/**
 * @typedef {Object} DragTarget
 * @property {string} id - Unique identifier for the drag target
 * @property {string} type - Type of target ('marker', 'harmonicSet', 'dopplerMarker')
 * @property {DataCoordinates} position - Current position of the target
 * @property {Object} [data] - Additional target-specific data
 */

/**
 * @typedef {Object} DragState
 * @property {boolean} isDragging - Whether a drag operation is active
 * @property {string|null} draggedTargetId - ID of the target being dragged
 * @property {string|null} draggedTargetType - Type of the target being dragged
 * @property {DataCoordinates|null} dragStartPosition - Initial position when drag started
 * @property {Object|null} originalData - Original state data before drag started
 */

/**
 * @typedef {Object} DragCallbacks
 * @property {function(DragTarget, DataCoordinates): void} onDragStart - Called when drag starts
 * @property {function(DragTarget, DataCoordinates, DataCoordinates): void} onDragUpdate - Called during drag
 * @property {function(DragTarget, DataCoordinates): void} onDragEnd - Called when drag ends
 * @property {function(DataCoordinates): DragTarget|null} findTargetAt - Find drag target at position
 * @property {function(string): void} [updateCursor] - Update cursor style during drag
 */

/**
 * Base drag handler class for managing drag operations
 */
export class BaseDragHandler {
  /**
   * Create a new BaseDragHandler
   * @param {Object} instance - Mode instance
   * @param {DragCallbacks} callbacks - Drag lifecycle callbacks
   */
  constructor(instance, callbacks) {
    this.instance = instance
    this.callbacks = callbacks
    
    /** @type {DragState} */
    this.dragState = {
      isDragging: false,
      draggedTargetId: null,
      draggedTargetType: null,
      dragStartPosition: null,
      originalData: null
    }
  }

  /**
   * Check if currently dragging
   * @returns {boolean} True if drag operation is active
   */
  isDragging() {
    return this.dragState.isDragging
  }

  /**
   * Get the current dragged target information
   * @returns {Object|null} Drag target info or null if not dragging
   */
  getDraggedTarget() {
    if (!this.dragState.isDragging) return null
    
    return {
      id: this.dragState.draggedTargetId,
      type: this.dragState.draggedTargetType,
      startPosition: this.dragState.dragStartPosition,
      originalData: this.dragState.originalData
    }
  }

  /**
   * Handle mouse move events for drag operations
   * @param {DataCoordinates} currentPosition - Current mouse position in data coordinates
   */
  handleMouseMove(currentPosition) {
    if (!this.dragState.isDragging) return
    
    const target = {
      id: this.dragState.draggedTargetId,
      type: this.dragState.draggedTargetType,
      position: currentPosition
    }
    
    // Call the mode-specific drag update callback
    this.callbacks.onDragUpdate(target, currentPosition, this.dragState.dragStartPosition)
  }

  /**
   * Start a drag operation
   * @param {DataCoordinates} position - Position where drag started
   * @returns {boolean} True if drag started successfully, false otherwise
   */
  startDrag(position) {
    if (this.dragState.isDragging) return false
    
    // Find target at the given position
    const target = this.callbacks.findTargetAt(position)
    if (!target) return false
    
    // Initialize drag state
    this.dragState.isDragging = true
    this.dragState.draggedTargetId = target.id
    this.dragState.draggedTargetType = target.type
    this.dragState.dragStartPosition = { ...position }
    this.dragState.originalData = target.data ? { ...target.data } : null
    
    // Update cursor style
    if (this.callbacks.updateCursor) {
      this.callbacks.updateCursor('grabbing')
    }
    
    // Call the mode-specific drag start callback
    this.callbacks.onDragStart(target, position)
    
    return true
  }

  /**
   * End the current drag operation
   * @param {DataCoordinates} position - Position where drag ended
   */
  endDrag(position) {
    if (!this.dragState.isDragging) return
    
    const target = {
      id: this.dragState.draggedTargetId,
      type: this.dragState.draggedTargetType,
      position: position
    }
    
    // Call the mode-specific drag end callback
    this.callbacks.onDragEnd(target, position)
    
    // Reset cursor style
    if (this.callbacks.updateCursor) {
      this.callbacks.updateCursor('crosshair')
    }
    
    // Clear drag state
    this.dragState.isDragging = false
    this.dragState.draggedTargetId = null
    this.dragState.draggedTargetType = null
    this.dragState.dragStartPosition = null
    this.dragState.originalData = null
  }

  /**
   * Cancel the current drag operation without applying changes
   */
  cancelDrag() {
    if (!this.dragState.isDragging) return
    
    // Reset cursor style
    if (this.callbacks.updateCursor) {
      this.callbacks.updateCursor('crosshair')
    }
    
    // Clear drag state without calling onDragEnd
    this.dragState.isDragging = false
    this.dragState.draggedTargetId = null
    this.dragState.draggedTargetType = null
    this.dragState.dragStartPosition = null
    this.dragState.originalData = null
  }

  /**
   * Update cursor style based on proximity to drag targets
   * @param {DataCoordinates} position - Current mouse position
   */
  updateCursorForHover(position) {
    if (this.dragState.isDragging) return
    
    const target = this.callbacks.findTargetAt(position)
    const cursorStyle = target ? 'grab' : 'crosshair'
    
    if (this.callbacks.updateCursor) {
      this.callbacks.updateCursor(cursorStyle)
    }
  }

  /**
   * Reset drag handler state
   */
  reset() {
    this.cancelDrag()
  }

  /**
   * Clean up drag handler resources
   */
  cleanup() {
    this.reset()
  }
}

/**
 * Utility function to calculate distance between two data coordinates
 * @param {DataCoordinates} pos1 - First position
 * @param {DataCoordinates} pos2 - Second position
 * @returns {number} Distance in data coordinate space
 */
export function calculateDataDistance(pos1, pos2) {
  const freqDiff = pos1.freq - pos2.freq
  const timeDiff = pos1.time - pos2.time
  return Math.sqrt(freqDiff * freqDiff + timeDiff * timeDiff)
}

/**
 * Utility function to check if a position is within tolerance of a target
 * @param {DataCoordinates} position - Position to check
 * @param {DataCoordinates} targetPosition - Target position
 * @param {number} tolerance - Tolerance in data coordinate units
 * @returns {boolean} True if within tolerance
 */
export function isWithinTolerance(position, targetPosition, tolerance) {
  return calculateDataDistance(position, targetPosition) <= tolerance
}