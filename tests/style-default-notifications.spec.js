import { test, expect } from './helpers/fixtures.js'

/**
 * @fileoverview Changing a "next feature" style default notifies listeners
 * (R9-15 / BH-30, issue #268).
 *
 * With nothing selected, the colour slider, symbol drop-down, pin toggle and
 * "Large" toggle each set the style the *next* created feature will carry.
 * Only the "Large" toggle dispatched; the other three wrote to state silently,
 * so a host page listening for state changes never learned the analyst had
 * changed the default — and the value it held went stale until something else
 * happened to dispatch.
 */

/**
 * Count the state notifications an action produces.
 * @param {import('@playwright/test').Page} page - The page
 * @param {() => Promise<void>} act - The action to perform
 * @returns {Promise<number>} Notifications delivered while acting
 */
async function countNotifications(page, act) {
  await page.evaluate(() => {
    // One hoisted cast, not one per line: a statement beginning `(window)`
    // after a line ending in a value is parsed as a call, not a new statement.
    const w = /** @type {any} */ (window)
    w.__styleDefaultCount = 0
    w.__styleDefaultListener = () => { w.__styleDefaultCount++ }
    // Adding a listener calls it once immediately; count from after that.
    window.GramFrame.addStateListener(w.__styleDefaultListener)
    w.__styleDefaultCount = 0
  })

  await act()

  return await page.evaluate(async () => {
    const w = /** @type {any} */ (window)
    // Notifications are coalesced onto a microtask/frame, so let them land.
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
    const count = w.__styleDefaultCount
    window.GramFrame.removeStateListener(w.__styleDefaultListener)
    return count
  })
}

test.describe('A style default change reaches state listeners (R9-15, #268)', () => {
  test('picking a symbol with nothing selected notifies', async ({ gramFramePage }) => {
    const page = gramFramePage.page
    await gramFramePage.clickMode('Cross Cursor')

    const count = await countNotifications(page, () => gramFramePage.selectSymbol('diamond'))

    // Was 0: the drop-down set state.selectedSymbol and said nothing.
    expect(count).toBeGreaterThan(0)
    const state = await gramFramePage.getState()
    expect(state.selectedSymbol).toBe('diamond')
  })

  test('toggling the pin preference with nothing selected notifies', async ({ gramFramePage }) => {
    const page = gramFramePage.page
    await gramFramePage.clickMode('Harmonics')

    const before = await gramFramePage.getState()
    const target = !before.showHarmonicPin

    const count = await countNotifications(page, () => gramFramePage.setPinToggle(target))

    // Was 0: the toggle wrote state.showHarmonicPin and saved the preference,
    // but never told a listener.
    expect(count).toBeGreaterThan(0)
    const state = await gramFramePage.getState()
    expect(state.showHarmonicPin).toBe(target)
  })

  test('picking a colour with nothing selected notifies', async ({ gramFramePage }) => {
    const page = gramFramePage.page
    await gramFramePage.clickMode('Cross Cursor')

    const before = await gramFramePage.getState()

    // Click the colour slider away from its current position. The canvas maps
    // x to a hue, so any distinct x gives a different colour.
    const count = await countNotifications(page, async () => {
      const canvas = page.locator('.gram-frame-color-canvas')
      const box = await canvas.boundingBox()
      if (!box) throw new Error('no colour canvas on the page')
      await canvas.click({ position: { x: box.width * 0.8, y: box.height / 2 } })
    })

    // Was 0: state.selectedColor changed with no notification.
    expect(count).toBeGreaterThan(0)
    const state = await gramFramePage.getState()
    expect(state.selectedColor).not.toBe(before.selectedColor)
  })
})
