/**
 * Common test utilities to reduce duplication across test files
 */

import { expect } from '@playwright/test'

/**
 * Standard setup for GramFrame tests
 * Consolidates the common initialization pattern used across all test files
 * @param {import('./gram-frame-page').GramFramePage} gramFramePage - The GramFrame page instance
 * @returns {Promise<void>}
 */
async function standardSetup(gramFramePage) {
  await gramFramePage.goto()
  await gramFramePage.waitForImageLoad()
}

/**
 * Verify LED display shows expected pattern
 * Consolidates LED validation logic used across multiple test files
 * @param {import('@playwright/test').Locator} led - The LED locator element
 * @param {RegExp} pattern - Expected pattern to match
 * @param {string} [description] - Optional description for the assertion
 * @returns {Promise<void>}
 */
async function verifyLEDPattern(led, pattern, description) {
  const text = await led.locator('.gram-frame-led-value').textContent()
  if (description) {
    expect(text, description).toMatch(pattern)
  } else {
    expect(text).toMatch(pattern)
  }
}

/**
 * Verify standard LED displays (frequency and time) show expected formats
 * Consolidates the most common LED validation pattern
 * @param {import('./gram-frame-page').GramFramePage} gramFramePage - The GramFrame page instance
 * @returns {Promise<void>}
 */
async function verifyStandardLEDs(gramFramePage) {
  await verifyLEDPattern(gramFramePage.freqLED, /\d+\.\d+$/, 'Frequency LED should show decimal format')
  await verifyLEDPattern(gramFramePage.timeLED, /\d{2}:\d{2}$/, 'Time LED should show mm:ss format')
}

/**
 * Verify crosshair elements are present and visible
 * Consolidates crosshair validation used across cursor and analysis tests
 * @param {import('@playwright/test').Page} page - The Playwright page instance
 * @returns {Promise<void>}
 */
async function verifyCrosshairs(page) {
  await expect(page.locator('.gram-frame-cursor-vertical')).toHaveCount(1)
  await expect(page.locator('.gram-frame-cursor-horizontal')).toHaveCount(1)
  await expect(page.locator('.gram-frame-cursor-point')).toHaveCount(1)
}

/**
 * Verify state has valid cursor position
 * Consolidates cursor state validation used across multiple tests
 * @param {import('../../src/types.js').GramFrameState} state - The GramFrame state object
 * @returns {void}
 */
function expectValidCursor(state) {
  expect(state.cursorPosition).not.toBeNull()
  expect(state.cursorPosition.freq).toBeGreaterThan(0)
  expect(state.cursorPosition.time).toBeGreaterThan(0)
  expect(typeof state.cursorPosition.x).toBe('number')
  expect(typeof state.cursorPosition.y).toBe('number')
}

/**
 * Verify mode button states
 * Consolidates mode switching validation used across mode tests
 * @param {import('@playwright/test').Page} page - The Playwright page instance
 * @param {string} activeMode - The mode that should be active
 * @returns {Promise<void>}
 */
async function verifyModeButtons(page, activeMode) {
  const modes = ['Cross Cursor', 'Harmonics', 'Doppler']
  
  for (const mode of modes) {
    const button = page.locator(`.gram-frame-mode-btn:text("${mode}")`)
    if (mode === activeMode) {
      await expect(button).toHaveClass(/active/)
    } else {
      await expect(button).not.toHaveClass(/active/)
    }
  }
}

/**
 * Common position constants used across tests
 * Consolidates repeated position calculations
 * @readonly
 * @enum {number}
 */
const TEST_POSITIONS = {
  CENTER_FACTOR: 0.5,
  QUARTER_FACTOR: 0.25,
  THREE_QUARTER_FACTOR: 0.75,
  TEST_X: 100,
  TEST_Y: 100,
  DRAG_END_X: 200,
  DRAG_END_Y: 200
}

/**
 * Calculate test positions based on SVG bounds
 * Consolidates position calculation logic used across tests
 * @param {TestSVGBounds} svgBounds - The SVG bounding box
 * @param {number} svgBounds.width - Width of the SVG element
 * @param {number} svgBounds.height - Height of the SVG element
 * @returns {TestPositions} Calculated test positions
 * @returns {number} returns.centerX - Center X position
 * @returns {number} returns.centerY - Center Y position
 * @returns {number} returns.quarterX - Quarter X position
 * @returns {number} returns.quarterY - Quarter Y position
 * @returns {number} returns.threeQuarterX - Three-quarter X position
 * @returns {number} returns.threeQuarterY - Three-quarter Y position
 */
function calculateTestPositions(svgBounds) {
  return {
    centerX: svgBounds.width * TEST_POSITIONS.CENTER_FACTOR,
    centerY: svgBounds.height * TEST_POSITIONS.CENTER_FACTOR,
    quarterX: svgBounds.width * TEST_POSITIONS.QUARTER_FACTOR,
    quarterY: svgBounds.height * TEST_POSITIONS.QUARTER_FACTOR,
    threeQuarterX: svgBounds.width * TEST_POSITIONS.THREE_QUARTER_FACTOR,
    threeQuarterY: svgBounds.height * TEST_POSITIONS.THREE_QUARTER_FACTOR
  }
}

/**
 * Setup state listener for testing
 * Consolidates state listener setup pattern used across multiple tests
 * @param {import('@playwright/test').Page} page - The Playwright page instance
 * @param {string} callback - The callback function as a string
 * @returns {Promise<void>}
 */
async function setupStateListener(page, callback) {
  await page.evaluate(`
    window.testStateUpdates = []
    window.GramFrame.addStateListener(${callback})
  `)
}

/**
 * Get state updates from test listener
 * Consolidates state update retrieval used in state listener tests
 * @param {import('@playwright/test').Page} page - The Playwright page instance
 * @returns {Promise<import('../../src/types.js').GramFrameState[]>} Array of state updates
 */
async function getStateUpdates(page) {
  return await page.evaluate(() => window.testStateUpdates || [])
}

/**
 * Common regex patterns used across tests
 * @readonly
 * @enum {RegExp}
 */
const TEST_PATTERNS = {
  FREQUENCY: /\d+\.\d+$/,
  TIME_MM_SS: /\d{2}:\d{2}$/,
  DECIMAL_NUMBER: /\d+\.\d+/,
  INTEGER: /\d+/
}

export {
  standardSetup,
  verifyLEDPattern,
  verifyStandardLEDs,
  verifyCrosshairs,
  expectValidCursor,
  verifyModeButtons,
  TEST_POSITIONS,
  calculateTestPositions,
  setupStateListener,
  getStateUpdates,
  TEST_PATTERNS
}