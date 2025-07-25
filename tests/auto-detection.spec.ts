import { test, expect } from '@playwright/test'

/**
 * Auto-Detection Tests
 * Tests for automatic detection and replacement of config tables
 */
test.describe('Auto-Detection Functionality', () => {
  
  test('detects and replaces gram-config table on debug page', async ({ page }) => {
    // Navigate to the debug page which has a gram-config table
    await page.goto('/debug.html')
    
    // Wait for component initialization
    await page.waitForFunction(() => window.GramFrame !== undefined)
    
    // Verify table was replaced on the debug page
    await expect(page.locator('table.gram-config')).not.toBeVisible()
    await expect(page.locator('.gram-frame-container')).toBeVisible()
    
    // Verify component was created successfully
    const containerCount = await page.locator('.gram-frame-container').count()
    expect(containerCount).toBe(1)
    
    // Verify SVG and other elements exist
    await expect(page.locator('.gram-frame-svg')).toBeVisible()
    await expect(page.locator('.gram-frame-readout')).toBeVisible()
  })
  
  
  test('API provides access to instances', async ({ page }) => {
    // Navigate to debug page
    await page.goto('/debug.html')
    
    // Wait for component initialization
    await page.waitForFunction(() => window.GramFrame !== undefined)
    
    // Test getInstances API
    const instanceCount = await page.evaluate(() => {
      return window.GramFrame.__test__getInstances().length
    })
    
    expect(instanceCount).toBe(1)
    
    // Test that instances have the expected structure
    const hasInstanceId = await page.evaluate(() => {
      const instances = window.GramFrame.__test__getInstances()
      return instances.length > 0 && instances[0].instanceId !== undefined
    })
    
    expect(hasInstanceId).toBe(true)
  })
  
  test('detectAndReplaceConfigTables method works correctly', async ({ page }) => {
    // Navigate to debug page
    await page.goto('/debug.html')
    
    // Wait for component initialization
    await page.waitForFunction(() => window.GramFrame !== undefined)
    
    // Test that detectAndReplaceConfigTables method is available
    const methodExists = await page.evaluate(() => {
      return typeof window.GramFrame.detectAndReplaceConfigTables === 'function'
    })
    
    expect(methodExists).toBe(true)
    
    // Verify the method returns an array (should be empty since tables are already processed)
    const result = await page.evaluate(() => {
      return Array.isArray(window.GramFrame.detectAndReplaceConfigTables())
    })
    
    expect(result).toBe(true)
  })

  test('validation and error handling methods are available', async ({ page }) => {
    // Navigate to debug page
    await page.goto('/debug.html')
    
    // Wait for component initialization
    await page.waitForFunction(() => window.GramFrame !== undefined)
    
    // Test that private validation methods exist on the API object
    const hasValidationMethod = await page.evaluate(() => {
      return typeof window.GramFrame._validateConfigTable === 'function'
    })
    
    expect(hasValidationMethod).toBe(true)
    
    // Test that error indicator method exists
    const hasErrorMethod = await page.evaluate(() => {
      return typeof window.GramFrame._addErrorIndicator === 'function'
    })
    
    expect(hasErrorMethod).toBe(true)
  })
  
  test('component state includes auto-detection metadata', async ({ page }) => {
    // Navigate to debug page
    await page.goto('/debug.html')
    
    // Wait for component initialization
    await page.waitForFunction(() => window.GramFrame !== undefined)
    
    // Check that component has proper state structure
    const stateStructure = await page.evaluate(() => {
      const instances = window.GramFrame.__test__getInstances()
      if (instances.length === 0) return null
      
      const state = instances[0].state
      return {
        hasVersion: state.version !== undefined,
        hasTimestamp: state.timestamp !== undefined,
        hasImageDetails: state.imageDetails !== undefined,
        hasConfig: state.config !== undefined,
        hasDisplayDimensions: state.displayDimensions !== undefined
      }
    })
    
    expect(stateStructure).not.toBeNull()
    expect(stateStructure.hasVersion).toBe(true)
    expect(stateStructure.hasTimestamp).toBe(true)
    expect(stateStructure.hasImageDetails).toBe(true)
    expect(stateStructure.hasConfig).toBe(true)
    expect(stateStructure.hasDisplayDimensions).toBe(true)
  })
})