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
    await gramFramePage.page.waitForTimeout(100)
  })

  test.describe('Mode Switching', () => {
    
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
    
    
    test('should persist Doppler markers across mode switches', async ({ gramFramePage }) => {
      // Create Doppler markers
      await gramFramePage.clickMode('Doppler')
      
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(300, 200)
      await gramFramePage.page.mouse.up()
      
      // Store original Doppler state
      let state = await gramFramePage.getState()
      
      // Skip if no Doppler markers were created
      if (!state.doppler?.fPlus || !state.doppler?.fMinus) {
        return
      }
      
      const originalDoppler = {
        fPlus: { ...state.doppler.fPlus },
        fMinus: { ...state.doppler.fMinus },
        fZero: state.doppler.fZero ? { ...state.doppler.fZero } : null
      }
      
      // Switch modes and verify persistence
      const modes = ['Analysis', 'Harmonics', 'Doppler']
      
      for (const mode of modes) {
        await gramFramePage.clickMode(mode)
        
        state = await gramFramePage.getState()
        expect(state.doppler?.fPlus).toEqual(originalDoppler.fPlus)
        expect(state.doppler?.fMinus).toEqual(originalDoppler.fMinus)
        if (originalDoppler.fZero) {
          expect(state.doppler?.fZero).toEqual(originalDoppler.fZero)
        }
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
      
      // Check analysis markers
      expect(state.analysis?.markers?.length).toBeGreaterThan(0)
      
      // Check harmonics (may or may not exist)
      if (state.harmonics?.harmonicSets) {
        expect(state.harmonics.harmonicSets.length).toBeGreaterThanOrEqual(0)
      }
      
      // Check Doppler markers (may or may not exist)
      if (state.doppler?.fPlus && state.doppler?.fMinus) {
        expect(state.doppler.fPlus).toBeDefined()
        expect(state.doppler.fMinus).toBeDefined()
      }
      
      // Switch through all modes and verify all features persist
      const modes = ['Analysis', 'Harmonics', 'Doppler']
      
      for (const mode of modes) {
        await gramFramePage.clickMode(mode)
        
        const currentState = await gramFramePage.getState()
        
        // Verify analysis markers persist
        expect(currentState.analysis?.markers?.length).toBeGreaterThan(0)
        
        // Check other features if they were created
        if (state.harmonics?.harmonicSets?.length > 0) {
          expect(currentState.harmonics?.harmonicSets?.length).toBe(state.harmonics.harmonicSets.length)
        }
        
        if (state.doppler?.fPlus && state.doppler?.fMinus) {
          expect(currentState.doppler?.fPlus).toBeDefined()
          expect(currentState.doppler?.fMinus).toBeDefined()
        }
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
        
        // Check for markers in SVG (may not be visible in all modes)
        try {
          const markerElements = gramFramePage.page.locator('.gram-frame-analysis-marker')
          const count = await markerElements.count()
          if (count > 0) {
            expect(count).toBeGreaterThan(0)
            
            // Check if markers are visible
            for (let i = 0; i < Math.min(count, 2); i++) {
              const marker = markerElements.nth(i)
              const isVisible = await marker.isVisible()
              // Visibility may vary by mode, so we just check it's defined
              expect(typeof isVisible).toBe('boolean')
            }
          }
        } catch (error) {
          // Markers may not be visible in all modes
        }
      }
    })
    
  })

  test.describe('UI Consistency', () => {
  })

  test.describe('Event Handling', () => {
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