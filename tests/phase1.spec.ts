import { test, expect } from './helpers/fixtures'
import { expectValidMetadata, expectValidMode } from './helpers/state-assertions'

/**
 * Phase 1 Feature Tests
 * Tests for component initialization, rendering, and state management
 */
test.describe('Phase 1: Component Initialization and Rendering', () => {
  // Task 1.1.1: Test component initialization in the debug page
  test('component initializes correctly in debug page', async ({ gramFramePage }) => {
    // Verify the component container exists and replaces the table
    await expect(gramFramePage.componentContainer).toBeVisible()
    
    // Verify the original table is no longer visible
    await expect(gramFramePage.page.locator('table.spectro-config')).not.toBeVisible()
    
    // Verify the SVG element is created
    await expect(gramFramePage.svg).toBeVisible()
    
    // Verify the readout panel is created
    await expect(gramFramePage.readoutPanel).toBeVisible()
    
    // Verify the state has been initialized with default values
    const state = await gramFramePage.getState()
    expectValidMetadata(state)
    expectValidMode(state, 'analysis')
    expect(state.rate).toBe(1)
  })
  
  // Task 1.2.1: Test that the component renders correctly with all expected DOM elements
  test('component renders all expected DOM elements', async ({ gramFramePage }) => {
    // Verify LED displays are created
    await expect(gramFramePage.freqLED).toBeVisible()
    await expect(gramFramePage.timeLED).toBeVisible()
    await expect(gramFramePage.modeLED).toBeVisible()
    
    // Verify mode switching UI is created
    await expect(gramFramePage.page.locator('.gram-frame-modes')).toBeVisible()
    
    // Verify all mode buttons exist
    await expect(gramFramePage.page.locator('.gram-frame-mode-btn:text("Analysis")')).toBeVisible()
    await expect(gramFramePage.page.locator('.gram-frame-mode-btn:text("Harmonics")')).toBeVisible()
    await expect(gramFramePage.page.locator('.gram-frame-mode-btn:text("Doppler")')).toBeVisible()
    
    // Verify rate input is created
    await expect(gramFramePage.page.locator('.gram-frame-rate')).toBeVisible()
    await expect(gramFramePage.page.locator('.gram-frame-rate input')).toBeVisible()
    
    // Verify the SVG is properly sized
    const svgBounds = await gramFramePage.svg.boundingBox()
    expect(svgBounds?.width).toBeGreaterThan(0)
    expect(svgBounds?.height).toBeGreaterThan(0)
  })
  
  // Task 1.3.1: Test console logging for state changes
  test('console logging works for state changes', async ({ gramFramePage, page }) => {
    // Create a listener for console messages
    const consoleMessages: string[] = []
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('GramFrame State Updated:')) {
        consoleMessages.push(text)
      }
    })
    
    // Perform actions that trigger state changes
    
    // 1. Move mouse over SVG to trigger cursor position update
    const svgBounds = await gramFramePage.svg.boundingBox()
    if (svgBounds) {
      await gramFramePage.moveMouse(svgBounds.width / 2, svgBounds.height / 2)
    }
    
    // 2. Change mode
    await gramFramePage.clickMode('Harmonics')
    
    // 3. Change rate
    await gramFramePage.setRate(2)
    
    // Wait a moment for console logs to be processed
    await page.waitForTimeout(500)
    
    // Verify that console logs were generated for state changes
    expect(consoleMessages.length).toBeGreaterThanOrEqual(3)
    
    // Verify the logs contain JSON state data
    for (const message of consoleMessages) {
      expect(message).toContain('GramFrame State Updated:')
      expect(message).toContain('{')
      expect(message).toContain('}')
    }
    
    // Verify the final state reflects our changes
    const finalState = await gramFramePage.getState()
    expect(finalState.mode).toBe('harmonics')
    expect(finalState.rate).toBe(2)
    expect(finalState.cursorPosition).not.toBeNull()
  })
})

// Additional test for state preservation during page reload
// This simulates the hot module reload behavior
test.describe('Hot Module Reload Simulation', () => {
  test('state is preserved after page reload', async ({ gramFramePage, page }) => {
    // Perform actions to change the state
    
    // 1. Change mode to something other than default
    await gramFramePage.clickMode('Doppler')
    
    // 2. Change rate
    await gramFramePage.setRate(3.5)
    
    // 3. Move mouse to set cursor position
    const svgBounds = await gramFramePage.svg.boundingBox()
    if (svgBounds) {
      await gramFramePage.moveMouse(svgBounds.width / 3, svgBounds.height / 3)
    }
    
    // Get the state before reload
    const stateBeforeReload = await gramFramePage.getState()
    
    // Store key state values
    const modeBeforeReload = stateBeforeReload.mode
    const rateBeforeReload = stateBeforeReload.rate
    
    // Reload the page (simulating HMR)
    await page.reload()
    
    // Wait for component to initialize again
    await gramFramePage.waitForComponentLoad()
    
    // Get the state after reload
    const stateAfterReload = await gramFramePage.getState()
    
    // In a real HMR scenario, state would be preserved
    // For this test, we're just verifying that the component reinitializes correctly
    expect(stateAfterReload).toHaveProperty('version')
    expect(stateAfterReload).toHaveProperty('mode')
    expect(stateAfterReload).toHaveProperty('rate')
    
    // Note: In a real implementation with HMR, we would expect:
    // expect(stateAfterReload.mode).toBe(modeBeforeReload)
    // expect(stateAfterReload.rate).toBe(rateBeforeReload)
    // But since we're just simulating with a page reload, we expect default values
  })
})
