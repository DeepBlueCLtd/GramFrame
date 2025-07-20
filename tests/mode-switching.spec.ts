import { test, expect } from '@playwright/test'
import { GramFramePage } from './helpers/gram-frame-page'

test.describe('Mode Switching UI Implementation (Task 4.1)', () => {
  let gramFramePage: GramFramePage

  test.beforeEach(async ({ page }) => {
    gramFramePage = new GramFramePage(page)
    await gramFramePage.goto()
  })

  test('mode switching UI components are present and correctly styled', async () => {
    // Verify mode switching container exists
    await expect(gramFramePage.page.locator('.gram-frame-modes')).toBeVisible()
    
    // Verify all three mode buttons exist with correct text
    const analysisBtn = gramFramePage.page.locator('.gram-frame-mode-btn:text("Analysis")')
    const harmonicsBtn = gramFramePage.page.locator('.gram-frame-mode-btn:text("Harmonics")')
    const dopplerBtn = gramFramePage.page.locator('.gram-frame-mode-btn:text("Doppler")')
    
    await expect(analysisBtn).toBeVisible()
    await expect(harmonicsBtn).toBeVisible()
    await expect(dopplerBtn).toBeVisible()
    
    // Verify Analysis mode is active by default
    await expect(analysisBtn).toHaveClass(/active/)
    await expect(harmonicsBtn).not.toHaveClass(/active/)
    await expect(dopplerBtn).not.toHaveClass(/active/)
  })

  test('default Analysis mode is set correctly', async () => {
    // Verify initial state has Analysis mode
    const initialState = await gramFramePage.getCurrentState()
    expect(initialState.mode).toBe('analysis')
    
    // Verify mode LED displays Analysis
    await expect(gramFramePage.modeLED.locator('.gram-frame-led-value')).toContainText('Analysis')
  })

  test('mode switching changes state and UI correctly', async () => {
    // Test switching to Harmonics mode
    await gramFramePage.clickMode('Harmonics')
    
    // Verify button state changes
    await expect(gramFramePage.page.locator('.gram-frame-mode-btn:text("Analysis")')).not.toHaveClass(/active/)
    await expect(gramFramePage.page.locator('.gram-frame-mode-btn:text("Harmonics")')).toHaveClass(/active/)
    await expect(gramFramePage.page.locator('.gram-frame-mode-btn:text("Doppler")')).not.toHaveClass(/active/)
    
    // Verify state is updated
    const stateAfterHarmonics = await gramFramePage.getCurrentState()
    expect(stateAfterHarmonics.mode).toBe('harmonics')
    
    // Verify LED display is updated
    await expect(gramFramePage.modeLED.locator('.gram-frame-led-value')).toContainText('Harmonics')
    
    // Test switching to Doppler mode
    await gramFramePage.clickMode('Doppler')
    
    // Verify button state changes again
    await expect(gramFramePage.page.locator('.gram-frame-mode-btn:text("Analysis")')).not.toHaveClass(/active/)
    await expect(gramFramePage.page.locator('.gram-frame-mode-btn:text("Harmonics")')).not.toHaveClass(/active/)
    await expect(gramFramePage.page.locator('.gram-frame-mode-btn:text("Doppler")')).toHaveClass(/active/)
    
    // Verify state is updated
    const stateAfterDoppler = await gramFramePage.getCurrentState()
    expect(stateAfterDoppler.mode).toBe('doppler')
    
    // Verify LED display is updated
    await expect(gramFramePage.modeLED.locator('.gram-frame-led-value')).toContainText('Doppler')
    
    // Test switching back to Analysis mode
    await gramFramePage.clickMode('Analysis')
    
    // Verify button state changes back
    await expect(gramFramePage.page.locator('.gram-frame-mode-btn:text("Analysis")')).toHaveClass(/active/)
    await expect(gramFramePage.page.locator('.gram-frame-mode-btn:text("Harmonics")')).not.toHaveClass(/active/)
    await expect(gramFramePage.page.locator('.gram-frame-mode-btn:text("Doppler")')).not.toHaveClass(/active/)
    
    // Verify state is updated
    const stateBackToAnalysis = await gramFramePage.getCurrentState()
    expect(stateBackToAnalysis.mode).toBe('analysis')
    
    // Verify LED display is updated
    await expect(gramFramePage.modeLED.locator('.gram-frame-led-value')).toContainText('Analysis')
  })

  test('mode changes are properly propagated to state listeners', async () => {
    // Set up state tracking
    const stateUpdates: any[] = []
    
    await gramFramePage.page.evaluate(() => {
      (window as any).testStateUpdates = []
      window.GramFrame.addStateListener((state: any) => {
        (window as any).testStateUpdates.push({
          mode: state.mode,
          timestamp: Date.now()
        })
      })
    })
    
    // Switch modes and verify state listener is called
    await gramFramePage.clickMode('Harmonics')
    await gramFramePage.page.waitForTimeout(100) // Brief pause for state propagation
    
    await gramFramePage.clickMode('Doppler')
    await gramFramePage.page.waitForTimeout(100)
    
    await gramFramePage.clickMode('Analysis')
    await gramFramePage.page.waitForTimeout(100)
    
    // Check that state listener received the mode changes
    const updates = await gramFramePage.page.evaluate(() => (window as any).testStateUpdates)
    
    // Should have at least 3 updates (one for each mode change)
    expect(updates.length).toBeGreaterThanOrEqual(3)
    
    // Find the mode changes in the updates
    const harmonicsUpdate = updates.find((u: any) => u.mode === 'harmonics')
    const dopplerUpdate = updates.find((u: any) => u.mode === 'doppler')
    const analysisUpdate = updates.reverse().find((u: any) => u.mode === 'analysis') // Get the latest analysis update
    
    expect(harmonicsUpdate).toBeDefined()
    expect(dopplerUpdate).toBeDefined()
    expect(analysisUpdate).toBeDefined()
  })

  test('mode information appears in diagnostics panel', async () => {
    // Check if state display exists (debug page feature)
    const stateDisplay = gramFramePage.page.locator('#state-display')
    
    if (await stateDisplay.isVisible()) {
      // Verify initial mode in state display
      const initialStateText = await stateDisplay.textContent()
      expect(initialStateText).toContain('"mode": "analysis"')
      
      // Change mode and verify update in state display
      await gramFramePage.clickMode('Harmonics')
      await gramFramePage.page.waitForTimeout(100)
      
      const updatedStateText = await stateDisplay.textContent()
      expect(updatedStateText).toContain('"mode": "harmonics"')
    }
  })

  test('mode switching preserves other state properties', async () => {
    // Get initial state
    const initialState = await gramFramePage.getCurrentState()
    
    // Switch mode
    await gramFramePage.clickMode('Harmonics')
    
    // Get state after mode change
    const stateAfterModeChange = await gramFramePage.getCurrentState()
    
    // Verify that other properties are preserved
    expect(stateAfterModeChange.version).toBe(initialState.version)
    expect(stateAfterModeChange.rate).toBe(initialState.rate)
    expect(stateAfterModeChange.config).toEqual(initialState.config)
    expect(stateAfterModeChange.imageDetails).toEqual(initialState.imageDetails)
    expect(stateAfterModeChange.axes).toEqual(initialState.axes)
    
    // Only mode should have changed
    expect(stateAfterModeChange.mode).toBe('harmonics')
    expect(stateAfterModeChange.mode).not.toBe(initialState.mode)
  })

  test('mode buttons have correct styling and hover states', async () => {
    const analysisBtn = gramFramePage.page.locator('.gram-frame-mode-btn:text("Analysis")')
    const harmonicsBtn = gramFramePage.page.locator('.gram-frame-mode-btn:text("Harmonics")')
    
    // Verify buttons have correct base styling
    await expect(analysisBtn).toHaveCSS('cursor', 'pointer')
    await expect(harmonicsBtn).toHaveCSS('cursor', 'pointer')
    
    // Verify active button has different styling
    await expect(analysisBtn).toHaveClass(/active/)
    
    // Verify inactive button styling
    await expect(harmonicsBtn).not.toHaveClass(/active/)
  })

  test('LED-style aesthetic is maintained for mode display', async () => {
    // Verify mode LED has correct LED styling
    const modeLED = gramFramePage.modeLED
    await expect(modeLED).toHaveClass(/gram-frame-led/)
    
    // Verify LED label and value structure
    await expect(modeLED.locator('.gram-frame-led-label')).toBeVisible()
    await expect(modeLED.locator('.gram-frame-led-value')).toBeVisible()
    
    // Verify LED has monospace font family (LED-style)
    await expect(modeLED).toHaveCSS('font-family', /Courier/)
    
    // Verify LED colors (LED green text)
    await expect(modeLED).toHaveCSS('color', 'rgb(0, 255, 0)')
    await expect(modeLED).toHaveCSS('background-color', 'rgb(0, 0, 0)')
  })

  test('mode switching works with mouse tracking', async () => {
    // Move mouse over the spectrogram
    await gramFramePage.moveMouseToSpectrogram(100, 100)
    
    // Verify cursor position is tracked
    const stateWithCursor = await gramFramePage.getCurrentState()
    expect(stateWithCursor.cursorPosition).not.toBeNull()
    
    // Switch mode 
    await gramFramePage.clickMode('Harmonics')
    
    // Verify mode changed
    const stateAfterModeChange = await gramFramePage.getCurrentState()
    expect(stateAfterModeChange.mode).toBe('harmonics')
    
    // Move mouse back to spectrogram and verify tracking still works
    await gramFramePage.moveMouseToSpectrogram(200, 150)
    
    const stateAfterMouseMove = await gramFramePage.getCurrentState()
    expect(stateAfterMouseMove.mode).toBe('harmonics')
    expect(stateAfterMouseMove.cursorPosition).not.toBeNull()
    
    // Move mouse to another position and verify coordinates change
    await gramFramePage.moveMouseToSpectrogram(150, 200)
    
    const stateAfterSecondMove = await gramFramePage.getCurrentState()
    expect(stateAfterSecondMove.mode).toBe('harmonics')
    expect(stateAfterSecondMove.cursorPosition).not.toBeNull()
    expect(stateAfterSecondMove.cursorPosition.x).not.toBe(stateAfterMouseMove.cursorPosition.x)
  })
})