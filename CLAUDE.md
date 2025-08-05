# [CLAUDE.md](CLAUDE.md)

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

### Status updates

Send me ntfy notifications at key progress milestones (or at least every 30 minutes) using the notify script shown below. This should happen in my absence, so it is ESSENTIAL so that it happen without asking my permission to send. 

```
# Send progress notification
curl -d "status here" ntfy.sh/iancc2025
```

## Architecture Overview

**GramFrame** is a JavaScript component for interactive spectrogram analysis that transforms HTML config tables into interactive SVG-based overlays for sonar training materials.

### Core Components

- **Main Class**: `GramFrame` in `src/main.js` - Central component managing all functionality
- **Entry Point**: `src/index.js` - Main module export and global registration
- **State Management**: `src/core/state.js` - Centralized state with listener pattern
- **Mode System**: Modular architecture with Analysis, Harmonics, and Doppler modes
- **Feature Rendering**: `src/core/FeatureRenderer.js` - Cross-mode feature coordination
- **Mode Factory**: `src/modes/ModeFactory.js` - Centralized mode instantiation

### Key Architecture Patterns

1. **SVG-based Rendering**: Uses SVG for precise positioning and scaling of cursors/overlays
2. **Responsive Design**: ResizeObserver ensures components adapt to container changes  
3. **Coordinate System**: Multiple coordinate transformations (screen → SVG → image → data)
4. **State Broadcasting**: Listener pattern allows external systems to react to state changes
5. **Hot Module Reload**: HMR support preserves state during development

### File Structure

- `src/index.js` - Main entry point and global export
- `src/main.js` - GramFrame class implementation
- `src/types.js` - TypeScript-style JSDoc type definitions
- `src/gramframe.css` - Component styling
- `src/core/` - Core system modules:
  - `state.js` - State management and listeners
  - `events.js` - Event handling and ResizeObserver setup
  - `configuration.js` - Config table parsing
  - `FeatureRenderer.js` - Cross-mode feature rendering
- `src/modes/` - Mode system architecture:
  - `BaseMode.js` - Abstract base class for all modes
  - `ModeFactory.js` - Mode instantiation factory
  - `analysis/AnalysisMode.js` - Analysis mode with marker persistence
  - `harmonics/HarmonicsMode.js` - Harmonics calculation mode
  - `doppler/DopplerMode.js` - Doppler speed calculation mode
- `src/components/` - UI component modules:
  - `UIComponents.js` - Rate input, LED displays, mode switching
  - `ModeButtons.js` - Mode switching interface
  - `HarmonicPanel.js` - Harmonics display panel
  - `ColorPicker.js` - Color selection component
  - `LEDDisplay.js` - Digital display component
  - `table.js` - Configuration table handling
- `src/rendering/` - Rendering system:
  - `cursors.js` - Cursor and indicator rendering
  - `axes.js` - Axis rendering and scaling
- `src/utils/` - Utility modules:
  - `coordinates.js` - Coordinate system transformations
  - `calculations.js` - Mathematical calculations
  - `doppler.js` - Doppler-specific calculations
  - `svg.js` - SVG manipulation utilities
  - `timeFormatter.js` - Time formatting utilities
- `src/api/` - External API interface
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

### Architecture
- **Modular Mode System**: Each mode (Analysis, Harmonics, Doppler) extends BaseMode
- **Feature Persistence**: FeatureRenderer coordinates cross-mode feature visibility
- **Factory Pattern**: ModeFactory centralizes mode instantiation and error handling
- **Separation of Concerns**: Clear separation between rendering, state, events, and UI

### Technical Details
- Rate affects frequency calculations (acts as frequency divider)
- Axes have configurable margins (left: 60px, bottom: 50px)
- Harmonics are calculated dynamically during drag interactions
- State is deep-copied before passing to listeners to prevent mutations
- HMR preserves state listeners across hot reloads
- Build output is unminified for field debugging (`minify: false` in vite.config.js)
- TypeScript checking with JSDoc annotations (no TypeScript compilation)

### Mode-Specific Features
- **Analysis Mode**: Persistent draggable markers with cross-mode visibility
- **Harmonics Mode**: Real-time harmonic calculation and display
- **Doppler Mode**: Speed calculation with bearing and time inputs

## Main strategy

Think carefully and only action the specific task I have given you with the most concise and elegant solution that changes as little code as possible.