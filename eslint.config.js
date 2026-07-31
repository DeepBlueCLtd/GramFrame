/**
 * ESLint flat config (specs/164-quality-ratchets, US2).
 *
 * The rule set is deliberately small so the existing codebase passes on day
 * one: correctness rules the code already satisfies are errors; style/debt
 * rules with existing occurrences start as warnings and get promoted to
 * errors as the debt is paid down (same ratchet philosophy as `yarn hygiene`).
 * `no-undef` is left off — `yarn typecheck` already covers unresolved names
 * with full type information.
 */
export default [
  {
    // docs/archive/ holds development-history artefacts that are not part of the
    // component (spec 165, GF-36); linting them reports debt nobody will pay.
    ignores: ['dist/**', 'node_modules/**', 'test-results/**', 'playwright-report/**', 'docs/archive/**'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      // Errors — the codebase passes these today; regressions fail the lane.
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-debugger': 'error',
      'no-dupe-args': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-compare-neg-zero': 'error',
      'no-cond-assign': 'error',
      'no-const-assign': 'error',
      'no-func-assign': 'error',
      'no-self-assign': 'error',
      'no-self-compare': 'error',
      'no-sparse-arrays': 'error',
      'no-unsafe-negation': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
      'no-var': 'error',
      'no-with': 'error',
      'no-new-wrappers': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',

      // Warnings — existing occurrences allowed; promote to error once clean.
      // `_`-prefixed names are the opt-out for a binding that must exist but is
      // deliberately unused — including a caught error the handler ignores on
      // purpose (browserCompatibility.js keeps the binding rather than using
      // optional catch binding, whose ES2019 syntax would fail to parse on the
      // very old browsers that file exists to warn).
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      'no-shadow': 'warn',
      'no-unreachable': 'warn',
      'prefer-const': 'warn',
      'eqeqeq': ['warn', 'smart'],
    },
  },
  {
    // Intentionally ES5: this module must parse and run on pre-ES6 engines to
    // show the "please update your browser" warning (specs/162).
    files: ['src/core/browserCompatibility.js'],
    rules: {
      'no-var': 'off',
    },
  },
  {
    // Pre-existing empty else block; src/ is frozen in Phase 0 (FR-010).
    // Drop this override when the block is removed in a later phase.
    files: ['src/modes/harmonics/HarmonicsMode.js'],
    rules: {
      'no-empty': 'warn',
    },
  },
]
