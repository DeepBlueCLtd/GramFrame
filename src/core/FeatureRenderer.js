/**
 * Centralized feature rendering coordinator
 * Manages cross-mode feature visibility by delegating to appropriate modes
 */

import { isPersistentFeatureProvider } from '../modes/capabilities.js'

/**
 * FeatureRenderer handles rendering of all persistent features across modes
 * Each mode only needs to know how to render its own features
 */
export class FeatureRenderer {
  /**
   * Create a new FeatureRenderer
   * @param {GramFrame} gramFrameInstance - GramFrame instance
   */
  constructor(gramFrameInstance) {
    this.instance = gramFrameInstance
  }

  /**
   * Render all persistent features across all modes
   *
   * Modes are discovered by capability, not by name. This file used to name
   * `analysis`, `harmonics` and `doppler` and carry a `hasXFeatures()` predicate
   * for each — eight reads into another mode's state slice. Each predicate now
   * lives on the mode that owns the state it reads, so a fifth mode with
   * persistent features renders here with no edit to this file
   * (spec 167, FR-006, AS-4.2, SC-003).
   */
  renderAllPersistentFeatures() {
    if (!this.instance.ui.cursorGroup) {
      return
    }

    // Clear existing features
    this.instance.ui.cursorGroup.innerHTML = ''

    Object.values(this.instance.modes)
      .filter(isPersistentFeatureProvider)
      .filter(mode => mode.hasPersistentFeatures())
      .forEach(mode => mode.renderPersistentFeatures())
  }
}
