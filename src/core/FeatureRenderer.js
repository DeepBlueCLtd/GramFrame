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
    if (!this.instance.cursorGroup) {
      return
    }
    
    // Clear existing features
    this.instance.cursorGroup.innerHTML = ''
    
    // Render analysis mode features (persistent markers)
    if (this.hasAnalysisFeatures() && this.instance.modes.analysis) {
      this.instance.modes.analysis.renderPersistentFeatures()
    }
    
    // Render harmonic mode features (harmonic sets)
    if (this.hasHarmonicFeatures() && this.instance.modes.harmonics) {
      this.instance.modes.harmonics.renderPersistentFeatures()
    }
    
    // Render doppler mode features (f+, f-, f0 markers and curves)
    if (this.hasDopplerFeatures() && this.instance.modes.doppler) {
      this.instance.modes.doppler.renderPersistentFeatures()
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
    if (!this.instance.cursorGroup || !this.instance.currentMode) {
      return
    }
    
    // Delegate to current mode for cursor rendering
    if (typeof this.instance.currentMode.renderCursor === 'function') {
      this.instance.currentMode.renderCursor()
    }
  }
}