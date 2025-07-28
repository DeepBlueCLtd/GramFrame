import { test, expect } from '@playwright/test'
import { GramFramePage } from './helpers/gram-frame-page'

test.describe('Harmonics Mode Manual Features', () => {
  let gramFramePage: GramFramePage

  test.beforeEach(async ({ page }) => {
    gramFramePage = new GramFramePage(page)
    await gramFramePage.goto()
    await gramFramePage.waitForImageLoad()
    
    // Switch to Harmonics mode
    await gramFramePage.clickMode('Harmonics')
    await gramFramePage.page.waitForTimeout(200)
  })

  test('manual button is present in harmonics mode', async () => {
    // Verify manual button exists and is visible
    const manualButton = gramFramePage.page.locator('.gram-frame-manual-button')
    await expect(manualButton).toBeVisible()
    await expect(manualButton).toHaveText('+ Manual')
  })

  test('manual button is not present in analysis mode', async () => {
    // Switch back to Analysis mode
    await gramFramePage.clickMode('Analysis')
    await gramFramePage.page.waitForTimeout(200)
    
    // Verify manual button is not present
    const manualButton = gramFramePage.page.locator('.gram-frame-manual-button')
    await expect(manualButton).not.toBeVisible()
  })

  test('clicking manual button opens modal dialog', async () => {
    // Click the manual button
    await gramFramePage.page.locator('.gram-frame-manual-button').click()
    
    // Verify modal is visible
    const modal = gramFramePage.page.locator('.gram-frame-modal')
    await expect(modal).toBeVisible()
    
    // Verify modal content
    await expect(modal.locator('h3')).toHaveText('Add Manual Harmonics')
    await expect(modal.locator('label')).toHaveText('Harmonic spacing (Hz):')
    
    // Verify input field
    const input = modal.locator('#harmonic-spacing-input')
    await expect(input).toBeVisible()
    await expect(input).toHaveAttribute('type', 'number')
    await expect(input).toHaveAttribute('min', '1.0')
    
    // Verify buttons
    await expect(modal.locator('#cancel-button')).toBeVisible()
    await expect(modal.locator('#add-button')).toBeVisible()
  })

  test('modal input validation works correctly', async () => {
    // Open modal
    await gramFramePage.page.locator('.gram-frame-manual-button').click()
    
    const modal = gramFramePage.page.locator('.gram-frame-modal')
    const input = modal.locator('#harmonic-spacing-input')
    const addButton = modal.locator('#add-button')
    const errorDiv = modal.locator('#spacing-error')
    
    // Initially, add button should be disabled
    await expect(addButton).toBeDisabled()
    await expect(errorDiv).not.toBeVisible()
    
    // Test invalid input (less than 1.0)
    await input.fill('0.5')
    await expect(addButton).toBeDisabled()
    await expect(errorDiv).toBeVisible()
    await expect(errorDiv).toHaveText('Please enter a number ≥ 1.0')
    
    // Test valid input
    await input.fill('50.5')
    await expect(addButton).not.toBeDisabled()
    await expect(errorDiv).not.toBeVisible()
    
    // Test edge case - exactly 1.0
    await input.fill('1.0')
    await expect(addButton).not.toBeDisabled()
    await expect(errorDiv).not.toBeVisible()
    
    // Test empty input
    await input.fill('')
    await expect(addButton).toBeDisabled()
    await expect(errorDiv).not.toBeVisible()
    
    // Test that non-numeric input is handled (browsers may clear invalid values from number inputs)
    // Instead of testing invalid text input, test an out-of-range numeric value which is easier to validate
    await input.fill('-5')
    await expect(addButton).toBeDisabled()
    await expect(errorDiv).toBeVisible()
  })

  test('cancel button closes modal without adding harmonics', async () => {
    // Get initial state
    const initialState = await gramFramePage.getState()
    const initialHarmonicCount = initialState.harmonics?.harmonicSets?.length || 0
    
    // Open modal
    await gramFramePage.page.locator('.gram-frame-manual-button').click()
    
    // Fill valid input
    const modal = gramFramePage.page.locator('.gram-frame-modal')
    await modal.locator('#harmonic-spacing-input').fill('25.0')
    
    // Click cancel
    await modal.locator('#cancel-button').click()
    
    // Verify modal is closed
    await expect(modal).not.toBeVisible()
    
    // Verify no harmonics were added
    const finalState = await gramFramePage.getState()
    const finalHarmonicCount = finalState.harmonics?.harmonicSets?.length || 0
    expect(finalHarmonicCount).toBe(initialHarmonicCount)
  })

  test('add button creates harmonic set with correct spacing', async () => {
    // Get initial state
    const initialState = await gramFramePage.getState()
    const initialHarmonicCount = initialState.harmonics?.harmonicSets?.length || 0
    
    // Open modal
    await gramFramePage.page.locator('.gram-frame-manual-button').click()
    
    // Fill valid spacing
    const spacing = 73.5
    const modal = gramFramePage.page.locator('.gram-frame-modal')
    await modal.locator('#harmonic-spacing-input').fill(spacing.toString())
    
    // Click add
    await modal.locator('#add-button').click()
    
    // Verify modal is closed
    await expect(modal).not.toBeVisible()
    
    // Wait for state update
    await gramFramePage.page.waitForTimeout(200)
    
    // Verify harmonic set was added
    const finalState = await gramFramePage.getState()
    const finalHarmonicCount = finalState.harmonics?.harmonicSets?.length || 0
    expect(finalHarmonicCount).toBe(initialHarmonicCount + 1)
    
    // Verify the spacing is correct
    const newHarmonicSet = finalState.harmonics.harmonicSets[finalHarmonicCount - 1]
    expect(newHarmonicSet.spacing).toBe(spacing)
  })

  test('Enter key adds harmonic when input is valid', async () => {
    // Get initial state
    const initialState = await gramFramePage.getState()
    const initialHarmonicCount = initialState.harmonics?.harmonicSets?.length || 0
    
    // Open modal
    await gramFramePage.page.locator('.gram-frame-manual-button').click()
    
    // Fill valid spacing and press Enter
    const modal = gramFramePage.page.locator('.gram-frame-modal')
    const input = modal.locator('#harmonic-spacing-input')
    await input.fill('42.0')
    await input.press('Enter')
    
    // Verify modal is closed
    await expect(modal).not.toBeVisible()
    
    // Wait for state update
    await gramFramePage.page.waitForTimeout(200)
    
    // Verify harmonic set was added
    const finalState = await gramFramePage.getState()
    const finalHarmonicCount = finalState.harmonics?.harmonicSets?.length || 0
    expect(finalHarmonicCount).toBe(initialHarmonicCount + 1)
  })

  test('Escape key closes modal without adding harmonics', async () => {
    // Get initial state
    const initialState = await gramFramePage.getState()
    const initialHarmonicCount = initialState.harmonics?.harmonicSets?.length || 0
    
    // Open modal
    await gramFramePage.page.locator('.gram-frame-manual-button').click()
    
    // Fill valid input and press Escape
    const modal = gramFramePage.page.locator('.gram-frame-modal')
    await modal.locator('#harmonic-spacing-input').fill('30.0')
    await gramFramePage.page.keyboard.press('Escape')
    
    // Verify modal is closed
    await expect(modal).not.toBeVisible()
    
    // Verify no harmonics were added
    const finalState = await gramFramePage.getState()
    const finalHarmonicCount = finalState.harmonics?.harmonicSets?.length || 0
    expect(finalHarmonicCount).toBe(initialHarmonicCount)
  })

  test('clicking overlay closes modal without adding harmonics', async () => {
    // Get initial state
    const initialState = await gramFramePage.getState()
    const initialHarmonicCount = initialState.harmonics?.harmonicSets?.length || 0
    
    // Open modal
    await gramFramePage.page.locator('.gram-frame-manual-button').click()
    
    // Fill valid input
    const modal = gramFramePage.page.locator('.gram-frame-modal')
    await modal.locator('#harmonic-spacing-input').fill('35.0')
    
    // Click on overlay (outside modal)
    const overlay = gramFramePage.page.locator('.gram-frame-modal-overlay')
    await overlay.click({ position: { x: 10, y: 10 } }) // Click near top-left corner
    
    // Verify modal is closed
    await expect(modal).not.toBeVisible()
    
    // Verify no harmonics were added
    const finalState = await gramFramePage.getState()
    const finalHarmonicCount = finalState.harmonics?.harmonicSets?.length || 0
    expect(finalHarmonicCount).toBe(initialHarmonicCount)
  })

  test('manual harmonics appear in harmonic panel', async () => {
    // Add a manual harmonic set
    await gramFramePage.page.locator('.gram-frame-manual-button').click()
    
    const modal = gramFramePage.page.locator('.gram-frame-modal')
    await modal.locator('#harmonic-spacing-input').fill('60.0')
    await modal.locator('#add-button').click()
    
    // Wait for UI update
    await gramFramePage.page.waitForTimeout(200)
    
    // Verify harmonic appears in the panel table
    const harmonicTable = gramFramePage.page.locator('.gram-frame-harmonic-table tbody')
    const rows = harmonicTable.locator('tr')
    await expect(rows).toHaveCount(1)
    
    // Verify the spacing is displayed correctly
    const spacingCell = rows.first().locator('.gram-frame-harmonic-spacing')
    await expect(spacingCell).toHaveText('60.0')
    
    // Verify delete button is present
    const deleteButton = rows.first().locator('.gram-frame-harmonic-delete')
    await expect(deleteButton).toBeVisible()
  })

  test('harmonic sets do not show grab cursor when in other modes', async () => {
    // Create a harmonic set by clicking
    await gramFramePage.clickSpectrogram(150, 100)
    await gramFramePage.page.waitForTimeout(100)
    
    // Verify harmonic set exists
    const state = await gramFramePage.getCurrentState()
    expect(state.harmonics.harmonicSets).toHaveLength(1)
    
    // Switch to Doppler mode first to isolate the issue
    await gramFramePage.clickMode('Doppler')
    await gramFramePage.page.waitForTimeout(300) // Give more time for re-rendering and cursor reset
    
    // Verify that the mode was actually switched
    const stateAfterSwitch = await gramFramePage.getCurrentState()
    expect(stateAfterSwitch.mode).toBe('doppler')
    
    // Move mouse over the same position where the harmonic set is
    await gramFramePage.moveMouseToSpectrogram(150, 100)
    await gramFramePage.page.waitForTimeout(100)
    
    // Verify cursor does NOT show grab for harmonic set in Doppler mode
    const dopplerModeCursor = await gramFramePage.svg.evaluate(el => window.getComputedStyle(el).cursor)
    expect(dopplerModeCursor).not.toBe('grab')
    
    // Also check if any harmonic lines have grab cursor set directly
    const harmonicLinesWithGrab = await gramFramePage.page.locator('.gram-frame-harmonic-set-line').evaluateAll(lines => 
      lines.filter(line => window.getComputedStyle(line).cursor === 'grab').length
    )
    expect(harmonicLinesWithGrab).toBe(0)
    
    // Also test Analysis mode
    await gramFramePage.clickMode('Analysis')
    await gramFramePage.page.waitForTimeout(200)
    
    await gramFramePage.moveMouseToSpectrogram(150, 100)
    await gramFramePage.page.waitForTimeout(100)
    
    const analysisModeCursor = await gramFramePage.svg.evaluate(el => window.getComputedStyle(el).cursor)
    expect(analysisModeCursor).not.toBe('grab')
    expect(analysisModeCursor).toBe('crosshair')
  })
})