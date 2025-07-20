import { test, expect } from '@playwright/test'
import { GramFramePage } from './helpers/gram-frame-page'

test.describe('Rate Input Implementation', () => {
  let gramFramePage: GramFramePage

  test.beforeEach(async ({ page }) => {
    gramFramePage = new GramFramePage(page)
    await gramFramePage.goto()
  })

  test('rate input box is present with default value', async () => {
    const rateInput = gramFramePage.page.locator('.gram-frame-rate input')
    await expect(rateInput).toBeVisible()
    await expect(rateInput).toHaveValue('1')
  })

  test('rate input has proper attributes and validation', async () => {
    const rateInput = gramFramePage.page.locator('.gram-frame-rate input')
    
    // Check input attributes
    await expect(rateInput).toHaveAttribute('type', 'number')
    await expect(rateInput).toHaveAttribute('min', '0.1')
    await expect(rateInput).toHaveAttribute('step', '0.1')
    await expect(rateInput).toHaveAttribute('title', 'Rate value affects Doppler speed calculations')
  })

  test('rate input has unit indicator', async () => {
    const unitIndicator = gramFramePage.page.locator('.gram-frame-rate-unit')
    await expect(unitIndicator).toBeVisible()
    await expect(unitIndicator).toHaveText('Hz/s')
  })

  test('rate LED display shows current rate value', async () => {
    const rateLED = gramFramePage.page.locator('.gram-frame-led').filter({ hasText: 'Rate' })
    await expect(rateLED).toBeVisible()
    
    const rateValue = rateLED.locator('.gram-frame-led-value')
    await expect(rateValue).toHaveText('1 Hz/s')
  })

  test('rate input accepts valid numeric values', async () => {
    const rateInput = gramFramePage.page.locator('.gram-frame-rate input')
    const rateLED = gramFramePage.page.locator('.gram-frame-led').filter({ hasText: 'Rate' }).locator('.gram-frame-led-value')
    
    // Test different valid values
    const testValues = ['2.5', '0.5', '10', '0.1']
    
    for (const value of testValues) {
      await rateInput.fill(value)
      await rateInput.blur()
      
      // Check that rate LED updates
      await expect(rateLED).toHaveText(`${parseFloat(value)} Hz/s`)
      
      // Check that input retains the value
      await expect(rateInput).toHaveValue(value)
    }
  })

  test('rate input rejects invalid values', async () => {
    const rateInput = gramFramePage.page.locator('.gram-frame-rate input')
    
    // Test invalid numeric values (browser won't allow non-numeric input for number type)
    const invalidValues = ['0', '-1', '0.05']
    
    for (const invalidValue of invalidValues) {
      await rateInput.fill(invalidValue)
      await rateInput.blur()
      
      // Should reset to previous valid value (1)
      await expect(rateInput).toHaveValue('1')
    }
  })

  test('rate input provides visual feedback for invalid input', async () => {
    const rateInput = gramFramePage.page.locator('.gram-frame-rate input')
    
    // Type an invalid value (should show red border)
    await rateInput.fill('0.05')
    await expect(rateInput).toHaveCSS('border-color', 'rgb(255, 107, 107)')
    
    // Type a valid value (should show normal border)
    await rateInput.fill('2.0')
    await expect(rateInput).toHaveCSS('border-color', 'rgb(221, 221, 221)')
  })

  test('rate value persists across mode changes', async () => {
    const rateInput = gramFramePage.page.locator('.gram-frame-rate input')
    const rateLED = gramFramePage.page.locator('.gram-frame-led').filter({ hasText: 'Rate' }).locator('.gram-frame-led-value')
    
    // Set a custom rate value
    await rateInput.fill('3.5')
    await rateInput.blur()
    await expect(rateLED).toHaveText('3.5 Hz/s')
    
    // Switch to doppler mode
    await gramFramePage.clickMode('Doppler')
    await expect(rateLED).toHaveText('3.5 Hz/s')
    await expect(rateInput).toHaveValue('3.5')
    
    // Switch to doppler mode
    await gramFramePage.clickMode('Doppler')
    await expect(rateLED).toHaveText('3.5 Hz/s')
    await expect(rateInput).toHaveValue('3.5')
    
    // Switch back to analysis mode
    await gramFramePage.clickMode('Analysis')
    await expect(rateLED).toHaveText('3.5 Hz/s')
    await expect(rateInput).toHaveValue('3.5')
  })

  test('rate affects Doppler speed calculations', async () => {
    await gramFramePage.clickMode('Doppler')
    
    // Set a known rate value
    const rateInput = gramFramePage.page.locator('.gram-frame-rate input')
    await rateInput.fill('2')
    await rateInput.blur()
    
    // Click two points to create a Doppler measurement
    await gramFramePage.clickSVG(100, 100)
    await gramFramePage.clickSVG(200, 150)
    
    // Get the speed LED value
    const speedLED = gramFramePage.page.locator('.gram-frame-led').filter({ hasText: 'Speed' }).locator('.gram-frame-led-value')
    const initialSpeedText = await speedLED.textContent()
    const initialSpeed = parseFloat(initialSpeedText?.replace(/[^0-9.]/g, '') || '0')
    
    // Change rate to double the value
    await rateInput.fill('4')
    await rateInput.blur()
    
    // Speed should approximately double (rate factor is now 2x)
    const newSpeedText = await speedLED.textContent()
    const newSpeed = parseFloat(newSpeedText?.replace(/[^0-9.]/g, '') || '0')
    
    expect(newSpeed).toBeCloseTo(initialSpeed * 2, 0)
  })

  test('rate changes trigger state listener notifications', async () => {
    // Set up state listener to capture updates
    await gramFramePage.page.evaluate(() => {
      (window as any)._testStateUpdates = []
      window.GramFrame.addStateListener((state: any) => {
        (window as any)._testStateUpdates.push({ rate: state.rate })
      })
    })
    
    const rateInput = gramFramePage.page.locator('.gram-frame-rate input')
    
    // Change rate value
    await rateInput.fill('5.5')
    await rateInput.blur()
    
    // Wait a moment for the state to propagate
    await gramFramePage.page.waitForTimeout(100)
    
    // Check that state listener was notified with new rate
    const finalUpdates = await gramFramePage.page.evaluate(() => (window as any)._testStateUpdates || [])
    const rateUpdate = finalUpdates.find((update: any) => update.rate === 5.5)
    expect(rateUpdate).toBeTruthy()
  })

  test('rate input works correctly in different browser zoom levels', async () => {
    const rateInput = gramFramePage.page.locator('.gram-frame-rate input')
    
    // Test at different zoom levels
    const zoomLevels = [0.5, 1.0, 1.5, 2.0]
    
    for (const zoom of zoomLevels) {
      await gramFramePage.page.setViewportSize({ width: Math.round(1024 / zoom), height: Math.round(768 / zoom) })
      
      // Rate input should still be functional
      await rateInput.fill('1.5')
      await rateInput.blur()
      await expect(rateInput).toHaveValue('1.5')
      
      const rateLED = gramFramePage.page.locator('.gram-frame-led').filter({ hasText: 'Rate' }).locator('.gram-frame-led-value')
      await expect(rateLED).toHaveText('1.5 Hz/s')
    }
  })

  test('rate input handles edge cases correctly', async () => {
    const rateInput = gramFramePage.page.locator('.gram-frame-rate input')
    const rateLED = gramFramePage.page.locator('.gram-frame-led').filter({ hasText: 'Rate' }).locator('.gram-frame-led-value')
    
    // Test minimum valid value
    await rateInput.fill('0.1')
    await rateInput.blur()
    await expect(rateInput).toHaveValue('0.1')
    await expect(rateLED).toHaveText('0.1 Hz/s')
    
    // Test very large value
    await rateInput.fill('999.9')
    await rateInput.blur()
    await expect(rateInput).toHaveValue('999.9')
    await expect(rateLED).toHaveText('999.9 Hz/s')
    
    // Test decimal precision
    await rateInput.fill('3.14159')
    await rateInput.blur()
    await expect(rateInput).toHaveValue('3.14159')
    await expect(rateLED).toHaveText('3.14159 Hz/s')
  })

  test('rate is included in diagnostics and state', async () => {
    // Navigate to debug page to see state
    await gramFramePage.page.goto('/debug.html')
    
    const stateDisplay = gramFramePage.page.locator('#state-display')
    
    // Should contain rate in the state
    await expect(stateDisplay).toContainText('"rate": 1')
    
    // Change rate value via public API
    await gramFramePage.page.evaluate(() => {
      const instance = document.querySelector('.gram-frame-container').__gramFrameInstance
      instance._setRate(7.5)
    })
    
    // State should update
    await expect(stateDisplay).toContainText('"rate": 7.5')
  })

  test('rate scales frequency display during cursor movement', async () => {
    const rateInput = gramFramePage.page.locator('.gram-frame-rate input')
    const freqLED = gramFramePage.page.locator('.gram-frame-led:has(.gram-frame-led-label:text-is("Frequency")) .gram-frame-led-value')
    
    // Set rate to 5 for easy calculation
    await rateInput.fill('5')
    await rateInput.blur()
    
    // Move mouse to a known position and get frequency
    await gramFramePage.moveMouse(200, 100)
    await gramFramePage.page.waitForTimeout(100)
    
    const freqAt5x = await freqLED.textContent()
    const freq5xValue = parseFloat(freqAt5x?.replace(/[^0-9.]/g, '') || '0')
    
    // Change rate to 1 (no scaling)
    await rateInput.fill('1')
    await rateInput.blur()
    
    // Move to same position
    await gramFramePage.moveMouse(200, 100)
    await gramFramePage.page.waitForTimeout(100)
    
    const freqAt1x = await freqLED.textContent()
    const freq1xValue = parseFloat(freqAt1x?.replace(/[^0-9.]/g, '') || '0')
    
    // Frequency at rate=5 should be 1/5 of frequency at rate=1
    expect(freq5xValue).toBeCloseTo(freq1xValue / 5, 1)
  })
})