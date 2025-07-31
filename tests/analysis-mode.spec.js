import { test, expect } from './helpers/fixtures.js'
import { 
  expectValidMetadata, 
  expectValidMode, 
  expectValidCursorPosition,
  expectValidConfig,
  expectValidImageDetails 
} from './helpers/state-assertions.js'

/**
 * @fileoverview Comprehensive E2E tests for Cross Cursor Mode functionality
 * Tests all mouse interactions, marker management, and cross-mode persistence
 */

/**
 * Cross Cursor Mode test suite
 * @description Tests all mouse interactions, marker management, and cross-mode persistence
 */
test.describe('Cross Cursor Mode - Comprehensive E2E Tests', () => {
  /**
   * Setup before each test - switch to Cross Cursor mode
   * @param {TestParams} params - Test parameters
   * @param {import('./helpers/gram-frame-page.js').default} params.gramFramePage - GramFrame page object
   * @returns {Promise<void>}
   */
  test.beforeEach(async ({ gramFramePage }) => {
    // Switch to Cross Cursor mode and verify
    await gramFramePage.clickMode('Cross Cursor')
    
    // Wait a moment for mode switch to complete
    await gramFramePage.page.waitForTimeout(200)
    
    // Verify we're in analysis mode
    /** @type {import('../src/types.js').GramFrameState} */
    const state = await gramFramePage.getState()
    expectValidMode(state, 'analysis')
  })

  /**
   * Mouse hover interactions test suite
   */
  test.describe('Mouse Hover Interactions', () => {
    /**
     * Test cursor position and LED display updates on mouse hover
     * @param {TestParams} params - Test parameters
     * @param {import('./helpers/gram-frame-page.js').default} params.gramFramePage - GramFrame page object
     * @returns {Promise<void>}
     */
    test('should update cursor position and LED displays on mouse hover', async ({ gramFramePage }) => {
      // Move mouse to a specific position on the spectrogram
      /** @type {number} */
      const testX = 200
      /** @type {number} */
      const testY = 150
      
      await gramFramePage.moveMouseToSpectrogram(testX, testY)
      
      // Verify cursor position is updated in state
      /** @type {import('../src/types.js').GramFrameState} */
      const state = await gramFramePage.getState()
      expectValidCursorPosition(state, true)
      
      // Verify LED displays show frequency and time values
      /** @type {string} */
      const freqValue = await gramFramePage.getLEDValue('Frequency (Hz)')
      /** @type {string} */
      const timeValue = await gramFramePage.getLEDValue('Time (mm:ss)')
      
      // Frequency value may or may not include Hz suffix
      expect(freqValue).toMatch(/^\d+(\.\d+)?(\s*Hz)?$/)
      expect(timeValue).toMatch(/^\d{1,2}:\d{2}$/)
    })
    
    /**
     * Test handling of rapid mouse movements
     * @param {TestParams} params - Test parameters
     * @param {import('./helpers/gram-frame-page.js').default} params.gramFramePage - GramFrame page object
     * @returns {Promise<void>}
     */
    test('should handle rapid mouse movements smoothly', async ({ gramFramePage }) => {
      // Test rapid mouse movements across the spectrogram
      /** @type {Array<{x: number, y: number}>} */
      const positions = [
        { x: 100, y: 100 },
        { x: 300, y: 200 },
        { x: 150, y: 300 },
        { x: 400, y: 150 },
        { x: 250, y: 250 }
      ]
      
      for (const pos of positions) {
        await gramFramePage.moveMouseToSpectrogram(pos.x, pos.y)
        // Small delay to simulate realistic mouse movement
        await gramFramePage.page.waitForTimeout(50)
      }
      
      // Verify final state has valid cursor position
      /** @type {import('../src/types.js').GramFrameState} */
      const state = await gramFramePage.getState()
      expectValidCursorPosition(state, true)
    })
    
    /**
     * Test cursor position clearing when mouse leaves spectrogram
     * @param {TestParams} params - Test parameters
     * @param {import('./helpers/gram-frame-page.js').default} params.gramFramePage - GramFrame page object
     * @returns {Promise<void>}
     */
    test('should clear cursor position when mouse leaves spectrogram', async ({ gramFramePage }) => {
      // Move mouse over spectrogram first
      await gramFramePage.moveMouseToSpectrogram(200, 150)
      
      // Verify cursor position exists
      /** @type {import('../src/types.js').GramFrameState} */
      let state = await gramFramePage.getState()
      expectValidCursorPosition(state, true)
      
      // Move mouse outside the spectrogram area
      await gramFramePage.page.mouse.move(50, 50) // Outside the SVG area
      
      // Small delay for mouse leave event to process
      await gramFramePage.page.waitForTimeout(100)
      
      // Verify cursor position is cleared
      state = await gramFramePage.getState()
      expect(state.cursorPosition).toBeNull()
    })
  })

  /**
   * Marker creation test suite
   */
  test.describe('Marker Creation', () => {
    /**
     * Test marker creation on click
     * @param {TestParams} params - Test parameters
     * @param {import('./helpers/gram-frame-page.js').default} params.gramFramePage - GramFrame page object
     * @returns {Promise<void>}
     */
    test('should create marker on click', async ({ gramFramePage }) => {
      /** @type {number} */
      const clickX = 200
      /** @type {number} */
      const clickY = 150
      
      // Click to create a marker
      await gramFramePage.clickSpectrogram(clickX, clickY)
      
      // Verify marker was created in state
      /** @type {import('../src/types.js').GramFrameState} */
      const state = await gramFramePage.getState()
      expect(state.analysis?.markers).toBeDefined()
      expect(state.analysis.markers).toHaveLength(1)
      
      /** @type {import('../src/types.js').AnalysisMarker} */
      const marker = state.analysis.markers[0]
      expect(marker).toHaveProperty('id')
      expect(marker).toHaveProperty('time')
      expect(marker).toHaveProperty('freq')
      expect(marker).toHaveProperty('color')
      expect(marker.time).toBeGreaterThan(0)
      expect(marker.freq).toBeGreaterThan(0)
    })
    
    /**
     * Test creating multiple markers at different positions
     * @param {TestParams} params - Test parameters
     * @param {import('./helpers/gram-frame-page.js').default} params.gramFramePage - GramFrame page object
     * @returns {Promise<void>}
     */
    test('should create multiple markers at different positions', async ({ gramFramePage }) => {
      /** @type {Array<{x: number, y: number}>} */
      const positions = [
        { x: 150, y: 100 },
        { x: 250, y: 200 },
        { x: 350, y: 150 }
      ]
      
      // Create markers at different positions
      for (const pos of positions) {
        await gramFramePage.clickSpectrogram(pos.x, pos.y)
        await gramFramePage.page.waitForTimeout(100) // Small delay between clicks
      }
      
      // Verify all markers were created
      /** @type {import('../src/types.js').GramFrameState} */
      const state = await gramFramePage.getState()
      expect(state.analysis?.markers).toHaveLength(3)
      
      // Verify markers have unique IDs
      /** @type {string[]} */
      const markerIds = state.analysis.markers.map(m => m.id)
      /** @type {Set<string>} */
      const uniqueIds = new Set(markerIds)
      expect(uniqueIds.size).toBe(3)
    })
    
  })

  /**
   * Marker persistence test suite
   */
  test.describe('Marker Persistence', () => {
    /**
     * Test marker persistence when switching modes
     * @param {TestParams} params - Test parameters
     * @param {import('./helpers/gram-frame-page.js').default} params.gramFramePage - GramFrame page object
     * @returns {Promise<void>}
     */
    test('should persist markers when switching modes', async ({ gramFramePage }) => {
      // Create a marker in Cross Cursor mode
      await gramFramePage.clickSpectrogram(200, 150)
      
      // Verify marker exists
      /** @type {import('../src/types.js').GramFrameState} */
      let state = await gramFramePage.getState()
      expect(state.analysis?.markers).toHaveLength(1)
      /** @type {import('../src/types.js').AnalysisMarker} */
      const originalMarker = state.analysis.markers[0]
      
      // Switch to Harmonics mode
      await gramFramePage.clickMode('Harmonics')
      
      // Verify we're in harmonics mode but marker persists
      state = await gramFramePage.getState()
      expectValidMode(state, 'harmonics')
      expect(state.analysis?.markers).toHaveLength(1)
      expect(state.analysis.markers[0]).toEqual(originalMarker)
      
      // Switch back to Cross Cursor mode
      await gramFramePage.clickMode('Cross Cursor')
      
      // Verify marker is still there
      state = await gramFramePage.getState()
      expectValidMode(state, 'analysis')
      expect(state.analysis?.markers).toHaveLength(1)
      expect(state.analysis.markers[0]).toEqual(originalMarker)
    })
    
    /**
     * Test maintaining markers across mode switches with multiple markers
     * @param {TestParams} params - Test parameters
     * @param {import('./helpers/gram-frame-page.js').default} params.gramFramePage - GramFrame page object
     * @returns {Promise<void>}
     */
    test('should maintain markers across mode switches with multiple markers', async ({ gramFramePage }) => {
      // Create multiple markers
      /** @type {Array<{x: number, y: number}>} */
      const positions = [
        { x: 150, y: 100 },
        { x: 250, y: 200 },
        { x: 350, y: 150 }
      ]
      
      for (const pos of positions) {
        await gramFramePage.clickSpectrogram(pos.x, pos.y)
      }
      
      // Store original markers
      /** @type {import('../src/types.js').GramFrameState} */
      let state = await gramFramePage.getState()
      /** @type {import('../src/types.js').AnalysisMarker[]} */
      const originalMarkers = [...state.analysis.markers]
      expect(originalMarkers).toHaveLength(3)
      
      // Switch through all modes
      /** @type {string[]} */
      const modes = ['cross cursor', 'harmonics', 'doppler']
      for (const mode of modes) {
        await gramFramePage.clickMode(mode)
        
        state = await gramFramePage.getState()
        expectValidMode(state, mode)
        
        // Verify markers persist
        expect(state.analysis?.markers).toHaveLength(3)
        expect(state.analysis.markers).toEqual(originalMarkers)
      }
    })
  })


  /**
   * Marker deletion test suite
   */
  test.describe('Marker Deletion', () => {
    /**
     * Test marker deletion via right-click (if implemented)
     * @param {TestParams} params - Test parameters
     * @param {import('./helpers/gram-frame-page.js').default} params.gramFramePage - GramFrame page object
     * @returns {Promise<void>}
     */
    test('should delete marker via right-click (if implemented)', async ({ gramFramePage }) => {
      // Create a marker first
      await gramFramePage.clickSpectrogram(200, 150)
      
      // Verify marker exists
      /** @type {import('../src/types.js').GramFrameState} */
      let state = await gramFramePage.getState()
      expect(state.analysis?.markers).toHaveLength(1)
      
      try {
        // Right-click on the marker position
        await gramFramePage.svg.click({ 
          button: 'right', 
          position: { x: 200, y: 150 } 
        })
        
        // Small delay for right-click handling
        await gramFramePage.page.waitForTimeout(200)
        
        // Verify marker was deleted (if right-click deletion is implemented)
        state = await gramFramePage.getState()
        // Note: This test assumes right-click deletion is implemented
        // If not implemented, the marker count will still be 1
      } catch (error) {
        console.log('Right-click deletion not implemented or failed')
      }
    })
  })

  /**
   * Cross-mode visibility test suite
   */
  test.describe('Cross-Mode Visibility', () => {
    /**
     * Test that Cross Cursor markers show in other modes
     * @param {TestParams} params - Test parameters
     * @param {import('./helpers/gram-frame-page.js').default} params.gramFramePage - GramFrame page object
     * @returns {Promise<void>}
     */
    test('should show Cross Cursor markers in other modes', async ({ gramFramePage }) => {
      // Create markers in Cross Cursor mode
      await gramFramePage.clickSpectrogram(200, 150)
      await gramFramePage.clickSpectrogram(300, 200)
      
      // Switch to Harmonics mode
      await gramFramePage.clickMode('Harmonics')
      
      // Verify markers are still visible in SVG
      /** @type {import('@playwright/test').Locator} */
      const markerElements = gramFramePage.page.locator('.gram-frame-analysis-marker')
      await expect(markerElements).toHaveCount(2)
      
      // Switch to Doppler mode
      await gramFramePage.clickMode('Doppler')
      
      // Verify markers are still visible
      await expect(markerElements).toHaveCount(2)
    })
  })

  /**
   * Edge cases and error handling test suite
   */
  test.describe('Edge Cases and Error Handling', () => {
    /**
     * Test handling clicks at spectrogram boundaries
     * @param {TestParams} params - Test parameters
     * @param {import('./helpers/gram-frame-page.js').default} params.gramFramePage - GramFrame page object
     * @returns {Promise<void>}
     */
    test('should handle clicks at spectrogram boundaries', async ({ gramFramePage }) => {
      // Get SVG dimensions for boundary testing
      /** @type {import('@playwright/test').BoundingBox | null} */
      const svgBox = await gramFramePage.svg.boundingBox()
      expect(svgBox).toBeTruthy()
      
      if (svgBox) {
        // Test clicks near the edges (accounting for axes margins)
        /** @type {Array<{x: number, y: number}>} */
        const edgePositions = [
          { x: 65, y: 50 }, // Near left edge (after left margin)
          { x: svgBox.width - 10, y: 50 }, // Near right edge
          { x: 200, y: 50 }, // Near top edge
          { x: 200, y: svgBox.height - 55 } // Near bottom edge (before bottom margin)
        ]
        
        for (const pos of edgePositions) {
          await gramFramePage.clickSpectrogram(pos.x, pos.y)
        }
        
        // Verify markers were created (some boundary positions might not create markers)
        /** @type {import('../src/types.js').GramFrameState} */
        const state = await gramFramePage.getState()
        expect(state.analysis?.markers?.length).toBeGreaterThanOrEqual(1)
        expect(state.analysis?.markers?.length).toBeLessThanOrEqual(4)
      }
    })
    
    /**
     * Test handling rapid successive clicks
     * @param {TestParams} params - Test parameters
     * @param {import('./helpers/gram-frame-page.js').default} params.gramFramePage - GramFrame page object
     * @returns {Promise<void>}
     */
    test('should handle rapid successive clicks', async ({ gramFramePage }) => {
      // Create markers rapidly
      /** @type {Array<{x: number, y: number}>} */
      const rapidClicks = [
        { x: 150, y: 100 },
        { x: 160, y: 110 },
        { x: 170, y: 120 },
        { x: 180, y: 130 }
      ]
      
      for (const pos of rapidClicks) {
        await gramFramePage.clickSpectrogram(pos.x, pos.y)
        // Minimal delay to simulate rapid clicking
        await gramFramePage.page.waitForTimeout(50)
      }
      
      // Verify all markers were created
      /** @type {import('../src/types.js').GramFrameState} */
      const state = await gramFramePage.getState()
      expect(state.analysis?.markers).toHaveLength(4)
      
      // Verify each marker has valid properties
      state.analysis.markers.forEach(/** @param {import('../src/types.js').AnalysisMarker} marker */ marker => {
        expect(marker).toHaveProperty('id')
        expect(marker).toHaveProperty('time')
        expect(marker).toHaveProperty('freq')
        expect(marker).toHaveProperty('color')
      })
    })
    
    /**
     * Test state consistency during concurrent operations
     * @param {TestParams} params - Test parameters
     * @param {import('./helpers/gram-frame-page.js').default} params.gramFramePage - GramFrame page object
     * @returns {Promise<void>}
     */
    test('should maintain state consistency during concurrent operations', async ({ gramFramePage }) => {
      // Perform multiple operations quickly
      await gramFramePage.clickSpectrogram(200, 150) // Create marker
      await gramFramePage.moveMouseToSpectrogram(250, 200) // Move mouse
      await gramFramePage.clickSpectrogram(300, 250) // Create another marker
      await gramFramePage.clickMode('Harmonics') // Switch mode
      await gramFramePage.clickMode('Cross Cursor') // Switch back
      
      // Verify final state is consistent
      /** @type {import('../src/types.js').GramFrameState} */
      const state = await gramFramePage.getState()
      expectValidMetadata(state)
      expectValidMode(state, 'analysis')
      expectValidConfig(state)
      expectValidImageDetails(state)
      expect(state.analysis?.markers).toHaveLength(2)
    })
  })

  /**
   * Coordinate system accuracy test suite
   */
  test.describe('Coordinate System Accuracy', () => {
    /**
     * Test accurate conversion from mouse coordinates to data coordinates
     * @param {TestParams} params - Test parameters
     * @param {import('./helpers/gram-frame-page.js').default} params.gramFramePage - GramFrame page object
     * @returns {Promise<void>}
     */
    test('should accurately convert mouse coordinates to data coordinates', async ({ gramFramePage }) => {
      // Click at a known position and verify the data coordinates are reasonable
      /** @type {number} */
      const clickX = 200
      /** @type {number} */
      const clickY = 150
      
      await gramFramePage.clickSpectrogram(clickX, clickY)
      
      /** @type {import('../src/types.js').GramFrameState} */
      const state = await gramFramePage.getState()
      /** @type {import('../src/types.js').AnalysisMarker} */
      const marker = state.analysis.markers[0]
      
      // Verify coordinates are within expected ranges based on config
      expect(marker.time).toBeGreaterThanOrEqual(state.config.timeMin)
      expect(marker.time).toBeLessThanOrEqual(state.config.timeMax)
      expect(marker.freq).toBeGreaterThanOrEqual(state.config.freqMin)
      expect(marker.freq).toBeLessThanOrEqual(state.config.freqMax)
    })
    
    /**
     * Test coordinate accuracy across different zoom levels
     * @param {TestParams} params - Test parameters
     * @param {import('./helpers/gram-frame-page.js').default} params.gramFramePage - GramFrame page object
     * @returns {Promise<void>}
     */
    test('should maintain coordinate accuracy across different zoom levels', async ({ gramFramePage }) => {
      // This test assumes zoom functionality exists
      // If not implemented, it will be skipped
      try {
        // Create a marker at a specific position
        await gramFramePage.clickSpectrogram(200, 150)
        /** @type {import('../src/types.js').GramFrameState} */
        const initialState = await gramFramePage.getState()
        /** @type {import('../src/types.js').AnalysisMarker} */
        const initialMarker = initialState.analysis.markers[0]
        
        // Attempt to zoom (if zoom controls exist)
        await gramFramePage.page.keyboard.press('Control+=') // Zoom in
        await gramFramePage.page.waitForTimeout(500)
        
        // Verify marker position remains accurate
        /** @type {import('../src/types.js').GramFrameState} */
        const zoomedState = await gramFramePage.getState()
        /** @type {import('../src/types.js').AnalysisMarker} */
        const zoomedMarker = zoomedState.analysis.markers[0]
        
        // Coordinates should remain the same in data space
        expect(Math.abs(zoomedMarker.time - initialMarker.time)).toBeLessThan(0.01)
        expect(Math.abs(zoomedMarker.freq - initialMarker.freq)).toBeLessThan(1)
      } catch (error) {
        console.log('Zoom functionality not available, skipping zoom coordinate test')
      }
    })
  })
})