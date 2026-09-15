import { test, expect } from '@playwright/test'
import { GramFramePage } from './helpers/gram-frame-page.js'

/**
 * @fileoverview The grey-shades toggle and the `colour-map` config row.
 *
 * An analyst comparing the player with a legacy renderer that only ever drew
 * grey shades needs the same picture in grey, and needs it as a click rather
 * than a re-analysis. What is worth holding: the button repaints the *pixels*
 * grey (not merely a state flag), it goes back to colour, it never touches a
 * reading or an annotation, a table can open in grey, and an image-backed
 * instance never grows the button.
 */

const PLAYER_PAGE = '/tests/fixtures/player-page.html'
const PAINTING_PAGE = '/tests/fixtures/player-painting-page.html'
const IMAGE_PAGE = '/debug.html'
const MARGINS = { left: 60, top: 15 }

/**
 * Decode the gram image an instance is showing and sample its pixels.
 * @param {import('@playwright/test').Page} page - The page
 * @param {number} index - Which instance
 * @returns {Promise<{grey: boolean, coloured: boolean, href: string}>} Whether every sampled pixel is grey, whether any has distinct channels, and the href
 */
async function samplePixels(page, index) {
  return page.evaluate(async (i) => {
    const instance = window.GramFrame.__test__getInstances()[i]
    const href = instance.ui.spectrogramImage.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || ''
    const img = new Image()
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = href })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const context = canvas.getContext('2d')
    if (!context) throw new Error('no 2d context')
    context.drawImage(img, 0, 0)
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data
    let grey = true
    let coloured = false
    for (let p = 0; p < data.length; p += 4 * 97) {
      const same = data[p] === data[p + 1] && data[p + 1] === data[p + 2]
      if (!same) { grey = false; coloured = true }
    }
    return { grey, coloured, href }
  }, index)
}

/**
 * Open the player fixture and wait for the analysis.
 * @param {import('@playwright/test').Page} page - The page
 * @returns {Promise<GramFramePage>} The helper
 */
async function gotoPlayer(page) {
  const gfp = new GramFramePage(page)
  await page.goto(PLAYER_PAGE)
  await gfp.waitForPlayerReady()
  return gfp
}

test.describe('the grey-shades toggle', () => {
  test('repaints the gram grey and back, without re-analysing', async ({ page }) => {
    const gfp = await gotoPlayer(page)
    const button = page.locator('.gram-frame-colour-map')
    await expect(button).toHaveAttribute('aria-pressed', 'false')

    const colour = await samplePixels(page, 0)
    expect(colour.coloured).toBe(true)
    const framesBefore = (await gfp.getState()).player.analysis.frames

    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    const grey = await samplePixels(page, 0)
    expect(grey.grey).toBe(true)
    expect(grey.href).not.toBe(colour.href)
    const state = await gfp.getState()
    expect(state.player.analysis.colourMap).toBe('grey')
    // The same analysis, repainted: the geometry is untouched
    expect(state.player.analysis.frames).toBe(framesBefore)
    expect(state.player.ready).toBe(true)

    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    const back = await samplePixels(page, 0)
    expect(back.coloured).toBe(true)
    expect(back.href).toBe(colour.href)
    expect((await gfp.getState()).player.analysis.colourMap).toBe('colour')
  })

  test('changes what the picture looks like and nothing an analyst reads off it', async ({ page }) => {
    const gfp = await gotoPlayer(page)
    await gfp.clickMode('Cross Cursor')
    await gfp.svg.click({ position: { x: MARGINS.left + 300, y: MARGINS.top + 200 } })
    await gfp.waitForMarkerCount(1)
    const before = (await gfp.getState()).analysis.markers[0]
    const readingBefore = await gfp.readDataAtPixel(MARGINS.left + 450, MARGINS.top + 120)

    await page.locator('.gram-frame-colour-map').click()

    const reading = await gfp.readDataAtPixel(MARGINS.left + 450, MARGINS.top + 120)
    if (!reading || !readingBefore) throw new Error('the readout must be live over the gram')
    expect(reading.freq).toBe(readingBefore.freq)
    expect(reading.time).toBe(readingBefore.time)
    const after = (await gfp.getState()).analysis.markers[0]
    expect(after.time).toBe(before.time)
    expect(after.freq).toBe(before.freq)
    await expect(page.locator('.gram-frame-analysis-marker')).toHaveCount(1)
  })

  test('the colour-map config row opens a table in grey, and the button shows it', async ({ page }) => {
    await page.goto(PAINTING_PAGE)
    await page.waitForFunction(() => window.GramFrame.__test__getInstances().filter(i => i.state.player.ready).length === 4)

    const plain = await samplePixels(page, 0)
    const grey = await samplePixels(page, 2)
    expect(plain.coloured).toBe(true)
    expect(grey.grey).toBe(true)
    const analysis = await page.evaluate(() => window.GramFrame.__test__getInstances()[2].state.player.analysis)
    expect(analysis.colourMap).toBe('grey')
    // Instances are in document order, and `grey` is the third table
    await expect(page.locator('.gram-frame-colour-map').nth(2)).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.gram-frame-colour-map').nth(0)).toHaveAttribute('aria-pressed', 'false')
  })

  test('an image-sourced gram has no toggle: there are no levels to repaint', async ({ page }) => {
    await page.goto(IMAGE_PAGE)
    await page.locator('.gram-frame-container').first().waitFor()
    await expect(page.locator('.gram-frame-colour-map')).toHaveCount(0)
  })
})
