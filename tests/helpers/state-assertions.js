import { expect } from '@playwright/test'

/**
 * Utility functions for asserting GramFrame state properties
 */

/**
 * Verify that the state has valid version and timestamp
 * @param {any} state - The GramFrame state object
 * @returns {void}
 */
function expectValidMetadata(state) {
  expect(state).toHaveProperty('version')
  expect(state.version).toMatch(/^\d+\.\d+\.\d+$/)
  expect(state).toHaveProperty('timestamp')
  // Verify timestamp is a valid ISO string
  expect(() => new Date(state.timestamp)).not.toThrow()
}

/**
 * Verify that the state has valid image details
 * @param {any} state - The GramFrame state object
 * @param {string} [url] - Optional expected image URL
 * @returns {void}
 */
function expectValidImageDetails(state, url) {
  expect(state).toHaveProperty('imageDetails')
  expect(state.imageDetails).toHaveProperty('naturalWidth')
  expect(state.imageDetails).toHaveProperty('naturalHeight')
  expect(state.imageDetails.naturalWidth).toBeGreaterThan(0)
  expect(state.imageDetails.naturalHeight).toBeGreaterThan(0)
  
  if (url) {
    expect(state.imageDetails.url).toBe(url)
  } else {
    expect(state.imageDetails.url).toBeTruthy()
  }
}

/**
 * Verify that the state has valid display dimensions
 * @param {any} state - The GramFrame state object
 * @returns {void}
 */
function expectValidDisplayDimensions(state) {
  expect(state).toHaveProperty('displayDimensions')
  expect(state.displayDimensions).toHaveProperty('width')
  expect(state.displayDimensions).toHaveProperty('height')
  expect(state.displayDimensions.width).toBeGreaterThan(0)
  expect(state.displayDimensions.height).toBeGreaterThan(0)
}

/**
 * Configuration expectation object
 * @typedef {Object} ConfigExpectation
 * @property {number} [timeMin] - Expected minimum time value
 * @property {number} [timeMax] - Expected maximum time value
 * @property {number} [freqMin] - Expected minimum frequency value
 * @property {number} [freqMax] - Expected maximum frequency value
 */

/**
 * Verify that the state has valid configuration values
 * @param {any} state - The GramFrame state object
 * @param {ConfigExpectation} [expected] - Optional expected config values
 * @returns {void}
 */
function expectValidConfig(state, expected) {
  expect(state).toHaveProperty('config')
  expect(state.config).toHaveProperty('timeMin')
  expect(state.config).toHaveProperty('timeMax')
  expect(state.config).toHaveProperty('freqMin')
  expect(state.config).toHaveProperty('freqMax')
  
  // If expected values are provided, check them
  if (expected) {
    if (expected.timeMin !== undefined) {
      expect(state.config.timeMin).toBe(expected.timeMin)
    }
    if (expected.timeMax !== undefined) {
      expect(state.config.timeMax).toBe(expected.timeMax)
    }
    if (expected.freqMin !== undefined) {
      expect(state.config.freqMin).toBe(expected.freqMin)
    }
    if (expected.freqMax !== undefined) {
      expect(state.config.freqMax).toBe(expected.freqMax)
    }
  }
}

/**
 * Verify that cursor position is valid
 * @param {any} state - The GramFrame state object
 * @param {boolean} shouldExist - Whether cursor position should exist
 * @returns {void}
 */
function expectValidCursorPosition(state, shouldExist = true) {
  if (shouldExist) {
    expect(state).toHaveProperty('cursorPosition')
    expect(state.cursorPosition).toHaveProperty('time')
    expect(state.cursorPosition).toHaveProperty('freq')
    
    // Coordinates should be numbers
    expect(typeof state.cursorPosition.time).toBe('number')
    expect(typeof state.cursorPosition.freq).toBe('number')
    
    // SVG coordinates may also be present
    if (state.cursorPosition.svgX !== undefined) {
      expect(typeof state.cursorPosition.svgX).toBe('number')
    }
    if (state.cursorPosition.svgY !== undefined) {
      expect(typeof state.cursorPosition.svgY).toBe('number')
    }
  } else {
    expect(state.cursorPosition).toBeNull()
  }
}

/**
 * Map display mode names to internal mode names
 * @param {string} displayMode - The display mode name (e.g., "Cross Cursor")
 * @returns {string} The internal mode name (e.g., "analysis")
 */
function mapDisplayModeToInternalMode(displayMode) {
  /** @type {Record<string, string>} */
  const mapping = {
    'cross cursor': 'analysis',
    'harmonics': 'harmonics',
    'doppler': 'doppler'
  }
  
  return mapping[displayMode.toLowerCase()] || displayMode.toLowerCase()
}

/**
 * Verify that the state has a valid mode
 * @param {any} state - The GramFrame state object
 * @param {string} [expectedMode] - Optional expected mode (can be display name or internal name)
 * @returns {void}
 */
function expectValidMode(state, expectedMode) {
  expect(state).toHaveProperty('mode')
  
  if (expectedMode) {
    // Map display mode name to internal mode name
    const internalMode = mapDisplayModeToInternalMode(expectedMode)
    expect(state.mode).toBe(internalMode)
  } else {
    expect(['analysis', 'harmonics', 'doppler']).toContain(state.mode)
  }
}

/**
 * Verify that the state has a valid rate
 * @param {any} state - The GramFrame state object
 * @param {number} [expectedRate] - Optional expected rate
 * @returns {void}
 */
function expectValidRate(state, expectedRate) {
  expect(state).toHaveProperty('rate')
  expect(typeof state.rate).toBe('number')
  expect(state.rate).toBeGreaterThan(0)
  
  if (expectedRate !== undefined) {
    expect(state.rate).toBe(expectedRate)
  }
}

export {
  expectValidMetadata,
  expectValidImageDetails,
  expectValidDisplayDimensions,
  expectValidConfig,
  expectValidCursorPosition,
  expectValidMode,
  expectValidRate
}