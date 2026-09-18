import { test, expect } from '@playwright/test'

/**
 * @fileoverview The painting controls an audio table can now carry:
 * `frame-average`, `normalisation`, `normalisation-window`, `level-floor`,
 * `level-ceiling`, `level-span`, `level-scope` and `colour-map`. They
 * exist so an analyst can judge, on their own material, whether GramFrame's
 * picture holds the detail a legacy display shows.
 *
 * The properties worth holding are that a table naming none of them is
 * untouched, that each one reaches the painted image rather than only state,
 * and that a value outside the set fails loudly.
 */

const PAGE = '/tests/fixtures/player-painting-page.html'

test.describe('the painting controls', () => {
  test('a table naming none of them paints exactly what it always did', async ({ page }) => {
    await page.goto(PAGE)
    await page.waitForFunction(() => window.GramFrame.__test__getInstances().filter(i => i.state.player.ready).length === 6)

    const plain = await page.evaluate(() =>
      window.GramFrame.__test__getInstances()[0].state.player.analysis)
    expect(plain.frameAverage).toBe(1)
    expect(plain.normalisation).toBe('none')
    expect(plain.levelFloor).toBe(5)
    expect(plain.levelCeiling).toBe(99.9)
    expect(plain.levelScope).toBe('file')
    expect(plain.levelSpan).toBeNull()
    expect(plain.normalisationWindow).toBeNull()
    // The row count spec 168 froze: (160000 - 1024) / 512 + 1.
    expect(plain.frames).toBe(311)
  })

  test('frame averaging divides the painted rows and reaches the image', async ({ page }) => {
    await page.goto(PAGE)
    await page.waitForFunction(() => window.GramFrame.__test__getInstances().filter(i => i.state.player.ready).length === 6)

    const [plain, painted] = await page.evaluate(() => {
      const live = window.GramFrame.__test__getInstances()
      return [0, 1].map(i => ({
        analysis: live[i].state.player.analysis,
        naturalHeight: live[i].state.imageDetails.naturalHeight,
        href: live[i].ui.spectrogramImage.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || ''
      }))
    })

    expect(painted.analysis.frameAverage).toBe(4)
    expect(painted.analysis.normalisation).toBe('split-window')
    expect(painted.analysis.levelFloor).toBe(1)
    expect(painted.analysis.levelCeiling).toBe(99)
    expect(painted.analysis.levelScope).toBe('row')
    expect(painted.analysis.levelSpan).toBe(12)
    expect(painted.analysis.normalisationWindow).toBe(50)
    // 311 transforms, four to a row, with the short trailing group still a row.
    expect(painted.analysis.frames).toBe(Math.ceil(plain.analysis.frames / 4))
    // The image really is that many pixels tall — the setting reached the
    // canvas, not only the state object.
    expect(painted.naturalHeight).toBe(painted.analysis.frames)
    expect(painted.analysis.columns).toBe(plain.analysis.columns)
    expect(painted.href).not.toBe(plain.href)
    expect(painted.href.startsWith('data:image/png')).toBe(true)
  })

  test('the two estimators paint different pictures of the same recording', async ({ page }) => {
    await page.goto(PAGE)
    await page.waitForFunction(() => window.GramFrame.__test__getInstances().filter(i => i.state.player.ready).length === 6)

    const hrefs = await page.evaluate(() => window.GramFrame.__test__getInstances().map(i =>
      i.ui.spectrogramImage.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || ''))
    // Same audio, same geometry for the first and fifth; only the estimator
    // differs, so identical images would mean the setting did nothing.
    expect(hrefs[4]).not.toBe(hrefs[0])
    const perBin = await page.evaluate(() =>
      window.GramFrame.__test__getInstances()[4].state.player.analysis)
    expect(perBin.normalisation).toBe('per-bin')
    expect(perBin.frames).toBe(311)
  })

  test('an fft-size above 8192 is accepted: a narrow low band wants one', async ({ page }) => {
    await page.goto(PAGE)
    await page.waitForFunction(() => window.GramFrame.__test__getInstances().filter(i => i.state.player.ready).length === 6)
    const big = await page.evaluate(() =>
      window.GramFrame.__test__getInstances()[5].state.player.analysis)
    expect(big.fftSize).toBe(16384)
    // (160000 - 16384) / 8192 + 1 rows, at the default half-frame hop.
    expect(big.frames).toBe(18)
  })

  test('a normalisation that does not exist fails with the standard indicator', async ({ page }) => {
    await page.goto(PAGE)
    await page.waitForFunction(() => window.GramFrame.__test__getInstances().filter(i => i.state.player.ready).length === 6)

    await expect(page.locator('table#bad')).toHaveClass(/gram-frame-config-error/)
    const indicator = page.locator('table#bad + .gramframe-error-indicator')
    await expect(indicator).toHaveCount(1)
    await expect(indicator).toContainText(/normalisation.*whitening/s)
    await expect(indicator).toContainText(/none, split-window, per-bin/)
  })
})
