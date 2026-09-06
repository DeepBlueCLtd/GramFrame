import { test, expect } from '@playwright/test'
import { GramFramePage } from './helpers/gram-frame-page.js'

/**
 * @fileoverview Spec 171 — the refinements the 169 survey's decided
 * recommendations asked for, on top of the player spec 168 shipped.
 *
 * Story 1 (the whole gram from load) is covered where it changed behaviour
 * already under test — `player-load`, `player-annotations`, `player-pan`,
 * `player-region-zoom` — so what is here is Stories 2 to 6: contrast, moving
 * around a playing recording, the rate ladder and pitch, an oversize recording
 * that loads anyway, and what a screen reader is told.
 */

const PLAYER_PAGE = '/tests/fixtures/player-page.html'
const DEGRADED_PAGE = '/tests/fixtures/player-degraded-page.html'
const IMAGE_PAGE = '/debug.html'
const MARGINS = { left: 60, top: 15 }
const RENDER = { width: 900, height: 400 }

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
 * Move one of the contrast sliders and let the change land.
 * @param {import('@playwright/test').Page} page - The page
 * @param {'floor'|'ceiling'} which - Which control
 * @param {number} value - 0..1
 * @returns {Promise<void>}
 */
async function setContrast(page, which, value) {
  await page.evaluate(({ selector, next }) => {
    const input = /** @type {HTMLInputElement|null} */ (document.querySelector(selector))
    if (!input) throw new Error(`no ${selector}`)
    input.value = String(next)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }, { selector: `.gram-frame-display-${which} input`, next: value })
}

