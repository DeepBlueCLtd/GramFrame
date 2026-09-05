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
 * Test instance extended with GramFrame fixtures.
 *
 * The cast is what makes `{ gramFramePage }` a typed destructure in every spec
 * rather than an error on a Playwright args type that knows nothing about our
 * fixture (R9-10). `base.extend` cannot infer it from a JSDoc-annotated object.
 * @type {import('@playwright/test').TestType<
 *   import('@playwright/test').PlaywrightTestArgs &
 *     import('@playwright/test').PlaywrightTestOptions &
 *     GramFrameTestFixtures,
 *   import('@playwright/test').PlaywrightWorkerArgs &
 *     import('@playwright/test').PlaywrightWorkerOptions
 * >}
 */
const test = base.extend({
  /**
   * GramFrame page fixture
   * Provides a pre-configured GramFramePage instance
   * @param {object} context - Playwright's fixture context
   * @param {import('@playwright/test').Page} context.page - Playwright page instance
   * @param {(value: GramFramePage) => Promise<void>} use - Fixture use function
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
