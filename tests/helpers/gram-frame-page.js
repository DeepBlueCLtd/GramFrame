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
   * Dispatch a mouse-wheel event over the SVG at SVG-relative coordinates.
   * Uses a synthetic WheelEvent so `deltaY` and `ctrlKey` are fully controlled.
   * @param {number} x - X coordinate relative to the SVG
   * @param {number} y - Y coordinate relative to the SVG
   * @param {number} deltaY - Wheel delta (negative = scroll up/zoom in)
   * @param {boolean} [ctrl=false] - Whether Ctrl is held (zoom vs pan)
   * @returns {Promise<void>}
   */
  async wheelAtSVG(x, y, deltaY, ctrl = false) {
    await this.page.evaluate(({ x, y, deltaY, ctrl }) => {
      const svg = document.querySelector('.gram-frame-svg')
      if (!svg) {
        return
      }
      const rect = svg.getBoundingClientRect()
      const ev = new WheelEvent('wheel', {
        clientX: rect.left + x,
        clientY: rect.top + y,
        deltaY,
        ctrlKey: ctrl,
        bubbles: true,
        cancelable: true
      })
      svg.dispatchEvent(ev)
    }, { x, y, deltaY, ctrl })
  }

  /**
   * Get an SVG-relative pixel point at a fraction across/down the rendered
   * spectrogram image (accounts for the current zoom/pan and axis margins).
   * @param {number} fracX - Horizontal fraction of the image (0-1)
   * @param {number} fracY - Vertical fraction of the image (0-1)
   * @returns {Promise<{x: number, y: number}>} SVG-relative coordinates
   */
  async imageSVGPoint(fracX, fracY) {
    return await this.page.evaluate(({ fracX, fracY }) => {
      const svg = document.querySelector('.gram-frame-svg')
      const img = document.querySelector('.gram-frame-svg image')
      const svgRect = svg.getBoundingClientRect()
      const imgRect = img.getBoundingClientRect()
      return {
        x: (imgRect.left - svgRect.left) + fracX * imgRect.width,
        y: (imgRect.top - svgRect.top) + fracY * imgRect.height
      }
    }, { fracX, fracY })
  }

  /**
   * Perform a wheel-button (middle) drag on the SVG, in SVG-relative coordinates.
   * @param {number} startX - Starting X coordinate relative to the SVG
   * @param {number} startY - Starting Y coordinate relative to the SVG
   * @param {number} endX - Ending X coordinate relative to the SVG
   * @param {number} endY - Ending Y coordinate relative to the SVG
   * @returns {Promise<void>}
   */
  async middleDragSVG(startX, startY, endX, endY) {
    const svgBox = await this.svg.boundingBox()
    if (!svgBox) {
      return
    }
    await this.page.mouse.move(svgBox.x + startX, svgBox.y + startY)
    await this.page.mouse.down({ button: 'middle' })
    await this.page.mouse.move(svgBox.x + endX, svgBox.y + endY, { steps: 5 })
    await this.page.mouse.up({ button: 'middle' })
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
  /**
   * Clear all GramFrame storage entries from both localStorage and sessionStorage
   * @returns {Promise<void>}
   */
  async clearStorage() {
    await this.page.evaluate(() => {
      const stores = [localStorage, sessionStorage]
      for (const store of stores) {
        const keysToRemove = []
        for (let i = 0; i < store.length; i++) {
          const key = store.key(i)
          if (key && key.startsWith('gramframe::')) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(k => store.removeItem(k))
      }
    })
  }

  /**
   * Get a storage entry by its full key
   * @param {string} key - The storage key to retrieve
   * @param {'local' | 'session'} [storageType='local'] - Which storage to read from
   * @returns {Promise<any|null>} Parsed JSON value or null
   */
  async getStorageEntry(key, storageType = 'local') {
    return this.page.evaluate(([k, type]) => {
      const store = type === 'local' ? localStorage : sessionStorage
      const raw = store.getItem(k)
      return raw ? JSON.parse(raw) : null
    }, [key, storageType])
  }

  /**
   * Set a storage entry
   * @param {string} key - The storage key
   * @param {any} value - Value to store (will be JSON-stringified)
   * @param {'local' | 'session'} [storageType='local'] - Which storage to write to
   * @returns {Promise<void>}
   */
  async setStorageEntry(key, value, storageType = 'local') {
    await this.page.evaluate(([k, v, type]) => {
      const store = type === 'local' ? localStorage : sessionStorage
      store.setItem(k, JSON.stringify(v))
    }, [key, value, storageType])
  }

  /**
   * Get the rendered spectrogram image element size (width/height attributes)
   * @returns {Promise<{width: number, height: number}>} Rendered image size in SVG units
   */
  async getRenderedImageSize() {
    return this.page.evaluate(() => {
      const image = document.querySelector('.gram-frame-spectrogram-image')
      if (!image) return { width: 0, height: 0 }
      return {
        width: parseFloat(image.getAttribute('width') || '0'),
        height: parseFloat(image.getAttribute('height') || '0')
      }
    })
  }

  /**
   * Get the computed font-size (in px) of the first frequency axis tick label
   * @returns {Promise<number>} Font size in pixels
   */
  async getAxisLabelFontSize() {
    return this.page.evaluate(() => {
      const label = document.querySelector(
        '.gram-frame-axis-label-major, .gram-frame-axis-label'
      )
      if (!label) return 0
      return parseFloat(window.getComputedStyle(label).fontSize)
    })
  }

  /**
   * Locator for the expand toggle button (may be absent for portrait images)
   * @returns {import('@playwright/test').Locator}
   */
  get expandToggle() {
    return this.page.locator('.gram-frame-expand-toggle')
  }

  /**
   * Whether the expand toggle is present in the DOM
   * @returns {Promise<boolean>}
   */
  async isExpandToggleVisible() {
    return (await this.expandToggle.count()) > 0
  }

  /**
   * Click the expand toggle and wait briefly for relayout
   * @returns {Promise<void>}
   */
  async clickExpandToggle() {
    await this.expandToggle.first().click()
    await this.page.waitForTimeout(150)
  }

  /**
   * Read the data coordinates (freq/time) reported when hovering a given SVG pixel.
   * Returns the cursorPosition data values from state.
   * @param {number} x - X coordinate within the SVG element
   * @param {number} y - Y coordinate within the SVG element
   * @returns {Promise<{freq: number, time: number}|null>} Data coordinates or null
   */
  async readDataAtPixel(x, y) {
    await this.svg.hover({ position: { x, y } })
    await this.page.waitForTimeout(50)
    const state = await this.getState()
    const cp = state.cursorPosition
    if (!cp || typeof cp.freq !== 'number' || typeof cp.time !== 'number') {
      return null
    }
    return { freq: cp.freq, time: cp.time }
  }

  /**
   * Get all GramFrame storage keys
   * @param {'local' | 'session'} [storageType='local'] - Which storage to check
   * @returns {Promise<string[]>} Array of matching storage keys
   */
  async getStorageKeys(storageType = 'local') {
    return this.page.evaluate((type) => {
      const store = type === 'local' ? localStorage : sessionStorage
      const keys = []
      for (let i = 0; i < store.length; i++) {
        const key = store.key(i)
        if (key && key.startsWith('gramframe::')) {
          keys.push(key)
        }
      }
      return keys
    }, storageType)
  }

  /**
   * Build a CSS selector for harmonic lines, optionally scoped to one set.
   * @param {string} [setId] - Restrict to a single harmonic set's lines
   * @returns {string} Selector string
   */
  harmonicLineSelector(setId) {
    return setId
      ? `.gram-frame-harmonic-line[data-harmonic-set-id="${setId}"]`
      : '.gram-frame-harmonic-line'
  }

  /**
   * Count the rendered harmonic pin lines, optionally for a single set.
   * @param {string} [setId] - Restrict the count to one harmonic set
   * @returns {Promise<number>} Number of `.gram-frame-harmonic-line` elements
   */
  async getHarmonicLineCount(setId) {
    return this.page.locator(this.harmonicLineSelector(setId)).count()
  }

  /**
   * Read the `data-harmonic-number` of each rendered harmonic line, in document
   * order, optionally for a single set.
   * @param {string} [setId] - Restrict to one harmonic set
   * @returns {Promise<number[]>} Harmonic numbers in order
   */
  async getHarmonicNumbers(setId) {
    return this.page.evaluate((selector) => {
      const lines = Array.from(document.querySelectorAll(selector))
      return lines.map((line) => Number(line.getAttribute('data-harmonic-number')))
    }, this.harmonicLineSelector(setId))
  }

  /**
   * Read the harmonic number of every rendered number label, optionally scoped to
   * a single set. Reads the label's `data-harmonic-number` attribute.
   * @param {string} [setId] - Restrict to one harmonic set
   * @returns {Promise<number[]>} Label numbers in document order
   */
  async getHarmonicLabelNumbers(setId) {
    const selector = setId
      ? `.gram-frame-harmonic-number[data-harmonic-set-id="${setId}"]`
      : '.gram-frame-harmonic-number'
    return this.page.evaluate((sel) => {
      const labels = Array.from(document.querySelectorAll(sel))
      return labels.map((label) => Number(label.getAttribute('data-harmonic-number')))
    }, selector)
  }

  /**
   * Programmatically add a harmonic set via the test instance API.
   * @param {number} anchorTime - Time position in seconds
   * @param {number} spacing - Frequency spacing in Hz
   * @returns {Promise<string>} The created harmonic set's id
   */
  async addHarmonicSet(anchorTime, spacing) {
    return this.page.evaluate(([time, space]) => {
      // @ts-ignore - test-only global
      const instances = window.GramFrame.__test__getInstances()
      const instance = instances[0]
      const set = instance.modes['harmonics'].addHarmonicSet(time, space)
      return set.id
    }, [anchorTime, spacing])
  }

  /**
   * Programmatically set the zoom level/centre via the test instance API.
   * @param {number} level - Zoom level (1.0 = no zoom)
   * @param {number} [centerX=0.5] - Normalised horizontal centre (0-1)
   * @param {number} [centerY=0.5] - Normalised vertical centre (0-1)
   * @returns {Promise<void>}
   */
  async setZoom(level, centerX = 0.5, centerY = 0.5) {
    await this.page.evaluate(([lvl, cx, cy]) => {
      // @ts-ignore - test-only global
      const instances = window.GramFrame.__test__getInstances()
      instances[0]._setZoom(lvl, cx, cy)
    }, [level, centerX, centerY])
  }

  /**
   * Select a symbol from the control-panel symbol drop-down.
   * @param {string} symbolId - One of 'circle','square','diamond','triangle','triangle-down','star'
   * @returns {Promise<void>}
   */
  async selectSymbol(symbolId) {
    await this.page.locator('.gram-frame-symbol-select').selectOption(symbolId)
  }

  /**
   * Read the pin symbol marks rendered on the spectrogram overlay.
   * @param {string} [harmonicSetId] - Optional filter to a single set's marks
   * @returns {Promise<Array<{symbol: string, fill: string, tag: string}>>}
   */
  async getPinSymbols(harmonicSetId) {
    return this.page.evaluate((setId) => {
      const selector = setId
        ? `.gram-frame-harmonic-symbol[data-harmonic-set-id="${setId}"]`
        : '.gram-frame-harmonic-symbol'
      return Array.from(document.querySelectorAll(selector)).map((el) => ({
        symbol: el.getAttribute('data-symbol') || '',
        fill: el.getAttribute('fill') || '',
        tag: el.tagName.toLowerCase()
      }))
    }, harmonicSetId)
  }

  /**
   * Read the symbol swatches shown in the harmonics table rows.
   * @returns {Promise<Array<{symbol: string, fill: string}>>}
   */
  async getTableSymbolSwatches() {
    return this.page.evaluate(() => {
      const marks = Array.from(document.querySelectorAll(
        '.gram-frame-harmonic-row .gram-frame-harmonic-symbol'
      ))
      return marks.map((el) => ({
        symbol: el.getAttribute('data-symbol') || '',
        fill: el.getAttribute('fill') || ''
      }))
    })
  }
}

export { GramFramePage }