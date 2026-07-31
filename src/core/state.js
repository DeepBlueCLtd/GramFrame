/**
 * State management for GramFrame
 * 
 * This module provides state initialization, listener management,
 * and state change notification functionality.
 */

/// <reference path="../types.js" />

import { AnalysisMode } from '../modes/analysis/AnalysisMode.js'
import { HarmonicsMode } from '../modes/harmonics/HarmonicsMode.js'
import { DopplerMode } from '../modes/doppler/DopplerMode.js'
import { PanMode } from '../modes/pan/PanMode.js'
import { getVersion } from '../utils/version.js'

/**
 * Build mode-specific initial state by collecting from all mode classes
 * @returns {GramFrameState} Combined initial state from all modes
 */
function buildModeInitialState() {
  // Get initial state from static methods (no need for temporary instances)
  const modeStates = [
    AnalysisMode.getInitialState(),
    HarmonicsMode.getInitialState(),
    DopplerMode.getInitialState(),
    PanMode.getInitialState()
  ]
  
  // Merge all mode states
  return Object.assign({}, ...modeStates)
}

/**
 * Initial state object for GramFrame component
 * @type {GramFrameState}
 */
const initialState = {
  version: getVersion(),
  timestamp: new Date().toISOString(),
  instanceId: '',
  mode: 'pan', // 'analysis', 'harmonics', 'doppler', 'pan' — start in pan so a click doesn't immediately place a marker
  previousMode: null, // Previous mode for switching back
  rate: 1,
  selectedColor: '#ff6b6b', // Currently selected color for new features across all modes
  selectedSymbol: 'cross', // Currently selected symbol; 'cross' (default) means no drawn symbol shape (feature 161)
  // Whether the NEXT created harmonic set draws its vertical pin lines. Shown
  // as a toggle in the Symbol panel; on by default at the start of a browser
  // session and remembered (sessionStorage) for the rest of it.
  showHarmonicPin: true,
  // EXPERIMENT (temporary): large-symbol size for the NEXT created feature, set
  // from the Symbol panel's toggle when nothing is selected (with a feature
  // selected, the toggle resizes that feature instead). In-memory only, default
  // off, never persisted — it exists to gather feedback on the preferred size.
  largeSymbols: false,
  cursorPosition: null,
  cursors: [],
  // Bumped by every path that mutates an annotation, so the storage listener
  // can tell an annotation change from a cursor move without re-serialising
  // the annotations on each notification (spec 166, AS-4.3).
  annotationRevision: 0,
  imageDetails: {
    url: '',
    naturalWidth: 0,  // Original dimensions of the image
    naturalHeight: 0,
    renderWidth: 0,   // Base render width (defaults to naturalWidth on load)
    renderHeight: 0   // Base render height (defaults to naturalHeight on load)
  },
  // Whether the image is currently expanded to fill available space.
  // In-memory only, default false, never persisted (independent of feature 155).
  imageExpanded: false,
  config: {
    timeMin: 0,
    timeMax: 0,
    freqMin: 0,
    freqMax: 0
  },
  displayDimensions: {  // Current display dimensions (responsive)
    width: 0,
    height: 0
  },
  margins: {
    left: 60,    // Space for time axis labels
    bottom: 50,  // Space for frequency axis labels  
    right: 15,   // Small right margin
    top: 15      // Small top margin
  },
  // Simple zoom state for transform-based zoom
  zoom: {
    level: 1.0,  // Current zoom level (1.0 = no zoom, 2.0 = 2x zoom)
    centerX: 0.5, // Center point X (0-1 normalized)
    centerY: 0.5  // Center point Y (0-1 normalized)
  },
  // Read-only projection of the active drag, rebuilt by the drag engine on each
  // transition. Modes never write it; it is always present, reading
  // `active: false` when idle (spec 166, FR-004 / data-model.md §2).
  drag: {
    active: false,
    kind: null,
    mode: null,
    targetId: null,
    targetType: null,
    startPosition: null
  },
  // Selection state for keyboard fine control
  selection: {
    selectedType: null,  // 'marker' | 'harmonicSet' | null
    selectedId: null,    // ID of selected item
    selectedIndex: null  // Index in table for display purposes
  },
  // Add mode-specific state from mode classes
  ...buildModeInitialState()
}

/**
 * Global registry of listeners that should be applied to all instances
 * @type {StateListener[]}
 */
const globalStateListeners = []

/**
 * Create a deep copy of the initial state for new instances
 * @returns {GramFrameState} Deep copy of initial state
 */
export function createInitialState() {
  return JSON.parse(JSON.stringify(initialState))
}

/**
 * Deliver the state to its listeners, once.
 *
 * The single place the constitution's deep-copy contract is honoured: one copy
 * per delivery, and none at all when nobody is listening — the copy exists to
 * protect listeners from mutating live state, so with no listeners there is
 * nothing to protect (spec 166, N2).
 *
 * Not exported to modes. Everything in `src/` reaches this through
 * {@link dispatch}, which coalesces; see the ESLint `no-restricted-imports`
 * rule that enforces it (N1, FR-005).
 * @param {GramFrameState} state - Current state object
 * @param {StateListener[]} listeners - Array of listener functions
 */
