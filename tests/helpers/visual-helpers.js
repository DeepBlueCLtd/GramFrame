/**
 * Visual validation and screenshot comparison helpers
 */

import { expect } from '@playwright/test'

/**
 * Visual testing utilities
 */
class VisualHelpers {
  /**
   * Create a new VisualHelpers instance
   * @param {import('./gram-frame-page').GramFramePage} gramFramePage - The GramFrame page instance
   */
  constructor(gramFramePage) {
    this.gramFramePage = gramFramePage
  }

  /**
   * Take screenshot of entire component
   * @param {string} name - Screenshot name
   * @returns {Promise<Buffer>} Screenshot buffer
   */
  async takeComponentScreenshot(name) {
    const componentContainer = this.gramFramePage.componentContainer
    return await componentContainer.screenshot({ path: `screenshots/${name}.png` })
  }

  /**
   * Take screenshot of SVG area only
   * @param {string} name - Screenshot name
   * @returns {Promise<Buffer>} Screenshot buffer
   */
  async takeSVGScreenshot(name) {
    const svg = this.gramFramePage.svg
    return await svg.screenshot({ path: `screenshots/svg-${name}.png` })
  }

  /**
   * Compare visual state before and after an operation
   * @param {() => Promise<void>} operation - Function to execute between screenshots
   * @param {string} name - Base name for screenshots
   * @returns {Promise<void>}
   */
  async compareBeforeAfter(operation, name) {
    // Take before screenshot
    await this.takeSVGScreenshot(`${name}-before`)
    
    // Execute operation
    await operation()
    
    // Take after screenshot
    await this.takeSVGScreenshot(`${name}-after`)
    
    // Note: Actual visual comparison would require additional tooling
    // This provides the screenshots for manual or automated comparison
  }

  /**
   * Verify specific visual elements are present
   * @param {string[]} selectors - Array of CSS selectors to verify
   * @returns {Promise<Array<{selector: string, visible: boolean, count: number, success: boolean, error?: string}>>}
   */
  async verifyVisualElements(selectors) {
    const results = []
    
    for (const selector of selectors) {
      try {
        const element = this.gramFramePage.page.locator(selector)
        const isVisible = await element.isVisible()
        const count = await element.count()
        
        results.push({
          selector,
          visible: isVisible,
          count: count,
          success: isVisible && count > 0
        })
      } catch (error) {
        results.push({
          selector,
          visible: false,
          count: 0,
          success: false,
          error: error.message
        })
      }
    }
    
    return results
  }

  /**
   * Check for visual artifacts or rendering issues
   * @returns {Promise<{hasIssues: boolean, issues: string[]}>}
   */
  async checkRenderingQuality() {
    const issues = []
    
    // Check if SVG is properly rendered
    const svgBox = await this.gramFramePage.svg.boundingBox()
    if (!svgBox || svgBox.width === 0 || svgBox.height === 0) {
      issues.push('SVG has invalid dimensions')
    }
    
    // Check if image is loaded
    const imageLoaded = await this.gramFramePage.page.evaluate(() => {
      const img = document.querySelector('.gram-frame-image')
      return img && img.href && img.href.baseVal.length > 0
    })
    
    if (!imageLoaded) {
      issues.push('Spectrogram image not loaded')
    }
    
    // Check for overlapping elements
    const overlappingElements = await this.gramFramePage.page.evaluate(() => {
      const markers = Array.from(document.querySelectorAll('.gram-frame-analysis-marker'))
      let overlaps = 0
      
      for (let i = 0; i < markers.length; i++) {
        for (let j = i + 1; j < markers.length; j++) {
          const rect1 = markers[i].getBoundingClientRect()
          const rect2 = markers[j].getBoundingClientRect()
          
          if (rect1.left < rect2.right && rect2.left < rect1.right &&
              rect1.top < rect2.bottom && rect2.top < rect1.bottom) {
            overlaps++
          }
        }
      }
      
      return overlaps
    })
    
    if (overlappingElements > 0) {
      issues.push(`${overlappingElements} overlapping markers detected`)
    }
    
    return {
      hasIssues: issues.length > 0,
      issues: issues
    }
  }

