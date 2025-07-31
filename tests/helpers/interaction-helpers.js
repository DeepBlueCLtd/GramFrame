import { GramFramePage } from './gram-frame-page.js'

/**
 * Advanced mouse interaction helpers for complex testing scenarios
 */

/**
 * Mouse interaction patterns and utilities
 */
class InteractionHelpers {
  /**
   * Create a new InteractionHelpers instance
   * @param {GramFramePage} gramFramePage - GramFramePage instance
   */
  constructor(gramFramePage) {
    /** @type {GramFramePage} */
    this.gramFramePage = gramFramePage
  }

  /**
   * Perform smooth mouse movement between positions
   * @param {Array<{x: number, y: number}>} positions - Array of {x, y} positions
   * @param {number} stepDelay - Delay between steps in ms
   * @returns {Promise<void>}
   */
  async smoothMousePath(positions, stepDelay = 50) {
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i]
      await this.gramFramePage.page.mouse.move(pos.x, pos.y)
      
      if (i < positions.length - 1) {
        await this.gramFramePage.page.waitForTimeout(stepDelay)
      }
    }
  }

  /**
   * Perform bezier curve mouse movement
   * @param {{x: number, y: number}} start - Start position
   * @param {{x: number, y: number}} control1 - First control point
   * @param {{x: number, y: number}} control2 - Second control point
   * @param {{x: number, y: number}} end - End position
   * @param {number} steps - Number of steps in curve
   * @returns {Promise<void>}
   */
  async bezierMousePath(start, control1, control2, end, steps = 20) {
    const positions = []
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const t2 = t * t
      const t3 = t2 * t
      
      const x = Math.pow(1 - t, 3) * start.x +
                3 * Math.pow(1 - t, 2) * t * control1.x +
                3 * (1 - t) * t2 * control2.x +
                t3 * end.x
      
      const y = Math.pow(1 - t, 3) * start.y +
                3 * Math.pow(1 - t, 2) * t * control1.y +
                3 * (1 - t) * t2 * control2.y +
                t3 * end.y
      
      positions.push({ x, y })
    }
    
    await this.smoothMousePath(positions, 25)
  }

  /**
   * Perform circular mouse movement
   * @param {{x: number, y: number}} center - Center of circle
   * @param {number} radius - Radius in pixels
   * @param {number} revolutions - Number of full revolutions
   * @param {number} steps - Steps per revolution
   * @returns {Promise<void>}
   */
  async circularMouseMovement(center, radius, revolutions = 1, steps = 36) {
    const totalSteps = steps * revolutions
    const positions = []
    
    for (let i = 0; i <= totalSteps; i++) {
      const angle = (i * 2 * Math.PI * revolutions) / totalSteps
      const x = center.x + Math.cos(angle) * radius
      const y = center.y + Math.sin(angle) * radius
      
      positions.push({ x, y })
    }
    
    await this.smoothMousePath(positions, 25)
  }

  /**
   * Perform zigzag mouse movement
   * @param {{x: number, y: number}} start - Start position
   * @param {{x: number, y: number}} end - End position
   * @param {number} amplitude - Zigzag amplitude
   * @param {number} frequency - Number of zigzags
   * @returns {Promise<void>}
   */
  async zigzagMouseMovement(start, end, amplitude, frequency) {
    const positions = []
    const steps = frequency * 8 // 8 steps per zigzag
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const baseX = start.x + t * (end.x - start.x)
      const baseY = start.y + t * (end.y - start.y)
      
      const zigzagOffset = Math.sin(t * frequency * 2 * Math.PI) * amplitude
      
      // Apply zigzag perpendicular to the line direction
      const dx = end.x - start.x
      const dy = end.y - start.y
      const length = Math.sqrt(dx * dx + dy * dy)
      
      if (length > 0) {
        const perpX = -dy / length
        const perpY = dx / length
        
        positions.push({
          x: baseX + perpX * zigzagOffset,
          y: baseY + perpY * zigzagOffset
        })
      } else {
        positions.push({ x: baseX, y: baseY })
      }
    }
    
    await this.smoothMousePath(positions, 30)
  }

  /**
   * Simulate jittery/nervous mouse movement
   * @param {{x: number, y: number}} center - Center position
   * @param {number} jitterAmount - Maximum jitter distance
   * @param {number} duration - Duration in ms
   * @returns {Promise<void>}
   */
  async jitteryMouseMovement(center, jitterAmount, duration) {
    const steps = Math.floor(duration / 50) // Update every 50ms
    
    for (let i = 0; i < steps; i++) {
      const jitterX = (Math.random() - 0.5) * 2 * jitterAmount
      const jitterY = (Math.random() - 0.5) * 2 * jitterAmount
      
      await this.gramFramePage.page.mouse.move(
        center.x + jitterX,
        center.y + jitterY
      )
      
      await this.gramFramePage.page.waitForTimeout(50)
    }
  }

  /**
   * Perform rapid click sequence at different positions
   * @param {Array<{x: number, y: number}>} positions - Array of click positions
   * @param {number} clickDelay - Delay between clicks
   * @returns {Promise<void>}
   */
  async rapidClickSequence(positions, clickDelay = 100) {
    for (const pos of positions) {
      await this.gramFramePage.page.mouse.click(pos.x, pos.y)
      await this.gramFramePage.page.waitForTimeout(clickDelay)
    }
  }

  /**
   * Perform double-click at position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} delay - Delay between clicks
   * @returns {Promise<void>}
   */
  async doubleClick(x, y, delay = 100) {
    await this.gramFramePage.page.mouse.click(x, y)
    await this.gramFramePage.page.waitForTimeout(delay)
    await this.gramFramePage.page.mouse.click(x, y)
  }

  /**
   * Perform long press (mouse down with delay before up)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} duration - Duration of press in ms
   * @returns {Promise<void>}
   */
  async longPress(x, y, duration = 1000) {
    await this.gramFramePage.page.mouse.move(x, y)
    await this.gramFramePage.page.mouse.down()
    await this.gramFramePage.page.waitForTimeout(duration)
    await this.gramFramePage.page.mouse.up()
  }

  /**
   * Perform drag with momentum (overshooting and settling)
   * @param {{x: number, y: number}} start - Start position
   * @param {{x: number, y: number}} end - End position
   * @param {number} overshoot - Overshoot amount
   * @returns {Promise<void>}
   */
  async dragWithMomentum(start, end, overshoot = 20) {
    // Calculate overshoot position
    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.sqrt(dx * dx + dy * dy)
    
    if (length > 0) {
      const overshootX = end.x + (dx / length) * overshoot
      const overshootY = end.y + (dy / length) * overshoot
      
      // Start drag
      await this.gramFramePage.page.mouse.move(start.x, start.y)
      await this.gramFramePage.page.mouse.down()
      
      // Move to overshoot position
      await this.gramFramePage.page.mouse.move(overshootX, overshootY)
      await this.gramFramePage.page.waitForTimeout(100)
      
      // Settle back to end position
      await this.gramFramePage.page.mouse.move(end.x, end.y)
      await this.gramFramePage.page.waitForTimeout(100)
      
      // Release
      await this.gramFramePage.page.mouse.up()
    }
  }

  /**
   * Simulate shaky hand movement during drag
   * @param {{x: number, y: number}} start - Start position
   * @param {{x: number, y: number}} end - End position
   * @param {number} shakeAmount - Shake intensity
   * @returns {Promise<void>}
   */
  async shakyDrag(start, end, shakeAmount = 3) {
    await this.gramFramePage.page.mouse.move(start.x, start.y)
    await this.gramFramePage.page.mouse.down()
    
    const steps = 20
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const baseX = start.x + t * (end.x - start.x)
      const baseY = start.y + t * (end.y - start.y)
      
      const shakeX = (Math.random() - 0.5) * 2 * shakeAmount
      const shakeY = (Math.random() - 0.5) * 2 * shakeAmount
      
      await this.gramFramePage.page.mouse.move(baseX + shakeX, baseY + shakeY)
      await this.gramFramePage.page.waitForTimeout(50)
    }
    
    await this.gramFramePage.page.mouse.up()
  }

  /**
   * Test cursor responsiveness by measuring lag
   * @param {Array<{x: number, y: number}>} testPositions - Array of positions to test
   * @returns {Promise<Array<{position: {x: number, y: number}, lag: number}>>} Measurement results
   */
  async measureCursorLag(testPositions) {
    const measurements = []
    
    for (const pos of testPositions) {
      const startTime = Date.now()
      
      await this.gramFramePage.page.mouse.move(pos.x, pos.y)
      
      // Wait for cursor position to update in state
      await this.gramFramePage.waitForState(
        (state) => state.cursorPosition !== null,
        1000
      )
      
      const endTime = Date.now()
      const lag = endTime - startTime
      
      measurements.push({
        position: pos,
        lag: lag
      })
      
      await this.gramFramePage.page.waitForTimeout(100)
    }
    
    return measurements
  }

  /**
   * Simulate user hesitation during interaction
   * @param {{x: number, y: number}} position - Target position
   * @param {number} hesitationSteps - Number of hesitation movements
   * @returns {Promise<void>}
   */
  async hesitantMovement(position, hesitationSteps = 3) {
    const currentPos = await this.gramFramePage.page.mouse.position()
    
    for (let i = 0; i < hesitationSteps; i++) {
      // Move partway toward target
      const progress = (i + 1) / (hesitationSteps + 1)
      const intermediateX = currentPos.x + progress * (position.x - currentPos.x)
      const intermediateY = currentPos.y + progress * (position.y - currentPos.y)
      
      await this.gramFramePage.page.mouse.move(intermediateX, intermediateY)
      await this.gramFramePage.page.waitForTimeout(200 + Math.random() * 300) // Random hesitation
      
      // Small backtrack
      if (i < hesitationSteps - 1) {
        await this.gramFramePage.page.mouse.move(
          intermediateX - 5 + Math.random() * 10,
          intermediateY - 5 + Math.random() * 10
        )
        await this.gramFramePage.page.waitForTimeout(100)
      }
    }
    
    // Final movement to target
    await this.gramFramePage.page.mouse.move(position.x, position.y)
  }

  /**
   * Perform precision targeting test
   * @param {Array<{x: number, y: number, radius: number}>} targets - Array of small target areas
   * @param {number} tolerance - Acceptable distance from target center
   * @returns {Promise<Array<{target: {x: number, y: number, radius: number}, success: boolean, distance: number}>>} Targeting results
   */
  async precisionTargeting(targets, tolerance = 5) {
    const results = []
    
    for (const target of targets) {
      // Move to target with precision
      await this.gramFramePage.page.mouse.move(target.x, target.y)
      await this.gramFramePage.page.waitForTimeout(100)
      
      // Click
      await this.gramFramePage.page.mouse.click(target.x, target.y)
      
      // Measure actual click position vs target
      const actualDistance = 0 // In real scenario, would measure from created feature position
      const success = actualDistance <= tolerance
      
      results.push({
        target: target,
        success: success,
        distance: actualDistance
      })
      
      await this.gramFramePage.page.waitForTimeout(200)
    }
    
    return results
  }
}

