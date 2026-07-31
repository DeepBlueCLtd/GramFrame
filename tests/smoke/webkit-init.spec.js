import { test, expect } from '@playwright/test'

/**
 * @fileoverview WebKit smoke test (specs/164-quality-ratchets, US4).
 * Loads the sample debug page and asserts the component initializes, renders
 * its SVG overlay, and reports state — with no page errors thrown. This is the
 * only non-Chromium coverage; it exists to catch engine-specific breakage
 * (e.g. missing APIs) on the artifact users actually deploy.
 */

test('GramFrame initializes and reports state on WebKit', async ({ page }) => {
  /** @type {Error[]} */
  const pageErrors = []
  page.on('pageerror', err => pageErrors.push(err))

  await page.goto('/debug.html')

  // Component replaced the config table and rendered its SVG overlay.
  const svg = page.locator('.gram-frame-svg').first()
  await expect(svg).toBeVisible()

  // Global API is registered.
  await page.waitForFunction(() => window.GramFrame !== undefined)

  // The debug page's state display is populated with real component state.
  await page.waitForFunction(() => {
    const stateDisplay = document.getElementById('state-display')
    return stateDisplay && stateDisplay.textContent &&
           !stateDisplay.textContent.includes('Loading...')
  })
  const stateText = await page.locator('#state-display').textContent()
  const state = JSON.parse(stateText || '{}')
  expect(state.version).toBeTruthy()
  expect(state.mode).toBeTruthy()

  expect(pageErrors).toEqual([])
})
