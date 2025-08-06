/**
 * MainUI module for GramFrame
 * 
 * This module handles the creation and management of the main UI layout
 * including the unified 3-column layout, LED displays, and container setup.
 */

/// <reference path="../types.js" />

import { 
  createLEDDisplay, 
  createColorPicker, 
  createFullFlexLayout, 
  createFlexColumn 
} from './UIComponents.js'
import { formatTime } from '../utils/timeFormatter.js'

/**
 * Create unified 3-column layout for readouts
 * @param {GramFrame} instance - GramFrame instance
 * @returns {HTMLDivElement} The unified layout container
 */
export function createUnifiedLayout(instance) {
  // Create main container for unified layout
  const unifiedLayoutContainer = /** @type {HTMLDivElement} */ (createFullFlexLayout('gram-frame-unified-layout', '2px'))
  unifiedLayoutContainer.style.flexDirection = 'row'
  unifiedLayoutContainer.style.flexWrap = 'nowrap'
  
  // Left Panel (600px) - Multi-column horizontal layout
  const leftColumn = /** @type {HTMLDivElement} */ (createFullFlexLayout('gram-frame-left-column', '4px'))
  leftColumn.style.flex = '0 0 600px'
  leftColumn.style.width = '600px'
  leftColumn.style.flexDirection = 'row'
  
  // Column 1: Mode buttons 
  const modeColumn = /** @type {HTMLDivElement} */ (createFlexColumn('gram-frame-mode-column', '8px'))
  modeColumn.style.flex = '0 0 130px'
  modeColumn.style.width = '130px'
  
  // Column 2: Guidance panel  
  const guidanceColumn = /** @type {HTMLDivElement} */ (createFlexColumn('gram-frame-guidance-column', '8px'))
  guidanceColumn.style.flex = '1'
  guidanceColumn.style.minWidth = '150px'
  
  // Column 3: Controls (time/freq displays, speed, color selector)
  const controlsColumn = /** @type {HTMLDivElement} */ (createFlexColumn('gram-frame-controls-column', '1px'))
  controlsColumn.style.flex = '0 0 220px'
  controlsColumn.style.width = '220px'
  
  // Create universal cursor readouts in controls column
  const cursorContainer = document.createElement('div')
  cursorContainer.className = 'gram-frame-cursor-leds'
  const timeLED = createLEDDisplay('Time (mm:ss)', formatTime(0))
  cursorContainer.appendChild(timeLED)
  
  const freqLED = createLEDDisplay('Frequency (Hz)', '0.0')
  cursorContainer.appendChild(freqLED)
  
  // Create doppler speed LED (spans full width)
  const speedLED = createLEDDisplay('Doppler Speed (knots)', '0.0')
  speedLED.style.gridColumn = '1 / -1' // Span both columns
  cursorContainer.appendChild(speedLED)
  
  controlsColumn.appendChild(cursorContainer)
  
  // Create color picker in controls column
  const colorPicker = createColorPicker(instance.state)
  colorPicker.querySelector('.gram-frame-color-picker-label').textContent = 'Color'
  controlsColumn.appendChild(colorPicker)
  
  // Add columns to left panel
  leftColumn.appendChild(modeColumn)
  leftColumn.appendChild(guidanceColumn)
  leftColumn.appendChild(controlsColumn)
  
  // Middle Column (160px) - Analysis Markers table
  const middleColumn = /** @type {HTMLDivElement} */ (createFlexColumn('gram-frame-middle-column'))
  middleColumn.style.flex = '0 0 160px'
  middleColumn.style.width = '160px'
  
  // Create markers container in middle column
  const markersContainer = createMarkersContainer()
  middleColumn.appendChild(markersContainer)
  
  // Right Column (200px) - Harmonics sets table
  const rightColumn = /** @type {HTMLDivElement} */ (createFlexColumn('gram-frame-right-column'))
  rightColumn.style.flex = '0 0 200px'
  rightColumn.style.minWidth = '200px'
  rightColumn.style.width = '200px'
  
  // Create harmonics container in right column
  const harmonicsContainer = createHarmonicsContainer()
  rightColumn.appendChild(harmonicsContainer)
  
  // Assemble the unified layout
  unifiedLayoutContainer.appendChild(leftColumn)
  unifiedLayoutContainer.appendChild(middleColumn)
  unifiedLayoutContainer.appendChild(rightColumn)
  
  // Store references on instance for easy access
  instance.unifiedLayoutContainer = unifiedLayoutContainer
  instance.leftColumn = leftColumn
  instance.middleColumn = middleColumn
  instance.rightColumn = rightColumn
  instance.modeColumn = modeColumn
  instance.guidanceColumn = guidanceColumn
  instance.controlsColumn = controlsColumn
  instance.markersContainer = markersContainer
  instance.harmonicsContainer = harmonicsContainer
  instance.timeLED = timeLED
  instance.freqLED = freqLED
  instance.speedLED = speedLED
  instance.colorPicker = colorPicker
  
  return unifiedLayoutContainer
}

