import { BaseMode } from '../BaseMode.js'
import { createSVGLine } from '../../utils/svg.js'
import { createLEDDisplay } from '../../components/UIComponents.js'

/**
 * Analysis mode implementation
 * Provides crosshair rendering and basic time/frequency display
 */
export class AnalysisMode extends BaseMode {
  /**
   * Get guidance text for analysis mode
   * @returns {string} HTML content for the guidance panel
   */
  getGuidanceText() {
    return `
      <h4>Analysis Mode</h4>
      <p>• Hover to view exact frequency/time values</p>
    `
  }

  /**
   * Render analysis mode cursor indicators
   * @param {SVGElement} svg - The SVG container element
   */
  render(svg) {
    if (!this.state.cursorPosition) return
    
    const margins = this.state.axes.margins
    const { naturalWidth, naturalHeight } = this.state.imageDetails
    
    // Calculate cursor position in SVG coordinates (accounting for margins)
    const cursorSVGX = margins.left + this.state.cursorPosition.imageX
    const cursorSVGY = margins.top + this.state.cursorPosition.imageY
    
    // Create vertical crosshair lines (time indicator) - shadow first, then main line
    const verticalShadow = createSVGLine(
      cursorSVGX,
      margins.top,
      cursorSVGX,
      margins.top + naturalHeight,
      'gram-frame-cursor-shadow'
    )
    this.instance.cursorGroup.appendChild(verticalShadow)
    
    const verticalLine = createSVGLine(
      cursorSVGX,
      margins.top,
      cursorSVGX,
      margins.top + naturalHeight,
      'gram-frame-cursor-vertical'
    )
    this.instance.cursorGroup.appendChild(verticalLine)
    
    // Create horizontal crosshair lines (frequency indicator) - shadow first, then main line
    const horizontalShadow = createSVGLine(
      margins.left,
      cursorSVGY,
      margins.left + naturalWidth,
      cursorSVGY,
      'gram-frame-cursor-shadow'
    )
    this.instance.cursorGroup.appendChild(horizontalShadow)
    
    const horizontalLine = createSVGLine(
      margins.left,
      cursorSVGY,
      margins.left + naturalWidth,
      cursorSVGY,
      'gram-frame-cursor-horizontal'
    )
    this.instance.cursorGroup.appendChild(horizontalLine)
    
    // Create center point indicator
    const centerPoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    centerPoint.setAttribute('cx', String(cursorSVGX))
    centerPoint.setAttribute('cy', String(cursorSVGY))
    centerPoint.setAttribute('r', '3')
    centerPoint.setAttribute('class', 'gram-frame-cursor-point')
    this.instance.cursorGroup.appendChild(centerPoint)
  }

  /**
   * Create UI elements for analysis mode
   * @param {HTMLElement} readoutPanel - Container for UI elements
   */
  createUI(readoutPanel) {
    this.uiElements = {}
    
    // Create Time LED display
    this.uiElements.timeLED = createLEDDisplay('Time (s)', '0.00')
    readoutPanel.appendChild(this.uiElements.timeLED)
    
    // Create Frequency LED display
    this.uiElements.freqLED = createLEDDisplay('Frequency (Hz)', '0.00')
    readoutPanel.appendChild(this.uiElements.freqLED)
    
    // Store references on instance for compatibility
    this.instance.timeLED = this.uiElements.timeLED
    this.instance.freqLED = this.uiElements.freqLED
  }

  /**
   * Update LED displays for analysis mode
   * @param {Object} coords - Current cursor coordinates
   */
  updateLEDs(coords) {
    // Analysis mode shows Time and Frequency LEDs (created in createUI)
    this.updateModeSpecificLEDs()
  }

  /**
   * Get initial state for analysis mode
   * @returns {Object} Analysis mode has no specific state
   */
  static getInitialState() {
    return {}
  }

  /**
   * Update mode-specific LED values based on cursor position
   */
  updateModeSpecificLEDs() {
    if (!this.state.cursorPosition) {
      // Show default values when no cursor position
      if (this.uiElements.freqLED) {
        this.uiElements.freqLED.querySelector('.gram-frame-led-value').textContent = '0.00'
      }
      if (this.uiElements.timeLED) {
        this.uiElements.timeLED.querySelector('.gram-frame-led-value').textContent = '0.00'
      }
      return
    }

    // Update frequency LED
    if (this.uiElements.freqLED) {
      const freqValue = this.state.cursorPosition.freq.toFixed(1)
      this.uiElements.freqLED.querySelector('.gram-frame-led-value').textContent = freqValue
    }

    // Update time LED
    if (this.uiElements.timeLED) {
      const timeValue = this.state.cursorPosition.time.toFixed(2)
      this.uiElements.timeLED.querySelector('.gram-frame-led-value').textContent = timeValue
    }
  }
}