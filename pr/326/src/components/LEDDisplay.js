/**
 * LED Display Component for GramFrame
 * 
 * Provides LED-style display elements for showing measurement values
 */

/// <reference path="../types.js" />

import { getModeDisplayName } from '../modes/modeRoster.js'


/**
 * Creates a single LED display element.
 *
 * Three pieces of text, because the readout has three audiences. The `label`
 * is the full name ("Time (mm:ss)") and is the LED's accessible name — visually
 * hidden, since the column's own kicker already says what is being read and
 * repeating it costs the control row height it does not have. The `unit` is
 * what an instrument prints beside a number ("MM:SS"), set small and to the
 * right. The optional `caption` is a short word shown to the left of the value,
 * for a readout that needs naming in place rather than by the column.
 * @param {string} label - Full display name; the accessible name
 * @param {string} value - Initial display value
 * @param {string} [unit] - Unit shown beside the value
 * @param {string} [caption] - Short visible name shown before the value
 * @returns {HTMLDivElement} The LED display element
 */
export function createLEDDisplay(label, value, unit, caption) {
  const led = document.createElement('div')
  led.className = 'gram-frame-led'

  const labelDiv = document.createElement('div')
  labelDiv.className = 'gram-frame-led-label gram-frame-visually-hidden'
  labelDiv.textContent = label
  led.appendChild(labelDiv)

  if (caption) {
    const captionDiv = document.createElement('div')
    captionDiv.className = 'gram-frame-led-caption'
    captionDiv.textContent = caption
    led.appendChild(captionDiv)
  }

  const valueDiv = document.createElement('div')
  valueDiv.className = 'gram-frame-led-value'
  valueDiv.textContent = value
  led.appendChild(valueDiv)

  if (unit) {
    const unitDiv = document.createElement('div')
    unitDiv.className = 'gram-frame-led-unit'
    unitDiv.textContent = unit
    led.appendChild(unitDiv)
  }

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
 * Update global LED displays (mode and frequency rate only)
 * Mode-specific LEDs are now managed by individual modes
 * @param {GramFrame} instance - GramFrame instance with global LEDs
 * @param {GramFrameState} state - Current state object
 */
export function updateLEDDisplays(instance, state) {
  // Update global mode LED display
  if (instance.ui.modeLED) {
    setLEDValue(instance.ui.modeLED, getModeDisplayName(state.mode))
  }
  
  // Update global frequency-rate LED display
  if (instance.ui.frequencyRateLED) {
    setLEDValue(instance.ui.frequencyRateLED, `${state.frequencyRate}`)
  }
  
  // Color picker visibility is now managed by individual modes
}