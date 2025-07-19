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

---
**Agent:** Implementation Agent
**Task Reference:** Phase 3, Task 3.2: Mouse Tracking Implementation

**Summary:**
Enhanced and completed mouse tracking functionality with comprehensive edge case handling, proper event listener cleanup, and extensive test coverage.

**Details:**
- Enhanced existing mouse tracking implementation that was already functional but lacked comprehensive edge case handling and cleanup
- Added proper event listener cleanup with bound references for component destruction
- Implemented mouse leave handling to clear cursor position when mouse exits SVG container
- Enhanced edge case handling to clear cursor position when mouse moves outside image bounds (into margin areas)
- Improved LED display updates to show default values ("0.00 Hz", "0.00 s") when cursor position is null
- Added comprehensive component destruction method with proper resource cleanup
- Created 5 new integration tests specifically for mouse tracking functionality:
  - Mouse movement accuracy across multiple positions within the image
  - Mouse leave behavior and cursor position clearing
  - Edge case handling when mouse is outside image bounds but within SVG
  - Coordinate conversion accuracy testing at image corners and center
  - LED display integration with mouse tracking state changes
- Fixed existing test that was affected by enhanced edge case handling
- Maintained all existing coordinate transformation functionality

**Output/Result:**
```javascript
// Enhanced event listener setup with proper cleanup references
_setupEventListeners() {
  // Bind event handlers to maintain proper 'this' context
  this._boundHandleMouseMove = this._handleMouseMove.bind(this)
  this._boundHandleMouseLeave = this._handleMouseLeave.bind(this)
  this._boundHandleClick = this._handleClick.bind(this)
  this._boundHandleResize = this._handleResize.bind(this)
  
  // SVG mouse events
  this.svg.addEventListener('mousemove', this._boundHandleMouseMove)
  this.svg.addEventListener('mouseleave', this._boundHandleMouseLeave)
  this.svg.addEventListener('click', this._boundHandleClick)
  // ... other event listeners
}

// New mouse leave handler
_handleMouseLeave(event) {
  // Clear cursor position when mouse leaves the SVG area
  this.state.cursorPosition = null
  this._updateLEDDisplays()
  this._notifyStateListeners()
}

// Enhanced edge case handling in mouse move
// Only process if mouse is within the image area
if (imageRelativeX < 0 || imageRelativeY < 0 || 
    imageRelativeX > this.state.imageDetails.naturalWidth || 
    imageRelativeY > this.state.imageDetails.naturalHeight) {
  // Clear cursor position when mouse is outside image bounds
  this.state.cursorPosition = null
  this._updateLEDDisplays()
  this._notifyStateListeners()
  return
}

// Component cleanup method
destroy() {
  this._cleanupEventListeners()
  if (this.container && this.container.parentNode) {
    this.container.parentNode.removeChild(this.container)
  }
}
```

Created comprehensive test file: `tests/mouse-tracking.spec.ts` with 5 test cases covering all mouse tracking scenarios.

**Status:** Completed

**Issues/Blockers:**
None. One existing test required adjustment due to enhanced edge case handling where mouse position is properly cleared when outside image bounds.

**Next Steps:**
Ready to proceed with Task 3.3: Time/Frequency Cursor Display implementation.

---
**Agent:** Implementation Agent
**Task Reference:** Phase 3, Task 3.3: Time/Frequency Cursor Display

**Summary:**
Implemented visual cursor indicators (crosshairs and center point) for the spectrogram display with enhanced visibility using contrasting colors and comprehensive test coverage.

**Details:**
- Built upon existing mouse tracking implementation to add visual feedback for cursor position
- Time and frequency calculations were already working from Task 3.2
- LED display updates were already functional from Task 3.2
- Added visual cursor indicators as the core new functionality:
  - **Crosshair System:** Vertical and horizontal dashed lines that span the entire image area
  - **Enhanced Visibility:** Implemented dual-line technique with white shadow lines (3px) underneath red main lines (1px) for visibility against any background
  - **Center Point:** Red circle with white stroke at cursor intersection
  - **Responsive Design:** Cursor indicators properly scale and position with container resizing
  - **Boundary Respect:** Indicators only appear when mouse is within image bounds (not in margin areas)
- Added comprehensive cursor indicator management:
  - `_updateCursorIndicators()` method for creating/updating visual indicators
  - Proper cleanup when cursor leaves image area
  - SVG-based implementation within dedicated cursor group
- Enhanced CSS styling with contrasting colors:
  - Shadow lines: white, 3px thick, dashed pattern (6,3)
  - Main lines: red, 1px thick, dashed pattern (4,2)
  - Center point: red fill with white stroke for maximum visibility
- Created comprehensive test suite: `tests/cursor-display.spec.ts` with 6 test cases:
  1. Cursor indicators appear when mouse moves over image
  2. Cursor indicators disappear when mouse leaves image
  3. Cursor indicators move with mouse position and maintain proper coordinates
  4. Cursor indicators have correct styling for visibility
  5. Cursor indicators work correctly with container resizing
  6. Cursor indicators respect image boundaries (no indicators in margin areas)

**Output/Result:**
```javascript
// SVG cursor group creation in constructor
this.cursorGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
this.cursorGroup.setAttribute('class', 'gram-frame-cursor-group')
this.svg.appendChild(this.cursorGroup)

// Enhanced mouse move handler with cursor indicators
_handleMouseMove(event) {
  // ... existing coordinate calculations ...
  
  // Update LED displays
  this._updateLEDDisplays()
  
  // Update visual cursor indicators
  this._updateCursorIndicators()
  
  // Notify listeners
  this._notifyStateListeners()
}

// Cursor indicator implementation with dual-line visibility technique
_updateCursorIndicators() {
  // Clear existing cursor indicators
  this.cursorGroup.innerHTML = ''
  
  // Only draw indicators if cursor position is available
  if (!this.state.cursorPosition || !this.state.imageDetails.naturalWidth || !this.state.imageDetails.naturalHeight) {
    return
  }
  
  const margins = this.state.axes.margins
  const cursorSVGX = margins.left + this.state.cursorPosition.imageX
  const cursorSVGY = margins.top + this.state.cursorPosition.imageY
  
  // Create shadow lines first (thicker, white)
  const verticalShadow = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  // ... shadow line setup ...
  
  // Create main lines on top (thinner, red)
  const verticalLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  // ... main line setup ...
  
  // Create center point indicator
  const centerPoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  // ... center point setup ...
}
```

```css
/* Enhanced cursor styling for visibility */
.gram-frame-cursor-shadow {
  stroke: rgba(255, 255, 255, 0.9);
  stroke-width: 3;
  stroke-dasharray: 6, 3;
}

.gram-frame-cursor-vertical,
.gram-frame-cursor-horizontal {
  stroke: rgba(255, 0, 0, 0.9);
  stroke-width: 1;
  stroke-dasharray: 4, 2;
}

.gram-frame-cursor-point {
  fill: rgba(255, 0, 0, 0.9);
  stroke: rgba(255, 255, 255, 0.9);
  stroke-width: 2;
}
```

**Status:** Completed

**Issues/Blockers:**
Initial implementation had low visibility of crosshair lines against varying spectrogram backgrounds. Resolved by implementing dual-line technique with contrasting white shadow underneath red main lines.

**Next Steps:**
Ready to proceed with Task 3.4: Cursor Management implementation.

---

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
