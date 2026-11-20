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
import { setupSpectrogramImage } from '../../components/spectrogramImage.js'
import { showGuidanceForMode, applyGuidanceCollapsed } from '../../components/GuidancePanel.js'

/** @typedef {import('../../modes/BaseMode.js').BaseMode} BaseMode */

/**
 * Create unified layout structure for the GramFrame instance.
 * @param {GramFrame} instance - GramFrame instance
 * @param {HTMLDivElement} readoutPanel - Panel the layout is mounted into
 * @param {HTMLDivElement} modeCell - Cell the readout panel is mounted into
 * @returns {UnifiedLayoutElements} The columns, LEDs and containers just built
 */
export function createUnifiedLayoutStructure(instance, readoutPanel, modeCell) {
  const layout = createUnifiedLayout(instance)

  // Append unified layout to readout panel
  readoutPanel.appendChild(layout.unifiedLayoutContainer)

  // Append readout panel to mode cell
  modeCell.appendChild(readoutPanel)

  return layout
}

/**
 * Set up the mode switching UI, before the modes themselves exist.
 *
 * Built twice by design: this pass has no command buttons because no mode has
 * been constructed yet to declare any. `updateModeUIWithCommands` replaces it
 * once they have.
 * @param {GramFrame} instance - GramFrame instance
 * @param {HTMLDivElement} modeColumn - Column the mode buttons mount into
 * @returns {ModeUIElements} The mode UI just built
 */
export function setupPersistentContainers(instance, modeColumn) {
  return createModeSwitchingUI(modeColumn, instance.state.mode, (/** @type {ModeType} */ mode) => instance._switchMode(mode))
}

/**
 * Rebuild the mode UI with command buttons, now that the modes exist.
 * @param {GramFrame} instance - GramFrame instance
 * @param {ModeUIElements} previous - The mode UI to replace
 * @param {Object<string, BaseMode>} modes - Constructed modes, for their command buttons
 * @param {BaseMode} currentMode - Mode whose guidance text is shown first
 * @param {HTMLDivElement} modeColumn - Column the mode buttons mount into
 * @returns {ModeUIElements} The replacement mode UI
 */
export function updateModeUIWithCommands(instance, previous, modes, currentMode, modeColumn) {
  // Recreate mode UI with command buttons now that modes are available
  modeColumn.removeChild(previous.modesContainer)

  const armed = instance.state.mode
  const modeUIWithButtons = createModeSwitchingUI(modeColumn, armed, (/** @type {ModeType} */ mode) => instance._switchMode(mode), modes)

  // The guidance column outlives the rail — it is built once by the layout —
  // so this pass only has to say which mode it is describing.
  showGuidanceForMode(instance, currentMode)
  applyGuidanceCollapsed(instance)

  return modeUIWithButtons
}

/**
 * Set up spectrogram image if available from config
 * @param {GramFrame} instance - GramFrame instance
 */
export function setupSpectrogramIfAvailable(instance) {
  // Set up spectrogram image if we have one from config extraction. An
  // audio-sourced instance carries its audio URL here and is set up by
  // `player/audioSetup.js` from the constructor instead (spec 168).
  const { imageDetails, player } = instance.state
  if (imageDetails.url && !player.active) {
    setupSpectrogramImage(instance, imageDetails.url)
  }
}