/**
 * The `image-sizing` trial row (issue #345): legacy caps a wide image at 1200
 * CSS pixels whatever the room; native fits it to the room, and follows a
 * resize; an unknown value is reported like any other config mistake.
 */

import { test, expect } from '@playwright/test'

/**
 * The drawn base width of each image-backed instance, once all have loaded.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<number[]>}
 */
async function naturalWidths(page) {
  let widths = /** @type {number[]} */ ([])
  await expect.poll(async () => {
    widths = await page.evaluate(() => window.GramFrame.__test__getInstances()
      .map((/** @type {any} */ i) => i.state.imageDetails.naturalWidth))
    return widths.length === 4 && widths.every(w => w > 0)
  }).toBe(true)
  return widths
}

test.describe('image-sizing config row (issue #345)', () => {
  test('native fits a wide gram to the room; legacy keeps its 1200 cap', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 800 })
    await page.goto('http://localhost:5173/tests/fixtures/image-sizing-page.html')
    const [legacy, native] = await naturalWidths(page)
    expect(legacy).toBe(1200)
    expect(native).toBeLessThan(1000)

    // Nothing in the component scrolls sideways under native.
    const svg = page.locator('.gram-frame-container').nth(1).locator('.gram-frame-svg')
    const svgBox = await svg.boundingBox()
    expect(svgBox && svgBox.x + svgBox.width).toBeLessThanOrEqual(1000)

    // A wider window gives it its full native width back; legacy is unmoved.
    await page.setViewportSize({ width: 1900, height: 800 })
    await expect.poll(async () => (await naturalWidths(page))[1]).toBe(1677)
    expect((await naturalWidths(page))[0]).toBe(1200)
  })

  test('a portrait snippet gets the expand toggle under the trial only, and expands', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 })
    await page.goto('http://localhost:5173/tests/fixtures/image-sizing-page.html')
    await naturalWidths(page)
    const containers = page.locator('.gram-frame-container')
    await expect(containers.nth(2).locator('.gram-frame-expand-toggle')).toHaveCount(0)
    const toggle = containers.nth(3).locator('.gram-frame-expand-toggle')
    await expect(toggle).toHaveCount(1)

    await toggle.click()
    await expect.poll(async () => page.evaluate(() => {
      const details = window.GramFrame.__test__getInstances()[3].state.imageDetails
      return (details.renderWidth || 0) > details.naturalWidth && (details.renderHeight || 0) >= details.naturalHeight
    })).toBe(true)

    await toggle.click()
    await expect.poll(async () => page.evaluate(() => {
      const details = window.GramFrame.__test__getInstances()[3].state.imageDetails
      return [details.renderWidth, details.renderHeight]
    })).toEqual([357, 366])
  })

  test('an unknown image-sizing value is reported on the page', async ({ page }) => {
    await page.goto('http://localhost:5173/tests/fixtures/image-sizing-page.html')
    await expect(page.locator('.gramframe-error-indicator').first()).toContainText('image-sizing')
  })
})
