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
 * Write the value into an LED display.
 *
 * The value span is created with the LED and never removed, so a missing one is
 * a bug rather than a state to render around — but reading it out is still a
 * `querySelector`, and four call sites were each dereferencing the result
 * unguarded. One place to do it, one place to be wrong.
 * @param {HTMLElement} led - LED element created by `createLEDDisplay`
 * @param {string} value - Text to display
 */
export function setLEDValue(led, value) {
  const valueDiv = led.querySelector('.gram-frame-led-value')
  if (valueDiv) {
    valueDiv.textContent = value
  }
}

/**
 * Update global LED displays (mode and rate only)
 * Mode-specific LEDs are now managed by individual modes
 * @param {GramFrame} instance - GramFrame instance with global LEDs
 * @param {GramFrameState} state - Current state object
 */
export function updateLEDDisplays(instance, state) {
  // Update global mode LED display
  if (instance.ui.modeLED) {
    setLEDValue(instance.ui.modeLED, getModeDisplayName(state.mode))
  }
  
  // Update global rate LED display
  if (instance.ui.rateLED) {
    setLEDValue(instance.ui.rateLED, `${state.rate}`)
  }
  
  // Color picker visibility is now managed by individual modes
}