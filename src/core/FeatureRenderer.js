/**
 * Centralized feature rendering coordinator
 * Manages cross-mode feature visibility by delegating to appropriate modes
 */

/**
 * FeatureRenderer handles rendering of all persistent features across modes
 * Each mode only needs to know how to render its own features
 */
export class FeatureRenderer {
  /**
   * Create a new FeatureRenderer
   * @param {Object} gramFrameInstance - GramFrame instance
   */
  constructor(gramFrameInstance) {
    this.instance = gramFrameInstance
  }

  /**
   * Render all persistent features across all modes
   * Delegates to each mode's specialized rendering methods
   */
  renderAllPersistentFeatures() {
    try {
      // Clear existing indicators first
      this.instance.cursorGroup.innerHTML = ''

      // Get all available modes
      const modes = this.instance.modes

      // Delegate rendering to each mode for their own features
      if (modes.analysis && this.hasAnalysisFeatures()) {
        modes.analysis.renderOwnFeatures(this.instance.cursorGroup)
      }

      if (modes.harmonics && this.hasHarmonicFeatures()) {
        modes.harmonics.renderOwnFeatures(this.instance.cursorGroup)
      }

      if (modes.doppler && this.hasDopplerFeatures()) {
        modes.doppler.renderOwnFeatures(this.instance.cursorGroup)
      }

      console.log('FeatureRenderer: rendered all persistent features via mode delegation')
    } catch (error) {
      console.error('Error in FeatureRenderer.renderAllPersistentFeatures:', error)
    }
  }

  /**
   * Check if analysis features exist
   * @returns {boolean}
   */
  hasAnalysisFeatures() {
    return this.instance.state.analysis && 
           this.instance.state.analysis.markers && 
           this.instance.state.analysis.markers.length > 0
  }

  /**
   * Check if harmonic features exist
   * @returns {boolean}
   */
  hasHarmonicFeatures() {
    return this.instance.state.harmonics && 
           this.instance.state.harmonics.harmonicSets && 
           this.instance.state.harmonics.harmonicSets.length > 0
  }

  /**
   * Check if doppler features exist
   * @returns {boolean}
   */
  hasDopplerFeatures() {
    return this.instance.state.doppler && 
           (this.instance.state.doppler.fPlus || 
            this.instance.state.doppler.fMinus || 
            this.instance.state.doppler.fZero)
  }

  /**
   * Render current mode's cursor/temporary indicators
   * Delegates to the current active mode
   */
  renderCurrentModeCursor() {
    if (this.instance.currentMode && this.instance.state.cursorPosition) {
      // Let the current mode render its cursor indicators
      if (typeof this.instance.currentMode.renderOwnCursor === 'function') {
        this.instance.currentMode.renderOwnCursor()
      }
    }
  }
}