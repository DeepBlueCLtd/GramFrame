/**
 * Mode Buttons Component for GramFrame
 * 
 * Provides mode switching UI with buttons and guidance panel
 */

/// <reference path="../types.js" />

import { capitalizeFirstLetter } from '../utils/calculations.js'

/**
 * Create mode switching UI with buttons and guidance panel
 * @param {HTMLElement} modeCell - Container element for mode UI
 * @param {GramFrameState} state - Current state object
 * @param {Function} modeSwitchCallback - Callback function for mode changes
 * @returns {Object} Object containing references to mode UI elements
 */
export function createModeSwitchingUI(modeCell, state, modeSwitchCallback) {
  // Create mode buttons container
  const modesContainer = document.createElement('div')
  modesContainer.className = 'gram-frame-modes'
  
  // Create mode buttons
  /** @type {ModeType[]} */
  const modes = ['analysis', 'harmonics', 'doppler']
  const modeButtons = {}
  
  modes.forEach(mode => {
    const button = document.createElement('button')
    button.className = 'gram-frame-mode-btn'
    button.textContent = capitalizeFirstLetter(mode)
    button.dataset.mode = mode
    
    // Set active state for current mode
    if (mode === state.mode) {
      button.classList.add('active')
    }
    
    // Add click handler
    button.addEventListener('click', (event) => {
      event.preventDefault()
      modeSwitchCallback(mode)
    })
    
    modeButtons[mode] = button
    modesContainer.appendChild(button)
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
    guidancePanel
  }
}

/**
 * Updates guidance content based on current mode
 * @param {HTMLElement} guidancePanel - The guidance panel element
 * @param {string} mode - Current mode ('analysis', 'harmonics', 'doppler')
 */
export function updateGuidanceContent(guidancePanel, mode) {
  if (mode === 'analysis') {
    guidancePanel.innerHTML = `
      <h4>Analysis Mode</h4>
      <p>• Hover to view exact frequency/time values</p>
    `
  } else if (mode === 'harmonics') {
    guidancePanel.innerHTML = `
      <h4>Harmonics Mode</h4>
      <p>• Click & drag to generate harmonic lines</p>
      <p>• Drag existing harmonic lines to adjust spacing</p>
      <p>• Manually add harmonic lines using [+ Manual] button</p>
    `
  } else if (mode === 'doppler') {
    guidancePanel.innerHTML = `
      <h4>Doppler Mode</h4>
      <p>• Drag line to give overall doppler curve</p>
      <p>• Drag markers to adjust curve</p>
      <p>• Right-click to reset</p>
    `
  }
}