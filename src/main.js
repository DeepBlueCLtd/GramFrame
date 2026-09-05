/**
 * GramFrame - A JavaScript component for interactive spectrogram analysis
 */

/// <reference path="./types.js" />

/** @typedef {import('./modes/BaseMode.js').BaseMode} BaseMode */
/** @typedef {import('./core/FeatureRenderer.js').FeatureRenderer} FeatureRenderer */

import {
  createInitialState,
  dispatch,
  flushDispatch,
  markAnnotationsChanged,
  getGlobalStateListeners,
  clearGlobalStateListeners
} from './core/state.js'

import {
  updateLEDDisplays
} from './components/UIComponents.js'
import { setLEDValue } from './components/LEDDisplay.js'
import { 
  updatePersistentPanels 
} from './components/MainUI.js'

// Initialization modules
import { setupSpectrogramComponents } from './core/initialization/DOMSetup.js'
import { setupAllEventListeners, setupStateListeners } from './core/initialization/EventBindings.js'
import { initializeModeInfrastructure, setupModeUI } from './core/initialization/ModeInitialization.js'
import { 
  createUnifiedLayoutStructure, 
  setupPersistentContainers, 
  updateModeUIWithCommands,
  setupSpectrogramIfAvailable 
} from './core/initialization/UISetup.js'
import {
  setZoom,
  handleResize
} from './core/viewport.js'
import { getModeDisplayName } from './utils/calculations.js'
import { updateGuidancePanel } from './utils/secureHTML.js'

import { ModeFactory } from './modes/ModeFactory.js'

import { createGramFrameAPI } from './api/GramFrameAPI.js'

// Cursor indicators removed - using CSS cursor only

import {
  cleanupEventListeners
} from './core/events.js'

import {
  saveAnnotations,
  loadAnnotations,
  clearAnnotations,
  describeUserContext,
  loadPinPreference,
  hasPersistableAnnotations,
  buildGramFingerprint
} from './core/storage.js'

import { calculateDopplerSpeed, MS_TO_KNOTS } from './utils/doppler.js'

import {
  cleanupKeyboardControl
} from './core/keyboardControl.js'

import {
  showStorageWarning,
  clearStorageWarning
} from './components/StorageWarning.js'

import {
  isBrowserSupported,
  showCompatibilityWarning
} from './core/browserCompatibility.js'

/**
 * GramFrame class - Main component implementation
 */
export class GramFrame {
  /**
   * Every DOM element handle this component owns.
   *
   * Grouped rather than kept as 28 flat fields (spec 167, US5): they share a
   * lifetime — built during construction, torn down together — and reading
   * `instance.ui.svg` says which of the instance's concerns you are reaching
   * into, where `instance.svg` said only that you were reaching.
   * @type {GramFrameUI}
   */
  ui;

  /**
   * Selection, restyling and the transient pointer state behind them.
   * @type {GramFrameInteraction}
   */
  interaction = {
    setSelection: () => {},
    clearSelection: () => {},
    updateSelectionVisuals: () => {},
    applyColorToSelectedFeature: () => false,
    applySymbolToSelectedFeature: () => false,
    applyPinToSelectedFeature: () => false,
    applyLargeSymbolsToSelectedFeature: () => false,
    removeHarmonicSet: () => {},
    removeSidebandSet: () => {},
    // Replaced by the colour picker when it mounts; a no-op until then, so a
    // caller arriving early does nothing rather than throwing.
    syncStyleControls: () => {},
    _symbolControl: null,
    _pinControl: null,
    _largeSymbolsControl: null,
    _registeredListeners: [],
    _wheelPanHandler: null,
    _wheelPanLast: null
  };

  /**
   * How the component watches for size changes.
   * @type {GramFrameViewport}
   */
  viewport = { resizeObserver: null, _boundHandleResize: null };

  /**
   * Where this instance's annotations are saved, and under which context.
   * @type {GramFramePersistence}
   */
  persistence = { _storageInstanceIndex: 0, _isTrainerContext: false };

