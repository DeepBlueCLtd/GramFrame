import { test, expect } from '@playwright/test'

test.describe('Tab Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/sample/form-test.html')
    await page.waitForSelector('.gram-frame-container', { timeout: 10000 })
  })

  test('Tab should navigate between form fields when no GramFrame is focused', async ({ page }) => {
    const username = page.locator('#username')
    const password = page.locator('#password')
    const loginBtn = page.locator('#login-btn')

    // Focus username field
    await username.focus()
    await expect(username).toBeFocused()

    // Tab to password
    await page.keyboard.press('Tab')
    await expect(password).toBeFocused()

    // Tab to login button
    await page.keyboard.press('Tab')
    await expect(loginBtn).toBeFocused()
  })

  test('Shift+Tab should navigate in reverse between form fields', async ({ page }) => {
    const username = page.locator('#username')
    const password = page.locator('#password')
    const loginBtn = page.locator('#login-btn')

    // Focus login button
    await loginBtn.focus()
    await expect(loginBtn).toBeFocused()

    // Shift+Tab to password
    await page.keyboard.press('Shift+Tab')
    await expect(password).toBeFocused()

    // Shift+Tab to username
    await page.keyboard.press('Shift+Tab')
    await expect(username).toBeFocused()
  })

  test('Tab should work in form when GramFrame was never focused', async ({ page }) => {
    const username = page.locator('#username')
    const password = page.locator('#password')
    const gramContainer = page.locator('.gram-frame-container')

    // Verify GramFrame exists but is NOT focused initially
    await expect(gramContainer).toBeVisible()
    await expect(gramContainer).not.toHaveClass(/gram-frame-focused/)

    // Focus username field directly (without ever clicking GramFrame)
    await username.focus()
    await expect(username).toBeFocused()

    // Tab should navigate to password
    await page.keyboard.press('Tab')
    await expect(password).toBeFocused()
  })

  // R9-09: this used to assert the opposite — that Tab cycles a *custom*
  // focus between grams. That behaviour swallowed every Tab page-wide once
  // any gram was clicked, so on a page with two grams the host page's own
  // fields became unreachable by keyboard until the user clicked elsewhere.
  // Tab now belongs to the page, and DOM focus is what decides which gram the
  // arrow keys act on.
  test('Tab moves DOM focus into the gram\'s own controls, not between grams', async ({ page }) => {
    await page.goto('http://localhost:5173/debug-multiple.html')
    await page.waitForSelector('.gram-frame-container', { timeout: 10000 })

    const containers = page.locator('.gram-frame-container')
    const container1 = containers.first()

    await container1.click()
    await expect(container1).toHaveClass(/gram-frame-focused/)

    // Tab is not consumed: DOM focus moves to a real, focusable element.
    await page.keyboard.press('Tab')

    const focused = await page.evaluate(() => ({
      tag: document.activeElement?.tagName || '',
      isBody: document.activeElement === document.body
    }))
    expect(focused.isBody).toBe(false)
    expect(['BUTTON', 'INPUT', 'A', 'CANVAS', 'SELECT']).toContain(focused.tag)
  })

  test('with two grams, Tab still reaches the host page fields', async ({ page }) => {
    // Two grams is the case R9-09 is about: with one, the hijack was already
    // fixed in August (BH-3); with two or more, every Tab was consumed.
    await page.goto('/tests/fixtures/two-grams-form-page.html')
    await page.waitForSelector('.gram-frame-container', { timeout: 10000 })
    expect(await page.locator('.gram-frame-container').count()).toBeGreaterThan(1)

    // Click the first gram: this is the state that used to capture Tab for good.
    await page.locator('.gram-frame-container').first().click()
    await expect(page.locator('.gram-frame-container').first()).toHaveClass(/gram-frame-focused/)

    // Tab enough times to walk out of both components' controls. The exact
    // count is not the contract — reaching a host field at all is.
    let reached = ''
    for (let i = 0; i < 80 && !reached; i++) {
      await page.keyboard.press('Tab')
      reached = await page.evaluate(() => {
        const el = document.activeElement
        return el && (el.id === 'before-field' || el.id === 'after-field') ? el.id : ''
      })
    }
    expect(reached, 'Tab never reached a host-page field').toBeTruthy()
  })

  test('tabbing into a gram makes it the one the arrow keys act on', async ({ page }) => {
    await page.goto('http://localhost:5173/debug-multiple.html')
    await page.waitForSelector('.gram-frame-container', { timeout: 10000 })

    const containers = page.locator('.gram-frame-container')
    const container1 = containers.first()
    const container2 = containers.nth(1)

    await container1.click()
    await expect(container1).toHaveClass(/gram-frame-focused/)

    // Give DOM focus to a control inside the second gram, as a keyboard user
    // tabbing through the page would. Keyboard focus follows it. A mode button
    // rather than `button` first: the first command button is the zoom-out
    // control, which is disabled at 1x and so cannot take focus at all.
    await container2.locator('.gram-frame-mode-btn').first().focus()

    await expect(container2).toHaveClass(/gram-frame-focused/)
    await expect(container1).not.toHaveClass(/gram-frame-focused/)
  })
})