test.describe('Story 2 — contrast: bringing a faint tonal out of the background', () => {
  test('AS-2.1 / AS-2.2 / FR-010: moving either control re-maps the drawn levels live', async ({ page }) => {
    await gotoPlayer(page)
    const image = page.locator('.gram-frame-spectrogram-image')

    // At rest the image is drawn exactly as it loaded: no filter at all
    await expect(image).not.toHaveAttribute('filter', /./)

    await setContrast(page, 'floor', 0.4)
    const raised = await image.getAttribute('filter')
    expect(raised).toMatch(/^url\(#gramDisplay-/)
    const afterFloor = await page.evaluate(() => {
      const func = document.querySelector('.gram-frame-display-filter feComponentTransfer > *')
      return { slope: Number(func?.getAttribute('slope')), intercept: Number(func?.getAttribute('intercept')) }
    })
    // Everything under the floor renders as background, and what is left is
    // spread across the whole colour map
    expect(afterFloor.slope).toBeGreaterThan(1)
    expect(afterFloor.slope * 0.4 + afterFloor.intercept).toBeCloseTo(0, 6)

    await setContrast(page, 'ceiling', 0.7)
    const afterCeiling = await page.evaluate(() => {
      const func = document.querySelector('.gram-frame-display-filter feComponentTransfer > *')
      return { slope: Number(func?.getAttribute('slope')), intercept: Number(func?.getAttribute('intercept')) }
    })
    expect(afterCeiling.slope).toBeGreaterThan(afterFloor.slope)
    expect(afterCeiling.slope * 0.7 + afterCeiling.intercept).toBeCloseTo(1, 6)
  })

  test('AS-2.3 / FR-011 / SC-003: the readouts and the annotations are untouched by any setting', async ({ page }) => {
    const gfp = await gotoPlayer(page)
    await gfp.clickMode('Cross Cursor')
    await gfp.svg.click({ position: { x: MARGINS.left + 300, y: MARGINS.top + 200 } })
    await gfp.waitForMarkerCount(1)
    const before = (await gfp.getState()).analysis.markers[0]

    const readingBefore = await gfp.readDataAtPixel(MARGINS.left + 450, MARGINS.top + 120)

    for (const [which, value] of /** @type {Array<['floor'|'ceiling', number]>} */ ([['floor', 0.35], ['ceiling', 0.6], ['floor', 0.05]])) {
      await setContrast(page, which, value)
      const reading = await gfp.readDataAtPixel(MARGINS.left + 450, MARGINS.top + 120)
      if (!reading || !readingBefore) throw new Error('the readout must be live over the gram')
      expect(reading.freq).toBe(readingBefore.freq)
      expect(reading.time).toBe(readingBefore.time)
    }

    const after = (await gfp.getState()).analysis.markers[0]
    expect(after.time).toBe(before.time)
    expect(after.freq).toBe(before.freq)
    await expect(page.locator('.gram-frame-analysis-marker')).toHaveCount(1)
  })

  test('FR-012: the two ends never cross, so the image can never be driven blank', async ({ page }) => {
    await gotoPlayer(page)
    await setContrast(page, 'ceiling', 0.3)
    await setContrast(page, 'floor', 0.9)
    const state = await new GramFramePage(page).getState()
    expect(state.player.display.floor).toBeLessThan(state.player.display.ceiling)

    await setContrast(page, 'ceiling', 0)
    const settled = (await new GramFramePage(page).getState()).player.display
    expect(settled.floor).toBeLessThan(settled.ceiling)
    expect(settled.floor).toBeGreaterThanOrEqual(0)
  })

  test('AS-2.5 / FR-013: Reset restores the image exactly as it loaded', async ({ page }) => {
    const gfp = await gotoPlayer(page)
    await setContrast(page, 'floor', 0.45)
    await expect(page.locator('.gram-frame-spectrogram-image')).toHaveAttribute('filter', /gramDisplay/)

    await page.locator('.gram-frame-display-reset').click()
    await expect(page.locator('.gram-frame-spectrogram-image')).not.toHaveAttribute('filter', /./)
    const state = await gfp.getState()
    expect(state.player.display).toEqual({ floor: 0, ceiling: 1 })
  })

  test('FR-014: an image-sourced gram has no contrast controls', async ({ page }) => {
    const gfp = new GramFramePage(page)
    await page.goto(IMAGE_PAGE)
    await gfp.waitForState(s => s.imageDetails.naturalWidth > 0, { message: 'the image gram to load' })
    // The levels of an author-supplied PNG were never ours to re-map
    await expect(page.locator('.gram-frame-display-range')).toHaveCount(0)
    await expect(page.locator('.gram-frame-transport')).toHaveCount(0)
    await expect(page.locator('.gram-frame-spectrogram-image')).not.toHaveAttribute('filter', /./)
  })
})

test.describe('Story 3 — moving around a recording that is playing', () => {
  /**
   * Start the fixture playing.
   * @param {import('@playwright/test').Page} page - The page
   * @returns {Promise<GramFramePage>} The helper
   */
  async function gotoAndPlay(page) {
    const gfp = await gotoPlayer(page)
    // Well inside the recording, so a drag has history to travel back through:
    // in the opening window there is nothing earlier than the playhead to see.
    await page.evaluate(() => window.GramFrame.getPlayer(0).seek(10))
    await page.locator('.gram-frame-transport-play').click()
    await gfp.waitForState(s => s.player.playing === true, { message: 'playback to start' })
    await gfp.waitForState(s => s.player.playhead > 10.2, { message: 'playback to pass 10 s' })
    return gfp
  }

  test('a drag back to the start replays the recording from its first moment', async ({ page }) => {
    // The whole point of the lower clamp reaching zero. Drag-seek resumes from
    // the time at the top edge, so an analyst who wants to hear the opening
    // seconds again has to be able to drag them all the way up to it.
    const gfp = await gotoAndPlay(page)
    const box = await gfp.svg.boundingBox()
    if (!box) throw new Error('no SVG box')
    const x = box.x + MARGINS.left + 400
    const y = box.y + MARGINS.top + 300

    await page.mouse.move(x, y)
    await page.mouse.down()
    // Far enough up to run the view past the start of the recording — the
    // pointer ends over the blank the drag itself brings into view.
    await page.mouse.move(x, y - 1200, { steps: 12 })
    await gfp.waitForState(s => s.player.viewTop === 0, { message: 'the view to reach the start' })

    await page.mouse.up()
    await gfp.waitForState(s => s.player.playing === true, { message: 'playback to resume' })

    // Resumed from the beginning, not from one window in.
    const after = await gfp.getState()
    expect(after.player.playhead).toBeLessThan(1)
  })

  test('AS-3.1 / AS-3.2 / FR-015 / FR-016: a drag pauses under the hand and resumes where it is released', async ({ page }) => {
    const gfp = await gotoAndPlay(page)
    const box = await gfp.svg.boundingBox()
    if (!box) throw new Error('no SVG box')
    const x = box.x + MARGINS.left + 400
    const y = box.y + MARGINS.top + 200

    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x, y - 80, { steps: 6 })
    // Paused under the hand, and the view followed the drag back in time
    await gfp.waitForState(s => s.player.playing === false, { message: 'playback to pause under the drag' })
    const held = await gfp.getState()
    expect(held.player.viewTop).toBeLessThan(held.player.playhead)
    await expect(page.locator('.gram-frame-container')).toHaveClass(/gram-frame-drag-seek/)
    const released = held.player.viewTop

    await page.mouse.up()
    await gfp.waitForState(s => s.player.playing === true, { message: 'playback to resume on release' })
    const after = await gfp.getState()
    // Resumed from the time the view was released at (SC-004): the playhead
    // moved back to it, and has run on from there rather than from where the
    // drag began.
    expect(after.player.playhead).toBeGreaterThanOrEqual(released - 0.05)
    expect(after.player.playhead).toBeLessThan(held.player.playhead)
    await expect(page.locator('.gram-frame-container')).not.toHaveClass(/gram-frame-drag-seek/)
  })

  test('FR-016: a release outside the component still resumes playback', async ({ page }) => {
    const gfp = await gotoAndPlay(page)
    const box = await gfp.svg.boundingBox()
    if (!box) throw new Error('no SVG box')

    await page.mouse.move(box.x + MARGINS.left + 300, box.y + MARGINS.top + 200)
    await page.mouse.down()
    await page.mouse.move(box.x + MARGINS.left + 300, box.y + MARGINS.top + 120, { steps: 4 })
    await gfp.waitForState(s => s.player.playing === false, { message: 'the drag to pause playback' })
    // Off the component entirely — the top-left of the page, outside the SVG
    await page.mouse.move(2, 2, { steps: 4 })
    await page.mouse.up()

    await gfp.waitForState(s => s.player.playing === true, {
      message: 'playback to resume even though the release landed off the component'
    })
  })

  test('AS-3.3 / FR-018 / FR-019: the time axis can be zoomed while playing, and the span is stated', async ({ page }) => {
    const gfp = await gotoAndPlay(page)
    await expect(page.locator('.gram-frame-transport-span')).toHaveText('5.0 s span')

    await gfp.wheelAtSVG(MARGINS.left + 400, MARGINS.top + 200, -120, true)
    await gfp.waitForState(s => s.zoom.level > 1, { message: 'the zoom to take effect while playing' })

    const state = await gfp.getState()
    expect(state.player.playing).toBe(true)
    const span = state.player.windowSeconds / state.zoom.level
    await expect(page.locator('.gram-frame-transport-span')).toHaveText(`${span.toFixed(1)} s span`)
    // The follow loop still holds the playhead at the top edge
    await gfp.waitForState(s => Math.abs(s.player.viewTop - s.player.playhead) < 1e-6, {
      message: 'the view to keep following the playhead at the new zoom'
    })
  })

  test('FR-028: a click on a playing gram pauses it, and leaves the view where it was', async ({ page }) => {
    const gfp = await gotoAndPlay(page)
    const before = await gfp.getState()

    await gfp.svg.click({ position: { x: MARGINS.left + 400, y: MARGINS.top + 200 } })
    await gfp.waitForState(s => s.player.playing === false, { message: 'the click to pause playback' })

    const after = await gfp.getState()
    // Paused where it was playing: the click moved nothing, so the playhead is
    // where the press found it (a fraction of a second on, at most) and the
    // view is still on it.
    expect(after.player.playhead).toBeGreaterThanOrEqual(before.player.playhead)
    expect(after.player.playhead - before.player.playhead).toBeLessThan(1)
    expect(after.player.viewTop).toBeCloseTo(after.player.playhead, 6)
    await expect(page.locator('.gram-frame-container')).not.toHaveClass(/gram-frame-drag-seek/)
  })

  test('FR-028: a click pauses in an annotation mode too, without placing anything', async ({ page }) => {
    const gfp = await gotoAndPlay(page)
    await gfp.clickMode('Cross Cursor')

    await gfp.svg.click({ position: { x: MARGINS.left + 300, y: MARGINS.top + 200 } })
    await gfp.waitForState(s => s.player.playing === false, { message: 'the click to pause playback' })
    // The click spent itself on the transport; nothing was placed (FR-017)
    await expect(page.locator('.gram-frame-analysis-marker')).toHaveCount(0)
    expect((await gfp.getState()).analysis.markers.length).toBe(0)
  })

  test('FR-029: in Pan mode a click resumes a paused gram; in an annotation mode it does not', async ({ page }) => {
    const gfp = await gotoAndPlay(page)
    // Click once to pause, once more to resume — the toggle, in Pan mode
    await gfp.svg.click({ position: { x: MARGINS.left + 400, y: MARGINS.top + 200 } })
    await gfp.waitForState(s => s.player.playing === false, { message: 'the first click to pause' })
    await gfp.svg.click({ position: { x: MARGINS.left + 400, y: MARGINS.top + 200 } })
    await gfp.waitForState(s => s.player.playing === true, { message: 'the second click to resume' })

    // In Cross Cursor the same click places a marker and playback stays paused:
    // the pause-then-annotate workflow keeps its click.
    await gfp.svg.click({ position: { x: MARGINS.left + 400, y: MARGINS.top + 200 } })
    await gfp.waitForState(s => s.player.playing === false, { message: 'the click to pause again' })
    await gfp.clickMode('Cross Cursor')
    await gfp.svg.click({ position: { x: MARGINS.left + 300, y: MARGINS.top + 250 } })
    await gfp.waitForMarkerCount(1)
    expect((await gfp.getState()).player.playing).toBe(false)
  })

  test('FR-028/FR-029: a drag still seeks and resumes rather than toggling', async ({ page }) => {
    const gfp = await gotoAndPlay(page)
    const box = await gfp.svg.boundingBox()
    if (!box) throw new Error('no SVG box')
    const x = box.x + MARGINS.left + 400
    const y = box.y + MARGINS.top + 200

    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x, y - 60, { steps: 5 })
    await page.mouse.up()
    // Moved well past the click slop, so this is the drag-seek: it resumes
    await gfp.waitForState(s => s.player.playing === true, { message: 'the drag to resume playback' })
  })

  test('AS-3.4 / FR-017: annotations stay inert while playing, by pointer and by keyboard', async ({ page }) => {
    const gfp = await gotoPlayer(page)
    // A marker placed while paused, then playback started
    await gfp.clickMode('Cross Cursor')
    await gfp.svg.click({ position: { x: MARGINS.left + 300, y: MARGINS.top + 200 } })
    await gfp.waitForMarkerCount(1)
    const before = (await gfp.getState()).analysis.markers[0]

    await page.locator('.gram-frame-transport-play').click()
    await gfp.waitForState(s => s.player.playing === true, { message: 'playback to start' })

    // A right-click that would delete it does nothing
    await gfp.svg.click({ position: { x: MARGINS.left + 300, y: MARGINS.top + 200 }, button: 'right' })
    // An arrow key that would nudge it does nothing
    await page.keyboard.press('ArrowRight')

    const after = (await gfp.getState()).analysis.markers
    expect(after.length).toBe(1)
    expect(after[0].freq).toBe(before.freq)
    expect(after[0].time).toBe(before.time)
  })
})

