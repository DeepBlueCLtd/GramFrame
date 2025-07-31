import { test as base } from '@playwright/test'
import { GramFramePage } from './gram-frame-page'
import { ModeHelpers } from './mode-helpers'
import { CoordinateHelpers, SVGCoordinateHelpers } from './coordinate-helpers'
import { InteractionHelpers, KeyboardHelpers } from './interaction-helpers'
import { VisualHelpers, PerformanceHelpers } from './visual-helpers'

/**
 * Extend the basic test fixtures with our custom fixtures
 */
export const test = base.extend<{
  gramFramePage: GramFramePage
  modeHelpers: ModeHelpers
  coordinateHelpers: CoordinateHelpers
  svgHelpers: SVGCoordinateHelpers
  interactionHelpers: InteractionHelpers
  keyboardHelpers: KeyboardHelpers
  visualHelpers: VisualHelpers
  performanceHelpers: PerformanceHelpers
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
  },

  /**
   * Mode-specific helpers fixture
   */
  modeHelpers: async ({ gramFramePage }, use) => {
    const modeHelpers = new ModeHelpers(gramFramePage)
    await use(modeHelpers)
  },

  /**
   * Coordinate transformation helpers fixture
   */
  coordinateHelpers: async ({ gramFramePage }, use) => {
    const coordinateHelpers = new CoordinateHelpers(gramFramePage)
    await use(coordinateHelpers)
  },

  /**
   * SVG coordinate helpers fixture
   */
  svgHelpers: async ({ gramFramePage }, use) => {
    const svgHelpers = new SVGCoordinateHelpers(gramFramePage)
    await use(svgHelpers)
  },

  /**
   * Advanced interaction helpers fixture
   */
  interactionHelpers: async ({ gramFramePage }, use) => {
    const interactionHelpers = new InteractionHelpers(gramFramePage)
    await use(interactionHelpers)
  },

  /**
   * Keyboard interaction helpers fixture
   */
  keyboardHelpers: async ({ gramFramePage }, use) => {
    const keyboardHelpers = new KeyboardHelpers(gramFramePage)
    await use(keyboardHelpers)
  },

  /**
   * Visual testing helpers fixture
   */
  visualHelpers: async ({ gramFramePage }, use) => {
    const visualHelpers = new VisualHelpers(gramFramePage)
    await use(visualHelpers)
  },

  /**
   * Performance testing helpers fixture
   */
  performanceHelpers: async ({ gramFramePage }, use) => {
    const performanceHelpers = new PerformanceHelpers(gramFramePage)
    await use(performanceHelpers)
  }
})

// Export expect from the base test
export { expect } from '@playwright/test'
