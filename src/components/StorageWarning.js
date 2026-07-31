/**
 * Non-blocking "annotations are not being saved" banner (spec 165, GF-16).
 *
 * Browser storage can refuse a write for reasons the analyst cannot see:
 * quota exhausted, private-browsing restrictions, a disabled storage policy.
 * Persistence is best-effort — the current session keeps working entirely in
 * memory — but an analyst who believes their work is being saved when it is
 * not will lose it on reload. This module surfaces that state.
 *
 * Deliberately non-blocking: a dismissible banner inside the component's own
 * container, announced politely to assistive technology, with no modal, no
 * focus steal and no interruption of the interaction in progress. It appears
 * only after a write has actually failed, and disappears again as soon as one
 * succeeds.
 */

/// <reference path="../types.js" />

/** @type {string} */
const WARNING_CLASS = 'gram-frame-storage-warning'

/**
 * Show (or update) the storage-failure banner for an instance.
 *
 * Idempotent: repeated failures reuse the existing banner rather than stacking
 * copies of it. A banner the analyst dismissed stays dismissed until a later
 * failure raises a fresh one.
 * @param {GramFrame} instance - GramFrame instance
 * @param {string} message - What could not be saved, in the analyst's terms
 * @returns {HTMLElement|null} The banner element, or null if there is nowhere to put it
 */
export function showStorageWarning(instance, message) {
  if (!instance || !instance.container) {
    return null
  }

  const existing = /** @type {HTMLElement|null} */ (
    instance.container.querySelector(`.${WARNING_CLASS}`)
  )
  if (existing) {
    const text = existing.querySelector(`.${WARNING_CLASS}-message`)
    if (text) {
      text.textContent = message
    }
    return existing
  }

  const banner = document.createElement('div')
  banner.className = WARNING_CLASS
  banner.setAttribute('role', 'status')
  banner.setAttribute('aria-live', 'polite')

  const text = document.createElement('span')
  text.className = `${WARNING_CLASS}-message`
  text.textContent = message

  const dismiss = document.createElement('button')
  dismiss.type = 'button'
  dismiss.className = `${WARNING_CLASS}-dismiss`
  dismiss.textContent = '×'
  dismiss.title = 'Dismiss'
  dismiss.setAttribute('aria-label', 'Dismiss storage warning')
  dismiss.addEventListener('click', () => banner.remove())

  banner.appendChild(text)
  banner.appendChild(dismiss)

  instance.container.insertBefore(banner, instance.container.firstChild)
  return banner
}

/**
 * Remove the storage-failure banner, if one is showing. Called after a
 * successful write so a transient failure (a quota freed up, storage
 * re-enabled) does not leave a stale warning on screen.
 * @param {GramFrame} instance - GramFrame instance
 */
export function clearStorageWarning(instance) {
  if (!instance || !instance.container) {
    return
  }
  const existing = instance.container.querySelector(`.${WARNING_CLASS}`)
  if (existing) {
    existing.remove()
  }
}
