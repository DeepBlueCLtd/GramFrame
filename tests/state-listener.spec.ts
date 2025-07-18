import { test, expect } from './helpers/fixtures'
import { expectValidMetadata, expectValidMode } from './helpers/state-assertions'

/**
 * Tests for the state listener mechanism
 */
test.describe('State Listener Mechanism', () => {
  test('addStateListener registers and calls listeners', async ({ page }) => {
    // Navigate to the debug page
    await page.goto('/debug.html')
    
    // Wait for the page to load
    await page.waitForSelector('.gram-frame-container')
    
    // Create a promise that will resolve when the state listener is called
    const statePromise = page.evaluate(() => {
      return new Promise(resolve => {
        // Add a state listener
        window.GramFrame.addStateListener(state => {
          resolve(state)
        })
      })
    })
    
    // Wait for the state listener to be called
    const state = await statePromise
    
    // Verify that the state has the expected properties
    expect(state).toBeTruthy()
    expect(state).toHaveProperty('version')
    expect(state).toHaveProperty('mode')
    expect(state).toHaveProperty('imageDetails')
    expect(state).toHaveProperty('config')
  })
  
  test('state listener is called when state changes', async ({ gramFramePage }) => {
    // Create an array to store state updates
    const stateUpdates: any[] = []
    
    // Add a state listener via evaluate
    await gramFramePage.page.evaluate(() => {
      // Clear any existing listeners for clean test
      window.GramFrame.stateListenerCount = 0
    })
    
    // Add a listener that will record state updates
    await gramFramePage.page.evaluate(() => {
      window.stateUpdates = []
      window.GramFrame.addStateListener(state => {
        window.stateUpdates.push({
          mode: state.mode,
          rate: state.rate,
          cursorPosition: state.cursorPosition ? { 
            x: state.cursorPosition.x,
            y: state.cursorPosition.y 
          } : null
        })
      })
    })
    
    // Perform actions that should trigger state changes
    
    // 1. Change mode
    await gramFramePage.clickMode('Harmonics')
    
    // 2. Change rate
    await gramFramePage.setRate(2.5)
    
    // 3. Move mouse over canvas
    const canvasBounds = await gramFramePage.canvas.boundingBox()
    if (canvasBounds) {
      await gramFramePage.moveMouse(canvasBounds.width / 2, canvasBounds.height / 2)
    }
    
    // Wait a moment for all state updates to be processed
    await gramFramePage.page.waitForTimeout(500)
    
    // Get the recorded state updates
    const updates = await gramFramePage.page.evaluate(() => window.stateUpdates)
    
    // Verify that we received multiple state updates
    expect(updates.length).toBeGreaterThanOrEqual(3)
    
    // Verify the last update contains our changes
    const lastUpdate = updates[updates.length - 1]
    expect(lastUpdate.mode).toBe('harmonics')
    expect(lastUpdate.rate).toBe(2.5)
    expect(lastUpdate.cursorPosition).toBeTruthy()
  })
  
  test('removeStateListener removes listeners correctly', async ({ page }) => {
    // Navigate to the debug page
    await page.goto('/debug.html')
    
    // Wait for the page to load
    await page.waitForSelector('.gram-frame-container')
    
    // Add and remove listeners
    const result = await page.evaluate(() => {
      // Create a test object to store results
      const testResult = {
        initialCallbackCalled: false,
        callbackCalledAfterRemoval: false,
        removalResult: false
      }
      
      // Create a listener
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
      window.GramFrame.forceUpdate()
      
      return testResult
    })
    
    // Verify that the listener was called initially (when added)
    expect(result.initialCallbackCalled).toBe(true)
    
    // Verify that the removal was successful
    expect(result.removalResult).toBe(true)
    
    // Verify that the listener was not called after removal
    expect(result.callbackCalledAfterRemoval).toBe(false)
  })
  
  test('error handling in state listeners', async ({ page }) => {
    // Navigate to the debug page
    await page.goto('/debug.html')
    
    // Wait for the page to load
    await page.waitForSelector('.gram-frame-container')
    
    // Create a listener that will throw an error
    const errorMessage = await page.evaluate(() => {
      let errorThrown = ''
      
      // Create a listener that throws an error
      const listener = state => {
        throw new Error('Test error in listener')
      }
      
      // Add error handler to capture console errors
      window.addEventListener('error', e => {
        errorThrown = e.message
        return true
      })
      
      // Add the listener
      window.GramFrame.addStateListener(listener)
      
      // Force an update to trigger the listener
      try {
        window.GramFrame.forceUpdate()
      } catch (e) {
        errorThrown = 'Uncaught error: ' + e.message
      }
      
      return errorThrown
    })
    
    // Verify that the error was caught and didn't crash the application
    // The exact error message might vary depending on implementation
    expect(errorMessage).toBeTruthy()
  })
})
