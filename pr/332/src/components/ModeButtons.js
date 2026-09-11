/**
 * Mode Buttons Component for GramFrame
 * 
 * Provides mode switching UI with buttons and guidance panel
 */

/// <reference path="../types.js" />

import { MODE_NAMES, getModeDisplayName, getModeIcon } from '../modes/modeRoster.js'
import { createIcon, createIconLabel } from './icons.js'

/** @typedef {import('../modes/BaseMode.js').BaseMode} BaseMode */

/**
 * Create mode switching UI with buttons and guidance panel
 * @param {HTMLElement} modeCell - Container element for mode UI
 * @param {GramFrameState} state - Current state object
 * @param {Function} modeSwitchCallback - Callback function for mode changes
 * @param {Object<string, BaseMode>} modes - Mode instances to get command buttons from
 * @returns {ModeUIElements} Object containing references to mode UI elements
 */
export function createModeSwitchingUI(modeCell, state, modeSwitchCallback, modes = {}) {
  // Create mode buttons container
  const modesContainer = document.createElement('div')
  modesContainer.className = 'gram-frame-modes'
  
  // Create mode buttons, in the roster's order (R9-12). This list used to be
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
    const commandButtonDefs = modeInstance && typeof modeInstance.getCommandButtons === 'function' 
      ? modeInstance.getCommandButtons() 
      : []

    // Create command buttons container for this mode
    const modeGroup = document.createElement('div')
    modeGroup.className = 'gram-frame-mode-group'

    // Store command buttons for this mode
    commandButtons[modeType] = []

    // Create main mode button.
    //
    // It leads its group, and its commands follow it. They used to be split in
    // half and wrapped around it, which put Pan's mode button a button's width
    // in from the left while the other four started at the column's edge — the
    // one row out of line was the row already short of space (issue #310).
    const button = document.createElement('button')
    button.className = 'gram-frame-mode-btn'
    const displayName = getModeDisplayName(modeType)
    applyButtonFace(button, displayName, getModeIcon(modeType))
    // Named on hover like the command buttons beside it. It matters most for
    // the one showing a glyph, which is why it arrived with the icons.
    button.title = displayName
    button.dataset.mode = modeType

    // Set active state for current mode
    if (modeType === state.mode) {
      button.classList.add('active')
    }
    
    // Set disabled state based on mode's isEnabled method
    const modeInstanceForDisabled = modes[modeType]
    if (modeInstanceForDisabled && typeof modeInstanceForDisabled.isEnabled === 'function') {
      if (!modeInstanceForDisabled.isEnabled()) {
        button.disabled = true
        button.classList.add('disabled')
      }
    }
    
    // Add click handler
    button.addEventListener('click', (event) => {
      event.preventDefault()
      if (!button.disabled) {
        modeSwitchCallback(modeType)
      }
    })
    
    modeButtons[modeType] = button
    modeGroup.appendChild(button)

    // The mode's own commands, in the order the mode lists them.
    commandButtonDefs.forEach((/** @type {CommandButton} */ buttonDef) => {
      const cmdButton = createCommandButton(buttonDef)
      modeGroup.appendChild(cmdButton)
      commandButtons[modeType].push(cmdButton)
    })

    modesContainer.appendChild(modeGroup)
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
    commandButtons,
    guidancePanel
  }
}

/**
 * Put a word, or a glyph standing for that word, on a button.
 *
 * An icon button keeps the word in a visually hidden span rather than dropping
 * it: that span is the button's accessible name, so a screen reader still hears
 * "Pan" and "Fit", and a test still finds the button by the name an analyst
 * would call it.
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
  button.className = 'gram-frame-command-btn'
  applyButtonFace(button, buttonDef.label, buttonDef.icon)
  button.title = buttonDef.title
  
  // Set initial enabled state
  if (buttonDef.isEnabled) {
    button.disabled = !buttonDef.isEnabled()
  }
  
  // Add click handler
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

