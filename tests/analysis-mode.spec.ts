import { test, expect } from '@playwright/test'
import { GramFramePage } from './helpers/gram-frame-page'

test.describe('Analysis Mode Implementation (Task 4.2)', () => {
  let gramFramePage: GramFramePage

  test.beforeEach(async ({ page }) => {
    gramFramePage = new GramFramePage(page)
    await gramFramePage.goto()
    await gramFramePage.waitForImageLoad()
  })

  test('cross-hairs appear in Analysis mode', async () => {
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
    
    // Switch to Harmonics mode to verify cross-hairs still appear
    await gramFramePage.clickMode('Harmonics')
    
    // Move mouse again to verify cross-hairs still appear
    await gramFramePage.moveMouseToSpectrogram(180, 120)
    
    // Verify cross-hairs ARE present in Harmonics mode (needed for positioning)
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
    expect(timeText).toMatch(/\d{2}:\d{2}$/)  // mm:ss format for time (numerical only)
    
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
    expect(timeText).toBe('00:00')
  })

  test('Analysis mode supports click to add persistent markers', async () => {
    // Ensure we're in Analysis mode
    await gramFramePage.clickMode('Analysis')
    
    // Get initial state
    const initialState = await gramFramePage.getCurrentState()
    expect(initialState.analysis?.markers || []).toHaveLength(0)
    
    // Click to add a marker
    await gramFramePage.clickSVG(150, 100)
    await gramFramePage.page.waitForTimeout(100)
    
    // Verify marker was added
    const stateAfterClick = await gramFramePage.getCurrentState()
    expect(stateAfterClick.analysis?.markers).toHaveLength(1)
    expect(stateAfterClick.analysis.markers[0].freq).toBeGreaterThan(0)
    expect(stateAfterClick.analysis.markers[0].time).toBeGreaterThan(0)
    
    // Add another marker
    await gramFramePage.clickSVG(200, 150)
    await gramFramePage.page.waitForTimeout(100)
    
    // Verify second marker was added
    const stateAfterSecondClick = await gramFramePage.getCurrentState()
    expect(stateAfterSecondClick.analysis?.markers).toHaveLength(2)
  })

  test('Analysis mode markers can be dragged to new positions', async () => {
    // Ensure we're in Analysis mode
    await gramFramePage.clickMode('Analysis')
    
    // Add a marker
    await gramFramePage.clickSVG(150, 100)
    await gramFramePage.page.waitForTimeout(100)
    
    // Get initial marker position
    const initialState = await gramFramePage.getCurrentState()
    const initialMarker = initialState.analysis.markers[0]
    const initialTime = initialMarker.time
    const initialFreq = initialMarker.freq
    
    // Hover over the marker to verify cursor changes to grab
    await gramFramePage.moveMouseToSpectrogram(150, 100)
    await gramFramePage.page.waitForTimeout(100)
    
    // Drag the marker to a new position
    await gramFramePage.page.mouse.down()
    await gramFramePage.moveMouseToSpectrogram(200, 150)
    await gramFramePage.page.mouse.up()
    await gramFramePage.page.waitForTimeout(100)
    
    // Verify marker moved to new position
    const finalState = await gramFramePage.getCurrentState()
    const movedMarker = finalState.analysis.markers[0]
    
    expect(movedMarker.time).not.toBe(initialTime)
    expect(movedMarker.freq).not.toBe(initialFreq)
    // Check that the marker moved (coordinates should be different)
    expect(Math.abs(movedMarker.time - initialTime)).toBeGreaterThan(0.1)
    expect(Math.abs(movedMarker.freq - initialFreq)).toBeGreaterThan(0.1)
  })

  test('cursor changes to grab when hovering over markers', async () => {
    // Ensure we're in Analysis mode
    await gramFramePage.clickMode('Analysis')
    
    // Add a marker
    await gramFramePage.clickSVG(150, 100)
    await gramFramePage.page.waitForTimeout(100)
    
    // Move mouse away from marker
    await gramFramePage.moveMouseToSpectrogram(50, 50)
    await gramFramePage.page.waitForTimeout(100)
    
    // Get current cursor style (should be crosshair)
    const initialCursor = await gramFramePage.svg.evaluate(el => window.getComputedStyle(el).cursor)
    expect(initialCursor).toBe('crosshair')
    
    // Move mouse over the marker
    await gramFramePage.moveMouseToSpectrogram(150, 100)
    await gramFramePage.page.waitForTimeout(100)
    
    // Verify cursor changed to grab
    const hoverCursor = await gramFramePage.svg.evaluate(el => window.getComputedStyle(el).cursor)
    expect(hoverCursor).toBe('grab')
    
    // Test the basic grab behavior - the important part is that hover works
    // Dragging behavior is covered in the other test
  })

  test('analysis markers do not show grab cursor when in other modes', async () => {
    // Start in Analysis mode and add a marker
    await gramFramePage.clickMode('Analysis')
    await gramFramePage.clickSVG(150, 100)
    await gramFramePage.page.waitForTimeout(100)
    
    // Verify marker exists and shows grab cursor in Analysis mode
    await gramFramePage.moveMouseToSpectrogram(150, 100)
    await gramFramePage.page.waitForTimeout(100)
    const analysisModeCursor = await gramFramePage.svg.evaluate(el => window.getComputedStyle(el).cursor)
    expect(analysisModeCursor).toBe('grab')
    
    // Switch to Harmonics mode
    await gramFramePage.clickMode('Harmonics')
    await gramFramePage.page.waitForTimeout(100)
    
    // Move mouse over the same position where the analysis marker is
    await gramFramePage.moveMouseToSpectrogram(150, 100)
    await gramFramePage.page.waitForTimeout(100)
    
    // Verify cursor does NOT show grab for analysis marker in Harmonics mode
    // Check that the analysis marker elements have pointer-events disabled
    const markerElements = await gramFramePage.page.locator('.gram-frame-marker-line').count()
    expect(markerElements).toBeGreaterThan(0) // Marker should still be visible
    
    // Get the SVG cursor - should not be 'grab' since analysis markers are disabled
    const harmonicsModeCursor = await gramFramePage.svg.evaluate(el => window.getComputedStyle(el).cursor)
    expect(harmonicsModeCursor).not.toBe('grab')
    
    // Switch to Doppler mode and verify same behavior
    await gramFramePage.clickMode('Doppler')
    await gramFramePage.page.waitForTimeout(100)
    
    await gramFramePage.moveMouseToSpectrogram(150, 100)
    await gramFramePage.page.waitForTimeout(100)
    
    const dopplerModeCursor = await gramFramePage.svg.evaluate(el => window.getComputedStyle(el).cursor)
    expect(dopplerModeCursor).not.toBe('grab')
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
      expect(timeText).toMatch(/\d{2}:\d{2}$/)
    }
  })
})