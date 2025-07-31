import { expect } from '@playwright/test'

/**
 * Page object model for the GramFrame component
 * Encapsulates interactions with the GramFrame component for testing
 */
class GramFramePage {
  /**
   * Create a new GramFramePage instance
   * @param {import('@playwright/test').Page} page - Playwright page instance
   */
  constructor(page) {
    /** @type {import('@playwright/test').Page} */
    this.page = page
    /** @type {import('@playwright/test').Locator} */
    this.componentContainer = page.locator('.component-container')
    /** @type {import('@playwright/test').Locator} */
    this.diagnosticsPanel = page.locator('.diagnostics-panel')
    /** @type {import('@playwright/test').Locator} */
    this.stateDisplay = page.locator('#state-display')
    /** @type {import('@playwright/test').Locator} */
    this.svg = page.locator('.gram-frame-svg')
    /** @type {import('@playwright/test').Locator} */
    this.readoutPanel = page.locator('.gram-frame-readout')
    /** @type {import('@playwright/test').Locator} */
    this.freqLED = page.locator('.gram-frame-led:has(.gram-frame-led-label:text-is("Frequency (Hz)"))')
    /** @type {import('@playwright/test').Locator} */
    this.timeLED = page.locator('.gram-frame-led:has(.gram-frame-led-label:text-is("Time (mm:ss)"))')
    /** @type {import('@playwright/test').Locator} */
    this.modeLED = page.locator('.gram-frame-led:has(.gram-frame-led-label:text-is("Mode"))')
  }

  /**
   * Navigate to the debug page and wait for component to load
   * @returns {Promise<void>}
   */
  async goto() {
    await this.page.goto('/debug.html')
    await this.waitForComponentLoad()
  }

  /**
   * Wait for the component to fully initialize
   * @returns {Promise<void>}
   */
  async waitForComponentLoad() {
    // Wait for the component to initialize
    await this.componentContainer.waitFor()
    
    // Wait for state to be populated
    await this.page.waitForFunction(() => {
      const stateDisplay = document.getElementById('state-display')
      return stateDisplay && stateDisplay.textContent && 
             !stateDisplay.textContent.includes('Loading...')
    })
  }

  /**
   * Wait for the spectrogram image to load
   * @returns {Promise<void>}
   */
  async waitForImageLoad() {
    // Wait for the image to be loaded and rendered in SVG
    await this.page.waitForFunction(() => {
      const svg = document.querySelector('.gram-frame-svg')
      if (!svg) return false
      
      const image = svg.querySelector('.gram-frame-image')
      if (!image) return false
      
      // Check if the image has been loaded (href attribute is set)
      const href = image.getAttributeNS('http://www.w3.org/1999/xlink', 'href')
      return href && href.length > 0
    }, {}, { timeout: 10000 })
  }

  /**
   * Wait for the image dimensions to be populated in the state
   * @returns {Promise<void>}
   */
  async waitForImageDimensions() {
    await this.page.waitForFunction(() => {
      const stateDisplay = document.getElementById('state-display')
      if (!stateDisplay || !stateDisplay.textContent) return false
      
      try {
        const state = JSON.parse(stateDisplay.textContent)
        return state.imageDetails && 
               state.imageDetails.naturalWidth > 0 && 
               state.imageDetails.naturalHeight > 0
      } catch {
        return false
      }
    }, {}, { timeout: 10000 })
  }

  /**
   * Get the current state of the component
   * @returns {Promise<import('../../src/types.js').GramFrameState>} The parsed state object
   */
  async getState() {
    const stateContent = await this.stateDisplay.textContent()
    return JSON.parse(stateContent || '{}')
  }

  /**
   * Move the mouse to specific coordinates on the SVG
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Promise<void>}
   */
  async moveMouse(x, y) {
    await this.svg.hover({ position: { x, y } })
  }

  /**
   * Click at specific coordinates on the SVG
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Promise<void>}
   */
  async clickSVG(x, y) {
    await this.svg.click({ position: { x, y } })
  }

  /**
   * Drag from one position to another on the SVG
   * @param {number} startX - Starting X coordinate
   * @param {number} startY - Starting Y coordinate
   * @param {number} endX - Ending X coordinate
   * @param {number} endY - Ending Y coordinate
   * @returns {Promise<void>}
   */
  async dragSVG(startX, startY, endX, endY) {
    // Use Playwright's mouse API for precise drag control
    await this.page.mouse.move(startX, startY)
    await this.page.mouse.down()
    await this.page.mouse.move(endX, endY)
    await this.page.mouse.up()
  }

  /**
   * Start a drag at specific coordinates on the SVG
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Promise<void>}
   */
  async startDragSVG(x, y) {
    const svgBox = await this.svg.boundingBox()
    if (svgBox) {
      await this.page.mouse.move(svgBox.x + x, svgBox.y + y)
      await this.page.mouse.down()
    }
  }

