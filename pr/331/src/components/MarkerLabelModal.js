/**
 * The marker-label dialog (feature 231).
 *
 * Opened from the Label button in a markers-table row, it lets an analyst enter
 * or edit the free text shown next to that marker on the gram. Clearing the
 * field and saving removes the label, so one dialog covers add, edit and
 * remove.
 *
 * Built with `createElement` rather than `innerHTML`: the current label is user
 * text being put back into the DOM, and `textContent`/`value` assignment keeps
 * that unambiguously inert.
 *
 * The label wraps its input rather than pointing at one by id, so no
 * page-global name escapes into the host document (R9-08).
 */

/// <reference path="../types.js" />

import { MAX_MARKER_LABEL_LENGTH, normalizeMarkerLabel } from '../utils/markerLabel.js'

/**
 * Show the label dialog for one marker.
 *
 * The dialog is modal-by-convention (a full-screen overlay), self-closing, and
 * removes itself on save, cancel, Escape, or a click on the backdrop. `onSave`
 * fires only on save, with the normalised label — `undefined` when the analyst
 * cleared the field.
 *
 * @param {string|undefined} currentLabel - The marker's existing label, if any
 * @param {function(string|undefined): void} onSave - Called with the new label on save
 * @returns {HTMLDivElement} The overlay element, for callers that need to dismiss it
 */
export function showMarkerLabelModal(currentLabel, onSave) {
  const overlay = document.createElement('div')
  overlay.className = 'gram-frame-modal-overlay gram-frame-marker-label-modal'

  const modal = document.createElement('div')
  modal.className = 'gram-frame-modal'

  const header = document.createElement('div')
  header.className = 'gram-frame-modal-header'
  const heading = document.createElement('h3')
  heading.textContent = currentLabel ? 'Edit Marker Label' : 'Add Marker Label'
  header.appendChild(heading)

  const body = document.createElement('div')
  body.className = 'gram-frame-modal-body'
  const inputGroup = document.createElement('div')
  inputGroup.className = 'gram-frame-modal-input-group'

  const inputLabel = document.createElement('label')
  inputLabel.appendChild(document.createTextNode('Label:'))

  const input = document.createElement('input')
  input.type = 'text'
  input.className = 'gram-frame-marker-label-input'
  input.maxLength = MAX_MARKER_LABEL_LENGTH
  input.placeholder = 'Enter a label for this marker'
  input.value = currentLabel || ''
  inputLabel.appendChild(input)

  const hint = document.createElement('div')
  hint.className = 'gram-frame-modal-hint'
  hint.textContent = 'Leave empty to remove the label.'

  inputGroup.appendChild(inputLabel)
  inputGroup.appendChild(hint)
  body.appendChild(inputGroup)

  const footer = document.createElement('div')
  footer.className = 'gram-frame-modal-footer'
  const cancelButton = document.createElement('button')
  cancelButton.type = 'button'
  cancelButton.className = 'gram-frame-modal-btn gram-frame-modal-cancel'
  cancelButton.textContent = 'Cancel'
  const saveButton = document.createElement('button')
  saveButton.type = 'button'
  saveButton.className = 'gram-frame-modal-btn gram-frame-modal-add gram-frame-modal-save'
  saveButton.textContent = 'Save'
  footer.appendChild(cancelButton)
  footer.appendChild(saveButton)

  modal.appendChild(header)
  modal.appendChild(body)
  modal.appendChild(footer)
  overlay.appendChild(modal)

  // Remembered before the dialog steals focus, so it can be given back.
  const opener = /** @type {HTMLElement|null} */ (document.activeElement)

  document.body.appendChild(overlay)

  /**
   * Remove the dialog and hand focus back to whatever opened it.
   *
   * Without the restore, `document.activeElement` was left on `<body>` after
   * every Save or Cancel, so a keyboard user was returned to the top of the
   * document rather than to the Label button they pressed (R9-08).
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

  /**
   * Commit the entered text and close.
   */
  function save() {
    onSave(normalizeMarkerLabel(input.value))
    closeModal()
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      save()
    }
  })
  document.addEventListener('keydown', onDocumentKeydown, true)
  cancelButton.addEventListener('click', closeModal)
  saveButton.addEventListener('click', save)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal()
    }
  })

  // Focus and select so editing an existing label can start by typing over it.
  input.focus()
  input.select()

  return overlay
}