/**
 * Create markers container for analysis mode
 * @returns {HTMLDivElement} The markers container
 */
function createMarkersContainer() {
  const markersContainer = document.createElement('div')
  markersContainer.className = 'gram-frame-markers-persistent-container'
  markersContainer.style.flex = '1'
  markersContainer.style.display = 'flex'
  markersContainer.style.flexDirection = 'column'
  markersContainer.style.minHeight = '0'
  
  const markersLabel = document.createElement('h4')
  markersLabel.textContent = 'Markers'
  markersLabel.style.margin = '0 0 8px 0'
  markersLabel.style.textAlign = 'left'
  markersLabel.style.flexShrink = '0'
  markersContainer.appendChild(markersLabel)
  
  return markersContainer
}

/**
 * Create harmonics container for harmonics mode
 * @returns {HTMLDivElement} The harmonics container
 */
function createHarmonicsContainer() {
  const harmonicsContainer = document.createElement('div')
  harmonicsContainer.className = 'gram-frame-harmonics-persistent-container'
  harmonicsContainer.style.flex = '1'
  harmonicsContainer.style.display = 'flex'
  harmonicsContainer.style.flexDirection = 'column'
  harmonicsContainer.style.minHeight = '0'
  
  // Create header container with title and button area
  const harmonicsHeader = document.createElement('div')
  harmonicsHeader.className = 'gram-frame-harmonics-header'
  harmonicsHeader.style.display = 'flex'
  harmonicsHeader.style.justifyContent = 'space-between'
  harmonicsHeader.style.alignItems = 'center'
  harmonicsHeader.style.margin = '0 0 8px 0'
  harmonicsHeader.style.flexShrink = '0'
  
  const harmonicsLabel = document.createElement('h4')
  harmonicsLabel.textContent = 'Harmonics'
  harmonicsLabel.style.margin = '0'
  harmonicsLabel.style.textAlign = 'left'
  harmonicsLabel.style.flexShrink = '0'
  
  const harmonicsButtonContainer = document.createElement('div')
  harmonicsButtonContainer.className = 'gram-frame-harmonics-button-container'
  harmonicsButtonContainer.style.flexShrink = '0'
  
  harmonicsHeader.appendChild(harmonicsLabel)
  harmonicsHeader.appendChild(harmonicsButtonContainer)
  harmonicsContainer.appendChild(harmonicsHeader)
  
  return harmonicsContainer
}

/**
 * Update universal cursor readouts (time/freq LEDs) regardless of active mode
 * @param {GramFrame} instance - GramFrame instance
 * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
 */
export function updateUniversalCursorReadouts(instance, dataCoords) {
  if (instance.timeLED) {
    const timeValue = instance.timeLED.querySelector('.gram-frame-led-value')
    if (timeValue) {
      timeValue.textContent = formatTime(dataCoords.time)
    }
  }
  
  if (instance.freqLED) {
    const freqValue = instance.freqLED.querySelector('.gram-frame-led-value')
    if (freqValue) {
      freqValue.textContent = dataCoords.freq.toFixed(2)
    }
  }
}

/**
 * Update persistent panels (markers and harmonics) regardless of active mode
 * @param {GramFrame} instance - GramFrame instance
 */
export function updatePersistentPanels(instance) {
  // Update analysis markers table
  const analysisMode = /** @type {any} */ (instance.modes['analysis'])
  if (analysisMode && typeof analysisMode.updateMarkersTable === 'function') {
    analysisMode.updateMarkersTable()
  }
  
  // Update harmonics panel - ensure panel reference is always available
  const harmonicsMode = /** @type {any} */ (instance.modes['harmonics'])
  if (harmonicsMode) {
    // Make sure the panel reference is set
    if (!harmonicsMode.instance.harmonicPanel && instance.harmonicsContainer) {
      const existingPanel = instance.harmonicsContainer.querySelector('.gram-frame-harmonic-panel')
      if (existingPanel) {
        harmonicsMode.instance.harmonicPanel = existingPanel
      }
    }
    
    if (typeof harmonicsMode.updateHarmonicPanel === 'function') {
      harmonicsMode.updateHarmonicPanel()
    }
  }
}