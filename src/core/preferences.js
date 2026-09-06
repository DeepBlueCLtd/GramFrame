/**
 * The two chrome preferences.
 *
 * Neither is annotation. The pin style says how a set an analyst is *about* to
 * draw should look; the guidance collapse says how much explanation this reader
 * needs. Both outlive a single gram and neither belongs in the annotation
 * record, which is why they are keyed on their own — and why they are here
 * rather than in `core/storage.js`, which is about the annotations and their
 * merge.
 *
 * They are stored in different places on purpose, and each says why below.
 *
 * Every read has a default and every write is allowed to fail: a browser in
 * private mode, or with site data blocked, must still give a working panel.
 */

/// <reference path="../types.js" />

/**
 * Shared prefix, so one `gramframe::` namespace covers the preferences and the
 * annotations alike.
 * @type {string}
 */
const KEY_PREFIX = 'gramframe::'

/**
 * Key holding whether a newly created pin set draws full-height pins.
 *
 * `sessionStorage`: the choice belongs to the sets being drawn in this sitting,
 * not to the analyst for ever.
 * @type {string}
 */
const PIN_PREF_KEY = `${KEY_PREFIX}pref::harmonicPin`

/**
 * Key holding whether the guidance column is collapsed to its rail.
 *
 * `localStorage`, not `sessionStorage` like the pin preference: the pin is a
 * property of the sets being drawn and so belongs to the sitting, while a
 * collapsed rail is a statement about the reader — an analyst who knows the
 * gestures wants the width back on every gram and on every visit, not until
 * the tab closes.
 * @type {string}
 */
const GUIDANCE_PREF_KEY = `${KEY_PREFIX}pref::guidanceCollapsed`

/**
 * Read the harmonic-pin visibility preference for this browser session.
 *
 * Defaults to `true` (pins shown) whenever nothing has been stored yet, storage
 * is unavailable, or the stored value is not one of the two recognised strings —
 * so a fresh session always starts with pins visible.
 * @returns {boolean} True when new/edited harmonic sets should show their pin
 */
export function loadPinPreference() {
  try {
    const raw = sessionStorage.getItem(PIN_PREF_KEY)
    if (raw === 'false') return false
    return true
  } catch (error) {
    console.warn('GramFrame: Could not read the harmonic-pin preference — using the default:', error)
    return true
  }
}

/**
 * Store the harmonic-pin visibility preference for the rest of this browser
 * session. A failure (private mode, quota) is reported to the caller and
 * logged; the in-memory state still holds for the current page.
 * @param {boolean} showPin - Whether pins should be shown
 * @returns {boolean} True if the preference was written
 */
export function savePinPreference(showPin) {
  try {
    sessionStorage.setItem(PIN_PREF_KEY, showPin ? 'true' : 'false')
    return true
  } catch (error) {
    console.warn('GramFrame: Could not save the harmonic-pin preference:', error)
    return false
  }
}

/**
 * What the analyst has decided about the guidance column, if anything.
 *
 * Three answers, not two. `true` and `false` are choices they made with the
 * Hide and reveal buttons; `null` means they have never touched it, and the
 * panel is then free to decide for itself — it shows the column where there is
 * room and collapses it to the rail where there is not. Collapsing that third
 * answer into `false` would make "I have never seen this" indistinguishable
 * from "I want it open", and the automatic behaviour would never fire.
 * @returns {boolean|null} The stored choice, or null when there is none
 */
export function loadGuidancePreference() {
  try {
    const raw = localStorage.getItem(GUIDANCE_PREF_KEY)
    return raw === 'true' ? true : raw === 'false' ? false : null
  } catch (error) {
    console.warn('GramFrame: Could not read the guidance preference — leaving it automatic:', error)
    return null
  }
}

/**
 * Remember whether the analyst collapsed the guidance column.
 *
 * A failure is logged and swallowed rather than reported: unlike an annotation,
 * nothing is lost when a chrome preference does not survive — the column is
 * simply automatic again next time, which is the safe way round.
 * @param {boolean} collapsed - Whether the column is collapsed to its rail
 * @returns {void}
 */
export function saveGuidancePreference(collapsed) {
  try {
    localStorage.setItem(GUIDANCE_PREF_KEY, collapsed ? 'true' : 'false')
  } catch (error) {
    console.warn('GramFrame: Could not save the guidance preference:', error)
  }
}
