/**
 * Pin style for GramFrame pin sets.
 *
 * A two-option segmented control in the style panel deciding whether a pin set
 * — a harmonic set, or a sideband set (issue #241) — draws full-height vertical
 * pin lines or short mini-pins. The short style is what experienced analysts
 * use to stack many sets over dense data without the lines swamping it.
 *
 * TALL / MINI rather than a "Tall Pins" checkbox, because that is what the
 * choice actually is (issue #232): a pin-less set still draws mini-pins, so an
 * unchecked box was naming an option that does not exist. Both options are now
 * on screen and neither has to be inferred.
 *
 * When a pin set is selected and the panel is targeting it, choosing restyles
 * that set in place; otherwise the choice is written to
 * `state.showHarmonicPin` and applied to the next created set. The preference
 * is tall at the start of each browser session and remembered (sessionStorage)
 * for the rest of it.
 *
 * The choice has no meaning for analysis markers (they have no pin), so the
 * control is disabled while a marker is targeted, and says why on hover.
 */

/// <reference path="../types.js" />

import { savePinPreference } from '../core/preferences.js'
import { dispatch } from '../core/state.js'
import { createSegmented } from './Segmented.js'
import { showStorageWarning, clearStorageWarning } from './StorageWarning.js'

/**
 * The control's handle.
 * @typedef {Object} PinControl
 * @property {function(boolean): void} setValue - Show tall pins as chosen, or mini
 * @property {function(boolean): void} setEnabled - Enable or disable the control
 */

/**
 * Create the pin-style control.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {{element: HTMLElement, control: PinControl}} The control and its handle
 */
export function createPinToggle(instance) {
  const state = instance.state
  const segmented = createSegmented(
    [{ value: true, label: 'Tall' }, { value: false, label: 'Mini' }],
    'Pin style',
    (showPin) => choosePinStyle(instance, showPin, segmented.setValue)
  )
  segmented.element.classList.add('gram-frame-pin-toggle')
  segmented.setValue(state.showHarmonicPin !== false)

  /** @type {PinControl} */
  const control = {
    setValue(showPin) {
      segmented.setValue(showPin)
    },
    setEnabled(enabled) {
      segmented.setEnabled(enabled, 'Tall pins apply to harmonic and sideband sets only')
    }
  }

  return { element: segmented.element, control }
}

/**
 * Route a chosen pin style: to the targeted pin set, or to the defaults for the
 * next created one.
 * @param {GramFrame} instance - GramFrame instance
 * @param {boolean} showPin - Whether pins are drawn full height
 * @param {function(boolean): void} show - Reflect the choice in the control
 * @returns {void}
 */
function choosePinStyle(instance, showPin, show) {
  const state = instance.state
  const apply = instance.interaction.applyPinToSelectedFeature
  if (!apply || !apply(showPin)) {
    state.showHarmonicPin = showPin
    // The choice applies immediately either way; the warning only says it will
    // not survive the next page load (GF-16).
    if (savePinPreference(showPin)) {
      clearStorageWarning(instance)
    } else {
      showStorageWarning(instance, 'The pin preference could not be saved — it applies to this page only.')
    }
    // Dispatch: this is a state change listeners care about, and only the
    // "Large" toggle used to say so (issue #268, BH-30).
    dispatch(instance)
  }
  show(showPin)
}
