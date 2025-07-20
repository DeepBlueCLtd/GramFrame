import { test, expect } from './helpers/fixtures'
import { expectValidMetadata, expectValidMode } from './helpers/state-assertions'

/**
 * Phase 2 Feature Tests
 * Tests for image loading, LED panel, diagnostics panel, and state listener mechanism
 */
test.describe('Phase 2: Image Loading and Basic Display', () => {
  // Task 2.3.1: Test image loading functionality
  test('spectrogram image loads correctly from config', async ({ gramFramePage }) => {
    // Wait for the image to load
    await gramFramePage.waitForImageLoad()
    
    // Verify the image is displayed in the SVG
    await expect(gramFramePage.svg).toBeVisible()
    
    // Verify the SVG has dimensions
    const svgBounds = await gramFramePage.svg.boundingBox()
    expect(svgBounds?.width).toBeGreaterThan(0)
    expect(svgBounds?.height).toBeGreaterThan(0)
    
    // Verify the state contains image details
    const state = await gramFramePage.getState()
    expect(state.imageDetails).toBeDefined()
    expect(state.imageDetails.url).toContain('mock-gram.png')
    expect(state.imageDetails.naturalWidth).toBeGreaterThan(0)
    expect(state.imageDetails.naturalHeight).toBeGreaterThan(0)
    
    // Verify display dimensions are set
    expect(state.displayDimensions).toBeDefined()
    expect(state.displayDimensions.width).toBeGreaterThan(0)
    expect(state.displayDimensions.height).toBeGreaterThan(0)
  })

  // Task 2.4.1: Test min/max extraction and display
  test('min/max time/frequency values are correctly extracted', async ({ gramFramePage }) => {
    // Get the current state
    const state = await gramFramePage.getState()
    
    // Verify config values are extracted from the table
    expect(state.config).toBeDefined()
    expect(state.config.timeMin).toBe(0)
    expect(state.config.timeMax).toBe(60)
    expect(state.config.freqMin).toBe(0)
    expect(state.config.freqMax).toBe(100)
  })

  // Task 2.5.1: Test LED panel rendering and formatting
  test('LED panel displays correctly with proper formatting', async ({ gramFramePage }) => {
    // Verify LED displays are visible
    await expect(gramFramePage.freqLED).toBeVisible()
    await expect(gramFramePage.timeLED).toBeVisible()
    await expect(gramFramePage.modeLED).toBeVisible()
    
    // Verify LED structure
    await expect(gramFramePage.freqLED.locator('.gram-frame-led-label')).toContainText('Frequency')
    await expect(gramFramePage.timeLED.locator('.gram-frame-led-label')).toContainText('Time')
    await expect(gramFramePage.modeLED.locator('.gram-frame-led-label')).toContainText('Mode')
    
    // Verify initial LED values
    await expect(gramFramePage.freqLED.locator('.gram-frame-led-value')).toContainText('Hz')
    await expect(gramFramePage.timeLED.locator('.gram-frame-led-value')).toContainText('s')
    await expect(gramFramePage.modeLED.locator('.gram-frame-led-value')).toContainText('Analysis')
    
    // Test LED updates when mouse moves
    const svgBounds = await gramFramePage.svg.boundingBox()
    if (svgBounds) {
      await gramFramePage.moveMouse(svgBounds.width / 2, svgBounds.height / 2)
      
      // Wait for updates
      await gramFramePage.page.waitForTimeout(100)
      
      // Verify LED values have updated with real coordinates
      const freqText = await gramFramePage.freqLED.locator('.gram-frame-led-value').textContent()
      const timeText = await gramFramePage.timeLED.locator('.gram-frame-led-value').textContent()
      
      expect(freqText).toMatch(/Freq: \d+\.\d Hz/)
      expect(timeText).toMatch(/Time: \d+\.\d{2} s/)
    }
  })
})

test.describe('Phase 2: Diagnostics Panel', () => {
  // Task 2.6.1: Test diagnostics panel information accuracy
  test('diagnostics panel displays correct image information', async ({ gramFramePage, page }) => {
    // Navigate to the debug page to access diagnostics panel
    await page.goto('/debug.html')
    await gramFramePage.waitForComponentLoad()
    
    // Wait for image to load and state to update
    await gramFramePage.waitForImageLoad()
    await page.waitForTimeout(500)
    
    // Verify image details in diagnostics panel
    const imageUrl = await page.locator('#image-url').textContent()
    const imageSize = await page.locator('#image-size').textContent()
    const timeRange = await page.locator('#time-range').textContent()
    const freqRange = await page.locator('#freq-range').textContent()
    
    expect(imageUrl).toContain('mock-gram.png')
    expect(imageSize).toMatch(/\d+ × \d+ px/)
    expect(timeRange).toBe('0 to 60 s')
    expect(freqRange).toBe('0 to 100 Hz')
  })

  test('diagnostics panel updates with mouse coordinates', async ({ gramFramePage, page }) => {
    // Navigate to the debug page
    await page.goto('/debug.html')
    await gramFramePage.waitForComponentLoad()
    await gramFramePage.waitForImageLoad()
    
    // Initially, mouse coordinates should show defaults
    let mouseCanvasPos = await page.locator('#mouse-canvas-pos').textContent()
    let mouseTime = await page.locator('#mouse-time').textContent()
    let mouseFreq = await page.locator('#mouse-freq').textContent()
    
    expect(mouseCanvasPos).toBe('-')
    expect(mouseTime).toBe('-')
    expect(mouseFreq).toBe('-')
    
    // Move mouse over the SVG
    const svgBounds = await gramFramePage.svg.boundingBox()
    if (svgBounds) {
      await gramFramePage.moveMouse(svgBounds.width / 2, svgBounds.height / 2)
      await page.waitForTimeout(200)
      
      // Verify coordinates are updated
      mouseCanvasPos = await page.locator('#mouse-canvas-pos').textContent()
      mouseTime = await page.locator('#mouse-time').textContent()
      mouseFreq = await page.locator('#mouse-freq').textContent()
      
      expect(mouseCanvasPos).toMatch(/\(\d+, \d+\)/)
      expect(mouseTime).toMatch(/\d+\.\d{2} s/)
      expect(mouseFreq).toMatch(/\d+\.\d{2} Hz/)
    }
  })
})

