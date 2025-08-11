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
 * Initialize mode infrastructure including feature renderer and mode instances
 * @param {GramFrame} instance - GramFrame instance
 */
export function initializeModeInfrastructure(instance) {
  // Initialize mode infrastructure
  /** @type {Object<string, BaseMode>} */
  instance.modes = {}
  /** @type {BaseMode} */
  instance.currentMode = null
  
  // Initialize centralized feature renderer
  instance.featureRenderer = new FeatureRenderer(instance)
  
  // Initialize all modes using factory
  const availableModes = ModeFactory.getAvailableModes()
  availableModes.forEach(modeName => {
    instance.modes[modeName] = ModeFactory.createMode(modeName, instance)
  })
}

/**
 * Set up mode UI including persistent containers and initial mode selection
 * @param {GramFrame} instance - GramFrame instance
 */
export function setupModeUI(instance) {
  // Initialize all persistent containers with their respective content
  // Analysis markers in middle column (always visible)
  instance.modes['analysis'].createUI(instance.markersContainer)
  
  // Harmonics sets in right column (always visible)  
  instance.modes['harmonics'].createUI(instance.harmonicsContainer)
  
  // Set initial mode (analysis by default)
  instance.currentMode = instance.modes['analysis']
  
  // Initialize guidance panel with analysis mode guidance
  if (instance.guidancePanel) {
    const guidanceContent = instance.currentMode.getGuidanceText()
    updateGuidancePanel(instance.guidancePanel, guidanceContent)
  }
}