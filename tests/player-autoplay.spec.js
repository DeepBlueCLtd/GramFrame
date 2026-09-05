import { test, expect } from '@playwright/test'
import { GramFramePage } from './helpers/gram-frame-page.js'

/**
 * @fileoverview FR-023 (spec 168): playback never starts without a user
 * gesture, and an API `play()` the browser refuses reports the failure
 * rather than doing nothing.
 *
 * Playwright's headless Chromium permits autoplay whatever policy flag it is
 * launched with, so the browser's own refusal cannot be provoked here. The
 * refusal is a rejected promise from `HTMLMediaElement.play()`; the second
 * test injects exactly that and checks it reaches the caller untouched.
 */

const PLAYER_PAGE = '/tests/fixtures/player-page.html'

test('the player never starts on its own: ready, paused, at 0', async ({ page }) => {
  const gfp = new GramFramePage(page)
  await page.goto(PLAYER_PAGE)
  await gfp.waitForPlayerReady()
  const state = await gfp.getState()
  expect(state.player.playing).toBe(false)
  expect(state.player.playhead).toBe(0)
  expect(await page.evaluate(() => window.GramFrame.getPlayer(0).audio.paused)).toBe(true)
})

test('an autoplay refusal from the element rejects the API play() with NotAllowedError', async ({ page }) => {
  const gfp = new GramFramePage(page)
  await page.goto(PLAYER_PAGE)
  await gfp.waitForPlayerReady()
  const outcome = await page.evaluate(() => {
    const player = window.GramFrame.getPlayer(0)
    player.audio.play = () => Promise.reject(new DOMException('play() failed because the user didn\'t interact with the document first.', 'NotAllowedError'))
    return player.play().then(() => 'resolved', e => e.name)
  })
  expect(outcome).toBe('NotAllowedError')
  expect((await gfp.getState()).player.playing).toBe(false)
})

test('the transport bar reports a refusal as a console warning and stays stopped', async ({ page }) => {
  const gfp = new GramFramePage(page)
  /** @type {string[]} */
  const warnings = []
  page.on('console', m => { if (m.type() === 'warning') warnings.push(m.text()) })
  await page.goto(PLAYER_PAGE)
  await gfp.waitForPlayerReady()
  await page.evaluate(() => {
    const player = window.GramFrame.getPlayer(0)
    player.audio.play = () => Promise.reject(new DOMException('refused', 'NotAllowedError'))
  })
  await page.locator('.gram-frame-transport-play').click()
  await expect.poll(() => warnings.some(w => /playback could not start/.test(w))).toBe(true)
  expect((await gfp.getState()).player.playing).toBe(false)
  await expect(page.locator('.gram-frame-transport-play')).toHaveAttribute('aria-pressed', 'false')
})
