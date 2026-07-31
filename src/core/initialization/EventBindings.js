/**
 * Event Bindings module for GramFrame initialization
 * 
 * This module handles event listener registration and cleanup during GramFrame
 * initialization and destruction. It centralizes all event-related setup to
 * improve maintainability and ensure proper cleanup.
 */

/// <reference path="../../types.js" />

import { setupEventListeners, setupResizeObserver } from '../events.js'
import { initializeKeyboardControl, setSelection, clearSelection, updateSelectionVisuals, removeHarmonicSet, applyColorToSelectedFeature, applySymbolToSelectedFeature, applyPinToSelectedFeature, applyLargeSymbolsToSelectedFeature } from '../keyboardControl.js'

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
  instance.applyColorToSelectedFeature = (color) => applyColorToSelectedFeature(instance, color)
  instance.applySymbolToSelectedFeature = (symbol) => applySymbolToSelectedFeature(instance, symbol)
  instance.applyPinToSelectedFeature = (showPin) => applyPinToSelectedFeature(instance, showPin)
  instance.applyLargeSymbolsToSelectedFeature = (large) => applyLargeSymbolsToSelectedFeature(instance, large)
}

/**
 * Set up state listeners for the GramFrame instance.
 *
 * Nothing to copy: global listeners are unioned in at delivery time by
 * `deliverToListeners`, so a new instance is already reachable by every
 * listener registered before it existed. This step remains as the named
 * initialization point for per-instance listeners (spec 167, FR-003).
 * @param {GramFrame} _instance - GramFrame instance
 */
export function setupStateListeners(_instance) {
}