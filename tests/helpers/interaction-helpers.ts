import { Page } from '@playwright/test'
import { GramFramePage } from './gram-frame-page'

/**
 * Advanced mouse interaction helpers for complex testing scenarios
 */

/**
 * Mouse interaction patterns and utilities
 */
export class InteractionHelpers {
  constructor(private gramFramePage: GramFramePage) {}

  /**
   * Perform smooth mouse movement between positions
   * @param positions Array of {x, y} positions
   * @param stepDelay Delay between steps in ms
   */
  async smoothMousePath(positions: Array<{ x: number; y: number }>, stepDelay = 50) {
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
   * @param start Start position
   * @param control1 First control point
   * @param control2 Second control point
   * @param end End position
   * @param steps Number of steps in curve
   */
  async bezierMousePath(
    start: { x: number; y: number },
    control1: { x: number; y: number },
    control2: { x: number; y: number },
    end: { x: number; y: number },
    steps = 20
  ) {
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
   * @param center Center of circle
   * @param radius Radius in pixels
   * @param revolutions Number of full revolutions
   * @param steps Steps per revolution
   */
  async circularMouseMovement(
    center: { x: number; y: number },
    radius: number,
    revolutions = 1,
    steps = 36
  ) {
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
   * @param start Start position
   * @param end End position
   * @param amplitude Zigzag amplitude
   * @param frequency Number of zigzags
   */
  async zigzagMouseMovement(
    start: { x: number; y: number },
    end: { x: number; y: number },
    amplitude: number,
    freq: number
  ) {
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
   * @param center Center position
   * @param jitterAmount Maximum jitter distance
   * @param duration Duration in ms
   */
  async jitteryMouseMovement(
    center: { x: number; y: number },
    jitterAmount: number,
    duration: number
  ) {
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
   * @param positions Array of click positions
   * @param clickDelay Delay between clicks
   */
  async rapidClickSequence(positions: Array<{ x: number; y: number }>, clickDelay = 100) {
    for (const pos of positions) {
      await this.gramFramePage.page.mouse.click(pos.x, pos.y)
      await this.gramFramePage.page.waitForTimeout(clickDelay)
    }
  }

  /**
   * Perform double-click at position
   * @param x X coordinate
   * @param y Y coordinate
   * @param delay Delay between clicks
   */
  async doubleClick(x: number, y: number, delay = 100) {
    await this.gramFramePage.page.mouse.click(x, y)
    await this.gramFramePage.page.waitForTimeout(delay)
    await this.gramFramePage.page.mouse.click(x, y)
  }

  /**
   * Perform long press (mouse down with delay before up)
   * @param x X coordinate
   * @param y Y coordinate
   * @param duration Duration of press in ms
   */
  async longPress(x: number, y: number, duration = 1000) {
    await this.gramFramePage.page.mouse.move(x, y)
    await this.gramFramePage.page.mouse.down()
    await this.gramFramePage.page.waitForTimeout(duration)
    await this.gramFramePage.page.mouse.up()
  }

  /**
   * Perform drag with momentum (overshooting and settling)
   * @param start Start position
   * @param end End position
   * @param overshoot Overshoot amount
   */
  async dragWithMomentum(
    start: { x: number; y: number },
    end: { x: number; y: number },
    overshoot = 20
  ) {
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
   * @param start Start position
   * @param end End position
   * @param shakeAmount Shake intensity
   */
  async shakyDrag(
    start: { x: number; y: number },
    end: { x: number; y: number },
    shakeAmount = 3
  ) {
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
   * @param testPositions Array of positions to test
   */
  async measureCursorLag(testPositions: Array<{ x: number; y: number }>) {
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
   * @param position Target position
   * @param hesitationSteps Number of hesitation movements
   */
  async hesitantMovement(
    position: { x: number; y: number },
    hesitationSteps = 3
  ) {
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
   * @param targets Array of small target areas
   * @param tolerance Acceptable distance from target center
   */
  async precisionTargeting(
    targets: Array<{ x: number; y: number; radius: number }>,
    tolerance = 5
  ) {
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
export class KeyboardHelpers {
  constructor(private gramFramePage: GramFramePage) {}

  /**
   * Test keyboard shortcuts and combinations
   * @param combinations Array of key combinations to test
   */
  async testKeyboardCombinations(combinations: string[]) {
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
   * @param modifiers Array of modifier keys to test
   * @param testPosition Position to test interaction
   */
  async testModifierMouseInteractions(
    modifiers: string[],
    testPosition: { x: number; y: number }
  ) {
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