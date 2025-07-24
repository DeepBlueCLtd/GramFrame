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
  
  // Create Manual Harmonic button for harmonics mode (first in order)
  ledElements.manualButton = createManualHarmonicButton()
  ledElements.manualButton.style.display = 'none'
  readoutPanel.appendChild(ledElements.manualButton)
  
  // Time display - shown in both modes
  ledElements.timeLED = createLEDDisplay('Time (s)', '0.00')
  readoutPanel.appendChild(ledElements.timeLED)
  
  // Frequency display - shown in both modes (second in harmonics mode)
  ledElements.freqLED = createLEDDisplay('Frequency (Hz)', '0.00')
  readoutPanel.appendChild(ledElements.freqLED)

  
  // Speed display for Doppler mode
  ledElements.speedLED = createLEDDisplay('Speed (knots)', '0.0')
  ledElements.speedLED.style.display = 'none'
  readoutPanel.appendChild(ledElements.speedLED)
  
  // Hide other displays for backward compatibility
  ledElements.modeLED = createLEDDisplay('Mode', capitalizeFirstLetter(state.mode))
  ledElements.modeLED.style.display = 'none'
  readoutPanel.appendChild(ledElements.modeLED)
  
  ledElements.rateLED = createLEDDisplay('Rate (Hz/s)', `${state.rate}`)
  ledElements.rateLED.style.display = 'none'
  readoutPanel.appendChild(ledElements.rateLED)
  
  // Set initial display state based on current mode
  updateDisplayVisibility(ledElements, state.mode)
  
  return ledElements
}

/**
 * Updates display visibility based on current mode
 * @param {Object} ledElements - Object containing LED element references
 * @param {string} mode - Current mode ('analysis', 'harmonics', 'doppler')
 */
