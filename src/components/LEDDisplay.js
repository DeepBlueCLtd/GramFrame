/**
 * LED Display Component for GramFrame
 * 
 * Provides LED-style display elements for showing measurement values
 */

/// <reference path="../types.js" />

import { getModeDisplayName } from '../utils/calculations.js'


/**
 * Creates a single LED display element
 * @param {string} label - Display label
 * @param {string} value - Initial display value
 * @returns {HTMLDivElement} The LED display element
 */
export function createLEDDisplay(label, value) {
  const led = document.createElement('div')
  led.className = 'gram-frame-led'
  
  // Create label element safely
  const labelDiv = document.createElement('div')
  labelDiv.className = 'gram-frame-led-label'
  labelDiv.textContent = label
  
  // Create value element safely
  const valueDiv = document.createElement('div')
  valueDiv.className = 'gram-frame-led-value'
  valueDiv.textContent = value
  
  led.appendChild(labelDiv)
  led.appendChild(valueDiv)
  return led
}

/**
 * Update global LED displays (mode and rate only)
 * Mode-specific LEDs are now managed by individual modes
 * @param {GramFrame} instance - GramFrame instance with global LEDs
 * @param {GramFrameState} state - Current state object
 */
export function updateLEDDisplays(instance, state) {
  // Update global mode LED display
  if (instance.modeLED) {
    instance.modeLED.querySelector('.gram-frame-led-value').textContent = getModeDisplayName(state.mode)
  }
  
  // Update global rate LED display
  if (instance.rateLED) {
    instance.rateLED.querySelector('.gram-frame-led-value').textContent = `${state.rate}`
  }
  
  // Color picker visibility is now managed by individual modes
}