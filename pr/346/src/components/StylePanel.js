/**
 * The style panel, and the twin tabs that say what it is about to change.
 *
 * One question caused most of the confusion in the old panel: does the colour
 * slider set the colour of the next feature, or restyle the one I just clicked?
 * It did both, silently, depending on state the analyst could not see. The tabs
 * make that state visible and selectable — "New features" or "Selected: ABS" —
 * and the panel's contents follow the armed tab:
 *
 * - **New features** — colour, symbol, pin style, and a footer saying the
 *   choices apply to everything added from now on, in any mode.
 * - **Selected** — the same controls pointed at that feature, plus the two
 *   things that only make sense for one that already exists: its label, edited
 *   in place rather than through a dialog, and a nudge pair mirroring the arrow
 *   keys. Its footer offers Delete.
 *
 * The routing itself is unchanged (`applyColorToSelectedFeature` and friends);
 * this panel's job is to make the target visible, and to let the analyst change
 * targets without giving up their selection.
 */

/// <reference path="../types.js" />

import { createColorSlider } from './ColorPicker.js'
import { createSymbolSelect, symbolGlyph } from './SymbolPicker.js'
import { createPinToggle } from './PinToggle.js'
import { nudgeSelection, MOVEMENT_INCREMENTS } from '../core/keyboardControl.js'
import { getActiveStyle } from '../core/featureStyle.js'
import { MAX_MARKER_LABEL_LENGTH } from '../utils/markerLabel.js'
import { describeStyleTarget, deleteStyleTarget, setStyleTarget, renameSelectedMarker } from './styleTarget.js'

/**
 * Build one labelled row of the panel.
 * @param {string} text - The row's caption
 * @param {HTMLElement} control - The control it captions
 * @param {string} [className] - Extra class for the row
 * @returns {HTMLDivElement} The row
 */
function createRow(text, control, className) {
  const row = document.createElement('div')
  row.className = className ? `gram-frame-style-row ${className}` : 'gram-frame-style-row'
  const label = document.createElement('div')
  label.className = 'gram-frame-style-group-label'
  label.textContent = text
  row.appendChild(label)
  row.appendChild(control)
  return row
}

/**
 * Create the style panel.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {HTMLDivElement} The panel element
 */
