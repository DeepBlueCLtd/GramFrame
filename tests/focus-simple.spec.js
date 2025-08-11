import { test, expect } from '@playwright/test'

test.describe('Simple Focus Test', () => {
  test('should demonstrate multiple GramFrame focus works', async ({ page }) => {
    // Navigate to the debug page with multiple instances
    await page.goto('http://localhost:5173/debug-multiple.html')
    
    // Wait for both GramFrames to initialize
    await page.waitForSelector('.gram-frame-container', { timeout: 15000 })
    const containers = await page.locator('.gram-frame-container').count()
    expect(containers).toBe(2)
    
    const gramFrame1 = page.locator('.gram-frame-container').first()
    const gramFrame2 = page.locator('.gram-frame-container').nth(1)
    
    // Initially, no instance should be focused until user interaction
    await page.waitForTimeout(500) // Let focus system initialize
    
    const initialFocus1 = await gramFrame1.evaluate(el => el.classList.contains('gram-frame-focused'))
    const initialFocus2 = await gramFrame2.evaluate(el => el.classList.contains('gram-frame-focused'))
    
    // Neither should be focused initially
    expect(initialFocus1).toBe(false)
    expect(initialFocus2).toBe(false)
    
    // Click on the second GramFrame to switch focus
    await gramFrame2.click()
    await page.waitForTimeout(200)
    
    // Check focus has switched
    const afterClick1 = await gramFrame1.evaluate(el => el.classList.contains('gram-frame-focused'))
    const afterClick2 = await gramFrame2.evaluate(el => el.classList.contains('gram-frame-focused'))
    
    expect(afterClick1).toBe(false)
    expect(afterClick2).toBe(true)
    
    // Click on the first GramFrame to switch back
    await gramFrame1.click()
    await page.waitForTimeout(200)
    
    // Check focus has switched back
    const afterSecondClick1 = await gramFrame1.evaluate(el => el.classList.contains('gram-frame-focused'))
    const afterSecondClick2 = await gramFrame2.evaluate(el => el.classList.contains('gram-frame-focused'))
    
    expect(afterSecondClick1).toBe(true)
    expect(afterSecondClick2).toBe(false)
  })
})