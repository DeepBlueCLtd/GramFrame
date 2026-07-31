import { test, expect } from '@playwright/test'

/**
 * Unit tests for detectUserContext() and TRAINER_FLAG_SELECTOR in
 * src/core/storage.js.
 *
 * The module touches `document`, so it is imported and exercised in the
 * browser via page.evaluate against a controlled DOM. A deliberately empty
 * fixture (blank-page.html) is used so no GramFrame instance interferes with
 * detection.
 */

/**
 * Set document.body.innerHTML to `html`, import the storage module, and return
 * the result of detectUserContext().
 * @param {import('@playwright/test').Page} page
 * @param {string} html - markup to place in the body before detection
 * @returns {Promise<'trainer' | 'student'>}
 */
async function detectWith(page, html) {
  return page.evaluate(async (markup) => {
    document.body.innerHTML = markup
    const mod = await import('/src/core/storage.js')
    return mod.detectUserContext()
  }, html)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/fixtures/blank-page.html')
})

test('returns "trainer" for the legacy id="gf-persistent" flag', async ({ page }) => {
  const context = await detectWith(page, '<span id="gf-persistent" hidden></span>')
  expect(context).toBe('trainer')
})

test('returns "trainer" for the class="gf-persistent" flag (DITA outputclass)', async ({ page }) => {
  const context = await detectWith(page, '<span class="p edition-instructor gf-persistent"></span>')
  expect(context).toBe('trainer')
})

test('returns "trainer" for the data-gf-persistent attribute flag', async ({ page }) => {
  const context = await detectWith(page, '<span data-gf-persistent></span>')
  expect(context).toBe('trainer')
})

test('returns "trainer" for the legacy ANALYSIS anchor heuristic', async ({ page }) => {
  const context = await detectWith(page, '<a href="#">ANALYSIS</a>')
  expect(context).toBe('trainer')
})

test('returns "student" when no flag is present', async ({ page }) => {
  const context = await detectWith(page, '<p>Ordinary student page content</p>')
  expect(context).toBe('student')
})

test('TRAINER_FLAG_SELECTOR is exported and matches all three flag forms', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const mod = await import('/src/core/storage.js')
    document.body.innerHTML =
      '<span id="gf-persistent"></span>' +
      '<span class="gf-persistent"></span>' +
      '<span data-gf-persistent></span>'
    return {
      selector: mod.TRAINER_FLAG_SELECTOR,
      matches: document.querySelectorAll(mod.TRAINER_FLAG_SELECTOR).length
    }
  })
  expect(typeof result.selector).toBe('string')
  expect(result.selector).toContain('#gf-persistent')
  expect(result.selector).toContain('.gf-persistent')
  expect(result.selector).toContain('[data-gf-persistent]')
  expect(result.matches).toBe(3)
})
