import js from '@eslint/js';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        // Browser globals
        document: 'readonly',
        window: 'readonly',
        console: 'readonly',
        HTMLTableElement: 'readonly',
        Image: 'readonly',
        ResizeObserver: 'readonly',
        
        // Additional browser APIs that might be used
        addEventListener: 'readonly',
        removeEventListener: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        requestAnimationFrame: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },
    rules: {
      // Complexity rules - these will fail builds on high complexity
      'complexity': ['error', { max: 17 }], // Set to 17 to allow existing code, can be lowered over time
      'max-params': ['warn', 6], // Warn on functions with more than 6 parameters
      'max-statements': ['warn', 35], // Warn on functions with more than 35 statements (adjusted for existing code)
      'max-depth': ['warn', 5], // Warn on deeply nested blocks
      'max-nested-callbacks': ['warn', 4], // Warn on deeply nested callbacks
      
      // Code quality rules
      'no-unused-vars': ['error', { 
        argsIgnorePattern: '^_', // Allow unused parameters that start with underscore
        varsIgnorePattern: '^_'  // Allow unused variables that start with underscore
      }],
      'no-undef': 'error',
      'no-redeclare': 'error',
      'no-console': 'warn', // Allow console for now, but warn
      
      // Disable some rules that might be too strict for your existing codebase
      'no-var': 'off', // Allow var declarations for now
    },
  },
];