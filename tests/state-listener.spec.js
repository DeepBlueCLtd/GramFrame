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
   * @param {TestParams} params - Test parameters
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
   * @param {TestParams} params - Test parameters
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
   * @param {TestParams} params - Test parameters
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
/**
 * Notification batching (spec 166, US4). One settled gesture produces one
 * notification, high-frequency input is bounded by frame cadence rather than
 * event count, and a pure cursor move never writes to storage.
 */
test.describe('Notifications are batched (spec 166, US4)', () => {
  /**
   * Register a counting listener and return the accessors for it.
   * @param {import('@playwright/test').Page} page
   * @returns {Promise<void>}
   */
  async function installCounter(page) {
    await page.evaluate(() => {
      // @ts-ignore - test-only counters
      window.__notifyCount = 0
      // @ts-ignore
      window.__lastState = null
      // @ts-ignore
      window.__counter = (state) => { window.__notifyCount++; window.__lastState = state }
      // @ts-ignore
      window.GramFrame.addStateListener(window.__counter)
      // Registering a listener fires it once with the current state; start
      // counting from after that.
      // @ts-ignore
      window.__notifyCount = 0
    })
  }

  test('AS-4.1: one mode switch produces exactly one notification', async ({ gramFramePage }) => {
    const page = gramFramePage.page
    await installCounter(page)

    // Switch modes without moving the pointer, so the count measures the mode
    // switch alone. (Clicking the button also drags the pointer off the SVG,
    // whose mouseleave is a separate, legitimate notification.)
    const count = await page.evaluate(async () => {
      const instance = window.GramFrame.__test__getInstances()[0]
      instance._switchMode('harmonics')

      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)))
      // @ts-ignore
      return { count: window.__notifyCount, mode: window.__lastState.mode }
    })

    expect(count.mode).toBe('harmonics')
    expect(count.count).toBe(1)
  })

  test('AS-4.2/SC-004: a mousemove burst is bounded by frames, not by events', async ({ gramFramePage }) => {
    const page = gramFramePage.page
    await installCounter(page)

    const result = await page.evaluate(async () => {
      const svg = document.querySelector('.gram-frame-svg')
      const rect = svg.getBoundingClientRect()

      let frames = 0
      let running = true
      const tick = () => { if (running) { frames++; requestAnimationFrame(tick) } }
      requestAnimationFrame(tick)

      // 60 pointer events in one task: without batching that is 60 notifications
      for (let i = 0; i < 60; i++) {
        svg.dispatchEvent(new MouseEvent('mousemove', {
          clientX: rect.left + 200 + i,
          clientY: rect.top + 150,
          bubbles: true
        }))
      }

      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)))
      running = false

      const instance = window.GramFrame.__test__getInstances()[0]
      return {
        // @ts-ignore
        count: window.__notifyCount,
        frames,
        // @ts-ignore
        settled: window.__lastState.cursorPosition,
        live: instance.state.cursorPosition
      }
    })

    // Bounded by elapsed frames, not by the 60 events
    expect(result.count).toBeLessThanOrEqual(result.frames + 1)
    expect(result.count).toBeGreaterThan(0)
    expect(result.count).toBeLessThan(60)

    // Same-frame final-state equivalence: what the listener last saw matches
    // the state the unbatched path would have left behind.
    expect(result.settled.freq).toBeCloseTo(result.live.freq, 6)
    expect(result.settled.time).toBeCloseTo(result.live.time, 6)
  })

  test('AS-4.2: a wheel burst is likewise bounded', async ({ gramFramePage }) => {
    const page = gramFramePage.page
    await installCounter(page)

    const result = await page.evaluate(async () => {
      const svg = document.querySelector('.gram-frame-svg')
      const rect = svg.getBoundingClientRect()

      let frames = 0
      let running = true
      const tick = () => { if (running) { frames++; requestAnimationFrame(tick) } }
      requestAnimationFrame(tick)

      for (let i = 0; i < 60; i++) {
        svg.dispatchEvent(new WheelEvent('wheel', {
          clientX: rect.left + 250,
          clientY: rect.top + 150,
          deltaY: -100,
          ctrlKey: true,
          bubbles: true,
          cancelable: true
        }))
      }

      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)))
      running = false

      const instance = window.GramFrame.__test__getInstances()[0]
      // @ts-ignore
      return { count: window.__notifyCount, frames, settled: window.__lastState.zoom.level, live: instance.state.zoom.level }
    })

    expect(result.count).toBeLessThanOrEqual(result.frames + 1)
    expect(result.count).toBeLessThan(60)
    expect(result.settled).toBeCloseTo(result.live, 6)
  })

  test('AS-4.3: cursor moves produce no storage writes', async ({ page }) => {
    // A trainer fixture, so storage is actually in play
    await page.goto('/tests/fixtures/trainer-page.html')
    await page.evaluate(() => localStorage.clear())
    await page.locator('.gram-frame-container').waitFor({ timeout: 10000 })

    // Place one annotation so there is something that *could* be re-saved
    await page.locator('.gram-frame-mode-btn:text("Cross Cursor")').click()
    await page.locator('.gram-frame-svg').click({ position: { x: 200, y: 150 } })
    await expect
      .poll(async () => page.evaluate(() => {
        const instance = window.GramFrame.__test__getInstances()[0]
        return instance.state.analysis.markers.length
      }))
      .toBeGreaterThan(0)

    const writes = await page.evaluate(async () => {
      // Count writes from here on
      let count = 0
      const original = Storage.prototype.setItem
      Storage.prototype.setItem = function (...args) {
        if (typeof args[0] === 'string' && args[0].startsWith('gramframe::')) count++
        return original.apply(this, args)
      }

      const svg = document.querySelector('.gram-frame-svg')
      const rect = svg.getBoundingClientRect()
      for (let i = 0; i < 20; i++) {
        svg.dispatchEvent(new MouseEvent('mousemove', {
          clientX: rect.left + 200 + i * 3,
          clientY: rect.top + 150,
          bubbles: true
        }))
        await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)))
      }

      Storage.prototype.setItem = original
      return count
    })

    expect(writes).toBe(0)
  })

  test('N6: a pending notification is delivered before the instance is destroyed', async ({ gramFramePage }) => {
    const page = gramFramePage.page
    await installCounter(page)

    const result = await page.evaluate(() => {
      const instance = window.GramFrame.__test__getInstances()[0]
      instance.state.rate = 42
      // Schedule a notification, then tear down before it would fire
      instance.notifyStateListeners()
      // @ts-ignore
      const beforeDestroy = window.__notifyCount
      instance.destroy()
      // @ts-ignore
      return { beforeDestroy, afterDestroy: window.__notifyCount, seenRate: window.__lastState.rate }
    })

    // Nothing had been delivered yet; destroy flushed it synchronously
    expect(result.beforeDestroy).toBe(0)
    expect(result.afterDestroy).toBe(1)
    expect(result.seenRate).toBe(42)
  })
})

test.describe('HMR listener preservation survives the dispatcher (spec 166, T063)', () => {
  test('the save/clear/restore cycle the HMR handler performs keeps listeners working', async ({ gramFramePage }) => {
    const page = gramFramePage.page

    const result = await page.evaluate(async () => {
      let calls = 0
      const listener = () => { calls++ }
      window.GramFrame.addStateListener(listener)
      calls = 0 // registration fires once; count from after it

      // Exactly what the HMR accept handler does: snapshot the global
      // listeners, clear the registry, then restore them.
      // @ts-ignore - module import in the page
      const state = await import('/src/core/state.js')
      const saved = state.getGlobalStateListeners()
      state.clearGlobalStateListeners()
      saved.forEach((l) => window.GramFrame.addStateListener(l))

      const preserved = state.getGlobalStateListeners().length

      // The restored listener still receives notifications through the
      // dispatcher, which is what the batching change could have broken.
      const instance = window.GramFrame.__test__getInstances()[0]
      instance.notifyStateListeners()
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)))

      window.GramFrame.removeStateListener(listener)
      return { preserved, calls }
    })

    expect(result.preserved).toBeGreaterThan(0)
    expect(result.calls).toBeGreaterThan(0)
  })
})
