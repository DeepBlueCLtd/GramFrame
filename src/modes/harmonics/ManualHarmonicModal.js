/**
 * Manual Harmonic Modal
 * Extracted from HarmonicsMode.showManualHarmonicModal
 *
 * @param {GramFrameState} state - Current harmonics mode state
 * @param {Function} addHarmonicSet - Function to add a harmonic set (anchorTime, spacing)
 */
export function showManualHarmonicModal(state, addHarmonicSet) {
  // Create modal overlay
  const overlay = document.createElement('div')
  overlay.className = 'gram-frame-modal-overlay'

  // Create modal dialog
  const modal = document.createElement('div')
  modal.className = 'gram-frame-modal'

  // Create modal content
  modal.innerHTML = `
    <div class="gram-frame-modal-header">
      <h3>Add Manual Harmonics</h3>
    </div>
    <div class="gram-frame-modal-body">
      <label for="harmonic-spacing-input">Harmonic spacing (Hz):</label>
      <input type="number" id="harmonic-spacing-input" min="0.1" step="0.1" placeholder="Enter spacing in Hz">
      <div class="gram-frame-modal-error" id="spacing-error" style="display: none; color: red; font-size: 12px; margin-top: 5px;">
        Please enter a number ≥ 0.1
      </div>
    </div>
    <div class="gram-frame-modal-footer">
      <button class="gram-frame-modal-cancel" id="cancel-button">Cancel</button>
      <button class="gram-frame-modal-add" id="add-button" disabled>Add</button>
    </div>
  `

  overlay.appendChild(modal)
  document.body.appendChild(overlay)

  // Get modal elements
  const spacingInput = /** @type {HTMLInputElement} */ (modal.querySelector('#harmonic-spacing-input'))
  const errorDiv = /** @type {HTMLDivElement} */ (modal.querySelector('#spacing-error'))
  const cancelButton = /** @type {HTMLButtonElement} */ (modal.querySelector('#cancel-button'))
  const addButton = /** @type {HTMLButtonElement} */ (modal.querySelector('#add-button'))

  // Input validation
  const validateInput = () => {
    const value = parseFloat(spacingInput.value)
    const isValid = !isNaN(value) && value >= 0.1

    if (spacingInput.value.trim() === '') {
      // Empty input - hide error, disable button
      errorDiv.style.display = 'none'
      addButton.disabled = true
    } else if (!isValid) {
      // Invalid input - show error, disable button
      errorDiv.style.display = 'block'
      addButton.disabled = true
    } else {
      // Valid input - hide error, enable button
      errorDiv.style.display = 'none'
      addButton.disabled = false
    }
  }

  // Add input event listeners
  spacingInput.addEventListener('input', validateInput)
  spacingInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !addButton.disabled) {
      addHarmonic()
    } else if (e.key === 'Escape') {
      closeModal()
    }
  })

  // Close modal function
  function closeModal() {
    document.body.removeChild(overlay)
  }

  // Add harmonic function
  function addHarmonic() {
    const spacing = parseFloat(spacingInput.value)
    if (!isNaN(spacing) && spacing >= 0.1) {
      // Determine anchor time: use cursor position if available, otherwise midpoint
      let anchorTime
      if (state.cursorPosition) {
        anchorTime = state.cursorPosition.time
      } else {
        // Use midpoint of time range
        anchorTime = (state.config.timeMin + state.config.timeMax) / 2
      }
      addHarmonicSet(anchorTime, spacing)
      closeModal()
    }
  }

  // Event listeners
  cancelButton.addEventListener('click', closeModal)
  addButton.addEventListener('click', addHarmonic)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal()
    }
  })

  // Focus the input
  spacingInput.focus()
}
