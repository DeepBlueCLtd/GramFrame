/**
 * The manual harmonic-spacing dialog.
 *
 * Built with `createElement` and class-scoped selectors, like
 * `MarkerLabelModal` (R9-08). It used to be the single `innerHTML` template in
 * the tree, and it injected four page-global ids -- `harmonic-spacing-input`,
 * `spacing-error`, `cancel-button`, `add-button`. `cancel-button` and
 * `add-button` in particular are names a host training page could easily use
 * itself, and a page with two grams had two of each. Ids that generic have no
 * business escaping a component that is dropped into someone else's document.
 *
 * The label wraps its input rather than pointing at one by id, so the
 * association needs no unique name at all.
 */

/// <reference path="../../types.js" />

import { calculateVisibleDataRange } from '../../utils/coordinates.js'

/** Smallest spacing the dialog will accept, in Hz. */
const MIN_MANUAL_SPACING = 0.1

/**
 * Calculate the center of the visible time period based on current zoom state
 * @param {GramFrameState} state - Current harmonics mode state
 * @param {GramFrame} instance - GramFrame instance for accessing zoom state
 * @returns {number} Center time of visible period
 */
function calculateVisibleTimePeriodCenter(state, instance) {
  // Use epsilon comparison for floating point zoom level check
  const ZOOM_EPSILON = 0.001
  if (Math.abs(state.zoom.level - 1.0) < ZOOM_EPSILON) {
    // Not zoomed (zoom level close to 1.0) - use full time range center
    return (state.config.timeMin + state.config.timeMax) / 2
  }
  
  // Zoomed - calculate visible time range center
  const visibleRange = calculateVisibleDataRange(instance.state, instance.ui.spectrogramImage)
  return (visibleRange.timeMin + visibleRange.timeMax) / 2
}

/**
 * Show the manual harmonic-spacing dialog.
 *
 * Self-closing: it removes itself on Add, Cancel, Escape, or a click on the
 * backdrop, and returns focus to whatever opened it.
 * @param {GramFrameState} state - Current harmonics mode state
 * @param {Function} addHarmonicSet - Function to add a harmonic set (anchorTime, spacing)
 * @param {GramFrame} instance - GramFrame instance for accessing zoom state
 * @returns {HTMLDivElement} The overlay element, for callers that need to dismiss it
 */
export function showManualHarmonicModal(state, addHarmonicSet, instance) {
  const overlay = document.createElement('div')
  overlay.className = 'gram-frame-modal-overlay gram-frame-manual-harmonic-modal'

  const modal = document.createElement('div')
  modal.className = 'gram-frame-modal'

  const header = document.createElement('div')
  header.className = 'gram-frame-modal-header'
  const heading = document.createElement('h3')
  heading.textContent = 'Add Manual Harmonics'
  header.appendChild(heading)

  const body = document.createElement('div')
  body.className = 'gram-frame-modal-body'
  const inputGroup = document.createElement('div')
  inputGroup.className = 'gram-frame-modal-input-group'

  // The label wraps the input, so the two are associated without an id that
  // could collide with the host page's own.
  const inputLabel = document.createElement('label')
  inputLabel.appendChild(document.createTextNode('Harmonic spacing (Hz):'))

  const spacingInput = document.createElement('input')
  spacingInput.type = 'number'
  spacingInput.className = 'gram-frame-harmonic-spacing-input'
  spacingInput.min = String(MIN_MANUAL_SPACING)
  spacingInput.step = String(MIN_MANUAL_SPACING)
  spacingInput.placeholder = 'Enter spacing in Hz'
  inputLabel.appendChild(spacingInput)

  const errorDiv = document.createElement('div')
  errorDiv.className = 'gram-frame-modal-error gram-frame-spacing-error'
  errorDiv.style.display = 'none'
  errorDiv.textContent = `Please enter a number ≥ ${MIN_MANUAL_SPACING}`

  inputGroup.appendChild(inputLabel)
  inputGroup.appendChild(errorDiv)
  body.appendChild(inputGroup)

  const footer = document.createElement('div')
  footer.className = 'gram-frame-modal-footer'
  const cancelButton = document.createElement('button')
  cancelButton.type = 'button'
  cancelButton.className = 'gram-frame-modal-btn gram-frame-modal-cancel'
  cancelButton.textContent = 'Cancel'
  const addButton = document.createElement('button')
  addButton.type = 'button'
  addButton.className = 'gram-frame-modal-btn gram-frame-modal-add'
  addButton.textContent = 'Add'
  addButton.disabled = true
  footer.appendChild(cancelButton)
  footer.appendChild(addButton)

  modal.appendChild(header)
  modal.appendChild(body)
  modal.appendChild(footer)
  overlay.appendChild(modal)

  // Remembered before the dialog steals focus, so it can be given back.
  const opener = /** @type {HTMLElement|null} */ (document.activeElement)

  document.body.appendChild(overlay)

  /**
   * Enable Add only for a spacing the harmonic machinery can actually draw,
   * and say why when it cannot.
   */
  const validateInput = () => {
    const value = parseFloat(spacingInput.value)
    const isValid = !isNaN(value) && value >= MIN_MANUAL_SPACING

    if (spacingInput.value.trim() === '') {
      errorDiv.style.display = 'none'
      addButton.disabled = true
    } else if (!isValid) {
      errorDiv.style.display = 'block'
      addButton.disabled = true
    } else {
      errorDiv.style.display = 'none'
      addButton.disabled = false
    }
  }

  /**
   * Remove the dialog and hand focus back to whatever opened it.
   *
   * Without the restore, `document.activeElement` was left on `<body>` after
   * every Save or Cancel, so a keyboard user was returned to the top of the
   * document rather than to the button they pressed (R9-08).
   */
  function closeModal() {
    document.removeEventListener('keydown', onDocumentKeydown, true)
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay)
    }
    if (opener && typeof opener.focus === 'function' && opener.isConnected) {
      opener.focus()
    }
  }

  /**
   * Commit the entered spacing and close.
   */
  function addHarmonic() {
    const spacing = parseFloat(spacingInput.value)
    if (!isNaN(spacing) && spacing >= MIN_MANUAL_SPACING) {
      // Determine anchor time: use cursor position if available, otherwise center of visible time period
      let anchorTime
      if (state.cursorPosition) {
        anchorTime = state.cursorPosition.time
      } else {
        // Use center of visible time period (zoom-aware)
        anchorTime = calculateVisibleTimePeriodCenter(state, instance)
      }
      addHarmonicSet(anchorTime, spacing)
      closeModal()
    }
  }

  /**
   * Escape closes the dialog wherever the focus happens to be.
   *
   * Bound on the document, in the capture phase, rather than on the input:
   * Escape used to work only while the text field had focus, so tabbing to
   * Cancel and pressing it left the dialog open with no way out but the mouse.
   * The listener is removed on close, and the event is stopped so it cannot
   * also reach the component's own document-level key handling.
   * @param {KeyboardEvent} e - The key event
   */
  function onDocumentKeydown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      e.preventDefault()
      closeModal()
    }
  }

  spacingInput.addEventListener('input', validateInput)
  spacingInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !addButton.disabled) {
      addHarmonic()
    }
  })
  document.addEventListener('keydown', onDocumentKeydown, true)

  cancelButton.addEventListener('click', closeModal)
  addButton.addEventListener('click', addHarmonic)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal()
    }
  })

  spacingInput.focus()

  return overlay
}