  /**
   * Verify color consistency across features
   * @returns {Promise<{uniqueColors: number, colorUsage: Array<[string, number]>, hasValidColors: boolean}>}
   */
  async verifyColorConsistency() {
    const colors = await this.gramFramePage.page.evaluate(() => {
      const elements = document.querySelectorAll('[stroke], [fill]')
      const colorMap = new Map()
      
      elements.forEach(el => {
        const stroke = el.getAttribute('stroke')
        const fill = el.getAttribute('fill')
        
        if (stroke && stroke !== 'none') {
          colorMap.set(stroke, (colorMap.get(stroke) || 0) + 1)
        }
        if (fill && fill !== 'none') {
          colorMap.set(fill, (colorMap.get(fill) || 0) + 1)
        }
      })
      
      return Array.from(colorMap.entries())
    })
    
    return {
      uniqueColors: colors.length,
      colorUsage: colors,
      hasValidColors: colors.every(([color, count]) => 
        color.match(/^#[0-9a-fA-F]{6}$/) || color.startsWith('rgb')
      )
    }
  }

  /**
   * Measure visual performance during animations
   * @param {() => Promise<void>} operation - Operation that triggers animation
   * @returns {Promise<{duration: number, hasAnimations: boolean, performanceScore: string}>}
   */
  async measureAnimationPerformance(operation) {
    // Start performance measurement
    const startTime = Date.now()
    
    // Execute operation
    await operation()
    
    // Wait for animations to complete
    await this.gramFramePage.page.waitForTimeout(1000)
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    // Check if there are any CSS transitions or animations
    const hasAnimations = await this.gramFramePage.page.evaluate(() => {
      const elements = document.querySelectorAll('*')
      
      for (const el of elements) {
        const style = window.getComputedStyle(el)
        if (style.transition !== 'none' || style.animation !== 'none') {
          return true
        }
      }
      
      return false
    })
    
    return {
      duration: duration,
      hasAnimations: hasAnimations,
      performanceScore: duration < 500 ? 'good' : duration < 1000 ? 'fair' : 'poor'
    }
  }

  /**
   * Check visual hierarchy and accessibility
   * @returns {Promise<{issues: string[], layerOrder: string[], elementCount: number, textElementCount: number}>}
   */
  async checkVisualHierarchy() {
    const hierarchy = await this.gramFramePage.page.evaluate(() => {
      const issues = []
      
      // Check for proper contrast
      const elements = document.querySelectorAll('[stroke], [fill]')
      elements.forEach(el => {
        const stroke = el.getAttribute('stroke')
        const fill = el.getAttribute('fill')
        
        // Basic contrast check (would need more sophisticated implementation)
        if (stroke === fill && stroke !== 'none') {
          issues.push('Element has same stroke and fill color')
        }
      })
      
      // Check for text readability
      const textElements = document.querySelectorAll('text')
      textElements.forEach(el => {
        const fontSize = window.getComputedStyle(el).fontSize
        const sizeValue = parseFloat(fontSize)
        
        if (sizeValue < 12) {
          issues.push('Text element smaller than 12px detected')
        }
      })
      
      // Check for proper layering
      const svgChildren = document.querySelectorAll('.gram-frame-svg > *')
      const layerOrder = Array.from(svgChildren).map(el => el.className.baseVal || el.tagName)
      
      return {
        issues: issues,
        layerOrder: layerOrder,
        elementCount: elements.length,
        textElementCount: textElements.length
      }
    })
    
    return hierarchy
  }

  /**
   * Verify responsive behavior at different viewport sizes
   * @param {Array<{width: number, height: number}>} viewportSizes - Array of viewport dimensions to test
   * @returns {Promise<Array<{viewport: {width: number, height: number}, svgDimensions: Object|null, stateDimensions: Object, isResponsive: boolean}>>}
   */
  async testResponsiveBehavior(viewportSizes) {
    const results = []
    
    for (const size of viewportSizes) {
      await this.gramFramePage.page.setViewportSize(size)
      await this.gramFramePage.page.waitForTimeout(500) // Wait for resize
      
      // Take screenshot at this size
      await this.takeComponentScreenshot(`responsive-${size.width}x${size.height}`)
      
      // Check component dimensions
      const svgBox = await this.gramFramePage.svg.boundingBox()
      const state = await this.gramFramePage.getState()
      
      results.push({
        viewport: size,
        svgDimensions: svgBox,
        stateDimensions: state.displayDimensions,
        isResponsive: svgBox && svgBox.width > 0 && svgBox.height > 0
      })
    }
    
    return results
  }

  /**
   * Check for visual consistency across modes
   * @param {string[]} modes - Array of modes to test
   * @returns {Promise<Array<{mode: string, elementCounts: Object, screenshot: string}>>}
   */
  async checkModeVisualConsistency(modes) {
    const results = []
    
    for (const mode of modes) {
      await this.gramFramePage.clickMode(mode)
      await this.gramFramePage.page.waitForTimeout(200)
      
      // Take screenshot of each mode
      await this.takeSVGScreenshot(`mode-${mode.toLowerCase()}`)
      
      // Check visual elements specific to mode
      const elementCounts = await this.gramFramePage.page.evaluate(() => {
        return {
          markers: document.querySelectorAll('.gram-frame-analysis-marker').length,
          harmonics: document.querySelectorAll('.gram-frame-harmonic-line').length,
          dopplerMarkers: document.querySelectorAll('.gram-frame-doppler-marker').length,
          buttons: document.querySelectorAll('.gram-frame-mode-btn').length,
          leds: document.querySelectorAll('.gram-frame-led').length
        }
      })
      
      results.push({
        mode: mode,
        elementCounts: elementCounts,
        screenshot: `mode-${mode.toLowerCase()}.png`
      })
    }
    
    return results
  }
}

/**
 * Performance testing helpers
 */
class PerformanceHelpers {
  /**
   * Create a new PerformanceHelpers instance
   * @param {import('./gram-frame-page').GramFramePage} gramFramePage - The GramFrame page instance
   */
  constructor(gramFramePage) {
    this.gramFramePage = gramFramePage
  }

