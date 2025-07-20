import { test, expect } from './helpers/fixtures'

/**
 * Test suite for multiple tables display functionality in debug.html
 */
test.describe('Multiple Tables Display', () => {
  test('displays three tables with correct images and configuration', async ({ gramFramePage }) => {
    // Navigate to multiple components debug page
    await gramFramePage.page.goto('/debug-multiple.html')
    await gramFramePage.waitForComponentLoad()
    
    // Verify all three components are created (tables should be replaced)
    const components = await gramFramePage.page.locator('.gram-frame-container').all()
    expect(components).toHaveLength(3)
    
    // Verify components have SVG images loaded
    for (let i = 0; i < 3; i++) {
      const component = components[i]
      await expect(component.locator('.gram-frame-svg .gram-frame-image')).toBeVisible()
    }
  })

  test('components are properly contained within component container', async ({ gramFramePage }) => {
    await gramFramePage.page.goto('/debug-multiple.html')
    await gramFramePage.waitForComponentLoad()
    
    // Verify all components are within the component container
    const componentContainer = gramFramePage.page.locator('.component-container')
    const componentsInContainer = componentContainer.locator('.gram-frame-container')
    
    const componentCount = await componentsInContainer.count()
    expect(componentCount).toBe(3)
    
    // Verify each component is properly nested and functional
    for (let i = 0; i < componentCount; i++) {
      const component = componentsInContainer.nth(i)
      await expect(component).toBeVisible()
      
      // Verify component structure
      await expect(component.locator('.gram-frame-svg')).toBeVisible()
      await expect(component.locator('.gram-frame-readout')).toBeVisible()
    }
  })

  test('layout remains responsive with multiple tables', async ({ gramFramePage }) => {
    await gramFramePage.page.goto('/debug-multiple.html')
    await gramFramePage.waitForComponentLoad()
    
    // Test desktop layout
    await gramFramePage.page.setViewportSize({ width: 1200, height: 800 })
    
    const componentContainer = gramFramePage.page.locator('.component-container')
    const diagnosticsPanel = gramFramePage.page.locator('.diagnostics-panel')
    
    // Verify both panels are visible side by side
    await expect(componentContainer).toBeVisible()
    await expect(diagnosticsPanel).toBeVisible()
    
    // Test mobile layout
    await gramFramePage.page.setViewportSize({ width: 600, height: 800 })
    
    // Both panels should still be visible (responsive design)
    await expect(componentContainer).toBeVisible()
    await expect(diagnosticsPanel).toBeVisible()
  })

  test('all component images load correctly', async ({ gramFramePage }) => {
    await gramFramePage.page.goto('/debug-multiple.html')
    await gramFramePage.waitForComponentLoad()
    
    // Wait for all images to load
    await gramFramePage.page.waitForLoadState('networkidle')
    
    const components = gramFramePage.page.locator('.gram-frame-container')
    const componentCount = await components.count()
    expect(componentCount).toBe(3)
    
    // Verify each component's SVG image loads successfully
    for (let i = 0; i < componentCount; i++) {
      const component = components.nth(i)
      const svgImage = component.locator('.gram-frame-svg .gram-frame-image')
      
      // Check if SVG image has href attribute set (indicates loaded)
      const imageLoaded = await svgImage.evaluate((img: SVGImageElement) => {
        const href = img.getAttributeNS('http://www.w3.org/1999/xlink', 'href')
        return href && href.length > 0
      })
      
      expect(imageLoaded).toBe(true)
    }
  })

  test('each component maintains independent state and metadata', async ({ gramFramePage }) => {
    await gramFramePage.page.goto('/debug-multiple.html')
    await gramFramePage.waitForComponentLoad()
    
    // Wait for all components to be fully initialized
    await gramFramePage.page.waitForTimeout(1000)
    
    // Get all component instances and verify they have different metadata
    const componentStates = await gramFramePage.page.evaluate(() => {
      const containers = document.querySelectorAll('.gram-frame-container')
      const states = []
      
      containers.forEach((container, index) => {
        // @ts-ignore - Custom property on DOM element
        const instance = container.__gramFrameInstance
        if (instance && instance.state) {
          states.push({
            index,
            instanceId: instance.state.metadata?.instanceId,
            imageUrl: instance.state.imageDetails?.url,
            naturalWidth: instance.state.imageDetails?.naturalWidth,
            naturalHeight: instance.state.imageDetails?.naturalHeight,
            timeMin: instance.state.config?.timeMin,
            timeMax: instance.state.config?.timeMax,
            freqMin: instance.state.config?.freqMin,
            freqMax: instance.state.config?.freqMax
          })
        }
      })
      
      return states
    })
    
    // Verify we have 3 components
    expect(componentStates).toHaveLength(3)
    
    // Verify each component has unique instance ID
    const instanceIds = componentStates.map(state => state.instanceId)
    const uniqueInstanceIds = new Set(instanceIds)
    expect(uniqueInstanceIds.size).toBe(3)
    
    // Verify each component has different image URLs
    const imageUrls = componentStates.map(state => state.imageUrl)
    expect(imageUrls.some(url => url.includes('mock-gram.png'))).toBe(true)
    expect(imageUrls.some(url => url.includes('mock-gram-3.png'))).toBe(true) 
    expect(imageUrls.some(url => url.includes('mock-gram-2.png'))).toBe(true)
    
    // Verify components have different configurations based on their table data
    // First component: time 0-60, freq 0-100
    const firstComponent = componentStates.find(state => state.imageUrl?.includes('mock-gram.png'))
    expect(firstComponent?.timeMin).toBe(0)
    expect(firstComponent?.timeMax).toBe(60)
    expect(firstComponent?.freqMin).toBe(0)
    expect(firstComponent?.freqMax).toBe(100)
    
    // Third component: time 100-200, freq 0-200  
    const thirdComponent = componentStates.find(state => state.imageUrl?.includes('mock-gram-2.png'))
    expect(thirdComponent?.timeMin).toBe(100)
    expect(thirdComponent?.timeMax).toBe(200)
    expect(thirdComponent?.freqMin).toBe(0)
    expect(thirdComponent?.freqMax).toBe(200)
  })

  test('page structure is valid HTML with multiple tables', async ({ gramFramePage }) => {
    await gramFramePage.page.goto('/debug-multiple.html')
    await gramFramePage.waitForComponentLoad()
    
    // Verify no unclosed divs or structural issues
    const bodyContent = await gramFramePage.page.content()
    
    // Count opening and closing div tags
    const openDivs = (bodyContent.match(/<div/g) || []).length
    const closeDivs = (bodyContent.match(/<\/div>/g) || []).length
    
    expect(openDivs).toBe(closeDivs)
    
    // Verify the main structure elements exist
    await expect(gramFramePage.page.locator('.debug-container')).toBeVisible()
    await expect(gramFramePage.page.locator('.component-container')).toBeVisible()
    await expect(gramFramePage.page.locator('.diagnostics-panel')).toBeVisible()
    
    // Take a screenshot for visual verification
    await gramFramePage.page.screenshot({ 
      path: './test-results/multiple-tables-layout.png',
      fullPage: true 
    })
  })
})