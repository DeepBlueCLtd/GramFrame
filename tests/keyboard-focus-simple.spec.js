import { test, expect } from '@playwright/test'

test.describe('Keyboard Focus Behavior', () => {
  test('should only respond to keyboard events in focused instance', async ({ page }) => {
    // Navigate to the debug page with multiple instances
    await page.goto('http://localhost:5173/debug-multiple.html')
    
    // Wait for both GramFrames to initialize
    await page.waitForSelector('.gram-frame-container', { timeout: 15000 })
    const containers = await page.locator('.gram-frame-container').count()
    expect(containers).toBe(2)
    
    const gramFrame1 = page.locator('.gram-frame-container').first()
    const gramFrame2 = page.locator('.gram-frame-container').nth(1)
    
    // Create markers in both GramFrames by clicking
    const svg1 = gramFrame1.locator('.gram-frame-svg')
    const svg2 = gramFrame2.locator('.gram-frame-svg')
    
    await svg1.click({ position: { x: 300, y: 200 } })
    await page.waitForTimeout(200)
    
    await svg2.click({ position: { x: 300, y: 200 } })
    await page.waitForTimeout(200)
    
    // Verify markers exist in both frames
    const marker1 = gramFrame1.locator('.gram-frame-analysis-marker').first()
    const marker2 = gramFrame2.locator('.gram-frame-analysis-marker').first()
    
    // Focus on first GramFrame and select its marker by clicking on the marker table row
    await gramFrame1.click()
    const markerRow1 = gramFrame1.locator('tr[data-marker-id]').first()
    await markerRow1.click()
    await page.waitForTimeout(200)
    
    // Get initial positions of both markers
    const initialPos1 = await marker1.boundingBox()
    const initialPos2 = await marker2.boundingBox()
    
    expect(initialPos1).not.toBeNull()
    expect(initialPos2).not.toBeNull()
    
    // Press arrow key - should only move marker in focused instance (first one)
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(300)
    
    const newPos1 = await marker1.boundingBox()
    const newPos2 = await marker2.boundingBox()
    
    // First marker should have moved (it's in the focused instance)
    expect(newPos1.x).toBeGreaterThan(initialPos1.x)
    
    // Second marker should NOT have moved (it's not in the focused instance)
    expect(Math.abs(newPos2.x - initialPos2.x)).toBeLessThan(2) // Allow small measurement error
    expect(Math.abs(newPos2.y - initialPos2.y)).toBeLessThan(2)
    
    // Now switch focus to second instance and select its marker
    await gramFrame2.click()
    const markerRow2 = gramFrame2.locator('tr[data-marker-id]').first()
    await markerRow2.click()
    await page.waitForTimeout(200)
    
    // Get current positions
    const beforeSecondMove1 = await marker1.boundingBox()
    const beforeSecondMove2 = await marker2.boundingBox()
    
    // Press arrow key again - should only move marker in second instance now
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(300)
    
    const afterSecondMove1 = await marker1.boundingBox()
    const afterSecondMove2 = await marker2.boundingBox()
    
    // First marker should NOT have moved (focus switched)
    expect(Math.abs(afterSecondMove1.x - beforeSecondMove1.x)).toBeLessThan(2)
    expect(Math.abs(afterSecondMove1.y - beforeSecondMove1.y)).toBeLessThan(2)
    
    // Second marker should have moved left
    expect(afterSecondMove2.x).toBeLessThan(beforeSecondMove2.x)
  })
})