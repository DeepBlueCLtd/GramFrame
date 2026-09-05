import { test, expect } from '@playwright/test'
import { GramFramePage } from './helpers/gram-frame-page.js'

/**
 * @fileoverview Story 4 (spec 168): pause, annotate, resume — annotations
 * ride the gram, vanish when their moment is unrevealed, and come back.
 */

const PLAYER_PAGE = '/tests/fixtures/player-page.html'
const MARGINS = { left: 60, top: 15 }
const RENDER = { width: 900, height: 400 }
const FREQ_MAX = 3000
const WINDOW = 5

/**
 * Expected SVG position of a data point on the fixture's gram.
 * @param {number} time - seconds
 * @param {number} freq - Hz
 * @param {number} viewTop - time at the view's top edge
 * @param {number} [level=1] - zoom level
 */
function expectedSVG(time, freq, viewTop, level = 1) {
  const pxPerSecond = RENDER.height * level / WINDOW
  return {
    x: MARGINS.left + (freq / FREQ_MAX) * RENDER.width * level,
    y: MARGINS.top + (viewTop - time) * pxPerSecond
  }
}

/**
 * Open the fixture, seek to a paused position and place a marker plus a
 * harmonic set on the revealed gram.
 * @param {import('@playwright/test').Page} page
 */
async function pauseAndAnnotate(page) {
  // Each test runs in a fresh browser context, so storage starts empty.
  const gfp = new GramFramePage(page)
  await page.goto(PLAYER_PAGE)
  await gfp.waitForPlayerReady()
  await page.evaluate(() => window.GramFrame.getPlayer(0).seek(8))
  await gfp.waitForState(s => s.player.viewTop === 8, { message: 'the view to reach 8 s' })

  // Playwright positions are padding-box relative while SVG units are
  // border-box relative; take the border off the SVG-space targets.
  const border = await gfp.svgBorderOffset()

  // Marker at (6 s, 300 Hz): 2 s below the top edge → 160 px; 300 Hz → 90 px
  await gfp.clickMode('Cross Cursor')
  const m = expectedSVG(6, 300, 8)
  await gfp.svg.click({ position: { x: m.x - border.left, y: m.y - border.top } })
  await gfp.waitForMarkerCount(1)

  // Harmonic set anchored at 7 s: a short drag in Harmonics mode
  await gfp.clickMode('Harmonics')
  const h = expectedSVG(7, 900, 8)
  const box = await gfp.svg.boundingBox()
  await page.mouse.move(box.x + h.x, box.y + h.y)
  await page.mouse.down()
  await page.mouse.move(box.x + h.x + 20, box.y + h.y, { steps: 4 })
  await page.mouse.up()
  await gfp.waitForHarmonicSetCount(1)

  const state = await gfp.getState()
  return { gfp, marker: state.analysis.markers[0], set: state.harmonics.harmonicSets[0] }
}

