/**
 * Common test utilities to reduce duplication across test files
 */

import { expect, type Locator, type Page } from '@playwright/test'
import type { GramFramePage } from './gram-frame-page'

/**
 * Standard setup for GramFrame tests
 * Consolidates the common initialization pattern used across all test files
 */
export async function standardSetup(gramFramePage: GramFramePage): Promise<void> {
  await gramFramePage.goto()
  await gramFramePage.waitForImageLoad()
}

/**
 * Verify LED display shows expected pattern
 * Consolidates LED validation logic used across multiple test files
 */
export async function verifyLEDPattern(led: Locator, pattern: RegExp, description?: string): Promise<void> {
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
 */
export async function verifyStandardLEDs(gramFramePage: GramFramePage): Promise<void> {
  await verifyLEDPattern(gramFramePage.freqLED, /\d+\.\d+$/, 'Frequency LED should show decimal format')
  await verifyLEDPattern(gramFramePage.timeLED, /\d{2}:\d{2}$/, 'Time LED should show mm:ss format')
}

/**
 * Verify crosshair elements are present and visible
 * Consolidates crosshair validation used across cursor and analysis tests
 */
export async function verifyCrosshairs(page: Page): Promise<void> {
  await expect(page.locator('.gram-frame-cursor-vertical')).toHaveCount(1)
  await expect(page.locator('.gram-frame-cursor-horizontal')).toHaveCount(1)
  await expect(page.locator('.gram-frame-cursor-point')).toHaveCount(1)
}

/**
 * Verify state has valid cursor position
 * Consolidates cursor state validation used across multiple tests
 */
export function expectValidCursor(state: any): void {
  expect(state.cursorPosition).not.toBeNull()
  expect(state.cursorPosition.freq).toBeGreaterThan(0)
  expect(state.cursorPosition.time).toBeGreaterThan(0)
  expect(typeof state.cursorPosition.x).toBe('number')
  expect(typeof state.cursorPosition.y).toBe('number')
}

/**
 * Verify mode button states
 * Consolidates mode switching validation used across mode tests
 */
export async function verifyModeButtons(page: Page, activeMode: string): Promise<void> {
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
 */
export const TEST_POSITIONS = {
  CENTER_FACTOR: 0.5,
  QUARTER_FACTOR: 0.25,
  THREE_QUARTER_FACTOR: 0.75,
  TEST_X: 100,
  TEST_Y: 100,
  DRAG_END_X: 200,
  DRAG_END_Y: 200
} as const

/**
 * Calculate test positions based on SVG bounds
 * Consolidates position calculation logic used across tests
 */
export function calculateTestPositions(svgBounds: { width: number; height: number }) {
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
 */
export async function setupStateListener(page: Page, callback: string): Promise<void> {
  await page.evaluate(`
    window.testStateUpdates = []
    window.GramFrame.addStateListener(${callback})
  `)
}

/**
 * Get state updates from test listener
 * Consolidates state update retrieval used in state listener tests
 */
export async function getStateUpdates(page: Page): Promise<any[]> {
  return await page.evaluate(() => window.testStateUpdates || [])
}

/**
 * Common regex patterns used across tests
 */
export const TEST_PATTERNS = {
  FREQUENCY: /\d+\.\d+$/,
  TIME_MM_SS: /\d{2}:\d{2}$/,
  DECIMAL_NUMBER: /\d+\.\d+/,
  INTEGER: /\d+/
} as const