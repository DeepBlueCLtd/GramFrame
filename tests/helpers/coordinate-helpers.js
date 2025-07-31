import { GramFramePage } from './gram-frame-page.js'

/**
 * Coordinate transformation and validation helpers
 */

/**
 * Coordinate system transformation utilities
 */
class CoordinateHelpers {
  /**
   * Create a new CoordinateHelpers instance
   * @param {GramFramePage} gramFramePage - GramFramePage instance
   */
  constructor(gramFramePage) {
    /** @type {GramFramePage} */
    this.gramFramePage = gramFramePage
  }

  /**
   * Convert screen coordinates to data coordinates using current state
   * @param {number} screenX - Screen X coordinate
   * @param {number} screenY - Screen Y coordinate
   * @returns {Promise<import('../../src/types.js').DataCoordinates>} Data coordinates
   */
  async screenToDataCoordinates(screenX, screenY) {
    const state = await this.gramFramePage.getState()
    
    if (!state.config || !state.displayDimensions || !state.imageDetails) {
      throw new Error('State missing required coordinate transformation data')
    }
    
    // Account for axis margins (left: 60px, bottom: 50px)
    const axisMarginLeft = 60
    const axisMarginBottom = 50
    
    // Adjust for margins
    const adjustedX = screenX - axisMarginLeft
    const adjustedY = screenY
    
    // Get spectrogram dimensions (excluding margins)
    const spectrogramWidth = state.displayDimensions.width - axisMarginLeft
    const spectrogramHeight = state.displayDimensions.height - axisMarginBottom
    
    // Convert to normalized coordinates (0-1)
    const normalizedX = adjustedX / spectrogramWidth
    const normalizedY = (spectrogramHeight - adjustedY) / spectrogramHeight // Flip Y axis
    
    // Convert to data coordinates
    const dataTime = state.config.timeMin + (normalizedX * (state.config.timeMax - state.config.timeMin))
    const dataFreq = state.config.freqMin + (normalizedY * (state.config.freqMax - state.config.freqMin))
    
    return {
      time: dataTime,
      freq: dataFreq
    }
  }

  /**
   * Convert data coordinates to screen coordinates
   * @param {number} dataTime - Data time coordinate
   * @param {number} dataFreq - Data frequency coordinate
   * @returns {Promise<import('../../src/types.js').ScreenCoordinates>} Screen coordinates
   */
  async dataToScreenCoordinates(dataTime, dataFreq) {
    const state = await this.gramFramePage.getState()
    
    if (!state.config || !state.displayDimensions) {
      throw new Error('State missing required coordinate transformation data')
    }
    
    // Account for axis margins
    const axisMarginLeft = 60
    const axisMarginBottom = 50
    
    // Get spectrogram dimensions (excluding margins)
    const spectrogramWidth = state.displayDimensions.width - axisMarginLeft
    const spectrogramHeight = state.displayDimensions.height - axisMarginBottom
    
    // Convert to normalized coordinates (0-1)
    const normalizedX = (dataTime - state.config.timeMin) / (state.config.timeMax - state.config.timeMin)
    const normalizedY = (dataFreq - state.config.freqMin) / (state.config.freqMax - state.config.freqMin)
    
    // Convert to screen coordinates
    const screenX = axisMarginLeft + (normalizedX * spectrogramWidth)
    const screenY = spectrogramHeight - (normalizedY * spectrogramHeight) // Flip Y axis
    
    return {
      x: screenX,
      y: screenY
    }
  }

  /**
   * Validate that coordinates are within valid ranges
   * @param {number} time - Time coordinate
   * @param {number} freq - Frequency coordinate
   * @returns {Promise<{timeValid: boolean, freqValid: boolean, bothValid: boolean, timeRange: number[], freqRange: number[]}>} Validation result
   */
  async validateDataCoordinates(time, freq) {
    const state = await this.gramFramePage.getState()
    
    const timeValid = time >= state.config.timeMin && time <= state.config.timeMax
    const freqValid = freq >= state.config.freqMin && freq <= state.config.freqMax
    
    return {
      timeValid,
      freqValid,
      bothValid: timeValid && freqValid,
      timeRange: [state.config.timeMin, state.config.timeMax],
      freqRange: [state.config.freqMin, state.config.freqMax]
    }
  }

