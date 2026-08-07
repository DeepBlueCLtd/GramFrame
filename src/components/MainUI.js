/**
 * MainUI module for GramFrame
 * 
 * This module handles the creation and management of the main UI layout
 * including the unified 3-column layout, LED displays, and container setup.
 */

/// <reference path="../types.js" />

import { isPanelOwner } from '../modes/capabilities.js'
import {
  createLEDDisplay,
  createColorPicker,
  createFullFlexLayout,
  createFlexColumn
} from './UIComponents.js'
import { formatTime } from '../utils/timeFormatter.js'

/**
 * Create unified 3-column layout for readouts.
 *
 * Returns the handles rather than writing them onto the instance, so the
 * constructor is the one place they are adopted (spec 167, FR-009).
 * @param {GramFrame} instance - GramFrame instance
 * @returns {UnifiedLayoutElements} The columns, LEDs and containers just built
 */
export function createUnifiedLayout(instance) {
  // Create main container for unified layout
  const unifiedLayoutContainer = /** @type {HTMLDivElement} */ (createFullFlexLayout('gram-frame-unified-layout', '2px'))
  unifiedLayoutContainer.style.flexDirection = 'row'
  unifiedLayoutContainer.style.flexWrap = 'nowrap'
  
  // Left Panel - Multi-column horizontal layout. Basis widened by 150px
  // (600 → 750) so the guidance column (flex:1 between the fixed mode + controls
  // columns) gets ~150px more room for the Pan-mode mouse-wheel guidance. It does
  // NOT grow beyond that, so the markers/harmonics tables stay grouped right
  // alongside rather than being pushed to the far edge; but it MAY shrink
  // (shrink:1, min-width:0) so a narrow host stays clip-free instead of cutting
  // off the tables.
  const leftColumn = /** @type {HTMLDivElement} */ (createFullFlexLayout('gram-frame-left-column', '4px'))
  leftColumn.style.flex = '0 1 750px'
  leftColumn.style.width = 'auto'
  leftColumn.style.minWidth = '0'
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
  
  // Style panel (colour, symbol, size, pin) in controls column
  const colorPicker = createColorPicker(instance)
  controlsColumn.appendChild(colorPicker)

  // Add columns to left panel
  leftColumn.appendChild(modeColumn)
  leftColumn.appendChild(guidanceColumn)
  leftColumn.appendChild(controlsColumn)
  
  // Middle Column (185-235px) - Analysis Markers table. Elastic since the Label
  // column was added (feature 231): up to 235px where the host has the width,
  // down to 185px where it does not, so a narrow page keeps the control row the
  // height it always had. See the note in gramframe.css.
  const middleColumn = /** @type {HTMLDivElement} */ (createFlexColumn('gram-frame-middle-column'))
  middleColumn.style.flex = '0 3 235px'
  middleColumn.style.width = 'auto'
  
  // Create markers container in middle column
  const markersContainer = createMarkersContainer()
  middleColumn.appendChild(markersContainer)
  
  // Right Column (175px) - Harmonics sets table. Narrowed from 200px to fund
  // the markers column's Label column (feature 231); its four columns still fit.
  const rightColumn = /** @type {HTMLDivElement} */ (createFlexColumn('gram-frame-right-column'))
  rightColumn.style.flex = '0 0 175px'
  rightColumn.style.minWidth = '175px'
  rightColumn.style.width = '175px'
  
  // Create harmonics container in right column
  const harmonicsContainer = createHarmonicsContainer()
  rightColumn.appendChild(harmonicsContainer)
  
  // Assemble the unified layout
  unifiedLayoutContainer.appendChild(leftColumn)
  unifiedLayoutContainer.appendChild(middleColumn)
  unifiedLayoutContainer.appendChild(rightColumn)
  
  return {
    unifiedLayoutContainer,
    leftColumn,
    middleColumn,
    rightColumn,
    modeColumn,
    guidanceColumn,
    controlsColumn,
    markersContainer,
    harmonicsContainer,
    timeLED,
    freqLED,
    speedLED,
    colorPicker
  }
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
  if (instance.ui.timeLED) {
    const timeValue = instance.ui.timeLED.querySelector('.gram-frame-led-value')
    if (timeValue) {
      timeValue.textContent = formatTime(dataCoords.time)
    }
  }
  
  if (instance.ui.freqLED) {
    const freqValue = instance.ui.freqLED.querySelector('.gram-frame-led-value')
    if (freqValue) {
      freqValue.textContent = dataCoords.freq.toFixed(2)
    }
  }
}

/**
 * Refresh every persistent panel, regardless of which mode is active.
 *
 * Modes are discovered by capability, not by name. This function used to name
 * `analysis` and `harmonics`, cast both to `any` to reach methods the mode
 * interface did not declare, and resolve the harmonics panel element on that
 * mode's behalf. A fifth mode owning a panel now refreshes here with no edit to
 * this file (spec 167, FR-006, AS-4.2, SC-003).
 * @param {GramFrame} instance - GramFrame instance
 */
export function updatePersistentPanels(instance) {
  Object.values(instance.modes)
    .filter(isPanelOwner)
    .forEach(mode => mode.refreshPanel())
}