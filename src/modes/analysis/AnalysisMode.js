import { BaseMode } from '../BaseMode.js'
import { createSVGLine } from '../../utils/svg.js'

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
   * Update LED displays for analysis mode
   * @param {Object} coords - Current cursor coordinates
   */
  updateLEDs(coords) {
    // Show Time and Frequency LEDs only for analysis mode
    if (this.instance.timeLED) {
      this.instance.timeLED.style.display = ''
    }
    if (this.instance.freqLED) {
      this.instance.freqLED.style.display = ''
    }
    if (this.instance.speedLED) {
      this.instance.speedLED.style.display = 'none'
    }
  }
}