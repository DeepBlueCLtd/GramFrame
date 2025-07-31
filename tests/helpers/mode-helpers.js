/**
 * Mode-specific helper utilities for testing different GramFrame modes
 */

/**
 * Cross Cursor mode specific helpers
 */
class CrossCursorModeHelpers {
  /**
   * Create a new CrossCursorModeHelpers instance
   * @param {import('./gram-frame-page').GramFramePage} gramFramePage - The GramFrame page instance
   */
  constructor(gramFramePage) {
    this.gramFramePage = gramFramePage
  }

  /**
   * Create multiple markers at specified positions
   * @param {Array<{x: number, y: number}>} positions - Array of {x, y} positions
   * @returns {Promise<void>}
   */
  async createMarkers(positions) {
    await this.gramFramePage.clickMode('Analysis')
    
    for (const pos of positions) {
      await this.gramFramePage.clickSpectrogram(pos.x, pos.y)
      await this.gramFramePage.page.waitForTimeout(50)
    }
  }

  /**
   * Verify marker exists at approximately the given position
   * @param {number} expectedTime - Expected time value
   * @param {number} expectedFreq - Expected frequency value
   * @param {Object} [tolerance] - Tolerance for comparison
   * @param {number} [tolerance.time=0.1] - Time tolerance
   * @param {number} [tolerance.freq=10] - Frequency tolerance
   * @returns {Promise<boolean>} Whether marker exists at position
   */
  async verifyMarkerAtPosition(expectedTime, expectedFreq, tolerance = { time: 0.1, freq: 10 }) {
    const state = await this.gramFramePage.getState()
    
    const markerExists = state.analysis?.markers?.some(marker => 
      Math.abs(marker.time - expectedTime) <= tolerance.time &&
      Math.abs(marker.freq - expectedFreq) <= tolerance.freq
    )
    
    return markerExists
  }

  /**
   * Get markers table data if it exists
   * @returns {Promise<string[][]|null>} Table data as array of arrays, or null if table doesn't exist
   */
  async getMarkersTableData() {
    try {
      const markersTable = this.gramFramePage.page.locator('.gram-frame-markers-table')
      await markersTable.waitFor({ timeout: 1000 })
      
      const rows = await markersTable.locator('tbody tr').all()
      const tableData = []
      
      for (const row of rows) {
        const cells = await row.locator('td').all()
        const rowData = []
        for (const cell of cells) {
          rowData.push(await cell.textContent())
        }
        tableData.push(rowData)
      }
      
      return tableData
    } catch (error) {
      return null // Table doesn't exist
    }
  }

  /**
   * Delete marker by ID if delete functionality exists
   * @param {string} markerId - ID of marker to delete
   * @returns {Promise<boolean>} Whether deletion was successful
   */
  async deleteMarker(markerId) {
    try {
      const deleteButton = this.gramFramePage.page.locator(`[data-marker-id="${markerId}"] .delete-btn`)
      await deleteButton.click()
      return true
    } catch (error) {
      return false // Delete functionality not available
    }
  }

  /**
   * Clear all markers if clear functionality exists
   * @returns {Promise<boolean>} Whether clearing was successful
   */
  async clearAllMarkers() {
    try {
      const clearButton = this.gramFramePage.page.locator('.gram-frame-clear-markers')
      await clearButton.click()
      return true
    } catch (error) {
      return false // Clear functionality not available
    }
  }
}

/**
 * Harmonics mode specific helpers
 */
class HarmonicsModeHelpers {
  /**
   * Create a new HarmonicsModeHelpers instance
   * @param {import('./gram-frame-page').GramFramePage} gramFramePage - The GramFrame page instance
   */
  constructor(gramFramePage) {
    this.gramFramePage = gramFramePage
  }

