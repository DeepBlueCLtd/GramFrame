import { test, expect } from './helpers/fixtures.js'
import { GramFramePage } from './helpers/gram-frame-page.js'

/**
 * @fileoverview Axis ticks and labels (R9-07 / L12 / BH-27 / BH-28, issue #259).
 *
 * The first assertions the suite has ever made about axis label *text*. The
 * September mutation probe changed the time axis's tick count from 5 to 3 and
 * all 484 tests stayed green, which is how four defects lived in one function:
 *
 *   - a hard-coded five time ticks, so a 0–10 s gram got them 2.5 s apart
 *   - `formatTime` flooring those to `00:00 00:02 00:05 00:07 00:10`
 *   - zoomed in far enough, every label collapsing onto the same second
 *   - `Math.round(frequency) + 'Hz'` duplicating labels on a narrow band
 *
 * Each test below names the reading an analyst would have got.
 */

/**
 * Read the rendered axis label text.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<{time: string[], freq: string[]}>} Label text per axis
 */
async function readAxisLabels(page) {
  return {
    time: await page.locator('.gram-frame-axis-label').allTextContents(),
    freq: await page.locator('.gram-frame-axis-label-major').allTextContents()
  }
}

/**
 * Open a fixture and wait for its configuration to be parsed.
 * @param {import('@playwright/test').Page} page
 * @param {string} fixture - Fixture path relative to the base URL
 * @param {(state: any) => boolean} ready - Predicate identifying this fixture's config
 * @returns {Promise<GramFramePage>} Page object
 */
async function openFixture(page, fixture, ready) {
  const gfp = new GramFramePage(page)
  await page.goto(fixture)
  await page.locator('.gram-frame-container').waitFor()
  await gfp.waitForState(ready, { message: `${fixture} configuration to be parsed` })
  return gfp
}

test.describe('Time axis labels are exact and round (R9-07)', () => {
  test('a 0-10 s gram lands on whole seconds instead of truncated 2.5 s ticks', async ({ page }) => {
    await openFixture(page, '/tests/fixtures/short-span-page.html', (s) => s.config.timeMax === 10)

    const { time } = await readAxisLabels(page)

    // Was `00:00 00:02 00:05 00:07 00:10`: five fixed ticks 2.5 s apart, three
    // of them naming a time up to half a second later than the tick.
    expect(time).toEqual(['00:00', '00:05', '00:10'])
  })

  test('a 0-60 s gram is labelled at round intervals', async ({ gramFramePage }) => {
    const { time } = await readAxisLabels(gramFramePage.page)
    expect(time).toEqual(['00:00', '00:20', '00:40', '01:00'])
  })

  test('every time label names a distinct time, at 1x and zoomed in', async ({ gramFramePage }) => {
    const atOne = (await readAxisLabels(gramFramePage.page)).time
    expect(new Set(atOne).size).toBe(atOne.length)

    // At 10x the visible span is 6 s. Five fixed ticks inside it all floored to
    // the same second: `00:04 00:04 00:05 00:05 00:05`.
    await gramFramePage.setZoom(10, 0.5, 0.5)
    const atTen = (await readAxisLabels(gramFramePage.page)).time

    expect(atTen.length).toBeGreaterThan(1)
    expect(new Set(atTen).size, `duplicate time labels: ${atTen.join(' ')}`).toBe(atTen.length)
  })

  test('the tick count follows the visible span rather than being fixed at five', async ({ gramFramePage }) => {
    // The mutation the review applied — tickCount 5 → 3 — was invisible because
    // nothing asserted the count. It is not a constant any more: zooming in
    // must change how the axis is divided.
    const wide = (await readAxisLabels(gramFramePage.page)).time
    await gramFramePage.setZoom(10, 0.5, 0.5)
    const narrow = (await readAxisLabels(gramFramePage.page)).time

    expect(wide).not.toEqual(narrow)
    // ...and the zoomed span is labelled inside itself, not across the whole gram.
    expect(narrow.every((label) => label !== '00:00' && label !== '01:00')).toBe(true)
  })
})

test.describe('Frequency axis labels are distinct on a narrow band (R9-07 / BH-28)', () => {
  test('a 2 Hz band gets sub-hertz labels instead of repeating the same integer', async ({ page }) => {
    await openFixture(page, '/tests/fixtures/short-span-page.html', (s) => s.config.freqMax === 102)

    const { freq } = await readAxisLabels(page)

    expect(freq.length).toBeGreaterThan(3)
    // `Math.round(frequency) + 'Hz'` printed "100Hz" for every tick from 99.5
    // to 100.5, so a 2 Hz band showed three distinct labels at best.
    expect(new Set(freq).size, `duplicate frequency labels: ${freq.join(' ')}`).toBe(freq.length)
    expect(freq[0]).toBe('100.0Hz')
    expect(freq[freq.length - 1]).toBe('102.0Hz')
  })

  test('a wide band still reads in whole hertz', async ({ gramFramePage }) => {
    // The precision follows the tick interval, so nothing gains spurious
    // decimals: a 0-100 Hz gram is labelled every 10 Hz, as before.
    const { freq } = await readAxisLabels(gramFramePage.page)
    expect(freq[0]).toBe('0Hz')
    expect(freq[freq.length - 1]).toBe('100Hz')
    expect(freq.every((label) => /^\d+Hz$/.test(label))).toBe(true)
  })
})