  // Core properties
  /** @type {GramFrameState} */
  state;
  /** @type {HTMLTableElement} */
  configTable;
  /** @type {StateListener[]} */
  stateListeners;
  /** @type {string} */
  instanceId;

  // Mode system
  /** @type {Object<string, BaseMode>} */
  modes;
  /** @type {BaseMode} */
  currentMode;
  /** @type {FeatureRenderer} */
  featureRenderer;

  /**
   * Creates a new GramFrame instance
   * @param {HTMLTableElement} configTable - Configuration table element to replace
   */
  constructor(configTable) {
    this.configTable = configTable

    // Legacy-browser guard. Run before any rendering so an unsupported browser
    // never reaches the modern DOM calls (e.g. Element.replaceChildren) that
    // would throw and fail silently. When the required APIs are missing, show a
    // clear "please update your browser" warning in place of the component and
    // stop constructing — the rest of the setup relies on those APIs.
    //
    // Throws rather than returning a half-built instance. Callers going through
    // `GramFrameAPI.init()` are short-circuited well before this point, so the
    // only way here is a direct `new GramFrame(table)`, and handing that caller
    // an object whose every field is undefined is the silent failure the
    // warning exists to prevent. It also means every field below is assigned on
    // every path that completes, which is what lets them carry non-null types
    // (spec 167, FR-009).
    if (!isBrowserSupported()) {
      showCompatibilityWarning(configTable)
      throw new Error('GramFrame: this browser is missing APIs the component requires. A compatibility warning has been shown in place of the component.')
    }

    // Core state initialization
    this.state = createInitialState(ModeFactory.getModeInitialStates())
    // Harmonic-pin visibility is a per-session preference: on at the start of
    // each browser session, then remembered across page loads within it. Read
    // before any UI is built so the toggle renders in the right position.
    this.state.showHarmonicPin = loadPinPreference()
    this.stateListeners = []
    this.instanceId = ''

    // Determine storage instance index (count existing containers)
    this.persistence._storageInstanceIndex = document.querySelectorAll('.gram-frame-container').length

    // Detect trainer vs student context. Decided once, here, and never
    // revisited — so record what decided it: the container is stamped with the
    // context and one console line names the evidence, because a trainer page
    // that comes out as student loses its "Clear gram" button and its permanent
    // storage with no other sign (issue #229).
    const detectedContext = describeUserContext()
    this.persistence._isTrainerContext = detectedContext.context === 'trainer'

    // Initialization, in dependency order. Each step declares what it needs and
    // returns what it built; the constructor is the only place the results are
    // adopted onto the instance. Swap two of these and the failure is a missing
    // argument at check time, not an `undefined` surfacing three steps later
    // (spec 167, FR-009, AS-5.2).
    const dom = setupSpectrogramComponents(this, configTable)
    dom.container.dataset.gfContext = detectedContext.context
    console.info(
      `GramFrame: instance ${this.persistence._storageInstanceIndex} is on a ${detectedContext.context} page ` +
      `(${detectedContext.reason}) — ` +
      (this.persistence._isTrainerContext
        ? 'annotations persist in localStorage and the "Clear gram" button is shown'
        : 'annotations are session-only, expire after 24 hours, and there is no "Clear gram" button')
    )
    const layout = createUnifiedLayoutStructure(this, dom.readoutPanel, dom.modeCell)
    const initialModeUI = setupPersistentContainers(this, layout.modeColumn, layout.guidanceColumn)

    this.ui = {
      container: dom.container,
      table: dom.table,
      modeRow: dom.modeRow,
      mainRow: dom.mainRow,
      readoutPanel: dom.readoutPanel,
      modeCell: dom.modeCell,
      mainCell: dom.mainCell,
      svg: dom.svg,
      spectrogramImage: dom.spectrogramImage,
      cursorGroup: dom.cursorGroup,
      axesGroup: dom.axesGroup,
      imageClipRect: dom.imageClipRect,
      cursorClipRect: dom.cursorClipRect,
      modeColumn: layout.modeColumn,
      markersContainer: layout.markersContainer,
      harmonicsContainer: layout.harmonicsContainer,
      sidebandsContainer: layout.sidebandsContainer,
      timeLED: layout.timeLED,
      freqLED: layout.freqLED,
      speedLED: layout.speedLED,
      colorPicker: layout.colorPicker,
      modesContainer: initialModeUI.modesContainer,
      modeButtons: initialModeUI.modeButtons,
      commandButtons: initialModeUI.commandButtons,
      guidancePanel: initialModeUI.guidancePanel,
      // Mounted later, or not at all: the harmonics and sidebands panels
      // arrive with their modes' UI, the expand toggle only for a landscape
      // image, and nothing assigns the mode/rate LEDs at all — every read of
      // them is guarded.
      harmonicPanel: null,
      sidebandPanel: null,
      expandToggleButton: null,
      modeLED: null,
      rateLED: null
    }

    setupSpectrogramIfAvailable(this)

    const { modes, featureRenderer } = initializeModeInfrastructure(this)
    this.modes = modes
    this.featureRenderer = featureRenderer
    this.currentMode = setupModeUI(this, modes, {
      analysis: layout.markersContainer,
      harmonics: layout.harmonicsContainer,
      sideband: layout.sidebandsContainer
    }, initialModeUI.guidancePanel)

    const modeUI = updateModeUIWithCommands(
      this, initialModeUI, modes, this.currentMode, layout.modeColumn, layout.guidanceColumn
    )
    this.ui.modesContainer = modeUI.modesContainer
    this.ui.modeButtons = modeUI.modeButtons
    this.ui.commandButtons = modeUI.commandButtons
    this.ui.guidancePanel = modeUI.guidancePanel

    const controls = setupAllEventListeners(this)
    this.interaction.removeHarmonicSet = controls.removeHarmonicSet
    this.interaction.removeSidebandSet = controls.removeSidebandSet
    this.interaction.setSelection = controls.setSelection
    this.interaction.clearSelection = controls.clearSelection
    this.interaction.updateSelectionVisuals = controls.updateSelectionVisuals
    this.interaction.applyColorToSelectedFeature = controls.applyColorToSelectedFeature
    this.interaction.applySymbolToSelectedFeature = controls.applySymbolToSelectedFeature
    this.interaction.applyPinToSelectedFeature = controls.applyPinToSelectedFeature
    this.interaction.applyLargeSymbolsToSelectedFeature = controls.applyLargeSymbolsToSelectedFeature

    setupStateListeners(this)

    // Add "Clear gram" button for trainer pages
    if (this.persistence._isTrainerContext) {
      this._addClearGramButton()
    }

    // Restore saved annotations before first render
    this._restoreAnnotations()

    // Reflect restored annotations in the persistent control panels (the
    // markers, harmonics and sidebands tables) and in the SVG overlays. Without this, reloaded
    // annotations render over the spectrogram but leave the panel tables empty.
    updatePersistentPanels(this)
    if (this.featureRenderer) {
      this.featureRenderer.renderAllPersistentFeatures()
    }

    // Register storage save listener
    this._setupStorageSaveListener()

    // Final state notification
    dispatch(this)
  }
  
