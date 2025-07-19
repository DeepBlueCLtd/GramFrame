# GramFrame Project Memory Bank

## Project Overview
GramFrame is a component for displaying and interacting with spectrograms. It provides a canvas-based display with time and frequency indicators, LED-style readouts, and interactive features for exploring spectrogram data.

## Implementation Progress

### Phase 1: Bootstrapping + Dev Harness (Completed)
**Date: July 18, 2025**

#### Task 1.1: Create `debug.html` page that loads a fixed component instance
- Created basic HTML structure with component container
- Added styling for debug page layout
- Set up component initialization
- Implemented responsive layout with side-by-side component and diagnostics panels

#### Task 1.2: Hook up "Hello World" from component inside the debug page
- Added Hello World message to component (later removed when no longer needed)
- Created styling for the message
- Verified component rendering in the debug page

#### Task 1.3: Set up hot module reload and visible console logging for state
- Implemented HMR using Vite's `import.meta.hot` API
- Added detailed console logging for state changes
- Ensured proper state preservation during hot reloads
- Set up state listener for updating the debug page display

### Phase 2: Basic Layout and Diagnostics Panel (Partially Completed)
**Date: July 18, 2025**

#### Task 2.3: Load spectrogram image from config
- Implemented image loading from the sample image (`/sample/mock-gram.png`)
- Added responsive image resizing with window resize event handling
- Created proper handling for image dimensions
- Refactored state structure to separate natural and display dimensions

#### Task 2.4: Read and display min/max time/frequency
- Extracted config data from table
- Implemented coordinate calculations based on min/max values
- Added bounds checking for mouse coordinates
- Fixed axis orientation (frequency horizontal, time vertical)

#### Task 2.5: Add LED-style readout panel below image
- Created LED display components for time, frequency, and mode
- Implemented styling for LED displays
- Added update mechanism for LED values based on cursor position

## Additional Improvements
**Date: July 18, 2025**

### Responsive Layout
- Implemented side-by-side layout for component and diagnostics
- Added responsive design that works on different screen sizes
- Created scrollable diagnostics panel with improved styling

### State Structure Refactoring
- Eliminated duplication in state structure
- Separated natural image dimensions (`imageDetails`) from display dimensions (`displayDimensions`)
- Improved property naming for clarity and maintainability

### Coordinate Handling
- Fixed axis orientation (frequency horizontal, time vertical)
- Implemented proper scaling of coordinates based on image dimensions
- Added bounds checking and value normalization
- Improved precision with fixed decimal places for display

### Phase 2: Testing and Final Implementation (Completed)
**Date: July 18, 2025**

#### Task 2.1 & 2.2: Playwright Test Infrastructure
- Playwright was already installed as dev dependency with Chrome browser configuration
- Test infrastructure was already in place with helper classes and fixtures
- Initial test suite covering setup and basic functionality was implemented

#### Task 2.3.1: Image Loading Tests
- Created comprehensive tests for spectrogram image loading from config
- Verified canvas dimensions and image rendering
- Tested state updates for image details and display dimensions

#### Task 2.4.1: Min/Max Extraction Tests
- Implemented tests for time/frequency range extraction from config table
- Verified correct parsing of min/max values in component state
- Tested coordinate calculations based on extracted ranges

#### Task 2.5.1: LED Panel Tests
- Created tests for LED display rendering and formatting
- Verified LED structure with proper labels and value formatting
- Tested LED updates when mouse moves over canvas

#### Task 2.6 & 2.6.1: Diagnostics Panel Implementation and Testing
- Diagnostics panel was already fully implemented in debug.html
- Added comprehensive tests for diagnostics panel information accuracy
- Verified real-time updates of image details and mouse coordinates
- Tested integration with state listener mechanism

#### Task 2.7 & 2.7.1: State Listener Mechanism
- State listener mechanism was already implemented in main.js
- Created comprehensive tests for state listener functionality
- Tested multiple listener registration and state updates
- Verified error handling in state listeners

#### Task 2.8: Comprehensive Phase 2 Testing
- Created complete Phase 2 test suite in `tests/phase2.spec.ts`
- Implemented 9 comprehensive tests covering all Phase 2 functionality
- All tests pass successfully, verifying integration of all components

#### Integration Test Fix
- Fixed failing state listener error handling test
- Updated `forceUpdate()` method to properly trigger state notifications
- Modified test to capture console errors instead of window errors
- All 18 tests now pass successfully

## Completed Tasks Summary
**Date: July 18, 2025**

### Phase 1: Bootstrapping + Dev Harness ✅
- Debug page implementation
- Component initialization and rendering
- Hot module reload and console logging
- Comprehensive Playwright test suite (3 tests)

### Phase 2: Basic Layout and Diagnostics Panel ✅  
- Image loading from config
- Min/max time/frequency extraction and display
- LED-style readout panel
- Diagnostics panel with real-time updates
- State listener mechanism with error handling
- Comprehensive Playwright test suite (9 tests)

### Phase 3: SVG Container and Axes Implementation ✅
**Date: July 18, 2025**

#### Task 3.1: SVG Container Implementation with Axes
- Successfully migrated from HTML5 Canvas to SVG container
- Implemented proper SVG namespace handling (`setAttribute` instead of `className`)
- Created coordinate transformation system:
  - `_screenToSVGCoordinates()` - screen pixels to SVG coordinates
  - `_svgToDataCoordinates()` - SVG coordinates to data space (time/frequency)
  - `_imageToDataCoordinates()` - image-relative coordinates to data space
  - `_dataToSVGCoordinates()` - data coordinates to SVG space
  - `_svgToScreenCoordinates()` - SVG coordinates back to screen pixels
- Added ResizeObserver for responsive behavior
- Implemented axes with tick marks and labels:
  - **Time axis (vertical)** on the left side with time values in seconds
  - **Frequency axis (horizontal)** on the bottom with frequency values in Hz
  - Dynamic tick density that adjusts based on available space
  - Proper margin allocation (50px left, 30px bottom, 10px right/top)
- Updated mouse handling to account for axes margins
- Enhanced state structure with axes configuration and image-relative coordinates
- Updated CSS styles for SVG elements and axes styling
- Comprehensive test coverage (23/24 tests passing)
- Fixed axis orientation confusion (frequency=horizontal, time=vertical)

## Technical Decisions
**Date: July 18, 2025**

### State Management
- Decided to use a centralized state object with listener pattern
- Implemented state notifications for UI updates
- Structured state to avoid duplication of dimension properties

### Responsive Design
- Used flexbox for layout to ensure responsiveness
- Implemented window resize event handling for canvas and image scaling
- Ensured aspect ratio preservation during resizing

### Event Handling
- Added mouse move and click event listeners to the canvas
- Implemented coordinate calculations with bounds checking
- Created LED display updates based on cursor position
