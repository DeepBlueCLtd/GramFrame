import { test, expect } from '@playwright/test'

/**
 * @fileoverview Lifecycle and API-surface hygiene (spec 165, User Story 6).
 *
 * GF-23: the `__test__*` methods only exist on pages that opt in with
 *        `window.GRAMFRAME_DEBUG`; a published page gets the public API only.
 * GF-14: destroying the last instance uninstalls the shared document-level
 *        keydown handler, and destroy() removes the listeners it attached.
 */

test.describe('The test API is opt-in (GF-23)', () => {
  test('a page without the debug flag gets no __test__ methods', async ({ page }) => {
    // A fixture that mirrors published training material: no debug flag.
    await page.goto('/tests/fixtures/published-page.html')
    await page.locator('.gram-frame-container').first().waitFor()

    const surface = await page.evaluate(() => {
      const api = window.GramFrame
      return {
        publicApiPresent: typeof api.init === 'function' && typeof api.addStateListener === 'function',
        testMethods: Object.keys(api).filter(key => key.startsWith('__test__'))
      }
    })

    expect(surface.publicApiPresent).toBe(true)
    expect(surface.testMethods).toEqual([])
  })

  test('a page with the debug flag gets them, so the helpers keep working', async ({ page }) => {
    await page.goto('/debug.html')
    await page.locator('.gram-frame-container').first().waitFor()

    const surface = await page.evaluate(() => ({
      flag: window.GRAMFRAME_DEBUG === true,
      testMethods: Object.keys(window.GramFrame).filter(key => key.startsWith('__test__')).sort(),
      instances: window.GramFrame.__test__getInstances().length
    }))

    expect(surface.flag).toBe(true)
    expect(surface.testMethods).toEqual([
      '__test__clearGlobalStateListeners',
      '__test__flushDispatches',
      '__test__forceUpdate',
      '__test__getGlobalStateListeners',
      '__test__getInstance',
      '__test__getInstances'
    ])
    expect(surface.instances).toBeGreaterThan(0)
  })
})

test.describe('Destroy removes what it installed (GF-14)', () => {
  test('the global keydown handler stops running once the last instance is destroyed', async ({ page }) => {
    await page.goto('/debug-multiple.html')
    await page.locator('.gram-frame-container').first().waitFor()

    // Probed with ArrowRight on a selected marker rather than with Tab: Tab is
    // the host page's key now and is deliberately never consumed (R9-09), so it
    // can no longer tell a live handler from a dead one. Nudging a selection is
    // the arrow-key path the handler actually owns.
    const consumedWhileAlive = await page.evaluate(() => {
      const instance = window.GramFrame.__test__getInstances()[0]
      // Focusing an instance is what makes the shared handler act at all.
      instance.ui.svg.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      const analysis = /** @type {any} */ (instance.modes['analysis'])
      analysis.createMarkerAtPosition({ time: 30, freq: 50 })
      const index = instance.state.analysis.markers.length - 1
      const marker = instance.state.analysis.markers[index]
      instance.interaction.setSelection('marker', marker.id, index)
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
      document.dispatchEvent(event)
      return event.defaultPrevented
    })
    expect(consumedWhileAlive).toBe(true)

    // Destroy every instance, then check no handler reacts any more.
    const consumedAfterDestroy = await page.evaluate(() => {
      window.GramFrame.__test__getInstances().slice().forEach(instance => instance.destroy())
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
      document.dispatchEvent(event)
      return event.defaultPrevented
    })
    expect(consumedAfterDestroy).toBe(false)
  })

  test('destroy() removes the listeners it registered', async ({ page }) => {
    await page.goto('/debug.html')
    await page.locator('.gram-frame-container').first().waitFor()

    const result = await page.evaluate(() => {
      const instance = window.GramFrame.__test__getInstances()[0]
      const svg = instance.ui.svg
      const before = instance.interaction._registeredListeners.length

      let movesAfterDestroy = 0
      const originalMouseMove = instance.state.cursorPosition
      instance.destroy()
      // The SVG is detached with the container, but the listeners themselves
      // must be gone: dispatching on it should not update the instance state.
      svg.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 200, clientY: 120 }))
      if (instance.state.cursorPosition !== originalMouseMove) movesAfterDestroy++

      return {
        before,
        after: instance.interaction._registeredListeners.length,
        movesAfterDestroy
      }
    })

    expect(result.before).toBeGreaterThan(0)
    expect(result.after).toBe(0)
    expect(result.movesAfterDestroy).toBe(0)
  })
})
