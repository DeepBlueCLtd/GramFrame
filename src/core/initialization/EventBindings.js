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
 * Set up all event listeners for the GramFrame instance.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {SelectionControls} The bound selection and restyle functions
 */
export function setupAllEventListeners(instance) {
  // Setup mouse and SVG event listeners
  setupEventListeners(instance)
  
  // Setup ResizeObserver for responsive behavior
  setupResizeObserver(instance)
  
  // Initialize keyboard control for fine positioning
  initializeKeyboardControl(instance)
  
  // Returned for the constructor to adopt, so they are definitely assigned
  // rather than appearing on the instance from inside a helper (FR-009).
  return {
    removeHarmonicSet: (/** @type {string} */ id) => removeHarmonicSet(instance, id),
    setSelection: (/** @type {string} */ type, /** @type {string} */ id, /** @type {number} */ index) =>
      setSelection(instance, type, id, index),
    clearSelection: () => clearSelection(instance),
    updateSelectionVisuals: () => updateSelectionVisuals(instance),
    applyColorToSelectedFeature: (/** @type {string} */ color) => applyColorToSelectedFeature(instance, color),
    applySymbolToSelectedFeature: (/** @type {SymbolType} */ symbol) => applySymbolToSelectedFeature(instance, symbol),
    applyPinToSelectedFeature: (/** @type {boolean} */ showPin) => applyPinToSelectedFeature(instance, showPin),
    applyLargeSymbolsToSelectedFeature: (/** @type {boolean} */ large) => applyLargeSymbolsToSelectedFeature(instance, large)
  }
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