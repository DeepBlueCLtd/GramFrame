import { test, expect } from '@playwright/test'

test.describe('Basic Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/debug-multiple.html')
    await page.waitForSelector('.gram-frame-container', { timeout: 10000 })
  })

  test('should initialize multiple GramFrame instances', async ({ page }) => {
    const containers = await page.locator('.gram-frame-container').count()
    expect(containers).toBe(2)
    
    // Verify both have basic structure
    for (let i = 0; i < containers; i++) {
      const container = page.locator('.gram-frame-container').nth(i)
      await expect(container).toBeVisible()
      
      // Check for SVG or canvas element
      const hasGraphics = await container.locator('svg, canvas, .gram-frame-svg').count()
      expect(hasGraphics).toBeGreaterThan(0)
    }
  })

  test('should respond to clicks independently', async ({ page }) => {
    const container1 = page.locator('.gram-frame-container').first()
    const container2 = page.locator('.gram-frame-container').nth(1)
    
    // Click on each container
    await container1.click()
    await page.waitForTimeout(100)
    
    await container2.click()  
    await page.waitForTimeout(100)
    
    // Both should still be visible and functional
    await expect(container1).toBeVisible()
    await expect(container2).toBeVisible()
  })

  test('should have working mode switchers', async ({ page }) => {
    const container1 = page.locator('.gram-frame-container').first()
    
    // Look for enabled mode buttons only
    const enabledButtons = container1.locator('button:not([disabled])')
    const buttonCount = await enabledButtons.count()
    
    if (buttonCount > 0) {
      // Click first available enabled button
      await enabledButtons.first().click()
      await page.waitForTimeout(100)
      
      // Should still be functional
      await expect(container1).toBeVisible()
    }
  })

  test('should handle mouse interactions without errors', async ({ page }) => {
    const containers = page.locator('.gram-frame-container')
    const count = await containers.count()
    
    for (let i = 0; i < count; i++) {
      const container = containers.nth(i)
      const graphics = container.locator('svg, canvas, .gram-frame-svg, .gram-frame-hitlayer').first()
      
      if (await graphics.count() > 0) {
        const box = await graphics.boundingBox()
        if (box) {
          // Click center
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
          await page.waitForTimeout(50)
          
          // Hover around
          await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3)
          await page.waitForTimeout(50)
        }
      }
    }
    
    // All containers should still be visible
    for (let i = 0; i < count; i++) {
      await expect(containers.nth(i)).toBeVisible()
    }
  })

  test('should not have console errors during basic interactions', async ({ page }) => {
    const errorLogs = []
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errorLogs.push(msg.text())
      }
    })
    
    const container = page.locator('.gram-frame-container').first()
    await container.click()
    await page.waitForTimeout(200)
    
    // Should have no major errors
    const criticalErrors = errorLogs.filter(log => 
      !log.includes('favicon') && 
      !log.includes('404') &&
      !log.includes('network')
    )
    
    expect(criticalErrors.length).toBe(0)
  })
})