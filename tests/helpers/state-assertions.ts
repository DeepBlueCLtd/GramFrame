import { expect } from '@playwright/test'

/**
 * Utility functions for asserting GramFrame state properties
 */

/**
 * Verify that the state has valid version and timestamp
 * @param state The GramFrame state object
 */
export function expectValidMetadata(state: any) {
  expect(state).toHaveProperty('version')
  expect(state.version).toMatch(/^\d+\.\d+\.\d+$/)
  expect(state).toHaveProperty('timestamp')
  // Verify timestamp is a valid ISO string
  expect(() => new Date(state.timestamp)).not.toThrow()
}

/**
 * Verify that the state has valid image details
 * @param state The GramFrame state object
 * @param url Optional expected image URL
 */
export function expectValidImageDetails(state: any, url?: string) {
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
 * @param state The GramFrame state object
 */
export function expectValidDisplayDimensions(state: any) {
  expect(state).toHaveProperty('displayDimensions')
  expect(state.displayDimensions).toHaveProperty('width')
  expect(state.displayDimensions).toHaveProperty('height')
  expect(state.displayDimensions.width).toBeGreaterThan(0)
  expect(state.displayDimensions.height).toBeGreaterThan(0)
}

/**
 * Verify that the state has valid configuration values
 * @param state The GramFrame state object
 * @param expected Optional expected config values
 */
export function expectValidConfig(state: any, expected?: {
  timeMin?: number
  timeMax?: number
  freqMin?: number
  freqMax?: number
}) {
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
 * @param state The GramFrame state object
 * @param shouldExist Whether cursor position should exist
 */
export function expectValidCursorPosition(state: any, shouldExist = true) {
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
 * Verify that the state has a valid mode
 * @param state The GramFrame state object
 * @param expectedMode Optional expected mode
 */
export function expectValidMode(state: any, expectedMode?: string) {
  expect(state).toHaveProperty('mode')
  
  if (expectedMode) {
    expect(state.mode).toBe(expectedMode)
  } else {
    expect(['analysis', 'harmonics', 'doppler']).toContain(state.mode)
  }
}

/**
 * Verify that the state has a valid rate
 * @param state The GramFrame state object
 * @param expectedRate Optional expected rate
 */
export function expectValidRate(state: any, expectedRate?: number) {
  expect(state).toHaveProperty('rate')
  expect(typeof state.rate).toBe('number')
  expect(state.rate).toBeGreaterThan(0)
  
  if (expectedRate !== undefined) {
    expect(state.rate).toBe(expectedRate)
  }
}
