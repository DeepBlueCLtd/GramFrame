import { test, expect } from '@playwright/test'

test.describe('Simple Focus Test', () => {
  test('should demonstrate multiple GramFrame focus works', async ({ page }) => {
    // Navigate to the debug page with multiple instances
    await page.goto('http://localhost:5173/debug-multiple.html')

    // Wait for both GramFrames to initialize
    await page.waitForSelector('.gram-frame-container', { timeout: 15000 })
    const containers = page.locator('.gram-frame-container')
    await expect(containers).toHaveCount(3)

    const gramFrame1 = containers.first()
    const gramFrame2 = containers.nth(1)

    // Get the gram SVGs within each container (where focus events are handled).
    // Named by class, not by tag: the control row's buttons carry their own
    // small SVG icons (issue #310), so a bare `svg` counts those too.
    const svg1 = gramFrame1.locator('.gram-frame-svg').first()
    const svg2 = gramFrame2.locator('.gram-frame-svg').first()

    // Every instance has finished building its SVG — the point at which the
    // focus system is live, so "nothing is focused yet" is a real result rather
    // than a not-yet-initialised one.
    await expect(containers.locator('.gram-frame-svg')).toHaveCount(3)

    // Neither should be focused until the user interacts
    await expect(gramFrame1).not.toHaveClass(/gram-frame-focused/)
    await expect(gramFrame2).not.toHaveClass(/gram-frame-focused/)

    // Click on the second GramFrame's SVG to switch focus
    await svg2.click()

    // Check focus has switched
    await expect(gramFrame2).toHaveClass(/gram-frame-focused/)
    await expect(gramFrame1).not.toHaveClass(/gram-frame-focused/)

    // Click on the first GramFrame's SVG to switch back
    await svg1.click()

    // Check focus has switched back
    await expect(gramFrame1).toHaveClass(/gram-frame-focused/)
    await expect(gramFrame2).not.toHaveClass(/gram-frame-focused/)
  })
})
