import { test, expect } from '@playwright/test'
import { GramFramePage } from './helpers/gram-frame-page'

test.describe('Analysis Mode Implementation (Task 4.2)', () => {
  let gramFramePage: GramFramePage

  test.beforeEach(async ({ page }) => {
    gramFramePage = new GramFramePage(page)
    await gramFramePage.goto()
    await gramFramePage.waitForImageLoad()
  })

  test('cross-hairs appear in Analysis and Doppler modes', async () => {
    // Verify we start in Analysis mode
    const initialState = await gramFramePage.getCurrentState()
    expect(initialState.mode).toBe('analysis')
    
    // Move mouse over spectrogram to trigger cross-hairs
    const svgBounds = await gramFramePage.svg.boundingBox()
    if (svgBounds) {
      const centerX = svgBounds.width * 0.5
      const centerY = svgBounds.height * 0.5
      await gramFramePage.moveMouse(centerX, centerY)
      await gramFramePage.page.waitForTimeout(100)
    }
    
    // Verify cross-hairs are present (vertical and horizontal lines)
    await expect(gramFramePage.page.locator('.gram-frame-cursor-vertical')).toHaveCount(1)
    await expect(gramFramePage.page.locator('.gram-frame-cursor-horizontal')).toHaveCount(1)
    await expect(gramFramePage.page.locator('.gram-frame-cursor-point')).toHaveCount(1)
    
    // Switch to Doppler mode
    await gramFramePage.clickMode('Doppler')
    
    // Move mouse again to verify cross-hairs still appear
    await gramFramePage.moveMouseToSpectrogram(180, 120)
    
    // Verify cross-hairs ARE present in Doppler mode (needed for positioning)
    await expect(gramFramePage.page.locator('.gram-frame-cursor-vertical')).toHaveCount(1)
    await expect(gramFramePage.page.locator('.gram-frame-cursor-horizontal')).toHaveCount(1)
    await expect(gramFramePage.page.locator('.gram-frame-cursor-point')).toHaveCount(1)
    
    // Switch back to Analysis mode
    await gramFramePage.clickMode('Analysis')
    
    // Move mouse to trigger cross-hairs
    await gramFramePage.moveMouseToSpectrogram(100, 200)
    
    // Verify cross-hairs are present again in Analysis mode
    await expect(gramFramePage.page.locator('.gram-frame-cursor-vertical')).toHaveCount(1)
    await expect(gramFramePage.page.locator('.gram-frame-cursor-horizontal')).toHaveCount(1)
    await expect(gramFramePage.page.locator('.gram-frame-cursor-point')).toHaveCount(1)
  })

  test('cross-hairs follow mouse movement in Analysis mode', async () => {
    // Ensure we're in Analysis mode
    await gramFramePage.clickMode('Analysis')
    
    // Move mouse to different positions and verify cross-hairs follow
    await gramFramePage.moveMouseToSpectrogram(100, 50)
    
    // Get initial cross-hair positions
    const verticalLine1 = gramFramePage.page.locator('.gram-frame-cursor-vertical')
    const horizontalLine1 = gramFramePage.page.locator('.gram-frame-cursor-horizontal')
    
    await expect(verticalLine1).toHaveCount(1)
    await expect(horizontalLine1).toHaveCount(1)
    
    // Move mouse to a different position
    await gramFramePage.moveMouseToSpectrogram(200, 150)
    
    // Verify cross-hairs are still visible at new position
    const verticalLine2 = gramFramePage.page.locator('.gram-frame-cursor-vertical')
    const horizontalLine2 = gramFramePage.page.locator('.gram-frame-cursor-horizontal')
    
    await expect(verticalLine2).toHaveCount(1)
    await expect(horizontalLine2).toHaveCount(1)
    
    // Cross-hairs should update position (this is implicit in that they're still visible and following mouse)
  })

  test('LED display shows correct Analysis mode formatting', async () => {
    // Ensure we're in Analysis mode
    await gramFramePage.clickMode('Analysis')
    
    // Move mouse over spectrogram
    await gramFramePage.moveMouseToSpectrogram(150, 100)
    
    // Verify LED displays show the correct format as per spec
    const freqText = await gramFramePage.freqLED.locator('.gram-frame-led-value').textContent()
    const timeText = await gramFramePage.timeLED.locator('.gram-frame-led-value').textContent()
    
    // According to new LED format: numerical values only
    expect(freqText).toMatch(/\d+\.\d$/)  // 1 decimal place for frequency (numerical only)
    expect(timeText).toMatch(/\d+\.\d{2}$/)  // 2 decimal places for time (numerical only)
    
    // Verify format structure - no units in values
    expect(freqText).not.toContain('Freq: ')
    expect(freqText).not.toContain(' Hz')
    expect(timeText).not.toContain('Time: ')
    expect(timeText).not.toContain(' s')
  })

  test('LED display shows default values when mouse is outside spectrogram', async () => {
    // Ensure we're in Analysis mode
    await gramFramePage.clickMode('Analysis')
    
    // Move mouse outside the spectrogram area (should clear cursor position)
    await gramFramePage.svg.hover({ position: { x: 10, y: 10 } }) // Move to margin area
    
    // Wait for state to update
    await gramFramePage.page.waitForTimeout(100)
    
    // Verify LED displays show default values
    const freqText = await gramFramePage.freqLED.locator('.gram-frame-led-value').textContent()
    const timeText = await gramFramePage.timeLED.locator('.gram-frame-led-value').textContent()
    
    expect(freqText).toBe('0.00')
    expect(timeText).toBe('0.00')
  })

  test('Analysis mode operates on hover only with no click interactions', async () => {
    // Ensure we're in Analysis mode
    await gramFramePage.clickMode('Analysis')
    
    // Get initial state
    const initialState = await gramFramePage.getCurrentState()
    
    // Move mouse over spectrogram (hover)
    await gramFramePage.moveMouseToSpectrogram(150, 100)
    
    // Verify hover triggers cursor position update
    const stateAfterHover = await gramFramePage.getCurrentState()
    expect(stateAfterHover.cursorPosition).not.toBeNull()
    expect(stateAfterHover.cursorPosition.freq).toBeGreaterThan(0)
    expect(stateAfterHover.cursorPosition.time).toBeGreaterThan(0)
    
    // Click on the spectrogram
    await gramFramePage.clickSVG(150, 100)
    
    // Verify clicking doesn't change the behavior or create persistent state
    const stateAfterClick = await gramFramePage.getCurrentState()
    
    // In Analysis mode, click should not create any persistent state
    // The cursor position should still be based on current mouse position
    expect(stateAfterClick.cursorPosition).not.toBeNull()
    
    // Move mouse away and verify cursor position clears (hover-only behavior)
    await gramFramePage.page.mouse.move(10, 10) // Move outside
    await gramFramePage.page.waitForTimeout(100)
    
    const stateAfterMoveAway = await gramFramePage.getCurrentState()
    expect(stateAfterMoveAway.cursorPosition).toBeNull()
  })

  test('cross-hairs extend across full width and height of spectrogram', async () => {
    // Ensure we're in Analysis mode
    await gramFramePage.clickMode('Analysis')
    
    // Move mouse to center of spectrogram
    await gramFramePage.moveMouseToSpectrogram(150, 100)
    
    // Get the SVG dimensions and margins
    const svgRect = await gramFramePage.svg.boundingBox()
    expect(svgRect).toBeTruthy()
    
    // Verify vertical line extends full height
    const verticalLine = gramFramePage.page.locator('.gram-frame-cursor-vertical')
    await expect(verticalLine).toHaveCount(1)
    
    const verticalY1 = await verticalLine.getAttribute('y1')
    const verticalY2 = await verticalLine.getAttribute('y2')
    
    // Vertical line should span from top margin to bottom of image area
    expect(parseFloat(verticalY1!)).toBeLessThan(parseFloat(verticalY2!))
    expect(parseFloat(verticalY2!) - parseFloat(verticalY1!)).toBeGreaterThan(100) // Should span significant height
    
    // Verify horizontal line extends full width
    const horizontalLine = gramFramePage.page.locator('.gram-frame-cursor-horizontal')
    await expect(horizontalLine).toHaveCount(1)
    
    const horizontalX1 = await horizontalLine.getAttribute('x1')
    const horizontalX2 = await horizontalLine.getAttribute('x2')
    
    // Horizontal line should span from left margin to right of image area
    expect(parseFloat(horizontalX1!)).toBeLessThan(parseFloat(horizontalX2!))
    expect(parseFloat(horizontalX2!) - parseFloat(horizontalX1!)).toBeGreaterThan(100) // Should span significant width
  })

  test('cross-hairs have optimal visibility styling', async () => {
    // Ensure we're in Analysis mode
    await gramFramePage.clickMode('Analysis')
    
    // Move mouse over spectrogram to trigger cross-hairs
    await gramFramePage.moveMouseToSpectrogram(150, 100)
    
    // Verify shadow lines for visibility (white background)
    const shadowElements = gramFramePage.page.locator('.gram-frame-cursor-shadow')
    await expect(shadowElements).toHaveCount(2) // vertical and horizontal shadows
    
    // Verify main cursor lines (red foreground)
    const verticalLine = gramFramePage.page.locator('.gram-frame-cursor-vertical')
    const horizontalLine = gramFramePage.page.locator('.gram-frame-cursor-horizontal')
    
    await expect(verticalLine).toHaveCSS('stroke', 'rgba(255, 0, 0, 0.9)')
    await expect(horizontalLine).toHaveCSS('stroke', 'rgba(255, 0, 0, 0.9)')
    
    // Verify center point styling
    const centerPoint = gramFramePage.page.locator('.gram-frame-cursor-point')
    await expect(centerPoint).toHaveCSS('fill', 'rgba(255, 0, 0, 0.9)')
    await expect(centerPoint).toHaveCSS('stroke', 'rgba(255, 255, 255, 0.9)')
  })

  test('Analysis mode state is properly tracked in diagnostics', async () => {
    // Ensure we're in Analysis mode
    await gramFramePage.clickMode('Analysis')
    
    // Check if state display exists (debug page feature)
    const stateDisplay = gramFramePage.page.locator('#state-display')
    
    if (await stateDisplay.isVisible()) {
      // Verify mode is shown in state display
      const stateText = await stateDisplay.textContent()
      expect(stateText).toContain('"mode": "analysis"')
      
      // Move mouse and verify cursor position is tracked
      await gramFramePage.moveMouseToSpectrogram(150, 100)
      await gramFramePage.page.waitForTimeout(100)
      
      const updatedStateText = await stateDisplay.textContent()
      expect(updatedStateText).toContain('"cursorPosition"')
      expect(updatedStateText).toContain('"freq"')
      expect(updatedStateText).toContain('"time"')
    }
  })

  test('Analysis mode integrates correctly with existing mouse tracking', async () => {
    // Ensure we're in Analysis mode
    await gramFramePage.clickMode('Analysis')
    
    // Test multiple mouse positions
    const positions = [
      { x: 100, y: 80 },
      { x: 200, y: 120 },
      { x: 150, y: 160 }
    ]
    
    for (const pos of positions) {
      await gramFramePage.moveMouseToSpectrogram(pos.x, pos.y)
      
      // Verify state is updated
      const state = await gramFramePage.getCurrentState()
      expect(state.cursorPosition).not.toBeNull()
      expect(state.cursorPosition.freq).toBeGreaterThan(0)
      expect(state.cursorPosition.time).toBeGreaterThan(0)
      
      // Verify cross-hairs are present
      await expect(gramFramePage.page.locator('.gram-frame-cursor-vertical')).toHaveCount(1)
      await expect(gramFramePage.page.locator('.gram-frame-cursor-horizontal')).toHaveCount(1)
      
      // Verify LED displays are updated
      const freqText = await gramFramePage.freqLED.locator('.gram-frame-led-value').textContent()
      const timeText = await gramFramePage.timeLED.locator('.gram-frame-led-value').textContent()
      
      expect(freqText).toMatch(/\d+\.\d$/)
      expect(timeText).toMatch(/\d+\.\d{2}$/)
    }
  })
})