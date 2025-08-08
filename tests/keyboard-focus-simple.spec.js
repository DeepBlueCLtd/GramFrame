import { test, expect } from '@playwright/test'

/**
 * Clicks the center of the SVG inside a GramFrame container to create a marker,
 * then waits for the first marker to be visible. Returns the marker locator.
 */
async function ensureMarkerExistsIn(container, page) {
  const svg = container.locator('.gram-frame-svg')
  await expect(svg).toBeVisible()

  const box = await svg.boundingBox()
  if (!box) throw new Error('SVG has no bounding box')

  // Click near center to guarantee we are inside regardless of layout/viewport
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
  await page.waitForTimeout(50)

  const marker = container.locator('.gram-frame-marker').first()
  await expect(marker).toBeVisible()
  return marker
}

test.describe('Keyboard Focus Behavior', () => {
  test('should only respond to keyboard events in focused instance', async ({ page }) => {
    await page.goto('http://localhost:5173/debug-multiple.html')

    // Wait for both GramFrames to initialize
    await page.waitForSelector('.gram-frame-container', { timeout: 15000 })
    const containers = await page.locator('.gram-frame-container').count()
    expect(containers).toBe(2)

    const gramFrame1 = page.locator('.gram-frame-container').first()
    const gramFrame2 = page.locator('.gram-frame-container').nth(1)

    // Create markers robustly in both frames
    const marker1 = await ensureMarkerExistsIn(gramFrame1, page)
    const marker2 = await ensureMarkerExistsIn(gramFrame2, page)

    // Focus on first GramFrame and select its marker
    await gramFrame1.click()
    await marker1.click()
    await page.waitForTimeout(100)
    // Get initial positions of both markers
    const initialPos1 = await marker1.boundingBox()
    const initialPos2 = await marker2.boundingBox()
    expect(initialPos1).not.toBeNull()
    expect(initialPos2).not.toBeNull()

    // Press arrow key - should only move marker in focused instance (first one)
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(150)

    const newPos1 = await marker1.boundingBox()
    const newPos2 = await marker2.boundingBox()

    // First marker should have moved (it's in the focused instance)
    expect(newPos1.x).toBeGreaterThan(initialPos1.x)

    // Second marker should NOT have moved (allow tiny jitter)
    expect(Math.abs(newPos2.x - initialPos2.x)).toBeLessThan(2)
    expect(Math.abs(newPos2.y - initialPos2.y)).toBeLessThan(2)

    // Now switch focus to second instance
    await gramFrame2.click()
    await marker2.click()
    await page.waitForTimeout(100)
    const beforeSecondMove1 = await marker1.boundingBox()
    const beforeSecondMove2 = await marker2.boundingBox()

    // Press arrow key again - should only move marker in second instance now
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(150)

    const afterSecondMove1 = await marker1.boundingBox()
    const afterSecondMove2 = await marker2.boundingBox()

    // First marker should NOT have moved (focus switched)
    expect(Math.abs(afterSecondMove1.x - beforeSecondMove1.x)).toBeLessThan(2)
    expect(Math.abs(afterSecondMove1.y - beforeSecondMove1.y)).toBeLessThan(2)

    // Second marker should have moved left
    expect(afterSecondMove2.x).toBeLessThan(beforeSecondMove2.x)
  })
})
