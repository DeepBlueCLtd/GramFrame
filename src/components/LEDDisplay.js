/**
 * LED Display Component for GramFrame
 * 
 * Provides LED-style display elements for showing measurement values
 */

/// <reference path="../types.js" />

import { capitalizeFirstLetter } from '../utils/calculations.js'

/**
 * Create LED display elements for showing measurement values
 * @param {HTMLElement} readoutPanel - Container element for LED displays
 * @param {GramFrameState} state - Current state object
 * @returns {Object} Object containing references to all LED elements
 */
export function createLEDDisplays(readoutPanel, state) {
  const ledElements = {}
  
  // Time display
  ledElements.timeLED = createLEDDisplay('Time (mm:ss)', '00:00')
  readoutPanel.appendChild(ledElements.timeLED)
  
  // Frequency display
  ledElements.freqLED = createLEDDisplay('Frequency (Hz)', '0.00')
  readoutPanel.appendChild(ledElements.freqLED)
  
  // Mode display
  ledElements.modeLED = createLEDDisplay('Mode', capitalizeFirstLetter(state.mode))
  ledElements.modeLED.style.display = 'none'
  readoutPanel.appendChild(ledElements.modeLED)
  
  // Rate display
  ledElements.rateLED = createLEDDisplay('Rate (Hz/s)', `${state.rate}`)
  ledElements.rateLED.style.display = 'none'
  readoutPanel.appendChild(ledElements.rateLED)
  
  // Color picker is now created by individual modes (harmonics and analysis)
  
  return ledElements
}

/**
 * Creates a single LED display element
 * @param {string} label - Display label
 * @param {string} value - Initial display value
 * @returns {HTMLDivElement} The LED display element
 */
export function createLEDDisplay(label, value) {
  const led = document.createElement('div')
  led.className = 'gram-frame-led'
  led.innerHTML = `
    <div class="gram-frame-led-label">${label}</div>
    <div class="gram-frame-led-value">${value}</div>
  `
  return led
}

/**
 * Update global LED displays (mode and rate only)
 * Mode-specific LEDs are now managed by individual modes
 * @param {Object} instance - GramFrame instance with global LEDs
 * @param {GramFrameState} state - Current state object
 */
export function updateLEDDisplays(instance, state) {
  // Update global mode LED display
  if (instance.modeLED) {
    instance.modeLED.querySelector('.gram-frame-led-value').textContent = capitalizeFirstLetter(state.mode)
  }
  
  // Update global rate LED display
  if (instance.rateLED) {
    instance.rateLED.querySelector('.gram-frame-led-value').textContent = `${state.rate}`
  }
  
  // Color picker visibility is now managed by individual modes
}