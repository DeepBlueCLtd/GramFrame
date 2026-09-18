/**
 * The control row: five columns above the gram.
 *
 * Left to right — the mode rail, the guidance for the armed mode, the cursor
 * readouts, the style panel, and the three annotation tables. Each is separated
 * from the next by a single hairline rather than being boxed: five bordered
 * cards of equal weight gave the eye no entry point, which is the problem this
 * layout exists to solve.
 *
 * The first three columns are fixed-width and the tables take the rest, so a
 * narrow host squeezes the tables (and, past a point, collapses the guidance to
 * its rail) rather than reflowing the instrument face or the tool list.
 *
 * This module assembles; it builds almost nothing itself. The rail is
 * `ModeButtons.js`, the guidance column `GuidancePanel.js`, the readouts
 * `CursorReadout.js`, the style panel `StylePanel.js` and the tables
 * `AnnotationTables.js`.
 */

/// <reference path="../types.js" />

import { createStylePanel } from './StylePanel.js'
import { createCursorReadout } from './CursorReadout.js'
import { createGuidanceColumn } from './GuidancePanel.js'
import { createAnnotationTables } from './AnnotationTables.js'
import { formatTime } from '../utils/timeFormatter.js'

/**
 * Create the control row and hand back the pieces the instance holds on to.
 *
 * Returns the handles rather than writing them onto the instance, so the
 * constructor is the one place they are adopted (spec 167, FR-009).
 * @param {GramFrame} instance - GramFrame instance
 * @returns {UnifiedLayoutElements} The columns, readouts and containers just built
 */
export function createUnifiedLayout(instance) {
  const unifiedLayoutContainer = document.createElement('div')
  unifiedLayoutContainer.className = 'gram-frame-unified-layout'

  // Column 1 — the mode rail. `ModeButtons.js` fills it, twice: once before the
  // modes exist and again once they can declare their command buttons.
  const modeColumn = document.createElement('div')
  modeColumn.className = 'gram-frame-mode-column'

  // Column 2 — the armed mode's gestures, immediately beside the tool they
  // belong to, so the two read as one block.
  const guidance = createGuidanceColumn(instance)

  // Column 3 — the instrument face.
  const readout = createCursorReadout()

  // Column 4 — what the next feature will look like, or what the selected one
  // does.
  const stylePanel = createStylePanel(instance)

  // Column 5 — the three annotation tables, taking whatever width is left.
  const tables = createAnnotationTables()

  unifiedLayoutContainer.appendChild(modeColumn)
  unifiedLayoutContainer.appendChild(guidance.column)
  unifiedLayoutContainer.appendChild(readout.column)
  unifiedLayoutContainer.appendChild(stylePanel)
  unifiedLayoutContainer.appendChild(tables.tables)

  return {
    unifiedLayoutContainer,
    modeColumn,
    guidanceColumn: guidance.column,
    guidancePanel: guidance.body,
    guidanceTitle: guidance.title,
    readoutColumn: readout.column,
    markersContainer: tables.markersContainer,
    harmonicsContainer: tables.harmonicsContainer,
    sidebandsContainer: tables.sidebandsContainer,
    timeLED: readout.timeLED,
    freqLED: readout.freqLED,
    speedLED: readout.speedLED,
    kicker: readout.kicker,
    colorPicker: stylePanel
  }
}

/**
 * Update the universal cursor readouts as the pointer moves over the gram.
 *
 * Stands aside while a feature is selected: the column is then reading that
 * feature, not the pointer, and its kicker says so. `refreshReadoutTarget` in
 * `CursorReadout.js` owns what it shows in that case.
 * @param {GramFrame} instance - GramFrame instance
 * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
 */
export function updateUniversalCursorReadouts(instance, dataCoords) {
  const { selection } = instance.state
  if (selection && selection.selectedId) {
    return
  }

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
 * Re-exported from `core/panelRefresh.js`, where the loop lives so the
 * selection and restyle layers can share it: this module's name is the one the
 * rest of the UI knows it by.
 */
export { refreshPanels as updatePersistentPanels } from '../core/panelRefresh.js'
