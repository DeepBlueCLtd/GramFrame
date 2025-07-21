# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
```bash
# Development server with hot reload
yarn dev

# Build for production
yarn build

# Run all tests
yarn test

# Type checking
yarn typecheck
```

### Test Commands
```bash
# Run specific test file
npx playwright test tests/phase1.spec.ts

# Run tests with UI
npx playwright test --ui

# Debug specific test
npx playwright test tests/mode-switching.spec.ts --debug
```

## Architecture Overview

**GramFrame** is a JavaScript component for interactive spectrogram analysis that transforms HTML config tables into interactive SVG-based overlays for sonar training materials.

### Core Components

- **Main Class**: `GramFrame` in `src/main.js` - Central component managing all functionality
- **State Management**: Internal state object with listener pattern for external integration
- **Auto-initialization**: Detects `.gram-config` tables and replaces them with interactive components
- **Mode System**: Analysis mode (harmonics) and Doppler mode (speed calculations)

### Key Architecture Patterns

1. **SVG-based Rendering**: Uses SVG for precise positioning and scaling of cursors/overlays
2. **Responsive Design**: ResizeObserver ensures components adapt to container changes  
3. **Coordinate System**: Multiple coordinate transformations (screen → SVG → image → data)
4. **State Broadcasting**: Listener pattern allows external systems to react to state changes
5. **Hot Module Reload**: HMR support preserves state during development

### File Structure

- `src/main.js` - Main component implementation (~2100 lines)
- `src/types.js` - TypeScript-style JSDoc type definitions
- `src/gramframe.css` - Component styling
- `tests/` - Playwright test suite with helper utilities
- `sample/` - Sample HTML files for testing
- `debug.html` - Development debug page

### Configuration System

Components are configured via HTML tables with class `gram-config`:
- First row contains `<img>` element with spectrogram image
- Subsequent rows define time/frequency ranges as `param | min | max`
- Tables are automatically detected and replaced on page load

### Test Architecture

- **Playwright-based**: End-to-end tests covering all user interactions
- **Helper Classes**: `GramFramePage` class provides reusable test utilities
- **State Assertions**: Comprehensive state validation helpers
- **Visual Testing**: Screenshot comparisons for UI consistency

## Development Workflow

1. Use `yarn dev` for development with automatic browser refresh
2. Always run `yarn typecheck` before committing changes
3. Test changes with `yarn test` - all tests must pass
4. Component auto-initializes on page load via `DOMContentLoaded`
5. Use debug.html for isolated testing and state inspection

## Important Implementation Notes

- Rate affects frequency calculations (acts as frequency divider)
- Axes have configurable margins (left: 60px, bottom: 50px)
- Harmonics are calculated dynamically during drag interactions
- State is deep-copied before passing to listeners to prevent mutations
- HMR preserves state listeners across hot reloads