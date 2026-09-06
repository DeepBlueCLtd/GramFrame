import { test, expect } from '@playwright/test'
import { GramFramePage } from './helpers/gram-frame-page.js'

/**
 * @fileoverview Time bookmarks on the transport's scrub track.
 *
 * A recording is listened to more than once, and the second pass is spent
 * hunting for the thing heard on the first. A bookmark writes that hunt down.
 *
 * They are playback chrome, not annotation: they carry no colour or symbol,
 * they are never saved with the gram's markers, and they exist only on an
 * audio-sourced instance. The last two are asserted here because getting either
 * wrong would put one analyst's listening notes into another's saved exercise.
 */

const PLAYER_PAGE = '/tests/fixtures/player-page.html'
const FLAG = '.gram-frame-transport-flag'

test.describe('Time bookmarks', () => {
  /** @type {GramFramePage} */
  let gfp

  test.beforeEach(async ({ page }) => {
    gfp = new GramFramePage(page)
    await page.goto(PLAYER_PAGE)
    await gfp.waitForPlayerReady()
  })

  test('the Bookmark button flags the playhead and draws a flag on the track', async ({ page }) => {
    await page.locator('.gram-frame-transport-seek').fill('5')
    await gfp.waitForState(s => s.player.playhead === 5, { message: 'seek to 5 s' })

    await page.locator('.gram-frame-transport-bookmark').click()
    await gfp.waitForState(s => s.bookmarks.length === 1, { message: 'one bookmark' })

    const state = await gfp.getState()
    expect(state.bookmarks[0].time).toBe(5)
    expect(state.bookmarks[0].label).toBe('1')

    await expect(page.locator(FLAG)).toHaveCount(1)
    await expect(page.locator('.gram-frame-transport-saved')).toHaveText('1 saved')
  })

  test('B does the same thing, so a bookmark can be made while listening', async ({ page }) => {
    await page.locator('.gram-frame-transport-seek').fill('8')
    await gfp.waitForState(s => s.player.playhead === 8, { message: 'seek to 8 s' })

    await page.locator('.gram-frame-container').click({ position: { x: 5, y: 5 } })
    await page.keyboard.press('b')
    await gfp.waitForState(s => s.bookmarks.length === 1, { message: 'one bookmark from the keyboard' })
    expect((await gfp.getState()).bookmarks[0].time).toBe(8)
  })

  test('flags are numbered left to right and sit where they point', async ({ page }) => {
    for (const at of ['15', '5']) {
      await page.locator('.gram-frame-transport-seek').fill(at)
      await gfp.waitForState(s => s.player.playhead === Number(at), { message: `seek to ${at} s` })
      await page.locator('.gram-frame-transport-bookmark').click()
    }
    await gfp.waitForState(s => s.bookmarks.length === 2, { message: 'two bookmarks' })

    // Made second-then-first in time order, but numbered in the order they are
    // read along the track.
    const state = await gfp.getState()
    expect(state.bookmarks.map((/** @type {any} */ b) => b.time)).toEqual([5, 15])
    expect(state.bookmarks.map((/** @type {any} */ b) => b.label)).toEqual(['1', '2'])

    const boxes = await page.locator(FLAG).evaluateAll(
      (flags) => flags.map((f) => f.getBoundingClientRect().x)
    )
    expect(boxes[0]).toBeLessThan(boxes[1])
  })

  test('a second press within a second of an existing flag is refused', async ({ page }) => {
    await page.locator('.gram-frame-transport-seek').fill('5')
    await gfp.waitForState(s => s.player.playhead === 5, { message: 'seek to 5 s' })

    await page.locator('.gram-frame-transport-bookmark').click()
    await gfp.waitForState(s => s.bookmarks.length === 1, { message: 'one bookmark' })
    await page.locator('.gram-frame-transport-bookmark').click()

    // A double press is far likelier to be a slip than a deliberate pair a
    // second apart.
    await expect(page.locator(FLAG)).toHaveCount(1)
    expect((await gfp.getState()).bookmarks).toHaveLength(1)
  })

  test('clicking a flag jumps to it, and the saved list can remove one', async ({ page }) => {
    await page.locator('.gram-frame-transport-seek').fill('12')
    await gfp.waitForState(s => s.player.playhead === 12, { message: 'seek to 12 s' })
    await page.locator('.gram-frame-transport-bookmark').click()
    await gfp.waitForState(s => s.bookmarks.length === 1, { message: 'one bookmark' })

    await page.locator('.gram-frame-transport-seek').fill('2')
    await gfp.waitForState(s => s.player.playhead === 2, { message: 'seek away' })

    await page.locator(FLAG).click()
    await gfp.waitForState(s => s.player.playhead === 12, { message: 'the jump back' })

    await page.locator('.gram-frame-transport-saved').click()
    await expect(page.locator('.gram-frame-transport-saved-jump')).toHaveText('1 · 00:12')
    await page.locator('.gram-frame-transport-saved-remove').click()
    await gfp.waitForState(s => s.bookmarks.length === 0, { message: 'the bookmark to go' })
    await expect(page.locator(FLAG)).toHaveCount(0)
  })

  test('bookmarks are not annotations: they are never saved with the gram', async ({ page }) => {
    await page.goto('/tests/fixtures/player-page.html')
    await page.evaluate(() => localStorage.clear())
    await page.goto(PLAYER_PAGE)
    await gfp.waitForPlayerReady()

    await page.locator('.gram-frame-transport-seek').fill('6')
    await gfp.waitForState(s => s.player.playhead === 6, { message: 'seek to 6 s' })
    await page.locator('.gram-frame-transport-bookmark').click()
    await gfp.waitForState(s => s.bookmarks.length === 1, { message: 'one bookmark' })

    const stored = await page.evaluate(() =>
      Object.keys(localStorage)
        .map((key) => localStorage.getItem(key) || '')
        .join('')
    )
    expect(stored).not.toContain('bookmark')

    await page.reload()
    await gfp.waitForPlayerReady()
    expect((await gfp.getState()).bookmarks).toHaveLength(0)
  })

  test('an image-backed gram has no transport and an empty bookmark list', async ({ page }) => {
    const imageGfp = new GramFramePage(page)
    await imageGfp.goto()
    await imageGfp.waitForImageDimensions()

    await expect(page.locator('.gram-frame-transport')).toHaveCount(0)
    expect((await imageGfp.getState()).bookmarks).toEqual([])
  })
})
