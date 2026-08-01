/**
 * Mode Initialization module for GramFrame initialization
 * 
 * This module handles mode system setup and configuration during GramFrame
 * initialization. It manages mode creation, infrastructure setup, and
 * initial mode selection.
 */

/// <reference path="../../types.js" />

import { ModeFactory } from '../../modes/ModeFactory.js'
import { FeatureRenderer } from '../FeatureRenderer.js'
import { BaseMode } from '../../modes/BaseMode.js'
import { updateGuidancePanel } from '../../utils/secureHTML.js'

/**
 * Construct the feature renderer and every registered mode.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {{modes: Object<string, BaseMode>, featureRenderer: FeatureRenderer}} The mode infrastructure
 */
export function initializeModeInfrastructure(instance) {
  /** @type {Object<string, BaseMode>} */
  const modes = {}

  // Initialize centralized feature renderer
  const featureRenderer = new FeatureRenderer(instance)

  // Initialize all modes using factory
  ModeFactory.getAvailableModes().forEach(modeName => {
    modes[modeName] = ModeFactory.createMode(modeName, instance)
  })

  return { modes, featureRenderer }
}

/**
 * Mount each panel-owning mode's UI and pick the starting mode.
 *
 * The per-mode container is why this names modes rather than using a
 * capability: analysis and harmonics mount into *different* columns, which no
 * capability expresses. Recorded as a documented exception in ADR-017.
 * @param {GramFrame} instance - GramFrame instance
 * @param {Object<string, BaseMode>} modes - Constructed modes
 * @param {HTMLDivElement} markersContainer - Middle column, for the markers table
 * @param {HTMLDivElement} harmonicsContainer - Right column, for the harmonics panel
 * @param {HTMLDivElement} guidancePanel - Panel the starting mode's guidance is written into
 * @returns {BaseMode} The starting mode
 */
export function setupModeUI(instance, modes, markersContainer, harmonicsContainer, guidancePanel) {
  // Analysis markers in middle column (always visible)
  modes['analysis'].createUI(markersContainer)

  // Harmonics sets in right column (always visible)
  modes['harmonics'].createUI(harmonicsContainer)

  // Set initial mode from state (pan by default)
  const currentMode = modes[instance.state.mode] || modes['pan']

  // Initialize guidance panel with the initial mode's guidance
  updateGuidancePanel(guidancePanel, currentMode.getGuidanceText())

  return currentMode
}