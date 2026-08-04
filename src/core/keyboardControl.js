/**
 * Keyboard control system for fine-grained marker and harmonic positioning
 * 
 * This module provides keyboard arrow key support for fine control of
 * selected markers and harmonic sets with variable increment sizes.
 */

/// <reference path="../types.js" />

import { dispatch, markAnnotationsChanged } from './state.js'
import { dataToSVG, svgToImage, imageToData, clampToImage } from '../utils/coordinates.js'
import { updateHarmonicPanelContent } from '../components/HarmonicPanel.js'
import { isPanelOwner } from '../modes/capabilities.js'
import { DEFAULT_SYMBOL } from '../rendering/symbols.js'
import { registerInstance, unregisterInstance, getFocusedInstance, focusNextInstance, focusPreviousInstance, setFocusedInstance, getRegisteredInstanceCount, clearFocusedInstance, isNodeInsideAnyInstance } from './FocusManager.js'
import { cancelActiveDrag } from '../modes/shared/BaseDragHandler.js'

/**
 * Movement increments in pixels
 */
const MOVEMENT_INCREMENTS = {
  normal: 1,    // Arrow keys alone: 1-pixel increments
  fast: 5       // Shift + Arrow keys: 5-pixel increments
}

/**
 * Global keyboard handler - only one listener for all instances
 */
/** @type {((event: KeyboardEvent) => void)|null} */
let globalKeyboardHandler = null
/** @type {((event: MouseEvent) => void)|null} */
let globalMousedownHandler = null
let keyboardHandlerInitialized = false

/**
 * Initialize keyboard control system for a GramFrame instance
 * @param {GramFrame} instance - GramFrame instance
 */
export function initializeKeyboardControl(instance) {
  // Register this instance for focus management
  registerInstance(instance)

  // Only set up the global handlers once
  if (!keyboardHandlerInitialized) {
    globalKeyboardHandler = (/** @type {KeyboardEvent} */ event) => handleGlobalKeyboardEvent(event)
    document.addEventListener('keydown', globalKeyboardHandler)
    // A click outside every registered instance releases keyboard focus, so a
    // gram never permanently captures the page's arrow keys and Tab (BH-3).
    globalMousedownHandler = (/** @type {MouseEvent} */ event) => {
      if (!isNodeInsideAnyInstance(event.target)) {
        clearFocusedInstance()
      }
    }
    document.addEventListener('mousedown', globalMousedownHandler)
    keyboardHandlerInitialized = true
  }
}

/**
 * Clean up keyboard control system for a GramFrame instance
 * @param {GramFrame} instance - GramFrame instance
 */
export function cleanupKeyboardControl(instance) {
  // Unregister this instance from focus management
  unregisterInstance(instance)

  // Uninstall the shared document-level handlers once the last instance is gone
  // (GF-14). While any instance remains they must stay installed — they are
  // shared, not per-instance — so removal is gated on the registered count, not
  // on this particular instance. A later instance reinstalls them via
  // initializeKeyboardControl.
  if (getRegisteredInstanceCount() === 0) {
    if (globalKeyboardHandler) {
      document.removeEventListener('keydown', globalKeyboardHandler)
      globalKeyboardHandler = null
    }
    if (globalMousedownHandler) {
      document.removeEventListener('mousedown', globalMousedownHandler)
      globalMousedownHandler = null
    }
    keyboardHandlerInitialized = false
  }
}

/**
 * Whether a keyboard event originated in an editable element — a text input,
 * textarea, select or contenteditable region, on the host page or in one of
 * our own dialogs (the Manual Harmonic modal's spacing input).
 * @param {EventTarget|null} target - The event's target
 * @returns {boolean} True when the target takes text/keyboard input itself
 */
function isEditableTarget(target) {
  if (!(target instanceof Element)) {
    return false
  }
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true
  }
  return target instanceof HTMLElement && target.isContentEditable
}

