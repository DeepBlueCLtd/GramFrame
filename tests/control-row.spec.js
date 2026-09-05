import { test, expect } from '@playwright/test'
import { GramFramePage } from './helpers/gram-frame-page.js'

/**
 * The control row's layout and its icon buttons (issue #310).
 *
 * Pan is the only mode carrying command buttons, so its row holds four controls
 * across a column sized by the widest mode name. Before this, the mode button
 * was squeezed to a fraction of its width and read "PA"; the fix is a glyph for
 * Pan and one for Fit, and putting the mode button at the head of its group.
 *
 * These are geometry and naming assertions rather than pixel comparisons —
 * there is no visual regression lane (docs/Testing-Strategy.md) — but they do
 * catch the thing that actually went wrong: a control overflowing its column,
 * or a button losing the name a person or a screen reader calls it by.
 */

test.describe('Control row', () => {
  /** @type {GramFramePage} */
  let gfp

  test.beforeEach(async ({ page }) => {
    gfp = new GramFramePage(page)
    await gfp.goto()
    await gfp.waitForImageDimensions()
  })

  test('every control on the Pan row fits inside the column', async ({ page }) => {
    const column = await page.locator('.gram-frame-modes').boundingBox()
    expect(column).not.toBeNull()

    const row = page.locator('.gram-frame-mode-group').first()
    const controls = row.locator('button')
    await expect(controls).toHaveCount(4) // Pan, zoom out, zoom in, fit

    for (let i = 0; i < 4; i++) {
      const box = await controls.nth(i).boundingBox()
      expect(box, `control ${i} is not rendered`).not.toBeNull()
      if (!box || !column) {
        continue
      }
      expect(box.x, `control ${i} starts left of the column`).toBeGreaterThanOrEqual(column.x - 0.5)
      expect(box.x + box.width, `control ${i} overflows the column`)
        .toBeLessThanOrEqual(column.x + column.width + 0.5)
      // A control narrower than its own glyph is the clipping this fixes.
      expect(box.width, `control ${i} is too narrow to read`).toBeGreaterThanOrEqual(24)
    }
  })

  test('the mode button leads its group, so all five line up', async ({ page }) => {
    const modeButtons = page.locator('.gram-frame-mode-btn')
    await expect(modeButtons).toHaveCount(5)

    const lefts = []
    for (let i = 0; i < 5; i++) {
      const box = await modeButtons.nth(i).boundingBox()
      lefts.push(box ? box.x : NaN)
    }
    for (const left of lefts) {
      expect(left).toBeCloseTo(lefts[0], 0)
    }

    // Pan's commands follow it, left to right: zoom out, zoom in, fit.
    const row = page.locator('.gram-frame-mode-group').first()
    const titles = await row.locator('button').evaluateAll(
      (buttons) => buttons.map((b) => b.getAttribute('title') || b.textContent)
    )
    expect(titles).toEqual(['Pan', 'Zoom Out', 'Zoom In', 'Fit Whole Gram'])
  })

  test('the icon buttons keep the names they are known by', async ({ page }) => {
    // The glyph is decoration; the word behind it is the accessible name, which
    // is what a screen reader speaks and what a test selects on.
    const pan = page.locator('.gram-frame-mode-btn[data-mode="pan"]')
    await expect(pan).toHaveText('Pan')
    await expect(pan.locator('svg.gram-frame-icon')).toHaveCount(1)
    await expect(pan.locator('svg')).toHaveAttribute('aria-hidden', 'true')

    const fit = gfp.commandButton('Fit Whole Gram')
    await expect(fit).toHaveText('Fit')
    await expect(fit.locator('svg.gram-frame-icon')).toHaveCount(1)

    // ...and the mode is still selectable by that name.
    await gfp.clickMode('Cross Cursor')
    await gfp.clickMode('Pan')
    expect((await gfp.getState()).mode).toBe('pan')
  })
})