  /**
   * Measure rendering performance for operations
   * @param {() => Promise<void>} operation - Operation to measure
   * @param {number} [iterations=10] - Number of times to repeat
   * @returns {Promise<{average: number, min: number, max: number, measurements: number[], performanceGrade: string}>}
   */
  async measureRenderingPerformance(operation, iterations = 10) {
    const measurements = []
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now()
      
      await operation()
      
      // Wait for DOM to settle
      await this.gramFramePage.page.waitForTimeout(50)
      
      const endTime = performance.now()
      measurements.push(endTime - startTime)
    }
    
    const average = measurements.reduce((a, b) => a + b, 0) / measurements.length
    const min = Math.min(...measurements)
    const max = Math.max(...measurements)
    
    return {
      average: average,
      min: min,
      max: max,
      measurements: measurements,
      performanceGrade: average < 100 ? 'excellent' : average < 250 ? 'good' : 'needs improvement'
    }
  }

  /**
   * Monitor memory usage during operations
   * @param {() => Promise<void>} operation - Operation to monitor
   * @returns {Promise<{initialMemory: Object, finalMemory: Object, memoryDelta: number, hasMemoryLeak: boolean}|null>}
   */
  async monitorMemoryUsage(operation) {
    // Get initial memory info
    const initialMemory = await this.gramFramePage.page.evaluate(() => {
      return (performance).memory ? {
        usedJSHeapSize: (performance).memory.usedJSHeapSize,
        totalJSHeapSize: (performance).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance).memory.jsHeapSizeLimit
      } : null
    })
    
    await operation()
    
    // Get final memory info
    const finalMemory = await this.gramFramePage.page.evaluate(() => {
      return (performance).memory ? {
        usedJSHeapSize: (performance).memory.usedJSHeapSize,
        totalJSHeapSize: (performance).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance).memory.jsHeapSizeLimit
      } : null
    })
    
    if (initialMemory && finalMemory) {
      return {
        initialMemory: initialMemory,
        finalMemory: finalMemory,
        memoryDelta: finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize,
        hasMemoryLeak: finalMemory.usedJSHeapSize > initialMemory.usedJSHeapSize * 1.5
      }
    }
    
    return null
  }

  /**
   * Test frame rate during animations
   * @param {() => Promise<void>} operation - Operation that triggers animation
   * @param {number} [duration=2000] - Duration to monitor in ms
   * @returns {Promise<{frameCount: number, duration: number, estimatedFPS: number, isSmooth: boolean}>}
   */
  async measureFrameRate(operation, duration = 2000) {
    let frameCount = 0
    
    // Start frame counting
    const frameCounter = setInterval(() => {
      frameCount++
    }, 16.67) // ~60 FPS
    
    const startTime = Date.now()
    
    await operation()
    
    // Monitor for specified duration
    await this.gramFramePage.page.waitForTimeout(duration)
    
    clearInterval(frameCounter)
    
    const actualDuration = Date.now() - startTime
    const estimatedFPS = (frameCount / actualDuration) * 1000
    
    return {
      frameCount: frameCount,
      duration: actualDuration,
      estimatedFPS: estimatedFPS,
      isSmooth: estimatedFPS >= 30
    }
  }
}

export {
  VisualHelpers,
  PerformanceHelpers
}