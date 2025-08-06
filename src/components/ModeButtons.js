/**
 * Mode Buttons Component for GramFrame
 * 
 * Provides mode switching UI with buttons and guidance panel
 */

/// <reference path="../types.js" />

import { getModeDisplayName } from '../utils/calculations.js'

/**
 * Create mode switching UI with buttons and guidance panel
 * @param {HTMLElement} modeCell - Container element for mode UI
 * @param {GramFrameState} state - Current state object
 * @param {Function} modeSwitchCallback - Callback function for mode changes
 * @param {Object} modes - Mode instances to get command buttons from
 * @returns {ModeUIElements} Object containing references to mode UI elements
 */
export function createModeSwitchingUI(modeCell, state, modeSwitchCallback, modes = {}) {
  // Create mode buttons container
  const modesContainer = document.createElement('div')
  modesContainer.className = 'gram-frame-modes'
  
  // Create mode buttons
  /** @type {ModeType[]} */
  const modeTypes = ['pan', 'analysis', 'harmonics', 'doppler']
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

    // Add pre-command buttons (left side)
    const preButtons = commandButtonDefs.slice(0, Math.floor(commandButtonDefs.length / 2))
    preButtons.forEach(buttonDef => {
      const cmdButton = createCommandButton(buttonDef)
      modeGroup.appendChild(cmdButton)
      commandButtons[modeType].push(cmdButton)
    })

    // Create main mode button
    const button = document.createElement('button')
    button.className = 'gram-frame-mode-btn'
    button.textContent = getModeDisplayName(modeType)
    button.dataset.mode = modeType
    
    // Set active state for current mode
    if (modeType === state.mode) {
      button.classList.add('active')
    }
    
    // Add click handler
    button.addEventListener('click', (event) => {
      event.preventDefault()
      modeSwitchCallback(modeType)
    })
    
    modeButtons[modeType] = button
    modeGroup.appendChild(button)

    // Add post-command buttons (right side)
    const postButtons = commandButtonDefs.slice(Math.floor(commandButtonDefs.length / 2))
    postButtons.forEach(buttonDef => {
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
 * Create a command button from a button definition
 * @param {CommandButton} buttonDef - Button definition
 * @returns {HTMLButtonElement} Created command button
 */
function createCommandButton(buttonDef) {
  const button = document.createElement('button')
  button.className = 'gram-frame-command-btn'
  button.textContent = buttonDef.label
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
 * @param {Object} modes - Mode instances
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

