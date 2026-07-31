import js from '@eslint/js'

/**
 * ESLint flat config (spec 164, GF-31).
 *
 * Starting posture: eslint:recommended with rules the existing codebase
 * violates downgraded to warnings, so the lane lands green on day one.
 * Promote warnings to errors as the underlying findings are burned down
 * (tracked in the Findings Register); never demote an error back.
 */
export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        ResizeObserver: 'readonly',
        MutationObserver: 'readonly',
        Image: 'readonly',
        SVGElement: 'readonly',
        SVGSVGElement: 'readonly',
        HTMLElement: 'readonly',
        HTMLImageElement: 'readonly',
        HTMLTableElement: 'readonly',
        HTMLInputElement: 'readonly',
        Element: 'readonly',
        Event: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        WheelEvent: 'readonly',
        CustomEvent: 'readonly',
        DOMParser: 'readonly',
        getComputedStyle: 'readonly',
        alert: 'readonly',
        URL: 'readonly',
        Blob: 'readonly',
        performance: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      // Warnings, not errors: existing violations tracked by register findings.
      // GF-16 (bare catches) and GF-22 (dead code) burn these down in Phase 1.
      'no-empty': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-useless-assignment': 'warn',
      'no-useless-catch': 'warn',
      'preserve-caught-error': 'warn',
    },
  },
  {
    // Vite bundles its config with an injected __dirname shim
    files: ['vite.config.js'],
    languageOptions: {
      globals: { __dirname: 'readonly' },
    },
  },
  {
    files: ['tests/**', 'scripts/**', 'vitest.config.js', 'playwright.config.ts'],
    languageOptions: {
      globals: {
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
      },
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'playwright-report/', 'test-results/', 'zoom-demonstrator/', 'prompts/', 'src/utils/version.js'],
  },
]
