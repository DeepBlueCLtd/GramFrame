/**
 * State management for GramFrame
 * 
 * This module provides state initialization, listener management,
 * and state change notification functionality.
 */

/// <reference path="../types.js" />

import { getVersion } from '../utils/version.js'

/**
 * The core initial state — everything that is not contributed by a mode.
 *
 * This module deliberately imports no mode. Mode slices arrive as an argument
 * to {@link createInitialState}, composed by `ModeFactory.getModeInitialStates()`,
 * which is what breaks the state ⇄ modes cycle (spec 167, FR-002, ADR-014).
 *
 * Typed as `GramFrameState` minus the four mode slices, because that is
 * exactly what it is: the mode keys are no longer written here, so claiming
 * them would be a lie tsc happens not to check.
 * @type {Omit<GramFrameState, 'analysis'|'harmonics'|'sidebands'|'doppler'>}
 */
const initialState = {
  version: getVersion(),
  timestamp: new Date().toISOString(),
  instanceId: '',
  mode: 'pan', // 'analysis', 'harmonics', 'sideband', 'doppler', 'pan' — start in pan so a click doesn't immediately place a marker
  previousMode: null, // Previous mode for switching back
  frequencyRate: 1, // Frequency divider; the player carries its own playbackRate
  selectedColor: '#ff6b6b', // Currently selected color for new features across all modes
  selectedSymbol: 'cross', // Currently selected symbol; 'cross' (default) means no drawn symbol shape (feature 161)
  // Whether the NEXT created harmonic set draws its vertical pin lines. Shown
  // as a toggle in the style panel; on by default at the start of a browser
  // session and remembered (sessionStorage) for the rest of it.
  showHarmonicPin: true,
  // EXPERIMENT (temporary): large-symbol size for the NEXT created feature, set
  // from the style panel's toggle when nothing is selected (with a feature
  // selected, the toggle resizes that feature instead). In-memory only, default
  // off, never persisted — it exists to gather feedback on the preferred size.
  largeSymbols: false,
  cursorPosition: null,
  cursors: [],
  // Bumped by every path that mutates an annotation, so the storage listener
  // can tell an annotation change from a cursor move without re-serialising
  // the annotations on each notification (spec 166, AS-4.3).
  annotationRevision: 0,
  // Which annotations this tab has deleted, by id, with when.
  //
  // A deletion is the one annotation change that cannot be represented by the
  // record's contents: "absent" and "deleted" look identical, so a merge that
  // only unions what each tab still holds resurrects everything either tab has
  // ever removed. These are the tombstones that make deletion survive a merge
  // (issue #269). In-memory and persisted, pruned by age on save.
  tombstones: {
    markers: {},
    harmonicSets: {},
    sidebandSets: {},
    // A single curve, so a boolean-with-a-time rather than a map.
    doppler: null
  },
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
  // The spectrograph player (spec 168). A core slice rather than a mode's: it
  // describes what the instance is built on, as `imageDetails` does, not how
  // the analyst is interacting with it. Inert on image-backed instances so
  // every listener sees one shape.
  player: {
    active: false,
    ready: false,
    progress: 0,
    source: '',
    duration: 0,
    sampleRate: 0,
    channels: 0,
    playhead: 0,
    playing: false,
    ended: false,
    loop: false,
    playbackRate: 1,
    volume: 1,
    muted: false,
    viewTop: 0,
    windowSeconds: 10,
    analysis: {
      fftSize: 1024,
      hopSize: 512,
      freqStart: 0,
      freqEnd: null,
      columns: 0,
      frames: 0
    }
  },
}

/**
 * Global registry of listeners delivered to every instance.
 *
 * The only registry `GramFrame.addStateListener` writes to. Instances no longer
 * hold copies; {@link deliverToListeners} unions the two at delivery time.
 * @type {StateListener[]}
 */
const globalStateListeners = []

