/**
 * UI Components for GramFrame
 * 
 * This module provides functions for creating and managing UI elements
 * including LED displays, mode switching buttons, and rate input controls.
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
  
  // Time display - shown in both modes
  ledElements.timeLED = createLEDDisplay('Time', '0.00 s')
  readoutPanel.appendChild(ledElements.timeLED)
  
  // Frequency display - shown in both modes
  ledElements.freqLED = createLEDDisplay('Frequency', '0.00 Hz')
  readoutPanel.appendChild(ledElements.freqLED)
  
  // Speed display - only shown in Doppler mode
  ledElements.speedLED = createLEDDisplay('Speed', '0.0 knots')
  readoutPanel.appendChild(ledElements.speedLED)
  
  // Hide other displays for backward compatibility
  ledElements.modeLED = createLEDDisplay('Mode', capitalizeFirstLetter(state.mode))
  ledElements.modeLED.style.display = 'none'
  readoutPanel.appendChild(ledElements.modeLED)
  
  ledElements.deltaTimeLED = createLEDDisplay('ΔTime', '0.00 s')
  ledElements.deltaTimeLED.style.display = 'none'
  readoutPanel.appendChild(ledElements.deltaTimeLED)
  
  ledElements.deltaFreqLED = createLEDDisplay('ΔFreq', '0 Hz')
  ledElements.deltaFreqLED.style.display = 'none'
  readoutPanel.appendChild(ledElements.deltaFreqLED)
  
  ledElements.rateLED = createLEDDisplay('Rate', `${state.rate} Hz/s`)
  ledElements.rateLED.style.display = 'none'
  readoutPanel.appendChild(ledElements.rateLED)
  
  // Set initial display state based on current mode
  updateDisplayVisibility(ledElements, state.mode)
  
  return ledElements
}

/**
 * Updates display visibility based on current mode
 * @param {Object} ledElements - Object containing LED element references
 * @param {string} mode - Current mode ('analysis' or 'doppler')
 */
export function updateDisplayVisibility(ledElements, mode) {
  if (mode === 'analysis') {
    // Analysis mode: show Time and Frequency only
    ledElements.timeLED.style.display = ''
    ledElements.freqLED.style.display = ''
    ledElements.speedLED.style.display = 'none'
  } else if (mode === 'doppler') {
    // Doppler mode: show Time, Frequency, and Speed
    ledElements.timeLED.style.display = ''
    ledElements.freqLED.style.display = ''
    ledElements.speedLED.style.display = ''
  }
}

/**
 * Creates mode switching button UI
 * @param {HTMLElement} modeCell - Container element for mode buttons
 * @param {GramFrameState} state - Current state object
 * @param {Function} modeSwitchCallback - Callback function for mode switching
 * @returns {Object} Object containing mode UI elements
 */
export function createModeSwitchingUI(modeCell, state, modeSwitchCallback) {
  // Create mode buttons container
  const modesContainer = document.createElement('div')
  modesContainer.className = 'gram-frame-modes'
  
  // Create mode buttons
  const modes = ['analysis', 'doppler']
  const modeButtons = {}
  
  modes.forEach(mode => {
    const button = document.createElement('button')
    button.className = 'gram-frame-mode-btn'
    button.textContent = capitalizeFirstLetter(mode)
    button.dataset.mode = mode
    
    // Set active state for current mode
    if (mode === state.mode) {
      button.classList.add('active')
    }
    
    // Add click handler
    button.addEventListener('click', () => {
      modeSwitchCallback(mode)
    })
    
    modeButtons[mode] = button
    modesContainer.appendChild(button)
  })
  
  // Append to mode header
  modeCell.appendChild(modesContainer)
  
  return {
    modesContainer,
    modeButtons
  }
}

/**
 * Creates rate input control
 * @param {HTMLElement} container - Container element for rate input
 * @param {GramFrameState} state - Current state object
 * @param {Function} rateChangeCallback - Callback function for rate changes
 * @returns {HTMLInputElement} The rate input element
 */
