import { test, expect } from '@playwright/test'
import { GramFramePage } from './helpers/gram-frame-page.js'

/**
 * @fileoverview Pan-dragging an audio-sourced gram (issue #286).
 *
 * On a player the vertical axis is a time window rather than a centre
 * fraction, and time runs *upwards* — the newest analysis frame is the image's
 * top row. The drag delta arrives in image-pixel space, where y runs downwards,
 * so the two have to be reconciled; getting that wrong made a downward drag
 * scroll back in time while the gram moved up, the opposite of the horizontal
 * axis and of a static image.
 */

const PLAYER_PAGE = '/tests/fixtures/player-page.html'

/**
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<GramFramePage>} The ready player page helper
 */
async function gotoPlayer(page) {
  const gfp = new GramFramePage(page)
  await page.goto(PLAYER_PAGE)
  await gfp.waitForPlayerReady()
  return gfp
}

/**
 * Screen pixels per SVG unit, so a page-space drag can be converted into the
 * time change it should produce.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<number>} The scale factor
 */
async function svgScale(page) {
  return page.evaluate(() => {
    const svg = document.querySelector('.gram-frame-svg')
    return svg.getBoundingClientRect().width / svg.viewBox.baseVal.width
  })
}

test.describe('Pan drag on an audio-sourced gram', () => {
  test('the gram follows the drag vertically: dragging up goes back in time, dragging down returns', async ({ page }) => {
    const gfp = await gotoPlayer(page)

    // Park the playhead well inside the recording so there is room to scroll
    // back without hitting either clamp.
    await page.evaluate(() => window.GramFrame.getPlayer(0).seek(15))
    await gfp.waitForState(s => s.player.viewTop === 15, { message: 'seek to 15 s' })

    const state = await gfp.getState()
    expect(state.mode).toBe('pan')
    const { renderHeight } = state.imageDetails
    const { windowSeconds } = state.player
    const scale = await svgScale(page)

    const svgBox = await gfp.svg.boundingBox()
    const dragPx = 120
    const x = svgBox.x + state.margins.left + 200
    const yStart = svgBox.y + state.margins.top + 300

    // Expected magnitude: the drag in SVG units, as a fraction of the axes
    // height, is that fraction of the visible window in seconds.
    const expectedDelta = ((dragPx / scale) / renderHeight) * windowSeconds

    // Drag up — the gram follows the pointer up, so the top edge of the view
    // moves to an earlier time.
    await gfp.dragSVG(x, yStart, x, yStart - dragPx)
    const afterUp = (await gfp.getState()).player.viewTop
    expect(afterUp).toBeLessThan(15)
    expect(afterUp).toBeCloseTo(15 - expectedDelta, 1)

    // Drag back down — the same distance the other way returns to the playhead.
    await gfp.dragSVG(x, yStart - dragPx, x, yStart)
    const afterDown = (await gfp.getState()).player.viewTop
    expect(afterDown).toBeCloseTo(15, 1)
  })

  test('a downward drag past the playhead scrolls on into unplayed time, and clamps at the duration', async ({ page }) => {
    const gfp = await gotoPlayer(page)
    await page.evaluate(() => window.GramFrame.getPlayer(0).seek(15))
    await gfp.waitForState(s => s.player.viewTop === 15, { message: 'seek to 15 s' })

    const state = await gfp.getState()
    const svgBox = await gfp.svg.boundingBox()
    const x = svgBox.x + state.margins.left + 200
    const y = svgBox.y + state.margins.top + 150

    // Under spec 168 this held still: nothing above the playhead could come
    // into view. Spec 171 (FR-007) drew the whole recording from load, so the
    // drag scrolls on — and the direction is still the one the gram follows.
    await gfp.dragSVG(x, y, x, y + 120)
    const afterDown = (await gfp.getState()).player.viewTop
    expect(afterDown).toBeGreaterThan(15)
    expect(afterDown).toBeLessThan(20)

    // Dragged well past the end, it stops at the recording's duration
    for (let i = 0; i < 5; i++) {
      await gfp.dragSVG(x, y, x, y + 200)
    }
    expect((await gfp.getState()).player.viewTop).toBe(20)
    // The playhead has not moved: panning is a view action, not a transport one
    expect((await gfp.getState()).player.playhead).toBe(15)
  })
})
