import { test, expect } from './helpers/fixtures'

/**
 * Phase 3 Axes Tests
 * Tests for SVG axes implementation with tick marks and labels
 */
test.describe('Phase 3: SVG Axes Implementation', () => {
  test('SVG container displays correctly with axes', async ({ gramFramePage }) => {
    // Wait for the image to load and component to initialize
    await gramFramePage.waitForImageLoad()
    
    // Verify the SVG element exists and is visible
    await expect(gramFramePage.svg).toBeVisible()
    
    // Check that axes groups exist
    const timeAxis = gramFramePage.page.locator('.gram-frame-time-axis')
    const freqAxis = gramFramePage.page.locator('.gram-frame-freq-axis')
    
    await expect(timeAxis).toBeAttached()
    await expect(freqAxis).toBeAttached()
  })
  
  test('time axis renders with correct tick marks and labels', async ({ gramFramePage }) => {
    await gramFramePage.waitForImageLoad()
    
    // Check for time axis elements
    const timeAxisLines = gramFramePage.page.locator('.gram-frame-time-axis .gram-frame-axis-line')
    const timeAxisTicks = gramFramePage.page.locator('.gram-frame-time-axis .gram-frame-axis-tick')
    const timeAxisLabels = gramFramePage.page.locator('.gram-frame-time-axis .gram-frame-axis-label')
    
    // Should have exactly one main axis line
    await expect(timeAxisLines).toHaveCount(1)
    
    // Should have multiple tick marks (at least 2)
    const tickCount = await timeAxisTicks.count()
    expect(tickCount).toBeGreaterThanOrEqual(2)
    
    // Should have same number of labels as ticks
    const labelCount = await timeAxisLabels.count()
    expect(labelCount).toBe(tickCount)
    
    // Labels should contain time values in mm:ss format
    const firstLabel = await timeAxisLabels.first().textContent()
    expect(firstLabel).toMatch(/\d{2}:\d{2}/)
  })
  
  test('frequency axis renders with correct tick marks and labels', async ({ gramFramePage }) => {
    await gramFramePage.waitForImageLoad()
    
    // Check for frequency axis elements
    const freqAxisLines = gramFramePage.page.locator('.gram-frame-freq-axis .gram-frame-axis-line')
    const freqAxisTicks = gramFramePage.page.locator('.gram-frame-freq-axis .gram-frame-axis-tick')
    const freqAxisLabels = gramFramePage.page.locator('.gram-frame-freq-axis .gram-frame-axis-label')
    
    // Should have exactly one main axis line
    await expect(freqAxisLines).toHaveCount(1)
    
    // Should have multiple tick marks (at least 2)
    const tickCount = await freqAxisTicks.count()
    expect(tickCount).toBeGreaterThanOrEqual(2)
    
    // Should have same number of labels as ticks
    const labelCount = await freqAxisLabels.count()
    expect(labelCount).toBe(tickCount)
    
    // Labels should contain frequency values with 'Hz' suffix
    const firstLabel = await freqAxisLabels.first().textContent()
    expect(firstLabel).toMatch(/\d+Hz/)
  })
  
  test('axes update correctly when container is resized', async ({ gramFramePage, page }) => {
    await gramFramePage.waitForImageLoad()
    
    // Get initial tick count
    const initialTickCount = await gramFramePage.page.locator('.gram-frame-time-axis .gram-frame-axis-tick').count()
    
    // Simulate container resize by changing viewport
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.waitForTimeout(500) // Wait for resize to complete
    
    // Check that axes still exist and are properly rendered
    const timeAxisTicks = gramFramePage.page.locator('.gram-frame-time-axis .gram-frame-axis-tick')
    const freqAxisTicks = gramFramePage.page.locator('.gram-frame-freq-axis .gram-frame-axis-tick')
    
    // Check that ticks exist (they may be very small after resize)
    expect(await timeAxisTicks.count()).toBeGreaterThan(0)
    expect(await freqAxisTicks.count()).toBeGreaterThan(0)
    
    // Tick count should still be reasonable (may have changed due to different available space)
    const newTickCount = await timeAxisTicks.count()
    expect(newTickCount).toBeGreaterThanOrEqual(2)
  })
  
  test('mouse coordinates are correctly calculated with axes margins', async ({ gramFramePage }) => {
    await gramFramePage.waitForImageLoad()
    
    // Move mouse over the center of the image area (accounting for margins)
    const svgBounds = await gramFramePage.svg.boundingBox()
    if (svgBounds) {
      // Move to approximate center of image area (accounting for left margin)
      const centerX = svgBounds.width * 0.6  // Offset to account for left margin
      const centerY = svgBounds.height * 0.5
      
      await gramFramePage.moveMouse(centerX, centerY)
      await gramFramePage.page.waitForTimeout(200)
      
      // Verify state was updated with cursor position
      const state = await gramFramePage.getState()
      expect(state.cursorPosition).toBeDefined()
      expect(state.cursorPosition.time).toBeGreaterThan(0)
      expect(state.cursorPosition.freq).toBeGreaterThan(0)
      
      // Should have both screen and image coordinates
      expect(state.cursorPosition.x).toBeDefined()
      expect(state.cursorPosition.y).toBeDefined()
      expect(state.cursorPosition.imageX).toBeDefined()
      expect(state.cursorPosition.imageY).toBeDefined()
    }
  })
  
  test('coordinate transformations work correctly with axes', async ({ gramFramePage }) => {
    await gramFramePage.waitForImageLoad()
    
    // Test mouse movement at various positions
    const svgBounds = await gramFramePage.svg.boundingBox()
    if (svgBounds) {
      // Test movement in different areas
      const testPositions = [
        { x: svgBounds.width * 0.6, y: svgBounds.height * 0.3 }, // Upper center
        { x: svgBounds.width * 0.8, y: svgBounds.height * 0.7 }, // Lower right
        { x: svgBounds.width * 0.4, y: svgBounds.height * 0.5 }  // Center left
      ]
      
      for (const pos of testPositions) {
        await gramFramePage.moveMouse(pos.x, pos.y)
        await gramFramePage.page.waitForTimeout(100)
        
        const state = await gramFramePage.getState()
        if (state.cursorPosition) {
          // Verify coordinates are within expected ranges
          expect(state.cursorPosition.time).toBeGreaterThanOrEqual(0)
          expect(state.cursorPosition.time).toBeLessThanOrEqual(60) // Based on test config
          expect(state.cursorPosition.freq).toBeGreaterThanOrEqual(0)
          expect(state.cursorPosition.freq).toBeLessThanOrEqual(100) // Based on test config
        }
      }
    }
  })
})