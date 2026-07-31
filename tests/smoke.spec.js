import { test, expect } from '@playwright/test'

/**
 * @fileoverview Cross-browser smoke test (spec 164, GF-34): asserts the
 * component initializes and renders on a real page. Runs in every Playwright
 * project — this is the only spec the webkit project executes.
 */

test.describe('component smoke', () => {
  test('initializes and renders the spectrogram component', async ({ page }) => {
    await page.goto('/debug.html')

    const container = page.locator('.gram-frame-container').first()
    await expect(container).toBeVisible()
    await expect(container.locator('svg').first()).toBeVisible()

    // The component publishes state on load; a populated config proves the
    // config table was parsed and the image pipeline ran.
    const state = await page.evaluate(() => {
      const api = /** @type {any} */ (window).GramFrame
      const instance = api?.__test__getInstances?.()[0]
      return instance ? { mode: instance.state.mode, hasConfig: !!instance.state.config } : null
    })
    expect(state).not.toBeNull()
    expect(state.hasConfig).toBe(true)
    expect(typeof state.mode).toBe('string')
  })
})