  /**
   * Create harmonic set with specified start and end positions
   * @param {Object} startPos - Starting position {x, y}
   * @param {number} startPos.x - Start X coordinate
   * @param {number} startPos.y - Start Y coordinate
   * @param {Object} endPos - Ending position {x, y}
   * @param {number} endPos.x - End X coordinate
   * @param {number} endPos.y - End Y coordinate
   * @returns {Promise<void>}
   */
  async createHarmonicSet(startPos, endPos) {
    await this.gramFramePage.clickMode('Harmonics')
    
    await this.gramFramePage.page.mouse.move(startPos.x, startPos.y)
    await this.gramFramePage.page.mouse.down()
    await this.gramFramePage.page.mouse.move(endPos.x, endPos.y)
    await this.gramFramePage.page.mouse.up()
    
    // Wait for harmonic calculation to complete
    await this.gramFramePage.page.waitForTimeout(200)
  }

  /**
   * Create multiple harmonic sets
   * @param {Array<{start: {x: number, y: number}, end: {x: number, y: number}}>} harmonicConfigs - Array of {start, end} position configs
   * @returns {Promise<void>}
   */
  async createMultipleHarmonicSets(harmonicConfigs) {
    await this.gramFramePage.clickMode('Harmonics')
    
    for (const config of harmonicConfigs) {
      await this.createHarmonicSet(config.start, config.end)
      await this.gramFramePage.page.waitForTimeout(100)
    }
  }

  /**
   * Drag existing harmonic set to modify it
   * @param {Object} fromPos - Position to start drag from
   * @param {number} fromPos.x - From X coordinate
   * @param {number} fromPos.y - From Y coordinate
   * @param {Object} toPos - Position to drag to
   * @param {number} toPos.x - To X coordinate
   * @param {number} toPos.y - To Y coordinate
   * @returns {Promise<void>}
   */
  async dragHarmonicSet(fromPos, toPos) {
    await this.gramFramePage.clickMode('Harmonics')
    
    await this.gramFramePage.page.mouse.move(fromPos.x, fromPos.y)
    await this.gramFramePage.page.mouse.down()
    await this.gramFramePage.page.mouse.move(toPos.x, toPos.y)
    await this.gramFramePage.page.mouse.up()
    
    await this.gramFramePage.page.waitForTimeout(200)
  }

  /**
   * Get harmonic panel content if it exists
   * @returns {Promise<string|null>} Panel content or null if panel doesn't exist
   */
  async getHarmonicPanelContent() {
    try {
      const harmonicPanel = this.gramFramePage.page.locator('.gram-frame-harmonic-panel')
      await harmonicPanel.waitFor({ timeout: 1000 })
      return await harmonicPanel.textContent()
    } catch (error) {
      return null // Panel doesn't exist
    }
  }

  /**
   * Open manual harmonic modal if available
   * @param {number} frequency - Frequency to enter manually
   * @returns {Promise<boolean>} Whether manual harmonic was added successfully
   */
  async addManualHarmonic(frequency) {
    try {
      const manualButton = this.gramFramePage.page.locator('.gram-frame-manual-harmonic-btn')
      await manualButton.click()
      
      const modal = this.gramFramePage.page.locator('.gram-frame-manual-harmonic-modal')
      await modal.waitFor()
      
      const frequencyInput = modal.locator('input[type="number"]')
      await frequencyInput.fill(frequency.toString())
      
      const submitButton = modal.locator('button[type="submit"]')
      await submitButton.click()
      
      return true
    } catch (error) {
      return false // Manual harmonic functionality not available
    }
  }

  /**
   * Count visible harmonic lines in SVG
   * @returns {Promise<number>} Number of harmonic lines
   */
  async countHarmonicLines() {
    const harmonicLines = this.gramFramePage.page.locator('.gram-frame-harmonic-line')
    return await harmonicLines.count()
  }

