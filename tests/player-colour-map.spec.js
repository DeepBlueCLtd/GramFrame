import { test, expect } from '@playwright/test'
import { GramFramePage } from './helpers/gram-frame-page.js'

/**
 * @fileoverview The colour-map radio row and the `colour-map` config row.
 *
 * An analyst comparing the player with a legacy renderer that only ever drew
 * grey shades needs the same picture in grey, and then the perceptually
 * uniform maps to set against both — each as a click rather than a
 * re-analysis. What is worth holding: a radio repaints the *pixels* (not
 * merely a state flag), it goes back to the identical colour image, it never
 * touches a reading or an annotation, a table can open in any map, and an
 * image-backed instance never grows the row.
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

/**
 * The radio for a map, on the first (or only) gram on the page.
 * @param {import('@playwright/test').Page} page - The page
 * @param {string} map - The map's name, as its radio's value
 * @param {number} [index=0] - Which gram
 * @returns {import('@playwright/test').Locator} The radio input
 */
function radio(page, map, index = 0) {
  return page.locator('.gram-frame-colour-map').nth(index).locator(`input[value="${map}"]`)
}

test.describe('the colour-map radio row', () => {
  test('repaints the gram grey, then inferno, then back, without re-analysing', async ({ page }) => {
    const gfp = await gotoPlayer(page)
    const group = page.locator('.gram-frame-colour-map')
    await expect(group).toHaveAttribute('role', 'radiogroup')
    await expect(radio(page, 'colour')).toBeChecked()
    await expect(group.locator('label')).toHaveText(['Colour', 'Grey', 'Inferno', 'Magma', 'Viridis', 'Plasma'])

    const colour = await samplePixels(page, 0)
    expect(colour.coloured).toBe(true)
    const framesBefore = (await gfp.getState()).player.analysis.frames

    await radio(page, 'grey').check()
    await expect(radio(page, 'grey')).toBeChecked()
    const grey = await samplePixels(page, 0)
    expect(grey.grey).toBe(true)
    expect(grey.href).not.toBe(colour.href)
    const state = await gfp.getState()
    expect(state.player.analysis.colourMap).toBe('grey')
    // The same analysis, repainted: the geometry is untouched
    expect(state.player.analysis.frames).toBe(framesBefore)
    expect(state.player.ready).toBe(true)

    await radio(page, 'inferno').check()
    const inferno = await samplePixels(page, 0)
    expect(inferno.coloured).toBe(true)
    expect(inferno.href).not.toBe(colour.href)
    expect(inferno.href).not.toBe(grey.href)
    expect((await gfp.getState()).player.analysis.colourMap).toBe('inferno')

    // The other three each paint their own picture too
    /** @type {string[]} */
    const seen = [colour.href, grey.href, inferno.href]
    for (const map of ['magma', 'viridis', 'plasma']) {
      await radio(page, map).check()
      const painted = await samplePixels(page, 0)
      expect(painted.coloured).toBe(true)
      expect(seen).not.toContain(painted.href)
      seen.push(painted.href)
      expect((await gfp.getState()).player.analysis.colourMap).toBe(map)
    }

    await radio(page, 'colour').check()
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

    await radio(page, 'inferno').check()

    const reading = await gfp.readDataAtPixel(MARGINS.left + 450, MARGINS.top + 120)
    if (!reading || !readingBefore) throw new Error('the readout must be live over the gram')
    expect(reading.freq).toBe(readingBefore.freq)
    expect(reading.time).toBe(readingBefore.time)
    const after = (await gfp.getState()).analysis.markers[0]
    expect(after.time).toBe(before.time)
    expect(after.freq).toBe(before.freq)
    await expect(page.locator('.gram-frame-analysis-marker')).toHaveCount(1)
  })

  test('the colour-map config row opens a table in grey or inferno, and the row shows it', async ({ page }) => {
    await page.goto(PAINTING_PAGE)
    // Six players, as tests/player-painting.spec.js waits for: the fixture's
    // seventh table is the deliberately bad one, which never becomes an
    // instance. Waiting for a count the page only passes through (it was 5,
    // from before the fixture grew) is a race the page can skip in one frame.
    await page.waitForFunction(() => window.GramFrame.__test__getInstances().filter(i => i.state.player.ready).length === 6)

    const plain = await samplePixels(page, 0)
    const grey = await samplePixels(page, 2)
    const inferno = await samplePixels(page, 3)
    expect(plain.coloured).toBe(true)
    expect(grey.grey).toBe(true)
    expect(inferno.coloured).toBe(true)
    expect(inferno.href).not.toBe(plain.href)
    const maps = await page.evaluate(() => window.GramFrame.__test__getInstances().map(i => i.state.player.analysis.colourMap))
    expect(maps.slice(0, 4)).toEqual(['colour', 'colour', 'grey', 'inferno'])
    // Instances are in document order: `grey` is the third table, `inferno` the fourth
    await expect(radio(page, 'colour', 0)).toBeChecked()
    await expect(radio(page, 'grey', 2)).toBeChecked()
    await expect(radio(page, 'inferno', 3)).toBeChecked()
    // Each gram's radios are its own group: checking one never unchecks another gram's
    await radio(page, 'plasma', 0).check()
    await expect(radio(page, 'grey', 2)).toBeChecked()
    await expect(radio(page, 'inferno', 3)).toBeChecked()
  })

  test('an image-sourced gram has no radio row: there are no levels to repaint', async ({ page }) => {
    await page.goto(IMAGE_PAGE)
    await page.locator('.gram-frame-container').first().waitFor()
    await expect(page.locator('.gram-frame-colour-map')).toHaveCount(0)
  })
})
