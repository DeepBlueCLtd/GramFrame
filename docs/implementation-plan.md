# GramFrame Implementation Plan

This document outlines the technical implementation approach for each phase of the GramFrame component development.

## Phase 1: Bootstrapping + Dev Harness

### Setup build environment using Vite
- Configure Vite for JavaScript/TypeScript development
- Set up development and build scripts in package.json

### Basic component stub
- Create initial GramFrame class with initialization method
- Implement basic state management structure

### Debug page setup
- Create debug.html with component container
- Add styling for debug page layout
- Set up component initialization

### Hello World integration
- Add initial rendering to component
- Connect component to debug page

### Hot module reload and state logging
- Implement HMR using Vite's import.meta.hot API
- Add state logging to console
- Ensure state preservation during hot reloads

## Phase 2: Basic Layout and Diagnostics Panel

### Playwright setup
- Add Playwright as a dev dependency
- Configure Playwright to use Chrome browser only
- Create initial test infrastructure
- Set up test helpers and fixtures for integration testing
- Implement Page Object Model for component interaction

### Initial Playwright test
- Implement test for debug page loading
- Verify component initialization
- Test basic rendering
- Create integration tests for component bootstrapping
- Fix any broken integration tests before proceeding to the next task

### Spectrogram image loading
- Implement image loading from config
- Handle image dimensions and scaling
- Add error handling for image loading
- Write integration tests for image loading functionality
- Add tests for error handling and edge cases
- Fix any broken integration tests before proceeding to the next task

### Min/Max time/frequency display
- Extract config data from table
- Implement coordinate calculations
- Add bounds checking
- Create integration tests for config extraction
- Test coordinate calculation accuracy
- Fix any broken integration tests before proceeding to the next task

### LED-style readout panel
- Create LED display components
- Implement styling for LED displays
- Add update mechanism for LED values
- Write integration tests for LED display rendering
- Test LED value updates with state changes
- Fix any broken integration tests before proceeding to the next task

### Diagnostics panel
- Display image URL and size
- Show min/max time and frequency values
- Add real-time mouse coordinate display
- Update diagnostics panel when state changes
- Create integration tests for diagnostics panel functionality
- Test real-time updates of diagnostic information
- Fix any broken integration tests before proceeding to the next task

### State listener mechanism
- Implement addStateListener() and removeStateListener() methods
- Add proper error handling for listeners
- Create comprehensive integration tests for state listener functionality
- Test error handling and edge cases
- Fix any broken integration tests before proceeding to the next task

## Phase 3: Interaction Foundations

### SVG container implementation
- Refactor to use SVG as the primary container
- Move spectrogram image into SVG using image element
- Implement proper scaling and positioning within SVG
- Add coordinate system transformation support
- Ensure responsive behavior with ResizeObserver
- Create integration tests for SVG container functionality
- Test responsive behavior with different viewport sizes
- Verify coordinate transformation accuracy
- Fix any broken integration tests before proceeding to the next task

### Mouse tracking
- Add event listeners for mouse movement
- Implement coordinate conversion from screen to data space
- Update state with current mouse position
- Write integration tests for mouse tracking functionality
- Test coordinate conversion accuracy
- Verify state updates with mouse movement
- Fix any broken integration tests before proceeding to the next task

### Time/frequency cursor display
- Calculate time and frequency values at cursor position
- Update LED display with current values
- Add visual indicator for cursor position
- Create integration tests for cursor display functionality
- Test calculation accuracy at different positions
- Verify LED display updates correctly
- Fix any broken integration tests before proceeding to the next task

### Cursor management
- Implement click handling to add cursors
- Add drag functionality to reposition cursors
- Manage multiple cursors in state
- Write integration tests for cursor addition and manipulation
- Test drag functionality and positioning accuracy
- Verify state management with multiple cursors
- Fix any broken integration tests before proceeding to the next task

### State listener and diagnostics updates
- Extend state listener to include cursor information
- Update diagnostics panel to show cursor details
- Create comprehensive integration tests for extended state listener
- Test diagnostics panel updates with cursor changes
- Fix any broken integration tests before proceeding to the next task

## Phase 4: Harmonics & Modes

### Mode switching UI
- Implement mode selection buttons
- Add state management for current mode
- Create mode-specific behaviors
- Write integration tests for mode switching functionality
- Test state changes with mode selection
- Verify mode-specific behaviors
- Fix any broken integration tests before proceeding to the next task

### Harmonic line drawing
- Calculate harmonic positions based on cursor
- Draw SVG lines for harmonics
- Add labels to harmonic lines
- Create integration tests for harmonic line rendering
- Test calculation accuracy for harmonic positions
- Verify label placement and content
- Fix any broken integration tests before proceeding to the next task

### Multiple cursor support
- Extend cursor management for multiple cursors
- Calculate harmonics for each cursor
- Implement cursor selection and highlighting
- Write integration tests for multi-cursor functionality
- Test harmonic calculations with multiple cursors
- Verify cursor selection and highlighting behavior
- Fix any broken integration tests before proceeding to the next task

### Rate input functionality
- Add rate input field to UI
- Implement rate change handling
- Update harmonic calculations based on rate
- Create integration tests for rate input functionality
- Test harmonic recalculation with rate changes
- Verify UI updates with rate changes
- Fix any broken integration tests before proceeding to the next task

## Phase 5: Final Fit & Polish

### Auto-detection of config tables
- Implement scanning for config tables in document
- Add automatic initialization for found tables
- Handle multiple component instances
- Write integration tests for auto-detection functionality
- Test multi-instance initialization
- Verify proper handling of various config table formats
- Fix any broken integration tests before proceeding to the next task

### Debug toggles
- Add canvas boundary toggle
- Implement grid toggle functionality
- Update diagnostics page with toggle controls
- Create integration tests for toggle functionality
- Test visual changes with toggle activation
- Verify state updates with toggle changes
- Fix any broken integration tests before proceeding to the next task

### Build output polishing
- Configure build process to include debug page
- Optimize output for production
- Add documentation to distribution
- Test build output for correctness
- Verify documentation is included and accessible
- Add regression tests for build process
- Create integration tests for production build

### QA and testing
- Test across multiple browsers
- Verify multi-instance functionality
- Complete test coverage for all features
- Create comprehensive end-to-end integration tests
- Perform cross-browser compatibility testing
- Add final regression tests for any issues discovered
- Verify all integration tests pass in production build
