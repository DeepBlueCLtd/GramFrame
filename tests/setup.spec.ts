import { test, expect } from './helpers/fixtures'
import { expectValidMetadata, expectValidConfig, expectValidImageDetails, expectValidDisplayDimensions } from './helpers/state-assertions'

/**
 * Basic setup test to verify the test infrastructure
 */
test.describe('GramFrame Test Setup', () => {
  test('debug page loads correctly', async ({ gramFramePage }) => {
    // Verify the page title
    await expect(gramFramePage.page).toHaveTitle('GramFrame Debug Page')
    
    // Verify the component container exists
    await expect(gramFramePage.componentContainer).toBeVisible()
    
    // Verify the diagnostics panel exists
    await expect(gramFramePage.diagnosticsPanel).toBeVisible()
    
    // Get the current state
    const state = await gramFramePage.getState()
    
    // Verify state has valid metadata
    expectValidMetadata(state)
    
    // Verify state has valid config
    expectValidConfig(state, {
      timeMin: 0,
      timeMax: 60,
      freqMin: 0,
      freqMax: 100
    })
    
    // Verify image details
    expectValidImageDetails(state)
    
    // Verify display dimensions
    expectValidDisplayDimensions(state)
    
    // Verify the image is loaded on the canvas
    await gramFramePage.verifyImageLoaded()
    
    // Take a screenshot for reference
    await gramFramePage.page.screenshot({ path: './test-results/debug-page-loaded.png' })
  })
})
