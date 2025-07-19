import { Page, Locator, expect } from '@playwright/test'

/**
 * Page object model for the GramFrame component
 * Encapsulates interactions with the GramFrame component for testing
 */
export class GramFramePage {
  readonly page: Page
  readonly componentContainer: Locator
  readonly diagnosticsPanel: Locator
  readonly stateDisplay: Locator
  readonly svg: Locator
  readonly readoutPanel: Locator
  readonly freqLED: Locator
  readonly timeLED: Locator
  readonly modeLED: Locator

  constructor(page: Page) {
    this.page = page
    this.componentContainer = page.locator('.component-container')
    this.diagnosticsPanel = page.locator('.diagnostics-panel')
    this.stateDisplay = page.locator('#state-display')
    this.svg = page.locator('.gram-frame-svg')
    this.readoutPanel = page.locator('.gram-frame-readout')
    this.freqLED = page.locator('.gram-frame-led:has(.gram-frame-led-label:text("Frequency"))')
    this.timeLED = page.locator('.gram-frame-led:has(.gram-frame-led-label:text("Time"))')
    this.modeLED = page.locator('.gram-frame-led:has(.gram-frame-led-label:text("Mode"))')
  }

  /**
   * Navigate to the debug page and wait for component to load
   */
  async goto() {
    await this.page.goto('/debug.html')
    await this.waitForComponentLoad()
  }

  /**
   * Wait for the component to fully initialize
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
   */
  async waitForImageLoad() {
    // Wait for the image to be loaded and rendered in SVG
    await this.page.waitForFunction(() => {
      const svg = document.querySelector('.gram-frame-svg') as SVGSVGElement
      if (!svg) return false
      
      const image = svg.querySelector('.gram-frame-image') as SVGImageElement
      if (!image) return false
      
      // Check if the image has been loaded (href attribute is set)
      const href = image.getAttributeNS('http://www.w3.org/1999/xlink', 'href')
      return href && href.length > 0
    }, {}, { timeout: 10000 })
  }

  /**
   * Get the current state of the component
   * @returns The parsed state object
   */
  async getState() {
    const stateContent = await this.stateDisplay.textContent()
    return JSON.parse(stateContent || '{}')
  }

  /**
   * Move the mouse to specific coordinates on the SVG
   * @param x X coordinate
   * @param y Y coordinate
   */
  async moveMouse(x: number, y: number) {
    await this.svg.hover({ position: { x, y } })
  }

  /**
   * Click at specific coordinates on the SVG
   * @param x X coordinate
   * @param y Y coordinate
   */
  async clickSVG(x: number, y: number) {
    await this.svg.click({ position: { x, y } })
  }

  /**
   * Verify the value of an LED display
   * @param label The label of the LED display (e.g., "Frequency", "Time", "Mode")
   * @param expectedValueRegex Regular expression to match the expected value
   */
  async verifyLEDValue(label: string, expectedValueRegex: RegExp) {
    const ledSelector = `.gram-frame-led:has(.gram-frame-led-label:text("${label}")) .gram-frame-led-value`
    await expect(this.page.locator(ledSelector)).toHaveText(expectedValueRegex)
  }

  /**
   * Get the text value of an LED display
   * @param label The label of the LED display
   * @returns The text content of the LED value
   */
  async getLEDValue(label: string) {
    const ledSelector = `.gram-frame-led:has(.gram-frame-led-label:text("${label}")) .gram-frame-led-value`
    return await this.page.locator(ledSelector).textContent()
  }

  /**
   * Click a mode button to switch modes
   * @param mode The mode to switch to (e.g., "Analysis", "Harmonics", "Doppler")
   */
  async clickMode(mode: string) {
    await this.page.locator(`.gram-frame-mode-btn:text("${mode}")`).click()
  }

  /**
   * Set the rate value
   * @param rate The rate value to set
   */
  async setRate(rate: number) {
    await this.page.locator('.gram-frame-rate input').fill(rate.toString())
    await this.page.keyboard.press('Enter')
  }

  /**
   * Verify that the image has been loaded in the SVG
   */
  async verifyImageLoaded() {
    // Check if SVG image has a valid href attribute
    const imageLoaded = await this.page.evaluate(() => {
      const svg = document.querySelector('.gram-frame-svg') as SVGSVGElement
      if (!svg) return false
      
      const image = svg.querySelector('.gram-frame-image') as SVGImageElement
      if (!image) return false
      
      // Check if the image has been loaded (href attribute is set)
      const href = image.getAttributeNS('http://www.w3.org/1999/xlink', 'href')
      return href && href.length > 0 && href.includes('.png')
    })
    
    expect(imageLoaded).toBe(true)
  }

  /**
   * Verify that the state has specific properties
   * @param expectedProps Object with expected properties
   */
  async verifyStateProperties(expectedProps: Record<string, any>) {
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
   * @param predicate Function that returns true when the desired state is reached
   * @param timeoutMs Maximum time to wait in milliseconds
   */
  async waitForState(predicate: (state: any) => boolean, timeoutMs = 5000) {
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
   * @param buttonId The ID of the button to click
   */
  async clickControlButton(buttonId: string) {
    await this.page.locator(`#${buttonId}`).click()
  }

  /**
   * Get the current state from the debug page state display
   * Alias for getState for consistency
   */
  async getCurrentState() {
    return this.getState()
  }

  /**
   * Move mouse to a position on the spectrogram
   * @param x X coordinate relative to the spectrogram
   * @param y Y coordinate relative to the spectrogram
   */
  async moveMouseToSpectrogram(x: number, y: number) {
    // Move mouse to the SVG area (spectrogram is within the SVG)
    await this.svg.hover({ position: { x, y } })
  }
}
