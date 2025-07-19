import { test, expect } from './helpers/fixtures'

test.describe('Mouse Tracking Implementation', () => {
  test('mouse movement updates cursor position correctly', async ({ gramFramePage }) => {
    await gramFramePage.waitForImageLoad()
    
    // Get SVG bounds for coordinate calculations
    const svgBounds = await gramFramePage.svg.boundingBox()
    expect(svgBounds).toBeDefined()
    
    if (svgBounds) {
      // Test multiple positions across the image
      const testPositions = [
        { x: svgBounds.width * 0.25, y: svgBounds.height * 0.25 }, // Top-left quadrant
        { x: svgBounds.width * 0.75, y: svgBounds.height * 0.25 }, // Top-right quadrant
        { x: svgBounds.width * 0.25, y: svgBounds.height * 0.75 }, // Bottom-left quadrant
        { x: svgBounds.width * 0.75, y: svgBounds.height * 0.75 }, // Bottom-right quadrant
        { x: svgBounds.width * 0.5, y: svgBounds.height * 0.5 }    // Center
      ]
      
      for (const pos of testPositions) {
        await gramFramePage.moveMouse(pos.x, pos.y)
        await gramFramePage.page.waitForTimeout(100)
        
        const state = await gramFramePage.getState()
        expect(state.cursorPosition).toBeDefined()
        
        // Verify all coordinate systems are populated
        expect(state.cursorPosition.x).toBeGreaterThanOrEqual(0)
        expect(state.cursorPosition.y).toBeGreaterThanOrEqual(0)
        expect(state.cursorPosition.svgX).toBeGreaterThanOrEqual(0)
        expect(state.cursorPosition.svgY).toBeGreaterThanOrEqual(0)
        expect(state.cursorPosition.imageX).toBeGreaterThanOrEqual(0)
        expect(state.cursorPosition.imageY).toBeGreaterThanOrEqual(0)
        expect(state.cursorPosition.time).toBeGreaterThanOrEqual(0)
        expect(state.cursorPosition.freq).toBeGreaterThanOrEqual(0)
      }
    }
  })
  
  test('mouse leave clears cursor position', async ({ gramFramePage }) => {
    await gramFramePage.waitForImageLoad()
    
    // First, move mouse over the image to establish cursor position
    const svgBounds = await gramFramePage.svg.boundingBox()
    if (svgBounds) {
      const centerX = svgBounds.width * 0.5
      const centerY = svgBounds.height * 0.5
      
      await gramFramePage.moveMouse(centerX, centerY)
      await gramFramePage.page.waitForTimeout(100)
      
      // Verify cursor position is set
      let state = await gramFramePage.getState()
      expect(state.cursorPosition).toBeDefined()
      
      // Move mouse outside the SVG container
      await gramFramePage.page.mouse.move(svgBounds.x + svgBounds.width + 50, svgBounds.y + svgBounds.height + 50)
      await gramFramePage.page.waitForTimeout(100)
      
      // Verify cursor position is cleared
      state = await gramFramePage.getState()
      expect(state.cursorPosition).toBeNull()
    }
  })
  
  test('mouse outside image bounds clears cursor position', async ({ gramFramePage }) => {
    await gramFramePage.waitForImageLoad()
    
    // First, establish cursor position inside image
    const svgBounds = await gramFramePage.svg.boundingBox()
    if (svgBounds) {
      const centerX = svgBounds.width * 0.5
      const centerY = svgBounds.height * 0.5
      
      await gramFramePage.moveMouse(centerX, centerY)
      await gramFramePage.page.waitForTimeout(100)
      
      // Verify cursor position is set
      let state = await gramFramePage.getState()
      expect(state.cursorPosition).toBeDefined()
      
      // Move mouse to margin areas (outside image but inside SVG)
      // Left margin (before image)
      await gramFramePage.moveMouse(20, centerY)
      await gramFramePage.page.waitForTimeout(100)
      
      state = await gramFramePage.getState()
      expect(state.cursorPosition).toBeNull()
      
      // Re-establish position
      await gramFramePage.moveMouse(centerX, centerY)
      await gramFramePage.page.waitForTimeout(100)
      
      // Bottom margin (below image)
      await gramFramePage.moveMouse(centerX, svgBounds.height - 10)
      await gramFramePage.page.waitForTimeout(100)
      
      state = await gramFramePage.getState()
      expect(state.cursorPosition).toBeNull()
    }
  })
  
  test('coordinate conversion accuracy', async ({ gramFramePage }) => {
    await gramFramePage.waitForImageLoad()
    
    const svgBounds = await gramFramePage.svg.boundingBox()
    if (svgBounds) {
      // Test known corner positions
      const margin = 60 // Left margin from config
      
      // Move to approximate top-left of image (accounting for margins)
      const imageLeft = margin + 10
      const imageTop = 20
      
      await gramFramePage.moveMouse(imageLeft, imageTop)
      await gramFramePage.page.waitForTimeout(100)
      
      const state = await gramFramePage.getState()
      expect(state.cursorPosition).toBeDefined()
      
      // Time should be close to maximum (top of image = latest time)
      expect(state.cursorPosition.time).toBeGreaterThan(50) // Should be near 60s max
      
      // Frequency should be close to minimum (left of image = lowest freq)
      expect(state.cursorPosition.freq).toBeLessThan(10) // Should be near 0Hz min
      
      // Move to approximate bottom-right of image
      const imageRight = svgBounds.width - 20
      const imageBottom = svgBounds.height - 60 // Account for bottom margin
      
      await gramFramePage.moveMouse(imageRight, imageBottom)
      await gramFramePage.page.waitForTimeout(100)
      
      const state2 = await gramFramePage.getState()
      expect(state2.cursorPosition).toBeDefined()
      
      // Time should be close to minimum (bottom of image = earliest time)
      expect(state2.cursorPosition.time).toBeLessThan(10) // Should be near 0s min
      
      // Frequency should be close to maximum (right of image = highest freq)
      expect(state2.cursorPosition.freq).toBeGreaterThan(90) // Should be near 100Hz max
    }
  })
  
  test('LED displays update with mouse tracking', async ({ gramFramePage }) => {
    await gramFramePage.waitForImageLoad()
    
    const svgBounds = await gramFramePage.svg.boundingBox()
    if (svgBounds) {
      // Move mouse to center of image
      const centerX = svgBounds.width * 0.5
      const centerY = svgBounds.height * 0.5
      
      await gramFramePage.moveMouse(centerX, centerY)
      await gramFramePage.page.waitForTimeout(100)
      
      // Check that LED displays are updated
      const freqLED = gramFramePage.page.locator('.gram-frame-led').filter({ hasText: 'Frequency' })
      const timeLED = gramFramePage.page.locator('.gram-frame-led').filter({ hasText: 'Time' })
      
      const freqValue = await freqLED.locator('.gram-frame-led-value').textContent()
      const timeValue = await timeLED.locator('.gram-frame-led-value').textContent()
      
      expect(freqValue).toMatch(/\d+\.\d+ Hz/)
      expect(timeValue).toMatch(/\d+\.\d+ s/)
      
      // Move mouse outside and verify LEDs show default values
      await gramFramePage.page.mouse.move(svgBounds.x + svgBounds.width + 50, svgBounds.y + svgBounds.height + 50)
      await gramFramePage.page.waitForTimeout(100)
      
      const freqValueAfter = await freqLED.locator('.gram-frame-led-value').textContent()
      const timeValueAfter = await timeLED.locator('.gram-frame-led-value').textContent()
      
      expect(freqValueAfter).toBe('Freq: 0.00 Hz')
      expect(timeValueAfter).toBe('Time: 0.00 s')
    }
  })
})