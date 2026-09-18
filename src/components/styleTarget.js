/**
 * What the style panel is pointed at, and the four things it can do to it.
 *
 * Kept out of `StylePanel.js` so that module stays about layout: this is the
 * meaning behind the tabs — which target is armed, what it is called, whether
 * it can be renamed, and what Delete removes.
 */

/// <reference path="../types.js" />

import { dispatch } from '../core/state.js'
import { normalizeMarkerLabel } from '../utils/markerLabel.js'
import { findMarkerOwner } from '../modes/capabilities.js'
import { refreshReadoutTarget } from './CursorReadout.js'

/**
 * What the style panel should show about its target.
 * @typedef {Object} StyleTargetDescription
 * @property {boolean} editing - Whether the panel is pointed at an existing feature
 * @property {boolean} selectable - Whether there is a selection the second tab can arm
 * @property {string} name - What that feature is called, for the tab and the footer
 * @property {boolean} labelled - Whether the target takes a free-text label (markers only)
 * @property {string} label - The target's current label, or ''
 */

/**
 * Describe the panel's current target.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {StyleTargetDescription} What to show
 */
export function describeStyleTarget(instance) {
  const { selection, styleTarget } = instance.state
  const selectedId = selection ? selection.selectedId : null
  const selectedType = selection ? selection.selectedType : null

  if (!selectedType || !selectedId) {
    return { editing: false, selectable: false, name: '', labelled: false, label: '' }
  }

  const ordinal = (selection.selectedIndex ?? 0) + 1
  const marker = selectedType === 'marker' ? findMarker(instance, selectedId) : null
  const label = marker ? (normalizeMarkerLabel(marker.label) || '') : ''
  const family = selectedType === 'harmonicSet' ? 'Harmonics'
    : selectedType === 'sidebandSet' ? 'Sidebands'
      : 'Marker'

  return {
    editing: styleTarget === 'selected',
    selectable: true,
    name: label || `${family} ${ordinal}`,
    // Only a marker carries free text today; a pin set is named by what it is.
    labelled: styleTarget === 'selected' && !!marker,
    label
  }
}

/**
 * Arm one of the panel's two targets.
 *
 * Arming "new" deliberately leaves the selection alone: the row stays
 * highlighted and the arrow keys still nudge it, and only what the colour,
 * symbol and pin controls write has changed. That is the whole point of having
 * two tabs rather than a selected/not-selected panel.
 * @param {GramFrame} instance - GramFrame instance
 * @param {StyleTarget} target - Which target to arm
 * @returns {void}
 */
export function setStyleTarget(instance, target) {
  instance.state.styleTarget = target
  if (instance.interaction.syncStyleControls) {
    instance.interaction.syncStyleControls()
  }
  dispatch(instance)
}

/**
 * Rename the targeted marker, or remove its label when the field is cleared.
 *
 * Labels are optional and "no label" is `undefined`, never an empty string, so
 * emptying the field removes the label outright — which is what the field's
 * tooltip promises.
 * @param {GramFrame} instance - GramFrame instance
 * @param {string} value - The field's current text
 * @returns {void}
 */
export function renameSelectedMarker(instance, value) {
  const selection = currentSelection(instance)
  if (!selection || selection.selectedType !== 'marker' || !selection.selectedId) {
    return
  }
  const owner = findMarkerOwner(instance)
  if (owner) {
    // The mode owns what setting a label means — normalising it, removing it
    // when empty, and re-rendering the gram, the table and storage. This is the
    // same call the dialog used to make.
    owner.setMarkerLabel(selection.selectedId, value)
  }
  // The label is the marker's name in three places — the tab, the footer, and
  // the readout column's kicker — so all three re-read themselves: the analyst
  // is typing the very words they show.
  if (instance.interaction.syncStyleControls) {
    instance.interaction.syncStyleControls()
  }
  refreshReadoutTarget(instance)
}

/**
 * Delete whatever the panel is targeting.
 *
 * Routed through the same seams the tables' own × buttons use, so a deletion
 * from the panel and a deletion from a row are the same operation — including
 * the tombstone that makes it survive a merge with another tab.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {void}
 */
export function deleteStyleTarget(instance) {
  const selection = currentSelection(instance)
  if (!selection || !selection.selectedId) {
    return
  }
  const id = selection.selectedId
  if (selection.selectedType === 'harmonicSet') {
    instance.interaction.removeHarmonicSet(id)
    return
  }
  if (selection.selectedType === 'sidebandSet') {
    instance.interaction.removeSidebandSet(id)
    return
  }
  const owner = findMarkerOwner(instance)
  if (owner) {
    owner.removeMarker(id)
  }
}

/**
 * What is selected right now.
 *
 * One reader of `state.selection` in this module, so the three operations below
 * ask the same question in the same words.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {SelectionState} The selection
 */
function currentSelection(instance) {
  return instance.state.selection
}

/**
 * The targeted marker, or null.
 * @param {GramFrame} instance - GramFrame instance
 * @param {string} id - Marker id
 * @returns {AnalysisMarker|null} The marker
 */
function findMarker(instance, id) {
  const owner = findMarkerOwner(instance)
  return owner ? (owner.markers.find(marker => marker.id === id) || null) : null
}
