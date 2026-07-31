import { test, expect } from '@playwright/test'

/**
 * @fileoverview Mechanical consistency fixes (spec 165, User Story 4).
 *
 * GF-12: "Clear gram" rebuilds the annotation-bearing state from the
 *        initial-state builders, so a field added to a mode later cannot
 *        survive a clear by being forgotten in a hand-written reset.
 * GF-24: every GramFrameAPI method reads the same instance registry.
 */

/**
 * Add an analysis marker at a position on the first instance.
 * @param {import('@playwright/test').Page} page
 * @param {number} x
 * @param {number} y
 */
async function addMarker(page, x, y) {
  await page.locator('.gram-frame-mode-btn:text("Cross Cursor")').first().click()
  await page.locator('.gram-frame-svg').first().click({ position: { x, y } })
}

test.describe('Clear gram rebuilds state from the initial-state builders (GF-12)', () => {
  test('cleared state deep-equals a fresh state, keeping config and image details', async ({ page }) => {
    await page.goto('/tests/fixtures/trainer-page.html')
    await page.locator('.gram-frame-container').waitFor()

    // Annotate in every mode, and leave a selection behind.
    await addMarker(page, 200, 150)
    await addMarker(page, 260, 180)

    await page.locator('.gram-frame-mode-btn:text("Harmonics")').first().click()
    const svg = page.locator('.gram-frame-svg').first()
    const box = await svg.boundingBox()
    if (!box) throw new Error('SVG not found')
    await page.mouse.move(box.x + 200, box.y + 120)
    await page.mouse.down()
    await page.mouse.move(box.x + 320, box.y + 180, { steps: 5 })
    await page.mouse.up()

    await page.locator('.gram-frame-mode-btn:text("Doppler")').first().click()
    await page.mouse.move(box.x + 180, box.y + 100)
    await page.mouse.down()
    await page.mouse.move(box.x + 300, box.y + 220, { steps: 5 })
    await page.mouse.up()

    const before = await page.evaluate(
      () => window.GramFrame.__test__getInstances()[0].state
    )
    expect(before.analysis.markers.length).toBeGreaterThan(0)
    expect(before.harmonics.harmonicSets.length).toBeGreaterThan(0)
    expect(before.doppler.fPlus).not.toBeNull()

    await page.locator('.gram-frame-clear-btn').click()

    const result = await page.evaluate(async () => {
      const { createInitialState } = await import('/src/core/state.js')
      const fresh = createInitialState()
      const state = window.GramFrame.__test__getInstances()[0].state
      // Slices the clear is responsible for, compared against a fresh state.
      const cleared = {}
      const expected = {}
      for (const key of ['analysis', 'harmonics', 'doppler', 'selection', 'dragState', 'cursors']) {
        cleared[key] = state[key]
        expected[key] = fresh[key]
      }
      return {
        cleared,
        expected,
        config: state.config,
        imageDetails: state.imageDetails,
        mode: state.mode
      }
    })

    expect(result.cleared).toEqual(result.expected)

    // What describes this gram survives the clear.
    expect(result.config).toEqual(before.config)
    expect(result.imageDetails).toEqual(before.imageDetails)
    expect(result.mode).toBe('doppler')
  })
})

test.describe('The API has a single instance registry (GF-24)', () => {
  test('every method sees the same instances, and a detached one is dropped by all', async ({ page }) => {
    await page.goto('/debug-multiple.html')
    await page.locator('.gram-frame-container').first().waitFor()

    const before = await page.evaluate(() => {
      const api = window.GramFrame
      let listenerCalls = 0
      const listener = () => { listenerCalls++ }
      api.addStateListener(listener)
      api.__test__forceUpdate()
      const instances = api.__test__getInstances()
      api.removeStateListener(listener)
      return {
        registryCount: instances.length,
        containerCount: document.querySelectorAll('.gram-frame-container').length,
        // One immediate call per instance from addStateListener, plus one each
        // from forceUpdate: the same set both times.
        listenerCalls
      }
    })

    expect(before.registryCount).toBe(before.containerCount)
    expect(before.listenerCalls).toBe(before.registryCount * 2)

    // Detach one instance's container: every method must agree it is gone.
    const after = await page.evaluate(() => {
      const api = window.GramFrame
      const doomed = api.__test__getInstances()[0]
      const doomedId = doomed.instanceId
      doomed.destroy()

      let listenerCalls = 0
      const listener = () => { listenerCalls++ }
      api.addStateListener(listener)
      api.__test__forceUpdate()
      const instances = api.__test__getInstances()
      api.removeStateListener(listener)

      return {
        registryCount: instances.length,
        containerCount: document.querySelectorAll('.gram-frame-container').length,
        lookupOfDestroyed: api.__test__getInstance(doomedId),
        listenerCalls
      }
    })

    expect(after.registryCount).toBe(before.registryCount - 1)
    expect(after.registryCount).toBe(after.containerCount)
    expect(after.lookupOfDestroyed).toBeNull()
    expect(after.listenerCalls).toBe(after.registryCount * 2)
  })
})
