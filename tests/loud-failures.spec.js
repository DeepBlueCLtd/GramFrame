import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { test, expect } from '@playwright/test'

/**
 * Read a source file from the repository.
 * @param {string} relativePath - Path relative to the repository root
 * @returns {string} File contents
 */
function readSource(relativePath) {
  return readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), 'utf8')
}

/**
 * @fileoverview Silent-failure removal (spec 165, User Story 2 — GF-04, GF-16).
 *
 * Two previously-silent paths must now be visible:
 *   1. Mode construction failure — was a console.warn plus a no-op BaseMode on
 *      every host except localhost. Now it always propagates and the API shows
 *      the standard `.gramframe-error-indicator`.
 *   2. Storage write failure — was a bare `catch {}` whose boolean every caller
 *      ignored. Now a failed save/clear raises a non-blocking banner while the
 *      session keeps working in memory.
 *
 * Hostname independence is asserted against the factory source rather than by
 * loading a second origin: the dev server binds only the baseURL host, so a
 * `http://127.0.0.1:5173` navigation is refused on CI. With the branch gone from
 * the source, the behavioural tests below prove the same thing from any origin.
 */

test.describe('Mode construction fails loudly (GF-04)', () => {
  test('a throwing mode surfaces the error indicator', async ({ page }) => {
    await page.goto('/tests/fixtures/mode-failure-page.html')

    // The failure is reported where the component would have been...
    await expect(page.locator('.gramframe-error-indicator')).toHaveCount(1)
    await expect(page.locator('.gramframe-error-indicator')).toBeVisible()

    // ...and no half-working component is left behind.
    await expect(page.locator('.gram-frame-container')).toHaveCount(0)

    // It is a technical error, not a browser-compatibility one.
    await expect(page.locator('.gram-frame-compat-warning')).toHaveCount(0)
  })

  test('the original error is logged alongside the indicator', async ({ page }) => {
    /** @type {string[]} */
    const errors = []
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.goto('/tests/fixtures/mode-failure-page.html')
    await expect(page.locator('.gramframe-error-indicator')).toHaveCount(1)

    expect(errors.some(text => text.includes('Failed to create mode'))).toBe(true)
    expect(errors.some(text => text.includes('simulated mode construction failure'))).toBe(true)
  })

  test('ModeFactory throws for an unknown mode instead of returning a no-op BaseMode', async ({ page }) => {
    // A page where the component is already loaded: importing ModeFactory into
    // a bare page would trip the state ⇄ modes import cycle (GF-03) instead of
    // testing anything about the factory.
    await page.goto('/debug.html')
    await page.locator('.gram-frame-container').first().waitFor()

    const result = await page.evaluate(async () => {
      const { ModeFactory } = await import('/src/modes/ModeFactory.js')
      try {
        const mode = ModeFactory.createMode(/** @type {any} */ ('nonexistent'), {})
        return { threw: false, constructed: mode && mode.constructor.name }
      } catch (error) {
        return {
          threw: true,
          message: error instanceof Error ? error.message : String(error),
          hasCause: !!(error && /** @type {any} */ (error).cause)
        }
      }
    })

    expect(result.threw).toBe(true)
    expect(result.message).toContain('nonexistent')
    // The original error is preserved for diagnosis, not flattened to a string.
    expect(result.hasCause).toBe(true)
  })

  test('no hostname special case remains in the factory source', () => {
    // The old code threw only on localhost and fell back to a no-op BaseMode
    // everywhere else. Both halves of that branch must be absent, which is what
    // makes the behaviour above hold on every host rather than only under test.
    const source = readSource('src/modes/ModeFactory.js')
    expect(source).not.toMatch(/location\??\.hostname/)
    expect(source).not.toContain('new BaseMode')
  })
})

test.describe('Storage failures are visible (GF-16)', () => {
  /**
   * Make every storage write throw, the way a full quota or a locked-down
   * private-browsing profile does, before GramFrame loads.
   * @param {import('@playwright/test').Page} page
   */
  async function breakStorageWrites(page) {
    await page.addInitScript(() => {
      // Patched on the prototype: Storage instances are exotic objects whose
      // own-property writes become storage entries, so patching them directly
      // silently does nothing.
      const blow = function () {
        const err = new Error('QuotaExceededError: simulated storage failure')
        err.name = 'QuotaExceededError'
        throw err
      }
      Storage.prototype.setItem = blow
      Storage.prototype.removeItem = blow
    })
  }

  /**
   * Place an analysis marker, which triggers an annotation save.
   * @param {import('@playwright/test').Page} page
   */
  async function placeMarker(page) {
    await page.locator('.gram-frame-mode-btn:text("Cross Cursor")').click()
    await page.locator('.gram-frame-svg').first().click({ position: { x: 200, y: 100 } })
  }

  test('a failed annotation save raises a non-blocking banner and work continues', async ({ page }) => {
    await breakStorageWrites(page)
    await page.goto('/tests/fixtures/trainer-page.html')
    await page.locator('.gram-frame-container').waitFor()

    // Healthy start: no warning before anything has been written.
    await expect(page.locator('.gram-frame-storage-warning')).toHaveCount(0)

    await placeMarker(page)

    const warning = page.locator('.gram-frame-storage-warning')
    await expect(warning).toHaveCount(1)
    await expect(warning).toBeVisible()
    expect((await warning.textContent()) || '').toContain('could not be saved')

    // Non-blocking: the marker still exists in memory and the component works.
    const markerCount = await page.evaluate(
      () => window.GramFrame.__test__getInstances()[0].state.analysis.markers.length
    )
    expect(markerCount).toBe(1)

    // And the analyst can dismiss it.
    await warning.locator('.gram-frame-storage-warning-dismiss').click()
    await expect(page.locator('.gram-frame-storage-warning')).toHaveCount(0)
  })

  test('healthy storage shows no new UI', async ({ page }) => {
    await page.goto('/tests/fixtures/trainer-page.html')
    await page.locator('.gram-frame-container').waitFor()

    await placeMarker(page)

    await expect(page.locator('.gram-frame-storage-warning')).toHaveCount(0)
    const saved = await page.evaluate(() => {
      const keys = []
      for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i))
      return keys.filter(k => k && k.startsWith('gramframe::'))
    })
    expect(saved.length).toBeGreaterThan(0)
  })

  test('storage.js has no bare catch blocks left', () => {
    expect(readSource('src/core/storage.js')).not.toMatch(/}\s*catch\s*{/)
  })
})
