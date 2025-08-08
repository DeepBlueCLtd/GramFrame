/**
 * UI Setup module for GramFrame initialization
 * 
 * This module handles unified layout and mode UI creation during GramFrame
 * initialization. It manages the complex UI setup process including mode
 * switching components and layout containers.
 */

/// <reference path="../../types.js" />

import { createUnifiedLayout } from '../../components/MainUI.js'
import { createModeSwitchingUI } from '../../components/ModeButtons.js'
import { setupSpectrogramImage } from '../../components/table.js'
import { updateGuidancePanel } from '../../utils/secureHTML.js'

/**
 * Create unified layout structure for the GramFrame instance
 * @param {GramFrame} instance - GramFrame instance
 */
export function createUnifiedLayoutStructure(instance) {
  // Create unified layout
  createUnifiedLayout(instance)
  
  // Append unified layout to readout panel
  instance.readoutPanel.appendChild(instance.unifiedLayoutContainer)
  
  // Append readout panel to mode cell
  instance.modeCell.appendChild(instance.readoutPanel)
}

/**
 * Set up persistent containers and mode switching UI
 * @param {GramFrame} instance - GramFrame instance
 */
export function setupPersistentContainers(instance) {
  // Create mode switching UI initially (will be updated after modes are initialized)
  const tempContainer = document.createElement('div')
  const modeUI = createModeSwitchingUI(tempContainer, instance.state, (mode) => instance._switchMode(mode))
  instance.modesContainer = modeUI.modesContainer
  instance.modeButtons = modeUI.modeButtons
  instance.commandButtons = modeUI.commandButtons
  instance.guidancePanel = modeUI.guidancePanel
  
  // Add mode UI to appropriate columns
  instance.modeColumn.appendChild(instance.modesContainer)
  instance.guidanceColumn.appendChild(instance.guidancePanel)
}

/**
 * Update mode UI with command buttons after modes are initialized
 * @param {GramFrame} instance - GramFrame instance
 */
export function updateModeUIWithCommands(instance) {
  // Recreate mode UI with command buttons now that modes are available
  instance.modeColumn.removeChild(instance.modesContainer)
  instance.guidanceColumn.removeChild(instance.guidancePanel)
  
  const tempContainer2 = document.createElement('div')
  const modeUIWithButtons = createModeSwitchingUI(tempContainer2, instance.state, (mode) => instance._switchMode(mode), instance.modes)
  instance.modesContainer = modeUIWithButtons.modesContainer
  instance.modeButtons = modeUIWithButtons.modeButtons
  instance.commandButtons = modeUIWithButtons.commandButtons
  instance.guidancePanel = modeUIWithButtons.guidancePanel
  
  // Add updated mode UI back to appropriate columns
  instance.modeColumn.appendChild(instance.modesContainer)
  instance.guidanceColumn.appendChild(instance.guidancePanel)
  
  // Set initial guidance content after recreating the panel
  if (instance.currentMode && instance.guidancePanel) {
    const guidanceContent = instance.currentMode.getGuidanceText()
    updateGuidancePanel(instance.guidancePanel, guidanceContent)
  }
}

/**
 * Set up spectrogram image if available from config
 * @param {GramFrame} instance - GramFrame instance
 */
export function setupSpectrogramIfAvailable(instance) {
  // Set up spectrogram image if we have one from config extraction
  if (instance.state.imageDetails.url) {
    setupSpectrogramImage(instance, instance.state.imageDetails.url)
  }
}