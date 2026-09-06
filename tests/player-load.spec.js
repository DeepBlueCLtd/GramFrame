import { test, expect } from '@playwright/test'
import { GramFramePage } from './helpers/gram-frame-page.js'

/**
 * @fileoverview Story 2 (spec 168): an audio-sourced GramFrame instance
 * decodes and analyses its WAV and shows it with the configured axes.
 *
 * Spec 171 (US1) withdrew the reveal rule this story used to end on: the gram
 * is drawn for the whole recording from the moment it is analysed, so the
 * opening view is the recording's first window rather than the blank above its
 * start.
 */

const PLAYER_PAGE = '/tests/fixtures/player-page.html'

test.describe('Story 2 — an audio-sourced instance renders a gram', () => {
  test('AS-2.1/2.2: the instance becomes ready with the configured analysis parameters in state', async ({ page }) => {
    const gfp = new GramFramePage(page)
    await page.goto(PLAYER_PAGE)
    await gfp.waitForPlayerReady()

    const state = await gfp.getState()
    expect(state.player.active).toBe(true)
    expect(state.player.ready).toBe(true)
    expect(state.player.progress).toBe(1)
    expect(state.player.duration).toBeCloseTo(20, 3)
    expect(state.player.sampleRate).toBe(8000)
    expect(state.player.channels).toBe(1)
    expect(state.player.windowSeconds).toBe(5)
    expect(state.player.analysis.fftSize).toBe(1024)
    expect(state.player.analysis.hopSize).toBe(512)
    expect(state.player.analysis.freqStart).toBe(0)
    expect(state.player.analysis.freqEnd).toBeCloseTo(3000, 3)
    // 3000 Hz at 7.8125 Hz/bin → bins 0..384 = 385 columns; (160000-1024)/512+1 frames
    expect(state.player.analysis.columns).toBe(385)
    expect(state.player.analysis.frames).toBe(311)
    expect(state.imageDetails.naturalWidth).toBe(385)
    expect(state.imageDetails.naturalHeight).toBe(311)
    expect(state.imageDetails.timeStretch).toBeCloseTo(4, 6)
    expect(state.config).toEqual({ timeMin: 0, timeMax: 20, freqMin: 0, freqMax: 3000 })
    expect(state.player.playhead).toBe(0)
    expect(state.player.playing).toBe(false)
    // The opening view is the recording's first window (spec 171, FR-005),
    // and the pitch behaviour is stated rather than inherited (FR-021)
    expect(state.player.viewTop).toBe(5)
    expect(state.player.preservesPitch).toBe(true)
    expect(state.player.degraded).toBeNull()
  })

  test('spec 171 AS-1.1 / FR-005: before play the first window of the gram is drawn and the time axis reads [0, window]', async ({ page }) => {
    const gfp = new GramFramePage(page)
    await page.goto(PLAYER_PAGE)
    await gfp.waitForPlayerReady()

    // The image element carries the painted gram but sits entirely above the
    // axes area (its bottom edge is time 0, at the view's top edge).
    const geometry = await page.evaluate(() => {
      const image = document.querySelector('.gram-frame-spectrogram-image')
      const clip = document.querySelector('.gram-frame-svg clipPath rect')
      return {
        href: (image.getAttribute('href') || image.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || '').slice(0, 14),
        y: parseFloat(image.getAttribute('y')),
        height: parseFloat(image.getAttribute('height')),
        clipY: parseFloat(clip.getAttribute('y')),
        clipHeight: parseFloat(clip.getAttribute('height'))
      }
    })
    expect(geometry.href).toBe('data:image/png')
    // 400 px axes × stretch 4 = 1600 px tall. The view's top edge is 5 s (one
    // window), so the image's bottom edge — time 0 — sits on the axes' bottom
    // edge and the first window fills the area.
    expect(geometry.height).toBeCloseTo(1600, 3)
    expect(geometry.y + geometry.height).toBeCloseTo(15 + 400, 3)
    // The clip is the axes area and nothing less: nothing is withheld until it
    // has been played (spec 171, FR-005)
    expect(geometry.clipY).toBeCloseTo(15, 3)
    expect(geometry.clipHeight).toBeCloseTo(400, 3)

    const labels = await page.locator('.gram-frame-axis-label').allTextContents()
    expect(labels[0]).toBe('00:00')
    expect(labels[labels.length - 1]).toBe('00:05')

    // Frequency axis still shows the configured range
    const freqLabels = await page.locator('.gram-frame-axis-label-major').allTextContents()
    expect(freqLabels[0]).toBe('0Hz')
    expect(freqLabels[freqLabels.length - 1]).toBe('3000Hz')
  })
})

