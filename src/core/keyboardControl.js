/**
 * Keyboard control system for fine-grained marker and harmonic positioning
 * 
 * This module provides keyboard arrow key support for fine control of
 * selected markers and harmonic sets with variable increment sizes.
 */

/// <reference path="../types.js" />

import { dispatch, markAnnotationsChanged } from './state.js'
import { commitAnnotationChange } from './annotationCommit.js'
import { dataToSVG, svgToImage, imageToData, nudgeData, dataFrequencyRange } from '../utils/coordinates.js'
import { isPanelOwner, findPinSetOwner } from '../modes/capabilities.js'
import { DEFAULT_SYMBOL } from '../rendering/symbols.js'
import { registerInstance, unregisterInstance, getFocusedInstance, setFocusedInstance, getRegisteredInstanceCount, clearFocusedInstance, isNodeInsideAnyInstance, instanceContaining } from './FocusManager.js'
import { cancelActiveDrag } from '../modes/shared/BaseDragHandler.js'
import { isPlaying, isPlayerActive } from '../player/playerView.js'

/**
 * Seconds a transport seek key moves by, plain and with Shift.
 */
const SEEK_STEP_SECONDS = 5
const SEEK_STEP_SHIFT_SECONDS = 30

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
/** @type {((event: FocusEvent) => void)|null} */
let globalFocusinHandler = null
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
    // Keyboard focus follows DOM focus (R9-09). The component's own controls
    // are real buttons and already in the host page's tab order, so tabbing
    // into a gram is how a keyboard user reaches it — and that should make it
    // the gram the arrow keys act on, exactly as clicking it does. This is
    // what replaces the Tab-cycling that used to swallow the key page-wide.
    globalFocusinHandler = (/** @type {FocusEvent} */ event) => {
      const owner = instanceContaining(event.target)
      if (owner) {
        setFocusedInstance(owner)
      }
    }
    document.addEventListener('focusin', globalFocusinHandler)
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
    if (globalFocusinHandler) {
      document.removeEventListener('focusin', globalFocusinHandler)
      globalFocusinHandler = null
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

  // Tab is the host page's, always (R9-09).
  //
  // This handler used to consume it whenever two or more instances were
  // registered and one was focused, cycling a *custom* focus between grams
  // while DOM focus stayed on <body>. On the two-gram page that meant four
  // Tabs toggled the highlight between the instances and never reached the
  // page's next input: the component captured the host's keyboard navigation
  // until the user clicked elsewhere. The single-instance case was fixed in
  // August; this is the multi-instance half of BH-3.
  //
  // Nothing is lost by letting it through. The component's controls are real
  // buttons already in the tab order, so Tab walks into a gram, through its
  // controls and out the other side — and the `focusin` handler above makes
  // whichever gram the focus lands in the one the arrow keys act on. That is
  // the behaviour the cycling was approximating, except it now moves DOM focus
  // too, so a keyboard user can actually reach the controls.
  if (event.key === 'Tab') {
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

  // Transport keys on a focused audio-sourced instance (spec 168, D13). None
  // of these is an arrow key, so nudging is untouched, and none is bound on an
  // image-backed instance, so nothing there changes (FR-021).
  if (isPlayerActive(focusedInstance) && handleTransportKey(focusedInstance, event)) {
    event.preventDefault()
    return
  }

  // Only handle arrow keys for movement
  if (!isArrowKey(event.key)) {
    return
  }

  // Moving an annotation is inert while the recording plays (spec 168, FR-013)
  if (isPlaying(focusedInstance)) {
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
  } else {
    // Every other selectable feature is a pin set — a harmonic set or a
    // sideband set — and the owning mode is found by capability, not by name.
    const owner = findPinSetOwner(focusedInstance, selection.selectedType)
    if (owner) {
      moveSelectedPinSet(focusedInstance, owner, selection.selectedId, movement)
    }
  }
}

/**
 * Act on a transport key. Space/K toggle, J/L seek, Home restarts, M mutes.
 *
 * A Space or Enter on a focused button is left to the button — the transport
 * bar's own play button would otherwise be toggled twice.
 * @param {GramFrame} instance - The focused audio-sourced instance
 * @param {KeyboardEvent} event - The keydown
 * @returns {boolean} True when the key was a transport key and was handled
 */
function handleTransportKey(instance, event) {
  const controller = instance.player
  if (!controller || !controller.isReady()) {
    return false
  }
  const target = event.target
  const onButton = target instanceof Element && target.tagName === 'BUTTON'
  const step = event.shiftKey ? SEEK_STEP_SHIFT_SECONDS : SEEK_STEP_SECONDS
  const player = instance.state.player
  const playhead = player.playhead
  switch (event.key) {
    case ' ':
    case 'Enter':
      if (onButton) return false
      controller.toggle().catch(error => {
        console.warn('GramFrame: playback could not start:', error instanceof Error ? error.message : String(error))
      })
      return true
    case 'k':
    case 'K':
      controller.toggle().catch(error => {
        console.warn('GramFrame: playback could not start:', error instanceof Error ? error.message : String(error))
      })
      return true
    case 'j':
    case 'J':
      controller.seek(playhead - step)
      return true
    case 'l':
    case 'L':
      controller.seek(playhead + step)
      return true
    case 'Home':
      controller.restart()
      return true
    case 'm':
    case 'M':
      controller.setMute(!player.muted)
      return true
    default:
      return false
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

  // The canonical module reads the live image element, so `movement` is in
  // rendered pixels at any zoom level and needs no external compensation — and
  // it owns the round trip, so no frequency-rate compensation happens here or
  // anywhere else (issue #276). A marker pushed past an edge pins to it rather
  // than leaving the image, as it did before consolidation.
  const newData = nudgeData(
    { freq: marker.freq, time: marker.time },
    movement.dx,
    movement.dy,
    instance.state,
    instance.ui.spectrogramImage
  )

  // Update marker position
  marker.freq = newData.freq
  marker.time = newData.time

  commitAnnotationChange(instance, () => refreshPanels(instance))
}

/**
 * Move a selected pin set (harmonic or sideband) by pixel increments.
 *
 * Horizontal movement adjusts what the owning mode says an arrow key changes —
 * the spacing, for both of today's pin-set modes. Vertical movement moves the
 * set's anchor time, which is the same for every pin set and so lives here.
 * @param {GramFrame} instance - GramFrame instance
 * @param {import('../modes/capabilities.js').PinSetOwner} owner - Mode owning the set
 * @param {string} setId - ID of the set to move
 * @param {MovementVector} movement - Movement vector {dx, dy}
 */
function moveSelectedPinSet(instance, owner, setId, movement) {
  const set = owner.sets.find(candidate => candidate.id === setId)
  if (!set) {
    return
  }

  /** @type {Partial<PinSet>} */
  let updates = {}

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

  // For horizontal movement (frequency adjustment)
  if (movement.dx !== 0) {
    // Measure what one keypress is worth in frequency rather than re-deriving
    // it: take a reference point and the same point moved by the increment.
    const reference = dataToSVG(
      { freq: dataFrequencyRange(viewport).freqMin, time: timeMax },
      viewport,
      image
    )
    const before = svgPointToData(reference.x, reference.y)
    const after = svgPointToData(reference.x + movement.dx, reference.y)

    updates = { ...updates, ...owner.nudgeFreqUpdates(set, after.freq - before.freq) }
  }

  // For vertical movement (time/anchor position adjustment)
  if (movement.dy !== 0) {
    const anchorSVG = dataToSVG(
      { freq: dataFrequencyRange(viewport).freqMin, time: set.anchorTime },
      viewport,
      image
    )
    const moved = svgPointToData(anchorSVG.x, anchorSVG.y + movement.dy)

    // Clamp to valid time range
    updates.anchorTime = Math.max(timeMin, Math.min(timeMax, moved.time))
  }

  if (Object.keys(updates).length > 0) {
    // The mode applies the update, marks the annotation change, refreshes its
    // table and re-renders. This function used to do all four by hand against
    // `state.harmonics` (spec 167, FR-006).
    owner.updateSet(setId, updates)
  }
}


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
 * @returns {{type: SelectedFeatureType, feature: AnalysisMarker|PinSet}|null} Selected feature or null
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

/**
 * Remove a harmonic set by ID.
 *
 * A thin alias for {@link removePinSet}: the name is the one the public
 * `instance.interaction` surface and the harmonics panel already use.
 * @param {GramFrame} instance - GramFrame instance
 * @param {string} id - Harmonic set ID to remove
 */
export function removeHarmonicSet(instance, id) {
  removePinSet(instance, 'harmonicSet', id)
}

/**
 * Remove a sideband set by ID (issue #241).
 * @param {GramFrame} instance - GramFrame instance
 * @param {string} id - Sideband set ID to remove
 */
export function removeSidebandSet(instance, id) {
  removePinSet(instance, 'sidebandSet', id)
}

/**
 * Delete one of a pin-set mode's sets, through the mode that owns it.
 *
 * The removal itself — clearing the selection, splicing the set out, marking
 * the annotation change, refreshing the table and re-rendering — belongs to the
 * mode, and used to be written a second time here against `state.harmonics`.
 * @param {GramFrame} instance - GramFrame instance
 * @param {SelectedFeatureType} selectionType - Which family the id belongs to
 * @param {string} id - Set ID to remove
 */
function removePinSet(instance, selectionType, id) {
  const owner = findPinSetOwner(instance, selectionType)
  if (owner) {
    owner.removeSet(id)
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
