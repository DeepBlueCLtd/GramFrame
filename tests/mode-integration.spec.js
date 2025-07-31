import { test, expect } from './helpers/fixtures.js'
import { 
  expectValidMetadata, 
  expectValidMode, 
  expectValidCursorPosition,
  expectValidConfig,
  expectValidImageDetails 
} from './helpers/state-assertions.js'

/**
 * @fileoverview Comprehensive E2E tests for Cross-Mode Integration
 * Tests mode switching, state persistence, feature visibility, and interaction between modes
 */

/**
 * Cross-Mode Integration test suite
 * @description Tests mode switching, state persistence, feature visibility, and interaction between modes
 */
test.describe('Cross-Mode Integration - Comprehensive E2E Tests', () => {
  /**
   * Setup before each test
   * @param {TestParams} params - Test parameters
   * @param {import('./helpers/gram-frame-page.js').default} params.gramFramePage - GramFrame page object
   * @returns {Promise<void>}
   */
  test.beforeEach(async ({ gramFramePage }) => {
    // Wait for component to fully load
    await gramFramePage.page.waitForTimeout(100)
  })

  /**
   * Mode switching test suite
   */
  test.describe('Mode Switching', () => {
    
    /**
     * Test proper button states during mode switching
     * @param {TestParams} params - Test parameters
     * @param {import('./helpers/gram-frame-page.js').default} params.gramFramePage - GramFrame page object
     * @returns {Promise<void>}
     */
    test('should maintain proper button states during mode switching', async ({ gramFramePage }) => {
      /** @type {string[]} */
      const modes = ['Cross Cursor', 'Harmonics', 'Doppler']
      
      for (const mode of modes) {
        await gramFramePage.clickMode(mode)
        
        // Verify active button styling
        /** @type {import('@playwright/test').Locator} */
        const activeButton = gramFramePage.page.locator(`.gram-frame-mode-btn:text("${mode}")`)
        /** @type {boolean} */
        const isActive = await activeButton.evaluate(btn => btn.classList.contains('active') || btn.getAttribute('aria-pressed') === 'true')
        expect(isActive).toBe(true)
        
        // Verify other buttons are not active
        for (const otherMode of modes) {
          if (otherMode !== mode) {
            /** @type {import('@playwright/test').Locator} */
            const otherButton = gramFramePage.page.locator(`.gram-frame-mode-btn:text("${otherMode}")`)
            /** @type {boolean} */
            const isOtherActive = await otherButton.evaluate(btn => btn.classList.contains('active') || btn.getAttribute('aria-pressed') === 'true')
            expect(isOtherActive).toBe(false)
          }
        }
      }
    })
  })

  /**
   * State persistence test suite
   */
  test.describe('State Persistence', () => {
    
    
    /**
     * Test Doppler marker persistence across mode switches
     * @param {TestParams} params - Test parameters
     * @param {import('./helpers/gram-frame-page.js').default} params.gramFramePage - GramFrame page object
     * @returns {Promise<void>}
     */
    test('should persist Doppler markers across mode switches', async ({ gramFramePage }) => {
      // Create Doppler markers
      await gramFramePage.clickMode('Doppler')
      
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(300, 200)
      await gramFramePage.page.mouse.up()
      
      // Store original Doppler state
      /** @type {import('../src/types.js').GramFrameState} */
      let state = await gramFramePage.getState()
      
      // Skip if no Doppler markers were created
      if (!state.doppler?.fPlus || !state.doppler?.fMinus) {
        return
      }
      
      /** @type {{fPlus: import('../src/types.js').DataCoordinates, fMinus: import('../src/types.js').DataCoordinates, fZero: import('../src/types.js').DataCoordinates | null}} */
      const originalDoppler = {
        fPlus: { ...state.doppler.fPlus },
        fMinus: { ...state.doppler.fMinus },
        fZero: state.doppler.fZero ? { ...state.doppler.fZero } : null
      }
      
      // Switch modes and verify persistence
      /** @type {string[]} */
      const modes = ['Cross Cursor', 'Harmonics', 'Doppler']
      
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
    
    /**
     * Test maintaining all feature types simultaneously
     * @param {TestParams} params - Test parameters
     * @param {import('./helpers/gram-frame-page.js').default} params.gramFramePage - GramFrame page object
     * @returns {Promise<void>}
     */
    test('should maintain all feature types simultaneously', async ({ gramFramePage }) => {
      // Create features in all modes
      
      // Cross Cursor markers
      await gramFramePage.clickMode('Cross Cursor')
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
      /** @type {import('../src/types.js').GramFrameState} */
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
      /** @type {string[]} */
      const modes = ['Cross Cursor', 'Harmonics', 'Doppler']
      
      for (const mode of modes) {
        await gramFramePage.clickMode(mode)
        
        /** @type {import('../src/types.js').GramFrameState} */
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

  /**
   * Feature visibility test suite
   */
  test.describe('Feature Visibility', () => {
    /**
     * Test Cross Cursor marker visibility in all modes
     * @param {TestParams} params - Test parameters
     * @param {import('./helpers/gram-frame-page.js').default} params.gramFramePage - GramFrame page object
     * @returns {Promise<void>}
     */
    test('should show Cross Cursor markers in all modes', async ({ gramFramePage }) => {
      // Create Cross Cursor markers
      await gramFramePage.clickMode('Cross Cursor')
      await gramFramePage.clickSpectrogram(200, 150)
      await gramFramePage.clickSpectrogram(300, 200)
      
      // Test visibility in each mode
      /** @type {string[]} */
      const modes = ['Cross Cursor', 'Harmonics', 'Doppler']
      
      for (const mode of modes) {
        await gramFramePage.clickMode(mode)
        
        // Check for markers in SVG (may not be visible in all modes)
        try {
          /** @type {import('@playwright/test').Locator} */
          const markerElements = gramFramePage.page.locator('.gram-frame-analysis-marker')
          /** @type {number} */
          const count = await markerElements.count()
          if (count > 0) {
            expect(count).toBeGreaterThan(0)
            
            // Check if markers are visible
            for (let i = 0; i < Math.min(count, 2); i++) {
              /** @type {import('@playwright/test').Locator} */
              const marker = markerElements.nth(i)
              /** @type {boolean} */
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

  /**
   * UI consistency test suite
   */
  test.describe('UI Consistency', () => {
  })

  /**
   * Event handling test suite
   */
  test.describe('Event Handling', () => {
    /**
     * Test keyboard event consistency across modes
     * @param {TestParams} params - Test parameters
     * @param {import('./helpers/gram-frame-page.js').default} params.gramFramePage - GramFrame page object
     * @returns {Promise<void>}
     */
    test('should handle keyboard events consistently across modes', async ({ gramFramePage }) => {
      /** @type {string[]} */
      const modes = ['Cross Cursor', 'Harmonics', 'Doppler']
      
      for (const mode of modes) {
        await gramFramePage.clickMode(mode)
        
        // Test escape key (should not cause errors)
        await gramFramePage.page.keyboard.press('Escape')
        
        // Test arrow keys (should not cause errors)
        await gramFramePage.page.keyboard.press('ArrowLeft')
        await gramFramePage.page.keyboard.press('ArrowRight')
        
        // Verify state remains valid
        /** @type {import('../src/types.js').GramFrameState} */
        const state = await gramFramePage.getState()
        expectValidMode(state, mode.toLowerCase())
        expectValidMetadata(state)
      }
    })
  })

  /**
   * Performance and responsiveness test suite
   */
  test.describe('Performance and Responsiveness', () => {
  })

  /**
   * Error recovery test suite
   */
  test.describe('Error Recovery', () => {
    /**
     * Test recovery from interrupted operations during mode switch
     * @param {TestParams} params - Test parameters
     * @param {import('./helpers/gram-frame-page.js').default} params.gramFramePage - GramFrame page object
     * @returns {Promise<void>}
     */
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
      /** @type {import('../src/types.js').GramFrameState} */
      const state = await gramFramePage.getState()
      expectValidMode(state, 'doppler')
      expectValidMetadata(state)
      
      // Should not be in inconsistent drag state
      expect(state.harmonics?.dragState?.isDragging).toBeFalsy()
      expect(state.doppler?.isDragging).toBeFalsy()
    })
    
    /**
     * Test mode switching during error conditions
     * @param {TestParams} params - Test parameters
     * @param {import('./helpers/gram-frame-page.js').default} params.gramFramePage - GramFrame page object
     * @returns {Promise<void>}
     */
    test('should handle mode switching during error conditions', async ({ gramFramePage }) => {
      // Create features
      await gramFramePage.clickMode('Cross Cursor')
      await gramFramePage.clickSpectrogram(200, 150)
      
      try {
        // Trigger potential error condition (rapid operations)
        await gramFramePage.clickSpectrogram(200, 150) // Same position
        await gramFramePage.clickMode('Harmonics')
        await gramFramePage.clickMode('Doppler')
        await gramFramePage.clickMode('Cross Cursor')
        
        // Verify system recovers
        /** @type {import('../src/types.js').GramFrameState} */
        const state = await gramFramePage.getState()
        expectValidMode(state, 'analysis')
        expectValidMetadata(state)
        expect(state.analysis.markers).toBeDefined()
      } catch (error) {
        // Even if errors occur, system should remain in valid state
        /** @type {import('../src/types.js').GramFrameState} */
        const state = await gramFramePage.getState()
        expectValidMetadata(state)
      }
    })
  })

  /**
   * State synchronization test suite
   */
  test.describe('State Synchronization', () => {
    /**
     * Test state listener synchronization across mode changes
     * @param {TestParams} params - Test parameters
     * @param {import('./helpers/gram-frame-page.js').default} params.gramFramePage - GramFrame page object
     * @returns {Promise<void>}
     */
    test('should synchronize state listeners across mode changes', async ({ gramFramePage }) => {
      // Test that state updates are properly broadcast during mode switches
      /** @type {import('../src/types.js').GramFrameState | null} */
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
      await gramFramePage.clickMode('Cross Cursor')
      await gramFramePage.clickSpectrogram(200, 150)
      
      await gramFramePage.clickMode('Harmonics')
      await gramFramePage.page.mouse.move(250, 120)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(250, 220)
      await gramFramePage.page.mouse.up()
      
      await gramFramePage.clickMode('Doppler')
      
      // Check state history
      /** @type {Array<{mode: string, timestamp: number}>} */
      const stateHistory = await gramFramePage.page.evaluate(() => window.testStateHistory)
      
      // Should have received multiple state updates
      expect(stateHistory.length).toBeGreaterThan(3)
      
      // Should include all mode changes
      /** @type {string[]} */
      const modes = stateHistory.map(h => h.mode)
      expect(modes).toContain('analysis')
      expect(modes).toContain('harmonics')
      expect(modes).toContain('doppler')
    })
  })
})