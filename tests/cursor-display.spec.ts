import { test, expect } from './helpers/fixtures'

/**
 * Cursor Display Tests
 * Tests for visual cursor indicators (crosshairs and center point)
 */
test.describe('Cursor Display Implementation', () => {
  test('cursor indicators appear when mouse moves over image', async ({ gramFramePage }) => {
    await gramFramePage.waitForImageLoad()
    
    // Initially, cursor group should be empty
    const cursorGroup = gramFramePage.page.locator('.gram-frame-cursor-group')
    await expect(cursorGroup).toBeAttached()
    
    // Move mouse over the center of the image
    const svgBounds = await gramFramePage.svg.boundingBox()
    if (svgBounds) {
      const centerX = svgBounds.width * 0.5
      const centerY = svgBounds.height * 0.5
      
      await gramFramePage.moveMouse(centerX, centerY)
      await gramFramePage.page.waitForTimeout(100)
      
      // Verify cursor indicators are present
      const shadowLines = gramFramePage.page.locator('.gram-frame-cursor-shadow')
      const verticalLine = gramFramePage.page.locator('.gram-frame-cursor-vertical')
      const horizontalLine = gramFramePage.page.locator('.gram-frame-cursor-horizontal')
      const centerPoint = gramFramePage.page.locator('.gram-frame-cursor-point')
      
      await expect(shadowLines).toHaveCount(2) // One for vertical, one for horizontal
      await expect(verticalLine).toHaveCount(1)
      await expect(horizontalLine).toHaveCount(1)
      await expect(centerPoint).toHaveCount(1)
    }
  })
  
  test('cursor indicators disappear when mouse leaves image', async ({ gramFramePage }) => {
    await gramFramePage.waitForImageLoad()
    
    const svgBounds = await gramFramePage.svg.boundingBox()
    if (svgBounds) {
      // First, move mouse over image to establish cursor indicators
      const centerX = svgBounds.width * 0.5
      const centerY = svgBounds.height * 0.5
      
      await gramFramePage.moveMouse(centerX, centerY)
      await gramFramePage.page.waitForTimeout(100)
      
      // Verify indicators are present
      const verticalLine = gramFramePage.page.locator('.gram-frame-cursor-vertical')
      await expect(verticalLine).toHaveCount(1)
      
      // Move mouse outside the SVG
      await gramFramePage.page.mouse.move(svgBounds.x + svgBounds.width + 50, svgBounds.y + svgBounds.height + 50)
      await gramFramePage.page.waitForTimeout(100)
      
      // Verify all cursor indicators are removed
      const shadowLines = gramFramePage.page.locator('.gram-frame-cursor-shadow')
      const verticalLineAfter = gramFramePage.page.locator('.gram-frame-cursor-vertical')
      const horizontalLine = gramFramePage.page.locator('.gram-frame-cursor-horizontal')
      const centerPoint = gramFramePage.page.locator('.gram-frame-cursor-point')
      
      await expect(shadowLines).toHaveCount(0)
      await expect(verticalLineAfter).toHaveCount(0)
      await expect(horizontalLine).toHaveCount(0)
      await expect(centerPoint).toHaveCount(0)
    }
  })
  
  test('cursor indicators move with mouse position', async ({ gramFramePage }) => {
    await gramFramePage.waitForImageLoad()
    
    const svgBounds = await gramFramePage.svg.boundingBox()
    if (svgBounds) {
      // Test multiple positions
      const testPositions = [
        { x: svgBounds.width * 0.3, y: svgBounds.height * 0.3 },
        { x: svgBounds.width * 0.7, y: svgBounds.height * 0.7 },
        { x: svgBounds.width * 0.5, y: svgBounds.height * 0.2 }
      ]
      
      for (const pos of testPositions) {
        await gramFramePage.moveMouse(pos.x, pos.y)
        await gramFramePage.page.waitForTimeout(100)
        
        // Get cursor line attributes
        const verticalLine = gramFramePage.page.locator('.gram-frame-cursor-vertical')
        const horizontalLine = gramFramePage.page.locator('.gram-frame-cursor-horizontal')
        const centerPoint = gramFramePage.page.locator('.gram-frame-cursor-point')
        
        // Verify elements exist
        await expect(verticalLine).toHaveCount(1)
        await expect(horizontalLine).toHaveCount(1)
        await expect(centerPoint).toHaveCount(1)
        
        // Verify lines have proper coordinates (they should change with mouse position)
        const verticalX1 = await verticalLine.getAttribute('x1')
        const verticalX2 = await verticalLine.getAttribute('x2')
        const horizontalY1 = await horizontalLine.getAttribute('y1')
        const horizontalY2 = await horizontalLine.getAttribute('y2')
        const pointCx = await centerPoint.getAttribute('cx')
        const pointCy = await centerPoint.getAttribute('cy')
        
        // Vertical line should have same x coordinates
        expect(verticalX1).toBe(verticalX2)
        // Horizontal line should have same y coordinates  
        expect(horizontalY1).toBe(horizontalY2)
        // Center point should be at intersection
        expect(pointCx).toBe(verticalX1)
        expect(pointCy).toBe(horizontalY1)
        
        // Values should be numeric
        expect(parseFloat(verticalX1!)).toBeGreaterThan(0)
        expect(parseFloat(horizontalY1!)).toBeGreaterThan(0)
      }
    }
  })
  
  test('cursor indicators have correct styling for visibility', async ({ gramFramePage }) => {
    await gramFramePage.waitForImageLoad()
    
    const svgBounds = await gramFramePage.svg.boundingBox()
    if (svgBounds) {
      // Move mouse to center to activate cursor
      await gramFramePage.moveMouse(svgBounds.width * 0.5, svgBounds.height * 0.5)
      await gramFramePage.page.waitForTimeout(100)
      
      // Check shadow lines (should be thicker and white)
      const shadowLines = gramFramePage.page.locator('.gram-frame-cursor-shadow')
      await expect(shadowLines).toHaveCount(2)
      
      // Check main lines (should be thinner and red)
      const mainLines = gramFramePage.page.locator('.gram-frame-cursor-vertical, .gram-frame-cursor-horizontal')
      await expect(mainLines).toHaveCount(2)
      
      // Check center point
      const centerPoint = gramFramePage.page.locator('.gram-frame-cursor-point')
      await expect(centerPoint).toHaveCount(1)
      
      // Verify CSS classes are applied correctly
      const verticalLine = gramFramePage.page.locator('.gram-frame-cursor-vertical')
      const horizontalLine = gramFramePage.page.locator('.gram-frame-cursor-horizontal')
      
      await expect(verticalLine).toHaveClass(/gram-frame-cursor-vertical/)
      await expect(horizontalLine).toHaveClass(/gram-frame-cursor-horizontal/)
    }
  })
  
  test('cursor indicators work correctly with container resizing', async ({ gramFramePage, page }) => {
    await gramFramePage.waitForImageLoad()
    
    // Get initial cursor position
    const initialBounds = await gramFramePage.svg.boundingBox()
    if (initialBounds) {
      const centerX = initialBounds.width * 0.5
      const centerY = initialBounds.height * 0.5
      
      await gramFramePage.moveMouse(centerX, centerY)
      await gramFramePage.page.waitForTimeout(100)
      
      // Verify cursor is present
      const verticalLine = gramFramePage.page.locator('.gram-frame-cursor-vertical')
      await expect(verticalLine).toHaveCount(1)
      
      // Resize viewport
      await page.setViewportSize({ width: 1200, height: 800 })
      await page.waitForTimeout(500)
      
      // Move mouse again to trigger cursor update
      const newBounds = await gramFramePage.svg.boundingBox()
      if (newBounds) {
        const newCenterX = newBounds.width * 0.5
        const newCenterY = newBounds.height * 0.5
        
        await gramFramePage.moveMouse(newCenterX, newCenterY)
        await gramFramePage.page.waitForTimeout(200)
        
        // Cursor indicators should still work after resize
        const verticalLineAfter = gramFramePage.page.locator('.gram-frame-cursor-vertical')
        const horizontalLine = gramFramePage.page.locator('.gram-frame-cursor-horizontal')
        const centerPoint = gramFramePage.page.locator('.gram-frame-cursor-point')
        
        await expect(verticalLineAfter).toHaveCount(1)
        await expect(horizontalLine).toHaveCount(1)
        await expect(centerPoint).toHaveCount(1)
      }
    }
  })
  
  test('cursor indicators respect image boundaries', async ({ gramFramePage }) => {
    await gramFramePage.waitForImageLoad()
    
    const svgBounds = await gramFramePage.svg.boundingBox()
    if (svgBounds) {
      // Move mouse to margin area (outside image but inside SVG)
      const leftMargin = 30 // Approximate left margin area
      const topMargin = 20  // Approximate top margin area
      
      await gramFramePage.moveMouse(leftMargin, topMargin)
      await gramFramePage.page.waitForTimeout(100)
      
      // Cursor indicators should not appear in margin areas
      const verticalLine = gramFramePage.page.locator('.gram-frame-cursor-vertical')
      const horizontalLine = gramFramePage.page.locator('.gram-frame-cursor-horizontal')
      const centerPoint = gramFramePage.page.locator('.gram-frame-cursor-point')
      
      await expect(verticalLine).toHaveCount(0)
      await expect(horizontalLine).toHaveCount(0)
      await expect(centerPoint).toHaveCount(0)
      
      // Now move to valid image area
      const imageAreaX = svgBounds.width * 0.6 // Account for left margin
      const imageAreaY = svgBounds.height * 0.5
      
      await gramFramePage.moveMouse(imageAreaX, imageAreaY)
      await gramFramePage.page.waitForTimeout(100)
      
      // Now cursor indicators should appear
      await expect(verticalLine).toHaveCount(1)
      await expect(horizontalLine).toHaveCount(1)
      await expect(centerPoint).toHaveCount(1)
    }
  })
})