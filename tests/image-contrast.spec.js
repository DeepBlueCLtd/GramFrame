import { test, expect } from '@playwright/test'
import { GramFramePage } from './helpers/gram-frame-page.js'

/**
 * @fileoverview Contrast on an image-sourced gram (#324, amending spec 171
 * FR-014).
 *
 * The player's half of this is covered in `player-refinements.spec.js`. What
 * matters here is the half that was refused: that an author-supplied PNG gets
 * the same controls, in a place of their own, and that using them still cannot
 * move a single number an analyst reads or stores.
 */

const IMAGE_PAGE = '/debug.html'
const MARGINS = { left: 60, top: 15 }

/**
 * Open an image-backed gram and wait for it to be drawn.
 * @param {import('@playwright/test').Page} page - The page
 * @returns {Promise<GramFramePage>} The helper
 */
async function gotoImageGram(page) {
  const gfp = new GramFramePage(page)
  await page.goto(IMAGE_PAGE)
  await gfp.waitForState(s => s.imageDetails.naturalWidth > 0, { message: 'the image gram to load' })
  return gfp
}

/**
 * Move one of the contrast sliders on the image gram's own bar.
 * @param {import('@playwright/test').Page} page - The page
 * @param {'floor'|'ceiling'} which - Which control
 * @param {number} value - 0..1
 * @returns {Promise<void>}
 */
async function setContrast(page, which, value) {
  await page.evaluate(({ selector, next }) => {
    const input = /** @type {HTMLInputElement|null} */ (document.querySelector(selector))
    if (!input) throw new Error(`no ${selector}`)
    input.value = String(next)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }, { selector: `.gram-frame-display-bar .gram-frame-display-${which} input`, next: value })
}

test.describe('#324 — contrast on an image-sourced gram', () => {
  test('the controls are mounted on their own bar under the gram, with no transport', async ({ page }) => {
    await gotoImageGram(page)
    const bar = page.locator('.gram-frame-display-bar').first()
    await expect(bar).toBeVisible()
    await expect(bar.locator('.gram-frame-display-floor input')).toHaveCount(1)
    await expect(bar.locator('.gram-frame-display-ceiling input')).toHaveCount(1)
    await expect(bar.locator('.gram-frame-display-reset')).toHaveCount(1)
    await expect(page.locator('.gram-frame-transport')).toHaveCount(0)

    // The bar sits below the SVG, where a player's transport bar sits
    const order = await page.evaluate(() => {
      const cell = document.querySelector('.gram-frame-main-panel')
      const svg = cell?.querySelector('.gram-frame-svg')
      const contrastBar = cell?.querySelector('.gram-frame-display-bar')
      if (!svg || !contrastBar) return null
      return svg.compareDocumentPosition(contrastBar) & Node.DOCUMENT_POSITION_FOLLOWING ? 'after' : 'before'
    })
    expect(order).toBe('after')
  })

  test('moving a control filters the drawn image, and Reset restores it exactly', async ({ page }) => {
    const gfp = await gotoImageGram(page)
    const image = page.locator('.gram-frame-spectrogram-image').first()
    await expect(image).not.toHaveAttribute('filter', /./)

    await setContrast(page, 'floor', 0.4)
    await expect(image).toHaveAttribute('filter', /gramDisplay/)
    expect((await gfp.getState()).display.floor).toBeCloseTo(0.4, 6)

    await page.locator('.gram-frame-display-reset').first().click()
    await expect(image).not.toHaveAttribute('filter', /./)
    expect((await gfp.getState()).display).toEqual({ floor: 0, ceiling: 1 })
  })

  test('no readout, marker or stored value moves across the controls\' full travel', async ({ page }) => {
    const gfp = await gotoImageGram(page)
    await gfp.clickMode('Cross Cursor')
    await gfp.svg.click({ position: { x: MARGINS.left + 200, y: MARGINS.top + 120 } })
    await gfp.waitForMarkerCount(1)
    const before = (await gfp.getState()).analysis.markers[0]
    const readingBefore = await gfp.readDataAtPixel(MARGINS.left + 260, MARGINS.top + 80)

    for (const [which, value] of /** @type {Array<['floor'|'ceiling', number]>} */ ([['floor', 0.3], ['ceiling', 0.55], ['floor', 0.02]])) {
      await setContrast(page, which, value)
      const reading = await gfp.readDataAtPixel(MARGINS.left + 260, MARGINS.top + 80)
      if (!reading || !readingBefore) throw new Error('the readout must be live over the gram')
      expect(reading.freq).toBe(readingBefore.freq)
      expect(reading.time).toBe(readingBefore.time)
    }

    const after = (await gfp.getState()).analysis.markers[0]
    expect(after.freq).toBe(before.freq)
    expect(after.time).toBe(before.time)
    await expect(page.locator('.gram-frame-analysis-marker')).toHaveCount(1)
  })

  test('the setting is view state: it does not survive a reload', async ({ page }) => {
    const gfp = await gotoImageGram(page)
    await setContrast(page, 'floor', 0.45)
    expect((await gfp.getState()).display.floor).toBeCloseTo(0.45, 6)

    await page.reload()
    await gfp.waitForState(s => s.imageDetails.naturalWidth > 0, { message: 'the gram to reload' })
    // A trainee's contrast setting is not part of their work (spec 171,
    // Assumptions), so it resets while the annotations do not.
    expect((await gfp.getState()).display).toEqual({ floor: 0, ceiling: 1 })
    await expect(page.locator('.gram-frame-spectrogram-image').first()).not.toHaveAttribute('filter', /./)
  })

  test('the two ends never cross on an image gram either', async ({ page }) => {
    const gfp = await gotoImageGram(page)
    await setContrast(page, 'ceiling', 0.25)
    await setContrast(page, 'floor', 0.95)
    const settled = (await gfp.getState()).display
    expect(settled.floor).toBeLessThan(settled.ceiling)
    expect(settled.ceiling).toBeLessThanOrEqual(1)
  })
})
