import { expect } from '@playwright/test'

/// <reference path="../../src/types.js" />

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
   * @returns {Promise<GramFrameState>} The parsed state object
   */
  async getState() {
    // Notifications are coalesced (spec 166, US4) and the debug page's state
    // display is written by a listener, so reading it straight after an action
    // would race the dispatcher. Flushing first makes the read deterministic
    // without waiting out a frame.
    await this.page.evaluate(() => {
      // @ts-ignore - test-only global
      if (window.GramFrame && window.GramFrame.__test__flushDispatches) {
        window.GramFrame.__test__flushDispatches()
      }
    })
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
   * Drag from one position to another, in **viewport** coordinates.
   *
   * Unlike almost every other method here — `clickSVG`, `moveMouse`,
   * `startDragSVG`, `endDragSVG`, `imageSVGPoint` — these are page coordinates,
   * not SVG-relative ones. Add the SVG's own `boundingBox()` offset before
   * calling. Passing SVG-relative values lands the drag somewhere else
   * entirely, which does not throw: the drag simply grabs nothing and the test
   * passes for the wrong reason.
   * @param {number} startX - Starting X coordinate, relative to the viewport
   * @param {number} startY - Starting Y coordinate, relative to the viewport
   * @param {number} endX - Ending X coordinate, relative to the viewport
   * @param {number} endY - Ending Y coordinate, relative to the viewport
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
    await this.page.evaluate(({ atX, atY, wheelDelta, withCtrl }) => {
      const svg = document.querySelector('.gram-frame-svg')
      if (!svg) {
        return
      }
      const rect = svg.getBoundingClientRect()
      const ev = new WheelEvent('wheel', {
        clientX: rect.left + atX,
        clientY: rect.top + atY,
        deltaY: wheelDelta,
        ctrlKey: withCtrl,
        bubbles: true,
        cancelable: true
      })
      svg.dispatchEvent(ev)
    }, { atX: x, atY: y, wheelDelta: deltaY, withCtrl: ctrl })
  }

  /**
   * Get an SVG-relative pixel point at a fraction across/down the rendered
   * spectrogram image (accounts for the current zoom/pan and axis margins).
   * @param {number} fracX - Horizontal fraction of the image (0-1)
   * @param {number} fracY - Vertical fraction of the image (0-1)
   * @returns {Promise<{x: number, y: number}>} SVG-relative coordinates
   */
  async imageSVGPoint(fracX, fracY) {
    return await this.page.evaluate(({ atFracX, atFracY }) => {
      const svg = document.querySelector('.gram-frame-svg')
      const img = document.querySelector('.gram-frame-svg image')
      if (!svg || !img) {
        throw new Error('imageSVGPoint: the component is not on the page')
      }
      const svgRect = svg.getBoundingClientRect()
      const imgRect = img.getBoundingClientRect()
      return {
        x: (imgRect.left - svgRect.left) + atFracX * imgRect.width,
        y: (imgRect.top - svgRect.top) + atFracY * imgRect.height
      }
    }, { atFracX: fracX, atFracY: fracY })
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
    const modeType = await modeButton.getAttribute('data-mode')
    await modeButton.click()
    // The switch is only complete once state reports the new mode — waiting here
    // means no caller has to guess how long the switch takes.
    if (modeType) {
      await this.waitForMode(modeType)
    }
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
          expect(/** @type {Record<string, any>} */ (state)[key]).toHaveProperty(nestedKey, nestedValue)
        }
      } else {
        expect(state).toHaveProperty(key, value)
      }
    }
  }

  /**
   * Wait for a specific state condition.
   *
   * Built on `expect.poll`, so the wait ends the moment the condition holds and
   * fails with the last observed state rather than a bare timeout message. This
   * is the primitive every other `waitFor*` helper here is built on — prefer it
   * over a fixed sleep, which only guesses at how long an update takes.
   *
   * @param {function(any): boolean} predicate - Returns true when the desired state is reached
   * @param {number|{timeout?: number, message?: string}} [opts] - Timeout in ms, or options
   * @returns {Promise<void>}
   */
  async waitForState(predicate, opts = {}) {
    const { timeout = 5000, message = 'state condition' } =
      typeof opts === 'number' ? { timeout: opts } : opts

    await expect
      .poll(async () => predicate(await this.getState()), {
        timeout,
        message: `Timed out waiting for ${message}`
      })
      .toBe(true)
  }

  /**
   * Wait until the analysis markers list holds exactly `n` markers.
   * @param {number} n - Expected marker count
   * @param {{timeout?: number}} [opts] - Optional timeout override
   * @returns {Promise<void>}
   */
  async waitForMarkerCount(n, opts = {}) {
    await this.waitForState(
      (state) => (state.analysis?.markers?.length ?? 0) === n,
      { ...opts, message: `${n} analysis marker(s)` }
    )
  }

  /**
   * Wait until the harmonics state holds exactly `n` harmonic sets.
   * @param {number} n - Expected harmonic set count
   * @param {{timeout?: number}} [opts] - Optional timeout override
   * @returns {Promise<void>}
   */
  async waitForHarmonicSetCount(n, opts = {}) {
    await this.waitForState(
      (state) => (state.harmonics?.harmonicSets?.length ?? 0) === n,
      { ...opts, message: `${n} harmonic set(s)` }
    )
  }

  /**
   * Wait until an audio-sourced instance has analysed its recording and is
   * ready to play (spec 168). Analysis of the fixture takes well under a
   * second; the timeout allows for a cold dev server.
   * @param {{timeout?: number}} [opts] - Optional timeout override
   * @returns {Promise<void>}
   */
  async waitForPlayerReady(opts = {}) {
    await this.page.locator('.gram-frame-container').first().waitFor({ timeout: 10000 })
    await this.waitForState((state) => !!(state.player && state.player.ready), {
      timeout: 15000,
      ...opts,
      message: 'the audio-sourced instance to become ready'
    })
  }

  /**
   * Wait until the component reports the given mode.
   * @param {string} mode - Mode identifier ('pan', 'analysis', 'harmonics', 'doppler')
   * @param {{timeout?: number}} [opts] - Optional timeout override
   * @returns {Promise<void>}
   */
  async waitForMode(mode, opts = {}) {
    await this.waitForState((state) => state.mode === mode, {
      ...opts,
      message: `mode "${mode}"`
    })
  }

  /**
   * Wait until the zoom level settles on the given value.
   * @param {number} level - Expected zoom level
   * @param {{timeout?: number, tolerance?: number}} [opts] - Optional timeout/tolerance override
   * @returns {Promise<void>}
   */
  async waitForZoomLevel(level, opts = {}) {
    const { tolerance = 1e-6, ...rest } = opts
    await this.waitForState(
      (state) => Math.abs((state.zoom?.level ?? 0) - level) <= tolerance,
      { ...rest, message: `zoom level ${level}` }
    )
  }

  /**
   * Locator for the data rows of one of the two feature tables.
   * @param {'markers'|'harmonics'} table - Which table to address
   * @returns {import('@playwright/test').Locator} Row locator
   */
  tableRows(table) {
    return table === 'harmonics'
      ? this.page.locator('tr[data-harmonic-id]')
      : this.page.locator('tr[data-marker-id]')
  }

  /**
   * Wait until a feature table has rendered exactly `n` data rows.
   * @param {'markers'|'harmonics'} table - Which table to address
   * @param {number} n - Expected row count
   * @returns {Promise<void>}
   */
  async waitForTableRowCount(table, n) {
    await expect(this.tableRows(table)).toHaveCount(n)
  }

  /**
   * Wait until the row identified by `key` carries the selected-row class.
   * @param {'markers'|'harmonics'} table - Which table to address
   * @param {string} key - Feature id held in the row's `data-*` identity attribute
   * @returns {Promise<void>}
   */
  async waitForSelectedRow(table, key) {
    const attribute = table === 'harmonics' ? 'data-harmonic-id' : 'data-marker-id'
    await expect(this.page.locator(`tr[${attribute}="${key}"]`)).toHaveClass(
      /gram-frame-selected-row/
    )
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
   * @returns {Promise<GramFrameState>} The parsed state object
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
   * Click the expand toggle and wait for the relayout it triggers to land.
   * Waits on the `imageExpanded` flag flipping rather than on a fixed delay, so
   * the wait ends as soon as the new layout is in state.
   * @returns {Promise<void>}
   */
  async clickExpandToggle() {
    const before = (await this.getState()).imageExpanded
    await this.expandToggle.first().click()
    await this.waitForState((state) => state.imageExpanded !== before, {
      message: `imageExpanded to flip away from ${before}`
    })
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
    // Wait for the readout to catch up with *this* hover rather than for a fixed
    // delay: cursorPosition.x/y are the pixels the reading was computed from, so
    // a stale value from a previous hover is distinguishable from a fresh one.
    // `hover({position})` is padding-box relative while cursorPosition.x/y are
    // border-box relative, so the SVG's border is added back before comparing.
    const border = await this.svgBorderOffset()
    const expectedX = x + border.left
    const expectedY = y + border.top
    await this.waitForState(
      (state) => {
        const cp = state.cursorPosition
        return !!cp &&
          Math.abs(cp.x - expectedX) <= 1 &&
          Math.abs(cp.y - expectedY) <= 1
      },
      { message: `cursor readout at SVG pixel (${x}, ${y})` }
    )
    const state = await this.getState()
    const cp = state.cursorPosition
    if (!cp || typeof cp.freq !== 'number' || typeof cp.time !== 'number') {
      return null
    }
    return { freq: cp.freq, time: cp.time }
  }

  /**
   * The SVG element's left/top border widths, in CSS pixels. Bridges
   * Playwright's padding-box-relative `position` option and the border-box
   * relative pixels the component records in `cursorPosition`.
   * @returns {Promise<{left: number, top: number}>} Border widths
   */
  async svgBorderOffset() {
    return this.svg.evaluate((el) => {
      const style = window.getComputedStyle(el)
      return {
        left: parseFloat(style.borderLeftWidth) || 0,
        top: parseFloat(style.borderTopWidth) || 0
      }
    })
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
   * Build a CSS selector for mini-pins (the stubs a pin-less set draws under
   * each harmonic), optionally scoped to one set.
   * @param {string} [setId] - Restrict to a single harmonic set's mini-pins
   * @returns {string} Selector string
   */
  miniPinSelector(setId) {
    return setId
      ? `.gram-frame-harmonic-mini-pin[data-harmonic-set-id="${setId}"]`
      : '.gram-frame-harmonic-mini-pin'
  }

  /**
   * Read the geometry of each rendered mini-pin, in document order, optionally
   * for a single set.
   * @param {string} [setId] - Restrict to one harmonic set
   * @returns {Promise<Array<{harmonic: number, x: number, y1: number, y2: number, stroke: string}>>} Mini-pin geometry
   */
  async getMiniPins(setId) {
    return this.page.evaluate((selector) => {
      return Array.from(document.querySelectorAll(selector)).map((pin) => ({
        harmonic: Number(pin.getAttribute('data-harmonic-number')),
        x: Number(pin.getAttribute('x1')),
        y1: Number(pin.getAttribute('y1')),
        y2: Number(pin.getAttribute('y2')),
        stroke: String(pin.getAttribute('stroke'))
      }))
    }, this.miniPinSelector(setId))
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
   * Where each rendered harmonic pin actually sits, as a pixel this page object
   * can hover.
   *
   * Reported in the SVG element's padding-box coordinates, which is what
   * `readDataAtPixel` and `moveMouse` take. The conversion goes through the
   * line's own `getScreenCTM()`, so it is correct under the zoom transform and
   * under any ancestor group transform, rather than assuming SVG user units are
   * CSS pixels.
   *
   * This is the seam that lets a test ask "what frequency is this pin drawn
   * at?" without recomputing the answer with the code under test (R9-25).
   * @param {string} [setId] - Restrict to one harmonic set
   * @returns {Promise<Array<{harmonic: number, x: number}>>} Pin number and hoverable x, in document order
   */
  async getHarmonicPinPixels(setId) {
    return this.page.evaluate((selector) => {
      const svg = document.querySelector('.gram-frame-svg')
      if (!svg) {
        return []
      }
      const rect = svg.getBoundingClientRect()
      const borderLeft = parseFloat(window.getComputedStyle(svg).borderLeftWidth) || 0
      return Array.from(document.querySelectorAll(selector)).map((line) => {
        const point = /** @type {SVGSVGElement} */ (svg).createSVGPoint()
        point.x = Number(line.getAttribute('x1'))
        point.y = Number(line.getAttribute('y1'))
        const ctm = /** @type {SVGGraphicsElement} */ (line).getScreenCTM()
        if (!ctm) {
          throw new Error('getHarmonicPinPixels: a pin line is not rendered')
        }
        const screen = point.matrixTransform(ctm)
        return {
          harmonic: Number(line.getAttribute('data-harmonic-number')),
          x: screen.x - rect.left - borderLeft
        }
      })
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
   * Read how every rendered harmonic number label is painted, optionally scoped
   * to a single set: the resolved paint of the digits, and the white plate
   * drawn behind them (issue #243). Uses computed style (not attributes) so a
   * CSS rule overriding either would be caught, and reports both boxes so a
   * test can check the plate actually covers the characters.
   * @param {string} [setId] - Restrict to one harmonic set
   * @returns {Promise<Array<{fill: string, stroke: string, plate: null|{fill: string, radius: number, box: {left: number, right: number, top: number, bottom: number}}, textBox: {left: number, right: number, top: number, bottom: number}}>>}
   */
  async getHarmonicLabelPaint(setId) {
    const selector = setId
      ? `.gram-frame-harmonic-number[data-harmonic-set-id="${setId}"]`
      : '.gram-frame-harmonic-number'
    return this.page.evaluate((sel) => {
      /**
       * @param {Element} el - Element to box
       * @returns {{left: number, right: number, top: number, bottom: number}} Its viewport box
       */
      const box = (el) => {
        const r = el.getBoundingClientRect()
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }
      }
      return Array.from(document.querySelectorAll(sel)).map((el) => {
        const style = window.getComputedStyle(el)
        const plate = el.parentElement
          ? el.parentElement.querySelector('.gram-frame-label-plate')
          : null
        return {
          fill: style.fill,
          stroke: style.stroke,
          plate: plate
            ? {
              fill: window.getComputedStyle(plate).fill,
              radius: Number(plate.getAttribute('rx')),
              box: box(plate)
            }
            : null,
          textBox: box(el)
        }
      })
    }, selector)
  }

  /**
   * Programmatically add an analysis marker via the test instance API.
   * @param {number} time - Time position in seconds
   * @param {number} freq - Frequency in Hz
   * @returns {Promise<string>} The created marker's id
   */
  async addMarker(time, freq) {
    const id = await this.page.evaluate(([t, f]) => {
      // @ts-ignore - test-only global
      const instances = window.GramFrame.__test__getInstances()
      // Mode-specific placement seams are not on `BaseMode`; the test API is
      // reaching past the abstraction on purpose.
      const instance = /** @type {any} */ (instances[0])
      instance.modes['analysis'].createMarkerAtPosition({ time: t, freq: f })
      const markers = instance.state.analysis.markers
      return markers[markers.length - 1].id
    }, [time, freq])
    // Return only once the new marker is visible in broadcast state, so callers
    // can read it back immediately.
    await this.waitForState(
      (state) => (state.analysis?.markers ?? []).some((/** @type {any} */ m) => m.id === id),
      { message: `marker ${id} to appear in state` }
    )
    return id
  }

  /**
   * Programmatically add a harmonic set via the test instance API.
   * @param {number} anchorTime - Time position in seconds
   * @param {number} spacing - Frequency spacing in Hz
   * @returns {Promise<string>} The created harmonic set's id
   */
  async addHarmonicSet(anchorTime, spacing) {
    const id = await this.page.evaluate(([time, space]) => {
      // @ts-ignore - test-only global
      const instances = window.GramFrame.__test__getInstances()
      const instance = /** @type {any} */ (instances[0])
      const set = instance.modes['harmonics'].addHarmonicSet(time, space)
      return set.id
    }, [anchorTime, spacing])
    // Return only once the new set is visible in broadcast state, so callers can
    // read it back immediately.
    await this.waitForState(
      (state) => (state.harmonics?.harmonicSets ?? []).some((/** @type {any} */ s) => s.id === id),
      { message: `harmonic set ${id} to appear in state` }
    )
    return id
  }

  /**
   * Programmatically add a sideband set via the test instance API.
   * @param {number} anchorTime - Time position in seconds
   * @param {number} fundamentalFreq - Fundamental (member 0) frequency in Hz
   * @param {number} spacing - Frequency spacing between adjacent sidebands in Hz
   * @returns {Promise<string>} The created sideband set's id
   */
  async addSidebandSet(anchorTime, fundamentalFreq, spacing) {
    const id = await this.page.evaluate(([time, fundamental, space]) => {
      // @ts-ignore - test-only global
      const instances = window.GramFrame.__test__getInstances()
      const set = /** @type {any} */ (instances[0]).modes['sideband'].addSidebandSet(time, fundamental, space)
      return set.id
    }, [anchorTime, fundamentalFreq, spacing])
    await this.waitForState(
      (state) => (state.sidebands?.sidebandSets ?? []).some((/** @type {any} */ s) => s.id === id),
      { message: `sideband set ${id} to appear in state` }
    )
    return id
  }

  /**
   * Wait until the sidebands state holds exactly `n` sideband sets.
   * @param {number} n - Expected sideband set count
   * @param {number|{timeout?: number}} [opts={}] - Timeout in ms, or options
   * @returns {Promise<void>}
   */
  async waitForSidebandSetCount(n, opts = {}) {
    await this.waitForState(
      (state) => (state.sidebands?.sidebandSets?.length ?? 0) === n,
      { ...(typeof opts === 'number' ? { timeout: opts } : opts), message: `${n} sideband set(s)` }
    )
  }

  /**
   * Read the `data-sideband-index` of each rendered sideband pin line, in
   * document order, optionally scoped to one set.
   * @param {string} [setId] - Restrict to one sideband set
   * @returns {Promise<number[]>} Sideband indices in order
   */
  async getSidebandIndices(setId) {
    const selector = setId
      ? `.gram-frame-sideband-line[data-sideband-set-id="${setId}"]`
      : '.gram-frame-sideband-line'
    return this.page.evaluate((sel) => {
      const lines = Array.from(document.querySelectorAll(sel))
      return lines.map((line) => Number(line.getAttribute('data-sideband-index')))
    }, selector)
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
    await this.waitForZoomLevel(level)
  }

  /**
   * Click a feature table row and wait for the selection it toggles to settle.
   * Clicking a row selects it, or clears the selection when it was already
   * selected — either way `selection.selectedId` changes, which is the signal
   * this waits on.
   * @param {'markers'|'harmonics'} table - Which table the row belongs to
   * @param {string} id - Feature id held in the row's identity attribute
   * @returns {Promise<void>}
   */
  async clickTableRow(table, id) {
    const attribute = table === 'harmonics' ? 'data-harmonic-id' : 'data-marker-id'
    const before = (await this.getState()).selection?.selectedId ?? null
    await this.page.locator(`tr[${attribute}="${id}"]`).click()
    await this.waitForState(
      (state) => (state.selection?.selectedId ?? null) !== before,
      { message: `selection to change away from ${before}` }
    )
  }

  /**
   * Open the label dialog from a marker row's Label button (feature 231).
   * @param {string} markerId - Marker whose row's button to click
   * @returns {Promise<import('@playwright/test').Locator>} Locator for the dialog's text input
   */
  async openMarkerLabelDialog(markerId) {
    await this.page
      .locator(`tr[data-marker-id="${markerId}"] .gram-frame-marker-label-btn`)
      .click()
    const input = this.page.locator('.gram-frame-marker-label-input')
    await expect(input).toBeVisible()
    return input
  }

  /**
   * Set a marker's label through the dialog, and wait for state to carry it.
   *
   * Passing an empty string clears the label, which is how the dialog removes
   * one. The wait is on broadcast state rather than a delay, so the caller can
   * read the overlay and the table immediately afterwards.
   *
   * @param {string} markerId - Marker to label
   * @param {string} label - New label text ('' to remove the label)
   * @returns {Promise<void>}
   */
  async setMarkerLabel(markerId, label) {
    const input = await this.openMarkerLabelDialog(markerId)
    await input.fill(label)
    await this.page.locator('.gram-frame-modal-save').click()

    const expected = label.trim() === '' ? undefined : label.trim()
    await this.waitForState(
      (state) => state.analysis.markers.find((/** @type {any} */ m) => m.id === markerId)?.label === expected,
      { message: `marker ${markerId} to carry label ${JSON.stringify(expected)}` }
    )
  }

  /**
   * Read a marker's on-gram label element, if it has one — including the white
   * plate drawn behind it (issue #243) and how the two are boxed on screen, so
   * a test can check the plate covers the characters.
   * @param {string} markerId - Marker to inspect
   * @returns {Promise<{text: string, x: number, y: number, textAnchor: string, fill: string, stroke: string, textBox: {left: number, right: number, top: number, bottom: number}, plate: null|{fill: string, radius: number, box: {left: number, right: number, top: number, bottom: number}}}|null>}
   */
  async getMarkerLabelOverlay(markerId) {
    return this.page.evaluate((id) => {
      /**
       * @param {Element} node - Element to box
       * @returns {{left: number, right: number, top: number, bottom: number}} Its viewport box
       */
      const box = (node) => {
        const r = node.getBoundingClientRect()
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }
      }
      const el = document.querySelector(
        `.gram-frame-analysis-marker[data-marker-id="${id}"] .gram-frame-marker-label`
      )
      if (!el) return null
      const plate = el.parentElement
        ? el.parentElement.querySelector('.gram-frame-label-plate')
        : null
      return {
        text: el.textContent || '',
        x: parseFloat(el.getAttribute('x') || '0'),
        y: parseFloat(el.getAttribute('y') || '0'),
        textAnchor: el.getAttribute('text-anchor') || '',
        fill: el.getAttribute('fill') || '',
        stroke: el.getAttribute('stroke') || '',
        textBox: box(el),
        plate: plate
          ? {
            fill: plate.getAttribute('fill') || '',
            radius: Number(plate.getAttribute('rx')),
            box: box(plate)
          }
          : null
      }
    }, markerId)
  }

  /**
   * Read the Label column's text for a marker row.
   * @param {string} markerId - Marker to inspect
   * @returns {Promise<string>} Cell text (empty when the marker has no label)
   */
  async getMarkerLabelCell(markerId) {
    return this.page.evaluate((id) => {
      const cell = document.querySelector(
        `tr[data-marker-id="${id}"] .gram-frame-marker-label-cell`
      )
      return cell ? (cell.textContent || '') : ''
    }, markerId)
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
   * Set the harmonic-pin toggle in the Symbol panel.
   * @param {boolean} checked - Desired checkbox state
   * @returns {Promise<void>}
   */
  async setPinToggle(checked) {
    const toggle = this.page.locator('.gram-frame-pin-toggle-input')
    if (checked) {
      await toggle.check()
    } else {
      await toggle.uncheck()
    }
  }

  /**
   * Read the harmonic-pin toggle's current state.
   * @returns {Promise<{checked: boolean, disabled: boolean}>}
   */
  async getPinToggleState() {
    return this.page.evaluate(() => {
      const el = /** @type {HTMLInputElement|null} */ (
        document.querySelector('.gram-frame-pin-toggle-input')
      )
      if (!el) return { checked: false, disabled: false }
      return { checked: el.checked, disabled: el.disabled }
    })
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