test.describe('Phase 2: State Listener Mechanism', () => {
  // Task 2.7.1: Test state listener functionality
  test('state listener mechanism works correctly', async ({ gramFramePage }) => {
    // This test is already implemented in state-listener.spec.ts
    // but we'll add a Phase 2 specific test here
    
    // Test that listener is called when state changes
    const listenerResults = await gramFramePage.page.evaluate(() => {
      let callCount = 0
      let lastState = null
      
      // Add a state listener
      const listener = (state) => {
        callCount++
        lastState = state
      }
      
      window.GramFrame.addStateListener(listener)
      
      // Force an update to trigger the listener
      window.GramFrame.forceUpdate()
      
      return { callCount, hasState: lastState !== null }
    })
    
    expect(listenerResults.callCount).toBeGreaterThan(0)
    expect(listenerResults.hasState).toBe(true)
  })

  test('multiple state listeners can be registered', async ({ gramFramePage }) => {
    const results = await gramFramePage.page.evaluate(() => {
      let listener1Called = false
      let listener2Called = false
      
      const listener1 = (state) => { listener1Called = true }
      const listener2 = (state) => { listener2Called = true }
      
      window.GramFrame.addStateListener(listener1)
      window.GramFrame.addStateListener(listener2)
      
      // Force an update
      window.GramFrame.forceUpdate()
      
      return { listener1Called, listener2Called }
    })
    
    expect(results.listener1Called).toBe(true)
    expect(results.listener2Called).toBe(true)
  })

  test('state listener receives complete state object', async ({ gramFramePage }) => {
    const stateProperties = await gramFramePage.page.evaluate(() => {
      let receivedState = null
      
      const listener = (state) => {
        receivedState = state
      }
      
      window.GramFrame.addStateListener(listener)
      window.GramFrame.forceUpdate()
      
      return receivedState ? Object.keys(receivedState) : []
    })
    
    // Verify the state object contains expected properties
    expect(stateProperties).toContain('version')
    expect(stateProperties).toContain('mode')
    expect(stateProperties).toContain('rate')
    expect(stateProperties).toContain('imageDetails')
    expect(stateProperties).toContain('config')
    expect(stateProperties).toContain('displayDimensions')
  })
})

test.describe('Phase 2: Comprehensive Integration', () => {
  // Task 2.8: Comprehensive tests for all Phase 2 functionality
  test('all Phase 2 components work together correctly', async ({ gramFramePage, page }) => {
    // Navigate to debug page for full integration test
    await page.goto('/debug.html')
    await gramFramePage.waitForComponentLoad()
    await gramFramePage.waitForImageLoad()
    
    // Verify component is fully initialized
    await expect(gramFramePage.componentContainer).toBeVisible()
    await expect(gramFramePage.svg).toBeVisible()
    await expect(gramFramePage.readoutPanel).toBeVisible()
    
    // Verify LED panels are working
    await expect(gramFramePage.freqLED).toBeVisible()
    await expect(gramFramePage.timeLED).toBeVisible()
    await expect(gramFramePage.modeLED).toBeVisible()
    
    // Verify diagnostics panel is populated
    const imageUrl = await page.locator('#image-url').textContent()
    const imageSize = await page.locator('#image-size').textContent()
    expect(imageUrl).toContain('mock-gram.png')
    expect(imageSize).toMatch(/\d+ × \d+ px/)
    
    // Verify state display is working
    const stateDisplayText = await page.locator('#state-display').textContent()
    expect(stateDisplayText).toContain('"version"')
    expect(stateDisplayText).toContain('"mode"')
    expect(stateDisplayText).toContain('"imageDetails"')
    
    // Test interactive functionality
    const svgBounds = await gramFramePage.svg.boundingBox()
    if (svgBounds) {
      // Move mouse and verify all components update
      await gramFramePage.moveMouse(svgBounds.width * 0.3, svgBounds.height * 0.7)
      await page.waitForTimeout(200)
      
      // Verify LED displays updated
      const freqText = await gramFramePage.freqLED.locator('.gram-frame-led-value').textContent()
      const timeText = await gramFramePage.timeLED.locator('.gram-frame-led-value').textContent()
      expect(freqText).toMatch(/Freq: \d+\.\d Hz/)
      expect(timeText).toMatch(/Time: \d+\.\d{2} s/)
      
      // Verify diagnostics panel updated
      const mouseCanvasPos = await page.locator('#mouse-canvas-pos').textContent()
      expect(mouseCanvasPos).toMatch(/\(\d+, \d+\)/)
      
      // Verify state display updated
      const updatedStateText = await page.locator('#state-display').textContent()
      expect(updatedStateText).toContain('"cursorPosition"')
    }
    
    // Test mode switching
    await gramFramePage.clickMode('Harmonics')
    await page.waitForTimeout(200)
    
    // Verify mode LED updated
    await expect(gramFramePage.modeLED.locator('.gram-frame-led-value')).toContainText('Harmonics')
    
    // Verify state reflects mode change
    const finalState = await gramFramePage.getState()
    expect(finalState.mode).toBe('harmonics')
  })
})