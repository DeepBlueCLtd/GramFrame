import { BaseMode } from './BaseMode.js'
import { AnalysisMode } from './analysis/AnalysisMode.js'
import { HarmonicsMode } from './harmonics/HarmonicsMode.js'
import { DopplerMode } from './doppler/DopplerMode.js'

/**
 * Factory for creating mode instances
 * Centralizes mode instantiation and provides error handling for invalid modes
 */
export class ModeFactory {
  /**
   * Create a mode instance based on mode name
   * @param {ModeType} modeName - Name of the mode
   * @param {Object} instance - GramFrame instance
   * @param {Object} state - GramFrame state object
   * @returns {BaseMode} Mode instance
   * @throws {Error} If mode name is invalid or mode class is not available
   */
  static createMode(modeName, instance, state) {
    try {
      switch (modeName) {
        case 'analysis':
          return new AnalysisMode(instance, state)
        
        case 'harmonics':
          return new HarmonicsMode(instance, state)
        
        case 'doppler':
          return new DopplerMode(instance, state)
        
        default:
          throw new Error(`Invalid mode name: ${modeName}. Valid modes are: analysis, harmonics, doppler`)
      }
    } catch (error) {
      console.error(`CRITICAL ERROR: Failed to create mode "${modeName}":`, error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        modeName,
        instanceType: instance?.constructor?.name,
        stateExists: !!state
      })
      
      // In test environments, throw the error to fail fast
      if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
        throw new Error(`Mode creation failed for "${modeName}": ${error.message}`)
      }
      
      // Fallback to base mode to prevent complete failure in production
      console.warn(`Falling back to BaseMode for "${modeName}" due to error`)
      return new BaseMode(instance, state)
    }
  }

  /**
   * Get list of available mode names
   * @returns {ModeType[]} Array of mode names
   */
  static getAvailableModes() {
    return ['analysis', 'harmonics', 'doppler']
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