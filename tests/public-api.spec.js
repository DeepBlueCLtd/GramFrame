import { test, expect } from '@playwright/test'

/**
 * @fileoverview The documented public API, exercised as a consumer would
 * (spec 167, FR-010, SC-006).
 *
 * Two things make this file different from every other spec here.
 *
 * It runs against `tests/fixtures/published-page.html`, which deliberately does
 * **not** set `window.GRAMFRAME_DEBUG`. So it proves the API works without the
 * `__test__` hooks — and it fails if those hooks ever leak onto a page that did
 * not ask for them.
 *
 * And every assertion is behavioural. The previous coverage of
 * `detectAndReplaceConfigTables` and `addStateListener` was
 * `expect(typeof …).toBe('function')`, which passes against an empty function
 * body. Each method here is asserted on what it *does*.
 */

/** Selector for the component's root container. */
const CONTAINER = '.gram-frame-container'

/**
 * Append a config table to the page and return how many exist afterwards.
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {string} id - Element id for the new table
 * @returns {Promise<void>}
 */
async function appendConfigTable(page, id) {
  await page.evaluate((tableId) => {
    const table = document.createElement('table')
    table.className = 'gram-config'
    table.id = tableId
    table.innerHTML =
      '<tr><td colspan="2"><img src="../../sample/mock-gram.png"></td></tr>' +
      '<tr><td>time-start</td><td>0</td></tr>' +
      '<tr><td>time-end</td><td>60</td></tr>' +
      '<tr><td>freq-start</td><td>0</td></tr>' +
      '<tr><td>freq-end</td><td>100</td></tr>'
    document.body.appendChild(table)
  }, id)
}

