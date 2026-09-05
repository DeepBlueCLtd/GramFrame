import { test, expect } from '@playwright/test'
import { GramFramePage } from './helpers/gram-frame-page.js'

/**
 * @fileoverview Story 5 (spec 168): the full transport — every control, its
 * keyboard binding, the public API, and the autoplay refusal.
 */

const PLAYER_PAGE = '/tests/fixtures/player-page.html'
const MARGINS = { left: 60, top: 15 }
const RENDER = { height: 400 }

/**
 * @param {import('@playwright/test').Page} page
 */
async function readAudio(page) {
  return page.evaluate(() => {
    const audio = window.GramFrame.getPlayer(0).audio
    return { currentTime: audio.currentTime, paused: audio.paused, loop: audio.loop, playbackRate: audio.playbackRate, volume: audio.volume, muted: audio.muted }
  })
}

test.describe('Story 5 — full transport', () => {
  test('FR-020: every control drives the audio element and the view follows', async ({ page }) => {
    const gfp = new GramFramePage(page)
    await page.goto(PLAYER_PAGE)
    await gfp.waitForPlayerReady()

    // Seek by the slider, while paused: the view moves, playback does not start
    await page.locator('.gram-frame-transport-seek').fill('12')
    await gfp.waitForState(s => s.player.playhead === 12 && s.player.viewTop === 12, { message: 'seek to 12 s' })
    expect((await readAudio(page)).paused).toBe(true)
    await expect(page.locator('.gram-frame-transport-time')).toHaveText('00:12 / 00:20')

    // Loop, rate, mute, volume
    await page.locator('.gram-frame-transport-loop').click()
    await page.locator('.gram-frame-transport-rate').selectOption('2')
    await page.locator('.gram-frame-transport-mute').click()
    await page.locator('.gram-frame-transport-volume').fill('0.4')
    await gfp.waitForState(s => s.player.loop && s.player.rate === 2 && s.player.muted && Math.abs(s.player.volume - 0.4) < 1e-6, { message: 'state to mirror the controls' })
    const audio = await readAudio(page)
    expect(audio.loop).toBe(true)
    expect(audio.playbackRate).toBe(2)
    expect(audio.muted).toBe(true)
    expect(audio.volume).toBeCloseTo(0.4, 6)
    await expect(page.locator('.gram-frame-transport-loop')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.gram-frame-transport-mute')).toHaveAttribute('aria-pressed', 'true')

    // AS-5.5: muted, at 2×, the gram still scrolls
    await page.locator('.gram-frame-transport-play').click()
    await gfp.waitForState(s => s.player.playing && s.player.playhead > 12.5, { message: 'muted playback to advance' })

    // Restart while playing keeps playing from 0
    await page.locator('.gram-frame-transport-restart').click()
    await gfp.waitForState(s => s.player.playing && s.player.playhead < 2, { message: 'restart' })
    await page.locator('.gram-frame-transport-play').click()
    await gfp.waitForState(s => !s.player.playing, { message: 'pause' })
  })

  test('AS-5.1: seeking forward past what has played reveals rows up to the target', async ({ page }) => {
    const gfp = new GramFramePage(page)
    await page.goto(PLAYER_PAGE)
    await gfp.waitForPlayerReady()
    await page.evaluate(() => window.GramFrame.getPlayer(0).seek(15))
    await gfp.waitForState(s => s.player.viewTop === 15, { message: 'seek to 15 s' })
    const clip = await page.evaluate(() => {
      const rect = document.querySelector('.gram-frame-svg clipPath rect')
      return { y: parseFloat(rect.getAttribute('y')), height: parseFloat(rect.getAttribute('height')) }
    })
    // Rows up to 15 s are inside the clip: the whole axes area
    expect(clip.y).toBeCloseTo(MARGINS.top, 3)
    expect(clip.height).toBeCloseTo(RENDER.height, 3)
  })

  test('AS-5.3 / FR-022: at 2× the readouts still report the recording\'s true frequencies', async ({ page }) => {
    const gfp = new GramFramePage(page)
    await page.goto(PLAYER_PAGE)
    await gfp.waitForPlayerReady()
    await page.evaluate(() => window.GramFrame.getPlayer(0).seek(10))
    // About 300 Hz (hover positions are padding-box relative; the SVG's border
    // shifts them by a couple of pixels, which is a few hertz here)
    const before = await gfp.readDataAtPixel(MARGINS.left + 90, MARGINS.top + 100)
    await page.evaluate(() => window.GramFrame.getPlayer(0).setRate(2))
    await gfp.waitForState(s => s.player.rate === 2, { message: 'rate 2×' })
    const after = await gfp.readDataAtPixel(MARGINS.left + 90, MARGINS.top + 101)
    expect(Math.abs(before.freq - 300)).toBeLessThan(10)
    expect(Math.abs(after.freq - before.freq)).toBeLessThan(0.5)
  })

  test('FR-020: a click on the time axis seeks to that time', async ({ page }) => {
    const gfp = new GramFramePage(page)
    await page.goto(PLAYER_PAGE)
    await gfp.waitForPlayerReady()
    await page.evaluate(() => window.GramFrame.getPlayer(0).seek(10))
    await gfp.waitForState(s => s.player.viewTop === 10, { message: 'seek to 10 s' })
    // Halfway down the axis band: 10 − 2.5 = 7.5 s
    await gfp.svg.click({ position: { x: 20, y: MARGINS.top + RENDER.height / 2 } })
    await gfp.waitForState(s => Math.abs(s.player.playhead - 7.5) < 0.05, { message: 'axis click to seek to 7.5 s' })
  })

  test('D13 / FR-021: transport keys act on a focused audio instance, and arrow keys still nudge a selected marker', async ({ page }) => {
    const gfp = new GramFramePage(page)
    await page.goto(PLAYER_PAGE)
    await gfp.waitForPlayerReady()
    await page.evaluate(() => window.GramFrame.getPlayer(0).seek(10))
    await gfp.waitForState(s => s.player.viewTop === 10, { message: 'seek to 10 s' })

    // Place and select a marker, which also focuses the instance
    await gfp.clickMode('Cross Cursor')
    await gfp.svg.click({ position: { x: MARGINS.left + 300, y: MARGINS.top + 200 } })
    await gfp.waitForMarkerCount(1)
    const markerId = (await gfp.getState()).analysis.markers[0].id
    await page.evaluate(id => {
      window.GramFrame.__test__getInstances()[0].interaction.setSelection('marker', id, 0)
    }, markerId)
    await gfp.waitForSelectedRow('markers', markerId)
    const before = (await gfp.getState()).analysis.markers[0]

    // Arrow: nudges the marker, does not seek
    await page.keyboard.press('ArrowRight')
    await gfp.waitForState(s => s.analysis.markers[0].freq > before.freq, { message: 'the marker to nudge right' })
    expect((await gfp.getState()).player.playhead).toBe(10)

    // J / L / Shift+L / Home seek; M mutes; Space plays and pauses
    await page.keyboard.press('j')
    await gfp.waitForState(s => s.player.playhead === 5, { message: 'J to seek −5 s' })
    await page.keyboard.press('l')
    await gfp.waitForState(s => s.player.playhead === 10, { message: 'L to seek +5 s' })
    await page.keyboard.press('Shift+L')
    await gfp.waitForState(s => s.player.playhead === 20, { message: 'Shift+L to seek +30 s (clamped)' })
    await page.keyboard.press('Home')
    await gfp.waitForState(s => s.player.playhead === 0, { message: 'Home to restart' })
    await page.keyboard.press('m')
    await gfp.waitForState(s => s.player.muted, { message: 'M to mute' })
    await page.keyboard.press('Space')
    await gfp.waitForState(s => s.player.playing, { message: 'Space to play' })
    // While playing the arrow key is inert
    const during = (await gfp.getState()).analysis.markers[0]
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Space')
    await gfp.waitForState(s => !s.player.playing, { message: 'Space to pause' })
    expect((await gfp.getState()).analysis.markers[0].freq).toBe(during.freq)
  })

  test('FR-021: on an image-backed instance the transport keys change nothing', async ({ page }) => {
    // The standard debug page: focus the instance and press every transport key
    const gramFramePage = new GramFramePage(page)
    await gramFramePage.goto()
    await gramFramePage.svg.click({ position: { x: 200, y: 100 } })
    const before = await gramFramePage.getState()
    for (const key of ['Space', 'k', 'j', 'l', 'Home', 'm']) {
      await page.keyboard.press(key)
    }
    const after = await gramFramePage.getState()
    expect(after.player).toEqual(before.player)
    expect(after.zoom).toEqual(before.zoom)
    expect(await page.evaluate(() => window.GramFrame.getPlayer(0))).toBeNull()
  })

  test('D14: GramFrame.getPlayer returns the controller for an audio instance and null otherwise', async ({ page }) => {
    const gfp = new GramFramePage(page)
    await page.goto(PLAYER_PAGE)
    await gfp.waitForPlayerReady()
    const shape = await page.evaluate(() => {
      const player = window.GramFrame.getPlayer(0)
      return {
        methods: ['play', 'pause', 'toggle', 'seek', 'restart', 'setLoop', 'setRate', 'setVolume', 'setMute', 'isReady'].every(m => typeof player[m] === 'function'),
        ready: player.isReady(),
        second: window.GramFrame.getPlayer(1)
      }
    })
    expect(shape.methods).toBe(true)
    expect(shape.ready).toBe(true)
    expect(shape.second).toBeNull()
  })
})
