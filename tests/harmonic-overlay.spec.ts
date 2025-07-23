import { test, expect } from '@playwright/test'
import { GramFramePage } from './helpers/gram-frame-page'

test.describe('Harmonic Overlay Implementation (Task 1.1)', () => {
  let gramFramePage: GramFramePage

  test.beforeEach(async ({ page }) => {
    gramFramePage = new GramFramePage(page)
    await gramFramePage.goto()
    
    // Switch to harmonics mode
    await gramFramePage.clickMode('harmonics')
  })

  test('click-to-create harmonic sets in harmonics mode', async () => {
    // Click on the spectrogram to create a harmonic set
    await gramFramePage.clickSpectrogram(300, 200)
    
    // Verify that a harmonic set was created in state
    const state = await gramFramePage.getState()
    expect(state.harmonics.harmonicSets).toHaveLength(1)
    
    const harmonicSet = state.harmonics.harmonicSets[0]
    expect(harmonicSet.id).toMatch(/^harmonic-/)
    expect(harmonicSet.color).toMatch(/^#[0-9a-f]{6}$/i)
    expect(typeof harmonicSet.spacing).toBe('number')
    expect(typeof harmonicSet.anchorTime).toBe('number')
    expect(harmonicSet.spacing).toBeGreaterThan(0)
  })

  test('harmonic sets persist after mouse release', async () => {
    // Create a harmonic set
    await gramFramePage.clickSpectrogram(300, 200)
    
    // Move mouse away
    await gramFramePage.page.mouse.move(100, 100)
    
    // Verify harmonic set still exists
    const state = await gramFramePage.getState()
    expect(state.harmonics.harmonicSets).toHaveLength(1)
    
    // Verify harmonic lines are still visible
    const harmonicLines = await gramFramePage.page.locator('.gram-frame-harmonic-set-line').count()
    expect(harmonicLines).toBeGreaterThan(0)
  })

  test('multiple harmonic sets can be created with distinct colors', async () => {
    // Create first harmonic set at low frequency
    await gramFramePage.clickSpectrogram(100, 100)
    
    // Wait a moment
    await gramFramePage.page.waitForTimeout(100)
    
    // Create second harmonic set at high frequency (far from any harmonics of first set)
    await gramFramePage.clickSpectrogram(700, 200)
    
    const state = await gramFramePage.getState()
    expect(state.harmonics.harmonicSets).toHaveLength(2)
    
    // Verify different colors
    const colors = state.harmonics.harmonicSets.map(set => set.color)
    expect(colors[0]).not.toBe(colors[1])
    
    // Verify both sets have different properties
    expect(state.harmonics.harmonicSets[0].id).not.toBe(state.harmonics.harmonicSets[1].id)
  })

  test('harmonic set lines render with correct spacing', async () => {
    // Create harmonic set
    await gramFramePage.clickSpectrogram(300, 200)
    
    // Verify harmonic lines are rendered
    const harmonicLines = await gramFramePage.page.locator('.gram-frame-harmonic-set-line')
    expect(await harmonicLines.count()).toBeGreaterThan(0)
    
    // Verify lines have correct color and styling
    const firstLine = harmonicLines.first()
    const strokeWidth = await firstLine.getAttribute('stroke-width')
    expect(strokeWidth).toBe('2')
    
    // Verify shadow lines exist
    const shadowLines = await gramFramePage.page.locator('.gram-frame-harmonic-set-shadow')
    expect(await shadowLines.count()).toBeGreaterThan(0)
  })


  test('harmonic management panel updates when sets are created', async () => {
    const panel = gramFramePage.page.locator('.gram-frame-harmonic-panel')
    
    // Create a harmonic set
    await gramFramePage.clickSpectrogram(300, 200)
    
    // Verify empty state disappears
    const emptyText = panel.locator('.gram-frame-harmonic-empty')
    await expect(emptyText).not.toBeVisible()
    
    // Verify table appears
    const table = panel.locator('.gram-frame-harmonic-table')
    await expect(table).toBeVisible()
    
    // Verify table has correct headers
    const headers = table.locator('th')
    await expect(headers).toHaveText(['Color', 'Spacing (Hz)', 'Rate', 'Action'])
    
    // Verify one row for the created harmonic set
    const rows = table.locator('tbody tr')
    await expect(rows).toHaveCount(1)
    
    // Verify row contains color, spacing, rate, and delete button
    const row = rows.first()
    const colorCell = row.locator('td').nth(0)
    const colorDiv = colorCell.locator('.gram-frame-harmonic-color')
    await expect(colorDiv).toBeVisible()
    
    const spacingCell = row.locator('td').nth(1)
    const spacingText = await spacingCell.textContent()
    expect(parseFloat(spacingText!)).toBeGreaterThan(0)
    
    const deleteButton = row.locator('.gram-frame-harmonic-delete')
    await expect(deleteButton).toBeVisible()
  })


  test('harmonic sets are cleared when exiting harmonics mode', async () => {
    // Create harmonic sets
    await gramFramePage.clickSpectrogram(100, 100)
    await gramFramePage.page.waitForTimeout(100)
    await gramFramePage.clickSpectrogram(700, 200)
    
    // Verify sets exist
    let state = await gramFramePage.getState()
    expect(state.harmonics.harmonicSets).toHaveLength(2)
    
    // Switch to analysis mode
    await gramFramePage.clickMode('analysis')
    
    // Verify harmonic sets were cleared
    state = await gramFramePage.getState()
    expect(state.harmonics.harmonicSets).toHaveLength(0)
    
    // Verify panel is hidden
    const panel = gramFramePage.page.locator('.gram-frame-harmonic-panel')
    await expect(panel).not.toBeVisible()
  })


  test('harmonic lines have proper 20% height constraint', async () => {
    // Create a harmonic set
    await gramFramePage.clickSpectrogram(300, 200)
    
    // Get SVG container dimensions
    const svg = gramFramePage.page.locator('.gram-frame-svg')
    const svgBox = await svg.boundingBox()
    
    if (svgBox) {
      // Get harmonic line
      const harmonicLine = gramFramePage.page.locator('.gram-frame-harmonic-set-line').first()
      const lineBox = await harmonicLine.boundingBox()
      
      if (lineBox) {
        // Line height should be approximately 20% of image height (not total SVG height)
        // Get the image dimensions from state
        const state = await gramFramePage.getState()
        const imageHeight = state.imageDetails.naturalHeight || svgBox.height
        const expectedHeight = imageHeight * 0.2
        const actualHeight = lineBox.height
        
        // Allow for larger margin of error as this is a rough constraint
        expect(Math.abs(actualHeight - expectedHeight)).toBeLessThan(Math.max(10, expectedHeight * 0.3))
      }
    }
  })

  test('initial spacing calculation follows specification', async () => {
    // Get frequency configuration
    const state = await gramFramePage.getState()
    const freqMin = state.config.freqMin
    
    // Click at a specific frequency position
    await gramFramePage.clickSpectrogram(300, 200)
    
    const updatedState = await gramFramePage.getState()
    const harmonicSet = updatedState.harmonics.harmonicSets[0]
    
    // Calculate expected spacing based on specification
    // Should represent 10th harmonic if freq origin > 0, else 5th harmonic
    const expectedHarmonicNumber = freqMin > 0 ? 10 : 5
    
    // Get the frequency at click position
    const clickFreq = updatedState.cursorPosition?.freq || 0
    const expectedSpacing = clickFreq / expectedHarmonicNumber
    
    // Allow for reasonable tolerance
    expect(Math.abs(harmonicSet.spacing - expectedSpacing)).toBeLessThan(expectedSpacing * 0.1)
  })
})