/**
 * Global keyboard event handler that routes to the focused instance
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleGlobalKeyboardEvent(event) {
  // Typing in an editable element is never ours to intercept: arrows must move
  // the caret and Tab must move focus — including inside the Manual Harmonic
  // modal's own spacing input, which this handler used to hijack (BH-3).
  if (isEditableTarget(event.target)) {
    return
  }

  // Get the currently focused instance
  const focusedInstance = getFocusedInstance()

  // Handle Tab navigation between instances — but only when there is actually
  // somewhere to cycle to. With one instance, swallowing Tab just breaks the
  // host page's keyboard navigation (BH-3).
  if (event.key === 'Tab') {
    if (!focusedInstance || getRegisteredInstanceCount() <= 1) {
      return // Let Tab work normally for form navigation
    }

    if (event.shiftKey) {
      focusPreviousInstance()
    } else {
      focusNextInstance()
    }
    event.preventDefault()
    return
  }
  if (!focusedInstance) {
    return // No instance is focused
  }

  // Escape cancels an in-progress drag (the engine's contract promises it; H2)
  if (event.key === 'Escape') {
    if (cancelActiveDrag(focusedInstance)) {
      event.preventDefault()
    }
    return
  }

  // Only handle arrow keys for movement
  if (!isArrowKey(event.key)) {
    return
  }

  // Check if there's a selected item in the focused instance
  const selection = focusedInstance.state.selection
  if (!selection || !selection.selectedType || !selection.selectedId) {
    return // No selection
  }


  // Prevent default browser behavior
  event.preventDefault()
  event.stopPropagation()
  
  // Determine increment size based on modifier keys. The increment is in
  // rendered pixels and needs no zoom compensation: the canonical coordinate
  // module positions against the live image element, so a rendered pixel is a
  // rendered pixel at any zoom level (spec 166, FR-003 / I2).
  const increment = event.shiftKey ? MOVEMENT_INCREMENTS.fast : MOVEMENT_INCREMENTS.normal

  // Calculate movement direction
  const movement = calculateMovementFromKey(event.key, increment)
  
  // Apply movement based on selected item type
  if (selection.selectedType === 'marker') {
    moveSelectedMarker(focusedInstance, selection.selectedId, movement)
  } else if (selection.selectedType === 'harmonicSet') {
    moveSelectedHarmonicSet(focusedInstance, selection.selectedId, movement)
  }
}

/**
 * Check if the key is an arrow key
 * @param {string} key - Key value from keyboard event
 * @returns {boolean} True if arrow key
 */
function isArrowKey(key) {
  return ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)
}

/**
 * Calculate movement vector from arrow key
 * @param {string} key - Arrow key
 * @param {number} increment - Movement increment in pixels
 * @returns {MovementVector} Movement vector {dx, dy}
 */
function calculateMovementFromKey(key, increment) {
  switch (key) {
    case 'ArrowLeft':
      return { dx: -increment, dy: 0 }
    case 'ArrowRight':
      return { dx: increment, dy: 0 }
    case 'ArrowUp':
      return { dx: 0, dy: -increment }
    case 'ArrowDown':
      return { dx: 0, dy: increment }
    default:
      return { dx: 0, dy: 0 }
  }
}

/**
 * Move a selected marker by pixel increments
 * @param {GramFrame} instance - GramFrame instance
 * @param {string} markerId - ID of marker to move
 * @param {MovementVector} movement - Movement vector {dx, dy}
 */
function moveSelectedMarker(instance, markerId, movement) {
  const analysis = instance.state.analysis
  if (!analysis || !analysis.markers) {
    return
  }
  
  const marker = analysis.markers.find(m => m.id === markerId)
  if (!marker) {
    return
  }

  // Move in SVG space, then convert back. The canonical module reads the live
  // image element, so `movement` is in rendered pixels at any zoom level and
  // needs no external compensation.
  //
  // `dataToSVG` takes frequency in the raw configured scale while `imageToData`
  // divides by rate (see the module's note), so the rate is re-applied on the
  // way out and removed on the way back — keeping this a true round trip, as
  // the private pair this replaces was.
  const currentSVG = dataToSVG(
    { freq: marker.freq * instance.state.rate, time: marker.time },
    instance.state,
    instance.ui.spectrogramImage
  )
  const newSVG = {
    x: currentSVG.x + movement.dx,
    y: currentSVG.y + movement.dy
  }

  // Clamping is explicit: a marker pushed past an edge pins to it rather than
  // leaving the image, as it did before consolidation.
  const image = svgToImage(newSVG.x, newSVG.y, instance.state, instance.ui.spectrogramImage)
  const clamped = clampToImage(image.x, image.y, instance.state)
  const newData = imageToData(clamped.x, clamped.y, instance.state)
  
  // Update marker position
  marker.freq = newData.freq
  marker.time = newData.time
  markAnnotationsChanged(instance)
  
  // Re-render features and notify listeners
  if (instance.featureRenderer) {
    instance.featureRenderer.renderAllPersistentFeatures()
  }
  
  refreshPanels(instance)

  dispatch(instance)
}