test.describe('Story 4 — pause, annotate, resume', () => {
  test('AS-4.1: paused, the existing modes place features at the data coordinates under the pointer', async ({ page }) => {
    const { marker, set } = await pauseAndAnnotate(page)
    // Within a pixel's worth of the target (a pixel is 3.3 Hz and 12.5 ms here)
    expect(Math.abs(marker.time - 6)).toBeLessThan(0.05)
    expect(Math.abs(marker.freq - 300)).toBeLessThan(5)
    expect(set.anchorTime).toBeCloseTo(7, 1)
    expect(set.spacing).toBeGreaterThan(0)
  })

  test('AS-4.3 / FR-017: seeking forward moves the annotations with the gram and off the bottom of the view', async ({ page }) => {
    const { gfp, marker } = await pauseAndAnnotate(page)

    await page.evaluate(() => window.GramFrame.getPlayer(0).seek(10))
    await gfp.waitForState(s => s.player.viewTop === 10, { message: 'seek to 10 s' })
    const pos = await page.locator('.gram-frame-analysis-marker circle, .gram-frame-analysis-marker line').first().evaluate(el => {
      const bb = el.getBoundingClientRect(); const svg = document.querySelector('.gram-frame-svg').getBoundingClientRect()
      return { y: bb.top + bb.height / 2 - svg.top }
    })
    // 4 s below the top edge → 320 px (the bounding-box read is border-box
    // relative, as SVG units are)
    expect(Math.abs(pos.y - expectedSVG(marker.time, marker.freq, 10).y)).toBeLessThan(6)

    await page.evaluate(() => window.GramFrame.getPlayer(0).seek(14))
    await gfp.waitForState(s => s.player.viewTop === 14, { message: 'seek to 14 s' })
    // Still drawn (revealed), but its moment has slid below the axes area
    await expect(page.locator('.gram-frame-analysis-marker')).toHaveCount(1)
    const drawnY = await page.locator('.gram-frame-analysis-marker').evaluate(el => el.getBBox().y)
    expect(drawnY).toBeGreaterThan(MARGINS.top + RENDER.height)
  })

  test('AS-4.6 / FR-018: seeking back before an annotation hides it; playing past it shows it again', async ({ page }) => {
    const { gfp } = await pauseAndAnnotate(page)

    await page.evaluate(() => window.GramFrame.getPlayer(0).seek(5))
    await gfp.waitForState(s => s.player.playhead === 5, { message: 'seek to 5 s' })
    await expect(page.locator('.gram-frame-analysis-marker')).toHaveCount(0)
    await expect(page.locator('.gram-frame-harmonic-line')).toHaveCount(0)
    // The tables still list them — the tables are not a view of the gram
    await gfp.waitForTableRowCount('markers', 1)
    await gfp.waitForTableRowCount('harmonics', 1)

    await page.evaluate(() => window.GramFrame.getPlayer(0).seek(7.5))
    await gfp.waitForState(s => s.player.playhead === 7.5, { message: 'seek to 7.5 s' })
    await expect(page.locator('.gram-frame-analysis-marker')).toHaveCount(1)
    expect(await page.locator('.gram-frame-harmonic-line').count()).toBeGreaterThan(0)
  })

  test('AS-4.2 / FR-016: paused, a pan travels back through what has played but never past the playhead', async ({ page }) => {
    const { gfp } = await pauseAndAnnotate(page)
    await gfp.clickMode('Pan')
    const box = await gfp.svg.boundingBox()
    const cx = box.x + MARGINS.left + 400
    const cy = box.y + MARGINS.top + 100

    // Drag downward: content follows, the view moves earlier (80 px = 1 s)
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx, cy + 160, { steps: 5 })
    await page.mouse.up()
    await gfp.waitForState(s => Math.abs(s.player.viewTop - 6) < 0.1, { message: 'the view to pan to 6 s' })

    // Drag upward far beyond the playhead: clamps at 8
    await page.mouse.move(cx, cy + 160)
    await page.mouse.down()
    await page.mouse.move(cx, cy - 300, { steps: 5 })
    await page.mouse.up()
    await gfp.waitForState(s => s.player.viewTop === 8, { message: 'the view to clamp at the playhead' })
    expect((await gfp.getState()).player.playhead).toBe(8)
  })

  test('AS-4.4: resuming play snaps the view back to the playhead first', async ({ page }) => {
    const { gfp } = await pauseAndAnnotate(page)
    await gfp.clickMode('Pan')
    const box = await gfp.svg.boundingBox()
    await page.mouse.move(box.x + 400, box.y + 100)
    await page.mouse.down()
    await page.mouse.move(box.x + 400, box.y + 260, { steps: 5 })
    await page.mouse.up()
    await gfp.waitForState(s => s.player.viewTop < 7, { message: 'the view to pan away from the playhead' })

    await page.locator('.gram-frame-transport-play').click()
    await gfp.waitForState(s => s.player.playing && s.player.viewTop === s.player.playhead && s.player.playhead >= 8, {
      message: 'the view to rejoin the playhead'
    })
  })

  test('AS-4.5 / FR-019: annotations persist through a reload and reappear once their time is played', async ({ page }) => {
    const { gfp, marker } = await pauseAndAnnotate(page)
    await page.reload()
    await gfp.waitForPlayerReady()

    // Restored into state (the storage layer is unchanged), but not drawn: nothing has played
    const restored = await gfp.getState()
    expect(restored.analysis.markers.length).toBe(1)
    expect(restored.analysis.markers[0].time).toBeCloseTo(marker.time, 6)
    expect(restored.harmonics.harmonicSets.length).toBe(1)
    await expect(page.locator('.gram-frame-analysis-marker')).toHaveCount(0)

    await page.evaluate(() => window.GramFrame.getPlayer(0).seek(9))
    await gfp.waitForState(s => s.player.viewTop === 9, { message: 'seek to 9 s' })
    await expect(page.locator('.gram-frame-analysis-marker')).toHaveCount(1)
  })

  test('SC-005: a harmonic set stays on its tonal through a window of scrolling and a loop back to 0', async ({ page }) => {
    test.setTimeout(30000)
    const { gfp, set } = await pauseAndAnnotate(page)
    // 2× so the 4 s to the end and the 7.6 s back to the set fit the test
    await page.evaluate(() => { const p = window.GramFrame.getPlayer(0); p.setLoop(true); p.setRate(2) })
    await page.evaluate(() => window.GramFrame.getPlayer(0).seek(16))
    await page.locator('.gram-frame-transport-play').click()
    await gfp.waitForState(s => s.player.playing, { message: 'playback' })

    // Wait for the loop to wrap and play back past the set's anchor
    await gfp.waitForState(s => s.player.playhead > 7.6 && s.player.playhead < 12, {
      timeout: 15000, message: 'the loop to wrap and pass the harmonic set'
    })

    // Read the set's first pin and the view's top edge in one moment
    const sample = await page.evaluate(() => {
      const instance = window.GramFrame.__test__getInstances()[0]
      const line = document.querySelector('.gram-frame-harmonic-line[data-harmonic-number="1"]')
      return { viewTop: instance.state.player.viewTop, x: line ? parseFloat(line.getAttribute('x1')) : null,
        y1: line ? parseFloat(line.getAttribute('y1')) : null, y2: line ? parseFloat(line.getAttribute('y2')) : null }
    })
    expect(sample.x).not.toBeNull()
    const expected = expectedSVG(set.anchorTime, set.spacing, sample.viewTop)
    expect(Math.abs(sample.x - expected.x)).toBeLessThan(1)
    // The pin is centred on its anchor time
    expect(Math.abs((sample.y1 + sample.y2) / 2 - expected.y)).toBeLessThan(2)
  })
})
