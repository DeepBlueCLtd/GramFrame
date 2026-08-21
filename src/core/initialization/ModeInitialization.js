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
import { updateGuidancePanel } from '../../utils/secureHTML.js'

/** @typedef {import('../../modes/BaseMode.js').BaseMode} BaseMode */

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
 * capability: each panel-owning mode mounts into a *different* column, which no
 * capability expresses. Recorded as a documented exception in ADR-017. The
 * caller supplies the mapping, so adding a panel-owning mode is one entry in
 * that map rather than another parameter here.
 * @param {GramFrame} instance - GramFrame instance
 * @param {Object<string, BaseMode>} modes - Constructed modes
 * @param {Object<string, HTMLDivElement>} panelContainers - Column each panel-owning mode mounts into, by mode name
 * @param {HTMLDivElement} guidancePanel - Panel the starting mode's guidance is written into
 * @returns {BaseMode} The starting mode
 */
export function setupModeUI(instance, modes, panelContainers, guidancePanel) {
  // Every panel-owning mode's table is always visible, whatever mode is active
  Object.entries(panelContainers).forEach(([modeName, container]) => {
    if (modes[modeName]) {
      modes[modeName].createUI(container)
    }
  })

  // Set initial mode from state (pan by default)
  const currentMode = modes[instance.state.mode] || modes['pan']

  // Initialize guidance panel with the initial mode's guidance
  updateGuidancePanel(guidancePanel, currentMode.getGuidanceText())

  return currentMode
}