/**
 * Create a deep copy of the initial state for a new instance.
 *
 * Mode slices are **additive**: a mode can contribute new keys but can never
 * overwrite a core one. That rule is what fixes the `version`/`timestamp`
 * clobbering the old `...buildModeInitialState()` spread allowed — a mode
 * returning either key used to win silently. A collision is a bug in the mode,
 * and `ModeFactory.getModeInitialStates()` reports it rather than resolving it.
 *
 * Written as an append rather than `{...modeStates, ...initialState}` so the
 * core keys keep their declared order and mode slices land after them, which
 * is the layout `tests/unit/mode-registration.test.js` pins.
 * @param {Partial<GramFrameState>} [modeStates={}] - Mode slices from
 *   `ModeFactory.getModeInitialStates()`. Defaults to none, so this module can
 *   be loaded and exercised without any mode being imported (spec 167, AS-2.2).
 * @returns {GramFrameState} Deep copy of the composed initial state
 */
export function createInitialState(modeStates = {}) {
  /** @type {Record<string, any>} */
  const composed = { ...initialState }
  for (const [key, slice] of Object.entries(modeStates)) {
    if (!(key in composed)) {
      composed[key] = slice
    }
  }
  return JSON.parse(JSON.stringify(composed))
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
 *
 * Delivery walks the union of the instance's own listeners and the global
 * registry, de-duplicated. Instances used to *copy* the global list into their
 * own at construction, which meant a global listener lived in as many arrays as
 * there were instances and removal had to scrub every one of them. The fan-in
 * happens here instead, so each registry has exactly one write path (spec 167,
 * FR-003, data-model §2).
 * @param {GramFrameState} state - Current state object
 * @param {StateListener[]} listeners - This instance's own listeners
 */
function deliverToListeners(state, listeners) {
  // An array rather than a Set: the project's tsc target predates
  // downlevelIteration, and these lists are a handful of entries at most.
  const recipients = (listeners || []).slice()
  globalStateListeners.forEach(listener => {
    if (!recipients.includes(listener)) {
      recipients.push(listener)
    }
  })
  if (recipients.length === 0) {
    return
  }

  // Create a deep copy of the state to prevent direct modification
  const stateCopy = JSON.parse(JSON.stringify(state))

  for (const listener of recipients) {
    try {
      listener(stateCopy)
    } catch (error) {
      console.error('Error in state listener:', error)
    }
  }
}

/**
 * Record that an annotation changed.
 *
 * The storage listener saves on a change to this counter (plus a few cheap
 * identity fields) rather than by re-serialising every annotation on every
 * notification. Call it from any path that adds, removes, moves or restyles a
 * marker, harmonic set, sideband set or doppler marker.
 * @param {GramFrame} instance - GramFrame instance
 */
export function markAnnotationsChanged(instance) {
  if (instance && instance.state) {
    instance.state.annotationRevision = (instance.state.annotationRevision || 0) + 1
  }
}

/**
 * This instance's tombstone set, created on first use.
 *
 * Destructured rather than reached into field by field, which keeps the two
 * recorders below to one access apiece and reads better besides. `state.js`
 * is the module that owns state, so touching it here is the point rather than
 * a reach-in.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {AnnotationTombstones|null} Its tombstones, or null if there is no state
 */
function tombstoneBag(instance) {
  const { state } = instance || /** @type {any} */ ({})
  if (!state) {
    return null
  }
  if (!state.tombstones) {
    state.tombstones = { markers: {}, harmonicSets: {}, sidebandSets: {}, doppler: null }
  }
  return state.tombstones
}

/**
 * Record that this tab deleted an annotation, so the deletion survives a merge
 * with another tab's copy of the same record (issue #269).
 *
 * Without this, "I never had it" and "I deleted it" are the same state, and a
 * union-based merge cannot tell them apart: every feature either tab removed
 * would come back on the next save.
 * @param {GramFrame} instance - GramFrame instance
 * @param {'markers'|'harmonicSets'|'sidebandSets'} collection - Which family the feature belongs to
 * @param {string} id - The deleted feature's id
 * @returns {void}
 */
export function recordDeletion(instance, collection, id) {
  const bag = tombstoneBag(instance)
  if (bag && id) {
    bag[collection][id] = new Date().toISOString()
  }
}

/**
 * Record that this tab deleted the doppler curve.
 *
 * Separate from {@link recordDeletion} because there is only ever one curve and
 * it carries no id: the tombstone is a time, not a set of them.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {void}
 */
export function recordDopplerDeletion(instance) {
  const bag = tombstoneBag(instance)
  if (bag) {
    bag.doppler = new Date().toISOString()
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
