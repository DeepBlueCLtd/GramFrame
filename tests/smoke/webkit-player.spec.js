import { test, expect } from '@playwright/test'

/**
 * @fileoverview WebKit smoke test for the spectrograph player (spec 168).
 * Opens the sample player page and asserts every audio-sourced instance
 * analyses its recording and becomes ready with no page errors — the check
 * research.md §5.4 asks for on the engine whose canvas ceiling the spike
 * could not measure.
 */

test('every sample player becomes ready on WebKit', async ({ page }) => {
  /** @type {Error[]} */
  const pageErrors = []
  page.on('pageerror', err => pageErrors.push(err))

  await page.goto('/sample/player.html')
  await page.waitForFunction(() => window.GramFrame !== undefined)
  await page.waitForFunction(() => {
    const instances = window.GramFrame.__test__getInstances()
    return instances.length === 4 && instances.every(i => i.state.player.ready)
  }, null, { timeout: 30000 })

  await expect(page.locator('.gram-frame-transport')).toHaveCount(4)
  await expect(page.locator('.gramframe-error-indicator')).toHaveCount(0)
  expect(pageErrors).toEqual([])
})