test.describe('The public API on a page with no debug hooks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/fixtures/published-page.html')
    await page.locator(CONTAINER).first().waitFor()
  })

  test('the debug hooks are absent, and the public API is not', async ({ page }) => {
    const surface = await page.evaluate(() => ({
      debug: Object.keys(window.GramFrame).filter((k) => k.startsWith('__test__')),
      documented: [
        'init',
        'detectAndReplaceConfigTables',
        'addStateListener',
        'removeStateListener',
        'getExpandState',
        'setExpandState'
      ].filter((k) => typeof window.GramFrame[k] === 'function')
    }))

    expect(surface.debug).toEqual([])
    expect(surface.documented).toHaveLength(6)
  })

  test('init() replaces every config table on the page with a component', async ({ page }) => {
    // Auto-init already ran on DOMContentLoaded, so this asserts the observable
    // result of it and then that a second call is idempotent rather than
    // doubling the components up.
    await expect(page.locator(CONTAINER)).toHaveCount(1)
    await expect(page.locator('table.gram-config')).toHaveCount(0)

    await page.evaluate(() => window.GramFrame.init())
    await expect(page.locator(CONTAINER)).toHaveCount(1)
  })

  test('detectAndReplaceConfigTables replaces a table added after load', async ({ page }) => {
    await appendConfigTable(page, 'late-table')
    await expect(page.locator('table#late-table')).toHaveCount(1)

    await page.evaluate(() => window.GramFrame.detectAndReplaceConfigTables(document.body))

    // The table is gone and a second component stands in its place.
    await expect(page.locator('table#late-table')).toHaveCount(0)
    await expect(page.locator(CONTAINER)).toHaveCount(2)
  })

  test('detectAndReplaceConfigTables scoped to a container leaves tables outside it alone', async ({ page }) => {
    await page.evaluate(() => {
      const scoped = document.createElement('div')
      scoped.id = 'scoped'
      document.body.appendChild(scoped)
    })
    await appendConfigTable(page, 'outside-table')

    await page.evaluate(() =>
      window.GramFrame.detectAndReplaceConfigTables(
        /** @type {HTMLElement} */ (document.getElementById('scoped'))
      )
    )

    // The container held no config table, so nothing was replaced.
    await expect(page.locator('table#outside-table')).toHaveCount(1)
    await expect(page.locator(CONTAINER)).toHaveCount(1)
  })

  test('addStateListener delivers the current state immediately, then on every change', async ({ page }) => {
    // The listener collects into a page-level array so the click below can be a
    // real Playwright click — auto-waiting for the button to be actionable —
    // rather than a synthetic one raced against a fixed timeout.
    const immediate = await page.evaluate(() => {
      /** @type {any[]} */
      const seen = []
      window.__seen = seen
      window.__listener = (/** @type {any} */ state) => { seen.push(state) }
      window.GramFrame.addStateListener(window.__listener)
      return seen.length
    })

    // Called once on registration, with a full state.
    expect(immediate).toBe(1)
    const first = await page.evaluate(() => window.__seen[0])
    expect(first.mode).toBe('pan')
    expect(first.config).toBeTruthy()
    expect(first.imageDetails).toBeTruthy()

    // A real user action: switch mode by clicking the button a consumer clicks.
    await page.locator('.gram-frame-mode-btn[data-mode="harmonics"]').click()

    // Poll rather than sleep: notifications are coalesced, so the delivery
    // lands on a microtask or a frame and neither is a fixed duration.
    await expect
      .poll(async () => page.evaluate(() => window.__seen[window.__seen.length - 1].mode))
      .toBe('harmonics')
    expect(await page.evaluate(() => window.__seen.length)).toBeGreaterThan(1)

    await page.evaluate(() => window.GramFrame.removeStateListener(window.__listener))
  })

  test('the state a listener receives is a copy, so mutating it cannot corrupt the component', async ({ page }) => {
    const result = await page.evaluate(async () => {
      /** @type {any} */
      let delivered = null
      const first = (/** @type {any} */ state) => {
        delivered = state
        state.frequencyRate = 9999
        state.config.freqMax = -1
      }
      window.GramFrame.addStateListener(first)
      window.GramFrame.removeStateListener(first)

      /** @type {any} */
      let fresh = null
      const second = (/** @type {any} */ state) => { fresh = state }
      window.GramFrame.addStateListener(second)
      window.GramFrame.removeStateListener(second)

      return { mutatedRate: delivered.frequencyRate, liveRate: fresh.frequencyRate, liveFreqMax: fresh.config.freqMax }
    })

    expect(result.mutatedRate).toBe(9999)
    expect(result.liveRate).toBe(1)
    expect(result.liveFreqMax).toBeGreaterThan(0)
  })

  test('removeStateListener stops delivery and reports whether it removed anything', async ({ page }) => {
    const registration = await page.evaluate(() => {
      window.__calls = 0
      window.__listener = () => { window.__calls++ }
      window.GramFrame.addStateListener(window.__listener)
      return {
        afterRegistration: window.__calls,
        removed: window.GramFrame.removeStateListener(window.__listener),
        removedTwice: window.GramFrame.removeStateListener(window.__listener),
        neverAdded: window.GramFrame.removeStateListener(() => {})
      }
    })

    expect(registration.afterRegistration).toBe(1)
    expect(registration.removed).toBe(true)
    expect(registration.removedTwice).toBe(false)
    expect(registration.neverAdded).toBe(false)

    // Provoke a real change, and confirm it *did* happen — otherwise "the
    // listener was not called" would pass for the wrong reason.
    await page.locator('.gram-frame-mode-btn[data-mode="analysis"]').click()
    await expect(page.locator('.gram-frame-mode-btn[data-mode="analysis"]')).toHaveClass(/active/)

    // A removed listener saw none of it: still just its registration call.
    expect(await page.evaluate(() => window.__calls)).toBe(1)
  })

  test('addStateListener rejects a non-function rather than failing later', async ({ page }) => {
    const threw = await page.evaluate(() => {
      try {
        // @ts-expect-error - deliberately wrong, which is the point
        window.GramFrame.addStateListener('not a function')
        return false
      } catch {
        return true
      }
    })
    expect(threw).toBe(true)
  })

  test('setExpandState resizes the image and getExpandState reports it', async ({ page }) => {
    const image = page.locator('.gram-frame-spectrogram-image').first()
    await expect(image).toHaveAttribute('width', /\d/)

    const collapsedWidth = Number(await image.getAttribute('width'))
    expect(await page.evaluate(() => window.GramFrame.getExpandState())).toBe(false)

    await page.evaluate(() => window.GramFrame.setExpandState(true))

    // Behavioural, not a state read: the drawn image is actually wider.
    await expect
      .poll(async () => Number(await image.getAttribute('width')))
      .toBeGreaterThan(collapsedWidth)
    expect(await page.evaluate(() => window.GramFrame.getExpandState())).toBe(true)

    await page.evaluate(() => window.GramFrame.setExpandState(false))
    await expect
      .poll(async () => Number(await image.getAttribute('width')))
      .toBe(collapsedWidth)
    expect(await page.evaluate(() => window.GramFrame.getExpandState())).toBe(false)
  })

  test('setExpandState is idempotent', async ({ page }) => {
    const image = page.locator('.gram-frame-spectrogram-image').first()
    const collapsedWidth = Number(await image.getAttribute('width'))

    await page.evaluate(() => {
      window.GramFrame.setExpandState(true)
      window.GramFrame.setExpandState(true)
    })
    await expect
      .poll(async () => Number(await image.getAttribute('width')))
      .toBeGreaterThan(collapsedWidth)
    expect(await page.evaluate(() => window.GramFrame.getExpandState())).toBe(true)
  })
})
