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

// ──────────────────────────────────────────────────────────────
// describeUserContext(): the same decision, with its evidence (issue #229)
// ──────────────────────────────────────────────────────────────

/**
 * Set document.body.innerHTML to `html`, import the storage module, and return
 * the result of describeUserContext().
 * @param {import('@playwright/test').Page} page
 * @param {string} html - markup to place in the body before detection
 * @returns {Promise<{context: string, matchedBy: string, reason: string}>}
 */
async function describeWith(page, html) {
  return page.evaluate(async (markup) => {
    document.body.innerHTML = markup
    const mod = await import('/src/core/storage.js')
    return mod.describeUserContext()
  }, html)
}

test('describeUserContext names the flag element that made the page a trainer page', async ({ page }) => {
  const result = await describeWith(page, '<p class="p edition-instructor gf-persistent">Instructor note</p>')
  expect(result.context).toBe('trainer')
  expect(result.matchedBy).toBe('flag')
  expect(result.reason).toContain('<p class="gf-persistent">')
})

test('describeUserContext reports every flag form the element carries', async ({ page }) => {
  const result = await describeWith(page, '<span id="gf-persistent" data-gf-persistent hidden></span>')
  expect(result.matchedBy).toBe('flag')
  expect(result.reason).toContain('span id="gf-persistent" data-gf-persistent')
})

test('describeUserContext distinguishes the legacy ANALYSIS anchor from an explicit flag', async ({ page }) => {
  const result = await describeWith(page, '<a href="#">ANALYSIS</a>')
  expect(result.context).toBe('trainer')
  expect(result.matchedBy).toBe('legacy-anchor')
  expect(result.reason).toContain('ANALYSIS')
})

test('describeUserContext says nothing matched on a student page', async ({ page }) => {
  const result = await describeWith(page, '<p>Ordinary student page content</p>')
  expect(result.context).toBe('student')
  expect(result.matchedBy).toBe('none')
  expect(result.reason).toContain('no gf-persistent flag')
})

test('detectUserContext agrees with describeUserContext', async ({ page }) => {
  const pair = await page.evaluate(async () => {
    document.body.innerHTML = '<span data-gf-persistent></span>'
    const mod = await import('/src/core/storage.js')
    return { detect: mod.detectUserContext(), describe: mod.describeUserContext().context }
  })
  expect(pair.detect).toBe(pair.describe)
})
