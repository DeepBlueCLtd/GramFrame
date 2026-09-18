import { test, expect } from '@playwright/test'
import { GramFramePage } from './helpers/gram-frame-page.js'

/**
 * @fileoverview Story 3 (spec 168): press play and the gram scrolls down
 * while the audio is heard, the newest row at the top.
 *
 * Spec 171 narrowed what "inert while playing" means: annotation interactions
 * still are (FR-017), but the gram can be dragged to seek (FR-015) and the
 * time axis zoomed (FR-018), so AS-3.5 below now asserts that split.
 *
 * Headless Chromium advances an <audio> element's clock without a sound
 * device; the play button is clicked (a user gesture) so autoplay policy
 * never intervenes.
 */

const PLAYER_PAGE = '/tests/fixtures/player-page.html'
const MARGINS = { left: 60, top: 15 }
const RENDER = { width: 900, height: 400 }
const DURATION = 20
const WINDOW = 5

/**
 * The image element's placement and the audio clock, read in one evaluate so
 * they are a single moment.
 * @param {import('@playwright/test').Page} page
 */
async function readGeometry(page) {
  return page.evaluate(() => {
    const instance = window.GramFrame.__test__getInstances()[0]
    const image = document.querySelector('.gram-frame-spectrogram-image')
    const clip = document.querySelector('.gram-frame-svg clipPath rect')
    return {
      y: parseFloat(image.getAttribute('y')),
      height: parseFloat(image.getAttribute('height')),
      clipY: parseFloat(clip.getAttribute('y')),
      currentTime: instance.player.audio.currentTime,
      playhead: instance.state.player.playhead,
      viewTop: instance.state.player.viewTop,
      paused: instance.player.audio.paused
    }
  })
}

/**
 * Open the fixture and press play.
 * @param {import('@playwright/test').Page} page
 */
async function gotoAndPlay(page) {
  const gfp = new GramFramePage(page)
  await page.goto(PLAYER_PAGE)
  await gfp.waitForPlayerReady()
  await page.locator('.gram-frame-transport-play').click()
  await gfp.waitForState(s => s.player.playing === true, { message: 'playback to start' })
  return gfp
}

