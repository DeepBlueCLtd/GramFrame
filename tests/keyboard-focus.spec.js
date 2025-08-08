import { test, expect } from '@playwright/test'

test.describe('Keyboard Focus with Multiple GramFrames', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a test page with multiple GramFrames
    await page.goto('http://localhost:5173/debug-multiple.html')
    
    // Wait for GramFrames to auto-initialize
    await page.waitForSelector('.gram-frame-container', { timeout: 10000 })
    
    // Verify both GramFrames are present
    const containers = await page.locator('.gram-frame-container').count()
    expect(containers).toBe(2)
  })

  test('should only update focused GramFrame on keyboard arrow keys', async ({ page }) => {
    // Get both GramFrame containers
    const gramFrame1 = page.locator('.gram-frame-container').first()
    const gramFrame2 = page.locator('.gram-frame-container').nth(1)
    
    // Create markers in both GramFrames in Analysis mode
    const spectrogram1 = gramFrame1.locator('.gram-frame-svg')
    const spectrogram2 = gramFrame2.locator('.gram-frame-svg')
    
    // Click to create a marker in first GramFrame
    await spectrogram1.click({ position: { x: 300, y: 200 } })
    await page.waitForTimeout(100)
    
    // Click to create a marker in second GramFrame  
    await spectrogram2.click({ position: { x: 300, y: 200 } })
    await page.waitForTimeout(100)
    
    // Get initial marker positions
    const getMarkerPosition = async (container) => {
      const marker = container.locator('.gram-frame-marker').first()
      const boundingBox = await marker.boundingBox()
      if (!boundingBox) return null
      return { x: boundingBox.x + boundingBox.width / 2, y: boundingBox.y + boundingBox.height / 2 }
    }
    
    const marker1InitialPos = await getMarkerPosition(gramFrame1)
    const marker2InitialPos = await getMarkerPosition(gramFrame2)
    
    expect(marker1InitialPos).not.toBeNull()
    expect(marker2InitialPos).not.toBeNull()
    
    // Focus on the first GramFrame by clicking on it
    await gramFrame1.click()
    
    // Select the marker in the first GramFrame by clicking on it
    const marker1 = gramFrame1.locator('.gram-frame-marker').first()
    await marker1.click()
    await page.waitForTimeout(100)
    
    // Press arrow key to move the selected marker
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(200)
    
    // Check that only the first GramFrame's marker moved
    const marker1NewPos = await getMarkerPosition(gramFrame1)
    const marker2NewPos = await getMarkerPosition(gramFrame2)
    
    // First marker should have moved to the right
    expect(marker1NewPos.x).toBeGreaterThan(marker1InitialPos.x)
    
    // Second marker should NOT have moved
    expect(marker2NewPos.x).toBeCloseTo(marker2InitialPos.x, 1)
    expect(marker2NewPos.y).toBeCloseTo(marker2InitialPos.y, 1)
  })

  test('should switch focus when clicking on different GramFrame', async ({ page }) => {
    // Get both GramFrame containers
    const gramFrame1 = page.locator('.gram-frame-container').first()
    const gramFrame2 = page.locator('.gram-frame-container').nth(1)
    
    // Create markers in both GramFrames
    const spectrogram1 = gramFrame1.locator('.gram-frame-svg')
    const spectrogram2 = gramFrame2.locator('.gram-frame-svg')
    
    await spectrogram1.click({ position: { x: 300, y: 200 } })
    await page.waitForTimeout(100)
    await spectrogram2.click({ position: { x: 300, y: 200 } })
    await page.waitForTimeout(100)
    
    // Helper to get marker position
    const getMarkerPosition = async (container) => {
      const marker = container.locator('.gram-frame-marker').first()
      const boundingBox = await marker.boundingBox()
      if (!boundingBox) return null
      return { x: boundingBox.x + boundingBox.width / 2, y: boundingBox.y + boundingBox.height / 2 }
    }
    
    // Focus on first GramFrame and select its marker
    await gramFrame1.click()
    const marker1 = gramFrame1.locator('.gram-frame-marker').first()
    await marker1.click()
    await page.waitForTimeout(100)
    
    // Get initial positions
    const marker1InitialPos = await getMarkerPosition(gramFrame1)
    const marker2InitialPos = await getMarkerPosition(gramFrame2)
    
    // Now focus on second GramFrame and select its marker
    await gramFrame2.click()
    const marker2 = gramFrame2.locator('.gram-frame-marker').first()
    await marker2.click()
    await page.waitForTimeout(100)
    
    // Press arrow key - should move second marker, not first
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(200)
    
    const marker1NewPos = await getMarkerPosition(gramFrame1)
    const marker2NewPos = await getMarkerPosition(gramFrame2)
    
    // First marker should NOT have moved
    expect(marker1NewPos.x).toBeCloseTo(marker1InitialPos.x, 1)
    expect(marker1NewPos.y).toBeCloseTo(marker1InitialPos.y, 1)
    
    // Second marker should have moved to the left
    expect(marker2NewPos.x).toBeLessThan(marker2InitialPos.x)
  })

  test('should show visual focus indicator', async ({ page }) => {
    const gramFrame1 = page.locator('.gram-frame-container').first()
    const gramFrame2 = page.locator('.gram-frame-container').nth(1)
    
    // Initially neither should have focus indicator
    const hasFocusClass1 = await gramFrame1.evaluate(el => el.classList.contains('gram-frame-focused'))
    const hasFocusClass2 = await gramFrame2.evaluate(el => el.classList.contains('gram-frame-focused'))
    expect(hasFocusClass1).toBe(false)
    expect(hasFocusClass2).toBe(false)
    
    // Click on first GramFrame
    await gramFrame1.click()
    await page.waitForTimeout(100)
    
    // First should have focus indicator, second should not
    const hasFocusAfterClick1 = await gramFrame1.evaluate(el => el.classList.contains('gram-frame-focused'))
    const hasFocusAfterClick2 = await gramFrame2.evaluate(el => el.classList.contains('gram-frame-focused'))
    expect(hasFocusAfterClick1).toBe(true)
    expect(hasFocusAfterClick2).toBe(false)
    
    // Click on second GramFrame
    await gramFrame2.click()
    await page.waitForTimeout(100)
    
    // Second should have focus indicator, first should not
    const hasFocusAfterSwitch1 = await gramFrame1.evaluate(el => el.classList.contains('gram-frame-focused'))
    const hasFocusAfterSwitch2 = await gramFrame2.evaluate(el => el.classList.contains('gram-frame-focused'))
    expect(hasFocusAfterSwitch1).toBe(false)
    expect(hasFocusAfterSwitch2).toBe(true)
  })
})