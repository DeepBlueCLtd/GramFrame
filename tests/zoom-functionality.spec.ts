/**
 * @fileoverview E2E Tests for Transform-Based Zoom Functionality
 * 
 * Tests the new simple transform-based zoom implementation that uses
 * CSS transform scaling instead of viewBox manipulation.
 */

import { test, expect } from '@playwright/test'
import { GramFramePage } from './helpers/gram-frame-page'

test.describe('Transform-Based Zoom Functionality', () => {

  test('zoom controls are present and functional', async ({ page }) => {
    const gramFramePage = new GramFramePage(page)
    await gramFramePage.goto()
    await gramFramePage.waitForComponentLoad()

    // Check zoom controls are present
    const zoomControls = await page.locator('.gram-frame-zoom-controls')
    await expect(zoomControls).toBeVisible()
    
    const zoomInBtn = await page.locator('.gram-frame-zoom-btn').filter({ hasText: '+' })
    const zoomOutBtn = await page.locator('.gram-frame-zoom-btn').filter({ hasText: '−' })
    const resetBtn = await page.locator('.gram-frame-zoom-btn').filter({ hasText: '1:1' })
    const zoomDisplay = await page.locator('.gram-frame-zoom-display')
    
    await expect(zoomInBtn).toBeVisible()
    await expect(zoomOutBtn).toBeVisible()
    await expect(resetBtn).toBeVisible()
    await expect(zoomDisplay).toBeVisible()
    await expect(zoomDisplay).toHaveText('100%')
  })

  test('zoom in functionality works correctly', async ({ page }) => {
    const gramFramePage = new GramFramePage(page)
    await gramFramePage.goto()
    await gramFramePage.waitForComponentLoad()

    // Get initial state
    const initialState = await gramFramePage.getState()
    expect(initialState.zoom.level).toBe(1.0)

    // Click zoom in button
    const zoomInBtn = await page.locator('.gram-frame-zoom-btn').filter({ hasText: '+' })
    await zoomInBtn.click()

    // Wait for state update
    await page.waitForTimeout(100)

    // Check state and display
    const newState = await gramFramePage.getState()
    expect(newState.zoom.level).toBe(1.5)
    
    const zoomDisplay = await page.locator('.gram-frame-zoom-display')
    await expect(zoomDisplay).toHaveText('150%')
  })

  test('zoom out functionality works correctly', async ({ page }) => {
    const gramFramePage = new GramFramePage(page)
    await gramFramePage.goto()
    await gramFramePage.waitForComponentLoad()

    // First zoom in to have something to zoom out from
    const zoomInBtn = await page.locator('.gram-frame-zoom-btn').filter({ hasText: '+' })
    await zoomInBtn.click()
    await page.waitForTimeout(100)

    // Now zoom out
    const zoomOutBtn = await page.locator('.gram-frame-zoom-btn').filter({ hasText: '−' })
    await zoomOutBtn.click()
    await page.waitForTimeout(100)

    // Check state
    const state = await gramFramePage.getState()
    expect(state.zoom.level).toBe(1.0)
    
    const zoomDisplay = await page.locator('.gram-frame-zoom-display')
    await expect(zoomDisplay).toHaveText('100%')
  })

  test('reset zoom functionality works correctly', async ({ page }) => {
    const gramFramePage = new GramFramePage(page)
    await gramFramePage.goto()
    await gramFramePage.waitForComponentLoad()

    // Zoom in multiple times
    const zoomInBtn = await page.locator('.gram-frame-zoom-btn').filter({ hasText: '+' })
    await zoomInBtn.click()
    await zoomInBtn.click()
    await page.waitForTimeout(100)

    // Check we're zoomed in
    let state = await gramFramePage.getState()
    expect(state.zoom.level).toBe(2.25) // 1.5 * 1.5

    // Reset zoom
    const resetBtn = await page.locator('.gram-frame-zoom-btn').filter({ hasText: '1:1' })
    await resetBtn.click()
    await page.waitForTimeout(100)

    // Check state
    state = await gramFramePage.getState()
    expect(state.zoom.level).toBe(1.0)
    
    const zoomDisplay = await page.locator('.gram-frame-zoom-display')
    await expect(zoomDisplay).toHaveText('100%')
  })

  test('zoom level is clamped to reasonable bounds', async ({ page }) => {
    const gramFramePage = new GramFramePage(page)
    await gramFramePage.goto()
    await gramFramePage.waitForComponentLoad()

    // Try to zoom out below minimum
    const zoomOutBtn = await page.locator('.gram-frame-zoom-btn').filter({ hasText: '−' })
    await zoomOutBtn.click()
    await page.waitForTimeout(100)

    let state = await gramFramePage.getState()
    expect(state.zoom.level).toBe(0.6666666666666666) // 1.0 / 1.5

    // Try to zoom out more
    await zoomOutBtn.click()
    await page.waitForTimeout(100)

    state = await gramFramePage.getState()
    expect(state.zoom.level).toBe(0.5) // Should be clamped to minimum

    // Reset and try maximum
    const resetBtn = await page.locator('.gram-frame-zoom-btn').filter({ hasText: '1:1' })
    await resetBtn.click()
    await page.waitForTimeout(100)

    // Zoom in to maximum
    const zoomInBtn = await page.locator('.gram-frame-zoom-btn').filter({ hasText: '+' })
    for (let i = 0; i < 10; i++) {
      await zoomInBtn.click()
      await page.waitForTimeout(50)
    }

    state = await gramFramePage.getState()
    expect(state.zoom.level).toBe(5.0) // Should be clamped to maximum
  })

  test('image is properly scaled when zoomed', async ({ page }) => {
    const gramFramePage = new GramFramePage(page)
    await gramFramePage.goto()
    await gramFramePage.waitForComponentLoad()

    // Get initial image dimensions
    const image = await page.locator('.gram-frame-image')
    const initialWidth = await image.getAttribute('width')

    // Zoom in
    const zoomInBtn = await page.locator('.gram-frame-zoom-btn').filter({ hasText: '+' })
    await zoomInBtn.click()
    await page.waitForTimeout(100)

    // Check that image has been scaled
    const scaledWidth = await image.getAttribute('width')
    expect(Number(scaledWidth)).toBe(Number(initialWidth) * 1.5)
  })

  test('zoom preserves basic component functionality', async ({ page }) => {
    const gramFramePage = new GramFramePage(page)
    await gramFramePage.goto()
    await gramFramePage.waitForComponentLoad()

    // Zoom in
    const zoomInBtn = await page.locator('.gram-frame-zoom-btn').filter({ hasText: '+' })
    await zoomInBtn.click()
    await page.waitForTimeout(100)

    // Check that component is still responsive
    const state = await gramFramePage.getState()
    expect(state.zoom.level).toBe(1.5)
    
    // Check that mode switching still works
    const harmonicsBtn = await page.locator('.gram-frame-mode-btn').filter({ hasText: 'Harmonics' })
    await harmonicsBtn.click()
    await page.waitForTimeout(100)
    
    const newState = await gramFramePage.getState()
    expect(newState.mode).toBe('harmonics')
    expect(newState.zoom.level).toBe(1.5) // Zoom should be preserved
  })

})