test.describe('Story 3 — play: the gram scrolls while the audio is heard', () => {
  test('AS-3.1 / FR-010 / SC-003: while playing the top row is the playhead and the view follows it in real time', async ({ page }) => {
    const gfp = await gotoAndPlay(page)
    await gfp.waitForState(s => s.player.playhead > 1, { message: 'a second of audio to play' })

    const g = await readGeometry(page)
    expect(g.paused).toBe(false)
    // The view's top edge is the playhead (viewTop === playhead)
    expect(Math.abs(g.viewTop - g.playhead)).toBeLessThan(1e-6)
    // The image is placed so that time `playhead` sits on the axes' top edge:
    // y = top − (1 − playhead / D) · height. Within 100 ms of the audio clock
    // (SC-003): 100 ms is 8 px at 80 px/s.
    const expectedY = MARGINS.top - (1 - g.currentTime / DURATION) * g.height
    expect(Math.abs(g.y - expectedY)).toBeLessThan(8)
    expect(Math.abs(g.playhead - g.currentTime)).toBeLessThan(0.1)
    // The clip is the axes area: nothing is withheld ahead of the playhead any
    // more (spec 171, FR-005)
    expect(g.clipY).toBeCloseTo(MARGINS.top, 3)
    // Before a full window has played, the lower part of the view is blank:
    // the image's bottom edge (time 0) is above the axes' bottom edge
    expect(g.playhead).toBeLessThan(WINDOW)
    expect(g.y + g.height).toBeLessThan(MARGINS.top + RENDER.height)
  })

  test('AS-3.2: after more than a window has played the view shows exactly the last window and the axis labels move', async ({ page }) => {
    const gfp = await gotoAndPlay(page)
    // Jump most of the way there rather than waiting it out
    await page.evaluate(() => window.GramFrame.getPlayer(0).seek(5.5))
    await gfp.waitForState(s => s.player.playhead > 6, { message: 'the playhead to pass 6 s' })

    const g = await readGeometry(page)
    // Image bottom (time 0) is now below the axes area: the full window is painted
    expect(g.y + g.height).toBeGreaterThan(MARGINS.top + RENDER.height)
    const labels = await page.locator('.gram-frame-axis-label').allTextContents()
    expect(labels[0]).not.toBe('-00:05')
    expect(labels[labels.length - 1]).not.toBe('00:00')
    const state = await gfp.getState()
    expect(labels[labels.length - 1]).toBe(`00:${String(Math.floor(state.player.viewTop)).padStart(2, '0')}`)
  })

  test('SC-003: the view repaints at 30 frames per second or better', async ({ page }) => {
    await gotoAndPlay(page)
    const frames = await page.evaluate(() => new Promise(resolve => {
      const image = document.querySelector('.gram-frame-spectrogram-image')
      let last = image.getAttribute('y')
      let changes = 0
      const start = performance.now()
      function tick() {
        const now = image.getAttribute('y')
        if (now !== last) { changes++; last = now }
        if (performance.now() - start < 1000) requestAnimationFrame(tick)
        else resolve(changes)
      }
      requestAnimationFrame(tick)
    }))
    expect(frames).toBeGreaterThanOrEqual(30)
  })

  test('AS-3.3: at the end playback stops, the view stays on the final window and the transport shows stopped', async ({ page }) => {
    const gfp = new GramFramePage(page)
    await page.goto(PLAYER_PAGE)
    await gfp.waitForPlayerReady()
    await page.evaluate(() => window.GramFrame.getPlayer(0).seek(19.4))
    await page.locator('.gram-frame-transport-play').click()
    await gfp.waitForState(s => s.player.ended === true, { timeout: 10000, message: 'the recording to end' })

    const state = await gfp.getState()
    expect(state.player.playing).toBe(false)
    expect(state.player.playhead).toBeCloseTo(DURATION, 1)
    expect(state.player.viewTop).toBeCloseTo(DURATION, 1)
    await expect(page.locator('.gram-frame-transport-play')).toHaveAttribute('aria-pressed', 'false')
    await expect(page.locator('.gram-frame-transport-time')).toHaveText('00:20')
    await expect(page.locator('.gram-frame-transport-duration')).toHaveText('00:20')
  })

  test('AS-3.4: hover readouts stay live during playback', async ({ page }) => {
    const gfp = await gotoAndPlay(page)
    // The centre of the axes area shows `viewTop - WINDOW/2`, and while playing
    // `viewTop` is the playhead — so that row is only part of the recording once
    // more than half a window has played. Waiting for 2s of a 5s window aimed at
    // -0.5s..0s, before the recording starts, where the component correctly
    // reports nothing and `cursorPosition` is null: the readout poll then timed
    // out and the run was called flaky (issue #304). Waiting past WINDOW/2 aims
    // at a row that exists. The margin covers the playhead advancing between the
    // wait and the hover.
    await gfp.waitForState(s => s.player.playhead > WINDOW / 2 + 1, {
      message: `past half a window (${WINDOW / 2}s), so the centre row exists`
    })
    // Hover the centre of the axes area: 1500 Hz, and a time inside the window
    const reading = await gfp.readDataAtPixel(MARGINS.left + RENDER.width / 2, MARGINS.top + RENDER.height / 2)
    expect(reading).not.toBeNull()
    expect(reading.freq).toBeCloseTo(1500, 0)
    const state = await gfp.getState()
    expect(reading.time).toBeLessThan(state.player.playhead)
    expect(reading.time).toBeGreaterThan(state.player.playhead - WINDOW)
    expect(state.player.playing).toBe(true)
  })

  test('AS-3.5 / spec 171 FR-017: while playing, annotation is inert and the cursor offers the drag instead', async ({ page }) => {
    const gfp = await gotoAndPlay(page)
    await gfp.waitForState(s => s.player.playhead > 1.5, { message: 'audio to play' })

    // The cursor is the open hand while playing: the gram can be dragged, not
    // annotated. Read before the click, which pauses (spec 171, FR-028).
    await gfp.clickMode('Cross Cursor')
    await expect(page.locator('.gram-frame-container')).toHaveClass(/gram-frame-playing/)
    const cursor = await gfp.svg.evaluate(el => window.getComputedStyle(el).cursor)
    expect(cursor).toBe('grab')

    // A click that would place a marker places nothing: the click is the
    // transport's while playing, so it pauses instead (FR-028).
    await gfp.svg.click({ position: { x: MARGINS.left + 300, y: MARGINS.top + 200 } })
    await gfp.waitForState(s => s.player.playing === false, { message: 'the click to pause' })
    await expect(page.locator('.gram-frame-analysis-marker')).toHaveCount(0)
    expect((await gfp.getState()).analysis.markers.length).toBe(0)
  })

  test('AS-3.6 / FR-015: two players on one page play independently', async ({ page }) => {
    await page.goto('/tests/fixtures/player-two-page.html')
    await page.waitForFunction(() => {
      const instances = window.GramFrame.__test__getInstances()
      return instances.length === 2 && instances.every(i => i.state.player.ready)
    }, null, { timeout: 15000 })

    await page.locator('.gram-frame-transport-play').first().click()
    await page.waitForFunction(() => window.GramFrame.__test__getInstances()[0].state.player.playhead > 0.5)

    const snapshot = await page.evaluate(() => window.GramFrame.__test__getInstances().map(i => ({
      playing: i.state.player.playing,
      playhead: i.state.player.playhead,
      windowSeconds: i.state.player.windowSeconds,
      freqMax: i.state.config.freqMax
    })))
    expect(snapshot[0].playing).toBe(true)
    expect(snapshot[1].playing).toBe(false)
    expect(snapshot[1].playhead).toBe(0)
    expect(snapshot[0].windowSeconds).toBe(5)
    expect(snapshot[1].windowSeconds).toBe(4)
    expect(snapshot[1].freqMax).toBe(2000)
  })
})
