/**
 * Cursor and visual indicator rendering
 */

/// <reference path="../types.js" />

/**
 * Update cursor indicators based on current mode and state
 * @param {GramFrame} instance - GramFrame instance
 */
export function updateCursorIndicators(instance) {
  // Clear any existing cursor visuals
  if (instance.cursorGroup) {
    instance.cursorGroup.innerHTML = ''
  }
  
  // Only render persistent features and mode-specific elements (no cursor crosshairs)
  if (instance.featureRenderer) {
    instance.featureRenderer.renderAllPersistentFeatures()
  }
}
