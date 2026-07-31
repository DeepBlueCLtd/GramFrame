import { defineConfig } from 'vitest/config'

/**
 * Unit-test lane (specs/164-quality-ratchets, US3): pure-JS tests that run in
 * Node with no browser, no Vite dev server, and no Playwright. Playwright
 * ignores tests/unit/ (see playwright.config.ts) so every assertion has
 * exactly one home.
 */
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'node',
  },
})
