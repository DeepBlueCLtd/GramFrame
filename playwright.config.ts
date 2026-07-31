import { defineConfig, devices } from '@playwright/test'

/**
 * GramFrame Playwright configuration
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  // tests/unit/ belongs to the Vitest lane (`yarn test:unit`) and tests/smoke/
  // to the WebKit smoke lane (playwright.smoke.config.ts); Playwright's
  // default testMatch would otherwise pick those files up too.
  testIgnore: ['**/unit/**', '**/smoke/**'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // No retries anywhere, CI included. A retry turns a race into a pass and
  // hides it; with the suite on state-based waits (spec 166, US1) a failure is
  // a real failure and should be reported as one.
  retries: 0,
  workers: process.env.CI ? 1 : 2, // Limit to 2 workers to reduce resource contention
  reporter: 'list',
  // Don't open the HTML report after the test run
  quiet: true,
  timeout: 10000, // Increased timeout for complex DOM operations
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'yarn dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
})
