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

  test('Tab should switch between GramFrame instances when one is focused', async ({ page }) => {
    // Navigate to page with multiple GramFrames
    await page.goto('http://localhost:5173/debug-multiple.html')
    await page.waitForSelector('.gram-frame-container', { timeout: 10000 })

    const containers = page.locator('.gram-frame-container')
    const container1 = containers.first()
    const container2 = containers.nth(1)

    // Click first GramFrame to focus it
    await container1.click()
    await page.waitForTimeout(100)
    await expect(container1).toHaveClass(/gram-frame-focused/)

    // Tab should move focus to next GramFrame
    await page.keyboard.press('Tab')
    await page.waitForTimeout(100)

    // Second container should now have focus
    await expect(container2).toHaveClass(/gram-frame-focused/)
    await expect(container1).not.toHaveClass(/gram-frame-focused/)
  })
})