function deliverToListeners(state, listeners) {
  if (!listeners || listeners.length === 0) {
    return
  }

  // Create a deep copy of the state to prevent direct modification
  const stateCopy = JSON.parse(JSON.stringify(state))

  // Notify all registered state listeners for this instance
  listeners.forEach(listener => {
    try {
      listener(stateCopy)
    } catch (error) {
      console.error('Error in state listener:', error)
    }
  })
}

/**
 * Record that an annotation changed.
 *
 * The storage listener saves on a change to this counter (plus a few cheap
 * identity fields) rather than by re-serialising every annotation on every
 * notification. Call it from any path that adds, removes, moves or restyles a
 * marker, harmonic set or doppler marker.
 * @param {GramFrame} instance - GramFrame instance
 */
export function markAnnotationsChanged(instance) {
  if (instance && instance.state) {
    instance.state.annotationRevision = (instance.state.annotationRevision || 0) + 1
  }
}

/**
 * Pending dispatch bookkeeping, per instance.
 * @type {WeakMap<object, {tier: 'microtask'|'frame', frameHandle: number|null}>}
 */
const pendingDispatches = new WeakMap()

/**
 * Request a notification. Safe to call from anywhere in `src/`.
 *
 * Repeated calls within one task coalesce into a single delivery carrying the
 * settled state (N3). Two tiers:
 *
 * - **default** — delivered on the next microtask. Mode switches, marker
 *   add/delete, colour and symbol changes, config parse, storage load. This is
 *   what turns a mode switch's two notifications into one.
 * - **frame** (`{frame: true}`) — delivered on the next animation frame. The
 *   high-frequency paths: mousemove readouts, wheel zoom and pan, drag moves.
 *   Under continuous input these are bounded by frame cadence rather than by
 *   event count (N4, FR-006).
 *
 * A pending frame-tier dispatch is *upgraded* to the default tier by any
 * subsequent default-tier dispatch, never downgraded — so a mode switch during
 * a drag is never held back to the next frame.
 *
 * @param {GramFrame} instance - GramFrame instance
 * @param {DispatchOptions} [options] - Coalescing options
 */
export function dispatch(instance, options = {}) {
  if (!instance) {
    return
  }

  const wantsFrame = options.frame === true
  const pending = pendingDispatches.get(instance)

  if (pending) {
    // Already scheduled. A default-tier request promotes a frame-tier one;
    // a frame-tier request never delays an already-scheduled default.
    if (!wantsFrame && pending.tier === 'frame') {
      if (pending.frameHandle !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(pending.frameHandle)
      }
      pending.tier = 'microtask'
      pending.frameHandle = null
      queueMicrotask(() => flushDispatch(instance))
    }
    return
  }

  /** @type {{tier: 'microtask'|'frame', frameHandle: number|null}} */
  const record = { tier: wantsFrame ? 'frame' : 'microtask', frameHandle: null }
  pendingDispatches.set(instance, record)

  if (wantsFrame && typeof requestAnimationFrame === 'function') {
    record.frameHandle = requestAnimationFrame(() => flushDispatch(instance))
  } else {
    record.tier = 'microtask'
    queueMicrotask(() => flushDispatch(instance))
  }
}

/**
 * Deliver any pending notification synchronously.
 *
 * Used by the scheduled callbacks above, and on teardown so no notification is
 * lost when an instance is destroyed (N6).
 * @param {GramFrame} instance - GramFrame instance
 */
export function flushDispatch(instance) {
  if (!instance) {
    return
  }

  const pending = pendingDispatches.get(instance)
  if (!pending) {
    return
  }

  if (pending.frameHandle !== null && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(pending.frameHandle)
  }
  pendingDispatches.delete(instance)

  deliverToListeners(instance.state, instance.stateListeners)
}

/**
 * Add a state listener to the global registry
 * @param {StateListener} callback - Listener function to add
 * @returns {boolean} True if added, false if already exists
 */
export function addGlobalStateListener(callback) {
  if (!globalStateListeners.includes(callback)) {
    globalStateListeners.push(callback)
    return true
  }
  return false
}

/**
 * Remove a state listener from the global registry
 * @param {StateListener} callback - Listener function to remove
 * @returns {boolean} True if removed, false if not found
 */
export function removeGlobalStateListener(callback) {
  const index = globalStateListeners.indexOf(callback)
  if (index !== -1) {
    globalStateListeners.splice(index, 1)
    return true
  }
  return false
}

/**
 * Get all global state listeners (for applying to new instances)
 * @returns {StateListener[]} Array of global listener functions
 */
export function getGlobalStateListeners() {
  return [...globalStateListeners]
}

/**
 * Clear all global state listeners (used in testing)
 */
export function clearGlobalStateListeners() {
  globalStateListeners.length = 0
}
