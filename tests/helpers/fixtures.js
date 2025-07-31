/**
 * Extend the basic test fixtures with our custom fixtures
 */

import { test as base } from '@playwright/test'
import { GramFramePage } from './gram-frame-page.js'
import { ModeHelpers } from './mode-helpers.js'
import { CoordinateHelpers, SVGCoordinateHelpers } from './coordinate-helpers.js'
import { InteractionHelpers, KeyboardHelpers } from './interaction-helpers.js'
import { VisualHelpers, PerformanceHelpers } from './visual-helpers.js'

/**
 * Extended test fixtures with custom GramFrame helpers
 * @typedef {Object} GramFrameTestFixtures
 * @property {import('./gram-frame-page').GramFramePage} gramFramePage - GramFrame page fixture
 * @property {import('./mode-helpers').ModeHelpers} modeHelpers - Mode-specific helpers fixture
 * @property {import('./coordinate-helpers').CoordinateHelpers} coordinateHelpers - Coordinate transformation helpers fixture
 * @property {import('./coordinate-helpers').SVGCoordinateHelpers} svgHelpers - SVG coordinate helpers fixture
 * @property {import('./interaction-helpers').InteractionHelpers} interactionHelpers - Advanced interaction helpers fixture
 * @property {import('./interaction-helpers').KeyboardHelpers} keyboardHelpers - Keyboard interaction helpers fixture
 * @property {import('./visual-helpers').VisualHelpers} visualHelpers - Visual testing helpers fixture
 * @property {import('./visual-helpers').PerformanceHelpers} performanceHelpers - Performance testing helpers fixture
 */

/**
 * Test instance extended with GramFrame fixtures
 */
const test = base.extend({
  /**
   * GramFrame page fixture
   * Provides a pre-configured GramFramePage instance
   * @param {Object} context - Test context
   * @param {import('@playwright/test').Page} context.page - Playwright page instance
   * @param {Function} use - Fixture use function
   * @returns {Promise<void>}
   */
  gramFramePage: async ({ page }, use) => {
    // Create a new GramFramePage instance
    const gramFramePage = new GramFramePage(page)
    
    // Navigate to the debug page and wait for component to load
    await gramFramePage.goto()
    
    // Use the fixture
    await use(gramFramePage)
  },

  /**
   * Mode-specific helpers fixture
   * @param {Object} context - Test context
   * @param {import('./gram-frame-page').GramFramePage} context.gramFramePage - GramFrame page instance
   * @param {Function} use - Fixture use function
   * @returns {Promise<void>}
   */
  modeHelpers: async ({ gramFramePage }, use) => {
    const modeHelpers = new ModeHelpers(gramFramePage)
    await use(modeHelpers)
  },

  /**
   * Coordinate transformation helpers fixture
   * @param {Object} context - Test context
   * @param {import('./gram-frame-page').GramFramePage} context.gramFramePage - GramFrame page instance
   * @param {Function} use - Fixture use function
   * @returns {Promise<void>}
   */
  coordinateHelpers: async ({ gramFramePage }, use) => {
    const coordinateHelpers = new CoordinateHelpers(gramFramePage)
    await use(coordinateHelpers)
  },

  /**
   * SVG coordinate helpers fixture
   * @param {Object} context - Test context
   * @param {import('./gram-frame-page').GramFramePage} context.gramFramePage - GramFrame page instance
   * @param {Function} use - Fixture use function
   * @returns {Promise<void>}
   */
  svgHelpers: async ({ gramFramePage }, use) => {
    const svgHelpers = new SVGCoordinateHelpers(gramFramePage)
    await use(svgHelpers)
  },

  /**
   * Advanced interaction helpers fixture
   * @param {Object} context - Test context
   * @param {import('./gram-frame-page').GramFramePage} context.gramFramePage - GramFrame page instance
   * @param {Function} use - Fixture use function
   * @returns {Promise<void>}
   */
  interactionHelpers: async ({ gramFramePage }, use) => {
    const interactionHelpers = new InteractionHelpers(gramFramePage)
    await use(interactionHelpers)
  },

  /**
   * Keyboard interaction helpers fixture
   * @param {Object} context - Test context
   * @param {import('./gram-frame-page').GramFramePage} context.gramFramePage - GramFrame page instance
   * @param {Function} use - Fixture use function
   * @returns {Promise<void>}
   */
  keyboardHelpers: async ({ gramFramePage }, use) => {
    const keyboardHelpers = new KeyboardHelpers(gramFramePage)
    await use(keyboardHelpers)
  },

  /**
   * Visual testing helpers fixture
   * @param {Object} context - Test context
   * @param {import('./gram-frame-page').GramFramePage} context.gramFramePage - GramFrame page instance
   * @param {Function} use - Fixture use function
   * @returns {Promise<void>}
   */
  visualHelpers: async ({ gramFramePage }, use) => {
    const visualHelpers = new VisualHelpers(gramFramePage)
    await use(visualHelpers)
  },

  /**
   * Performance testing helpers fixture
   * @param {Object} context - Test context
   * @param {import('./gram-frame-page').GramFramePage} context.gramFramePage - GramFrame page instance
   * @param {Function} use - Fixture use function
   * @returns {Promise<void>}
   */
  performanceHelpers: async ({ gramFramePage }, use) => {
    const performanceHelpers = new PerformanceHelpers(gramFramePage)
    await use(performanceHelpers)
  }
})

// Export expect from the base test
export { expect } from '@playwright/test'
export { test }