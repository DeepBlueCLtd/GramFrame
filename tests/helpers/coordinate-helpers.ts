import { Page } from '@playwright/test'
import { GramFramePage } from './gram-frame-page'

/**
 * Coordinate transformation and validation helpers
 */

/**
 * Coordinate system transformation utilities
 */
export class CoordinateHelpers {
  constructor(private gramFramePage: GramFramePage) {}

  /**
   * Convert screen coordinates to data coordinates using current state
   * @param screenX Screen X coordinate
   * @param screenY Screen Y coordinate
   */
  async screenToDataCoordinates(screenX: number, screenY: number) {
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
   * @param dataTime Data time coordinate
   * @param dataFreq Data frequency coordinate
   */
  async dataToScreenCoordinates(dataTime: number, dataFreq: number) {
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
   * @param time Time coordinate
   * @param freq Frequency coordinate
   */
  async validateDataCoordinates(time: number, freq: number) {
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
   * @param count Number of positions to generate
   * @param padding Padding from edges in pixels
   */
  async generateTestPositions(count: number, padding = 20) {
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
   * @param cols Number of columns
   * @param rows Number of rows
   * @param padding Padding from edges
   */
  async generateGridPositions(cols: number, rows: number, padding = 20) {
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
   * @param targetX Target X coordinate
   * @param targetY Target Y coordinate
   */
  async findClosestValidPosition(targetX: number, targetY: number) {
    const bounds = await this.getSpectrogramBounds()
    
    const clampedX = Math.max(bounds.left, Math.min(bounds.right, targetX))
    const clampedY = Math.max(bounds.top, Math.min(bounds.bottom, targetY))
    
    return { x: clampedX, y: clampedY }
  }

  /**
   * Calculate distance between two screen positions
   * @param pos1 First position
   * @param pos2 Second position
   */
  calculateScreenDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }) {
    const dx = pos2.x - pos1.x
    const dy = pos2.y - pos1.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * Calculate distance between two data positions
   * @param pos1 First data position
   * @param pos2 Second data position
   */
  calculateDataDistance(
    pos1: { time: number; freq: number }, 
    pos2: { time: number; freq: number }
  ) {
    const dt = pos2.time - pos1.time
    const df = pos2.freq - pos1.freq
    return Math.sqrt(dt * dt + df * df)
  }

  /**
   * Generate circular pattern of positions
   * @param centerX Center X coordinate
   * @param centerY Center Y coordinate
   * @param radius Radius in pixels
   * @param points Number of points on circle
   */
  generateCircularPositions(centerX: number, centerY: number, radius: number, points: number) {
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
   * @param start Start position
   * @param end End position
   * @param steps Number of interpolation steps
   */
  generateLinearInterpolation(
    start: { x: number; y: number },
    end: { x: number; y: number },
    steps: number
  ) {
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
export class SVGCoordinateHelpers {
  constructor(private gramFramePage: GramFramePage) {}

  /**
   * Get SVG viewBox information
   */
  async getSVGViewBox() {
    return await this.gramFramePage.page.evaluate(() => {
      const svg = document.querySelector('.gram-frame-svg') as SVGSVGElement
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
   * @param svgX SVG X coordinate
   * @param svgY SVG Y coordinate
   */
  async svgToScreenCoordinates(svgX: number, svgY: number) {
    return await this.gramFramePage.page.evaluate(({ svgX, svgY }) => {
      const svg = document.querySelector('.gram-frame-svg') as SVGSVGElement
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
   * @param screenX Screen X coordinate
   * @param screenY Screen Y coordinate
   */
  async screenToSVGCoordinates(screenX: number, screenY: number) {
    return await this.gramFramePage.page.evaluate(({ screenX, screenY }) => {
      const svg = document.querySelector('.gram-frame-svg') as SVGSVGElement
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
   * @param selector CSS selector for SVG element
   */
  async getSVGElementBounds(selector: string) {
    return await this.gramFramePage.page.evaluate((selector) => {
      const element = document.querySelector(selector) as SVGElement
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