  /**
   * Verify harmonic set has expected properties
   * @param {number} setIndex - Index of harmonic set to verify
   * @param {Object} expectedProps - Expected properties
   * @param {number} [expectedProps.fundamentalFreq] - Expected fundamental frequency
   * @param {number} [expectedProps.rate] - Expected rate
   * @param {string} [expectedProps.color] - Expected color
   * @returns {Promise<boolean>} Whether properties match
   */
  async verifyHarmonicSetProperties(setIndex, expectedProps) {
    const state = await this.gramFramePage.getState()
    
    if (!state.harmonics?.harmonicSets || setIndex >= state.harmonics.harmonicSets.length) {
      return false
    }
    
    const harmonicSet = state.harmonics.harmonicSets[setIndex]
    
    if (expectedProps.fundamentalFreq !== undefined) {
      if (Math.abs(harmonicSet.fundamentalFreq - expectedProps.fundamentalFreq) > 10) {
        return false
      }
    }
    
    if (expectedProps.rate !== undefined) {
      if (Math.abs(harmonicSet.rate - expectedProps.rate) > 5) {
        return false
      }
    }
    
    if (expectedProps.color !== undefined) {
      if (harmonicSet.color !== expectedProps.color) {
        return false
      }
    }
    
    return true
  }
}

/**
 * Doppler mode specific helpers
 */
class DopplerModeHelpers {
  /**
   * Create a new DopplerModeHelpers instance
   * @param {import('./gram-frame-page').GramFramePage} gramFramePage - The GramFrame page instance
   */
  constructor(gramFramePage) {
    this.gramFramePage = gramFramePage
  }

  /**
   * Create Doppler markers with specified positions
   * @param {Object} fPlusPos - Position for f+ marker
   * @param {number} fPlusPos.x - f+ X coordinate
   * @param {number} fPlusPos.y - f+ Y coordinate
   * @param {Object} fMinusPos - Position for f- marker
   * @param {number} fMinusPos.x - f- X coordinate
   * @param {number} fMinusPos.y - f- Y coordinate
   * @returns {Promise<void>}
   */
  async createDopplerMarkers(fPlusPos, fMinusPos) {
    await this.gramFramePage.clickMode('Doppler')
    
    await this.gramFramePage.page.mouse.move(fPlusPos.x, fPlusPos.y)
    await this.gramFramePage.page.mouse.down()
    await this.gramFramePage.page.mouse.move(fMinusPos.x, fMinusPos.y)
    await this.gramFramePage.page.mouse.up()
    
    await this.gramFramePage.page.waitForTimeout(200)
  }

  /**
   * Drag specific Doppler marker to new position
   * @param {'fPlus'|'fMinus'|'fZero'} markerType - Type of marker to drag
   * @param {Object} fromPos - Current position of marker
   * @param {number} fromPos.x - From X coordinate
   * @param {number} fromPos.y - From Y coordinate
   * @param {Object} toPos - New position for marker
   * @param {number} toPos.x - To X coordinate
   * @param {number} toPos.y - To Y coordinate
   * @returns {Promise<void>}
   */
  async dragDopplerMarker(markerType, fromPos, toPos) {
    await this.gramFramePage.clickMode('Doppler')
    
    await this.gramFramePage.page.mouse.move(fromPos.x, fromPos.y)
    await this.gramFramePage.page.mouse.down()
    await this.gramFramePage.page.mouse.move(toPos.x, toPos.y)
    await this.gramFramePage.page.mouse.up()
    
    await this.gramFramePage.page.waitForTimeout(200)
  }

  /**
   * Get Doppler calculation results if display exists
   * @returns {Promise<{speedText: string|null, hasResults: boolean}>}
   */
  async getDopplerResults() {
    try {
      const resultsDisplay = this.gramFramePage.page.locator('.gram-frame-doppler-results')
      await resultsDisplay.waitFor({ timeout: 1000 })
      
      const content = await resultsDisplay.textContent()
      return {
        speedText: content,
        hasResults: true
      }
    } catch (error) {
      return {
        speedText: null,
        hasResults: false
      }
    }
  }

  /**
   * Set bearing value if bearing input exists
   * @param {number} bearing - Bearing value in degrees
   * @returns {Promise<boolean>} Whether bearing was set successfully
   */
  async setBearing(bearing) {
    try {
      const bearingInput = this.gramFramePage.page.locator('input[placeholder*="bearing"]')
      await bearingInput.fill(bearing.toString())
      await bearingInput.blur()
      return true
    } catch (error) {
      return false // Bearing input not available
    }
  }

