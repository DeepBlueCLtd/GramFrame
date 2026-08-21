/**
 * Pin visibility toggle for GramFrame overlays.
 *
 * A checkbox in the style panel's Pin sets band (see ColorPicker.js) that
 * controls whether a pin set — a harmonic set, or a sideband set (issue #241) —
 * draws its full-height vertical pin lines. Pins are the only style in that
 * panel that pin sets alone understand, which is why the band is fenced off
 * below a rule. With the toggle off, a set renders as its symbols and numbers
 * over short mini-pins — the style experienced analysts use to stack many sets
 * over dense data without the lines swamping it.
 *
 * It is labelled "Tall Pins" rather than "Pin" because a pin-less set still
 * draws mini-pins (issue #232): the choice is between tall pins and short ones,
 * not between pins and none.
 *
 * When a pin set is selected, toggling restyles that set in place; otherwise
 * the choice is written to `state.showHarmonicPin` and applied to the next
 * created set. The preference is on at the start of each browser session
 * and remembered (sessionStorage) for the rest of it.
 *
 * The toggle has no meaning for analysis markers (they have no pin), so it is
 * disabled while a marker is selected.
 */

/// <reference path="../types.js" />

import { savePinPreference } from '../core/storage.js'
import { showStorageWarning, clearStorageWarning } from './StorageWarning.js'

/**
 * Create the pin toggle row.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {HTMLLabelElement} The toggle row element
 */
export function createPinToggle(instance) {
  const state = instance.state

  const row = document.createElement('label')
  row.className = 'gram-frame-pin-toggle'
  row.title = 'Draw harmonic and sideband sets with full-height pin lines instead of mini-pins'

  const checkbox = document.createElement('input')
  checkbox.type = 'checkbox'
  checkbox.className = 'gram-frame-pin-toggle-input'
  checkbox.checked = state.showHarmonicPin !== false
  checkbox.setAttribute('aria-label', 'Show tall pins')

  const text = document.createElement('span')
  text.className = 'gram-frame-pin-toggle-label'
  text.textContent = 'Tall Pins'

  row.appendChild(checkbox)
  row.appendChild(text)

  checkbox.addEventListener('change', () => {
    const showPin = checkbox.checked
    // Route to the selected pin set — harmonic or sideband — when one is
    // selected (restyle in place), otherwise set the style for the next created
    // set and remember it for the rest of the session.
    if (!instance.interaction.applyPinToSelectedFeature || !instance.interaction.applyPinToSelectedFeature(showPin)) {
      state.showHarmonicPin = showPin
      // The choice applies immediately either way; the warning only says it
      // will not survive the next page load (GF-16).
      if (savePinPreference(showPin)) {
        clearStorageWarning(instance)
      } else {
        showStorageWarning(instance, 'The pin preference could not be saved — it applies to this page only.')
      }
    }
  })

  // Expose a control handle so selection changes can reflect the selected
  // set's pin state back into the checkbox.
  instance.interaction._pinControl = {
    /** @param {boolean} showPin */
    setValue(showPin) {
      checkbox.checked = showPin
    },
    /** @param {boolean} enabled */
    setEnabled(enabled) {
      checkbox.disabled = !enabled
      row.classList.toggle('gram-frame-pin-toggle-disabled', !enabled)
      row.title = enabled
        ? 'Draw harmonic and sideband sets with full-height pin lines instead of mini-pins'
        : 'Tall pins apply to harmonic and sideband sets only'
    }
  }

  return row
}
