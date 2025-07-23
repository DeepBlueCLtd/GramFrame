import { BaseMode } from './BaseMode.js'
import { AnalysisMode } from './analysis/AnalysisMode.js'
import { HarmonicsMode } from './harmonics/HarmonicsMode.js'

/**
 * Factory for creating mode instances
 * Centralizes mode instantiation and provides error handling for invalid modes
 */
export class ModeFactory {
  /**
   * Create a mode instance based on mode name
   * @param {string} modeName - Name of the mode ('analysis', 'harmonics', 'doppler')
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
          // For Phase 1, return base mode. Will be replaced in Phase 4.
          return new BaseMode(instance, state)
        
        default:
          throw new Error(`Invalid mode name: ${modeName}. Valid modes are: analysis, harmonics, doppler`)
      }
    } catch (error) {
      console.error(`Error creating mode "${modeName}":`, error)
      // Fallback to base mode to prevent complete failure
      return new BaseMode(instance, state)
    }
  }

  /**
   * Get list of available mode names
   * @returns {string[]} Array of mode names
   */
  static getAvailableModes() {
    return ['analysis', 'harmonics', 'doppler']
  }

  /**
   * Validate if a mode name is supported
   * @param {string} modeName - Mode name to validate
   * @returns {boolean} True if mode is supported
   */
  static isValidMode(modeName) {
    return this.getAvailableModes().includes(modeName)
  }
}