test.describe('Story 4 — playback speed and pitch', () => {
  test('AS-4.1 / FR-020: the speed choices run from a quarter to four times', async ({ page }) => {
    await gotoPlayer(page)
    const options = await page.locator('.gram-frame-transport-playback-rate option').allTextContents()
    expect(options).toEqual(['0.25×', '0.5×', '1×', '1.5×', '2×', '4×'])
  })

  test('AS-4.2 / FR-021: the pitch is preserved, stated on the element rather than inherited', async ({ page }) => {
    const gfp = await gotoPlayer(page)
    await page.locator('.gram-frame-transport-playback-rate').selectOption('0.25')
    await gfp.waitForState(s => s.player.playbackRate === 0.25, { message: 'the rate to change' })

    const element = await page.evaluate(() => {
      const audio = /** @type {HTMLAudioElement} */ (document.querySelector('.gram-frame-audio-element'))
      return { rate: audio.playbackRate, preservesPitch: audio.preservesPitch }
    })
    expect(element.rate).toBe(0.25)
    expect(element.preservesPitch).toBe(true)
  })

  test('AS-4.3 / FR-022: a config row selects resampling instead', async ({ page }) => {
    const gfp = new GramFramePage(page)
    await page.goto('/tests/fixtures/player-config-page.html')
    await gfp.waitForPlayerReady()
    const state = await gfp.getState()
    expect(state.player.preservesPitch).toBe(false)
    const preserves = await page.evaluate(() => {
      const audio = /** @type {HTMLAudioElement} */ (document.querySelector('.gram-frame-audio-element'))
      return audio.preservesPitch
    })
    expect(preserves).toBe(false)
  })
})

