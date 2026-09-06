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
    coverage: {
      provider: 'v8',
      // Scoped to the modules this lane can actually reach (R9-11, issue #266).
      // Measuring all of src/ would report a number dominated by DOM and SVG
      // code the unit lane never loads — a figure that moves for reasons
      // nothing here controls, which is worse than no figure.
      //
      // A module belongs in this list once a unit test imports it. Adding one
      // raises the uncovered-line count `yarn hygiene` ratchets, which is the
      // point: the debt becomes visible the moment it is taken on.
      include: [
        'src/audio/**/*.js',
        'src/utils/**/*.js',
        'src/rendering/symbols.js',
        'src/core/state.js',
        'src/core/storage.js',
        'src/core/browserCompatibility.js',
        'src/modes/ModeFactory.js',
        'src/modes/modeRoster.js',
        'src/modes/shared/BaseDragHandler.js'
      ],
      // `json-summary` is what the ratchet reads; `text` is for a human running
      // it locally. No thresholds here — the gate lives in scripts/hygiene.js
      // alongside every other ratchet, rather than in a second place.
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'coverage',
      all: true
    }
  },
})
