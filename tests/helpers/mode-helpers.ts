import { Page, Locator } from '@playwright/test'
import { GramFramePage } from './gram-frame-page'

/**
 * Mode-specific helper utilities for testing different GramFrame modes
 */

/**
 * Cross Cursor mode specific helpers
 */
export class CrossCursorModeHelpers {
  constructor(private gramFramePage: GramFramePage) {}

  /**
   * Create multiple markers at specified positions
   * @param positions Array of {x, y} positions
   */
  async createMarkers(positions: Array<{ x: number; y: number }>) {
    await this.gramFramePage.clickMode('Analysis')
    
    for (const pos of positions) {
      await this.gramFramePage.clickSpectrogram(pos.x, pos.y)
      await this.gramFramePage.page.waitForTimeout(50)
    }
  }

  /**
   * Verify marker exists at approximately the given position
   * @param expectedTime Expected time value
   * @param expectedFreq Expected frequency value
   * @param tolerance Tolerance for comparison
   */
  async verifyMarkerAtPosition(expectedTime: number, expectedFreq: number, tolerance = { time: 0.1, freq: 10 }) {
    const state = await this.gramFramePage.getState()
    
    const markerExists = state.analysis?.markers?.some(marker => 
      Math.abs(marker.time - expectedTime) <= tolerance.time &&
      Math.abs(marker.freq - expectedFreq) <= tolerance.freq
    )
    
    return markerExists
  }

  /**
   * Get markers table data if it exists
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
   * @param markerId ID of marker to delete
   */
  async deleteMarker(markerId: string) {
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
export class HarmonicsModeHelpers {
  constructor(private gramFramePage: GramFramePage) {}

  /**
   * Create harmonic set with specified start and end positions
   * @param startPos Starting position {x, y}
   * @param endPos Ending position {x, y}
   */
  async createHarmonicSet(startPos: { x: number; y: number }, endPos: { x: number; y: number }) {
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
   * @param harmonicConfigs Array of {start, end} position configs
   */
  async createMultipleHarmonicSets(harmonicConfigs: Array<{
    start: { x: number; y: number };
    end: { x: number; y: number }
  }>) {
    await this.gramFramePage.clickMode('Harmonics')
    
    for (const config of harmonicConfigs) {
      await this.createHarmonicSet(config.start, config.end)
      await this.gramFramePage.page.waitForTimeout(100)
    }
  }

  /**
   * Drag existing harmonic set to modify it
   * @param fromPos Position to start drag from
   * @param toPos Position to drag to
   */
  async dragHarmonicSet(fromPos: { x: number; y: number }, toPos: { x: number; y: number }) {
    await this.gramFramePage.clickMode('Harmonics')
    
    await this.gramFramePage.page.mouse.move(fromPos.x, fromPos.y)
    await this.gramFramePage.page.mouse.down()
    await this.gramFramePage.page.mouse.move(toPos.x, toPos.y)
    await this.gramFramePage.page.mouse.up()
    
    await this.gramFramePage.page.waitForTimeout(200)
  }

  /**
   * Get harmonic panel content if it exists
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
   * @param frequency Frequency to enter manually
   */
  async addManualHarmonic(frequency: number) {
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
   */
  async countHarmonicLines() {
    const harmonicLines = this.gramFramePage.page.locator('.gram-frame-harmonic-line')
    return await harmonicLines.count()
  }

  /**
   * Verify harmonic set has expected properties
   * @param setIndex Index of harmonic set to verify
   * @param expectedProps Expected properties
   */
  async verifyHarmonicSetProperties(setIndex: number, expectedProps: {
    fundamentalFreq?: number;
    rate?: number;
    color?: string;
  }) {
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
export class DopplerModeHelpers {
  constructor(private gramFramePage: GramFramePage) {}

  /**
   * Create Doppler markers with specified positions
   * @param fPlusPos Position for f+ marker
   * @param fMinusPos Position for f- marker
   */
  async createDopplerMarkers(fPlusPos: { x: number; y: number }, fMinusPos: { x: number; y: number }) {
    await this.gramFramePage.clickMode('Doppler')
    
    await this.gramFramePage.page.mouse.move(fPlusPos.x, fPlusPos.y)
    await this.gramFramePage.page.mouse.down()
    await this.gramFramePage.page.mouse.move(fMinusPos.x, fMinusPos.y)
    await this.gramFramePage.page.mouse.up()
    
    await this.gramFramePage.page.waitForTimeout(200)
  }

  /**
   * Drag specific Doppler marker to new position
   * @param markerType Type of marker to drag ('fPlus', 'fMinus', 'fZero')
   * @param fromPos Current position of marker
   * @param toPos New position for marker
   */
  async dragDopplerMarker(
    markerType: 'fPlus' | 'fMinus' | 'fZero',
    fromPos: { x: number; y: number },
    toPos: { x: number; y: number }
  ) {
    await this.gramFramePage.clickMode('Doppler')
    
    await this.gramFramePage.page.mouse.move(fromPos.x, fromPos.y)
    await this.gramFramePage.page.mouse.down()
    await this.gramFramePage.page.mouse.move(toPos.x, toPos.y)
    await this.gramFramePage.page.mouse.up()
    
    await this.gramFramePage.page.waitForTimeout(200)
  }

  /**
   * Get Doppler calculation results if display exists
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
   * @param bearing Bearing value in degrees
   */
  async setBearing(bearing: number) {
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
   */
  async verifyDopplerMarkersExist() {
    const state = await this.gramFramePage.getState()
    
    return {
      fPlusExists: !!state.doppler?.fPlus,
      fMinusExists: !!state.doppler?.fMinus,
      fZeroExists: !!state.doppler?.fZero,
      hasFrequencyDifference: state.doppler?.fPlus && state.doppler?.fMinus 
        ? Math.abs(state.doppler.fPlus.frequency - state.doppler.fMinus.frequency) > 0
        : false
    }
  }

  /**
   * Get frequency difference between f+ and f- markers
   */
  async getFrequencyDifference() {
    const state = await this.gramFramePage.getState()
    
    if (state.doppler?.fPlus && state.doppler?.fMinus) {
      return Math.abs(state.doppler.fPlus.frequency - state.doppler.fMinus.frequency)
    }
    
    return null
  }
}

/**
 * Color picker helpers for all modes
 */
export class ColorPickerHelpers {
  constructor(private gramFramePage: GramFramePage) {}

  /**
   * Select color from color picker if available
   * @param color Color value (e.g., '#ff6b6b')
   */
  async selectColor(color: string) {
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
export class ModeHelpers {
  public analysis: CrossCursorModeHelpers
  public harmonics: HarmonicsModeHelpers
  public doppler: DopplerModeHelpers
  public colorPicker: ColorPickerHelpers

  constructor(gramFramePage: GramFramePage) {
    this.analysis = new CrossCursorModeHelpers(gramFramePage)
    this.harmonics = new HarmonicsModeHelpers(gramFramePage)
    this.doppler = new DopplerModeHelpers(gramFramePage)
    this.colorPicker = new ColorPickerHelpers(gramFramePage)
  }
}