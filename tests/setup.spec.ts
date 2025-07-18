import { test, expect } from '@playwright/test'

/**
 * Basic setup test to verify the test infrastructure
 */
test.describe('GramFrame Test Setup', () => {
  test('debug page loads correctly', async ({ page }) => {
    // Navigate to the debug page
    await page.goto('/debug.html')
    
    // Verify the page title
    await expect(page).toHaveTitle('GramFrame Debug Page')
    
    // Verify the component container exists
    await expect(page.locator('.component-container')).toBeVisible()
    
    // Verify the diagnostics panel exists
    await expect(page.locator('.diagnostics-panel')).toBeVisible()
    
    // Wait for the component to initialize and update the state display
    await page.waitForFunction(() => {
      const stateDisplay = document.getElementById('state-display')
      return stateDisplay && stateDisplay.textContent && 
             !stateDisplay.textContent.includes('Loading...')
    })
    
    // Verify that the state display contains valid JSON
    const stateContent = await page.locator('#state-display').textContent()
    expect(stateContent).toBeTruthy()
    
    // Verify that the state content can be parsed as JSON
    let stateJson
    try {
      stateJson = JSON.parse(stateContent || '{}')
      expect(stateJson).toHaveProperty('version')
      expect(stateJson).toHaveProperty('mode')
    } catch (e) {
      throw new Error(`State display does not contain valid JSON: ${stateContent}`)
    }
    
    // Take a screenshot for reference
    await page.screenshot({ path: './test-results/debug-page-loaded.png' })
  })
})