test.describe('Story 5 — a long recording opens instead of being refused', () => {
  test('AS-5.1 / AS-5.2 / FR-023 / FR-024 / SC-006: the gram loads at a coarser hop and the caption names it', async ({ page }) => {
    const gfp = new GramFramePage(page)
    await page.goto(DEGRADED_PAGE)
    await gfp.waitForPlayerReady()

    const state = await gfp.getState()
    // hop-size 2 asks for 79,969 rows; 8 is the power-of-two multiple that fits
    expect(state.player.degraded).toEqual({ parameter: 'hop-size', requested: 2, used: 8 })
    expect(state.player.analysis.hopSize).toBe(8)
    expect(state.player.analysis.frames).toBeLessThanOrEqual(32768)
    await expect(page.locator('.gramframe-error-indicator')).toHaveCount(0)

    const note = page.locator('.gram-frame-degraded-note')
    await expect(note).toHaveCount(1)
    await expect(note).toContainText('hop-size 2')
    await expect(note).toContainText('hop-size 8')
  })
})

test.describe('Story 6 — the transport announces what it is doing', () => {
  test('AS-6.1 / AS-6.2 / FR-026 / FR-027: play and pause are announced politely, and the time is not', async ({ page }) => {
    const gfp = await gotoPlayer(page)
    const status = page.locator('.gram-frame-transport-status')
    await expect(status).toHaveAttribute('aria-live', 'polite')
    await expect(status).toHaveAttribute('role', 'status')

    await page.locator('.gram-frame-transport-play').click()
    await gfp.waitForState(s => s.player.playing === true, { message: 'playback to start' })
    await expect(status).toHaveText(/^Playing at /)

    // The elapsed time is rate-limited: over a second of playback — dozens of
    // frames — the announcement does not change (FR-027).
    const firstText = await status.textContent()
    await gfp.waitForState(s => s.player.playhead > 1.2, { message: 'a second of playback' })
    expect(await status.textContent()).toBe(firstText)

    await page.locator('.gram-frame-transport-play').click()
    await gfp.waitForState(s => s.player.playing === false, { message: 'playback to pause' })
    await expect(status).toHaveText(/^Paused at /)

    // Announcing must not move the focus (FR-026)
    const focused = await page.evaluate(() => document.activeElement?.className || '')
    expect(focused).not.toContain('gram-frame-transport-status')
  })
})

test.describe('the axes area is unchanged by any of it', () => {
  test('the gram still renders at the player size with its configured axes', async ({ page }) => {
    const gfp = await gotoPlayer(page)
    const state = await gfp.getState()
    expect(state.imageDetails.renderWidth).toBe(RENDER.width)
    expect(state.imageDetails.renderHeight).toBe(RENDER.height)
    expect(state.config).toEqual({ timeMin: 0, timeMax: 20, freqMin: 0, freqMax: 3000 })
  })
})
