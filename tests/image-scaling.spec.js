/**
 * Image scaling tests for Issue #153
 * Tests automatic scaling of images wider than MAX_IMAGE_WIDTH (1200px)
 */

import { test, expect } from '@playwright/test'

test.describe('Image Scaling Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/debug-multiple.html')
    await page.waitForSelector('.gram-frame-container', { timeout: 10000 })
    // Wait for all images to load
    await page.waitForTimeout(2000)
  })

  test('should have exactly 3 GramFrame instances', async ({ page }) => {
    const containers = await page.locator('.gram-frame-container').count()
    expect(containers).toBe(3)
  })

  test('should automatically scale large images to 1200px max width', async ({ page }) => {
    // Get all containers
    const containers = page.locator('.gram-frame-container')
    await expect(containers).toHaveCount(3)
    
    // Find the container with the large image (third instance, second table)
    const largeImageContainer = containers.nth(2)
    
    // Get the SVG image element
    const svgImage = largeImageContainer.locator('.gram-frame-spectrogram-image').first()
    await expect(svgImage).toBeVisible()
    
    // Verify the image is using the large image file
    const imageHref = await svgImage.getAttribute('href')
    expect(imageHref).toContain('mock-gram-large.png')
    
    // Verify scaling attributes
    const imageWidth = await svgImage.getAttribute('width')
    const imageHeight = await svgImage.getAttribute('height')
    const preserveAspectRatio = await svgImage.getAttribute('preserveAspectRatio')
    
    // Should be scaled to 1200px width
    expect(parseInt(imageWidth)).toBe(1200)
    // Original 2000x525 scaled by 0.6 factor = 1200x315
    expect(parseInt(imageHeight)).toBe(315)
    // Should have preserveAspectRatio='none' to prevent clipping
    expect(preserveAspectRatio).toBe('none')
  })

  test('should log scaling information to console', async ({ page }) => {
    const consoleLogs = []
    page.on('console', msg => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text())
      }
    })
    
    // Reload to capture console logs
    await page.reload()
    await page.waitForSelector('.gram-frame-container', { timeout: 10000 })
    await page.waitForTimeout(2000)
    
    // Should have scaling log
    const scalingLog = consoleLogs.find(log => 
      log.includes('Scaling down large image from 2000x525 to 1200x315')
    )
    expect(scalingLog).toBeTruthy()
    expect(scalingLog).toContain('scale factor: 0.600')
  })

  test('should store scaled dimensions in state', async ({ page }) => {
    // Get the GramFrame instance state
    const imageDetails = await page.evaluate(() => {
      const instances = window.GramFrame.__test__getInstances()
      if (instances.length >= 3) {
        const largeImageInstance = instances[2]
        return largeImageInstance.state.imageDetails
      }
      return null
    })
    
    expect(imageDetails).toBeTruthy()
    expect(imageDetails.naturalWidth).toBe(1200)
    expect(imageDetails.naturalHeight).toBe(315)
    expect(imageDetails.url).toContain('mock-gram-large.png')
  })

  test('should maintain coordinate accuracy with scaled images', async ({ page }) => {
    const largeImageContainer = page.locator('.gram-frame-container').nth(2)
    const svg = largeImageContainer.locator('.gram-frame-svg').first()
    
    // Hover over the center of the image (accounting for margins)
    // Margins: left=60, top=15
    await svg.hover({ position: { x: 60 + (1200 / 2), y: 15 + (315 / 2) } })
    await page.waitForTimeout(500) // Allow coordinate update
    
    // Get the coordinates from the state
    const coordinates = await page.evaluate(() => {
      const instances = window.GramFrame.__test__getInstances()
      if (instances.length >= 3) {
        const largeImageInstance = instances[2]
        return largeImageInstance.state.cursorPosition
      }
      return null
    })
    
    expect(coordinates).toBeTruthy()
    // Center should map to middle of time/freq ranges (30s, 2500Hz)
    expect(Math.abs(coordinates.time - 30)).toBeLessThan(2) // Within 2 seconds
    expect(Math.abs(coordinates.freq - 2500)).toBeLessThan(100) // Within 100 Hz
  })

  test('should not scale images smaller than 1200px', async ({ page }) => {
    // Check the first two instances (smaller images)
    for (let i = 0; i < 2; i++) {
      const imageDetails = await page.evaluate((index) => {
        const instances = window.GramFrame.__test__getInstances()
        if (instances.length > index) {
          return instances[index].state.imageDetails
        }
        return null
      }, i)
      
      // These should not be scaled (original dimensions preserved)
      expect(imageDetails.naturalWidth).toBeLessThanOrEqual(1200)
    }
  })

  test('should handle SVG layout correctly with scaled images', async ({ page }) => {
    const largeImageContainer = page.locator('.gram-frame-container').nth(2)
    const svg = largeImageContainer.locator('.gram-frame-svg').first()
    
    // Get SVG dimensions and viewBox
    const svgWidth = await svg.evaluate(el => el.style.width)
    const svgHeight = await svg.evaluate(el => el.style.height)
    const viewBox = await svg.getAttribute('viewBox')
    
    // SVG should be sized for scaled image + margins
    // 1200px + margins.left(60) + margins.right(15) = 1275px
    expect(svgWidth).toBe('1275px')
    // 315px + margins.top(15) + margins.bottom(50) = 380px
    expect(svgHeight).toBe('380px')
    expect(viewBox).toBe('0 0 1275 380')
  })
})