import { test, expect } from '@playwright/test'
import { GramFramePage } from './helpers/gram-frame-page'

test.describe('Analysis Mode Harmonics Implementation (Task 4.3)', () => {
  let gramFramePage: GramFramePage

  test.beforeEach(async ({ page }) => {
    gramFramePage = new GramFramePage(page)
    await gramFramePage.goto()
    await gramFramePage.waitForImageLoad()
  })

  test('harmonic lines appear in Analysis mode on drag', async () => {
    // Ensure we're in Analysis mode
    await gramFramePage.clickMode('Analysis')
    
    // Move mouse over spectrogram but don't drag - should show only cross-hairs
    await gramFramePage.moveMouseToSpectrogram(150, 100)
    await gramFramePage.page.waitForTimeout(100)
    
    // Verify only cross-hairs appear on hover (no harmonics)
    await expect(gramFramePage.page.locator('.gram-frame-cursor-vertical')).toHaveCount(1)
    await expect(gramFramePage.page.locator('.gram-frame-cursor-horizontal')).toHaveCount(1)
    await expect(gramFramePage.page.locator('.gram-frame-harmonic-line')).toHaveCount(0)
    await expect(gramFramePage.page.locator('.gram-frame-harmonic-main')).toHaveCount(0)
    await expect(gramFramePage.page.locator('.gram-frame-harmonic-label')).toHaveCount(0)
    
    // Start drag to trigger harmonics
    await gramFramePage.startDragSVG(150, 100)
    await gramFramePage.page.waitForTimeout(100)
    
    // Verify harmonic lines appear during drag (in addition to cross-hairs)
    await expect(gramFramePage.page.locator('.gram-frame-cursor-vertical')).toHaveCount(1)
    await expect(gramFramePage.page.locator('.gram-frame-cursor-horizontal')).toHaveCount(1)
    await expect(gramFramePage.page.locator('.gram-frame-harmonic-main')).toHaveCount(1) // Base frequency (1×)
    const harmonicLines = await gramFramePage.page.locator('.gram-frame-harmonic-line').count()
    expect(harmonicLines).toBeGreaterThan(0) // Should have additional harmonics
    
    // Verify harmonic labels appear
    const harmonicLabels = await gramFramePage.page.locator('.gram-frame-harmonic-label').count()
    expect(harmonicLabels).toBeGreaterThan(0) // Should have labels for harmonics
    
    // End drag
    await gramFramePage.endDragSVG(160, 110)
    await gramFramePage.page.waitForTimeout(100)
    
    // Verify harmonics disappear but cross-hairs remain when drag ends
    await expect(gramFramePage.page.locator('.gram-frame-cursor-vertical')).toHaveCount(1)
    await expect(gramFramePage.page.locator('.gram-frame-cursor-horizontal')).toHaveCount(1)
    await expect(gramFramePage.page.locator('.gram-frame-harmonic-line')).toHaveCount(0)
    await expect(gramFramePage.page.locator('.gram-frame-harmonic-main')).toHaveCount(0)
    await expect(gramFramePage.page.locator('.gram-frame-harmonic-label')).toHaveCount(0)
    
    // Switch to Doppler mode and verify harmonics disappear but cross-hairs remain
    await gramFramePage.clickMode('Doppler')
    await gramFramePage.moveMouseToSpectrogram(150, 100)
    
    // Cross-hairs should still appear in Doppler mode
    await expect(gramFramePage.page.locator('.gram-frame-cursor-vertical')).toHaveCount(1)
    await expect(gramFramePage.page.locator('.gram-frame-cursor-horizontal')).toHaveCount(1)
    // But harmonics should be gone
    await expect(gramFramePage.page.locator('.gram-frame-harmonic-line')).toHaveCount(0)
    await expect(gramFramePage.page.locator('.gram-frame-harmonic-main')).toHaveCount(0)
    await expect(gramFramePage.page.locator('.gram-frame-harmonic-label')).toHaveCount(0)
  })

  test('harmonic lines are positioned at correct frequency multiples during drag', async () => {
    // Ensure we're in Analysis mode
    await gramFramePage.clickMode('Analysis')
    
    // Move mouse to a known frequency position and start drag to trigger harmonics
    await gramFramePage.moveMouseToSpectrogram(150, 100)
    await gramFramePage.startDragSVG(150, 100)
    await gramFramePage.page.waitForTimeout(100)
    
    // Get the current state to know the base frequency
    const state = await gramFramePage.getCurrentState()
    expect(state.cursorPosition).not.toBeNull()
    expect(state.harmonics.baseFrequency).not.toBeNull()
    expect(state.dragState.isDragging).toBe(true)
    
    const baseFreq = state.harmonics.baseFrequency
    const harmonicData = state.harmonics.harmonicData
    
    // Verify harmonic data contains correct frequency multiples
    expect(harmonicData.length).toBeGreaterThan(0)
    
    // Check that each harmonic is an integer multiple of the base frequency
    harmonicData.forEach((harmonic, index) => {
      const expectedFreq = baseFreq * harmonic.number
      expect(Math.abs(harmonic.frequency - expectedFreq)).toBeLessThan(0.01) // Allow small floating point errors
      expect(harmonic.number).toBe(index + 1) // Should start from 1 and increment
    })
    
    // Verify the main line (1×) exists
    const mainHarmonic = harmonicData.find(h => h.number === 1)
    expect(mainHarmonic).toBeTruthy()
    expect(Math.abs(mainHarmonic.frequency - baseFreq)).toBeLessThan(0.01)
    
    // End drag
    await gramFramePage.endDragSVG(160, 110)
    await gramFramePage.page.waitForTimeout(100)
    
    // Verify drag state is cleared
    const endState = await gramFramePage.getCurrentState()
    expect(endState.dragState.isDragging).toBe(false)
  })

  test('main harmonic line (1×) has distinct styling', async () => {
    // Switch to Analysis mode
    await gramFramePage.clickMode('Analysis')
    
    // Move mouse over spectrogram and start drag to trigger harmonics
    await gramFramePage.moveMouseToSpectrogram(150, 100)
    await gramFramePage.startDragSVG(150, 100)
    await gramFramePage.page.waitForTimeout(100)
    
    // Verify main line has distinct styling (gold color, thicker)
    const mainLine = gramFramePage.page.locator('.gram-frame-harmonic-main')
    await expect(mainLine).toHaveCount(1)
    await expect(mainLine).toHaveCSS('stroke', 'rgba(255, 215, 0, 0.9)') // Gold color
    await expect(mainLine).toHaveCSS('stroke-width', '2px') // Thicker than other lines
    
    // Verify other harmonic lines have different styling
    const otherLines = gramFramePage.page.locator('.gram-frame-harmonic-line')
    const otherLineCount = await otherLines.count()
    
    if (otherLineCount > 0) {
      const firstOtherLine = otherLines.first()
      await expect(firstOtherLine).toHaveCSS('stroke', 'rgba(255, 255, 0, 0.8)') // Yellow color
      await expect(firstOtherLine).toHaveCSS('stroke-width', '1px') // Thinner than main line
    }
  })

  test('harmonic labels show correct harmonic numbers and frequencies', async () => {
    // Switch to Analysis mode
    await gramFramePage.clickMode('Analysis')
    
    // Move mouse over spectrogram and start drag to trigger harmonics
    await gramFramePage.moveMouseToSpectrogram(150, 100)
    await gramFramePage.startDragSVG(150, 100)
    await gramFramePage.page.waitForTimeout(100)
    
    // Get state to verify against
    const state = await gramFramePage.getCurrentState()
    const harmonicData = state.harmonics.harmonicData
    
    // Verify labels are present
    const labels = gramFramePage.page.locator('.gram-frame-harmonic-label')
    const labelCount = await labels.count()
    
    // Should have 2 labels per harmonic (number and frequency)
    expect(labelCount).toBe(harmonicData.length * 2)
    
    // Verify label content
    for (let i = 0; i < harmonicData.length; i++) {
      const harmonic = harmonicData[i]
      
      // Check for harmonic number label (e.g., "2×")
      const numberLabelRegex = new RegExp(`${harmonic.number}×`)
      await expect(gramFramePage.page.locator('.gram-frame-harmonic-label', { hasText: numberLabelRegex })).toHaveCount(1)
      
      // Check for frequency label (e.g., "440 Hz")
      const freqLabelRegex = new RegExp(`${Math.round(harmonic.frequency)} Hz`)
      await expect(gramFramePage.page.locator('.gram-frame-harmonic-label', { hasText: freqLabelRegex })).toHaveCount(1)
    }
  })

  test('LED display shows base frequency in Harmonics mode', async () => {
    // Switch to Analysis mode
    await gramFramePage.clickMode('Analysis')
    
    // Move mouse over spectrogram and start drag to trigger harmonics
    await gramFramePage.moveMouseToSpectrogram(150, 100)
    await gramFramePage.startDragSVG(150, 100)
    await gramFramePage.page.waitForTimeout(100)
    
    // Verify LED displays show the correct format for Harmonics mode
    const freqText = await gramFramePage.freqLED.locator('.gram-frame-led-value').textContent()
    const timeText = await gramFramePage.timeLED.locator('.gram-frame-led-value').textContent()
    
    // During drag in Analysis mode, should show "Base: 220.0 Hz" format
    expect(freqText).toMatch(/Base: \d+\.\d Hz/)  // 1 decimal place for base frequency
    expect(timeText).toMatch(/Time: \d+\.\d{2} s/)  // 2 decimal places for time
    
    // Verify format structure
    expect(freqText).toContain('Base: ')
    expect(freqText).toContain(' Hz')
    expect(timeText).toContain('Time: ')
    expect(timeText).toContain(' s')
    
    // End drag and verify it switches back to normal Analysis mode LED format
    await gramFramePage.endDragSVG(160, 110)
    await gramFramePage.moveMouseToSpectrogram(150, 100)
    
    const analysisFreqText = await gramFramePage.freqLED.locator('.gram-frame-led-value').textContent()
    expect(analysisFreqText).toContain('Freq: ') // Different prefix
    expect(analysisFreqText).not.toContain('Base: ')
  })

  test('harmonic lines extend full height of spectrogram', async () => {
    // Switch to Analysis mode
    await gramFramePage.clickMode('Analysis')
    
    // Move mouse over spectrogram and start drag to trigger harmonics
    await gramFramePage.moveMouseToSpectrogram(150, 100)
    await gramFramePage.startDragSVG(150, 100)
    await gramFramePage.page.waitForTimeout(100)
    
    // Get SVG dimensions for comparison
    const svgRect = await gramFramePage.svg.boundingBox()
    expect(svgRect).toBeTruthy()
    
    // Check main harmonic line extends full height
    const mainLine = gramFramePage.page.locator('.gram-frame-harmonic-main')
    await expect(mainLine).toHaveCount(1)
    
    const mainY1 = await mainLine.getAttribute('y1')
    const mainY2 = await mainLine.getAttribute('y2')
    
    // Line should span from top margin to bottom of image area
    expect(parseFloat(mainY1!)).toBeLessThan(parseFloat(mainY2!))
    expect(parseFloat(mainY2!) - parseFloat(mainY1!)).toBeGreaterThan(100) // Should span significant height
    
    // Check other harmonic lines also extend full height
    const otherLines = gramFramePage.page.locator('.gram-frame-harmonic-line')
    const otherLineCount = await otherLines.count()
    
    if (otherLineCount > 0) {
      const firstOtherLine = otherLines.first()
      const otherY1 = await firstOtherLine.getAttribute('y1')
      const otherY2 = await firstOtherLine.getAttribute('y2')
      
      expect(parseFloat(otherY1!)).toBeLessThan(parseFloat(otherY2!))
      expect(parseFloat(otherY2!) - parseFloat(otherY1!)).toBeGreaterThan(100)
    }
  })

  test('harmonics mode operates on drag with state cleared when drag ends', async () => {
    // Switch to Analysis mode
    await gramFramePage.clickMode('Analysis')
    
    // Move mouse over spectrogram (hover) - should not trigger harmonics
    await gramFramePage.moveMouseToSpectrogram(150, 100)
    await gramFramePage.page.waitForTimeout(100)
    
    // Verify hover does NOT trigger harmonic display
    const stateAfterHover = await gramFramePage.getCurrentState()
    expect(stateAfterHover.harmonics.baseFrequency).toBeNull()
    expect(stateAfterHover.harmonics.harmonicData.length).toBe(0)
    
    // Start drag on the spectrogram to trigger harmonics
    await gramFramePage.startDragSVG(150, 100)
    await gramFramePage.page.waitForTimeout(100)
    
    // Verify dragging triggers harmonic display
    const stateAfterDrag = await gramFramePage.getCurrentState()
    expect(stateAfterDrag.harmonics.baseFrequency).not.toBeNull()
    expect(stateAfterDrag.harmonics.harmonicData.length).toBeGreaterThan(0)
    expect(stateAfterDrag.dragState.isDragging).toBe(true)
    
    // Verify harmonic lines appear during drag
    await expect(gramFramePage.page.locator('.gram-frame-harmonic-main')).toHaveCount(1)
    const harmonicLinesDuringDrag = await gramFramePage.page.locator('.gram-frame-harmonic-line').count()
    expect(harmonicLinesDuringDrag).toBeGreaterThan(0)
    
    // End drag - harmonics should clear
    await gramFramePage.endDragSVG(160, 110)
    await gramFramePage.page.waitForTimeout(100)
    
    const stateAfterDragEnd = await gramFramePage.getCurrentState()
    expect(stateAfterDragEnd.harmonics.baseFrequency).toBeNull() // Harmonics should clear
    expect(stateAfterDragEnd.harmonics.harmonicData.length).toBe(0)
    expect(stateAfterDragEnd.dragState.isDragging).toBe(false)
    
    // Verify harmonic lines disappear when drag ends
    await expect(gramFramePage.page.locator('.gram-frame-harmonic-line')).toHaveCount(0)
    await expect(gramFramePage.page.locator('.gram-frame-harmonic-main')).toHaveCount(0)
    await expect(gramFramePage.page.locator('.gram-frame-harmonic-label')).toHaveCount(0)
  })

  test('harmonic lines update when dragging at different positions', async () => {
    // Switch to Analysis mode
    await gramFramePage.clickMode('Analysis')
    
    // Test multiple drag positions to verify harmonics update
    const positions = [
      { x: 100, y: 80 },
      { x: 200, y: 120 },
      { x: 150, y: 160 }
    ]
    
    for (const pos of positions) {
      await gramFramePage.moveMouseToSpectrogram(pos.x, pos.y)
      await gramFramePage.startDragSVG(pos.x, pos.y)
      await gramFramePage.page.waitForTimeout(50)
      
      // Verify state is updated with new base frequency
      const state = await gramFramePage.getCurrentState()
      expect(state.harmonics.baseFrequency).not.toBeNull()
      expect(state.harmonics.harmonicData.length).toBeGreaterThan(0)
      expect(state.dragState.isDragging).toBe(true)
      
      // Verify harmonic lines are present
      await expect(gramFramePage.page.locator('.gram-frame-harmonic-main')).toHaveCount(1)
      
      // Verify LED shows updated base frequency
      const freqText = await gramFramePage.freqLED.locator('.gram-frame-led-value').textContent()
      expect(freqText).toMatch(/Base: \d+\.\d Hz/)
      
      // End drag to clear harmonics for next iteration
      await gramFramePage.endDragSVG(pos.x + 10, pos.y + 10)
      await gramFramePage.page.waitForTimeout(50)
    }
  })

  test('harmonic calculation handles edge cases correctly', async () => {
    // Switch to Analysis mode
    await gramFramePage.clickMode('Analysis')
    
    // Test near frequency boundaries
    const edgePositions = [
      { x: 50, y: 100 },   // Near left edge (low frequency)
      { x: 250, y: 100 },  // Near right edge (high frequency)
      { x: 150, y: 50 },   // Near top edge
      { x: 150, y: 200 }   // Near bottom edge
    ]
    
    for (const pos of edgePositions) {
      await gramFramePage.moveMouseToSpectrogram(pos.x, pos.y)
      await gramFramePage.startDragSVG(pos.x, pos.y)
      await gramFramePage.page.waitForTimeout(50)
      
      // Verify state is valid even at edges
      const state = await gramFramePage.getCurrentState()
      if (state.cursorPosition && state.dragState.isDragging) {
        expect(state.harmonics.baseFrequency).toBeGreaterThan(0)
        expect(state.harmonics.harmonicData.length).toBeGreaterThan(0)
        
        // Verify all harmonic frequencies are within valid range
        const { freqMin, freqMax } = state.config
        state.harmonics.harmonicData.forEach(harmonic => {
          expect(harmonic.frequency).toBeGreaterThanOrEqual(freqMin)
          expect(harmonic.frequency).toBeLessThanOrEqual(freqMax)
        })
        
        // Verify harmonic lines are present
        await expect(gramFramePage.page.locator('.gram-frame-harmonic-main')).toHaveCount(1)
      }
      
      // End drag for next iteration
      await gramFramePage.endDragSVG(pos.x + 10, pos.y + 10)
      await gramFramePage.page.waitForTimeout(50)
    }
  })

  test('harmonics state is properly tracked in diagnostics', async () => {
    // Switch to Analysis mode
    await gramFramePage.clickMode('Analysis')
    
    // Check if state display exists (debug page feature)
    const stateDisplay = gramFramePage.page.locator('#state-display')
    
    if (await stateDisplay.isVisible()) {
      // Verify mode is shown in state display
      const stateText = await stateDisplay.textContent()
      expect(stateText).toContain('"mode": "analysis"')
      
      // Move mouse and start drag to trigger harmonics, then verify harmonic state is tracked
      await gramFramePage.moveMouseToSpectrogram(150, 100)
      await gramFramePage.startDragSVG(150, 100)
      await gramFramePage.page.waitForTimeout(100)
      
      const updatedStateText = await stateDisplay.textContent()
      expect(updatedStateText).toContain('"harmonics"')
      expect(updatedStateText).toContain('"baseFrequency"')
      expect(updatedStateText).toContain('"harmonicData"')
      expect(updatedStateText).toContain('"isDragging": true')
    }
  })

  test('harmonic lines have optimal visibility styling', async () => {
    // Switch to Analysis mode
    await gramFramePage.clickMode('Analysis')
    
    // Move mouse over spectrogram and start drag to trigger harmonics
    await gramFramePage.moveMouseToSpectrogram(150, 100)
    await gramFramePage.startDragSVG(150, 100)
    await gramFramePage.page.waitForTimeout(100)
    
    // Verify shadow lines for visibility (white background)
    const shadowElements = gramFramePage.page.locator('.gram-frame-harmonic-shadow')
    const shadowCount = await shadowElements.count()
    expect(shadowCount).toBeGreaterThan(0) // Should have shadows for all harmonic lines
    
    // Verify shadow styling
    if (shadowCount > 0) {
      const firstShadow = shadowElements.first()
      await expect(firstShadow).toHaveCSS('stroke', 'rgba(255, 255, 255, 0.9)')
      await expect(firstShadow).toHaveCSS('stroke-width', '3px')
    }
    
    // Verify main line styling
    const mainLine = gramFramePage.page.locator('.gram-frame-harmonic-main')
    await expect(mainLine).toHaveCSS('stroke', 'rgba(255, 215, 0, 0.9)')
    await expect(mainLine).toHaveCSS('stroke-width', '2px')
    
    // Verify label styling for readability
    const labels = gramFramePage.page.locator('.gram-frame-harmonic-label')
    const labelCount = await labels.count()
    
    if (labelCount > 0) {
      const firstLabel = labels.first()
      await expect(firstLabel).toHaveCSS('fill', 'rgb(255, 255, 255)')
      await expect(firstLabel).toHaveCSS('stroke', 'rgba(0, 0, 0, 0.8)')
    }
  })

  test('mode indicator shows "Analysis" when harmonics functionality is active', async () => {
    // Switch to Analysis mode (harmonics functionality is integrated here)
    await gramFramePage.clickMode('Analysis')
    
    // Verify mode LED shows "Analysis"
    const modeText = await gramFramePage.modeLED.locator('.gram-frame-led-value').textContent()
    expect(modeText).toBe('Analysis')
    
    // Verify mode button is active
    const analysisButton = gramFramePage.page.locator('[data-mode="analysis"]')
    await expect(analysisButton).toHaveClass(/active/)
    
    // Verify other mode buttons are not active
    const harmonicsButton = gramFramePage.page.locator('[data-mode="harmonics"]')
    const dopplerButton = gramFramePage.page.locator('[data-mode="doppler"]')
    
    await expect(harmonicsButton).not.toHaveClass(/active/) // harmonics button should not be active when in Analysis mode
    await expect(dopplerButton).not.toHaveClass(/active/)
  })
})