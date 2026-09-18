/**
 * What the style controls act on, and what happens when they are used.
 *
 * The style panel has two targets — the defaults a new feature will take, or
 * the feature currently selected — and one gate deciding which: everything here
 * routes through {@link getSelectedFeature}, so the tab an analyst can see and
 * what a colour click actually does cannot disagree.
 *
 * Split from `core/keyboardControl.js`, which owns the arrow keys, the
 * selection and the focus. Restyling reads the selection but is not about it,
 * and the two grew into one 700-line module because they happened to share a
 * lookup.
 */

/// <reference path="../types.js" />

import { dispatch, markAnnotationsChanged } from './state.js'
import { findPinSetOwner } from '../modes/capabilities.js'
import { refreshPanels } from './panelRefresh.js'
import { DEFAULT_SYMBOL } from '../rendering/symbols.js'

/**
 * Resolve the feature the style controls are pointed at.
 *
 * That is the selected feature — but only while the style panel is targeting
 * it. This is the single gate for that: `getActiveStyle` and all four
 * `apply*ToSelectedFeature` functions read the answer from here, so the tab an
 * analyst can see and what a colour click actually does cannot disagree.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {{type: SelectedFeatureType, feature: AnalysisMarker|PinSet}|null} Targeted feature or null
 */
function getSelectedFeature(instance) {
  const { selection: sel, styleTarget } = instance.state
  // The style panel's twin tabs decide what the style controls act on. With the
  // "New features" tab armed they set the defaults even while a row is
  // selected, so an analyst can change what comes next without first giving up
  // the selection they are nudging.
  if (styleTarget === 'new') {
    return null
  }
  if (!sel || !sel.selectedType || !sel.selectedId) {
    return null
  }
  if (sel.selectedType === 'marker') {
    const analysis = instance.state.analysis
    const feature = analysis && analysis.markers
      ? analysis.markers.find(m => m.id === sel.selectedId)
      : null
    return feature ? { type: 'marker', feature } : null
  }
  const owner = findPinSetOwner(instance, sel.selectedType)
  if (owner) {
    const feature = owner.sets.find(set => set.id === sel.selectedId)
    return feature ? { type: owner.selectionType, feature } : null
  }
  return null
}

/**
 * Get the colour/symbol/pin state the style controls should currently show: the
 * selected feature's when one is selected, otherwise the next-feature defaults.
 *
 * `showPin` only means anything for harmonic sets (markers have no pin), so
 * `pinApplies` tells the panel whether to offer the pin toggle at all: false
 * while a marker is selected, true otherwise.
 *
 * `largeSymbols` is part of the temporary symbol-size experiment and follows the
 * same rule as colour/symbol, so the toggle always reflects whatever the
 * controls would restyle.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {{color: string, symbol: SymbolType, showPin: boolean, pinApplies: boolean, largeSymbols: boolean}} Active style
 */
export function getActiveStyle(instance) {
  const selected = getSelectedFeature(instance)
  if (selected) {
    // Markers have no pin; every pin set (harmonic or sideband) does.
    const isPinSet = selected.type !== 'marker'
    return {
      color: selected.feature.color,
      symbol: /** @type {SymbolType} */ (selected.feature.symbol || DEFAULT_SYMBOL),
      // A pin set without an explicit `showPin` (legacy/restored) is pinned.
      showPin: isPinSet
        ? /** @type {PinSet} */ (selected.feature).showPin !== false
        : instance.state.showHarmonicPin !== false,
      pinApplies: isPinSet,
      largeSymbols: !!selected.feature.largeSymbols
    }
  }
  const { selectedColor, selectedSymbol, showHarmonicPin, largeSymbols } = instance.state
  return {
    color: selectedColor,
    symbol: selectedSymbol,
    showPin: showHarmonicPin !== false,
    pinApplies: true,
    largeSymbols: !!largeSymbols
  }
}

/**
 * Re-render the overlay and the affected feature's table after a restyle, then
 * notify listeners (which also triggers persistence).
 * @param {GramFrame} instance - GramFrame instance
 * @param {SelectedFeatureType} _type - Which feature type changed
 */
function refreshFeatureVisuals(instance, _type) {
  if (instance.featureRenderer) {
    instance.featureRenderer.renderAllPersistentFeatures()
  }
  refreshPanels(instance)
  dispatch(instance)
}

/**
 * Apply a colour to the currently selected feature, updating the overlay and
 * table instantly (feature 161, FR-005/FR-007). No-op when nothing is selected.
 * @param {GramFrame} instance - GramFrame instance
 * @param {string} color - Hex colour to apply
 * @returns {boolean} True if a feature was restyled
 */
export function applyColorToSelectedFeature(instance, color) {
  const selected = getSelectedFeature(instance)
  if (!selected) {
    return false
  }
  selected.feature.color = color
  markAnnotationsChanged(instance)
  refreshFeatureVisuals(instance, selected.type)
  return true
}

/**
 * Apply a symbol to the currently selected feature, updating the overlay and
 * table instantly (feature 161, FR-006/FR-007). No-op when nothing is selected.
 * @param {GramFrame} instance - GramFrame instance
 * @param {SymbolType} symbol - Symbol style to apply
 * @returns {boolean} True if a feature was restyled
 */
export function applySymbolToSelectedFeature(instance, symbol) {
  const selected = getSelectedFeature(instance)
  if (!selected) {
    return false
  }
  selected.feature.symbol = symbol
  markAnnotationsChanged(instance)
  refreshFeatureVisuals(instance, selected.type)
  return true
}

/**
 * Show or hide the vertical pin lines of the currently selected pin set —
 * harmonic or sideband — updating the overlay and table instantly. No-op
 * (returns false) when nothing is selected or when the selection is a marker,
 * which has no pin — the caller then treats the change as setting the session
 * default instead.
 * @param {GramFrame} instance - GramFrame instance
 * @param {boolean} showPin - Whether the set should draw its pin lines
 * @returns {boolean} True if a harmonic set was restyled
 */
export function applyPinToSelectedFeature(instance, showPin) {
  const selected = getSelectedFeature(instance)
  if (!selected || selected.type === 'marker') {
    return false
  }
  /** @type {PinSet} */ (selected.feature).showPin = !!showPin
  // `showPin` is a persisted field, so this restyle must reach storage like its
  // colour/symbol siblings — without the mark, a pin toggle survived only until
  // the next reload (H1).
  markAnnotationsChanged(instance)
  refreshFeatureVisuals(instance, selected.type)
  return true
}

/**
 * Apply the large-symbol size to the currently selected feature, updating the
 * overlay instantly. No-op when nothing is selected.
 *
 * EXPERIMENT (temporary): the size is per-feature so two sets can be shown at
 * different sizes side by side for comparison. Delete with the rest of the
 * experiment once a size is agreed.
 * @param {GramFrame} instance - GramFrame instance
 * @param {boolean} large - Whether the feature draws its symbol at the large size
 * @returns {boolean} True if a feature was restyled
 */
export function applyLargeSymbolsToSelectedFeature(instance, large) {
  const selected = getSelectedFeature(instance)
  if (!selected) {
    return false
  }
  selected.feature.largeSymbols = large
  refreshFeatureVisuals(instance, selected.type)
  return true
}
