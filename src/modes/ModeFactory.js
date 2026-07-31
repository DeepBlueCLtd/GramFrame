import { AnalysisMode } from './analysis/AnalysisMode.js'
import { HarmonicsMode } from './harmonics/HarmonicsMode.js'
import { DopplerMode } from './doppler/DopplerMode.js'
import { PanMode } from './pan/PanMode.js'
import { looksLikeMissingApiError } from '../core/browserCompatibility.js'

/** @typedef {import('./BaseMode.js').BaseMode} BaseMode */

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
      switch (modeName) {
        case 'analysis':
          return new AnalysisMode(instance)
        
        case 'harmonics':
          return new HarmonicsMode(instance)
        
        case 'doppler':
          return new DopplerMode(instance)
        
        case 'pan':
          return new PanMode(instance)
        
        default:
          throw new Error(`Invalid mode name: ${modeName}. Valid modes are: analysis, harmonics, doppler, pan`)
      }
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
   * Get list of available mode names
   * @returns {ModeType[]} Array of mode names
   */
  static getAvailableModes() {
    return ['analysis', 'harmonics', 'doppler', 'pan']
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