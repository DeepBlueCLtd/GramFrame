import { test, expect } from '@playwright/test'

test.describe('Simple Interaction Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/debug-multiple.html')
    await page.waitForSelector('.gram-frame-container', { timeout: 10000 })
    const containers = await page.locator('.gram-frame-container').count()
    expect(containers).toBe(3)
  })

  test('should handle basic interactions', async ({ page }) => {
    const container1 = page.locator('.gram-frame-container').first()
    const container2 = page.locator('.gram-frame-container').nth(1)
    
    // Basic click test
    await container1.click()
    await page.waitForTimeout(100)
    
    await container2.click()
    await page.waitForTimeout(100)
    
    // Both containers should still be visible
    await expect(container1).toBeVisible()
    await expect(container2).toBeVisible()
  })

  test('should switch between modes without errors', async ({ page }) => {
    const container1 = page.locator('.gram-frame-container').first()
    
    // Look for enabled buttons only
    const enabledButtons = container1.locator('button:not([disabled])')
    const buttonCount = await enabledButtons.count()
    
    // Click through available enabled buttons
    for (let i = 0; i < Math.min(buttonCount, 3); i++) {
      const button = enabledButtons.nth(i)
      if (await button.isVisible()) {
        await button.click()
        await page.waitForTimeout(100)
      }
    }
    
    // Container should still be visible
    await expect(container1).toBeVisible()
  })

  test('should handle multiple clicks without errors', async ({ page }) => {
    const container1 = page.locator('.gram-frame-container').first()
    const container2 = page.locator('.gram-frame-container').nth(1)
    
    // Multiple clicks on each
    for (let i = 0; i < 3; i++) {
      await container1.click()
      await page.waitForTimeout(50)
      await container2.click()
      await page.waitForTimeout(50)
    }
    
    // Both should still be functional
    await expect(container1).toBeVisible()
    await expect(container2).toBeVisible()
  })

  test('should respond to hover events', async ({ page }) => {
    const container1 = page.locator('.gram-frame-container').first()
    
    // Just hover over the container
    const box = await container1.boundingBox()
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.waitForTimeout(100)
    }
    
    // Container should still be visible
    await expect(container1).toBeVisible()
  })
})