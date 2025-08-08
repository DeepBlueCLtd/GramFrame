import { test, expect } from '@playwright/test'

/**
 * Ensures the container is in Analysis mode, then creates a marker reliably.
 * Falls back across a few selectors because debug-multiple may differ.
 */
async function ensureMarkerExistsIn(container, page) {
  // 1) Switch to Analysis mode if a mode switcher exists
  const analysisBtn = container.locator('button:has-text("Analysis"), [data-mode="analysis"], [aria-label="Analysis"]')
  if (await analysisBtn.count()) {
    await analysisBtn.first().click()
    // small settle
    await page.waitForTimeout(50)
  }

  // 2) Click center of the SVG to create a marker
  const svg = container.locator('.gram-frame-svg, svg.gram-frame-svg, .gram-frame .gram-frame-svg')
  await expect(svg).toBeVisible({ timeout: 5000 })
  const box = await svg.boundingBox()
  if (!box) throw new Error('SVG has no bounding box')

  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
  await page.waitForTimeout(80)

  // 3) Wait for a marker to appear
  const marker = container.locator('.gram-frame-marker, [data-test="marker-cross"], .analysis-marker').first()
  await expect(marker).toBeVisible({ timeout: 3000 })

  return marker
}

test.describe('Keyboard Focus Behavior', () => {
  test('should only respond to keyboard events in focused instance', async ({ page }) => {
    await page.goto('http://localhost:5173/debug-multiple.html')

    // Wait until two instances are ready
    await page.waitForSelector('.gram-frame-container', { timeout: 15000 })
    const count = await page.locator('.gram-frame-container').count()
    expect(count).toBeGreaterThanOrEqual(2)

    const gramFrame1 = page.locator('.gram-frame-container').first()
    const gramFrame2 = page.locator('.gram-frame-container').nth(1)

    // Make sure markers exist
    const marker1 = await ensureMarkerExistsIn(gramFrame1, page)
    const marker2 = await ensureMarkerExistsIn(gramFrame2, page)

    // Focus first instance
    await gramFrame1.click()
    await marker1.click()
    await page.waitForTimeout(80)

    const initialPos1 = await marker1.boundingBox()
    const initialPos2 = await marker2.boundingBox()
    expect(initialPos1).not.toBeNull()
    expect(initialPos2).not.toBeNull()

    // Arrow key should affect only focused instance
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(120)

    const newPos1 = await marker1.boundingBox()
    const newPos2 = await marker2.boundingBox()
    expect(newPos1.x).toBeGreaterThan(initialPos1.x)
    expect(Math.abs(newPos2.x - initialPos2.x)).toBeLessThan(2)
    expect(Math.abs(newPos2.y - initialPos2.y)).toBeLessThan(2)

    // Switch focus to second instance
    await gramFrame2.click()
    await marker2.click()
    await page.waitForTimeout(80)

    const before2_1 = await marker1.boundingBox()
    const before2_2 = await marker2.boundingBox()

    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(120)

    const after2_1 = await marker1.boundingBox()
    const after2_2 = await marker2.boundingBox()

    expect(Math.abs(after2_1.x - before2_1.x)).toBeLessThan(2)
    expect(Math.abs(after2_1.y - before2_1.y)).toBeLessThan(2)
    expect(after2_2.x).toBeLessThan(before2_2.x)
  })
})