export function createStylePanel(instance) {
  // `gram-frame-color-picker` stays on the panel: it is the handle the instance
  // and the stylesheet know it by, and the panel is still the thing that owns
  // colour.
  const container = document.createElement('div')
  container.className = 'gram-frame-color-picker gram-frame-style-column'

  const tabs = document.createElement('div')
  tabs.className = 'gram-frame-style-tabs'

  const newTab = document.createElement('button')
  newTab.type = 'button'
  newTab.className = 'gram-frame-style-tab gram-frame-style-tab-new'
  newTab.textContent = 'New features'
  newTab.title = 'Set the style every feature you add from now on will take'
  newTab.addEventListener('click', event => {
    event.preventDefault()
    setStyleTarget(instance, 'new')
  })

  const selectedTab = document.createElement('button')
  selectedTab.type = 'button'
  selectedTab.className = 'gram-frame-style-tab gram-frame-style-tab-selected'
  selectedTab.addEventListener('click', event => {
    event.preventDefault()
    if (!selectedTab.disabled) {
      setStyleTarget(instance, 'selected')
    }
  })

  tabs.appendChild(newTab)
  tabs.appendChild(selectedTab)
  container.appendChild(tabs)

  const body = document.createElement('div')
  body.className = 'gram-frame-style-body'
  container.appendChild(body)

  // --- Label: the selected feature's own text, edited where it is read -------
  const labelInput = document.createElement('input')
  labelInput.type = 'text'
  labelInput.className = 'gram-frame-style-label-input'
  labelInput.maxLength = MAX_MARKER_LABEL_LENGTH
  labelInput.title = 'Optional — clear the field to remove the label'
  labelInput.setAttribute('aria-label', 'Marker label')
  labelInput.addEventListener('input', () => renameSelectedMarker(instance, labelInput.value))
  const labelRow = createRow('Label', labelInput, 'gram-frame-style-row-label')

  // --- Colour ---------------------------------------------------------------
  const color = createColorSlider(instance, () => {
    if (instance.interaction.syncStyleControls) {
      instance.interaction.syncStyleControls()
    }
  })

  // --- Symbol ---------------------------------------------------------------
  const symbol = createSymbolSelect(instance)
  const symbolRow = createRow('Symbol', symbol.element, 'gram-frame-style-row-symbol')

  // --- Pin style ------------------------------------------------------------
  const pin = createPinToggle(instance)
  const pinRow = createRow('Pin sets', pin.element)

  // --- Nudge: the arrow keys, reachable from the panel ----------------------
  const nudge = document.createElement('div')
  nudge.className = 'gram-frame-nudge'
  ;[['←', -1, 'Nudge left'], ['→', 1, 'Nudge right']].forEach(([glyph, sign, title]) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'gram-frame-nudge-btn'
    button.textContent = /** @type {string} */ (glyph)
    button.title = /** @type {string} */ (title)
    button.addEventListener('click', event => {
      event.preventDefault()
      const step = event.shiftKey ? MOVEMENT_INCREMENTS.fast : MOVEMENT_INCREMENTS.normal
      nudgeSelection(instance, { dx: /** @type {number} */ (sign) * step, dy: 0 })
    })
    nudge.appendChild(button)
  })
  const nudgeNote = document.createElement('span')
  nudgeNote.className = 'gram-frame-nudge-note'
  nudgeNote.textContent = 'or arrow keys'
  nudge.appendChild(nudgeNote)
  const nudgeRow = createRow('Nudge', nudge)

  body.appendChild(labelRow)
  body.appendChild(color.element)
  body.appendChild(symbolRow)
  body.appendChild(pinRow)
  body.appendChild(nudgeRow)

  const spacer = document.createElement('div')
  spacer.className = 'gram-frame-style-spacer'
  body.appendChild(spacer)

  // --- Footer: what the panel is about to affect, and the way out -----------
  const footer = document.createElement('div')
  footer.className = 'gram-frame-style-footer'

  const footerGlyph = document.createElement('span')
  footerGlyph.className = 'gram-frame-style-footer-glyph'

  const footerNote = document.createElement('div')
  footerNote.className = 'gram-frame-style-footer-note'

  const deleteButton = document.createElement('button')
  deleteButton.type = 'button'
  deleteButton.className = 'gram-frame-style-delete'
  deleteButton.textContent = 'Delete'
  deleteButton.title = 'Delete the selected feature'
  deleteButton.addEventListener('click', event => {
    event.preventDefault()
    deleteStyleTarget(instance)
  })

  footer.appendChild(footerGlyph)
  footer.appendChild(footerNote)
  footer.appendChild(deleteButton)
  container.appendChild(footer)

  // Sync every control — and the panel's whole face — to whatever is targeted.
  //
  // The three handles are closed over, not read back off `instance.interaction`.
  // Each control used to install itself there during construction and this
  // function used to look them up by name: an ordering contract `tsc` could not
  // check, which reordering the panel or mounting a picker twice would break in
  // silence. They are built here, so they can simply be held here (issue #267).
  instance.interaction.syncStyleControls = () => {
    const style = getActiveStyle(instance)
    color.control.setValue(style.color)
    symbol.control.setValue(style.symbol)
    symbol.control.setTint(style.color)
    pin.control.setValue(style.showPin)
    // Markers have no pin, so the control is disabled while one is targeted.
    pin.control.setEnabled(style.pinApplies)

    const target = describeStyleTarget(instance)
    container.classList.toggle('gram-frame-style-targeting', target.editing)
    newTab.classList.toggle('gram-frame-style-tab-armed', !target.editing)
    selectedTab.classList.toggle('gram-frame-style-tab-armed', target.editing)
    selectedTab.disabled = !target.selectable
    selectedTab.title = target.selectable
      ? `Restyle ${target.name}`
      : 'Select a row to restyle that feature'
    writeTabFace(selectedTab, target.selectable ? `Selected: ${target.name}` : 'Selected: none',
      target.selectable ? style.color : '', symbolGlyph(style.symbol))

    labelRow.hidden = !target.labelled
    if (target.labelled && document.activeElement !== labelInput) {
      labelInput.value = target.label
    }
    nudgeRow.hidden = !target.editing
    footerGlyph.style.color = style.color
    // The footer's ghosted mark is what a new feature would be drawn as; with
    // one targeted, the tab beside its name is already carrying its mark.
    footerGlyph.textContent = target.editing ? '' : symbolGlyph(style.symbol)
    footerNote.textContent = target.editing
      ? `changes ${target.name} only`
      : 'applies to every feature you add, in any mode'
    deleteButton.hidden = !target.editing
  }
  instance.interaction.syncStyleControls()

  return container
}

/**
 * Write the selected tab's face: the targeted feature's own mark in its own
 * colour, then the text.
 * @param {HTMLButtonElement} tab - The tab
 * @param {string} text - What it says
 * @param {string} color - Swatch colour, or '' for no swatch
 * @param {string} glyph - The targeted feature's mark
 * @returns {void}
 */
function writeTabFace(tab, text, color, glyph) {
  tab.replaceChildren()
  if (color) {
    const swatch = document.createElement('span')
    swatch.className = 'gram-frame-style-tab-swatch'
    swatch.style.color = color
    swatch.textContent = glyph
    tab.appendChild(swatch)
  }
  const word = document.createElement('span')
  word.textContent = text
  tab.appendChild(word)
}