  /**
   * Get spectrogram bounds in screen coordinates
   * @returns {Promise<{left: number, top: number, right: number, bottom: number, width: number, height: number}>} Spectrogram bounds
   */
  async getSpectrogramBounds() {
    const state = await this.gramFramePage.getState()
    const svgBox = await this.gramFramePage.svg.boundingBox()
    
    if (!svgBox) {
      throw new Error('Could not get SVG bounding box')
    }
    
    const axisMarginLeft = 60
    const axisMarginBottom = 50
    
    return {
      left: axisMarginLeft,
      top: 0,
      right: svgBox.width,
      bottom: svgBox.height - axisMarginBottom,
      width: svgBox.width - axisMarginLeft,
      height: svgBox.height - axisMarginBottom
    }
  }

  /**
   * Generate test positions within spectrogram bounds
   * @param {number} count - Number of positions to generate
   * @param {number} padding - Padding from edges in pixels
   * @returns {Promise<Array<{x: number, y: number}>>} Array of test positions
   */
  async generateTestPositions(count, padding = 20) {
    const bounds = await this.getSpectrogramBounds()
    const positions = []
    
    for (let i = 0; i < count; i++) {
      const x = bounds.left + padding + Math.random() * (bounds.width - 2 * padding)
      const y = bounds.top + padding + Math.random() * (bounds.height - 2 * padding)
      
      positions.push({ x, y })
    }
    
    return positions
  }

  /**
   * Generate grid of test positions
   * @param {number} cols - Number of columns
   * @param {number} rows - Number of rows
   * @param {number} padding - Padding from edges
   * @returns {Promise<Array<{x: number, y: number}>>} Array of grid positions
   */
  async generateGridPositions(cols, rows, padding = 20) {
    const bounds = await this.getSpectrogramBounds()
    const positions = []
    
    const stepX = (bounds.width - 2 * padding) / (cols - 1)
    const stepY = (bounds.height - 2 * padding) / (rows - 1)
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = bounds.left + padding + col * stepX
        const y = bounds.top + padding + row * stepY
        
        positions.push({ x, y })
      }
    }
    
    return positions
  }

  /**
   * Find closest valid position to a given coordinate
   * @param {number} targetX - Target X coordinate
   * @param {number} targetY - Target Y coordinate
   * @returns {Promise<{x: number, y: number}>} Closest valid position
   */
  async findClosestValidPosition(targetX, targetY) {
    const bounds = await this.getSpectrogramBounds()
    
    const clampedX = Math.max(bounds.left, Math.min(bounds.right, targetX))
    const clampedY = Math.max(bounds.top, Math.min(bounds.bottom, targetY))
    
    return { x: clampedX, y: clampedY }
  }

  /**
   * Calculate distance between two screen positions
   * @param {{x: number, y: number}} pos1 - First position
   * @param {{x: number, y: number}} pos2 - Second position
   * @returns {number} Distance in pixels
   */
  calculateScreenDistance(pos1, pos2) {
    const dx = pos2.x - pos1.x
    const dy = pos2.y - pos1.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * Calculate distance between two data positions
   * @param {{time: number, freq: number}} pos1 - First data position
   * @param {{time: number, freq: number}} pos2 - Second data position
   * @returns {number} Distance in data space
   */
  calculateDataDistance(pos1, pos2) {
    const dt = pos2.time - pos1.time
    const df = pos2.freq - pos1.freq
    return Math.sqrt(dt * dt + df * df)
  }

  /**
   * Generate circular pattern of positions
   * @param {number} centerX - Center X coordinate
   * @param {number} centerY - Center Y coordinate
   * @param {number} radius - Radius in pixels
   * @param {number} points - Number of points on circle
   * @returns {Array<{x: number, y: number}>} Array of circular positions
   */
  generateCircularPositions(centerX, centerY, radius, points) {
    const positions = []
    
    for (let i = 0; i < points; i++) {
      const angle = (i * 2 * Math.PI) / points
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius
      
      positions.push({ x, y })
    }
    
    return positions
  }

  /**
   * Generate linear interpolation between two positions
   * @param {{x: number, y: number}} start - Start position
   * @param {{x: number, y: number}} end - End position
   * @param {number} steps - Number of interpolation steps
   * @returns {Array<{x: number, y: number}>} Array of interpolated positions
   */
  generateLinearInterpolation(start, end, steps) {
    const positions = []
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const x = start.x + t * (end.x - start.x)
      const y = start.y + t * (end.y - start.y)
      
      positions.push({ x, y })
    }
    
    return positions
  }
}