export function updateDisplayVisibility(ledElements, mode) {
  if (mode === 'analysis') {
    // Analysis mode: show Time and Frequency only
    ledElements.timeLED.style.display = ''
    ledElements.freqLED.style.display = ''
    if (ledElements.speedLED) {
      ledElements.speedLED.style.display = 'none'
    }
    if (ledElements.manualButton) {
      ledElements.manualButton.style.display = 'none'
    }
  } else if (mode === 'harmonics') {
    // Harmonics mode: show Frequency only, Time is not needed
    ledElements.timeLED.style.display = 'none'
    ledElements.freqLED.style.display = ''
    if (ledElements.speedLED) {
      ledElements.speedLED.style.display = 'none'
    }
    if (ledElements.manualButton) {
      ledElements.manualButton.style.display = ''
    }
  } else if (mode === 'doppler') {
    // Doppler mode: show Time, Frequency, and Speed
    ledElements.timeLED.style.display = ''
    ledElements.freqLED.style.display = ''
    if (ledElements.speedLED) {
      ledElements.speedLED.style.display = ''
    }
    if (ledElements.manualButton) {
      ledElements.manualButton.style.display = 'none'
    }
  } else {
    // Default: show Time and Frequency
    ledElements.timeLED.style.display = ''
    ledElements.freqLED.style.display = ''
    if (ledElements.speedLED) {
      ledElements.speedLED.style.display = 'none'
    }
    if (ledElements.manualButton) {
      ledElements.manualButton.style.display = 'none'
    }
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
  const modes = ['analysis', 'harmonics', 'doppler']
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
  
  // Create guidance panel (content will be set by current mode)
  const guidancePanel = document.createElement('div')
  guidancePanel.className = 'gram-frame-guidance'
  
  // Append all to mode header
  modeCell.appendChild(modesContainer)
  modeCell.appendChild(guidancePanel)
  
  return {
    modesContainer,
    modeButtons,
    guidancePanel
  }
}

/**
 * Updates guidance content based on current mode
 * @param {HTMLElement} guidancePanel - The guidance panel element
 * @param {string} mode - Current mode ('analysis', 'harmonics', 'doppler')
 */
export function updateGuidanceContent(guidancePanel, mode) {
  if (mode === 'analysis') {
    guidancePanel.innerHTML = `
      <h4>Analysis Mode</h4>
      <p>• Hover to view exact frequency/time values</p>
    `
  } else if (mode === 'harmonics') {
    guidancePanel.innerHTML = `
      <h4>Harmonics Mode</h4>
      <p>• Click & drag to generate harmonic lines</p>
      <p>• Drag existing harmonic lines to adjust spacing interval updates during drag</p>
      <p>• Manually add harmonic lines using [+ Manual] button</p>
    `
  } else if (mode === 'doppler') {
    guidancePanel.innerHTML = `
      <h4>Doppler Mode</h4>
      <p>• Drag line to give overall doppler curve</p>
      <p>• Drag markers to adjust curve</p>
      <p>• Right-click to reset</p>
    `
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
  rateInput.title = 'Rate value affects frequency calculations'
  
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
  
}

/**
 * Creates the + Manual button for harmonics mode
 * @returns {HTMLButtonElement} The manual harmonic button element
 */
export function createManualHarmonicButton() {
  const button = document.createElement('button')
  button.className = 'gram-frame-manual-button'
  button.textContent = '+ Manual'
  button.title = 'Add manual harmonic spacing'
  return button
}

/**
 * Creates and shows the manual harmonic spacing modal dialog
 * @param {Function} onAdd - Callback function when Add is clicked with valid spacing
 * @param {Function} onCancel - Callback function when Cancel is clicked
 * @returns {HTMLElement} The modal element
 */
export function createManualHarmonicModal(onAdd, onCancel) {
  // Create modal overlay
  const modalOverlay = document.createElement('div')
  modalOverlay.className = 'gram-frame-modal-overlay'
  
  // Create modal dialog
  const modal = document.createElement('div')
  modal.className = 'gram-frame-modal'
  
  // Create modal content
  modal.innerHTML = `
    <div class="gram-frame-modal-header">
      <h3>Manual Harmonic Spacing</h3>
    </div>
    <div class="gram-frame-modal-body">
      <div class="gram-frame-modal-input-group">
        <label for="harmonic-spacing-input">Harmonic spacing (Hz):</label>
        <input type="number" id="harmonic-spacing-input" min="1.0" step="0.1" placeholder="73.5">
        <div class="gram-frame-modal-error" style="display: none;">Please enter a number ≥ 1.0</div>
      </div>
    </div>
    <div class="gram-frame-modal-footer">
      <button class="gram-frame-modal-btn gram-frame-modal-cancel">❌ Cancel</button>
      <button class="gram-frame-modal-btn gram-frame-modal-add" disabled>✅ Add</button>
    </div>
  `
  
  modalOverlay.appendChild(modal)
  
  // Get elements for interaction
  /** @type {HTMLInputElement} */
  const input = modal.querySelector('#harmonic-spacing-input')
  /** @type {HTMLDivElement} */
  const errorDiv = modal.querySelector('.gram-frame-modal-error')
  /** @type {HTMLButtonElement} */
  const addButton = modal.querySelector('.gram-frame-modal-add')
  /** @type {HTMLButtonElement} */
  const cancelButton = modal.querySelector('.gram-frame-modal-cancel')
  
  // Input validation function
  function validateInput() {
    const value = parseFloat(input.value)
    const isValid = !isNaN(value) && value >= 1.0
    
    if (input.value === '') {
      // Empty input - hide error, disable button
      errorDiv.style.display = 'none'
      addButton.disabled = true
    } else if (isValid) {
      // Valid input - hide error, enable button
      errorDiv.style.display = 'none'
      addButton.disabled = false
    } else {
      // Invalid input - show error, disable button
      errorDiv.style.display = 'block'
      addButton.disabled = true
    }
  }
  
  // Add input event listeners
  input.addEventListener('input', validateInput)
  input.addEventListener('keydown', (/** @type {KeyboardEvent} */ e) => {
    if (e.key === 'Enter' && !addButton.disabled) {
      handleAdd()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  })
  
  // Add button event handlers
  function handleAdd() {
    const spacing = parseFloat(input.value)
    if (!isNaN(spacing) && spacing >= 1.0) {
      onAdd(spacing)
      document.body.removeChild(modalOverlay)
    }
  }
  
  function handleCancel() {
    onCancel()
    document.body.removeChild(modalOverlay)
  }
  
  addButton.addEventListener('click', handleAdd)
  cancelButton.addEventListener('click', handleCancel)
  
  // Close modal when clicking overlay (outside modal)
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      handleCancel()
    }
  })
  
  // Add to DOM and focus input
  document.body.appendChild(modalOverlay)
  input.focus()
  
  return modalOverlay
}
