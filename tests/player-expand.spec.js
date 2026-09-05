import { test, expect } from '@playwright/test'
import { GramFramePage } from './helpers/gram-frame-page.js'

/**
 * @fileoverview The expand ("fit to window") toggle on an audio-sourced gram
 * (spec 168 follow-up). A player's natural size is bins × frames — portrait —
 * but it is drawn at a landscape axes area, so the toggle must appear, grow
 * that area to fill the window (leaving the transport bar on screen), keep
 * every annotation on its data coordinates, and collapse back to exactly the
 * player's base size.
 */

const PLAYER_PAGE = '/tests/fixtures/player-page.html'
const BASE = { width: 900, height: 400 }

/**
 * @param {import('@playwright/test').Page} page
 */
async function gotoPlayer(page) {
  const gfp = new GramFramePage(page)
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto(PLAYER_PAGE)
  await gfp.waitForPlayerReady()
  return gfp
}

test.describe('Expand toggle on an audio-sourced gram', () => {
  test('the toggle is present and expands the gram to the available space with the transport still visible', async ({ page }) => {
    const gfp = await gotoPlayer(page)
    expect(await gfp.isExpandToggleVisible()).toBe(true)

    const before = await gfp.getRenderedImageSize()
    expect(before.width).toBe(BASE.width)

    await gfp.clickExpandToggle()
    const state = await gfp.getState()
    expect(state.imageExpanded).toBe(true)
    expect(state.imageDetails.renderWidth).toBeGreaterThan(BASE.width)
    expect(state.imageDetails.renderHeight).toBeGreaterThan(BASE.height)
    // The stretched image scales with the axes area: height = renderHeight × stretch
    const after = await gfp.getRenderedImageSize()
    expect(after.width).toBeCloseTo(state.imageDetails.renderWidth, 3)
    expect(after.height).toBeCloseTo(state.imageDetails.renderHeight * state.imageDetails.timeStretch, 3)

    // The transport bar is still inside the viewport
    const bar = await page.locator('.gram-frame-transport').boundingBox()
    const viewport = page.viewportSize()
    expect(bar).not.toBeNull()
    expect(bar.y + bar.height).toBeLessThanOrEqual(viewport.height)
  })

  test('collapse restores the player base size exactly', async ({ page }) => {
    const gfp = await gotoPlayer(page)
    await gfp.clickExpandToggle()
    await gfp.clickExpandToggle()
    const state = await gfp.getState()
    expect(state.imageExpanded).toBe(false)
    expect(state.imageDetails.renderWidth).toBe(BASE.width)
    expect(state.imageDetails.renderHeight).toBe(BASE.height)
    const size = await gfp.getRenderedImageSize()
    expect(size.width).toBe(BASE.width)
    expect(size.height).toBeCloseTo(BASE.height * state.imageDetails.timeStretch, 3)
  })

  test('a marker keeps its data coordinates and follows the gram through expand and collapse', async ({ page }) => {
    const gfp = await gotoPlayer(page)
    await page.evaluate(() => window.GramFrame.getPlayer(0).seek(8))
    await gfp.waitForState(s => s.player.viewTop === 8, { message: 'seek to 8 s' })
    await gfp.clickMode('Cross Cursor')
    await gfp.svg.click({ position: { x: 60 + 300, y: 15 + 160 } })
    await gfp.waitForMarkerCount(1)
    const placed = (await gfp.getState()).analysis.markers[0]

    await gfp.clickExpandToggle()
    const expanded = await gfp.getState()
    const marker = expanded.analysis.markers[0]
    expect(marker.time).toBeCloseTo(placed.time, 6)
    expect(marker.freq).toBeCloseTo(placed.freq, 6)
    // Drawn where the data maps to on the expanded axes
    const { renderWidth, renderHeight } = expanded.imageDetails
    const expectedX = 60 + (marker.freq / 3000) * renderWidth
    const expectedY = 15 + (8 - marker.time) * (renderHeight / 5)
    const drawn = await page.locator('.gram-frame-analysis-marker').evaluate(el => { const b = el.getBBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 } })
    expect(Math.abs(drawn.x - expectedX)).toBeLessThan(2)
    expect(Math.abs(drawn.y - expectedY)).toBeLessThan(2)

    await gfp.clickExpandToggle()
    const collapsed = (await gfp.getState()).analysis.markers[0]
    expect(collapsed.time).toBeCloseTo(placed.time, 6)
    expect(collapsed.freq).toBeCloseTo(placed.freq, 6)
  })

  test('playback keeps following the playhead while expanded', async ({ page }) => {
    const gfp = await gotoPlayer(page)
    await gfp.clickExpandToggle()
    await page.locator('.gram-frame-transport-play').click()
    await gfp.waitForState(s => s.player.playing && s.player.playhead > 1, { message: 'playback while expanded' })
    const s = await gfp.getState()
    expect(s.player.viewTop).toBeCloseTo(s.player.playhead, 6)
    expect(s.imageExpanded).toBe(true)
  })
})