/**
 * Move a selected harmonic set by pixel increments  
 * @param {GramFrame} instance - GramFrame instance
 * @param {string} harmonicSetId - ID of harmonic set to move
 * @param {MovementVector} movement - Movement vector {dx, dy}
 */
function moveSelectedHarmonicSet(instance, harmonicSetId, movement) {
  const harmonics = instance.state.harmonics
  if (!harmonics || !harmonics.harmonicSets) {
    return
  }
  
  const harmonicSet = harmonics.harmonicSets.find(h => h.id === harmonicSetId)
  if (!harmonicSet) {
    return
  }
  
  /** @type {Partial<HarmonicSet>} */
  const updates = {}
  
  // Both branches go through the canonical coordinate module, so the movement
  // is in rendered pixels at any zoom level (FR-002, FR-003).
  const { timeMin, timeMax } = instance.state.config
  const viewport = instance.state
  const image = instance.ui.spectrogramImage

  /**
   * Convert an SVG point to data coordinates through the canonical module.
   * @param {number} svgX - SVG X coordinate
   * @param {number} svgY - SVG Y coordinate
   * @returns {DataCoordinates} Data coordinates
   */
  const svgPointToData = (svgX, svgY) => {
    const imagePoint = svgToImage(svgX, svgY, viewport, image)
    return imageToData(imagePoint.x, imagePoint.y, viewport)
  }

  // For horizontal movement (frequency/spacing adjustment)
  if (movement.dx !== 0) {
    // Measure what one keypress is worth in frequency rather than re-deriving
    // it: take a reference point and the same point moved by the increment.
    const reference = dataToSVG(
      { freq: instance.state.config.freqMin, time: timeMax },
      viewport,
      image
    )
    const before = svgPointToData(reference.x, reference.y)
    const after = svgPointToData(reference.x + movement.dx, reference.y)

    // Positive dx increases spacing, negative dx decreases spacing
    const spacingChange = after.freq - before.freq
    updates.spacing = Math.max(1.0, harmonicSet.spacing + spacingChange)
  }

  // For vertical movement (time/anchor position adjustment)
  if (movement.dy !== 0) {
    const anchorSVG = dataToSVG(
      { freq: instance.state.config.freqMin, time: harmonicSet.anchorTime },
      viewport,
      image
    )
    const moved = svgPointToData(anchorSVG.x, anchorSVG.y + movement.dy)

    // Clamp to valid time range
    updates.anchorTime = Math.max(timeMin, Math.min(timeMax, moved.time))
  }
  
  // Apply updates directly to the harmonic set
  if (Object.keys(updates).length > 0) {
    const setIndex = harmonics.harmonicSets.findIndex(set => set.id === harmonicSetId)
    if (setIndex !== -1) {
      Object.assign(harmonics.harmonicSets[setIndex], updates)
      markAnnotationsChanged(instance)
      
      // Update visual elements if harmonic panel exists. This uses the static
      // import at the top of the file: the dynamic import that used to be here
      // cited circular dependencies, but the same module is already imported
      // statically and called synchronously elsewhere in this file — so it only
      // delayed the panel update by a microtask and swallowed any error.
      if (instance.ui.harmonicPanel) {
        updateHarmonicPanelContent(instance.ui.harmonicPanel, instance)
      }
      
      // Trigger re-render of persistent features to show updated harmonic set
      if (instance.featureRenderer) {
        instance.featureRenderer.renderAllPersistentFeatures()
      }
      
      dispatch(instance)
    }
  }
}


/**
 * Set selection state for an item
 * @param {GramFrame} instance - GramFrame instance
 * @param {string} type - Type of item ('marker' | 'harmonicSet')
 * @param {string} id - ID of selected item
 * @param {number} index - Index in table for display purposes
 */
export function setSelection(instance, type, id, index) {
  // When selecting an item, also focus the instance
  setFocusedInstance(instance)

  const selection = instance.state.selection
  selection.selectedType = type
  selection.selectedId = id
  selection.selectedIndex = index

  // Update visual feedback
  updateSelectionVisuals(instance)

  // Reflect the selected feature's colour/symbol in the style controls so the
  // analyst can restyle it in place (feature 161, FR-004).
  if (instance.interaction.syncStyleControls) {
    instance.interaction.syncStyleControls()
  }

  dispatch(instance)
}

