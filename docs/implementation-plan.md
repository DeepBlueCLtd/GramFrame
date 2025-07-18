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

### Initial Playwright test
- Implement test for debug page loading
- Verify component initialization
- Test basic rendering

### Spectrogram image loading
- Implement image loading from config
- Handle image dimensions and scaling
- Add error handling for image loading

### Min/Max time/frequency display
- Extract config data from table
- Implement coordinate calculations
- Add bounds checking

### LED-style readout panel
- Create LED display components
- Implement styling for LED displays
- Add update mechanism for LED values

### Diagnostics panel
- Display image URL and size
- Show min/max time and frequency values
- Add real-time mouse coordinate display
- Update diagnostics panel when state changes

### State listener mechanism
- Implement addStateListener() and removeStateListener() methods
- Add proper error handling for listeners
- Create test coverage for state listener functionality

## Phase 3: Interaction Foundations

### SVG container implementation
- Refactor to use SVG as the primary container
- Move spectrogram image into SVG using image element
- Implement proper scaling and positioning within SVG
- Add coordinate system transformation support
- Ensure responsive behavior with ResizeObserver

### Mouse tracking
- Add event listeners for mouse movement
- Implement coordinate conversion from screen to data space
- Update state with current mouse position

### Time/frequency cursor display
- Calculate time and frequency values at cursor position
- Update LED display with current values
- Add visual indicator for cursor position

### Cursor management
- Implement click handling to add cursors
- Add drag functionality to reposition cursors
- Manage multiple cursors in state

### State listener and diagnostics updates
- Extend state listener to include cursor information
- Update diagnostics panel to show cursor details
- Add tests for cursor functionality

## Phase 4: Harmonics & Modes

### Mode switching UI
- Implement mode selection buttons
- Add state management for current mode
- Create mode-specific behaviors

### Harmonic line drawing
- Calculate harmonic positions based on cursor
- Draw SVG lines for harmonics
- Add labels to harmonic lines

### Multiple cursor support
- Extend cursor management for multiple cursors
- Calculate harmonics for each cursor
- Implement cursor selection and highlighting

### Rate input functionality
- Add rate input field to UI
- Implement rate change handling
- Update harmonic calculations based on rate

## Phase 5: Final Fit & Polish

### Auto-detection of config tables
- Implement scanning for config tables in document
- Add automatic initialization for found tables
- Handle multiple component instances

### Debug toggles
- Add canvas boundary toggle
- Implement grid toggle functionality
- Update diagnostics page with toggle controls

### Build output polishing
- Configure build process to include debug page
- Optimize output for production
- Add documentation to distribution

### QA and testing
- Test across multiple browsers
- Verify multi-instance functionality
- Complete test coverage for all features