export function createRateInput(container, state, rateChangeCallback) {
  // Create rate input container
  const rateContainer = document.createElement('div')
  rateContainer.className = 'gram-frame-rate'
  
  // Create label
  const label = document.createElement('label')
  label.textContent = 'Rate:'
  rateContainer.appendChild(label)
  
  // Create input
  const rateInput = document.createElement('input')
  rateInput.type = 'number'
  rateInput.min = '0.1'
  rateInput.step = '0.1'
  rateInput.value = String(state.rate)
  rateInput.title = 'Rate value affects Doppler speed calculations'
  
  // Add change handler
  rateInput.addEventListener('change', () => {
    const rate = parseFloat(rateInput.value)
    if (!isNaN(rate) && rate >= 0.1) {
      rateChangeCallback(rate)
    } else {
      // Reset to previous valid value if invalid input
      rateInput.value = String(state.rate)
    }
  })
  
  rateContainer.appendChild(rateInput)
  
  // Create unit indicator
  const unit = document.createElement('span')
  unit.textContent = 'Hz/s'
  unit.className = 'gram-frame-rate-unit'
  rateContainer.appendChild(unit)
  
  // Hide rate input for now (not in mockup design)
  rateContainer.style.display = 'none'
  container.appendChild(rateContainer)
  
  return rateInput
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
 * Update all LED displays based on current state
 * @param {Object} ledElements - Object containing LED element references
 * @param {GramFrameState} state - Current state object
 */
export function updateLEDDisplays(ledElements, state) {
  // Update mode LED display
  if (ledElements.modeLED) {
    ledElements.modeLED.querySelector('.gram-frame-led-value').textContent = capitalizeFirstLetter(state.mode)
  }
  
  // Hide/show doppler-specific LEDs based on mode
  if (state.mode === 'doppler') {
    ledElements.deltaTimeLED.style.display = 'block'
    ledElements.deltaFreqLED.style.display = 'block'
    ledElements.speedLED.style.display = 'block'
    
    // Update doppler-specific values if available
    if (state.doppler.deltaTime !== null) {
      ledElements.deltaTimeLED.querySelector('.gram-frame-led-value').textContent = `ΔT: ${state.doppler.deltaTime.toFixed(2)} s`
    } else {
      ledElements.deltaTimeLED.querySelector('.gram-frame-led-value').textContent = 'ΔT: 0.00 s'
    }
    
    if (state.doppler.deltaFrequency !== null) {
      ledElements.deltaFreqLED.querySelector('.gram-frame-led-value').textContent = `ΔF: ${state.doppler.deltaFrequency.toFixed(0)} Hz`
    } else {
      ledElements.deltaFreqLED.querySelector('.gram-frame-led-value').textContent = 'ΔF: 0 Hz'
    }
    
    if (state.doppler.speed !== null) {
      ledElements.speedLED.querySelector('.gram-frame-led-value').textContent = `Speed: ${state.doppler.speed.toFixed(1)} knots`
    } else {
      ledElements.speedLED.querySelector('.gram-frame-led-value').textContent = 'Speed: 0.0 knots'
    }
  } else {
    ledElements.deltaTimeLED.style.display = 'none'
    ledElements.deltaFreqLED.style.display = 'none'
    ledElements.speedLED.style.display = 'none'
  }
  
  if (!state.cursorPosition) {
    // Show default values when no cursor position
    ledElements.freqLED.querySelector('.gram-frame-led-value').textContent = 'Freq: 0.00 Hz'
    ledElements.timeLED.querySelector('.gram-frame-led-value').textContent = 'Time: 0.00 s'
    return
  }
  
  // Mode-specific LED formatting
  if (state.mode === 'analysis' && state.dragState.isDragging && state.harmonics.baseFrequency !== null) {
    // For Analysis mode during drag, show base frequency for harmonics
    const baseFreqValue = state.harmonics.baseFrequency.toFixed(1)
    ledElements.freqLED.querySelector('.gram-frame-led-value').textContent = `Base: ${baseFreqValue} Hz`
    
    // Still show time
    const timeValue = state.cursorPosition.time.toFixed(2)
    ledElements.timeLED.querySelector('.gram-frame-led-value').textContent = `Time: ${timeValue} s`
  } else {
    // For normal mode operation - use 1 decimal place for frequency as per spec
    const freqValue = state.cursorPosition.freq.toFixed(1)
    ledElements.freqLED.querySelector('.gram-frame-led-value').textContent = `Freq: ${freqValue} Hz`
    
    // Update time LED - use 2 decimal places as per spec
    const timeValue = state.cursorPosition.time.toFixed(2)
    ledElements.timeLED.querySelector('.gram-frame-led-value').textContent = `Time: ${timeValue} s`
  }
}

/**
 * Update mode LED display
 * @param {HTMLElement} modeLED - Mode LED element
 * @param {string} mode - Current mode
 */
export function updateModeLED(modeLED, mode) {
  modeLED.querySelector('.gram-frame-led-value').textContent = capitalizeFirstLetter(mode)
}

/**
 * Update rate LED display
 * @param {HTMLElement} rateLED - Rate LED element
 * @param {number} rate - Current rate value
 */
export function updateRateLED(rateLED, rate) {
  rateLED.querySelector('.gram-frame-led-value').textContent = `${rate} Hz/s`
}