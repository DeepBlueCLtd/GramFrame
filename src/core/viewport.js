/**
 * Viewport module for GramFrame
 * 
 * This module handles zoom and pan functionality for the spectrogram viewport,
 * including coordinate transformations and zoom state management.
 */

/// <reference path="../types.js" />

import { applyZoomTransform, updateSVGLayout, renderAxes } from '../components/table.js'
import { updateCommandButtonStates, updateModeButtonStates } from '../components/ModeButtons.js'
import { notifyStateListeners } from './state.js'

/**
 * Zoom in by increasing zoom level
 * @param {GramFrame} instance - GramFrame instance
 */
export function zoomIn(instance) {
  const currentLevel = instance.state.zoom.level
  const newLevel = Math.min(currentLevel * 1.5, 10.0) // Max 10x zoom
  setZoom(instance, newLevel, instance.state.zoom.centerX, instance.state.zoom.centerY)
}

/**
 * Zoom out by decreasing zoom level
 * @param {GramFrame} instance - GramFrame instance
 */
export function zoomOut(instance) {
  const currentLevel = instance.state.zoom.level
  const newLevel = Math.max(currentLevel / 1.5, 1.0) // Min 1x zoom
  setZoom(instance, newLevel, instance.state.zoom.centerX, instance.state.zoom.centerY)
}

/**
 * Reset zoom to 1x
 * @param {GramFrame} instance - GramFrame instance
 */
export function zoomReset(instance) {
  setZoom(instance, 1.0, 0.5, 0.5)
}

/**
 * Set zoom level and center point
 * @param {GramFrame} instance - GramFrame instance
 * @param {number} level - Zoom level (1.0 = no zoom)
 * @param {number} centerX - Center X (0-1 normalized)
 * @param {number} centerY - Center Y (0-1 normalized)
 */
export function setZoom(instance, level, centerX, centerY) {
  // Update state
  instance.state.zoom.level = level
  instance.state.zoom.centerX = centerX
  instance.state.zoom.centerY = centerY
  
  // Apply zoom transform
  if (instance.svg) {
    applyZoomTransform(instance)
  }
  
  // Update zoom control states
  updateZoomControlStates(instance)
  
  // Notify listeners
  notifyStateListeners(instance.state, instance.stateListeners)
}

/**
 * Update zoom control button states based on current zoom level
 * @param {GramFrame} instance - GramFrame instance
 */
export function updateZoomControlStates(instance) {
  // Update command button states for all modes (zoom buttons are now in pan mode)
  if (instance.commandButtons && instance.modes) {
    updateCommandButtonStates(instance.commandButtons, instance.modes)
  }
  
  // Update mode button states (enabled/disabled)
  if (instance.modeButtons && instance.modes) {
    updateModeButtonStates(instance.modeButtons, instance.modes)
    
    // Switch away from pan mode if currently active but now disabled
    if (instance.state.mode === 'pan' && instance.modes.pan && !instance.modes.pan.isEnabled() && instance.state.previousMode) {
      instance._switchMode(instance.state.previousMode)
    }
  }
}

/**
 * Handle resize events
 * @param {GramFrame} instance - GramFrame instance
 */
export function handleResize(instance) {
  if (instance.svg) {
    updateSVGLayout(instance)
    renderAxes(instance)
  }
}

/**
 * Update axes when rate changes
 * @param {GramFrame} instance - GramFrame instance
 */
export function updateAxes(instance) {
  if (instance.axesGroup) {
    renderAxes(instance)
  }
}