import { test, expect } from '@playwright/test'
import { GramFramePage } from './helpers/gram-frame-page.js'

/**
 * Acceptance tests for feature 170, US4 — region zoom on an audio-sourced gram.
 *
 * A player's vertical axis is a time window (`player.viewTop` plus
 * `windowSeconds`), not a normalised centre, so this is a separate code path
 * from the image one in `tests/region-zoom.spec.js` — with its own clamp
 * against time that has not been played.
 */

const PLAYER_PAGE = '/tests/fixtures/player-page.html'
const BOX = '.gram-frame-region-box'

/**
 * A point at the given fraction of the *visible* area, in SVG-relative page
 * pixels.
 *
 * `imageSVGPoint` cannot serve here: a player's image is the whole recording,
 * drawn several times the height of the axes and scrolled, so a fraction of the
 * image element is nowhere near the same fraction of the view.
 * @param {GramFramePage} gfp - The page helper
 * @param {number} fx - Fraction across the axes area
 * @param {number} fy - Fraction down the axes area
 * @returns {Promise<{x: number, y: number}>} Point relative to the SVG element
 */
async function viewPoint(gfp, fx, fy) {
  const scale = await gfp.page.evaluate(() => {
    const svg = /** @type {SVGSVGElement|null} */ (document.querySelector('.gram-frame-svg'))
    if (!svg) {
      throw new Error('viewPoint: the component is not on the page')
    }
    return svg.getBoundingClientRect().width / svg.viewBox.baseVal.width
  })
  const { margins } = await gfp.getState()
  const { renderWidth, renderHeight } = await gfp.renderSize()
  return {
    x: (margins.left + fx * renderWidth) * scale,
    y: (margins.top + fy * renderHeight) * scale
  }
}

/**
 * Move the playhead, so a paused view sits well inside the recording.
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {number} seconds - Where to seek to
 * @returns {Promise<void>} Resolves once the seek has been issued
 */
async function seekTo(page, seconds) {
  await page.evaluate((to) => {
    const player = window.GramFrame.getPlayer(0)
    if (!player) {
      throw new Error('seekTo: the player is not ready')
    }
    player.seek(to)
  }, seconds)
}

/**
 * Open the player fixture, ready and paused.
 * @param {import('@playwright/test').Page} page - Playwright page
 * @returns {Promise<GramFramePage>} The ready player page helper
 */
async function gotoPlayer(page) {
  const gfp = new GramFramePage(page)
  await page.goto(PLAYER_PAGE)
  await gfp.waitForPlayerReady()
  // `player.ready` is published from the analysis step; the transport
  // controller these tests seek with is attached in the same breath. Waiting
  // for the controller itself rather than for the flag is what makes a seek
  // straight after load reliable under a loaded suite.
  await page.waitForFunction(() => !!window.GramFrame.getPlayer(0))
  return gfp
}

test.describe('Feature 170 US4 — Region zoom on a paused recording', () => {
  test('the window and the frequency range match the selection (AS-4.1)', async ({ page }) => {
    const gfp = await gotoPlayer(page)
    await seekTo(page, 15)
    await gfp.waitForState(s => s.player.viewTop === 15, { message: 'seek to 15 s' })

    const before = await gfp.getState()
    const { windowSeconds } = before.player
    expect(before.zoom.level).toBe(1.0)

    // The middle half of the view, vertically and horizontally.
    const a = await viewPoint(gfp, 0.25, 0.25)
    const b = await viewPoint(gfp, 0.75, 0.75)
    await gfp.shiftDragSVG(a.x, a.y, b.x, b.y)

    const after = await gfp.getState()
    // Half the view in each direction is a 2x zoom, so the window halves...
    expect(after.zoom.level).toBeCloseTo(2, 1)
    expect(windowSeconds / after.zoom.level).toBeCloseTo(windowSeconds / 2, 2)
    // ...and it sits over the selected span, a quarter of a window later than
    // the view's own middle: viewTop moves down from 15 s by 25% of a window.
    expect(after.player.viewTop).toBeLessThan(15)
    expect(after.player.viewTop).toBeCloseTo(15 - windowSeconds * 0.25, 1)
    // The frequency axis narrows as it does on an image.
    expect(after.zoom.centerX).toBeGreaterThan(0)
    expect(after.zoom.centerX).toBeLessThan(1)
  })

  test('a region at the playhead zooms to it rather than being clamped back (spec 171, FR-004)', async ({ page }) => {
    const gfp = await gotoPlayer(page)
    await seekTo(page, 6)
    await gfp.waitForState(s => s.player.viewTop === 6, { message: 'seek to 6 s' })

    // Select the top strip of the view — the newest time, right at the
    // playhead. Spec 170's FR-013 clamped the resulting view back below the
    // playhead; with the reveal rule withdrawn there is nothing to clamp
    // against but the recording's own end.
    const a = await viewPoint(gfp, 0.2, 0.02)
    const b = await viewPoint(gfp, 0.8, 0.25)
    await gfp.shiftDragSVG(a.x, a.y, b.x, b.y)

    const after = await gfp.getState()
    expect(after.zoom.level).toBeGreaterThan(1)
    // The strip's own span is centred, so the view's top edge lands above the
    // playhead — and never past the end of the recording.
    expect(after.player.viewTop).toBeGreaterThan(after.player.playhead)
    expect(after.player.viewTop).toBeLessThanOrEqual(after.player.duration)
  })

  test('Fit returns the configured window, still inside the recording (AS-3.3)', async ({ page }) => {
    const gfp = await gotoPlayer(page)
    await seekTo(page, 15)
    await gfp.waitForState(s => s.player.viewTop === 15, { message: 'seek to 15 s' })

    await gfp.setZoom(4.0, 0.3, 0.5)
    await gfp.commandButton('Fit Whole Gram').click()
    await gfp.waitForZoomLevel(1.0)

    const state = await gfp.getState()
    expect(state.zoom.level).toBe(1.0)
    expect(state.player.viewTop).toBeLessThanOrEqual(state.player.duration + 1e-9)
  })

  test('the gesture is still inert while the recording plays: shift declines the drag-seek too (AS-4.3, FR-012)', async ({ page }) => {
    const gfp = await gotoPlayer(page)
    await page.locator('.gram-frame-transport-play').click()
    await gfp.waitForState(s => s.player.playing, { message: 'playback to start' })

    const before = await gfp.getState()
    const a = await viewPoint(gfp, 0.25, 0.3)
    const b = await viewPoint(gfp, 0.75, 0.8)
    await gfp.shiftDragSVG(a.x, a.y, b.x, b.y)

    await expect(page.locator(BOX)).toHaveCount(0)
    const after = await gfp.getState()
    expect(after.zoom.level).toBe(before.zoom.level)
    // And the shift-drag did not become a seek either (spec 171 leaves region
    // zoom while playing out on purpose)
    expect(after.player.playing).toBe(true)
  })
})
