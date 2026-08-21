/**
 * MainUI module for GramFrame
 * 
 * This module handles the creation and management of the main UI layout
 * including the unified 4-column layout, LED displays, and container setup.
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
 * Create the unified layout for readouts: the left readout column plus the
 * three persistent feature tables (markers, harmonics, sidebands).
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
  
  // Create doppler speed LED (spans full width). Unlike the time/frequency
  // readouts it lays its label out beside the value rather than above it: the
  // label wraps into the space the stacked form wasted to its right, so the
  // readout costs the control row less height.
  //
  // The gap between "Doppler" and "Speed" is a non-breaking space, written as a
  // \u00a0 escape so it stays visible in the source. The label is sized
  // `width: min-content`, which breaks at every ordinary space and would stack
  // three lines; gluing the first two words holds it to two - "Doppler Speed"
  // over "(kts)". Playwright normalises \u00a0 to a plain space, so the
  // `:text-is("Doppler Speed (kts)")` locators in tests/helpers still match.
  const speedLED = createLEDDisplay('Doppler\u00a0Speed (kts)', '0.0')
  speedLED.classList.add('gram-frame-led-inline')
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
  
  // Right Column (175px) - the pin-set table: Harmonics, or Sidebands while
  // that mode is active. Narrowed from 200px to fund the markers column's Label
  // column (feature 231); its four columns still fit.
  //
  // Sidebands share this column rather than taking a fourth of their own, and
  // take turns in it rather than splitting it (issue #241). Both alternatives
  // were measured at a 1280px viewport, where the control row's width is
  // already fully spoken for:
  //   - a fourth fixed column squeezes the guidance column to its 150px
  //     minimum, where the text wraps to roughly twice the height and pushes
  //     the whole row — and the spectrogram under it — ~80px down the page;
  //   - splitting this column in two leaves each table ~45px of body, which is
  //     less than one row: the sticky header covers whatever you scroll to.
  // Swapping costs neither. The two tables are mode-specific in a way the
  // markers table is not: a sideband set is managed from Sidebands mode.
  const rightColumn = /** @type {HTMLDivElement} */ (createFlexColumn('gram-frame-right-column'))
  rightColumn.style.flex = '0 0 175px'
  rightColumn.style.minWidth = '175px'
  rightColumn.style.width = '175px'
  
  // Create harmonics container in right column
  const harmonicsContainer = createHarmonicsContainer()
  rightColumn.appendChild(harmonicsContainer)

  // Sideband sets, in the same column, shown while Sidebands mode is active
  const sidebandsContainer = createSidebandsContainer()
  rightColumn.appendChild(sidebandsContainer)

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
    sidebandsContainer,
    timeLED,
    freqLED,
    speedLED,
    colorPicker
  }
}

/**
 * Create the sidebands container for sidebands mode.
 *
 * The same header-plus-table structure as the markers panel (no action slot —
 * sidebands have no "+ Manual" equivalent), so all three panels carry their
 * rule, spacing and heading position from the one `gram-frame-panel-header`
 * rule rather than from per-panel inline styles. It shares the right column
 * with the harmonics panel, one shown at a time — see the note there — so it is
 * `flex: 1` like its counterpart and fills the column when it is the one shown.
 * @returns {HTMLDivElement} The sidebands container
 */
function createSidebandsContainer() {
  const sidebandsContainer = document.createElement('div')
  sidebandsContainer.className = 'gram-frame-sidebands-persistent-container'

  const header = document.createElement('div')
  header.className = 'gram-frame-panel-header'

  const label = document.createElement('h4')
  label.textContent = 'Sidebands'
  header.appendChild(label)
  sidebandsContainer.appendChild(header)

  return sidebandsContainer
}

/**
 * Create markers container for analysis mode
 * @returns {HTMLDivElement} The markers container
 */
function createMarkersContainer() {
  // Layout comes from the shared `*-persistent-container` CSS rule, not from
  // inline styles: they duplicated it exactly, and an inline `display` cannot be
  // overridden by the stylesheet — which is how the sidebands panel takes its
  // turn in the right column.
  const markersContainer = document.createElement('div')
  markersContainer.className = 'gram-frame-markers-persistent-container'
  
  // Same header row as the harmonics panel, minus the action slot: both panels
  // then carry their rule, their spacing and their heading position from one
  // CSS rule instead of two sets of inline styles that had drifted apart.
  const markersHeader = document.createElement('div')
  markersHeader.className = 'gram-frame-panel-header'

  const markersLabel = document.createElement('h4')
  markersLabel.textContent = 'Markers'
  markersHeader.appendChild(markersLabel)
  markersContainer.appendChild(markersHeader)

  return markersContainer
}

/**
 * Create harmonics container for harmonics mode
 * @returns {HTMLDivElement} The harmonics container
 */
function createHarmonicsContainer() {
  const harmonicsContainer = document.createElement('div')
  harmonicsContainer.className = 'gram-frame-harmonics-persistent-container'
  
  // Create header container with title and button area
  const harmonicsHeader = document.createElement('div')
  harmonicsHeader.className = 'gram-frame-panel-header gram-frame-harmonics-header'

  const harmonicsLabel = document.createElement('h4')
  harmonicsLabel.textContent = 'Harmonics'

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