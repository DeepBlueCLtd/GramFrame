/**
 * Extend the basic test fixtures with our custom fixtures
 */

import { test as base } from '@playwright/test'
import { GramFramePage } from './gram-frame-page.js'

/**
 * Extended test fixtures with custom GramFrame helpers
 * @typedef {Object} GramFrameTestFixtures
 * @property {import('./gram-frame-page').GramFramePage} gramFramePage - GramFrame page fixture
 */

/**
 * Test instance extended with GramFrame fixtures
 */
const test = base.extend({
  /**
   * GramFrame page fixture
   * Provides a pre-configured GramFramePage instance
   * @param {TestContext} context - Test context
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
  }
})

// Export expect from the base test
export { expect } from '@playwright/test'
export { test }
