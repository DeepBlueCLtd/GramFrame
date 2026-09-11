import { test, expect } from '@playwright/test'

/**
 * @fileoverview The painting controls an audio table can now carry:
 * `frame-average`, `normalisation`, `level-floor` and `level-ceiling`. They
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
    await page.waitForFunction(() => window.GramFrame.__test__getInstances().filter(i => i.state.player.ready).length === 3)

    const plain = await page.evaluate(() =>
      window.GramFrame.__test__getInstances()[0].state.player.analysis)
    expect(plain.frameAverage).toBe(1)
    expect(plain.normalisation).toBe('none')
    expect(plain.levelFloor).toBe(5)
    expect(plain.levelCeiling).toBe(99.9)
    // The row count spec 168 froze: (160000 - 1024) / 512 + 1.
    expect(plain.frames).toBe(311)
  })

  test('frame averaging divides the painted rows and reaches the image', async ({ page }) => {
    await page.goto(PAGE)
    await page.waitForFunction(() => window.GramFrame.__test__getInstances().filter(i => i.state.player.ready).length === 3)

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
    await page.waitForFunction(() => window.GramFrame.__test__getInstances().filter(i => i.state.player.ready).length === 3)

    const hrefs = await page.evaluate(() => window.GramFrame.__test__getInstances().map(i =>
      i.ui.spectrogramImage.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || ''))
    // Same audio, same geometry for the first and third; only the estimator
    // differs, so identical images would mean the setting did nothing.
    expect(hrefs[2]).not.toBe(hrefs[0])
    const perBin = await page.evaluate(() =>
      window.GramFrame.__test__getInstances()[2].state.player.analysis)
    expect(perBin.normalisation).toBe('per-bin')
    expect(perBin.frames).toBe(311)
  })

  test('a normalisation that does not exist fails with the standard indicator', async ({ page }) => {
    await page.goto(PAGE)
    await page.waitForFunction(() => window.GramFrame.__test__getInstances().filter(i => i.state.player.ready).length === 3)

    await expect(page.locator('table#bad')).toHaveClass(/gram-frame-config-error/)
    const indicator = page.locator('table#bad + .gramframe-error-indicator')
    await expect(indicator).toHaveCount(1)
    await expect(indicator).toContainText(/normalisation.*whitening/s)
    await expect(indicator).toContainText(/none, split-window, per-bin/)
  })
})