/**
 * SVG coordinate specific helpers
 */
class SVGCoordinateHelpers {
  /**
   * Create a new SVGCoordinateHelpers instance
   * @param {GramFramePage} gramFramePage - GramFramePage instance
   */
  constructor(gramFramePage) {
    /** @type {GramFramePage} */
    this.gramFramePage = gramFramePage
  }

  /**
   * Get SVG viewBox information
   * @returns {Promise<{x: number, y: number, width: number, height: number}|null>} SVG viewBox data
   */
  async getSVGViewBox() {
    return await this.gramFramePage.page.evaluate(() => {
      const svg = document.querySelector('.gram-frame-svg')
      if (!svg) return null
      
      const viewBox = svg.viewBox.baseVal
      return {
        x: viewBox.x,
        y: viewBox.y,
        width: viewBox.width,
        height: viewBox.height
      }
    })
  }

  /**
   * Convert SVG coordinates to screen coordinates
   * @param {number} svgX - SVG X coordinate
   * @param {number} svgY - SVG Y coordinate
   * @returns {Promise<{x: number, y: number}|null>} Screen coordinates
   */
  async svgToScreenCoordinates(svgX, svgY) {
    return await this.gramFramePage.page.evaluate(({ svgX, svgY }) => {
      const svg = document.querySelector('.gram-frame-svg')
      if (!svg) return null
      
      const point = svg.createSVGPoint()
      point.x = svgX
      point.y = svgY
      
      const screenPoint = point.matrixTransform(svg.getScreenCTM())
      return {
        x: screenPoint.x,
        y: screenPoint.y
      }
    }, { svgX, svgY })
  }

  /**
   * Convert screen coordinates to SVG coordinates
   * @param {number} screenX - Screen X coordinate
   * @param {number} screenY - Screen Y coordinate
   * @returns {Promise<{x: number, y: number}|null>} SVG coordinates
   */
  async screenToSVGCoordinates(screenX, screenY) {
    return await this.gramFramePage.page.evaluate(({ screenX, screenY }) => {
      const svg = document.querySelector('.gram-frame-svg')
      if (!svg) return null
      
      const point = svg.createSVGPoint()
      point.x = screenX
      point.y = screenY
      
      const svgPoint = point.matrixTransform(svg.getScreenCTM()?.inverse())
      return {
        x: svgPoint.x,
        y: svgPoint.y
      }
    }, { screenX, screenY })
  }

  /**
   * Get bounding box of SVG element by selector
   * @param {string} selector - CSS selector for SVG element
   * @returns {Promise<{x: number, y: number, width: number, height: number}|null>} Element bounding box
   */
  async getSVGElementBounds(selector) {
    return await this.gramFramePage.page.evaluate((selector) => {
      const element = document.querySelector(selector)
      if (!element) return null
      
      const bbox = element.getBBox()
      return {
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height
      }
    }, selector)
  }
}

export { CoordinateHelpers, SVGCoordinateHelpers }