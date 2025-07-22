import { test, expect } from '@playwright/test'
import { GramFramePage } from './helpers/gram-frame-page'

test.describe('Doppler Mode Implementation (Task 4.4)', () => {
  let gramFramePage: GramFramePage

  test.beforeEach(async ({ page }) => {
    gramFramePage = new GramFramePage(page)
    await gramFramePage.goto()
    await gramFramePage.waitForImageLoad()
  })

  test('doppler mode click interaction sets start and end points', async () => {
    // Switch to Doppler mode
    await gramFramePage.clickMode('Doppler')
    
    // Verify Doppler mode is active
    await expect(gramFramePage.page.locator('.gram-frame-mode-btn[data-mode="doppler"]')).toHaveClass(/active/)
    
    // Verify initial state - no doppler elements visible
    await expect(gramFramePage.page.locator('.gram-frame-doppler-start-point')).toHaveCount(0)
    await expect(gramFramePage.page.locator('.gram-frame-doppler-end-point')).toHaveCount(0)
    await expect(gramFramePage.page.locator('.gram-frame-doppler-line')).toHaveCount(0)
    
    // Click first point to set start point
    await gramFramePage.clickSpectrogram(150, 100)
    await gramFramePage.page.waitForTimeout(100)
    
    // Verify start point appears
    await expect(gramFramePage.page.locator('.gram-frame-doppler-start-point')).toHaveCount(1)
    await expect(gramFramePage.page.locator('.gram-frame-doppler-end-point')).toHaveCount(0)
    await expect(gramFramePage.page.locator('.gram-frame-doppler-line')).toHaveCount(0)
    
    // Click second point to set end point
    await gramFramePage.clickSpectrogram(200, 150)
    await gramFramePage.page.waitForTimeout(100)
    
    // Verify both points and line appear
    await expect(gramFramePage.page.locator('.gram-frame-doppler-start-point')).toHaveCount(1)
    await expect(gramFramePage.page.locator('.gram-frame-doppler-end-point')).toHaveCount(1)
    await expect(gramFramePage.page.locator('.gram-frame-doppler-line')).toHaveCount(1)
    
    // Verify point labels appear
    const dopplerLabels = await gramFramePage.page.locator('.gram-frame-doppler-label').count()
    expect(dopplerLabels).toBe(2) // Should have labels for both points
  })

  test('doppler mode displays calculated measurements in LED panel', async () => {
    // Switch to Doppler mode
    await gramFramePage.clickMode('Doppler')
    
    // Verify Doppler LEDs are visible
    const deltaTimeLED = gramFramePage.page.locator('.gram-frame-led:has(.gram-frame-led-label:text-is("ΔTime (s)"))')
    const deltaFreqLED = gramFramePage.page.locator('.gram-frame-led:has(.gram-frame-led-label:text-is("ΔFreq (Hz)"))')
    const speedLED = gramFramePage.page.locator('.gram-frame-led:has(.gram-frame-led-label:text-is("Speed (knots)"))')
    
    await expect(deltaTimeLED).toBeVisible()
    await expect(deltaFreqLED).toBeVisible()
    await expect(speedLED).toBeVisible()
    
    // Verify initial values are zero (numerical only)
    await expect(deltaTimeLED.locator('.gram-frame-led-value')).toHaveText('0.00')
    await expect(deltaFreqLED.locator('.gram-frame-led-value')).toHaveText('0')
    await expect(speedLED.locator('.gram-frame-led-value')).toHaveText('0.0')
    
    // Set two points to trigger calculations
    await gramFramePage.clickSpectrogram(150, 100)
    await gramFramePage.page.waitForTimeout(100)
    await gramFramePage.clickSpectrogram(200, 150)
    await gramFramePage.page.waitForTimeout(100)
    
    // Verify values are updated (should be non-zero)
    const deltaTimeText = await deltaTimeLED.locator('.gram-frame-led-value').textContent()
    const deltaFreqText = await deltaFreqLED.locator('.gram-frame-led-value').textContent()
    const speedText = await speedLED.locator('.gram-frame-led-value').textContent()
    
    expect(deltaTimeText).not.toBe('0.00')
    expect(deltaFreqText).not.toBe('0')
    expect(speedText).not.toBe('0.0')
    
    // Verify format is correct (numerical only)
    expect(deltaTimeText).toMatch(/^-?\d+\.\d{2}$/)
    expect(deltaFreqText).toMatch(/^-?\d+$/)
    expect(speedText).toMatch(/^\d+\.\d$/)
  })

  test('doppler mode state persists until mode change', async () => {
    // Switch to Doppler mode and set points
    await gramFramePage.clickMode('Doppler')
    await gramFramePage.clickSpectrogram(150, 100)
    await gramFramePage.clickSpectrogram(200, 150)
    await gramFramePage.page.waitForTimeout(100)
    
    // Verify line and points exist
    await expect(gramFramePage.page.locator('.gram-frame-doppler-line')).toHaveCount(1)
    await expect(gramFramePage.page.locator('.gram-frame-doppler-start-point')).toHaveCount(1)
    await expect(gramFramePage.page.locator('.gram-frame-doppler-end-point')).toHaveCount(1)
    
    // Move mouse around - elements should persist
    await gramFramePage.moveMouseToSpectrogram(300, 200)
    await gramFramePage.page.waitForTimeout(100)
    
    await expect(gramFramePage.page.locator('.gram-frame-doppler-line')).toHaveCount(1)
    await expect(gramFramePage.page.locator('.gram-frame-doppler-start-point')).toHaveCount(1)
    await expect(gramFramePage.page.locator('.gram-frame-doppler-end-point')).toHaveCount(1)
    
    // Switch to Analysis mode
    await gramFramePage.clickMode('Analysis')
    await gramFramePage.page.waitForTimeout(100)
    
    // Verify Doppler elements are cleared
    await expect(gramFramePage.page.locator('.gram-frame-doppler-line')).toHaveCount(0)
    await expect(gramFramePage.page.locator('.gram-frame-doppler-start-point')).toHaveCount(0)
    await expect(gramFramePage.page.locator('.gram-frame-doppler-end-point')).toHaveCount(0)
    
    // Verify Doppler LEDs are hidden
    const deltaTimeLED = gramFramePage.page.locator('.gram-frame-led:has(.gram-frame-led-label:text-is("ΔTime (s)"))')
    const deltaFreqLED = gramFramePage.page.locator('.gram-frame-led:has(.gram-frame-led-label:text-is("ΔFreq (Hz)"))')
    const speedLED = gramFramePage.page.locator('.gram-frame-led:has(.gram-frame-led-label:text-is("Speed (knots)"))')
    
    await expect(deltaTimeLED).not.toBeVisible()
    await expect(deltaFreqLED).not.toBeVisible()
    await expect(speedLED).not.toBeVisible()
  })

  test('doppler mode allows new measurements to replace previous ones', async () => {
    // Switch to Doppler mode
    await gramFramePage.clickMode('Doppler')
    
    // Set first measurement
    await gramFramePage.clickSpectrogram(100, 80)
    await gramFramePage.clickSpectrogram(150, 120)
    await gramFramePage.page.waitForTimeout(100)
    
    // Get first measurement values
    const deltaTimeLED = gramFramePage.page.locator('.gram-frame-led:has(.gram-frame-led-label:text-is("ΔTime (s)"))')
    const firstDeltaTime = await deltaTimeLED.locator('.gram-frame-led-value').textContent()
    
    // Set new measurement by clicking new start point (should replace previous)
    await gramFramePage.clickSpectrogram(300, 80)
    await gramFramePage.page.waitForTimeout(100)
    
    // Should only have one start point now (new one)
    await expect(gramFramePage.page.locator('.gram-frame-doppler-start-point')).toHaveCount(1)
    await expect(gramFramePage.page.locator('.gram-frame-doppler-end-point')).toHaveCount(0)
    await expect(gramFramePage.page.locator('.gram-frame-doppler-line')).toHaveCount(0)
    
    // Complete the new measurement
    await gramFramePage.clickSpectrogram(350, 200)
    await gramFramePage.page.waitForTimeout(100)
    
    // Get new measurement values
    const secondDeltaTime = await deltaTimeLED.locator('.gram-frame-led-value').textContent()
    
    // Values should be different
    expect(secondDeltaTime).not.toBe(firstDeltaTime)
    
    // Should still have exactly one line and two points
    await expect(gramFramePage.page.locator('.gram-frame-doppler-line')).toHaveCount(1)
    await expect(gramFramePage.page.locator('.gram-frame-doppler-start-point')).toHaveCount(1)
    await expect(gramFramePage.page.locator('.gram-frame-doppler-end-point')).toHaveCount(1)
  })

  test('doppler mode handles edge cases correctly', async () => {
    // Switch to Doppler mode
    await gramFramePage.clickMode('Doppler')
    
    // Test clicking outside image bounds (should not set points)
    await gramFramePage.page.mouse.click(50, 50) // Outside spectrogram area
    await gramFramePage.page.waitForTimeout(100)
    
    await expect(gramFramePage.page.locator('.gram-frame-doppler-start-point')).toHaveCount(0)
    
    // Test clicking at same position twice
    await gramFramePage.clickSpectrogram(150, 100)
    await gramFramePage.clickSpectrogram(150, 100) // Same position
    await gramFramePage.page.waitForTimeout(100)
    
    // Should still work (delta values will be zero)
    await expect(gramFramePage.page.locator('.gram-frame-doppler-start-point')).toHaveCount(1)
    await expect(gramFramePage.page.locator('.gram-frame-doppler-end-point')).toHaveCount(1)
    await expect(gramFramePage.page.locator('.gram-frame-doppler-line')).toHaveCount(1)
    
    // Verify calculations show zero deltas (numerical only)
    const deltaTimeLED = gramFramePage.page.locator('.gram-frame-led:has(.gram-frame-led-label:text-is("ΔTime (s)"))')
    const deltaFreqLED = gramFramePage.page.locator('.gram-frame-led:has(.gram-frame-led-label:text-is("ΔFreq (Hz)"))')
    const speedLED = gramFramePage.page.locator('.gram-frame-led:has(.gram-frame-led-label:text-is("Speed (knots)"))')
    
    await expect(deltaTimeLED.locator('.gram-frame-led-value')).toHaveText('0.00')
    await expect(deltaFreqLED.locator('.gram-frame-led-value')).toHaveText('0')
    await expect(speedLED.locator('.gram-frame-led-value')).toHaveText('0.0')
  })

  test('doppler line has optimal visibility styling', async () => {
    // Switch to Doppler mode and create a line
    await gramFramePage.clickMode('Doppler')
    await gramFramePage.clickSpectrogram(150, 100)
    await gramFramePage.clickSpectrogram(200, 150)
    await gramFramePage.page.waitForTimeout(100)
    
    // Verify shadow line exists for visibility
    const shadowLine = gramFramePage.page.locator('.gram-frame-doppler-line-shadow')
    const mainLine = gramFramePage.page.locator('.gram-frame-doppler-line')
    
    await expect(shadowLine).toHaveCount(1)
    await expect(mainLine).toHaveCount(1)
    
    // Verify line styling
    const mainLineElement = await mainLine.first().elementHandle()
    const strokeWidth = await mainLineElement?.getAttribute('stroke-width')
    expect(strokeWidth).toBe('2')
    
    const shadowLineElement = await shadowLine.first().elementHandle()
    const shadowStrokeWidth = await shadowLineElement?.getAttribute('stroke-width')
    expect(shadowStrokeWidth).toBe('4')
  })
})