test.describe('Story 2 — sample delivery and failure paths', () => {
  test('D2: when fetch fails the sidecar .wav.js supplies the samples', async ({ page }) => {
    const gfp = new GramFramePage(page)
    /** @type {string[]} */
    const warnings = []
    page.on('console', message => { if (message.type() === 'warning') warnings.push(message.text()) })
    await page.goto('/tests/fixtures/player-sidecar-page.html')
    await gfp.waitForPlayerReady()

    const state = await gfp.getState()
    expect(state.player.duration).toBeCloseTo(20, 3)
    expect(warnings.some(text => /fetch of .*sidecar-only\/tone-20s\.wav .*; trying the sidecar/.test(text))).toBe(true)
    // The injected script has been removed again once read
    expect(await page.locator('script[src$="tone-20s.wav.js"]').count()).toBe(0)
  })

  test('AS-2.4 / FR-007: a bad file, a missing file and an oversize gram each show the error indicator; the healthy instance beside them is unaffected', async ({ page }) => {
    const gfp = new GramFramePage(page)
    await page.goto('/tests/fixtures/player-bad-page.html')
    // The healthy (fourth) table becomes the only live instance
    await gfp.waitForPlayerReady()
    await expect(page.locator('.gramframe-error-indicator')).toHaveCount(3)

    const indicators = await page.locator('.gramframe-error-indicator').allTextContents()
    expect(indicators[0]).toMatch(/Not a WAV file/)
    expect(indicators[1]).toMatch(/does-not-exist\.wav/)
    // fft-size 8192 over an 8 kHz file retains 4097 bins, one past the column
    // cap. A gram too *tall* is no longer refused (spec 171, FR-023); a gram
    // too wide still is, because no hop rescues it (FR-025).
    expect(indicators[2]).toMatch(/4097 columns.*fft-size/s)

    // Each failed table is back on the page, marked, with its indicator beside it
    for (const id of ['not-a-wav', 'missing', 'oversize']) {
      await expect(page.locator(`table#${id}`)).toHaveClass(/gram-frame-config-error/)
      await expect(page.locator(`table#${id} + .gramframe-error-indicator`)).toHaveCount(1)
    }
    await expect(page.locator('table#healthy')).toHaveCount(0)
    await expect(page.locator('.gram-frame-container')).toHaveCount(1)

    const live = await page.evaluate(() => window.GramFrame.__test__getInstances().map(i => i.state.player.ready))
    expect(live).toEqual([true])
  })

  test('AS-2.5 / FR-008: without <audio> support the compatibility warning is shown and nothing is decoded', async ({ page }) => {
    await page.goto('/tests/fixtures/legacy-audio-page.html')
    await expect(page.locator('.gram-frame-compat-warning')).toHaveCount(1)
    await expect(page.locator('.gram-frame-container')).toHaveCount(0)
    await expect(page.locator('.gramframe-error-indicator')).toHaveCount(0)
  })

  test('config: time-start/time-end on an audio table are ignored with a warning; freq-end above Nyquist is clamped', async ({ page }) => {
    /** @type {string[]} */
    const warnings = []
    page.on('console', message => { if (message.type() === 'warning') warnings.push(message.text()) })
    await page.goto('/tests/fixtures/player-config-page.html')
    const gfp = new GramFramePage(page)
    await gfp.waitForPlayerReady()
    const state = await gfp.getState()
    expect(state.config.timeMax).toBeCloseTo(20, 3)
    expect(state.config.freqMax).toBe(4000)
    expect(state.player.analysis.freqEnd).toBe(4000)
    expect(warnings.some(t => /time-start\/time-end are ignored/.test(t))).toBe(true)
    expect(warnings.some(t => /freq-end 9000 Hz is above .* Nyquist .* clamped to 4000 Hz/.test(t))).toBe(true)
  })
})