/**
 * Clear current selection
 * @param {GramFrame} instance - GramFrame instance
 */
export function clearSelection(instance) {
  const selection = instance.state.selection
  selection.selectedType = null
  selection.selectedId = null
  selection.selectedIndex = null

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
 * Resolve the currently selected feature (marker or harmonic set).
 * @param {GramFrame} instance - GramFrame instance
 * @returns {{type: 'marker'|'harmonicSet', feature: AnalysisMarker|HarmonicSet}|null} Selected feature or null
 */
function getSelectedFeature(instance) {
  const sel = instance.state.selection
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
  if (sel.selectedType === 'harmonicSet') {
    const harmonics = instance.state.harmonics
    const feature = harmonics && harmonics.harmonicSets
      ? harmonics.harmonicSets.find(h => h.id === sel.selectedId)
      : null
    return feature ? { type: 'harmonicSet', feature } : null
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
    const isHarmonicSet = selected.type === 'harmonicSet'
    return {
      color: selected.feature.color,
      symbol: /** @type {SymbolType} */ (selected.feature.symbol || DEFAULT_SYMBOL),
      // A harmonic set without an explicit `showPin` (legacy/restored) is pinned.
      showPin: isHarmonicSet
        ? /** @type {HarmonicSet} */ (selected.feature).showPin !== false
        : instance.state.showHarmonicPin !== false,
      pinApplies: isHarmonicSet,
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
 * @param {'marker'|'harmonicSet'} type - Which feature type changed
 */
function refreshFeatureVisuals(instance, type) {
  if (instance.featureRenderer) {
    instance.featureRenderer.renderAllPersistentFeatures()
  }
  if (type === 'marker' || type === 'harmonicSet') {
    refreshPanels(instance)
  }
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
 * Show or hide the vertical pin lines of the currently selected harmonic set,
 * updating the overlay and table instantly. No-op (returns false) when nothing
 * is selected or when the selection is a marker, which has no pin — the caller
 * then treats the change as setting the session default instead.
 * @param {GramFrame} instance - GramFrame instance
 * @param {boolean} showPin - Whether the set should draw its pin lines
 * @returns {boolean} True if a harmonic set was restyled
 */
export function applyPinToSelectedFeature(instance, showPin) {
  const selected = getSelectedFeature(instance)
  if (!selected || selected.type !== 'harmonicSet') {
    return false
  }
  /** @type {HarmonicSet} */ (selected.feature).showPin = !!showPin
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

/**
 * Remove a harmonic set by ID
 * @param {GramFrame} instance - GramFrame instance
 * @param {string} id - Harmonic set ID to remove
 */
export function removeHarmonicSet(instance, id) {
  const { harmonics, selection } = instance.state
  const setIndex = harmonics.harmonicSets.findIndex(set => set.id === id)
  if (setIndex !== -1) {
    // Clear selection if removing the selected harmonic set
    if (selection.selectedType === 'harmonicSet' && selection.selectedId === id) {
      clearSelection(instance)
    }
    
    harmonics.harmonicSets.splice(setIndex, 1)
    // Deleting a set is an annotation mutation: masked today by the signature's
    // set-count field, but the mark is the contract (BH-24).
    markAnnotationsChanged(instance)

    // Update visual elements
    if (instance.ui.harmonicPanel) {
      updateHarmonicPanelContent(instance.ui.harmonicPanel, instance)
    }
    
    // Trigger re-render of persistent features to remove the harmonic set
    if (instance.featureRenderer) {
      instance.featureRenderer.renderAllPersistentFeatures()
    }
    
    dispatch(instance)
  }
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
}

/**
 * Ask every mode that owns a persistent panel to refresh it.
 *
 * Replaces two `instance.modes['analysis']` reach-ins plus a direct
 * `updateHarmonicPanelContent` call. Both sites were doing the same thing —
 * "the tables are stale, redraw them" — through the modes' internals rather
 * than through the `PanelOwner` capability (spec 167, FR-006).
 *
 * `MainUI.updatePersistentPanels` is the same loop, but importing it here would
 * close a cycle back through `UIComponents` → `ColorPicker` → this module.
 * `modes/capabilities.js` imports nothing, so the predicate is safe to take.
 * @param {GramFrame} instance - GramFrame instance
 */
function refreshPanels(instance) {
  Object.values(instance.modes)
    .filter(isPanelOwner)
    .forEach(mode => mode.refreshPanel())
}
