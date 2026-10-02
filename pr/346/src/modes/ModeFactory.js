import { AnalysisMode } from './analysis/AnalysisMode.js'
import { HarmonicsMode } from './harmonics/HarmonicsMode.js'
import { SidebandMode } from './sideband/SidebandMode.js'
import { DopplerMode } from './doppler/DopplerMode.js'
import { PanMode } from './pan/PanMode.js'
import { looksLikeMissingApiError } from '../core/browserCompatibility.js'
import { createInitialState } from '../core/state.js'
import { MODE_NAMES } from './modeRoster.js'

/** @typedef {import('./BaseMode.js').BaseMode} BaseMode */

/**
 * Which class implements each mode named in the roster.
 *
 * The roster (`modeRoster.js`) says what exists and what it is called; this
 * says what builds it. Keeping the classes here rather than in the roster is
 * what keeps the roster a leaf module the UI can import without dragging every
 * mode -- and an import cycle -- along with it.
 * @type {Object<string, new (instance: GramFrame) => BaseMode>}
 */
const MODE_CLASSES = {
  pan: PanMode,
  analysis: AnalysisMode,
  harmonics: HarmonicsMode,
  sideband: SidebandMode,
  doppler: DopplerMode
}

/**
 * Factory for creating mode instances
 * Centralizes mode instantiation and provides error handling for invalid modes
 */
export class ModeFactory {
  /**
   * Create a mode instance based on mode name
   * @param {ModeType} modeName - Name of the mode
   * @param {GramFrame} instance - GramFrame instance
   * @returns {BaseMode} Mode instance
   * @throws {Error} If mode name is invalid or the mode fails to construct.
   *   The failure is always propagated (spec 165, GF-04): a mode that cannot be
   *   built leaves the component unable to interact, so the caller surfaces the
   *   standard `.gramframe-error-indicator` instead of shipping a silent no-op.
   */
  static createMode(modeName, instance) {
    try {
      const ModeClass = Object.prototype.hasOwnProperty.call(MODE_CLASSES, modeName)
        ? MODE_CLASSES[modeName]
        : null
      if (!ModeClass) {
        throw new Error(`Invalid mode name: ${modeName}. Valid modes are: ${MODE_NAMES.join(', ')}`)
      }
      return new ModeClass(instance)
    } catch (error) {
      console.error(`CRITICAL ERROR: Failed to create mode "${modeName}":`, error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        modeName,
        instanceType: instance?.constructor?.name,
        stateExists: !!instance?.state
      })

      // Fail loud on every hostname. The previous localhost-only throw meant a
      // broken mode silently killed interaction in the field behind a no-op
      // BaseMode; now the failure reaches GramFrameAPI, which renders the error
      // indicator next to the config table.
      //
      // A missing-API TypeError is re-thrown unwrapped so the API's legacy-
      // browser safety net still recognises it and shows the "please update
      // your browser" message rather than a technical error.
      if (looksLikeMissingApiError(error)) {
        throw error
      }
      const message = `Mode creation failed for "${modeName}": ${error instanceof Error ? error.message : String(error)}`
      const wrapped = /** @type {any} */ (new Error(message))
      // Attached rather than passed to the constructor: the project's tsc lib
      // level predates the Error `cause` option.
      wrapped.cause = error
      throw wrapped
    }
  }

  /**
   * Compose the initial-state slices contributed by every registered mode.
   *
   * The single place that knows the mode roster for state purposes, mirroring
   * `createMode`'s role for instantiation. `core/state.js` receives the result
   * rather than importing the mode classes itself, which is what breaks the
   * state ⇄ modes cycle (spec 167, FR-002, ADR-014).
   *
   * Merge order is the roster's, so it cannot drift from the roster the rest
   * of the component uses. The order is immaterial in practice -- each mode
   * contributes a slice named after itself -- but a collision between two
   * modes would resolve by it, and `assertNoCoreKeyCollision` covers the core
   * keys either way.
   * @returns {Partial<GramFrameState>} Merged mode slices
   */
  static getModeInitialStates() {
    const slices = Object.assign({}, ...MODE_NAMES.map(name => {
      const ModeClass = /** @type {any} */ (MODE_CLASSES[name])
      return typeof ModeClass.getInitialState === 'function' ? ModeClass.getInitialState() : {}
    }))
    assertNoCoreKeyCollision(slices)
    return slices
  }

  /**
   * Get list of available mode names
   * @returns {ModeType[]} Array of mode names
   */
  static getAvailableModes() {
    // A copy: callers iterate it, and one that mutated the roster would change
    // which modes exist for every other caller.
    return [...MODE_NAMES]
  }

  /**
   * Validate if a mode name is supported
   * @param {ModeType} modeName - Mode name to validate
   * @returns {boolean} True if mode is supported
   */
  static isValidMode(modeName) {
    return this.getAvailableModes().includes(modeName)
  }
}

/**
 * Report any mode slice key that collides with a core state key.
 *
 * `createInitialState` treats core keys as authoritative, so a collision does
 * not corrupt the state — it silently drops the mode's value instead, which is
 * the harder failure to find. Name it here, where the mode roster is known.
 *
 * Left on in production rather than gated behind a build flag: it runs once per
 * instance construction and costs one copy of a small object, which is not
 * worth a second code path to avoid.
 * @param {Partial<GramFrameState>} slices - The merged mode slices
 */
function assertNoCoreKeyCollision(slices) {
  const coreKeys = Object.keys(createInitialState())
  const collisions = Object.keys(slices).filter(key => coreKeys.includes(key))
  if (collisions.length > 0) {
    console.error(
      `GramFrame: mode initial state collides with core state key(s): ${collisions.join(', ')}. ` +
      'The core value wins and the mode\'s is discarded. Rename the key in the mode that contributes it.'
    )
  }
}