  /**
   * Clear Doppler markers if clear functionality exists
   * @returns {Promise<boolean>} Whether clearing was successful
   */
  async clearDopplerMarkers() {
    try {
      // Try right-click reset
      await this.gramFramePage.page.mouse.click(300, 200, { button: 'right' })
      await this.gramFramePage.page.waitForTimeout(200)
      return true
    } catch (error) {
      try {
        // Try clear button
        const clearButton = this.gramFramePage.page.locator('.gram-frame-doppler-clear')
        await clearButton.click()
        return true
      } catch (error2) {
        return false // No clear functionality available
      }
    }
  }

  /**
   * Verify Doppler markers exist and have valid properties
   * @returns {Promise<{fPlusExists: boolean, fMinusExists: boolean, fZeroExists: boolean, hasFrequencyDifference: boolean}>}
   */
  async verifyDopplerMarkersExist() {
    const state = await this.gramFramePage.getState()
    
    return {
      fPlusExists: !!state.doppler?.fPlus,
      fMinusExists: !!state.doppler?.fMinus,
      fZeroExists: !!state.doppler?.fZero,
      hasFrequencyDifference: state.doppler?.fPlus && state.doppler?.fMinus 
        ? Math.abs(state.doppler.fPlus.freq - state.doppler.fMinus.freq) > 0
        : false
    }
  }

  /**
   * Get frequency difference between f+ and f- markers
   * @returns {Promise<number|null>} Frequency difference or null if markers don't exist
   */
  async getFrequencyDifference() {
    const state = await this.gramFramePage.getState()
    
    if (state.doppler?.fPlus && state.doppler?.fMinus) {
      return Math.abs(state.doppler.fPlus.freq - state.doppler.fMinus.freq)
    }
    
    return null
  }
}

/**
 * Color picker helpers for all modes
 */
class ColorPickerHelpers {
  /**
   * Create a new ColorPickerHelpers instance
   * @param {import('./gram-frame-page').GramFramePage} gramFramePage - The GramFrame page instance
   */
  constructor(gramFramePage) {
    this.gramFramePage = gramFramePage
  }

  /**
   * Select color from color picker if available
   * @param {string} color - Color value (e.g., '#ff6b6b')
   * @returns {Promise<boolean>} Whether color selection was successful
   */
  async selectColor(color) {
    try {
      const colorPicker = this.gramFramePage.page.locator('.gram-frame-color-picker')
      await colorPicker.click()
      
      const colorOption = this.gramFramePage.page.locator(`[data-color="${color}"]`)
      await colorOption.click()
      
      return true
    } catch (error) {
      return false // Color picker not available
    }
  }

  /**
   * Get currently selected color if available
   * @returns {Promise<string|null>} Current color or null if not available
   */
  async getCurrentColor() {
    try {
      const state = await this.gramFramePage.getState()
      return state.harmonics?.selectedColor || null
    } catch (error) {
      return null
    }
  }
}

/**
 * Combined mode helpers class
 */
class ModeHelpers {
  /**
   * Create a new ModeHelpers instance
   * @param {import('./gram-frame-page').GramFramePage} gramFramePage - The GramFrame page instance
   */
  constructor(gramFramePage) {
    /** @type {CrossCursorModeHelpers} */
    this.analysis = new CrossCursorModeHelpers(gramFramePage)
    /** @type {HarmonicsModeHelpers} */
    this.harmonics = new HarmonicsModeHelpers(gramFramePage)
    /** @type {DopplerModeHelpers} */
    this.doppler = new DopplerModeHelpers(gramFramePage)
    /** @type {ColorPickerHelpers} */
    this.colorPicker = new ColorPickerHelpers(gramFramePage)
  }
}

export {
  CrossCursorModeHelpers,
  HarmonicsModeHelpers,
  DopplerModeHelpers,
  ColorPickerHelpers,
  ModeHelpers
}