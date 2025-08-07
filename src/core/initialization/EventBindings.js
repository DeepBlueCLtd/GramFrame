/**
 * Event Bindings module for GramFrame initialization
 * 
 * This module handles event listener registration and cleanup during GramFrame
 * initialization and destruction. It centralizes all event-related setup to
 * improve maintainability and ensure proper cleanup.
 */

/// <reference path="../../types.js" />

import { setupEventListeners, setupResizeObserver } from '../events.js'
import { initializeKeyboardControl, setSelection, clearSelection, updateSelectionVisuals, removeHarmonicSet } from '../keyboardControl.js'
import { getGlobalStateListeners } from '../state.js'

/**
 * Set up all event listeners for the GramFrame instance
 * @param {GramFrame} instance - GramFrame instance
 */
export function setupAllEventListeners(instance) {
  // Setup mouse and SVG event listeners
  setupEventListeners(instance)
  
  // Setup ResizeObserver for responsive behavior
  setupResizeObserver(instance)
  
  // Initialize keyboard control for fine positioning
  initializeKeyboardControl(instance)
  
  // Store keyboard control functions on instance for easy access
  instance.setSelection = (type, id, index) => setSelection(instance, type, id, index)
  instance.clearSelection = () => clearSelection(instance)
  instance.updateSelectionVisuals = () => updateSelectionVisuals(instance)
  instance.removeHarmonicSet = (id) => removeHarmonicSet(instance, id)
}

/**
 * Set up state listeners for the GramFrame instance
 * @param {GramFrame} instance - GramFrame instance
 */
export function setupStateListeners(instance) {
  // Apply any globally registered listeners to this new instance
  getGlobalStateListeners().forEach(listener => {
    if (!instance.stateListeners.includes(listener)) {
      instance.stateListeners.push(listener)
    }
  })
}