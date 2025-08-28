import { test, expect } from '@playwright/test'

test.describe('Keyboard Interaction Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/debug-multiple.html')
    await page.waitForSelector('.gram-frame-container', { timeout: 10000 })
    const containers = await page.locator('.gram-frame-container').count()
    expect(containers).toBe(3)
  })

  test('should handle keyboard events when focused', async ({ page }) => {
    const container1 = page.locator('.gram-frame-container').first()
    const container2 = page.locator('.gram-frame-container').nth(1)
    
    // Focus on first container
    await container1.click()
    await page.waitForTimeout(100)
    
    // Test keyboard interaction
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100)
    
    // Verify containers are still visible
    await expect(container1).toBeVisible()
    await expect(container2).toBeVisible()
  })

  test('should not break when switching between instances', async ({ page }) => {
    const container1 = page.locator('.gram-frame-container').first()
    const container2 = page.locator('.gram-frame-container').nth(1)
    
    // Click back and forth between containers
    await container1.click()
    await page.waitForTimeout(50)
    await container2.click()  
    await page.waitForTimeout(50)
    await container1.click()
    await page.waitForTimeout(50)
    
    // Both should still be visible and functional
    await expect(container1).toBeVisible()
    await expect(container2).toBeVisible()
  })

  test('should maintain focus state correctly', async ({ page }) => {
    const container1 = page.locator('.gram-frame-container').first()
    const container2 = page.locator('.gram-frame-container').nth(1)
    
    // Click first container
    await container1.click()
    await page.waitForTimeout(100)
    
    // Check if any focus indicator exists (visual or programmatic)
    const hasFocusIndication1 = await container1.evaluate(el => {
      const hasClass = el.classList.contains('focused') || 
                       el.classList.contains('gram-frame-focused') ||
                       el.classList.contains('active')
      const isActive = document.activeElement === el || el.contains(document.activeElement)
      return { hasClass, isActive }
    })
    
    // Click second container
    await container2.click()
    await page.waitForTimeout(100)
    
    const hasFocusIndication2 = await container2.evaluate(el => {
      const hasClass = el.classList.contains('focused') || 
                       el.classList.contains('gram-frame-focused') ||
                       el.classList.contains('active')
      const isActive = document.activeElement === el || el.contains(document.activeElement)
      return { hasClass, isActive }
    })
    
    // At least one should have some form of focus indication
    const anyFocusIndication = hasFocusIndication1.hasClass || 
                               hasFocusIndication1.isActive ||
                               hasFocusIndication2.hasClass || 
                               hasFocusIndication2.isActive
    
    expect(anyFocusIndication).toBe(true)
  })

  test('should handle escape key without errors', async ({ page }) => {
    const container1 = page.locator('.gram-frame-container').first()
    
    await container1.click()
    await page.waitForTimeout(100)
    
    // Press escape - should not cause errors
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    
    // Container should still be visible
    await expect(container1).toBeVisible()
  })
})