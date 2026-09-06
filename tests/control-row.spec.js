import { test, expect } from '@playwright/test'
import { GramFramePage } from './helpers/gram-frame-page.js'

/**
 * The control row's five columns, and the mode rail at the head of them.
 *
 * The rail stacks the five tools and puts the view controls — zoom out, zoom
 * in, fit — in a footer beneath them, fenced off by a rule. They used to sit
 * inside Pan's row, which made one row of five four controls wide while the
 * rest held one; the fix put them where they act, on the view rather than on
 * the armed tool.
 *
 * These are geometry and naming assertions rather than pixel comparisons —
 * there is no visual regression lane (docs/Testing-Strategy.md) — but they do
 * catch the thing that actually goes wrong: a control overflowing its column,
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

  test('every control in the mode rail fits inside its column', async ({ page }) => {
    const column = await page.locator('.gram-frame-modes').boundingBox()
    expect(column).not.toBeNull()

    const controls = page.locator('.gram-frame-modes button')
    await expect(controls).toHaveCount(8) // five modes, plus zoom out, zoom in, fit

    const count = await controls.count()
    for (let i = 0; i < count; i++) {
      const box = await controls.nth(i).boundingBox()
      expect(box, `control ${i} is not rendered`).not.toBeNull()
      if (!box || !column) {
        continue
      }
      expect(box.x, `control ${i} starts left of the column`).toBeGreaterThanOrEqual(column.x - 0.5)
      expect(box.x + box.width, `control ${i} overflows the column`)
        .toBeLessThanOrEqual(column.x + column.width + 0.5)
      // A control narrower than its own glyph is the clipping this guards.
      expect(box.width, `control ${i} is too narrow to read`).toBeGreaterThanOrEqual(24)
    }
  })

  test('the five modes stack in roster order and line up', async ({ page }) => {
    const modeButtons = page.locator('.gram-frame-mode-btn')
    await expect(modeButtons).toHaveCount(5)

    const names = await modeButtons.evaluateAll(
      (buttons) => buttons.map((b) => b.getAttribute('title'))
    )
    expect(names).toEqual(['Pan', 'Cross Cursor', 'Harmonics', 'Sidebands', 'Doppler'])

    const lefts = []
    for (let i = 0; i < 5; i++) {
      const box = await modeButtons.nth(i).boundingBox()
      lefts.push(box ? box.x : NaN)
    }
    for (const left of lefts) {
      expect(left).toBeCloseTo(lefts[0], 0)
    }
  })

  test('the view controls sit below every mode, whichever is armed', async ({ page }) => {
    const commands = page.locator('.gram-frame-mode-commands .gram-frame-command-btn')
    const titles = await commands.evaluateAll(
      (buttons) => buttons.map((b) => b.getAttribute('title'))
    )
    expect(titles).toEqual(['Zoom Out', 'Zoom In', 'Fit Whole Gram'])

    const lastMode = await page.locator('.gram-frame-mode-btn').last().boundingBox()
    const firstCommand = await commands.first().boundingBox()
    expect(firstCommand.y).toBeGreaterThan(lastMode.y + lastMode.height - 1)

    // Still there after a mode switch: they are view controls, not Pan's.
    await gfp.clickMode('Doppler')
    await expect(commands.first()).toBeVisible()
  })

  test('every mode button carries both its glyph and its name', async ({ page }) => {
    const buttons = page.locator('.gram-frame-mode-btn')
    await expect(buttons.locator('svg.gram-frame-icon')).toHaveCount(5)

    const pan = page.locator('.gram-frame-mode-btn[data-mode="pan"]')
    await expect(pan).toHaveText('Pan')
    await expect(pan.locator('svg')).toHaveAttribute('aria-hidden', 'true')

    // The Fit button is the opposite case: a glyph standing IN PLACE of its
    // word, which it keeps in a visually hidden span so the name survives.
    const fit = gfp.commandButton('Fit Whole Gram')
    await expect(fit).toHaveText('Fit')
    await expect(fit.locator('svg.gram-frame-icon')).toHaveCount(1)

    // ...and the mode is still selectable by that name.
    await gfp.clickMode('Cross Cursor')
    await gfp.clickMode('Pan')
    expect((await gfp.getState()).mode).toBe('pan')
  })

  test('the guidance column names the armed mode and follows a switch', async ({ page }) => {
    // The rail may be collapsed at this width; open it so the header is read.
    const reveal = page.locator('.gram-frame-guidance-reveal')
    if (await reveal.isVisible()) {
      await reveal.click()
    }

    await expect(page.locator('.gram-frame-guidance-title')).toHaveText('Pan')
    await gfp.clickMode('Harmonics')
    await expect(page.locator('.gram-frame-guidance-title')).toHaveText('Harmonics')

    // Each line splits into the gesture and what it does, so the four gestures
    // of a mode compare down one column.
    const rows = page.locator('.gram-frame-guidance-row')
    expect(await rows.count()).toBeGreaterThanOrEqual(4)
    await expect(rows.first().locator('.gram-frame-guidance-trigger')).toHaveText('Click & drag')
    await expect(rows.first().locator('.gram-frame-guidance-outcome'))
      .toHaveText('to generate harmonic lines')
  })

  test('every mode carries the cross-mode gestures, not just Pan', async ({ page }) => {
    const reveal = page.locator('.gram-frame-guidance-reveal')
    if (await reveal.isVisible()) {
      await reveal.click()
    }

    // They are resolved ahead of mode delegation, so they have always worked
    // everywhere — but they were listed under Pan alone, and an analyst who
    // armed Cross Cursor first never learnt that Shift + drag zooms.
    const shared = page.locator('.gram-frame-guidance h4', { hasText: 'In every mode' })
    for (const mode of ['Pan', 'Cross Cursor', 'Harmonics', 'Sidebands', 'Doppler']) {
      await gfp.clickMode(mode)
      await expect(shared).toHaveCount(1)
      await expect(page.locator('.gram-frame-guidance-row', { hasText: 'Shift + drag' })).toHaveCount(1)
    }
  })

  test('Hide collapses the guidance column to its rail, and the reveal restores it', async ({ page }) => {
    const reveal = page.locator('.gram-frame-guidance-reveal')
    if (await reveal.isVisible()) {
      await reveal.click()
    }
    const column = page.locator('.gram-frame-guidance-column')
    const open = await column.boundingBox()

    await page.locator('.gram-frame-guidance-hide').click()
    const collapsed = await column.boundingBox()
    expect(collapsed.width).toBeLessThan(open.width)
    await expect(page.locator('.gram-frame-guidance-rail-label')).toBeVisible()
    expect((await gfp.getState()).guidanceCollapsed).toBe(true)

    await reveal.click()
    await expect(page.locator('.gram-frame-guidance')).toBeVisible()
    expect((await gfp.getState()).guidanceCollapsed).toBe(false)
  })
})
