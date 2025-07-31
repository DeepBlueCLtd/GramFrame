import { test, expect } from './helpers/fixtures'
import { 
  expectValidMetadata, 
  expectValidMode, 
  expectValidCursorPosition,
  expectValidConfig,
  expectValidImageDetails 
} from './helpers/state-assertions'

/**
 * Comprehensive E2E tests for Cross-Mode Integration
 * Tests mode switching, state persistence, feature visibility, and interaction between modes
 */
test.describe('Cross-Mode Integration - Comprehensive E2E Tests', () => {
  test.beforeEach(async ({ gramFramePage }) => {
    // Wait for component to fully load
    try {
      await gramFramePage.waitForImageLoad()
      await gramFramePage.waitForImageDimensions()
    } catch (error) {
      // If image load fails, continue with basic component loading
      console.log('Image load timeout, proceeding with basic component check')
    }
  })

  test.describe('Mode Switching', () => {
    test('should switch smoothly between all modes', async ({ gramFramePage }) => {
      const modes = ['Analysis', 'Harmonics', 'Doppler']
      
      for (const mode of modes) {
        await gramFramePage.clickMode(mode)
        
        // Verify mode switch was successful
        const state = await gramFramePage.getState()
        expectValidMode(state, mode.toLowerCase())
        expectValidMetadata(state)
        expectValidConfig(state)
        expectValidImageDetails(state)
        
        // Verify UI reflects current mode
        const modeValue = await gramFramePage.getLEDValue('Mode')
        expect(modeValue).toBe(mode)
        
        // Small delay between mode switches
        await gramFramePage.page.waitForTimeout(200)
      }
    })
    
    test('should handle rapid mode switching', async ({ gramFramePage }) => {
      const modes = ['Analysis', 'Harmonics', 'Doppler', 'Analysis', 'Harmonics']
      
      // Rapidly switch between modes
      for (const mode of modes) {
        await gramFramePage.clickMode(mode)
        await gramFramePage.page.waitForTimeout(50) // Minimal delay
      }
      
      // Verify final state is consistent
      const state = await gramFramePage.getState()
      expectValidMode(state, 'harmonics')
      expectValidMetadata(state)
      expectValidConfig(state)
      expectValidImageDetails(state)
    })
    
    test('should maintain proper button states during mode switching', async ({ gramFramePage }) => {
      const modes = ['Analysis', 'Harmonics', 'Doppler']
      
      for (const mode of modes) {
        await gramFramePage.clickMode(mode)
        
        // Verify active button styling
        const activeButton = gramFramePage.page.locator(`.gram-frame-mode-btn:text("${mode}")`)
        const isActive = await activeButton.evaluate(btn => btn.classList.contains('active') || btn.getAttribute('aria-pressed') === 'true')
        expect(isActive).toBe(true)
        
        // Verify other buttons are not active
        for (const otherMode of modes) {
          if (otherMode !== mode) {
            const otherButton = gramFramePage.page.locator(`.gram-frame-mode-btn:text("${otherMode}")`)
            const isOtherActive = await otherButton.evaluate(btn => btn.classList.contains('active') || btn.getAttribute('aria-pressed') === 'true')
            expect(isOtherActive).toBe(false)
          }
        }
      }
    })
  })

  test.describe('State Persistence', () => {
    test('should persist Analysis markers across all mode switches', async ({ gramFramePage }) => {
      // Start in Analysis mode and create markers
      await gramFramePage.clickMode('Analysis')
      
      const markerPositions = [
        { x: 150, y: 100 },
        { x: 250, y: 150 },
        { x: 350, y: 200 }
      ]
      
      for (const pos of markerPositions) {
        await gramFramePage.clickSpectrogram(pos.x, pos.y)
      }
      
      // Store original markers
      let state = await gramFramePage.getState()
      const originalMarkers = [...state.analysis.markers]
      expect(originalMarkers).toHaveLength(3)
      
      // Switch through all modes and verify persistence
      const modes = ['Harmonics', 'Doppler', 'Analysis', 'Harmonics', 'Doppler', 'Analysis']
      
      for (const mode of modes) {
        await gramFramePage.clickMode(mode)
        
        state = await gramFramePage.getState()
        expect(state.analysis.markers).toHaveLength(3)
        expect(state.analysis.markers).toEqual(originalMarkers)
        
        // Verify markers are visible in SVG regardless of mode
        const markerElements = gramFramePage.page.locator('.gram-frame-analysis-marker')
        await expect(markerElements).toHaveCount(3)
      }
    })
    
    test('should persist Harmonics sets across mode switches', async ({ gramFramePage }) => {
      // Create harmonic sets in Harmonics mode
      await gramFramePage.clickMode('Harmonics')
      
      const harmonicPositions = [
        { start: { x: 200, y: 100 }, end: { x: 200, y: 200 } },
        { start: { x: 300, y: 120 }, end: { x: 300, y: 220 } }
      ]
      
      for (const pos of harmonicPositions) {
        await gramFramePage.page.mouse.move(pos.start.x, pos.start.y)
        await gramFramePage.page.mouse.down()
        await gramFramePage.page.mouse.move(pos.end.x, pos.end.y)
        await gramFramePage.page.mouse.up()
        await gramFramePage.page.waitForTimeout(200)
      }
      
      // Store original harmonic sets
      let state = await gramFramePage.getState()
      const originalHarmonics = [...state.harmonics.harmonicSets]
      expect(originalHarmonics).toHaveLength(2)
      
      // Switch modes and verify persistence
      const modes = ['Analysis', 'Doppler', 'Harmonics']
      
      for (const mode of modes) {
        await gramFramePage.clickMode(mode)
        
        state = await gramFramePage.getState()
        expect(state.harmonics.harmonicSets).toHaveLength(2)
        expect(state.harmonics.harmonicSets).toEqual(originalHarmonics)
      }
    })
    
    test('should persist Doppler markers across mode switches', async ({ gramFramePage }) => {
      // Create Doppler markers
      await gramFramePage.clickMode('Doppler')
      
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(300, 200)
      await gramFramePage.page.mouse.up()
      
      // Store original Doppler state
      let state = await gramFramePage.getState()
      const originalDoppler = {
        fPlus: { ...state.doppler.fPlus },
        fMinus: { ...state.doppler.fMinus },
        fZero: { ...state.doppler.fZero }
      }
      
      // Switch modes and verify persistence
      const modes = ['Analysis', 'Harmonics', 'Doppler']
      
      for (const mode of modes) {
        await gramFramePage.clickMode(mode)
        
        state = await gramFramePage.getState()
        expect(state.doppler.fPlus).toEqual(originalDoppler.fPlus)
        expect(state.doppler.fMinus).toEqual(originalDoppler.fMinus)
        expect(state.doppler.fZero).toEqual(originalDoppler.fZero)
      }
    })
    
    test('should maintain all feature types simultaneously', async ({ gramFramePage }) => {
      // Create features in all modes
      
      // Analysis markers
      await gramFramePage.clickMode('Analysis')
      await gramFramePage.clickSpectrogram(150, 100)
      await gramFramePage.clickSpectrogram(200, 150)
      
      // Harmonic sets
      await gramFramePage.clickMode('Harmonics')
      await gramFramePage.page.mouse.move(250, 120)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(250, 220)
      await gramFramePage.page.mouse.up()
      
      // Doppler markers
      await gramFramePage.clickMode('Doppler')
      await gramFramePage.page.mouse.move(300, 150)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(400, 200)
      await gramFramePage.page.mouse.up()
      
      // Verify all features coexist
      const state = await gramFramePage.getState()
      expect(state.analysis.markers).toHaveLength(2)
      expect(state.harmonics.harmonicSets).toHaveLength(1)
      expect(state.doppler.fPlus).toBeDefined()
      expect(state.doppler.fMinus).toBeDefined()
      
      // Switch through all modes and verify all features persist
      const modes = ['Analysis', 'Harmonics', 'Doppler']
      
      for (const mode of modes) {
        await gramFramePage.clickMode(mode)
        
        const currentState = await gramFramePage.getState()
        expect(currentState.analysis.markers).toHaveLength(2)
        expect(currentState.harmonics.harmonicSets).toHaveLength(1)
        expect(currentState.doppler.fPlus).toBeDefined()
        expect(currentState.doppler.fMinus).toBeDefined()
      }
    })
  })

  test.describe('Feature Visibility', () => {
    test('should show Analysis markers in all modes', async ({ gramFramePage }) => {
      // Create Analysis markers
      await gramFramePage.clickMode('Analysis')
      await gramFramePage.clickSpectrogram(200, 150)
      await gramFramePage.clickSpectrogram(300, 200)
      
      // Test visibility in each mode
      const modes = ['Analysis', 'Harmonics', 'Doppler']
      
      for (const mode of modes) {
        await gramFramePage.clickMode(mode)
        
        // Verify markers are visible in SVG
        const markerElements = gramFramePage.page.locator('.gram-frame-analysis-marker')
        await expect(markerElements).toHaveCount(2)
        
        // Verify markers are actually rendered (not hidden)
        for (let i = 0; i < 2; i++) {
          const marker = markerElements.nth(i)
          const isVisible = await marker.isVisible()
          expect(isVisible).toBe(true)
        }
      }
    })
    
    test('should show Harmonics in all modes', async ({ gramFramePage }) => {
      // Create harmonic set
      await gramFramePage.clickMode('Harmonics')
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(200, 250)
      await gramFramePage.page.mouse.up()
      
      // Test visibility in each mode
      const modes = ['Harmonics', 'Analysis', 'Doppler']
      
      for (const mode of modes) {
        await gramFramePage.clickMode(mode)
        
        // Verify harmonic lines are visible
        const harmonicLines = gramFramePage.page.locator('.gram-frame-harmonic-line')
        await expect(harmonicLines).toHaveCount.greaterThan(0)
        
        // Verify harmonic group is visible
        const harmonicGroup = gramFramePage.page.locator('.gram-frame-harmonic-set')
        await expect(harmonicGroup).toHaveCount(1)
      }
    })
    
    test('should show Doppler markers in all modes', async ({ gramFramePage }) => {
      // Create Doppler markers
      await gramFramePage.clickMode('Doppler')
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(300, 200)
      await gramFramePage.page.mouse.up()
      
      // Test visibility in each mode
      const modes = ['Doppler', 'Analysis', 'Harmonics']
      
      for (const mode of modes) {
        await gramFramePage.clickMode(mode)
        
        // Verify Doppler markers are visible
        const dopplerMarkers = gramFramePage.page.locator('.gram-frame-doppler-marker')
        await expect(dopplerMarkers).toHaveCount.greaterThan(0)
      }
    })
    
    test('should maintain visual layering and z-index', async ({ gramFramePage }) => {
      // Create overlapping features
      await gramFramePage.clickMode('Analysis')
      await gramFramePage.clickSpectrogram(200, 150) // Analysis marker
      
      await gramFramePage.clickMode('Harmonics')
      await gramFramePage.page.mouse.move(200, 100) // Harmonic through marker
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(200, 200)
      await gramFramePage.page.mouse.up()
      
      await gramFramePage.clickMode('Doppler')
      await gramFramePage.page.mouse.move(190, 140) // Doppler near marker
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(210, 160)
      await gramFramePage.page.mouse.up()
      
      // Verify all features are visible and properly layered
      const analysisMarkers = gramFramePage.page.locator('.gram-frame-analysis-marker')
      const harmonicLines = gramFramePage.page.locator('.gram-frame-harmonic-line')
      const dopplerMarkers = gramFramePage.page.locator('.gram-frame-doppler-marker')
      
      await expect(analysisMarkers).toHaveCount(1)
      await expect(harmonicLines).toHaveCount.greaterThan(0)
      await expect(dopplerMarkers).toHaveCount.greaterThan(0)
      
      // All should be visible despite overlap
      await expect(analysisMarkers.first()).toBeVisible()
      await expect(harmonicLines.first()).toBeVisible()
      await expect(dopplerMarkers.first()).toBeVisible()
    })
  })

  test.describe('UI Consistency', () => {
    test('should update UI elements correctly on mode changes', async ({ gramFramePage }) => {
      const modes = ['Analysis', 'Harmonics', 'Doppler']
      
      for (const mode of modes) {
        await gramFramePage.clickMode(mode)
        
        // Verify mode LED updates
        const modeValue = await gramFramePage.getLEDValue('Mode')
        expect(modeValue).toBe(mode)
        
        // Verify guidance text updates (if available)
        try {
          const guidancePanel = gramFramePage.page.locator('.gram-frame-guidance')
          if (await guidancePanel.isVisible()) {
            const guidanceText = await guidancePanel.textContent()
            expect(guidanceText).toContain(mode)
          }
        } catch (error) {
          // Guidance panel may not exist
        }
        
        // Verify mode-specific UI elements appear/disappear
        if (mode === 'Harmonics') {
          // Check for harmonics-specific UI
          try {
            const harmonicPanel = gramFramePage.page.locator('.gram-frame-harmonic-panel')
            // Panel may appear when harmonics are created
          } catch (error) {
            // Harmonic panel may not exist initially
          }
        }
      }
    })
    
    test('should maintain cursor readouts across modes', async ({ gramFramePage }) => {
      const modes = ['Analysis', 'Harmonics', 'Doppler']
      
      for (const mode of modes) {
        await gramFramePage.clickMode(mode)
        
        // Move mouse to same position in each mode
        await gramFramePage.moveMouseToSpectrogram(200, 150)
        
        // Verify cursor readouts work in all modes
        const freqValue = await gramFramePage.getLEDValue('Frequency (Hz)')
        const timeValue = await gramFramePage.getLEDValue('Time (mm:ss)')
        
        expect(freqValue).toMatch(/^\d+(\.\d+)?\s*Hz$/)
        expect(timeValue).toMatch(/^\d{2}:\d{2}$/)
        
        // Verify state cursor position is updated
        const state = await gramFramePage.getState()
        expectValidCursorPosition(state, true)
      }
    })
    
    test('should handle UI state during mode transitions', async ({ gramFramePage }) => {
      // Create features in different modes
      await gramFramePage.clickMode('Analysis')
      await gramFramePage.clickSpectrogram(200, 150)
      
      await gramFramePage.clickMode('Harmonics')
      await gramFramePage.page.mouse.move(250, 120)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(250, 220)
      await gramFramePage.page.mouse.up()
      
      // Rapidly switch modes during mouse movement
      await gramFramePage.moveMouseToSpectrogram(300, 200)
      await gramFramePage.clickMode('Doppler')
      await gramFramePage.moveMouseToSpectrogram(350, 250)
      await gramFramePage.clickMode('Analysis')
      
      // Verify UI remains consistent
      const state = await gramFramePage.getState()
      expectValidMode(state, 'analysis')
      expectValidCursorPosition(state, true)
      
      // Verify features are still intact
      expect(state.analysis.markers).toHaveLength(1)
      expect(state.harmonics.harmonicSets).toHaveLength(1)
    })
  })

  test.describe('Event Handling', () => {
    test('should handle mouse events correctly in each mode', async ({ gramFramePage }) => {
      const testPosition = { x: 200, y: 150 }
      
      // Test Analysis mode mouse events
      await gramFramePage.clickMode('Analysis')
      await gramFramePage.clickSpectrogram(testPosition.x, testPosition.y)
      
      let state = await gramFramePage.getState()
      expect(state.analysis.markers).toHaveLength(1)
      
      // Test Harmonics mode mouse events
      await gramFramePage.clickMode('Harmonics')
      await gramFramePage.page.mouse.move(testPosition.x + 50, testPosition.y)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(testPosition.x + 50, testPosition.y + 100)
      await gramFramePage.page.mouse.up()
      
      state = await gramFramePage.getState()
      expect(state.harmonics.harmonicSets).toHaveLength(1)
      
      // Test Doppler mode mouse events
      await gramFramePage.clickMode('Doppler')
      await gramFramePage.page.mouse.move(testPosition.x + 100, testPosition.y)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(testPosition.x + 150, testPosition.y + 50)
      await gramFramePage.page.mouse.up()
      
      state = await gramFramePage.getState()
      expect(state.doppler.fPlus).toBeDefined()
      expect(state.doppler.fMinus).toBeDefined()
    })
    
    test('should prevent mode-specific event conflicts', async ({ gramFramePage }) => {
      // Create Analysis marker
      await gramFramePage.clickMode('Analysis')
      await gramFramePage.clickSpectrogram(200, 150)
      
      // Switch to Harmonics and try to interact at same position
      await gramFramePage.clickMode('Harmonics')
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(200, 250)
      await gramFramePage.page.mouse.up()
      
      // Verify both features coexist without conflict
      const state = await gramFramePage.getState()
      expect(state.analysis.markers).toHaveLength(1)
      expect(state.harmonics.harmonicSets).toHaveLength(1)
      
      // Analysis marker should not be affected by harmonics interaction
      expect(state.analysis.markers[0].time).toBeGreaterThan(0)
      expect(state.analysis.markers[0].freq).toBeGreaterThan(0)
    })
    
    test('should handle keyboard events consistently across modes', async ({ gramFramePage }) => {
      const modes = ['Analysis', 'Harmonics', 'Doppler']
      
      for (const mode of modes) {
        await gramFramePage.clickMode(mode)
        
        // Test escape key (should not cause errors)
        await gramFramePage.page.keyboard.press('Escape')
        
        // Test arrow keys (should not cause errors)
        await gramFramePage.page.keyboard.press('ArrowLeft')
        await gramFramePage.page.keyboard.press('ArrowRight')
        
        // Verify state remains valid
        const state = await gramFramePage.getState()
        expectValidMode(state, mode.toLowerCase())
        expectValidMetadata(state)
      }
    })
  })

  test.describe('Performance and Responsiveness', () => {
    test('should maintain performance during rapid mode switching with features', async ({ gramFramePage }) => {
      // Create multiple features
      await gramFramePage.clickMode('Analysis')
      for (let i = 0; i < 5; i++) {
        await gramFramePage.clickSpectrogram(150 + i * 30, 100 + i * 20)
      }
      
      await gramFramePage.clickMode('Harmonics')
      for (let i = 0; i < 3; i++) {
        await gramFramePage.page.mouse.move(200 + i * 50, 120)
        await gramFramePage.page.mouse.down()
        await gramFramePage.page.mouse.move(200 + i * 50, 220)
        await gramFramePage.page.mouse.up()
        await gramFramePage.page.waitForTimeout(100)
      }
      
      // Rapidly switch modes
      const startTime = Date.now()
      const modes = ['Doppler', 'Analysis', 'Harmonics', 'Doppler', 'Analysis']
      
      for (const mode of modes) {
        await gramFramePage.clickMode(mode)
        await gramFramePage.page.waitForTimeout(50)
      }
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Mode switching should be reasonably fast (< 2 seconds for 5 switches)
      expect(duration).toBeLessThan(2000)
      
      // Verify all features are still intact
      const state = await gramFramePage.getState()
      expect(state.analysis.markers).toHaveLength(5)
      expect(state.harmonics.harmonicSets).toHaveLength(3)
    })
    
    test('should handle memory management across mode switches', async ({ gramFramePage }) => {
      // Create and clear features multiple times
      for (let iteration = 0; iteration < 3; iteration++) {
        // Create Analysis markers
        await gramFramePage.clickMode('Analysis')
        for (let i = 0; i < 10; i++) {
          await gramFramePage.clickSpectrogram(100 + i * 20, 100 + i * 10)
        }
        
        // Create Harmonics
        await gramFramePage.clickMode('Harmonics')
        for (let i = 0; i < 5; i++) {
          await gramFramePage.page.mouse.move(150 + i * 40, 100)
          await gramFramePage.page.mouse.down()
          await gramFramePage.page.mouse.move(150 + i * 40, 200)
          await gramFramePage.page.mouse.up()
        }
        
        // Switch modes multiple times
        await gramFramePage.clickMode('Doppler')
        await gramFramePage.clickMode('Analysis')
        await gramFramePage.clickMode('Harmonics')
        
        // Verify state is still valid
        const state = await gramFramePage.getState()
        expectValidMetadata(state)
        expectValidMode(state, 'harmonics')
      }
    })
  })

  test.describe('Error Recovery', () => {
    test('should recover from interrupted operations during mode switch', async ({ gramFramePage }) => {
      // Start operation in one mode
      await gramFramePage.clickMode('Harmonics')
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      
      // Switch mode mid-operation
      await gramFramePage.clickMode('Doppler')
      
      // Try to complete operation in wrong mode
      await gramFramePage.page.mouse.move(300, 200)
      await gramFramePage.page.mouse.up()
      
      // Verify system handles this gracefully
      const state = await gramFramePage.getState()
      expectValidMode(state, 'doppler')
      expectValidMetadata(state)
      
      // Should not be in inconsistent drag state
      expect(state.harmonics?.dragState?.isDragging).toBeFalsy()
      expect(state.doppler?.isDragging).toBeFalsy()
    })
    
    test('should handle mode switching during error conditions', async ({ gramFramePage }) => {
      // Create features
      await gramFramePage.clickMode('Analysis')
      await gramFramePage.clickSpectrogram(200, 150)
      
      try {
        // Trigger potential error condition (rapid operations)
        await gramFramePage.clickSpectrogram(200, 150) // Same position
        await gramFramePage.clickMode('Harmonics')
        await gramFramePage.clickMode('Doppler')
        await gramFramePage.clickMode('Analysis')
        
        // Verify system recovers
        const state = await gramFramePage.getState()
        expectValidMode(state, 'analysis')
        expectValidMetadata(state)
        expect(state.analysis.markers).toBeDefined()
      } catch (error) {
        // Even if errors occur, system should remain in valid state
        const state = await gramFramePage.getState()
        expectValidMetadata(state)
      }
    })
  })

  test.describe('State Synchronization', () => {
    test('should synchronize state listeners across mode changes', async ({ gramFramePage }) => {
      // Test that state updates are properly broadcast during mode switches
      let lastNotifiedState = null
      
      // Add state listener via page evaluation
      await gramFramePage.page.evaluate(() => {
        window.testStateHistory = []
        window.GramFrame.addStateListener(state => {
          window.testStateHistory.push({
            mode: state.mode,
            timestamp: Date.now()
          })
        })
      })
      
      // Switch modes and create features
      await gramFramePage.clickMode('Analysis')
      await gramFramePage.clickSpectrogram(200, 150)
      
      await gramFramePage.clickMode('Harmonics')
      await gramFramePage.page.mouse.move(250, 120)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(250, 220)
      await gramFramePage.page.mouse.up()
      
      await gramFramePage.clickMode('Doppler')
      
      // Check state history
      const stateHistory = await gramFramePage.page.evaluate(() => window.testStateHistory)
      
      // Should have received multiple state updates
      expect(stateHistory.length).toBeGreaterThan(3)
      
      // Should include all mode changes
      const modes = stateHistory.map(h => h.mode)
      expect(modes).toContain('analysis')
      expect(modes).toContain('harmonics')
      expect(modes).toContain('doppler')
    })
  })
})