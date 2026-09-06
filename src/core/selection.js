/**
 * Which feature is selected: setting it, clearing it, and describing it.
 *
 * One feature at a time is selected across all three annotation tables, and
 * almost everything in the control row reads that fact — the tables invert its
 * row, the readout column shows its numbers instead of the pointer's, the style
 * panel points its controls at it, and on a player the view scrolls to it. This
 * module is where those consequences are settled, so a caller says only *what*
 * is selected and never has to remember the five things that follow.
 *
 * It used to live in `keyboardControl.js`, which is about arrow keys: selection
 * is what the arrow keys act *on*, not part of how they work, and every other
 * caller of `setSelection` had to import a keyboard module to say a row was
 * clicked.
 *
 * What is selected is *described* next door, in `selectionTarget.js`: the
 * readout column needs that answer and this module calls into the readout
 * column, so the description has to be a leaf both can reach.
 */

/// <reference path="../types.js" />

import { dispatch } from './state.js'
import { refreshPanels } from './panelRefresh.js'
import { setFocusedInstance } from './FocusManager.js'
import { refreshReadoutTarget } from '../components/CursorReadout.js'
import { revealTime } from '../player/playerView.js'
import { describeSelection } from './selectionTarget.js'

/**
 * Set selection state for an item
 * @param {GramFrame} instance - GramFrame instance
 * @param {string} type - Type of item ('marker' | 'harmonicSet' | 'sidebandSet')
 * @param {string} id - ID of selected item
 * @param {number} index - Index in table for display purposes
 */
export function setSelection(instance, type, id, index) {
  // When selecting an item, also focus the instance
  setFocusedInstance(instance)

  const state = instance.state
  const selection = state.selection
  selection.selectedType = type
  selection.selectedId = id
  selection.selectedIndex = index
  // Selecting a feature arms the style panel's second target: the reason to
  // select something is almost always to change it.
  state.styleTarget = 'selected'

  // Update visual feedback
  updateSelectionVisuals(instance)

  // Reflect the selected feature's colour/symbol in the style controls so the
  // analyst can restyle it in place (feature 161, FR-004).
  if (instance.interaction.syncStyleControls) {
    instance.interaction.syncStyleControls()
  }

  // On a player the selected feature is usually off screen — a recording is far
  // taller than its window — so scroll to it. `revealTime` decides whether that
  // is wanted; here we only have to say what time is of interest.
  const selected = describeSelection(instance)
  if (selected) {
    revealTime(instance, selected.time)
  }

  dispatch(instance)
}

/**
 * Select a feature, or deselect it when it is already the selected one.
 *
 * What clicking a row in any of the three annotation tables means. All three
 * wrote it out for themselves — the same four lines against
 * `instance.state.selection`, differing only in the selection type — and a
 * fourth table would have written it a fourth time.
 * @param {GramFrame} instance - GramFrame instance
 * @param {SelectedFeatureType} type - Which family the id belongs to
 * @param {string} id - The feature's id
 * @param {number} index - Its row index, for display
 * @returns {void}
 */
export function toggleSelection(instance, type, id, index) {
  if (isFeatureSelected(instance, type, id)) {
    clearSelection(instance)
  } else {
    setSelection(instance, type, id, index)
  }
}

/**
 * Whether a given feature is the selected one.
 * @param {GramFrame} instance - GramFrame instance
 * @param {SelectedFeatureType} type - Which family the id belongs to
 * @param {string} id - The feature's id
 * @returns {boolean} True when this feature is selected
 */
export function isFeatureSelected(instance, type, id) {
  const selection = instance.state.selection
  return selection.selectedType === type && selection.selectedId === id
}

/**
 * Clear current selection
 * @param {GramFrame} instance - GramFrame instance
 */
export function clearSelection(instance) {
  const state = instance.state
  const selection = state.selection
  selection.selectedType = null
  selection.selectedId = null
  selection.selectedIndex = null
  state.styleTarget = 'new'

  // Update visual feedback
  updateSelectionVisuals(instance)

  // With nothing selected, the style controls revert to targeting the NEXT
  // created feature (feature 161, FR-013).
  if (instance.interaction.syncStyleControls) {
    instance.interaction.syncStyleControls()
  }

  dispatch(instance)
}

/**
 * Update visual feedback for current selection
 * @param {GramFrame} instance - GramFrame instance
 */
export function updateSelectionVisuals(instance) {
  // Selected-row styling is now table mechanism: both tables mark their own
  // selected row through the shared DiffingTable, so this only has to ask them
  // to re-diff. The two hand-written `tr[data-...-id]` lookups this replaces
  // were the same code twice (spec 166, T3).
  refreshPanels(instance)
  // The readout column reads the selection when there is one, so it changes
  // target here too rather than waiting for the next pointer move — which, with
  // something selected, would never arrive.
  refreshReadoutTarget(instance)
}
