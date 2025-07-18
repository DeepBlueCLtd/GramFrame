import { test as base } from '@playwright/test'
import { GramFramePage } from './gram-frame-page'

/**
 * Extend the basic test fixtures with our custom fixtures
 */
export const test = base.extend<{
  gramFramePage: GramFramePage
}>({
  /**
   * GramFrame page fixture
   * Provides a pre-configured GramFramePage instance
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
