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
  readonly canvas: Locator
  readonly readoutPanel: Locator
  readonly freqLED: Locator
  readonly timeLED: Locator
  readonly modeLED: Locator

  constructor(page: Page) {
    this.page = page
    this.componentContainer = page.locator('.component-container')
    this.diagnosticsPanel = page.locator('.diagnostics-panel')
    this.stateDisplay = page.locator('#state-display')
    this.canvas = page.locator('.gram-frame-canvas')
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
   * Get the current state of the component
   * @returns The parsed state object
   */
  async getState() {
    const stateContent = await this.stateDisplay.textContent()
    return JSON.parse(stateContent || '{}')
  }

  /**
   * Move the mouse to specific coordinates on the canvas
   * @param x X coordinate
   * @param y Y coordinate
   */
  async moveMouse(x: number, y: number) {
    await this.canvas.hover({ position: { x, y } })
  }

  /**
   * Click at specific coordinates on the canvas
   * @param x X coordinate
   * @param y Y coordinate
   */
  async clickCanvas(x: number, y: number) {
    await this.canvas.click({ position: { x, y } })
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
   * Verify that the image has been loaded on the canvas
   */
  async verifyImageLoaded() {
    // Check if canvas has content (not empty)
    const canvasEmpty = await this.page.evaluate(() => {
      const canvas = document.querySelector('.gram-frame-canvas') as HTMLCanvasElement
      if (!canvas) return true
      
      const ctx = canvas.getContext('2d')
      if (!ctx) return true
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      // Check if all pixels are transparent/empty
      return !imageData.data.some(value => value !== 0)
    })
    
    expect(canvasEmpty).toBe(false)
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
}