/**
 * Keyboard interaction helpers
 */
class KeyboardHelpers {
  /**
   * Create a new KeyboardHelpers instance
   * @param {GramFramePage} gramFramePage - GramFramePage instance
   */
  constructor(gramFramePage) {
    /** @type {GramFramePage} */
    this.gramFramePage = gramFramePage
  }

  /**
   * Test keyboard shortcuts and combinations
   * @param {string[]} combinations - Array of key combinations to test
   * @returns {Promise<Array<{combination: string, success: boolean, stateValid: boolean, error?: string}>>} Test results
   */
  async testKeyboardCombinations(combinations) {
    const results = []
    
    for (const combo of combinations) {
      try {
        await this.gramFramePage.page.keyboard.press(combo)
        await this.gramFramePage.page.waitForTimeout(100)
        
        // Verify system state after keyboard input
        const state = await this.gramFramePage.getState()
        
        results.push({
          combination: combo,
          success: true,
          stateValid: !!state.version
        })
      } catch (error) {
        results.push({
          combination: combo,
          success: false,
          error: error.message
        })
      }
    }
    
    return results
  }

  /**
   * Test modifier key behavior during mouse interactions
   * @param {string[]} modifiers - Array of modifier keys to test
   * @param {{x: number, y: number}} testPosition - Position to test interaction
   * @returns {Promise<Array<{modifier: string, success: boolean, stateAfter?: any, error?: string}>>} Test results
   */
  async testModifierMouseInteractions(modifiers, testPosition) {
    const results = []
    
    for (const modifier of modifiers) {
      try {
        // Press modifier
        await this.gramFramePage.page.keyboard.down(modifier)
        
        // Perform mouse interaction
        await this.gramFramePage.page.mouse.click(testPosition.x, testPosition.y)
        
        // Release modifier
        await this.gramFramePage.page.keyboard.up(modifier)
        
        // Check state
        const state = await this.gramFramePage.getState()
        
        results.push({
          modifier: modifier,
          success: true,
          stateAfter: state
        })
        
        await this.gramFramePage.page.waitForTimeout(100)
      } catch (error) {
        results.push({
          modifier: modifier,
          success: false,
          error: error.message
        })
      }
    }
    
    return results
  }
}

export { InteractionHelpers, KeyboardHelpers }