  /**
   * Set zoom level and center point.
   *
   * The one surviving instance-level zoom forwarder. `_zoomIn`, `_zoomOut` and
   * `_zoomReset` were deleted with their last caller when Pan mode's command
   * buttons started calling `core/viewport.js` directly — zoom has one seam,
   * and reaching it through an underscore-prefixed instance method was a second
   * one (spec 167, FR-007, AS-4.3). This remains because the Playwright helper
   * drives zoom through it from the page.
   * @param {number} level - Zoom level (1.0 = no zoom)
   * @param {number} centerX - Center X (0-1 normalized)
   * @param {number} centerY - Center Y (0-1 normalized)
   */
  _setZoom(level, centerX, centerY) {
    setZoom(this, level, centerX, centerY)
  }

  /**
   * Handle resize events
   */
  _handleResize() {
    handleResize(this)
  }
  
  /**
   * Add a "Clear gram" button to the controls area (trainer pages only)
   */
  _addClearGramButton() {
    const btn = document.createElement('button')
    btn.className = 'gram-frame-clear-btn'
    btn.textContent = 'Clear gram'
    btn.title = 'Remove all annotations for this gram'
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      this._clearGram()
    })

    // Append to the mode column alongside the mode buttons
    if (this.ui.modeColumn) {
      this.ui.modeColumn.appendChild(btn)
    }
  }

  /**
   * Clear all annotations from state and storage
   */
  _clearGram() {
    // Cancel any drag in progress through the engine — the single owner of the
    // drag record — exactly as _switchMode does. Writing state.drag directly
    // here left the engine's private dragState saying *dragging* while the
    // projection said *idle*, and the next projection publish resurrected the
    // stale drag (M4).
    Object.values(this.modes || {}).forEach(modeInstance => {
      if (modeInstance && modeInstance.dragHandler) {
        modeInstance.dragHandler.cancelDrag()
      }
    })
    if (this.interaction._wheelPanHandler) {
      this.interaction._wheelPanHandler.cancelDrag()
    }

    // Clear the selection through the selection seam rather than replacing the
    // selection object: this also re-syncs the style controls, so they stop
    // targeting a feature that no longer exists (BH-19).
    if (this.interaction.clearSelection) {
      this.interaction.clearSelection()
    }

    // Rebuild the annotation-bearing parts of state from the initial-state
    // builders rather than resetting fields by hand, so a field added to a mode
    // later cannot survive a "Clear gram" by being forgotten here (GF-12).
    // Everything describing *this* gram — its config, image, viewport, current
    // mode and session-level style choices — is preserved. `drag` is not
    // touched: the engine owns it and the cancel loop above has already
    // republished it idle.
    const fresh = createInitialState(ModeFactory.getModeInitialStates())
    this.state.analysis = fresh.analysis
    this.state.harmonics = fresh.harmonics
    this.state.sidebands = fresh.sidebands
    this.state.doppler = fresh.doppler
    this.state.cursors = fresh.cursors

    // Remove from storage. A failure here means the annotations just cleared on
    // screen will reappear on reload, so say so rather than failing silently.
    if (clearAnnotations(this.persistence._storageInstanceIndex, this._storageContext())) {
      clearStorageWarning(this)
    } else {
      showStorageWarning(this, 'Saved annotations could not be removed from browser storage — they may reappear when this page is reloaded.')
    }

    // Re-render
    if (this.featureRenderer) {
      this.featureRenderer.renderAllPersistentFeatures()
    }
    if (this.currentMode && typeof this.currentMode.activate === 'function') {
      this.currentMode.cleanup()
      this.currentMode.activate()
    }

    // Refresh the persistent markers, harmonics and sidebands tables (always visible,
    // regardless of the active mode) so cleared annotations also disappear
    // from the tables above the spectrogram, not just the SVG overlay
    updatePersistentPanels(this)

    // Refresh LED displays to reflect the cleared state. The speed LED is set
    // directly: updateLEDDisplays covers only the mode/rate LEDs, so the
    // deleted curve's speed used to survive a "Clear gram" (BH-19).
    updateLEDDisplays(this, this.state)
    if (this.ui.speedLED) {
      setLEDValue(this.ui.speedLED, '0.0')
    }

    dispatch(this)
  }

  /**
   * The storage context this instance detected at construction, in the form
   * the storage module takes. Passed into every storage call so save and load
   * can never disagree about which storage to use (M3).
   * @returns {'trainer' | 'student'} This instance's storage context
   */
  _storageContext() {
    return this.persistence._isTrainerContext ? 'trainer' : 'student'
  }

  /**
   * Restore saved annotations from browser storage into state
   */
  _restoreAnnotations() {
    const saved = loadAnnotations(
      this.persistence._storageInstanceIndex,
      this._storageContext(),
      // Refuse records fingerprinted for a different gram (BH-6, BH-23)
      buildGramFingerprint(this.state)
    )
    if (!saved) return

    markAnnotationsChanged(this)

    // Merge analysis markers. Legacy records (persisted before feature 161)
    // have no `symbol`; default those to 'cross' (the symbol-less crosshair).
    if (saved.analysis && Array.isArray(saved.analysis.markers)) {
      this.state.analysis.markers = saved.analysis.markers.map(m => ({
        ...m,
        symbol: m.symbol || 'cross'
      }))
    }

    // Merge harmonic sets. Legacy records (persisted before feature
    // 157-harmonic-pin-symbols) have no `symbol`; default those to 'cross'
    // (the symbol-less default, feature 161).
    if (saved.harmonics && Array.isArray(saved.harmonics.harmonicSets)) {
      this.state.harmonics.harmonicSets = saved.harmonics.harmonicSets.map(hs => ({
        ...hs,
        symbol: hs.symbol || 'cross',
        // Records saved before the pin toggle have no `showPin`; those sets were
        // drawn with pins, so they restore as pinned.
        showPin: hs.showPin !== false
      }))
    }

    // Merge sideband sets (issue #241). Records written before sidebands
    // existed simply lack the key and restore as none.
    if (saved.sidebands && Array.isArray(saved.sidebands.sidebandSets)) {
      this.state.sidebands.sidebandSets = saved.sidebands.sidebandSets.map(sb => ({
        ...sb,
        symbol: sb.symbol || 'cross',
        showPin: sb.showPin !== false
      }))
    }

    // Merge doppler state
    if (saved.doppler) {
      this.state.doppler.fPlus = saved.doppler.fPlus || null
      this.state.doppler.fMinus = saved.doppler.fMinus || null
      this.state.doppler.fZero = saved.doppler.fZero || null
      if (saved.doppler.color) {
        this.state.doppler.color = saved.doppler.color
      }

      // Speed is derived, not persisted, so recompute it here: nothing else on
      // the load path does, and a restored curve otherwise read 0.0 until a
      // marker was nudged (BH-15). Guarded against f₀ = 0, which divides to
      // Infinity (BH-8).
      const { fPlus, fMinus, fZero } = this.state.doppler
      if (fPlus && fMinus && fZero) {
        const speed = calculateDopplerSpeed(fPlus, fMinus, fZero)
        this.state.doppler.speed = Number.isFinite(speed) ? speed : null
        if (this.ui.speedLED && this.state.doppler.speed !== null) {
          setLEDValue(this.ui.speedLED, (this.state.doppler.speed * MS_TO_KNOTS).toFixed(1))
        }
      }
    }
  }

  /**
   * Set up a state listener that saves annotations on relevant state changes
   */
  _setupStorageSaveListener() {
    /**
     * A cheap signature, not a re-serialisation of every annotation. The
     * listener runs on every notification — including pure cursor moves and
     * zoom changes — and stringifying the full annotation set each time is
     * the compounding cost GF-07 records. Counts plus the doppler marker
     * identity, guarded by a counter the annotation-mutating paths bump,
     * catch every change that matters (spec 166, AS-4.3).
     * @param {GramFrameState} state - State to fingerprint
     * @returns {string} Change signature
     */
    const computeSignature = (state) => {
      /** @type {Partial<DopplerState>} */
      const doppler = state.doppler || {}
      return [
        state.annotationRevision || 0,
        state.analysis && state.analysis.markers ? state.analysis.markers.length : 0,
        state.harmonics && state.harmonics.harmonicSets ? state.harmonics.harmonicSets.length : 0,
        state.sidebands && state.sidebands.sidebandSets ? state.sidebands.sidebandSets.length : 0,
        doppler.fPlus ? `${doppler.fPlus.time}:${doppler.fPlus.freq}` : '-',
        doppler.fMinus ? `${doppler.fMinus.time}:${doppler.fMinus.freq}` : '-',
        doppler.fZero ? `${doppler.fZero.time}:${doppler.fZero.freq}` : '-',
        doppler.color || '-'
      ].join('|')
    }

    // Seeded from the state as restored, not from ''. An empty seed made the
    // constructor's final dispatch always save, and every save restamps
    // `savedAt` — so merely viewing a gram daily kept a student's annotations
    // alive forever, defeating the 24-hour expiry (BH-5). An unchanged load
    // now saves nothing.
    /** @type {string} */
    let lastSignature = computeSignature(this.state)
    // The last signature the analyst was warned about, so a repeat failure of
    // the SAME unsaved state retries silently instead of re-raising a banner
    // they already dismissed. A fresh change warns anew.
    /** @type {string} */
    let lastWarnedSignature = ''

    this.stateListeners.push((/** @type {GramFrameState} */ state) => {
      // Mid-drag, the state changes at frame cadence; serialising and writing
      // it to storage on every frame is pure waste (BH-18). The drag's end
      // republishes the projection, which lands here with `active: false` and
      // saves the settled state.
      if (state.drag && state.drag.active) {
        return
      }

      const signature = computeSignature(state)
      if (signature !== lastSignature) {
        // A failed write must be visible: the analyst keeps working in memory,
        // but would otherwise never learn their annotations are not being
        // persisted (quota, private browsing, disabled storage) — GF-16. With
        // nothing annotated there is nothing to lose yet, so an unavailable
        // store stays quiet until the analyst actually creates something.
        //
        // The signature only advances on a successful write (BH-17): a failed
        // save leaves it stale, so the same state is retried on the next
        // notification instead of being silently dropped.
        if (saveAnnotations(this.state, this.persistence._storageInstanceIndex, this._storageContext())) {
          lastSignature = signature
          clearStorageWarning(this)
        } else if (hasPersistableAnnotations(state) && signature !== lastWarnedSignature) {
          lastWarnedSignature = signature
          showStorageWarning(this, 'Annotations could not be saved — they will be lost when this page is reloaded.')
        }
      }
    })
  }

  /**
   * Broadcast this instance's state to its listeners.
   *
   * A test seam, like `_setZoom`: the Playwright suite drives notifications
   * through it from the page. Everything in `src/` — including the drag
   * engine, since ADR-014 broke the state ⇄ modes cycle — calls `dispatch`
   * directly.
   */
  notifyStateListeners() {
    dispatch(this)
  }

  /**
   * Destroy the component and clean up resources
   */
  destroy() {
    // Deliver anything still queued before the instance goes away, so a
    // listener never misses the final state (spec 166, N6).
    flushDispatch(this)

    // Give every mode its cleanup: drag handlers reset, transient state
    // cleared. destroy() used to skip this entirely, so mode-held resources
    // outlived the instance on SPA-style pages (M1).
    Object.values(this.modes || {}).forEach(modeInstance => {
      if (modeInstance && typeof modeInstance.cleanup === 'function') {
        modeInstance.cleanup()
      }
    })
    if (this.currentMode && typeof this.currentMode.deactivate === 'function') {
      this.currentMode.deactivate()
    }

    cleanupEventListeners(this)
    cleanupKeyboardControl(this)

    // Remove from DOM if still attached
    if (this.ui.container && this.ui.container.parentNode) {
      this.ui.container.parentNode.removeChild(this.ui.container)
    }
  }

  /**
   * Switch between analysis modes
   * @param {ModeType} mode - Target mode
   */
  _switchMode(mode) {
    // Pan mode is always selectable, even when fully zoomed out — panning itself
    // is gated on being zoomed in, but the user must be able to enter pan mode
    // first (it is also the default mode). No zoom-level guard here.

    // Track previous mode
    this.state.previousMode = this.state.mode
    
    // Update state
    this.state.mode = mode
    
    // Cancel any drag in progress, so the engine — the single owner of the drag
    // record — clears it rather than a second place unwinding it by hand.
    Object.values(this.modes || {}).forEach(modeInstance => {
      if (modeInstance && modeInstance.dragHandler) {
        modeInstance.dragHandler.cancelDrag()
      }
    })

    // Choosing a mode signals the analyst is about to add something new, so drop
    // any selected marker/harmonic. This returns the colour/symbol controls to
    // targeting the NEXT created feature instead of restyling the previously
    // selected one (feature 161). Re-clicking the already-active mode counts too:
    // it is the natural gesture for "deselect and start fresh".
    if (this.state.selection && this.state.selection.selectedType && this.interaction.clearSelection) {
      this.interaction.clearSelection()
    }

    // Cursor styling removed - no display element
    
    // Update UI
    if (this.ui.modeButtons) {
      Object.keys(this.ui.modeButtons).forEach(m => {
        const button = this.ui.modeButtons[m]
        if (button) {
          if (m === mode) {
            button.classList.add('active')
          } else {
            button.classList.remove('active')
          }
        }
      })
    }
    
    // Update container class for mode-specific styling. Every registered mode's
    // class is removed rather than a hand-kept list of three: the old list had
    // silently gone stale (pan and doppler were added and never removed, so
    // their classes accumulated), and the sidebands panel's visibility now
    // depends on the class being accurate.
    if (this.ui.container) {
      ModeFactory.getAvailableModes().forEach(modeName => {
        this.ui.container.classList.remove(`gram-frame-${modeName}-mode`)
      })
      this.ui.container.classList.add(`gram-frame-${mode}-mode`)
    }
    
    // Switch to new mode instance and activate it (all modes now use polymorphic pattern)
    if (this.currentMode) {

      this.currentMode.cleanup()
      this.currentMode.deactivate()

    }
    this.currentMode = this.modes[mode]
    
    // The unified layout containers should always display their content
    // No need to clear/recreate UI since all tables should be persistent
    
    this.currentMode.activate()
    
    // Update guidance panel using mode's guidance text
    if (this.ui.guidancePanel) {
      const guidanceContent = this.currentMode.getGuidanceText()
      updateGuidancePanel(this.ui.guidancePanel, guidanceContent)
    }
    
    // Update LED display visibility
    this.currentMode.updateLEDs(this.state.cursorPosition)
    
    // Update LED display values
    updateLEDDisplays(this, this.state)
    
    // Update global status LEDs
    if (this.ui.modeLED) {
      setLEDValue(this.ui.modeLED, getModeDisplayName(mode))
    }
    
    // Update persistent panels regardless of active mode
    updatePersistentPanels(this)
    
    // Update cursor indicators
    if (this.featureRenderer) {
      this.featureRenderer.renderAllPersistentFeatures()
    }
    
    // Cursor indicators removed - using CSS cursor only
    
    // CSS now handles cursor behavior properly, no need for explicit reset
    
    // Notify listeners
    dispatch(this)
  }
}

// Create and setup the GramFrame API
const GramFrameAPI = createGramFrameAPI(GramFrame)

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // @ts-ignore - Adding to global window object
  window.GramFrame = GramFrameAPI
  GramFrameAPI.init()
  // Connect to state display if we're on the debug page
  const stateDisplay = document.getElementById('state-display')
  if (stateDisplay) {
    GramFrameAPI.addStateListener(/** @param {any} state */ (state) => {
      stateDisplay.textContent = JSON.stringify(state, null, 2)
    })
  }
})

// Export the API
// @ts-ignore - Adding to global window object
window.GramFrame = GramFrameAPI

// Hot Module Replacement (HMR) support for Task 1.4
// @ts-ignore - Vite HMR API
if (import.meta.hot) {
  // @ts-ignore - Vite HMR API
  import.meta.hot.accept(() => {
    
    // Store old state listeners before replacing the API
    const oldListeners = getGlobalStateListeners()
    
    // Clear existing listeners
    clearGlobalStateListeners()
    
    // Re-initialize the component
    GramFrameAPI.init()
    
    // Restore state listeners
    oldListeners.forEach(listener => {
      GramFrameAPI.addStateListener(listener)
    })
    
  })
}
