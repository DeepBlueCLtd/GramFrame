/**
 * What is selected, in the terms every reader of a selection wants.
 *
 * Two things ask the same question and want the same answer: the readout
 * column, which shows the selected feature's numbers instead of the pointer's,
 * and the player, which scrolls the view to the selected feature's time. Each
 * would otherwise walk `state.selection` into the right mode slice by hand, and
 * the second one to do it would be the one that got a case wrong.
 *
 * A leaf, importing nothing but a label helper, and separate from `selection.js`
 * for that reason: that module drives the readout column, so the readout column
 * cannot ask it what is selected without a cycle.
 *
 * Deliberately free of the style panel's targeting rule. `styleTarget` decides
 * what a colour click *acts on*; this is simply what is selected, which is what
 * the readout reads and what the view scrolls to whichever tab is armed.
 */

/// <reference path="../types.js" />

import { normalizeMarkerLabel } from '../utils/markerLabel.js'

/**
 * The selected feature, described.
 * @typedef {Object} SelectionDescription
 * @property {string} label - What to call it: a marker's own label, or its family and position
 * @property {number} time - Where it sits on the time axis, seconds
 * @property {number} freq - The frequency it is about: a marker's own, or a
 *   pin set's spacing
 */

/**
 * Describe the selected feature, or null when nothing is selected.
 *
 * A marker has a time and a frequency outright. A pin set has an anchor time
 * and, for its frequency, its spacing: the number a drag of any member but a
 * sideband set's origin changes, and the one an analyst is measuring
 * (issue #344).
 * @param {GramFrame} instance - GramFrame instance
 * @returns {SelectionDescription|null} The selection, or null
 */
export function describeSelection(instance) {
  const { selection, analysis, harmonics, sidebands } = instance.state
  if (!selection || !selection.selectedType || !selection.selectedId) {
    return null
  }
  const ordinal = (selection.selectedIndex ?? 0) + 1

  if (selection.selectedType === 'marker') {
    const marker = (analysis ? analysis.markers : []).find(candidate => candidate.id === selection.selectedId)
    if (!marker) {
      return null
    }
    return {
      label: normalizeMarkerLabel(marker.label) || `Marker ${ordinal}`,
      time: marker.time,
      freq: marker.freq
    }
  }

  if (selection.selectedType === 'harmonicSet') {
    const set = (harmonics ? harmonics.harmonicSets : []).find(candidate => candidate.id === selection.selectedId)
    return set ? { label: `Harmonics ${ordinal}`, time: set.anchorTime, freq: set.spacing } : null
  }

  const set = (sidebands ? sidebands.sidebandSets : []).find(candidate => candidate.id === selection.selectedId)
  return set ? { label: `Sidebands ${ordinal}`, time: set.anchorTime, freq: set.spacing } : null
}
