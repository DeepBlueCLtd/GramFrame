/**
 * The mode rail: which tool is armed, and the view controls beneath it.
 *
 * A kicker, five mode buttons stacked in roster order, then — pushed to the
 * foot of the rail by a spacer and fenced off by a rule — the view controls.
 *
 * The view controls used to sit inside Pan's row, because Pan is the mode that
 * declares them. That made one row of five four controls wide while the rest
 * held one, and the armed-mode read had to compete with it. They are the same
 * buttons, still declared by the mode that owns the viewport; only where they
 * are drawn has changed. They stay visible in every mode because zooming and
 * fitting are things an analyst does while measuring, not instead of it.
 *
 * Clear is deliberately NOT here: it removes annotations, not view state, and
 * it lives in the sidebands table's footer (see `MainUI.js`).
 */

/// <reference path="../types.js" />

import { MODE_NAMES, getModeDisplayName, getModeIcon } from '../modes/modeRoster.js'
import { createIcon, createIconLabel } from './icons.js'

/** @typedef {import('../modes/BaseMode.js').BaseMode} BaseMode */

/**
 * Build the mode rail.
 * @param {HTMLElement} modeCell - Container element for mode UI
 * @param {ModeType} activeMode - The mode armed when the rail is built
 * @param {Function} modeSwitchCallback - Callback function for mode changes
 * @param {Object<string, BaseMode>} modes - Mode instances to get command buttons from
 * @returns {ModeUIElements} Object containing references to mode UI elements
 */
export function createModeSwitchingUI(modeCell, activeMode, modeSwitchCallback, modes = {}) {
  const modesContainer = document.createElement('div')
  modesContainer.className = 'gram-frame-modes'

  const kicker = document.createElement('div')
  kicker.className = 'gram-frame-kicker'
  kicker.textContent = 'Mode'
  modesContainer.appendChild(kicker)

  const list = document.createElement('div')
  list.className = 'gram-frame-mode-list'
  modesContainer.appendChild(list)

  // The rail's foot, where the view controls sit whatever mode is armed.
  const commandRow = document.createElement('div')
  commandRow.className = 'gram-frame-mode-commands'

  // Modes are listed in the roster's order (R9-12). This list used to be
  // written out here, so landing Sidebands meant editing a component that has
  // no business knowing which modes exist.
  /** @type {ModeType[]} */
  const modeTypes = MODE_NAMES
  /** @type {Object<string, HTMLButtonElement>} */
  const modeButtons = {}
  /** @type {Object<string, HTMLButtonElement[]>} */
  const commandButtons = {}

  modeTypes.forEach(modeType => {
    const modeInstance = modes[modeType]

    commandButtons[modeType] = []

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'gram-frame-mode-btn'
    const displayName = getModeDisplayName(modeType)
    applyModeFace(button, displayName, getModeIcon(modeType))
    button.title = displayName
    button.dataset.mode = modeType

    if (modeType === activeMode) {
      button.classList.add('active')
    }

    // Set disabled state based on mode's isEnabled method
    if (modeInstance && typeof modeInstance.isEnabled === 'function' && !modeInstance.isEnabled()) {
      button.disabled = true
      button.classList.add('disabled')
    }

    button.addEventListener('click', (event) => {
      event.preventDefault()
      if (!button.disabled) {
        modeSwitchCallback(modeType)
      }
    })

    modeButtons[modeType] = button
    list.appendChild(button)

    // The mode's own commands, in the order the mode lists them, into the
    // rail's footer.
    const commandButtonDefs = modeInstance && typeof modeInstance.getCommandButtons === 'function'
      ? modeInstance.getCommandButtons()
      : []
    commandButtonDefs.forEach((/** @type {CommandButton} */ buttonDef) => {
      const cmdButton = createCommandButton(buttonDef)
      commandRow.appendChild(cmdButton)
      commandButtons[modeType].push(cmdButton)
    })
  })

  // A spacer, so the view controls sit against the foot of the rail however
  // many modes there are.
  const spacer = document.createElement('div')
  spacer.className = 'gram-frame-mode-spacer'
  modesContainer.appendChild(spacer)
  modesContainer.appendChild(commandRow)

  modeCell.appendChild(modesContainer)

  return {
    modesContainer,
    modeButtons,
    commandButtons
  }
}

/**
 * Put a mode's glyph and its word on its button.
 *
 * Both, not one or the other: in a stacked rail the shape is what the eye
 * lands on and the word is what settles it. A mode with no glyph in the
 * catalogue simply shows its word.
 * @param {HTMLButtonElement} button - The button to face
 * @param {string} text - The mode's name
 * @param {string} [icon] - Name of a glyph in `components/icons.js`
 */
function applyModeFace(button, text, icon) {
  const glyph = createIcon(icon)
  if (glyph) {
    button.appendChild(glyph)
  }
  const label = document.createElement('span')
  label.className = 'gram-frame-mode-btn-label'
  label.textContent = text
  button.appendChild(label)
}

/**
 * Put a word, or a glyph standing for that word, on a command button.
 *
 * An icon button keeps the word in a visually hidden span rather than dropping
 * it: that span is the button's accessible name, so a screen reader still
 * hears "Fit", and a test still finds the button by the name an analyst would
 * call it.
 * @param {HTMLButtonElement} button - The button to face
 * @param {string} text - The word the button stands for
 * @param {string} [icon] - Name of a glyph in `components/icons.js`
 */
function applyButtonFace(button, text, icon) {
  const glyph = createIcon(icon)
  if (!glyph) {
    button.textContent = text
    return
  }
  button.classList.add('gram-frame-icon-btn')
  button.appendChild(glyph)
  button.appendChild(createIconLabel(text))
}

/**
 * Create a command button from a button definition
 * @param {CommandButton} buttonDef - Button definition
 * @returns {HTMLButtonElement} Created command button
 */
function createCommandButton(buttonDef) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'gram-frame-command-btn'
  applyButtonFace(button, buttonDef.label, buttonDef.icon)
  button.title = buttonDef.title

  // Set initial enabled state
  if (buttonDef.isEnabled) {
    button.disabled = !buttonDef.isEnabled()
  }

  button.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    buttonDef.action()
  })

  return button
}

/**
 * Update command button states for all modes
 * @param {Object<string, HTMLButtonElement[]>} commandButtons - Command buttons by mode
 * @param {Object<string, BaseMode>} modes - Mode instances
 */
export function updateCommandButtonStates(commandButtons, modes) {
  Object.keys(commandButtons).forEach(modeType => {
    const modeInstance = modes[modeType]
    if (modeInstance && typeof modeInstance.getCommandButtons === 'function') {
      const buttonDefs = modeInstance.getCommandButtons()
      const buttons = commandButtons[modeType]

      buttons.forEach((button, index) => {
        const buttonDef = buttonDefs[index]
        if (buttonDef && buttonDef.isEnabled) {
          button.disabled = !buttonDef.isEnabled()
        }
      })
    }
  })
}

/**
 * Update mode button states for all modes
 * @param {Object<string, HTMLButtonElement>} modeButtons - Mode buttons by mode
 * @param {Object<string, BaseMode>} modes - Mode instances
 */
export function updateModeButtonStates(modeButtons, modes) {
  Object.keys(modeButtons).forEach(modeType => {
    const modeInstance = modes[modeType]
    const button = modeButtons[modeType]

    if (modeInstance && typeof modeInstance.isEnabled === 'function' && button) {
      const isEnabled = modeInstance.isEnabled()
      button.disabled = !isEnabled

      if (isEnabled) {
        button.classList.remove('disabled')
      } else {
        button.classList.add('disabled')
      }
    }
  })
}
