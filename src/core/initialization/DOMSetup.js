/**
 * DOM Setup module for GramFrame initialization
 * 
 * This module handles DOM element creation and property setup during GramFrame
 * initialization. It extracts DOM-related initialization logic from the main
 * constructor to improve maintainability and testability.
 */

/// <reference path="../../types.js" />

import { extractConfigData } from '../configuration.js'
import { setupComponentTable } from '../../components/table.js'

/**
 * Initialize DOM properties and set them on the instance
 * @param {GramFrame} instance - GramFrame instance
 */
export function initializeDOMProperties(instance) {
  // Initialize DOM element properties (will be populated by setupComponentTable)
  /** @type {HTMLDivElement} */
  instance.container = null
  /** @type {HTMLDivElement} */
  instance.readoutPanel = null
  /** @type {HTMLDivElement} */
  instance.modeCell = null
  /** @type {HTMLDivElement} */
  instance.mainCell = null
  /** @type {HTMLElement} */
  instance.modeLED = null
  /** @type {HTMLElement} */
  instance.rateLED = null
  /** @type {HTMLElement} */
  instance.colorPicker = null
  /** @type {SVGSVGElement} */
  instance.svg = null
  /** @type {SVGGElement} */
  instance.cursorGroup = null
  /** @type {SVGGElement} */
  instance.axesGroup = null
  /** @type {SVGRectElement} */
  instance.imageClipRect = null
  /** @type {SVGRectElement} */
  instance.cursorClipRect = null
  
  // Unified layout containers
  /** @type {HTMLDivElement} */
  instance.leftColumn = null
  /** @type {HTMLDivElement} */
  instance.middleColumn = null
  /** @type {HTMLDivElement} */
  instance.rightColumn = null
  /** @type {HTMLDivElement} */
  instance.modeColumn = null
  /** @type {HTMLDivElement} */
  instance.guidanceColumn = null
  /** @type {HTMLDivElement} */
  instance.controlsColumn = null
  /** @type {HTMLDivElement} */
  instance.unifiedLayoutContainer = null
  /** @type {HTMLElement} */
  instance.timeLED = null
  /** @type {HTMLElement} */
  instance.freqLED = null
  /** @type {HTMLElement} */
  instance.speedLED = null
  /** @type {HTMLDivElement} */
  instance.markersContainer = null
  /** @type {HTMLDivElement} */
  instance.harmonicsContainer = null
  
  // Initialize spectrogram image property
  /** @type {SVGImageElement} */
  instance.spectrogramImage = null
  
  // Initialize mode switching UI properties
  /** @type {HTMLDivElement} */
  instance.modesContainer = null
  /** @type {Object<string, HTMLButtonElement>} */
  instance.modeButtons = null
  /** @type {Object<string, HTMLButtonElement>} */
  instance.commandButtons = null
  /** @type {HTMLDivElement} */
  instance.guidancePanel = null
  
  // Initialize mode system properties
  /** @type {Object<string, BaseMode>} */
  instance.modes = null
  /** @type {BaseMode} */
  instance.currentMode = null
  /** @type {FeatureRenderer} */
  instance.featureRenderer = null
}

/**
 * Set up spectrogram components including config extraction and table setup
 * @param {GramFrame} instance - GramFrame instance
 */
export function setupSpectrogramComponents(instance) {
  // Extract config data from table BEFORE replacing it
  extractConfigData(instance)
  
  // Create complete component table structure including DOM and SVG
  setupComponentTable(instance, instance.configTable)
}