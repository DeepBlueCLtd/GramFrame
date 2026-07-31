import { defineConfig, devices } from '@playwright/test'

/**
 * GramFrame Playwright configuration
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  // tests/unit belongs to the Vitest lane (yarn test:unit), not Playwright
  testIgnore: 'unit/**',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
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
    {
      // Cross-browser smoke only (spec 164, GF-34): run via
      // `playwright test --project=webkit` in its own CI job.
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: 'smoke.spec.js',
    },
  ],

  webServer: {
    command: 'yarn dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
})
