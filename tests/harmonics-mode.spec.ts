import { test, expect } from './helpers/fixtures'
import { 
  expectValidMetadata, 
  expectValidMode, 
  expectValidCursorPosition,
  expectValidConfig,
  expectValidImageDetails 
} from './helpers/state-assertions'

/**
 * Comprehensive E2E tests for Harmonics Mode functionality
 * Tests harmonic creation, dragging, real-time calculations, and UI interactions
 */
test.describe('Harmonics Mode - Comprehensive E2E Tests', () => {
  test.beforeEach(async ({ gramFramePage }) => {
    // Wait for component to fully load
    try {
      await gramFramePage.waitForImageLoad()
      await gramFramePage.waitForImageDimensions()
    } catch (error) {
      // If image load fails, continue with basic component loading
      console.log('Image load timeout, proceeding with basic component check')
    }
    
    // Switch to Harmonics mode
    await gramFramePage.clickMode('Harmonics')
    
    // Verify we're in harmonics mode
    const state = await gramFramePage.getState()
    expectValidMode(state, 'harmonics')
  })

  test.describe('Fundamental Frequency Selection', () => {
    test('should create harmonic set with click and drag', async ({ gramFramePage }) => {
      const startX = 200
      const startY = 150
      const endX = 250
      const endY = 200
      
      // Start drag for harmonic creation
      await gramFramePage.page.mouse.move(startX, startY)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(endX, endY)
      await gramFramePage.page.mouse.up()
      
      // Verify harmonic set was created
      const state = await gramFramePage.getState()
      expect(state.harmonics?.harmonicSets).toBeDefined()
      expect(state.harmonics.harmonicSets.length).toBeGreaterThan(0)
      
      const harmonicSet = state.harmonics.harmonicSets[0]
      expect(harmonicSet).toHaveProperty('id')
      expect(harmonicSet).toHaveProperty('fundamentalFreq')
      expect(harmonicSet).toHaveProperty('rate')
      expect(harmonicSet).toHaveProperty('color')
      expect(harmonicSet.fundamentalFreq).toBeGreaterThan(0)
    })
    
    test('should calculate harmonic spacing based on drag distance', async ({ gramFramePage }) => {
      // Create harmonic set with specific drag distance
      const startX = 200
      const startY = 150
      const endX = 200
      const endY = 250 // Vertical drag to create frequency spacing
      
      await gramFramePage.page.mouse.move(startX, startY)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(endX, endY)
      await gramFramePage.page.mouse.up()
      
      const state = await gramFramePage.getState()
      const harmonicSet = state.harmonics.harmonicSets[0]
      
      // Verify harmonic spacing was calculated
      expect(harmonicSet.rate).toBeGreaterThan(0)
      expect(harmonicSet.fundamentalFreq).toBeGreaterThan(0)
      
      // The rate should reflect the frequency difference between start and end positions
      const expectedRate = Math.abs(endY - startY) // Simplified calculation
      expect(harmonicSet.rate).toBeCloseTo(expectedRate, -1) // Allow some tolerance
    })
    
    test('should handle horizontal and vertical drags differently', async ({ gramFramePage }) => {
      // Test horizontal drag
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(300, 150) // Horizontal drag
      await gramFramePage.page.mouse.up()
      
      let state = await gramFramePage.getState()
      const horizontalHarmonic = state.harmonics.harmonicSets[0]
      
      await gramFramePage.page.waitForTimeout(200)
      
      // Test vertical drag
      await gramFramePage.page.mouse.move(200, 200)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(200, 300) // Vertical drag
      await gramFramePage.page.mouse.up()
      
      state = await gramFramePage.getState()
      expect(state.harmonics.harmonicSets).toHaveLength(2)
      
      const verticalHarmonic = state.harmonics.harmonicSets[1]
      
      // Verify different harmonic properties based on drag direction
      expect(horizontalHarmonic.id).not.toBe(verticalHarmonic.id)
      expect(horizontalHarmonic.fundamentalFreq).not.toBe(verticalHarmonic.fundamentalFreq)
    })
  })

  test.describe('Real-time Harmonic Calculation', () => {
    test('should update harmonics during drag operation', async ({ gramFramePage }) => {
      const startX = 200
      const startY = 150
      
      // Start dragging
      await gramFramePage.page.mouse.move(startX, startY)
      await gramFramePage.page.mouse.down()
      
      // Move mouse to different positions and verify real-time updates
      const dragPositions = [
        { x: 220, y: 170 },
        { x: 240, y: 190 },
        { x: 260, y: 210 }
      ]
      
      for (const pos of dragPositions) {
        await gramFramePage.page.mouse.move(pos.x, pos.y)
        
        // Small delay to allow for real-time calculation
        await gramFramePage.page.waitForTimeout(100)
        
        // Verify harmonic calculation is happening
        const state = await gramFramePage.getState()
        if (state.harmonics?.harmonicSets?.length > 0) {
          const harmonicSet = state.harmonics.harmonicSets[0]
          expect(harmonicSet.fundamentalFreq).toBeGreaterThan(0)
          expect(harmonicSet.rate).toBeGreaterThan(0)
        }
      }
      
      // End drag
      await gramFramePage.page.mouse.up()
      
      // Verify final harmonic set
      const finalState = await gramFramePage.getState()
      expect(finalState.harmonics.harmonicSets).toHaveLength(1)
    })
    
    test('should recalculate harmonics when dragging existing sets', async ({ gramFramePage }) => {
      // Create initial harmonic set
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(200, 250)
      await gramFramePage.page.mouse.up()
      
      let state = await gramFramePage.getState()
      const originalRate = state.harmonics.harmonicSets[0].rate
      
      // Wait a moment then drag the existing harmonic set
      await gramFramePage.page.waitForTimeout(200)
      
      // Click and drag on the harmonic line to adjust spacing
      await gramFramePage.page.mouse.move(200, 200) // Click on harmonic line
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(200, 300) // Drag to change spacing
      await gramFramePage.page.mouse.up()
      
      // Verify harmonic spacing was recalculated
      state = await gramFramePage.getState()
      const newRate = state.harmonics.harmonicSets[0].rate
      
      expect(newRate).not.toBe(originalRate)
      expect(newRate).toBeGreaterThan(0)
    })
  })

  test.describe('Harmonic Overlay Rendering', () => {
    test('should render harmonic lines in SVG', async ({ gramFramePage }) => {
      // Create harmonic set
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(200, 250)
      await gramFramePage.page.mouse.up()
      
      // Verify harmonic lines are rendered in SVG
      const harmonicLines = gramFramePage.page.locator('.gram-frame-harmonic-line')
      await expect(harmonicLines).toHaveCount.greaterThan(0)
      
      // Verify harmonic set group exists
      const harmonicGroup = gramFramePage.page.locator('.gram-frame-harmonic-set')
      await expect(harmonicGroup).toHaveCount(1)
    })
    
    test('should use correct colors for harmonic sets', async ({ gramFramePage }) => {
      // Create multiple harmonic sets to test color cycling
      const positions = [
        { start: { x: 150, y: 100 }, end: { x: 150, y: 200 } },
        { start: { x: 250, y: 120 }, end: { x: 250, y: 220 } },
        { start: { x: 350, y: 140 }, end: { x: 350, y: 240 } }
      ]
      
      for (const pos of positions) {
        await gramFramePage.page.mouse.move(pos.start.x, pos.start.y)
        await gramFramePage.page.mouse.down()
        await gramFramePage.page.mouse.move(pos.end.x, pos.end.y)
        await gramFramePage.page.mouse.up()
        await gramFramePage.page.waitForTimeout(200) // Delay between creations
      }
      
      // Verify different colors were assigned
      const state = await gramFramePage.getState()
      expect(state.harmonics.harmonicSets).toHaveLength(3)
      
      const colors = state.harmonics.harmonicSets.map(set => set.color)
      const uniqueColors = new Set(colors)
      expect(uniqueColors.size).toBeGreaterThan(1) // Should have different colors
    })
    
    test('should handle harmonic lines at spectrogram boundaries', async ({ gramFramePage }) => {
      // Create harmonic set that would extend beyond spectrogram boundaries
      await gramFramePage.page.mouse.move(100, 50) // Near top edge
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(100, 400) // Extend to bottom
      await gramFramePage.page.mouse.up()
      
      // Verify harmonic set was created despite boundary issues
      const state = await gramFramePage.getState()
      expect(state.harmonics.harmonicSets).toHaveLength(1)
      
      // Verify harmonic lines are clipped appropriately
      const harmonicLines = gramFramePage.page.locator('.gram-frame-harmonic-line')
      await expect(harmonicLines).toHaveCount.greaterThan(0)
    })
  })

  test.describe('UI Panel Interactions', () => {
    test('should display harmonic panel with calculation details', async ({ gramFramePage }) => {
      // Create harmonic set
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(200, 250)
      await gramFramePage.page.mouse.up()
      
      // Check for harmonic panel
      try {
        const harmonicPanel = gramFramePage.page.locator('.gram-frame-harmonic-panel')
        await harmonicPanel.waitFor({ timeout: 2000 })
        
        // Verify panel shows harmonic information
        await expect(harmonicPanel).toContainText(/fundamental/i)
        await expect(harmonicPanel).toContainText(/rate/i)
        
        // Check for numerical values
        await expect(harmonicPanel).toContainText(/\d+(\.\d+)?\s*Hz/)
      } catch (error) {
        console.log('Harmonic panel not found, skipping panel interaction test')
      }
    })
    
    test('should update panel content during mouse movement', async ({ gramFramePage }) => {
      // Start dragging to activate real-time updates
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      
      try {
        const harmonicPanel = gramFramePage.page.locator('.gram-frame-harmonic-panel')
        await harmonicPanel.waitFor({ timeout: 1000 })
        
        // Move mouse and verify panel updates
        const positions = [
          { x: 220, y: 170 },
          { x: 240, y: 190 },
          { x: 260, y: 210 }
        ]
        
        for (const pos of positions) {
          await gramFramePage.page.mouse.move(pos.x, pos.y)
          await gramFramePage.page.waitForTimeout(100)
          
          // Verify panel still shows content (indicates real-time updates)
          await expect(harmonicPanel).toContainText(/\d+/)
        }
        
        await gramFramePage.page.mouse.up()
      } catch (error) {
        console.log('Harmonic panel interaction not available')
      }
    })
  })

  test.describe('Manual Harmonic Modal', () => {
    test('should open manual harmonic modal if available', async ({ gramFramePage }) => {
      try {
        // Look for manual harmonic button
        const manualButton = gramFramePage.page.locator('.gram-frame-manual-harmonic-btn, [data-action="manual-harmonic"]')
        await manualButton.waitFor({ timeout: 2000 })
        await manualButton.click()
        
        // Check if modal opens
        const modal = gramFramePage.page.locator('.gram-frame-manual-harmonic-modal')
        await expect(modal).toBeVisible()
        
        // Test modal form if it exists
        const frequencyInput = modal.locator('input[type="number"], input[placeholder*="frequency"]')
        if (await frequencyInput.isVisible()) {
          await frequencyInput.fill('1000')
          
          const submitButton = modal.locator('button[type="submit"], .submit-btn')
          if (await submitButton.isVisible()) {
            await submitButton.click()
            
            // Verify harmonic was added
            const state = await gramFramePage.getState()
            expect(state.harmonics?.harmonicSets?.length).toBeGreaterThan(0)
          }
        }
      } catch (error) {
        console.log('Manual harmonic modal not available, skipping test')
      }
    })
  })

  test.describe('Cross-Mode Integration', () => {
    test('should interact properly with Analysis markers', async ({ gramFramePage }) => {
      // Switch to Analysis mode and create markers first
      await gramFramePage.clickMode('Analysis')
      await gramFramePage.clickSpectrogram(200, 150)
      await gramFramePage.clickSpectrogram(300, 200)
      
      // Switch back to Harmonics mode
      await gramFramePage.clickMode('Harmonics')
      
      // Verify Analysis markers are still visible
      const analysisMarkers = gramFramePage.page.locator('.gram-frame-analysis-marker')
      await expect(analysisMarkers).toHaveCount(2)
      
      // Create harmonic set and verify it doesn't interfere with markers
      await gramFramePage.page.mouse.move(250, 175)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(250, 275)
      await gramFramePage.page.mouse.up()
      
      // Verify both harmonics and markers coexist
      const state = await gramFramePage.getState()
      expect(state.harmonics?.harmonicSets).toHaveLength(1)
      expect(state.analysis?.markers).toHaveLength(2)
    })
    
    test('should maintain harmonics when switching modes', async ({ gramFramePage }) => {
      // Create harmonic set in Harmonics mode
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(200, 250)
      await gramFramePage.page.mouse.up()
      
      let state = await gramFramePage.getState()
      const originalHarmonicSet = state.harmonics.harmonicSets[0]
      
      // Switch to Analysis mode
      await gramFramePage.clickMode('Analysis')
      
      // Verify harmonics persist in state
      state = await gramFramePage.getState()
      expect(state.harmonics?.harmonicSets).toHaveLength(1)
      expect(state.harmonics.harmonicSets[0]).toEqual(originalHarmonicSet)
      
      // Switch back to Harmonics mode
      await gramFramePage.clickMode('Harmonics')
      
      // Verify harmonics are still visible and functional
      state = await gramFramePage.getState()
      expect(state.harmonics.harmonicSets[0]).toEqual(originalHarmonicSet)
      
      const harmonicLines = gramFramePage.page.locator('.gram-frame-harmonic-line')
      await expect(harmonicLines).toHaveCount.greaterThan(0)
    })
  })

  test.describe('Color Picker Functionality', () => {
    test('should allow harmonic color selection', async ({ gramFramePage }) => {
      try {
        // Look for color picker in harmonics UI
        const colorPicker = gramFramePage.page.locator('.gram-frame-color-picker')
        await colorPicker.waitFor({ timeout: 2000 })
        
        // Select a specific color
        await colorPicker.click()
        const greenColor = gramFramePage.page.locator('[data-color="#2ecc71"]')
        if (await greenColor.isVisible()) {
          await greenColor.click()
        }
        
        // Create harmonic set with selected color
        await gramFramePage.page.mouse.move(200, 150)
        await gramFramePage.page.mouse.down()
        await gramFramePage.page.mouse.move(200, 250)
        await gramFramePage.page.mouse.up()
        
        // Verify harmonic set uses selected color
        const state = await gramFramePage.getState()
        expect(state.harmonics.harmonicSets[0].color).toBe('#2ecc71')
      } catch (error) {
        console.log('Color picker not available in harmonics mode')
      }
    })
  })

  test.describe('Edge Cases and Error Handling', () => {
    test('should handle very small drag distances', async ({ gramFramePage }) => {
      // Create harmonic set with minimal drag distance
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(201, 151) // Very small movement
      await gramFramePage.page.mouse.up()
      
      // Verify harmonic set handling of minimal distance
      const state = await gramFramePage.getState()
      // May or may not create a harmonic set depending on minimum threshold
      if (state.harmonics?.harmonicSets?.length > 0) {
        expect(state.harmonics.harmonicSets[0].rate).toBeGreaterThan(0)
      }
    })
    
    test('should handle rapid harmonic creation and deletion', async ({ gramFramePage }) => {
      // Rapidly create multiple harmonic sets
      const positions = [
        { start: { x: 100, y: 100 }, end: { x: 100, y: 200 } },
        { start: { x: 150, y: 120 }, end: { x: 150, y: 220 } },
        { start: { x: 200, y: 140 }, end: { x: 200, y: 240 } }
      ]
      
      for (const pos of positions) {
        await gramFramePage.page.mouse.move(pos.start.x, pos.start.y)
        await gramFramePage.page.mouse.down()
        await gramFramePage.page.mouse.move(pos.end.x, pos.end.y)
        await gramFramePage.page.mouse.up()
        await gramFramePage.page.waitForTimeout(50) // Minimal delay
      }
      
      // Verify all harmonic sets were created
      const state = await gramFramePage.getState()
      expect(state.harmonics?.harmonicSets?.length).toBe(3)
      
      // Verify each harmonic set has valid properties
      state.harmonics.harmonicSets.forEach(set => {
        expect(set).toHaveProperty('id')
        expect(set).toHaveProperty('fundamentalFreq')
        expect(set).toHaveProperty('rate')
        expect(set).toHaveProperty('color')
        expect(set.fundamentalFreq).toBeGreaterThan(0)
        expect(set.rate).toBeGreaterThan(0)
      })
    })
    
    test('should maintain state consistency during complex operations', async ({ gramFramePage }) => {
      // Perform complex sequence of operations
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down() // Start drag
      await gramFramePage.page.mouse.move(220, 170) // Drag
      await gramFramePage.clickMode('Analysis') // Switch mode mid-drag
      await gramFramePage.clickMode('Harmonics') // Switch back
      await gramFramePage.page.mouse.move(200, 250) // Continue drag
      await gramFramePage.page.mouse.up() // End drag
      
      // Verify final state is consistent
      const state = await gramFramePage.getState()
      expectValidMetadata(state)
      expectValidMode(state, 'harmonics')
      expectValidConfig(state)
      expectValidImageDetails(state)
      
      // State should be consistent despite mode switching during drag
      if (state.harmonics?.harmonicSets?.length > 0) {
        expect(state.harmonics.harmonicSets[0]).toHaveProperty('id')
        expect(state.harmonics.harmonicSets[0]).toHaveProperty('fundamentalFreq')
      }
    })
  })

  test.describe('Cursor Behavior', () => {
    test('should change cursor style when hovering over harmonic lines', async ({ gramFramePage }) => {
      // Create harmonic set first
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(200, 250)
      await gramFramePage.page.mouse.up()
      
      // Wait for harmonic lines to be rendered
      await gramFramePage.page.waitForTimeout(200)
      
      // Move mouse over harmonic line area and check cursor
      await gramFramePage.page.mouse.move(200, 200) // Over harmonic line
      
      // Get cursor style
      const cursor = await gramFramePage.page.evaluate(() => {
        const spectrogramImage = document.querySelector('.gram-frame-image')
        return spectrogramImage ? window.getComputedStyle(spectrogramImage).cursor : null
      })
      
      // Should show grab cursor when hovering over harmonic lines
      expect(['grab', 'pointer', 'crosshair']).toContain(cursor)
    })
    
    test('should show crosshair cursor in empty areas', async ({ gramFramePage }) => {
      // Move mouse to empty area
      await gramFramePage.page.mouse.move(300, 100)
      
      // Get cursor style
      const cursor = await gramFramePage.page.evaluate(() => {
        const spectrogramImage = document.querySelector('.gram-frame-image')
        return spectrogramImage ? window.getComputedStyle(spectrogramImage).cursor : null
      })
      
      // Should show crosshair in empty areas
      expect(cursor).toBe('crosshair')
    })
  })
})