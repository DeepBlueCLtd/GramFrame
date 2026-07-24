import { test, expect } from '@playwright/test'

/**
 * @fileoverview Legacy-browser compatibility warning tests (spec 162).
 *
 * Two layers:
 *  1. Unit tests of src/core/browserCompatibility.js, imported and exercised in
 *     the browser via page.evaluate against a controlled DOM (mirroring the
 *     detect-user-context.spec.js pattern).
 *  2. Integration tests: a modern browser renders normally (no warning), and a
 *     simulated legacy browser (Element.replaceChildren removed before init)
 *     shows the warning in place of every GramFrame.
 */

test.describe('browserCompatibility module (unit)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/fixtures/blank-page.html')
  })

  test('MIN_BROWSER_VERSION is derived from the required-API set (86)', async ({ page }) => {
    const version = await page.evaluate(async () => {
      const mod = await import('/src/core/browserCompatibility.js')
      return mod.MIN_BROWSER_VERSION
    })
    expect(version).toBe(86)
  })

  test('isBrowserSupported() is true on a modern browser with no missing APIs', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const mod = await import('/src/core/browserCompatibility.js')
      return { supported: mod.isBrowserSupported(), missing: mod.getMissingApis() }
    })
    expect(result.supported).toBe(true)
    expect(result.missing).toEqual([])
  })

  test('detects a missing required API and reports it as unsupported', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const mod = await import('/src/core/browserCompatibility.js')
      // Simulate a legacy browser lacking Element.replaceChildren.
      const original = Element.prototype.replaceChildren
      // @ts-ignore - deliberately removing a method for the test
      delete Element.prototype.replaceChildren
      const supported = mod.isBrowserSupported()
      const missing = mod.getMissingApis()
      // Restore so nothing else in the page breaks.
      Element.prototype.replaceChildren = original
      return { supported, missing }
    })
    expect(result.supported).toBe(false)
    expect(result.missing).toContain('Element.prototype.replaceChildren')
  })

  test('warning message names the minimum version, Chrome/Edge, and asks to update', async ({ page }) => {
    const message = await page.evaluate(async () => {
      const mod = await import('/src/core/browserCompatibility.js')
      return mod.getCompatibilityMessage()
    })
    expect(message).toContain('86')
    expect(message).toContain('Chrome')
    expect(message).toContain('Edge')
    expect(message.toLowerCase()).toContain('update')
  })

  test('createCompatibilityWarningElement() builds a labelled warning node', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const mod = await import('/src/core/browserCompatibility.js')
      const el = mod.createCompatibilityWarningElement()
      return {
        className: el.className,
        role: el.getAttribute('role'),
        text: el.textContent
      }
    })
    expect(result.className).toBe('gram-frame-compat-warning')
    expect(result.role).toBe('alert')
    expect(result.text).toContain('86')
    expect(result.text.toLowerCase()).toContain('update')
  })

  test('showCompatibilityWarning() replaces the table in place', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const mod = await import('/src/core/browserCompatibility.js')
      document.body.innerHTML =
        '<div id="host"><table class="gram-config" id="t1"></table></div>'
      const host = document.getElementById('host')
      const table = document.getElementById('t1')
      const inserted = mod.showCompatibilityWarning(table)
      return {
        tableStillPresent: !!document.getElementById('t1'),
        warningInHost: !!host.querySelector('.gram-frame-compat-warning'),
        returnedWarning: !!inserted && inserted.classList.contains('gram-frame-compat-warning')
      }
    })
    expect(result.tableStillPresent).toBe(false)
    expect(result.warningInHost).toBe(true)
    expect(result.returnedWarning).toBe(true)
  })

  test('showCompatibilityWarning() is a safe no-op for a detached table', async ({ page }) => {
    const returnedNull = await page.evaluate(async () => {
      const mod = await import('/src/core/browserCompatibility.js')
      const detached = document.createElement('table')
      return mod.showCompatibilityWarning(detached) === null
    })
    expect(returnedNull).toBe(true)
  })

  test('looksLikeMissingApiError() recognises missing-method errors but not others', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const mod = await import('/src/core/browserCompatibility.js')
      const f = mod.looksLikeMissingApiError
      return {
        notAFunction: f(new TypeError("x.replaceChildren is not a function")),
        notAConstructor: f(new TypeError("ResizeObserver is not a constructor")),
        legacyIeStyle: f(new TypeError("Object doesn't support property or method 'foo'")),
        // Genuine logic bug — must NOT be treated as a browser issue.
        nullDeref: f(new TypeError("Cannot read properties of undefined (reading 'x')")),
        // Config/validation error — must NOT be treated as a browser issue.
        configError: f(new Error("Invalid config: missing time-start")),
        nullish: f(null)
      }
    })
    expect(result.notAFunction).toBe(true)
    expect(result.notAConstructor).toBe(true)
    expect(result.legacyIeStyle).toBe(true)
    expect(result.nullDeref).toBe(false)
    expect(result.configError).toBe(false)
    expect(result.nullish).toBe(false)
  })
})

test.describe('Legacy-browser compatibility warning (integration)', () => {
  test('modern browser renders GramFrames with no warning (US2)', async ({ page }) => {
    await page.goto('/debug.html')
    await page.waitForFunction(() => window.GramFrame !== undefined)

    await expect(page.locator('.gram-frame-container')).toBeVisible()
    await expect(page.locator('.gram-frame-compat-warning')).toHaveCount(0)
  })

  test('unsupported browser shows the warning in place of every GramFrame (US1, FR-006)', async ({ page }) => {
    await page.goto('/tests/fixtures/legacy-browser-page.html')

    // Both config tables should be replaced by a warning, none left blank.
    await expect(page.locator('.gram-frame-compat-warning')).toHaveCount(2)

    // No interactive component should have been constructed.
    await expect(page.locator('.gram-frame-container')).toHaveCount(0)

    // The original tables are gone (replaced), not merely hidden.
    await expect(page.locator('table.gram-config')).toHaveCount(0)

    // The warning is actionable: names the version and tells the user to update.
    const firstWarning = page.locator('.gram-frame-compat-warning').first()
    const text = (await firstWarning.textContent()) || ''
    expect(text).toContain('86')
    expect(text).toContain('Chrome')
    expect(text.toLowerCase()).toContain('update')

    // And it is visible (not clipped to nothing).
    await expect(firstWarning).toBeVisible()
  })

  test('unanticipated missing API is still caught by the reactive net (class of error)', async ({ page }) => {
    await page.goto('/tests/fixtures/legacy-browser-unknown-api-page.html')

    // replaceChildren is present (proactive check passes), but a different
    // required method is missing, so construction throws. The reactive net
    // should show the compatibility warning rather than a blank/broken area...
    await expect(page.locator('.gram-frame-compat-warning')).toHaveCount(1)

    // ...and it should NOT fall back to the technical error indicator, since the
    // failure is a missing-method (browser) error, not a config error.
    await expect(page.locator('.gramframe-error-indicator')).toHaveCount(0)
    await expect(page.locator('.gram-frame-container')).toHaveCount(0)

    const warning = page.locator('.gram-frame-compat-warning').first()
    await expect(warning).toBeVisible()
    const text = (await warning.textContent()) || ''
    expect(text.toLowerCase()).toContain('update')
  })
})