  /**
   * End a drag at specific coordinates on the SVG
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Promise<void>}
   */
  async endDragSVG(x, y) {
    const svgBox = await this.svg.boundingBox()
    if (svgBox) {
      await this.page.mouse.move(svgBox.x + x, svgBox.y + y)
      await this.page.mouse.up()
    }
  }

  /**
   * Verify the value of an LED display
   * @param {string} label - The label of the LED display (e.g., "Frequency", "Time", "Mode")
   * @param {RegExp} expectedValueRegex - Regular expression to match the expected value
   * @returns {Promise<void>}
   */
  async verifyLEDValue(label, expectedValueRegex) {
    const ledSelector = `.gram-frame-led:has(.gram-frame-led-label:text-is("${label}")) .gram-frame-led-value`
    await expect(this.page.locator(ledSelector)).toHaveText(expectedValueRegex)
  }

  /**
   * Get the text value of an LED display
   * @param {string} label - The label of the LED display
   * @returns {Promise<string|null>} The text content of the LED value
   */
  async getLEDValue(label) {
    const ledSelector = `.gram-frame-led:has(.gram-frame-led-label:text-is("${label}")) .gram-frame-led-value`
    return await this.page.locator(ledSelector).textContent()
  }

  /**
   * Click a mode button to switch modes
   * @param {string} mode - The mode to switch to (e.g., "Cross Cursor", "Harmonics")
   * @returns {Promise<void>}
   */
  async clickMode(mode) {
    // Wait for button to be available and interactable
    const modeButton = this.page.locator(`.gram-frame-mode-btn:text("${mode}")`)
    await modeButton.waitFor({ state: 'visible' })
    await modeButton.click()
  }

  /**
   * Set the rate value - DEPRECATED: Rate input has been removed from UI
   * @param {number} _rate - The rate value to set (unused)
   * @returns {Promise<void>}
   */
  async setRate(_rate) {
    // Rate input has been removed from UI
    // This method is kept as a stub to prevent test failures
    // but it no longer performs any action
  }

  /**
   * Verify that the image has been loaded in the SVG
   * @returns {Promise<void>}
   */
  async verifyImageLoaded() {
    // Check if SVG image has a valid href attribute
    const imageLoaded = await this.page.evaluate(() => {
      const svg = document.querySelector('.gram-frame-svg')
      if (!svg) return false
      
      const image = svg.querySelector('.gram-frame-image')
      if (!image) return false
      
      // Check if the image has been loaded (href attribute is set)
      const href = image.getAttributeNS('http://www.w3.org/1999/xlink', 'href')
      return href && href.length > 0 && href.includes('.png')
    })
    
    expect(imageLoaded).toBe(true)
  }

  /**
   * Verify that the state has specific properties
   * @param {Record<string, any>} expectedProps - Object with expected properties
   * @returns {Promise<void>}
   */
  async verifyStateProperties(expectedProps) {
    const state = await this.getState()
    
    for (const [key, value] of Object.entries(expectedProps)) {
      if (typeof value === 'object' && value !== null) {
        expect(state).toHaveProperty(key)
        // For nested objects, recursively check properties
        for (const [nestedKey, nestedValue] of Object.entries(value)) {
          expect(state[key]).toHaveProperty(nestedKey, nestedValue)
        }
      } else {
        expect(state).toHaveProperty(key, value)
      }
    }
  }

  /**
   * Wait for a specific state condition
   * @param {function(any): boolean} predicate - Function that returns true when the desired state is reached
   * @param {number} timeoutMs - Maximum time to wait in milliseconds
   * @returns {Promise<void>}
   */
  async waitForState(predicate, timeoutMs = 5000) {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeoutMs) {
      const state = await this.getState()
      if (predicate(state)) {
        return
      }
      await this.page.waitForTimeout(100)
    }
    
    throw new Error(`Timeout waiting for state condition after ${timeoutMs}ms`)
  }

  /**
   * Click a control button in the diagnostics panel
   * @param {string} buttonId - The ID of the button to click
   * @returns {Promise<void>}
   */
  async clickControlButton(buttonId) {
    await this.page.locator(`#${buttonId}`).click()
  }

  /**
   * Get the current state from the debug page state display
   * Alias for getState for consistency
   * @returns {Promise<import('../../src/types.js').GramFrameState>} The parsed state object
   */
  async getCurrentState() {
    return this.getState()
  }

  /**
   * Move mouse to a position on the spectrogram
   * @param {number} x - X coordinate relative to the spectrogram
   * @param {number} y - Y coordinate relative to the spectrogram
   * @returns {Promise<void>}
   */
  async moveMouseToSpectrogram(x, y) {
    // Move mouse to the SVG area (spectrogram is within the SVG)
    await this.svg.hover({ position: { x, y } })
  }

  /**
   * Click at a position on the spectrogram
   * @param {number} x - X coordinate relative to the spectrogram
   * @param {number} y - Y coordinate relative to the spectrogram
   * @returns {Promise<void>}
   */
  async clickSpectrogram(x, y) {
    // Click on the SVG area (spectrogram is within the SVG)
    await this.svg.click({ position: { x, y } })
  }
}

export { GramFramePage }