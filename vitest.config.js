import { defineConfig } from 'vitest/config'

/**
 * Unit-test lane (spec 164, GF-25): pure-JS tests that run in Node with no
 * browser, no Vite dev server, and no Playwright. Only files under
 * tests/unit/ belong to this lane; Playwright owns tests/*.spec.js.
 */
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'node',
  },
})
