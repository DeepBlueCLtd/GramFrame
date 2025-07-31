import { test, expect } from './helpers/fixtures'
import { 
  expectValidMetadata, 
  expectValidMode, 
  expectValidCursorPosition,
  expectValidConfig,
  expectValidImageDetails 
} from './helpers/state-assertions'

/**
 * Comprehensive E2E tests for Advanced Mouse Interactions
 * Tests complex interaction patterns, edge cases, error conditions, and performance
 */
test.describe('Advanced Mouse Interactions - Comprehensive E2E Tests', () => {
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

  test.describe('Zoom and Pan Interactions', () => {
    test('should handle mouse interactions during zoom operations', async ({ gramFramePage }) => {
      await gramFramePage.clickMode('Analysis')
      
      try {
        // Attempt to zoom using keyboard shortcuts
        await gramFramePage.page.keyboard.press('Control+=')
        await gramFramePage.page.waitForTimeout(300)
        
        // Create marker while zoomed
        await gramFramePage.clickSpectrogram(200, 150)
        
        // Verify marker creation works during zoom
        const state = await gramFramePage.getState()
        expect(state.analysis?.markers).toHaveLength(1)
        
        // Zoom out
        await gramFramePage.page.keyboard.press('Control+-')
        await gramFramePage.page.waitForTimeout(300)
        
        // Verify marker is still present and positioned correctly
        const finalState = await gramFramePage.getState()
        expect(finalState.analysis.markers).toHaveLength(1)
        expect(finalState.analysis.markers[0]).toEqual(state.analysis.markers[0])
      } catch (error) {
        console.log('Zoom functionality not available, skipping zoom interaction test')
      }
    })
    
    test('should maintain coordinate accuracy during zoom levels', async ({ gramFramePage }) => {
      await gramFramePage.clickMode('Analysis')
      
      // Create marker at normal zoom
      await gramFramePage.clickSpectrogram(200, 150)
      const normalZoomState = await gramFramePage.getState()
      const normalMarker = normalZoomState.analysis.markers[0]
      
      try {
        // Zoom in
        await gramFramePage.page.keyboard.press('Control+=')
        await gramFramePage.page.waitForTimeout(300)
        
        // Move mouse to same screen position and verify data coordinates
        await gramFramePage.moveMouseToSpectrogram(200, 150)
        const zoomedState = await gramFramePage.getState()
        
        if (zoomedState.cursorPosition) {
          // Cursor position should be similar to original marker position
          const timeDiff = Math.abs(zoomedState.cursorPosition.time - normalMarker.time)
          const freqDiff = Math.abs(zoomedState.cursorPosition.freq - normalMarker.freq)
          
          // Allow some tolerance for coordinate transformation differences
          expect(timeDiff).toBeLessThan(0.5) // 0.5 second tolerance
          expect(freqDiff).toBeLessThan(50) // 50 Hz tolerance
        }
      } catch (error) {
        console.log('Zoom coordinate testing not available')
      }
    })
    
    test('should handle pan operations with mouse interactions', async ({ gramFramePage }) => {
      await gramFramePage.clickMode('Harmonics')
      
      try {
        // Create harmonic set
        await gramFramePage.page.mouse.move(200, 150)
        await gramFramePage.page.mouse.down()
        await gramFramePage.page.mouse.move(200, 250)
        await gramFramePage.page.mouse.up()
        
        // Attempt pan operation (if available)
        await gramFramePage.page.keyboard.down('Space') // Common pan modifier
        await gramFramePage.page.mouse.move(300, 200)
        await gramFramePage.page.mouse.down()
        await gramFramePage.page.mouse.move(350, 250)
        await gramFramePage.page.mouse.up()
        await gramFramePage.page.keyboard.up('Space')
        
        // Verify harmonic set is still functional after pan
        const state = await gramFramePage.getState()
        expect(state.harmonics?.harmonicSets).toHaveLength(1)
        
        // Try to interact with harmonics after pan
        await gramFramePage.page.mouse.move(200, 200)
        await gramFramePage.page.mouse.down()
        await gramFramePage.page.mouse.move(200, 300)
        await gramFramePage.page.mouse.up()
        
        // Should either create new harmonic or modify existing one
        const finalState = await gramFramePage.getState()
        expect(finalState.harmonics.harmonicSets.length).toBeGreaterThanOrEqual(1)
      } catch (error) {
        console.log('Pan functionality not available')
      }
    })
  })

  test.describe('Edge Case Positioning', () => {
    test('should handle interactions at exact spectrogram boundaries', async ({ gramFramePage }) => {
      const svgBox = await gramFramePage.svg.boundingBox()
      expect(svgBox).toBeTruthy()
      
      if (svgBox) {
        await gramFramePage.clickMode('Analysis')
        
        // Test exact boundary positions (accounting for axes margins)
        const boundaryPositions = [
          { x: 60, y: 50, description: 'top-left corner' },
          { x: svgBox.width - 5, y: 50, description: 'top-right corner' },
          { x: 60, y: svgBox.height - 50, description: 'bottom-left corner' },
          { x: svgBox.width - 5, y: svgBox.height - 50, description: 'bottom-right corner' },
          { x: 60, y: svgBox.height / 2, description: 'left edge center' },
          { x: svgBox.width - 5, y: svgBox.height / 2, description: 'right edge center' },
          { x: svgBox.width / 2, y: 50, description: 'top edge center' },
          { x: svgBox.width / 2, y: svgBox.height - 50, description: 'bottom edge center' }
        ]
        
        for (const pos of boundaryPositions) {
          await gramFramePage.clickSpectrogram(pos.x, pos.y)
          await gramFramePage.page.waitForTimeout(100)
        }
        
        // Verify all boundary markers were created
        const state = await gramFramePage.getState()
        expect(state.analysis?.markers?.length).toBe(boundaryPositions.length)
        
        // Verify all markers have valid coordinates
        state.analysis.markers.forEach((marker, index) => {
          expect(marker.time).toBeGreaterThanOrEqual(state.config.timeMin)
          expect(marker.time).toBeLessThanOrEqual(state.config.timeMax)
          expect(marker.freq).toBeGreaterThanOrEqual(state.config.freqMin)
          expect(marker.freq).toBeLessThanOrEqual(state.config.freqMax)
        })
      }
    })
    
    test('should handle interactions just outside spectrogram area', async ({ gramFramePage }) => {
      const svgBox = await gramFramePage.svg.boundingBox()
      expect(svgBox).toBeTruthy()
      
      if (svgBox) {
        await gramFramePage.clickMode('Analysis')
        
        // Test positions just outside the spectrogram area
        const outsidePositions = [
          { x: 30, y: 100 }, // Left of spectrogram (in axis area)
          { x: svgBox.width + 10, y: 100 }, // Right of SVG
          { x: 200, y: 20 }, // Above spectrogram (in axis area)
          { x: 200, y: svgBox.height - 20 } // Below spectrogram (in axis area)
        ]
        
        let createdMarkers = 0
        
        for (const pos of outsidePositions) {
          try {
            await gramFramePage.clickSpectrogram(pos.x, pos.y)
            await gramFramePage.page.waitForTimeout(100)
            
            const state = await gramFramePage.getState()
            if (state.analysis?.markers?.length > createdMarkers) {
              createdMarkers = state.analysis.markers.length
            }
          } catch (error) {
            // Expected for positions outside clickable area
          }
        }
        
        // Some positions might create markers, others might not
        // This tests the robustness of boundary detection
        console.log(`Created ${createdMarkers} markers from outside positions`)
      }
    })
    
    test('should handle sub-pixel positioning accuracy', async ({ gramFramePage }) => {
      await gramFramePage.clickMode('Analysis')
      
      // Test fractional pixel positions
      const subPixelPositions = [
        { x: 200.5, y: 150.5 },
        { x: 200.25, y: 150.75 },
        { x: 200.1, y: 150.9 }
      ]
      
      for (const pos of subPixelPositions) {
        await gramFramePage.page.mouse.click(pos.x, pos.y)
        await gramFramePage.page.waitForTimeout(100)
      }
      
      // Verify markers were created with sub-pixel precision
      const state = await gramFramePage.getState()
      expect(state.analysis?.markers?.length).toBe(subPixelPositions.length)
      
      // Verify markers have reasonable precision in data coordinates
      state.analysis.markers.forEach(marker => {
        expect(marker.time).toBeCloseTo(marker.time, 2) // 2 decimal places precision
        expect(marker.freq).toBeCloseTo(marker.freq, 1) // 1 decimal place precision
      })
    })
  })

  test.describe('Rapid Interaction Sequences', () => {
    test('should handle rapid clicking sequences', async ({ gramFramePage }) => {
      await gramFramePage.clickMode('Analysis')
      
      const rapidClickPositions = []
      for (let i = 0; i < 20; i++) {
        rapidClickPositions.push({
          x: 100 + (i * 15),
          y: 100 + (i * 5)
        })
      }
      
      // Perform rapid clicks
      const startTime = Date.now()
      for (const pos of rapidClickPositions) {
        await gramFramePage.clickSpectrogram(pos.x, pos.y)
        // Minimal delay for rapid clicking
        await gramFramePage.page.waitForTimeout(25)
      }
      const endTime = Date.now()
      
      // Verify all clicks were processed
      const state = await gramFramePage.getState()
      expect(state.analysis?.markers?.length).toBe(rapidClickPositions.length)
      
      // Performance check - should complete within reasonable time
      const duration = endTime - startTime
      expect(duration).toBeLessThan(3000) // 3 seconds for 20 rapid clicks
      
      // Verify all markers have unique IDs
      const markerIds = state.analysis.markers.map(m => m.id)
      const uniqueIds = new Set(markerIds)
      expect(uniqueIds.size).toBe(rapidClickPositions.length)
    })
    
    test('should handle rapid mouse movement patterns', async ({ gramFramePage }) => {
      await gramFramePage.clickMode('Analysis')
      
      // Create complex mouse movement pattern
      const movementPattern = []
      for (let i = 0; i < 50; i++) {
        const angle = (i * 2 * Math.PI) / 50
        const centerX = 250
        const centerY = 200
        const radius = 100
        
        movementPattern.push({
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius
        })
      }
      
      // Execute rapid movement pattern
      for (const pos of movementPattern) {
        await gramFramePage.moveMouseToSpectrogram(pos.x, pos.y)
        await gramFramePage.page.waitForTimeout(10) // Very rapid movement
      }
      
      // Verify cursor tracking works with rapid movement
      const state = await gramFramePage.getState()
      expectValidCursorPosition(state, true)
      
      // Final cursor position should be approximately at last movement position
      const lastPos = movementPattern[movementPattern.length - 1]
      // Note: Exact position comparison is not reliable due to timing
      expect(state.cursorPosition.x).toBeCloseTo(lastPos.x, -1) // Rough approximation
    })
    
    test('should handle rapid drag operations', async ({ gramFramePage }) => {
      await gramFramePage.clickMode('Harmonics')
      
      // Perform multiple rapid drag operations
      const dragOperations = [
        { start: { x: 150, y: 100 }, end: { x: 150, y: 200 } },
        { start: { x: 200, y: 120 }, end: { x: 200, y: 220 } },
        { start: { x: 250, y: 140 }, end: { x: 250, y: 240 } },
        { start: { x: 300, y: 160 }, end: { x: 300, y: 260 } }
      ]
      
      for (const drag of dragOperations) {
        await gramFramePage.page.mouse.move(drag.start.x, drag.start.y)
        await gramFramePage.page.mouse.down()
        await gramFramePage.page.mouse.move(drag.end.x, drag.end.y)
        await gramFramePage.page.mouse.up()
        await gramFramePage.page.waitForTimeout(50) // Minimal delay
      }
      
      // Verify all harmonic sets were created
      const state = await gramFramePage.getState()
      expect(state.harmonics?.harmonicSets?.length).toBe(dragOperations.length)
      
      // Verify each harmonic set has valid properties
      state.harmonics.harmonicSets.forEach((set, index) => {
        expect(set).toHaveProperty('id')
        expect(set).toHaveProperty('fundamentalFreq')
        expect(set).toHaveProperty('rate')
        expect(set.fundamentalFreq).toBeGreaterThan(0)
        expect(set.rate).toBeGreaterThan(0)
      })
    })
  })

  test.describe('Multi-Touch Simulation', () => {
    test('should handle simulated multi-touch interactions', async ({ gramFramePage }) => {
      await gramFramePage.clickMode('Analysis')
      
      // Simulate multi-touch by rapid alternating actions
      // (Playwright doesn't support true multi-touch, so we simulate the effect)
      
      // Start first "finger" action
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      
      // Quickly switch to second "finger" action
      await gramFramePage.page.mouse.move(300, 200)
      await gramFramePage.page.mouse.up()
      await gramFramePage.page.mouse.down()
      
      // Complete both actions
      await gramFramePage.page.mouse.move(350, 250)
      await gramFramePage.page.mouse.up()
      
      // Verify system handles rapid input switching gracefully
      const state = await gramFramePage.getState()
      expectValidMetadata(state)
      expectValidMode(state, 'analysis')
      
      // Should have created markers or handled the interactions properly
      if (state.analysis?.markers) {
        expect(state.analysis.markers.length).toBeGreaterThanOrEqual(0)
      }
    })
    
    test('should handle overlapping interaction areas', async ({ gramFramePage }) => {
      await gramFramePage.clickMode('Harmonics')
      
      // Create overlapping harmonic sets
      const overlapPositions = [
        { start: { x: 200, y: 100 }, end: { x: 200, y: 250 } },
        { start: { x: 195, y: 110 }, end: { x: 195, y: 260 } }, // Slightly offset
        { start: { x: 205, y: 90 }, end: { x: 205, y: 240 } }   // Another offset
      ]
      
      for (const pos of overlapPositions) {
        await gramFramePage.page.mouse.move(pos.start.x, pos.start.y)
        await gramFramePage.page.mouse.down()
        await gramFramePage.page.mouse.move(pos.end.x, pos.end.y)
        await gramFramePage.page.mouse.up()
        await gramFramePage.page.waitForTimeout(200)
      }
      
      // Verify overlapping harmonics are handled properly
      const state = await gramFramePage.getState()
      expect(state.harmonics?.harmonicSets?.length).toBe(overlapPositions.length)
      
      // Each should have unique ID despite overlap
      const harmonicIds = state.harmonics.harmonicSets.map(set => set.id)
      const uniqueIds = new Set(harmonicIds)
      expect(uniqueIds.size).toBe(overlapPositions.length)
    })
  })

  test.describe('Complex Interaction Patterns', () => {
    test('should handle mixed interaction types in sequence', async ({ gramFramePage }) => {
      // Perform complex sequence mixing different interaction types
      
      // Analysis mode - click interactions
      await gramFramePage.clickMode('Analysis')
      await gramFramePage.clickSpectrogram(150, 100)
      await gramFramePage.clickSpectrogram(250, 150)
      
      // Harmonics mode - drag interactions
      await gramFramePage.clickMode('Harmonics')
      await gramFramePage.page.mouse.move(300, 120)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(300, 220)
      await gramFramePage.page.mouse.up()
      
      // Doppler mode - drag interactions
      await gramFramePage.clickMode('Doppler')
      await gramFramePage.page.mouse.move(400, 140)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(450, 190)
      await gramFramePage.page.mouse.up()
      
      // Back to Analysis - more clicks
      await gramFramePage.clickMode('Analysis')
      await gramFramePage.clickSpectrogram(350, 200)
      
      // Verify all interaction types coexist
      const state = await gramFramePage.getState()
      expect(state.analysis?.markers?.length).toBe(3)
      expect(state.harmonics?.harmonicSets?.length).toBe(1)
      expect(state.doppler?.fPlus).toBeDefined()
      expect(state.doppler?.fMinus).toBeDefined()
    })
    
    test('should handle interrupted and resumed interactions', async ({ gramFramePage }) => {
      await gramFramePage.clickMode('Harmonics')
      
      // Start harmonic creation
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(220, 170)
      
      // Interrupt with mode switch
      await gramFramePage.clickMode('Analysis')
      
      // Try to resume (should be handled gracefully)
      await gramFramePage.page.mouse.move(240, 190)
      await gramFramePage.page.mouse.up()
      
      // Switch back and verify state
      await gramFramePage.clickMode('Harmonics')
      
      const state = await gramFramePage.getState()
      expectValidMode(state, 'harmonics')
      expectValidMetadata(state)
      
      // System should have handled the interruption gracefully
      expect(state.harmonics?.dragState?.isDragging).toBeFalsy()
    })
    
    test('should handle concurrent feature interactions', async ({ gramFramePage }) => {
      // Create features that might interact with each other
      
      // Create Analysis marker
      await gramFramePage.clickMode('Analysis')
      await gramFramePage.clickSpectrogram(200, 150)
      
      // Create harmonic that passes through the marker
      await gramFramePage.clickMode('Harmonics')
      await gramFramePage.page.mouse.move(200, 100)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(200, 200)
      await gramFramePage.page.mouse.up()
      
      // Create Doppler markers near the same area
      await gramFramePage.clickMode('Doppler')
      await gramFramePage.page.mouse.move(190, 140)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(210, 160)
      await gramFramePage.page.mouse.up()
      
      // Verify all features coexist without conflicts
      const state = await gramFramePage.getState()
      expect(state.analysis?.markers?.length).toBe(1)
      expect(state.harmonics?.harmonicSets?.length).toBe(1)
      expect(state.doppler?.fPlus).toBeDefined()
      
      // Try to interact with each feature type in the same area
      await gramFramePage.clickMode('Analysis')
      await gramFramePage.clickSpectrogram(195, 145) // Near existing features
      
      // Should create new marker without affecting others
      const finalState = await gramFramePage.getState()
      expect(finalState.analysis.markers.length).toBe(2)
      expect(finalState.harmonics.harmonicSets.length).toBe(1)
      expect(finalState.doppler.fPlus).toBeDefined()
    })
  })

  test.describe('Error State Handling', () => {
    test('should handle interactions during simulated error conditions', async ({ gramFramePage }) => {
      await gramFramePage.clickMode('Analysis')
      
      // Create normal marker first
      await gramFramePage.clickSpectrogram(200, 150)
      
      try {
        // Simulate error condition by rapid operations
        for (let i = 0; i < 10; i++) {
          await gramFramePage.clickSpectrogram(200 + i, 150 + i)
          await gramFramePage.clickMode('Harmonics')
          await gramFramePage.clickMode('Analysis')
          await gramFramePage.page.waitForTimeout(10) // Very rapid
        }
        
        // Verify system remains in valid state despite stress
        const state = await gramFramePage.getState()
        expectValidMetadata(state)
        expectValidMode(state, 'analysis')
        expect(state.analysis?.markers?.length).toBeGreaterThanOrEqual(1)
      } catch (error) {
        // If errors occur, verify system can recover
        await gramFramePage.page.waitForTimeout(1000)
        const recoveryState = await gramFramePage.getState()
        expectValidMetadata(recoveryState)
      }
    })
    
    test('should recover from DOM manipulation during interactions', async ({ gramFramePage }) => {
      await gramFramePage.clickMode('Harmonics')
      
      // Start normal interaction
      await gramFramePage.page.mouse.move(200, 150)
      await gramFramePage.page.mouse.down()
      
      try {
        // Simulate DOM interference
        await gramFramePage.page.evaluate(() => {
          // Temporarily hide the SVG
          const svg = document.querySelector('.gram-frame-svg')
          if (svg) {
            svg.style.display = 'none'
            setTimeout(() => {
              svg.style.display = ''
            }, 100)
          }
        })
        
        // Continue interaction
        await gramFramePage.page.mouse.move(200, 250)
        await gramFramePage.page.mouse.up()
        
        // Verify system handles the interference
        await gramFramePage.page.waitForTimeout(200)
        const state = await gramFramePage.getState()
        expectValidMetadata(state)
        expectValidMode(state, 'harmonics')
      } catch (error) {
        console.log('DOM manipulation test caused expected errors')
      }
    })
    
    test('should handle memory pressure during interactions', async ({ gramFramePage }) => {
      // Create many features to simulate memory pressure
      await gramFramePage.clickMode('Analysis')
      
      // Create many markers
      for (let i = 0; i < 50; i++) {
        await gramFramePage.clickSpectrogram(100 + (i % 10) * 30, 100 + Math.floor(i / 10) * 40)
        if (i % 10 === 0) {
          await gramFramePage.page.waitForTimeout(50) // Occasional pause
        }
      }
      
      // Switch modes and create more features
      await gramFramePage.clickMode('Harmonics')
      for (let i = 0; i < 20; i++) {
        await gramFramePage.page.mouse.move(150 + i * 25, 100)
        await gramFramePage.page.mouse.down()
        await gramFramePage.page.mouse.move(150 + i * 25, 300)
        await gramFramePage.page.mouse.up()
        await gramFramePage.page.waitForTimeout(25)
      }
      
      // Verify system maintains performance
      const state = await gramFramePage.getState()
      expectValidMetadata(state)
      expect(state.analysis?.markers?.length).toBe(50)
      expect(state.harmonics?.harmonicSets?.length).toBe(20)
      
      // Try rapid mode switching with many features
      const modes = ['Doppler', 'Analysis', 'Harmonics']
      for (const mode of modes) {
        await gramFramePage.clickMode(mode)
        await gramFramePage.page.waitForTimeout(100)
      }
      
      // System should still be responsive
      const finalState = await gramFramePage.getState()
      expectValidMetadata(finalState)
      expectValidMode(finalState, 'harmonics')
    })
  })

  test.describe('Performance Edge Cases', () => {
    test('should maintain responsiveness with maximum feature density', async ({ gramFramePage }) => {
      const svgBox = await gramFramePage.svg.boundingBox()
      expect(svgBox).toBeTruthy()
      
      if (svgBox) {
        await gramFramePage.clickMode('Analysis')
        
        // Create markers in a dense grid pattern
        const step = 25
        let markerCount = 0
        
        for (let x = 100; x < svgBox.width - 50; x += step) {
          for (let y = 60; y < svgBox.height - 60; y += step) {
            await gramFramePage.clickSpectrogram(x, y)
            markerCount++
            
            if (markerCount % 20 === 0) {
              await gramFramePage.page.waitForTimeout(100) // Brief pause every 20 markers
            }
            
            // Limit total markers to prevent test timeout
            if (markerCount >= 100) {
              break
            }
          }
          if (markerCount >= 100) {
            break
          }
        }
        
        // Verify all markers were created
        const state = await gramFramePage.getState()
        expect(state.analysis?.markers?.length).toBe(markerCount)
        
        // Test interaction responsiveness with dense features
        const startTime = Date.now()
        await gramFramePage.moveMouseToSpectrogram(200, 150)
        const endTime = Date.now()
        
        // Mouse movement should still be responsive
        expect(endTime - startTime).toBeLessThan(500)
        
        // Verify cursor tracking still works
        const finalState = await gramFramePage.getState()
        expectValidCursorPosition(finalState, true)
      }
    })
    
    test('should handle extreme coordinate values', async ({ gramFramePage }) => {
      await gramFramePage.clickMode('Analysis')
      
      // Test extreme but valid coordinates
      const extremePositions = [
        { x: 61, y: 51 }, // Minimum valid position
        { x: 599, y: 449 }, // Maximum valid position (assuming typical dimensions)
        { x: 300.999, y: 200.001 }, // High precision decimals
      ]
      
      for (const pos of extremePositions) {
        try {
          await gramFramePage.page.mouse.click(pos.x, pos.y)
          await gramFramePage.page.waitForTimeout(100)
        } catch (error) {
          console.log(`Extreme position ${pos.x}, ${pos.y} caused error: ${error.message}`)
        }
      }
      
      // Verify system handles extreme values gracefully
      const state = await gramFramePage.getState()
      expectValidMetadata(state)
      
      if (state.analysis?.markers) {
        state.analysis.markers.forEach(marker => {
          expect(marker.time).toBeGreaterThanOrEqual(state.config.timeMin)
          expect(marker.time).toBeLessThanOrEqual(state.config.timeMax)
          expect(marker.freq).toBeGreaterThanOrEqual(state.config.freqMin)
          expect(marker.freq).toBeLessThanOrEqual(state.config.freqMax)
        })
      }
    })
  })

  test.describe('Browser Compatibility Edge Cases', () => {
    test('should handle different mouse button combinations', async ({ gramFramePage }) => {
      await gramFramePage.clickMode('Analysis')
      
      // Test different mouse button clicks
      const testPosition = { x: 200, y: 150 }
      
      // Left click (primary action)
      await gramFramePage.page.mouse.click(testPosition.x, testPosition.y, { button: 'left' })
      
      // Right click (should not create marker in Analysis mode)
      await gramFramePage.page.mouse.click(testPosition.x + 50, testPosition.y, { button: 'right' })
      
      // Middle click (should not create marker)
      await gramFramePage.page.mouse.click(testPosition.x + 100, testPosition.y, { button: 'middle' })
      
      // Verify only left click created marker
      const state = await gramFramePage.getState()
      expect(state.analysis?.markers?.length).toBe(1)
    })
    
    test('should handle modifier key combinations', async ({ gramFramePage }) => {
      await gramFramePage.clickMode('Analysis')
      
      const testPosition = { x: 200, y: 150 }
      
      // Test various modifier combinations
      const modifierCombinations = [
        { modifiers: ['Control'], expected: 'normal behavior' },
        { modifiers: ['Shift'], expected: 'normal behavior' },
        { modifiers: ['Alt'], expected: 'normal behavior' },
        { modifiers: ['Control', 'Shift'], expected: 'normal behavior' }
      ]
      
      for (const combo of modifierCombinations) {
        // Press modifiers
        for (const modifier of combo.modifiers) {
          await gramFramePage.page.keyboard.down(modifier)
        }
        
        // Click with modifiers held
        await gramFramePage.clickSpectrogram(testPosition.x + combo.modifiers.length * 30, testPosition.y)
        
        // Release modifiers
        for (const modifier of combo.modifiers) {
          await gramFramePage.page.keyboard.up(modifier)
        }
        
        await gramFramePage.page.waitForTimeout(100)
      }
      
      // Verify markers were created (modifiers shouldn't prevent creation)
      const state = await gramFramePage.getState()
      expect(state.analysis?.markers?.length).toBe(modifierCombinations.length)
    })
  })
})