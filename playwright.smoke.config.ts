import { defineConfig, devices } from '@playwright/test'

/**
 * WebKit smoke lane (specs/164-quality-ratchets, US4): a minimal cross-engine
 * check that the component initializes on a sample page. The full suite stays
 * Chromium-only (playwright.config.ts); this config runs just tests/smoke/.
 */
export default defineConfig({
  testDir: './tests/smoke',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  quiet: true,
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'yarn dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
})
