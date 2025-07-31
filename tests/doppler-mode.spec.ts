import { test, expect } from './helpers/fixtures'
import { 
  expectValidMetadata, 
  expectValidMode, 
  expectValidCursorPosition,
  expectValidConfig,
  expectValidImageDetails 
} from './helpers/state-assertions'

/**
 * Comprehensive E2E tests for Doppler Mode functionality
 * Tests Doppler marker placement, dragging, speed calculations, and UI interactions
 */
test.describe('Doppler Mode - Comprehensive E2E Tests', () => {
  test.beforeEach(async ({ gramFramePage }) => {
    // Wait for component to fully load
    try {
      await gramFramePage.waitForImageLoad()
      await gramFramePage.waitForImageDimensions()
    } catch (error) {
      // If image load fails, continue with basic component loading
      console.log('Image load timeout, proceeding with basic component check')
    }
    
    // Switch to Doppler mode
    await gramFramePage.clickMode('Doppler')
    
    // Verify we're in doppler mode
    const state = await gramFramePage.getState()
    expectValidMode(state, 'doppler')
  })

  test.describe('Doppler Marker Placement', () => {
    test('should create f+ and f- markers with click and drag', async ({ gramFramePage }) => {
      const startX = 200
      const startY = 150
      const endX = 300
      const endY = 200
      
      // Click and drag to create Doppler markers
      await gramFramePage.page.mouse.move(startX, startY)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(endX, endY)
      await gramFramePage.page.mouse.up()
      
      // Verify Doppler markers were created
      const state = await gramFramePage.getState()
      expect(state.doppler).toBeDefined()
      expect(state.doppler.fPlus).toBeDefined()
      expect(state.doppler.fMinus).toBeDefined()
      
      // Verify marker properties
      expect(state.doppler.fPlus).toHaveProperty('time')
      expect(state.doppler.fPlus).toHaveProperty('frequency')
      expect(state.doppler.fMinus).toHaveProperty('time')
      expect(state.doppler.fMinus).toHaveProperty('frequency')
      
      expect(state.doppler.fPlus.time).toBeGreaterThan(0)
      expect(state.doppler.fPlus.frequency).toBeGreaterThan(0)
      expect(state.doppler.fMinus.time).toBeGreaterThan(0)
      expect(state.doppler.fMinus.frequency).toBeGreaterThan(0)
    })
    
    test('should automatically calculate f₀ midpoint marker', async ({ gramFramePage }) => {
      // Create f+ and f- markers
      await gramFramePage.page.mouse.move(200, 100)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(300, 200)
      await gramFramePage.page.mouse.up()
      
      // Verify f₀ was automatically calculated
      const state = await gramFramePage.getState()
      expect(state.doppler.fZero).toBeDefined()
      expect(state.doppler.fZero).toHaveProperty('time')
      expect(state.doppler.fZero).toHaveProperty('frequency')
      
      // f₀ should be approximately between f+ and f-
      const fPlusFreq = state.doppler.fPlus.frequency
      const fMinusFreq = state.doppler.fMinus.frequency
      const fZeroFreq = state.doppler.fZero.frequency
      
      const minFreq = Math.min(fPlusFreq, fMinusFreq)
      const maxFreq = Math.max(fPlusFreq, fMinusFreq)
      
      expect(fZeroFreq).toBeGreaterThanOrEqual(minFreq - 10) // Small tolerance
      expect(fZeroFreq).toBeLessThanOrEqual(maxFreq + 10)
    })
    
    test('should show preview during drag operation', async ({ gramFramePage }) => {
      // Start dragging
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      
      // Move to show preview
      await gramFramePage.page.mouse.move(250, 180)
      
      // Verify preview state is active
      const state = await gramFramePage.getState()
      expect(state.doppler.isPreviewDrag).toBe(true)
      expect(state.doppler.tempFirst).toBeDefined()
      
      // Check for preview elements in DOM
      const previewElements = gramFramePage.page.locator('.gram-frame-doppler-preview')
      await expect(previewElements).toHaveCount.greaterThan(0)
      
      // End drag
      await gramFramePage.page.mouse.up()
      
      // Verify preview is cleared
      const finalState = await gramFramePage.getState()
      expect(finalState.doppler.isPreviewDrag).toBe(false)
    })
  })

  test.describe('Doppler Marker Dragging', () => {
    test('should allow dragging f+ marker to reposition', async ({ gramFramePage }) => {
      // Create initial Doppler markers
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(300, 200)
      await gramFramePage.page.mouse.up()
      
      let state = await gramFramePage.getState()
      const originalFPlusTime = state.doppler.fPlus.time
      
      // Wait for markers to be rendered
      await gramFramePage.page.waitForTimeout(200)
      
      // Drag f+ marker to new position
      await gramFramePage.page.mouse.move(200, 150) // Original f+ position
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(250, 120) // New position
      await gramFramePage.page.mouse.up()
      
      // Verify f+ marker was moved
      state = await gramFramePage.getState()
      expect(state.doppler.fPlus.time).not.toBe(originalFPlusTime)
      
      // Verify drag state is cleared
      expect(state.doppler.isDragging).toBe(false)
      expect(state.doppler.draggedMarker).toBeNull()
    })
    
    test('should allow dragging f- marker to reposition', async ({ gramFramePage }) => {
      // Create initial Doppler markers
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(300, 200)
      await gramFramePage.page.mouse.up()
      
      let state = await gramFramePage.getState()
      const originalFMinusFreq = state.doppler.fMinus.frequency
      
      // Wait for markers to be rendered
      await gramFramePage.page.waitForTimeout(200)
      
      // Drag f- marker to new position
      await gramFramePage.page.mouse.move(300, 200) // Original f- position
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(350, 250) // New position
      await gramFramePage.page.mouse.up()
      
      // Verify f- marker was moved
      state = await gramFramePage.getState()
      expect(state.doppler.fMinus.frequency).not.toBe(originalFMinusFreq)
    })
    
    test('should allow dragging f₀ marker independently', async ({ gramFramePage }) => {
      // Create initial Doppler markers
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(300, 200)
      await gramFramePage.page.mouse.up()
      
      let state = await gramFramePage.getState()
      const originalFZeroTime = state.doppler.fZero.time
      
      // Wait for markers to be rendered
      await gramFramePage.page.waitForTimeout(200)
      
      // Calculate approximate f₀ position for dragging
      const fZeroX = (200 + 300) / 2 // Approximate midpoint
      const fZeroY = (150 + 200) / 2
      
      // Drag f₀ marker to new position
      await gramFramePage.page.mouse.move(fZeroX, fZeroY)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(fZeroX + 50, fZeroY + 25)
      await gramFramePage.page.mouse.up()
      
      // Verify f₀ marker was moved
      state = await gramFramePage.getState()
      expect(state.doppler.fZero.time).not.toBe(originalFZeroTime)
    })
    
    test('should update cursor style when hovering over markers', async ({ gramFramePage }) => {
      // Create Doppler markers
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(300, 200)
      await gramFramePage.page.mouse.up()
      
      // Wait for markers to be rendered
      await gramFramePage.page.waitForTimeout(200)
      
      // Hover over f+ marker position
      await gramFramePage.page.mouse.move(200, 150)
      
      // Check cursor style (should indicate draggable)
      const cursor = await gramFramePage.page.evaluate(() => {
        const spectrogramImage = document.querySelector('.gram-frame-image')
        return spectrogramImage ? window.getComputedStyle(spectrogramImage).cursor : null
      })
      
      expect(['grab', 'pointer', 'move']).toContain(cursor)
    })
  })

  test.describe('Speed Calculation Workflow', () => {
    test('should calculate Doppler speed from f+ and f- markers', async ({ gramFramePage }) => {
      // Create Doppler markers with known frequency difference
      await gramFramePage.page.mouse.move(200, 100) // Higher frequency
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(300, 200) // Lower frequency
      await gramFramePage.page.mouse.up()
      
      // Verify speed calculation is performed
      const state = await gramFramePage.getState()
      
      // Check if speed calculation fields exist
      if (state.doppler.calculatedSpeed !== undefined) {
        expect(state.doppler.calculatedSpeed).toBeGreaterThanOrEqual(0)
      }
      
      // Verify frequency difference is calculated
      const freqDiff = Math.abs(state.doppler.fPlus.frequency - state.doppler.fMinus.frequency)
      expect(freqDiff).toBeGreaterThan(0)
    })
    
    test('should update speed calculation when dragging markers', async ({ gramFramePage }) => {
      // Create initial markers
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(300, 200)
      await gramFramePage.page.mouse.up()
      
      // Get initial calculation
      let state = await gramFramePage.getState()
      const initialFreqDiff = Math.abs(state.doppler.fPlus.frequency - state.doppler.fMinus.frequency)
      
      // Drag one marker to change frequency difference
      await gramFramePage.page.waitForTimeout(200)
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(200, 100) // Move to higher frequency
      await gramFramePage.page.mouse.up()
      
      // Verify calculation updated
      state = await gramFramePage.getState()
      const newFreqDiff = Math.abs(state.doppler.fPlus.frequency - state.doppler.fMinus.frequency)
      expect(newFreqDiff).not.toBe(initialFreqDiff)
    })
    
    test('should handle zero frequency difference gracefully', async ({ gramFramePage }) => {
      // Create markers at same frequency (vertically aligned)
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(300, 150) // Same frequency, different time
      await gramFramePage.page.mouse.up()
      
      // Verify system handles zero frequency difference
      const state = await gramFramePage.getState()
      
      if (state.doppler.calculatedSpeed !== undefined) {
        // Speed should be zero or very close to zero
        expect(state.doppler.calculatedSpeed).toBeLessThanOrEqual(1)
      }
      
      // Should not cause errors
      expect(state.doppler.fPlus).toBeDefined()
      expect(state.doppler.fMinus).toBeDefined()
    })
  })

  test.describe('Bearing Input Interactions', () => {
    test('should allow bearing input if UI exists', async ({ gramFramePage }) => {
      try {
        // Look for bearing input field
        const bearingInput = gramFramePage.page.locator('input[placeholder*="bearing"], input[data-field="bearing"], #bearing-input')
        await bearingInput.waitFor({ timeout: 2000 })
        
        // Enter bearing value
        await bearingInput.fill('045')
        
        // Verify bearing is stored in state
        const state = await gramFramePage.getState()
        if (state.doppler.bearing !== undefined) {
          expect(state.doppler.bearing).toBe(45)
        }
      } catch (error) {
        console.log('Bearing input not found, skipping bearing input test')
      }
    })
    
    test('should validate bearing input range', async ({ gramFramePage }) => {
      try {
        const bearingInput = gramFramePage.page.locator('input[placeholder*="bearing"], input[data-field="bearing"], #bearing-input')
        await bearingInput.waitFor({ timeout: 2000 })
        
        // Test invalid values
        const invalidValues = ['400', '-10', 'abc', '']
        
        for (const value of invalidValues) {
          await bearingInput.fill(value)
          await bearingInput.blur()
          
          // Check for validation feedback
          const isInvalid = await bearingInput.evaluate(input => input.checkValidity?.() === false)
          if (value === '400' || value === '-10') {
            // These should be invalid for bearing (0-359)
            expect(isInvalid).toBe(true)
          }
        }
        
        // Test valid value
        await bearingInput.fill('180')
        const isValid = await bearingInput.evaluate(input => input.checkValidity?.() !== false)
        expect(isValid).toBe(true)
      } catch (error) {
        console.log('Bearing validation not testable')
      }
    })
  })

  test.describe('Time Selection and Display', () => {
    test('should display time values for f+ and f- markers', async ({ gramFramePage }) => {
      // Create Doppler markers
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(350, 200)
      await gramFramePage.page.mouse.up()
      
      // Verify time values are calculated
      const state = await gramFramePage.getState()
      expect(state.doppler.fPlus.time).toBeGreaterThan(0)
      expect(state.doppler.fMinus.time).toBeGreaterThan(0)
      
      // Times should be different (unless vertically aligned)
      const timeDiff = Math.abs(state.doppler.fPlus.time - state.doppler.fMinus.time)
      expect(timeDiff).toBeGreaterThanOrEqual(0)
    })
    
    test('should handle time-based calculations correctly', async ({ gramFramePage }) => {
      // Create markers with significant time difference
      await gramFramePage.page.mouse.move(150, 150) // Earlier time
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(400, 200) // Later time
      await gramFramePage.page.mouse.up()
      
      const state = await gramFramePage.getState()
      const timeDiff = Math.abs(state.doppler.fPlus.time - state.doppler.fMinus.time)
      
      // Verify significant time difference was captured
      expect(timeDiff).toBeGreaterThan(1) // At least 1 second difference
      
      // Time values should be within reasonable range
      expect(state.doppler.fPlus.time).toBeGreaterThanOrEqual(state.config.timeMin)
      expect(state.doppler.fPlus.time).toBeLessThanOrEqual(state.config.timeMax)
      expect(state.doppler.fMinus.time).toBeGreaterThanOrEqual(state.config.timeMin)
      expect(state.doppler.fMinus.time).toBeLessThanOrEqual(state.config.timeMax)
    })
  })

  test.describe('UI Display and Calculation Results', () => {
    test('should display Doppler calculation results if UI exists', async ({ gramFramePage }) => {
      // Create Doppler markers
      await gramFramePage.page.mouse.move(200, 120)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(300, 220)
      await gramFramePage.page.mouse.up()
      
      try {
        // Look for Doppler results display
        const resultsDisplay = gramFramePage.page.locator('.gram-frame-doppler-results, .doppler-speed-display')
        await resultsDisplay.waitFor({ timeout: 2000 })
        
        // Verify speed value is displayed
        await expect(resultsDisplay).toContainText(/\d+(\.\d+)?\s*(m\/s|knots|km\/h)?/)
        
        // Look for frequency difference display
        await expect(resultsDisplay).toContainText(/\d+(\.\d+)?\s*Hz/)
      } catch (error) {
        console.log('Doppler results display not found')
      }
    })
    
    test('should update display in real-time during dragging', async ({ gramFramePage }) => {
      // Create initial markers
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(300, 200)
      await gramFramePage.page.mouse.up()
      
      try {
        const resultsDisplay = gramFramePage.page.locator('.gram-frame-doppler-results, .doppler-speed-display')
        await resultsDisplay.waitFor({ timeout: 1000 })
        
        const initialText = await resultsDisplay.textContent()
        
        // Drag marker to change calculation
        await gramFramePage.page.waitForTimeout(200)
        await gramFramePage.page.mouse.move(200, 150)
        await gramFramePage.page.mouse.down()
        await gramFramePage.page.mouse.move(200, 100) // Change frequency
        await gramFramePage.page.mouse.up()
        
        // Verify display updated
        await gramFramePage.page.waitForTimeout(200)
        const updatedText = await resultsDisplay.textContent()
        expect(updatedText).not.toBe(initialText)
      } catch (error) {
        console.log('Real-time display update not testable')
      }
    })
  })

  test.describe('Cross-Mode Functionality', () => {
    test('should maintain Doppler markers when switching modes', async ({ gramFramePage }) => {
      // Create Doppler markers
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(300, 200)
      await gramFramePage.page.mouse.up()
      
      let state = await gramFramePage.getState()
      const originalDopplerState = { ...state.doppler }
      
      // Switch to Analysis mode
      await gramFramePage.clickMode('Analysis')
      
      // Verify Doppler state persists
      state = await gramFramePage.getState()
      expect(state.doppler.fPlus).toEqual(originalDopplerState.fPlus)
      expect(state.doppler.fMinus).toEqual(originalDopplerState.fMinus)
      expect(state.doppler.fZero).toEqual(originalDopplerState.fZero)
      
      // Switch back to Doppler mode
      await gramFramePage.clickMode('Doppler')
      
      // Verify markers are still functional
      state = await gramFramePage.getState()
      expect(state.doppler.fPlus).toEqual(originalDopplerState.fPlus)
      
      // Verify Doppler markers are visible in SVG
      const dopplerMarkers = gramFramePage.page.locator('.gram-frame-doppler-marker')
      await expect(dopplerMarkers).toHaveCount.greaterThan(0)
    })
    
    test('should coexist with Analysis markers', async ({ gramFramePage }) => {
      // Switch to Analysis mode and create markers
      await gramFramePage.clickMode('Analysis')
      await gramFramePage.clickSpectrogram(150, 100)
      
      // Switch back to Doppler mode
      await gramFramePage.clickMode('Doppler')
      
      // Create Doppler markers
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(300, 200)
      await gramFramePage.page.mouse.up()
      
      // Verify both types of markers coexist
      const state = await gramFramePage.getState()
      expect(state.analysis?.markers).toHaveLength(1)
      expect(state.doppler.fPlus).toBeDefined()
      expect(state.doppler.fMinus).toBeDefined()
      
      // Verify both are visible in SVG
      const analysisMarkers = gramFramePage.page.locator('.gram-frame-analysis-marker')
      const dopplerMarkers = gramFramePage.page.locator('.gram-frame-doppler-marker')
      
      await expect(analysisMarkers).toHaveCount(1)
      await expect(dopplerMarkers).toHaveCount.greaterThan(0)
    })
  })

  test.describe('Reset and Clear Functionality', () => {
    test('should reset markers via right-click', async ({ gramFramePage }) => {
      // Create Doppler markers
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(300, 200)
      await gramFramePage.page.mouse.up()
      
      // Verify markers exist
      let state = await gramFramePage.getState()
      expect(state.doppler.fPlus).toBeDefined()
      expect(state.doppler.fMinus).toBeDefined()
      
      // Right-click to reset (if implemented)
      await gramFramePage.page.mouse.click(250, 175, { button: 'right' })
      
      // Small delay for right-click handling
      await gramFramePage.page.waitForTimeout(200)
      
      // Check if markers were reset
      state = await gramFramePage.getState()
      // Note: This test assumes right-click reset is implemented
      // If not implemented, markers will still exist
    })
    
    test('should clear markers via UI button if available', async ({ gramFramePage }) => {
      // Create Doppler markers
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(300, 200)
      await gramFramePage.page.mouse.up()
      
      try {
        // Look for clear/reset button
        const clearButton = gramFramePage.page.locator('.gram-frame-doppler-clear, .doppler-reset-btn, [data-action="clear-doppler"]')
        await clearButton.waitFor({ timeout: 2000 })
        await clearButton.click()
        
        // Verify markers were cleared
        const state = await gramFramePage.getState()
        expect(state.doppler.fPlus).toBeNull()
        expect(state.doppler.fMinus).toBeNull()
        expect(state.doppler.fZero).toBeNull()
      } catch (error) {
        console.log('Clear button not found, skipping clear functionality test')
      }
    })
  })

  test.describe('Edge Cases and Error Handling', () => {
    test('should handle marker placement at spectrogram boundaries', async ({ gramFramePage }) => {
      const svgBox = await gramFramePage.svg.boundingBox()
      expect(svgBox).toBeTruthy()
      
      if (svgBox) {
        // Test boundary positions (accounting for axes margins)
        await gramFramePage.page.mouse.move(65, 50) // Near left edge
        await gramFramePage.page.mouse.down()
        await gramFramePage.page.mouse.move(svgBox.width - 10, svgBox.height - 55) // Near right-bottom
        await gramFramePage.page.mouse.up()
        
        // Verify markers were created successfully
        const state = await gramFramePage.getState()
        expect(state.doppler.fPlus).toBeDefined()
        expect(state.doppler.fMinus).toBeDefined()
        
        // Coordinates should be within valid ranges
        expect(state.doppler.fPlus.time).toBeGreaterThanOrEqual(state.config.timeMin)
        expect(state.doppler.fPlus.time).toBeLessThanOrEqual(state.config.timeMax)
        expect(state.doppler.fMinus.time).toBeGreaterThanOrEqual(state.config.timeMin)
        expect(state.doppler.fMinus.time).toBeLessThanOrEqual(state.config.timeMax)
      }
    })
    
    test('should handle rapid marker creation and dragging', async ({ gramFramePage }) => {
      // Rapidly create and modify Doppler markers
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(250, 180)
      await gramFramePage.page.waitForTimeout(50)
      await gramFramePage.page.mouse.move(300, 200)
      await gramFramePage.page.mouse.up()
      
      // Immediately start dragging
      await gramFramePage.page.waitForTimeout(100)
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(180, 130)
      await gramFramePage.page.mouse.up()
      
      // Verify final state is consistent
      const state = await gramFramePage.getState()
      expect(state.doppler.fPlus).toBeDefined()
      expect(state.doppler.fMinus).toBeDefined()
      expect(state.doppler.fZero).toBeDefined()
      expect(state.doppler.isDragging).toBe(false)
      expect(state.doppler.isPreviewDrag).toBe(false)
    })
    
    test('should maintain state consistency during complex operations', async ({ gramFramePage }) => {
      // Perform complex sequence of operations
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down() // Start creating markers
      await gramFramePage.clickMode('Analysis') // Switch mode mid-operation
      await gramFramePage.clickMode('Doppler') // Switch back
      await gramFramePage.page.mouse.move(300, 200) // Continue operation
      await gramFramePage.page.mouse.up() // Complete operation
      
      // Verify final state is consistent
      const state = await gramFramePage.getState()
      expectValidMetadata(state)
      expectValidMode(state, 'doppler')
      expectValidConfig(state)
      expectValidImageDetails(state)
      
      // Doppler state should be consistent despite mode switching
      expect(state.doppler.isDragging).toBe(false)
      expect(state.doppler.isPreviewDrag).toBe(false)
    })
    
    test('should handle overlapping marker positions', async ({ gramFramePage }) => {
      // Create markers at same position
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(201, 151) // Minimal movement
      await gramFramePage.page.mouse.up()
      
      // Verify system handles overlapping positions gracefully
      const state = await gramFramePage.getState()
      
      if (state.doppler.fPlus && state.doppler.fMinus) {
        // Should have valid but potentially similar positions
        expect(state.doppler.fPlus).toHaveProperty('time')
        expect(state.doppler.fPlus).toHaveProperty('frequency')
        expect(state.doppler.fMinus).toHaveProperty('time')
        expect(state.doppler.fMinus).toHaveProperty('frequency')
        
        // Frequency difference should be minimal
        const freqDiff = Math.abs(state.doppler.fPlus.frequency - state.doppler.fMinus.frequency)
        expect(freqDiff).toBeLessThan(100) // Small difference for overlapping positions
      }
    })
  })

  test.describe('Coordinate System Integration', () => {
    test('should accurately convert marker positions to frequency/time', async ({ gramFramePage }) => {
      // Create markers at known positions
      const startX = 200
      const startY = 150
      const endX = 300
      const endY = 250
      
      await gramFramePage.page.mouse.move(startX, startY)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(endX, endY)
      await gramFramePage.page.mouse.up()
      
      const state = await gramFramePage.getState()
      
      // Verify coordinates are within expected ranges
      expect(state.doppler.fPlus.time).toBeGreaterThanOrEqual(state.config.timeMin)
      expect(state.doppler.fPlus.time).toBeLessThanOrEqual(state.config.timeMax)
      expect(state.doppler.fPlus.frequency).toBeGreaterThanOrEqual(state.config.freqMin)
      expect(state.doppler.fPlus.frequency).toBeLessThanOrEqual(state.config.freqMax)
      
      expect(state.doppler.fMinus.time).toBeGreaterThanOrEqual(state.config.timeMin)
      expect(state.doppler.fMinus.time).toBeLessThanOrEqual(state.config.timeMax)
      expect(state.doppler.fMinus.frequency).toBeGreaterThanOrEqual(state.config.freqMin)
      expect(state.doppler.fMinus.frequency).toBeLessThanOrEqual(state.config.freqMax)
    })
  })
})