import { test, expect } from './helpers/fixtures.js'
import { expectValidMetadata, expectValidMode } from './helpers/state-assertions.js'

/**
 * @fileoverview Tests for the state listener mechanism
 * Tests state listener registration, removal, error handling, and callback execution
 */

/**
 * State Listener Mechanism test suite
 * @description Tests state listener registration, removal, error handling, and callback execution
 */
test.describe('State Listener Mechanism', () => {
  /**
   * Test state listener registration and callback execution
   * @param {Object} params - Test parameters
   * @param {import('@playwright/test').Page} params.page - Playwright page instance
   * @returns {Promise<void>}
   */
  test('addStateListener registers and calls listeners', async ({ page }) => {
    // Navigate to the debug page
    await page.goto('/debug.html')
    
    // Wait for the page to load
    await page.waitForSelector('.gram-frame-container')
    
    // Create a promise that will resolve when the state listener is called
    /** @type {Promise<import('../src/types.js').GramFrameState>} */
    const statePromise = page.evaluate(() => {
      return new Promise(resolve => {
        // Add a state listener
        window.GramFrame.addStateListener(state => {
          resolve(state)
        })
      })
    })
    
    // Wait for the state listener to be called
    /** @type {import('../src/types.js').GramFrameState} */
    const state = await statePromise
    
    // Verify that the state has the expected properties
    expect(state).toBeTruthy()
    expect(state).toHaveProperty('version')
    expect(state).toHaveProperty('mode')
    expect(state).toHaveProperty('imageDetails')
    expect(state).toHaveProperty('config')
  })
  
  // Test removed - depends on SVG/mouse interactions that were removed
  
  /**
   * Test state listener removal
   * @param {Object} params - Test parameters
   * @param {import('@playwright/test').Page} params.page - Playwright page instance
   * @returns {Promise<void>}
   */
  test('removeStateListener removes listeners correctly', async ({ page }) => {
    // Navigate to the debug page
    await page.goto('/debug.html')
    
    // Wait for the page to load
    await page.waitForSelector('.gram-frame-container')
    
    // Add and remove listeners
    /** @type {{initialCallbackCalled: boolean, callbackCalledAfterRemoval: boolean, removalResult: boolean}} */
    const result = await page.evaluate(() => {
      // Create a test object to store results
      const testResult = {
        initialCallbackCalled: false,
        callbackCalledAfterRemoval: false,
        removalResult: false
      }
      
      // Create a listener
      /** @type {import('../src/types.js').StateListener} */
      const listener = state => {
        if (testResult.removalResult) {
          testResult.callbackCalledAfterRemoval = true
        } else {
          testResult.initialCallbackCalled = true
        }
      }
      
      // Add the listener
      window.GramFrame.addStateListener(listener)
      
      // Remove the listener
      testResult.removalResult = window.GramFrame.removeStateListener(listener)
      
      // Force an update to trigger any listeners
      window.GramFrame.__test__forceUpdate()
      
      return testResult
    })
    
    // Verify that the listener was called initially (when added)
    expect(result.initialCallbackCalled).toBe(true)
    
    // Verify that the removal was successful
    expect(result.removalResult).toBe(true)
    
    // Verify that the listener was not called after removal
    expect(result.callbackCalledAfterRemoval).toBe(false)
  })
  
  /**
   * Test error handling in state listeners
   * @param {Object} params - Test parameters
   * @param {import('@playwright/test').Page} params.page - Playwright page instance
   * @returns {Promise<void>}
   */
  test('error handling in state listeners', async ({ page }) => {
    // Navigate to the debug page
    await page.goto('/debug.html')
    
    // Wait for the page to load
    await page.waitForSelector('.gram-frame-container')
    
    // Create a listener that will throw an error
    /** @type {string} */
    const errorMessage = await page.evaluate(() => {
      let errorThrown = ''
      
      // Create a listener that throws an error
      /** @type {import('../src/types.js').StateListener} */
      const listener = state => {
        throw new Error('Test error in listener')
      }
      
      // Override console.error temporarily to capture the error
      const originalConsoleError = console.error
      console.error = (...args) => {
        if (args[0] === 'Error in state listener:') {
          errorThrown = args[1].message || 'Error captured'
        }
        originalConsoleError.apply(console, args)
      }
      
      // Add the listener
      window.GramFrame.addStateListener(listener)
      
      // Force an update to trigger the listener
      window.GramFrame.__test__forceUpdate()
      
      // Restore original console.error
      console.error = originalConsoleError
      
      return errorThrown
    })
    
    // Verify that the error was caught and didn't crash the application
    // The exact error message might vary depending on implementation
    expect(errorMessage).toBeTruthy()
  })
})