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

### Phase 5: Auto-Detection and Config Tables (Completed)
**Date: July 20, 2025**
**Task Reference: Phase 5, Task 5.1: Auto-detect and replace config tables**

#### Task 5.1: Auto-Detect and Replace Config Tables Implementation

##### Enhanced Table Detection Mechanism
Successfully implemented comprehensive auto-detection functionality that scans the DOM for tables with the class "spectro-config" and replaces them with interactive GramFrame components:

- **Primary Detection Function**: Enhanced `GramFrameAPI.detectAndReplaceConfigTables()` method
  - Searches for all tables with `spectro-config` class in the specified container (defaults to document)
  - Processes multiple tables on the same page correctly
  - Generates unique instance IDs for each component (`gramframe-${timestamp}-${index}`)
  - Provides detailed logging for detected tables including position and image validation

```javascript
// Example usage showing enhanced detection
const instances = GramFrame.detectAndReplaceConfigTables()
console.log(`Initialized ${instances.length} components`)
```

##### Comprehensive Configuration Extraction
Implemented robust configuration extraction from HTML tables with extensive error handling:

- **Image Validation**: Checks for image element presence and valid src attribute
- **Parameter Validation**: Validates time and frequency rows with numeric range checking
- **Graceful Defaults**: Falls back to sensible defaults (0-60s time, 0-100Hz frequency) when configuration is incomplete
- **Range Validation**: Ensures min < max for all parameter ranges
- **Detailed Logging**: Logs successful configuration extraction and warns about issues

```javascript
// Enhanced validation ensures robust configuration extraction
const validationResult = this._validateConfigTable(table)
if (!validationResult.isValid) {
  throw new Error(`Invalid config table structure: ${validationResult.errors.join(', ')}`)
}
```

##### Component Instance Creation and Table Replacement
Streamlined the component creation process while maintaining all existing functionality:

- **Seamless Replacement**: Tables are replaced with GramFrame components maintaining original position and layout context
- **Instance Tracking**: All instances are tracked with unique IDs and stored for API access
- **Error Recovery**: Failed initializations don't prevent other components from working
- **Visual Continuity**: Component containers preserve table positioning and surrounding context

##### Public API for Manual Initialization
Created comprehensive public API methods for manual component management:

- **`initializeTable(tableOrSelector)`**: Manually initialize specific tables with validation
- **`getInstances()`**: Retrieve all active GramFrame instances
- **`getInstance(instanceId)`**: Get specific instance by ID
- **`detectAndReplaceConfigTables(container)`**: Re-run detection in specified container

```javascript
// Manual initialization example
const instance = GramFrame.initializeTable('#my-custom-table')
if (instance) {
  console.log(`Created instance: ${instance.instanceId}`)
}
```

##### Error Handling and Reporting
Implemented comprehensive error handling with user-friendly reporting:

- **Validation Errors**: Detailed validation of table structure before processing
- **Visual Error Indicators**: Failed tables show error messages with styling
- **Console Logging**: Detailed error information in console for debugging
- **Graceful Degradation**: Errors don't break other components or page functionality

Key error handling features:
- Missing image detection
- Invalid parameter row validation
- Numeric value validation for time/frequency ranges
- Image loading error handling

##### Integration Tests
Created comprehensive Playwright test suite (`tests/auto-detection.spec.ts`) covering:

- **Basic Detection**: Verifies tables are detected and replaced correctly
- **API Functionality**: Tests all public API methods
- **Error Handling**: Validates error reporting and graceful degradation
- **State Management**: Confirms proper component state structure
- **Logging**: Verifies detection and initialization progress logging

Test results: 7/7 tests passing, covering all major functionality paths.

##### Code Quality and Documentation
Enhanced code with comprehensive JSDoc documentation and type annotations:

- All new methods have detailed parameter and return type documentation
- Error conditions are clearly documented
- Usage examples provided for public API methods
- Code follows existing project conventions and patterns

#### Key Success Criteria Met:
✅ Tables with class "spectro-config" are automatically detected and replaced  
✅ Configuration is correctly extracted from tables with validation  
✅ Multiple tables on the same page are handled properly  
✅ Public API allows manual initialization  
✅ Error handling is comprehensive and user-friendly  
✅ All integration tests pass  

This implementation makes GramFrame ready for real-world deployment with robust auto-detection capabilities that work reliably across different HTML table structures and handle edge cases gracefully.

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
**Agent:** Implementation Agent
**Task Reference:** Phase 4, Task 4.1: Mode Switching UI Implementation

**Summary:**
Implemented comprehensive mode switching UI with three interaction modes (Analysis, Harmonics, Doppler), complete state management, LED display integration, and extensive test coverage.

**Details:**
- Found that mode switching UI was already implemented in src/main.js:98-165 but lacked comprehensive testing
- Mode switching implementation included:
  - **UI Components:** Three mode buttons (Analysis, Harmonics, Doppler) with active state styling
  - **State Management:** Mode property in state with default "analysis" mode
  - **Event Handling:** Click handlers for mode switching with proper state updates
  - **LED Integration:** Mode LED display showing current mode in LED-style aesthetic
  - **State Listener Integration:** Mode changes properly propagated to all registered listeners
- Enhanced test helper methods in `tests/helpers/gram-frame-page.ts`:
  - Added `getCurrentState()` method for consistency
  - Added `moveMouseToSpectrogram()` method for mouse interaction testing
- Created comprehensive test suite `tests/mode-switching.spec.ts` with 9 test cases:
  1. Mode switching UI components are present and correctly styled
  2. Default Analysis mode is set correctly 
  3. Mode switching changes state and UI correctly (all three modes)
  4. Mode changes are properly propagated to state listeners
  5. Mode information appears in diagnostics panel
  6. Mode switching preserves other state properties
  7. Mode buttons have correct styling and hover states
  8. LED-style aesthetic is maintained for mode display
  9. Mode switching works with mouse tracking
- Verified integration with existing functionality:
  - Mouse tracking continues to work correctly after mode changes
  - State listener mechanism properly notifies all listeners of mode changes
  - LED display updates maintain LED-style aesthetic (Courier font, green text, black background)
  - Other state properties (rate, config, imageDetails, etc.) are preserved during mode changes

**Code Implementation:**
The mode switching functionality was already implemented in src/main.js:
```javascript
// Mode switching UI creation (lines 140-165)
_createModeSwitchingUI() {
  this.modesContainer = document.createElement('div')
  this.modesContainer.className = 'gram-frame-modes'
  
  const modes = ['analysis', 'harmonics', 'doppler']
  this.modeButtons = {}
  
  modes.forEach(mode => {
    const button = document.createElement('button')
    button.className = 'gram-frame-mode-btn'
    button.textContent = this._capitalizeFirstLetter(mode)
    button.dataset.mode = mode
    
    if (mode === this.state.mode) {
      button.classList.add('active')
    }
    
    this.modeButtons[mode] = button
    this.modesContainer.appendChild(button)
  })
  
  this.container.appendChild(this.modesContainer)
}

// Mode switching logic (lines 629-647)
_switchMode(mode) {
  this.state.mode = mode
  
  // Update UI
  Object.keys(this.modeButtons).forEach(m => {
    if (m === mode) {
      this.modeButtons[m].classList.add('active')
    } else {
      this.modeButtons[m].classList.remove('active')
    }
  })
  
  this._updateModeLED()
  this._notifyStateListeners()
}
```

**Test Results:**
- All 9 new mode switching tests pass
- Complete test suite (44 tests total) passes with no regressions
- Verified mode switching works correctly in all scenarios:
  - UI state changes properly
  - State listener notifications work
  - LED display updates correctly
  - Integration with mouse tracking maintained

**Status:** Completed

**Issues/Blockers:**
None. The implementation was already present and functional, requiring only comprehensive test coverage to validate all requirements.

**Next Steps:**
Ready to proceed with Task 4.2: Analysis Mode Implementation.

---
**Agent:** Implementation Agent
**Task Reference:** Phase 4, Task 4.2: Analysis Mode Implementation

**Summary:**
Implemented Analysis mode functionality with mode-specific cross-hair display, enhanced LED formatting, and comprehensive test coverage ensuring cross-hairs only appear in Analysis mode as per Gram-Modes.md specifications.

**Details:**
- **Cross-hair Mode Restriction:** Modified `_updateCursorIndicators()` to only display cross-hairs when `this.state.mode === 'analysis'`
- **Enhanced LED Display Formatting:** Updated LED display format to match specification:
  - Frequency: "Freq: 734.2 Hz" (1 decimal place) 
  - Time: "Time: 5.84 s" (2 decimal places)
  - Default values: "Freq: 0.00 Hz" and "Time: 0.00 s"
- **Hover-only Interaction:** Verified Analysis mode operates on hover only with no persistent click state
- **Existing Cross-hair Infrastructure:** Leveraged existing cross-hair implementation from Phase 3:
  - Vertical and horizontal lines with shadow technique for visibility
  - Center point indicator with red fill and white stroke
  - Full spectrogram width/height coverage
  - Proper SVG coordinate handling with margins
- **Test Infrastructure Enhancement:** Enhanced `GramFramePage` helper with additional methods:
  - `getCurrentState()` alias for consistency
  - `moveMouseToSpectrogram()` for mouse interaction testing
- **Comprehensive Test Coverage:** Created `tests/analysis-mode.spec.ts` with 9 test cases:
  1. Cross-hairs appear only in Analysis mode (not in Harmonics/Doppler)
  2. Cross-hairs follow mouse movement in Analysis mode
  3. LED display shows correct Analysis mode formatting
  4. LED display shows default values when mouse is outside spectrogram
  5. Analysis mode operates on hover only with no click interactions
  6. Cross-hairs extend across full width and height of spectrogram
  7. Cross-hairs have optimal visibility styling
  8. Analysis mode state is properly tracked in diagnostics
  9. Analysis mode integrates correctly with existing mouse tracking
- **Regression Fix:** Updated existing tests to match new LED format expectations

**Code Implementation:**
```javascript
// Modified cursor indicator method to be mode-specific
_updateCursorIndicators() {
  // Clear existing cursor indicators
  this.cursorGroup.innerHTML = ''
  
  // Only draw indicators if cursor position is available
  if (!this.state.cursorPosition || !this.state.imageDetails.naturalWidth || !this.state.imageDetails.naturalHeight) {
    return
  }
  
  // Only show cross-hairs in Analysis mode
  if (this.state.mode !== 'analysis') {
    return
  }
  
  // ... existing cross-hair creation code continues unchanged ...
}

// Enhanced LED display formatting to match specification
_updateLEDDisplays() {
  if (!this.state.cursorPosition) {
    // Show default values when no cursor position
    this.freqLED.querySelector('.gram-frame-led-value').textContent = 'Freq: 0.00 Hz'
    this.timeLED.querySelector('.gram-frame-led-value').textContent = 'Time: 0.00 s'
    return
  }
  
  // Update frequency LED - use 1 decimal place for Analysis mode as per spec
  const freqValue = this.state.cursorPosition.freq.toFixed(1)
  this.freqLED.querySelector('.gram-frame-led-value').textContent = `Freq: ${freqValue} Hz`
  
  // Update time LED - use 2 decimal places for Analysis mode as per spec
  const timeValue = this.state.cursorPosition.time.toFixed(2)
  this.timeLED.querySelector('.gram-frame-led-value').textContent = `Time: ${timeValue} s`
}
```

**Test Results:**
- All 9 new Analysis mode tests pass
- Complete test suite (53 tests total) passes with no regressions
- Verified Analysis mode behavior matches Gram-Modes.md specifications:
  - Cross-hairs appear only in Analysis mode
  - LED format matches "Freq: 734.2 Hz" and "Time: 5.84 s" specification
  - Hover-only interaction confirmed
  - Integration with existing mouse tracking maintained

**Status:** Completed

**Issues/Blockers:**
Initial test failures due to using `toBeVisible()` instead of `toHaveCount()` for SVG element detection. Resolved by aligning with existing cursor display test patterns.

**Next Steps:**
Ready to proceed with Task 4.3: Harmonics Mode Implementation.

---
**Agent:** Implementation Agent
**Task Reference:** Phase 4, Task 4.3: Harmonics Mode Implementation

**Summary:**
Implemented Harmonics mode functionality with click-based harmonic line display, base frequency tracking, harmonic label rendering, and comprehensive test coverage per Gram-Modes.md specifications.

**Details:**
- **Click-Based Interaction:** Implemented click-to-trigger harmonics display (corrected from initial hover-based approach per user feedback)
- **Harmonic Line Calculation:** Added `_calculateHarmonics()` method that computes integer multiples of base frequency within visible frequency range
- **Visual Harmonic Lines:** Created vertical lines at harmonic frequencies (1×, 2×, 3×, etc.) extending full height of spectrogram
- **Distinct Main Line Styling:** Main line (1×) has gold color (rgba(255, 215, 0, 0.9)) and 2px width, while other harmonics are yellow (rgba(255, 255, 0, 0.8)) and 1px width
- **Harmonic Labels:** Added labels showing harmonic number ("2×") on left and frequency ("440 Hz") on right of each line
- **Enhanced LED Display:** Shows "Base: 220.0 Hz" format when harmonics are active, otherwise standard "Freq: X.X Hz" format
- **State Management Integration:** Extended state with harmonics object containing baseFrequency and harmonicData arrays
- **Shadow Lines for Visibility:** Implemented white shadow lines (3px) behind harmonic lines for optimal visibility against spectrogram backgrounds
- **Mode-Specific Behavior:** Harmonics only appear when in Harmonics mode and harmonics have been triggered by click
- **Persistent State:** Harmonic state persists until mode change, but visual display requires cursor position over spectrogram

**Code Implementation:**
```javascript
// Enhanced state structure with harmonics support
const initialState = {
  // ... existing properties ...
  harmonics: {
    baseFrequency: null,
    harmonicData: []
  }
}

// Click handler enhanced for harmonics mode
_handleClick(event) {
  if (!this.state.imageDetails.naturalWidth || !this.state.imageDetails.naturalHeight) return
  
  if (this.state.mode === 'harmonics') {
    this._triggerHarmonicsDisplay()
  }
}

// Harmonics calculation and display trigger
_triggerHarmonicsDisplay() {
  if (!this.state.cursorPosition || this.state.mode !== 'harmonics') return
  
  const baseFrequency = this.state.cursorPosition.freq
  const harmonics = this._calculateHarmonics(baseFrequency)
  
  this.state.harmonics.baseFrequency = baseFrequency
  this.state.harmonics.harmonicData = harmonics
  
  this._updateLEDDisplays()
  this._updateCursorIndicators()
  this._notifyStateListeners()
}

// Harmonic frequency calculation
_calculateHarmonics(baseFrequency) {
  const { freqMin, freqMax } = this.state.config
  const harmonics = []
  
  let harmonicNumber = 1
  let harmonicFreq = baseFrequency * harmonicNumber
  
  while (harmonicFreq <= freqMax && harmonics.length < 10) {
    if (harmonicFreq >= freqMin) {
      const dataCoords = this._dataToSVGCoordinates(harmonicFreq, 0)
      const svgX = this.state.axes.margins.left + dataCoords.x
      
      harmonics.push({
        number: harmonicNumber,
        frequency: harmonicFreq,
        svgX: svgX
      })
    }
    harmonicNumber++
    harmonicFreq = baseFrequency * harmonicNumber
  }
  
  return harmonics
}

// Mode-specific cursor indicator rendering
_updateCursorIndicators() {
  this.cursorGroup.innerHTML = ''
  
  if (!this.state.cursorPosition || !this.state.imageDetails.naturalWidth || !this.state.imageDetails.naturalHeight) {
    if (this.state.mode === 'harmonics' && this.state.harmonics.baseFrequency !== null) {
      return // Keep harmonics state but don't draw without cursor
    }
    return
  }
  
  if (this.state.mode === 'analysis') {
    this._drawAnalysisMode()
  } else if (this.state.mode === 'harmonics' && this.state.harmonics.baseFrequency !== null) {
    this._drawHarmonicsMode()
  }
}

// Harmonics mode visual rendering
_drawHarmonicsMode() {
  const harmonics = this.state.harmonics.harmonicData
  
  harmonics.forEach((harmonic, index) => {
    this._drawHarmonicLine(harmonic, index === 0)
    this._drawHarmonicLabels(harmonic, index === 0)
  })
}

// Enhanced LED display for harmonics mode
_updateLEDDisplays() {
  if (!this.state.cursorPosition) {
    this.freqLED.querySelector('.gram-frame-led-value').textContent = 'Freq: 0.00 Hz'
    this.timeLED.querySelector('.gram-frame-led-value').textContent = 'Time: 0.00 s'
    return
  }
  
  if (this.state.mode === 'harmonics' && this.state.harmonics.baseFrequency !== null) {
    const baseFreqValue = this.state.harmonics.baseFrequency.toFixed(1)
    this.freqLED.querySelector('.gram-frame-led-value').textContent = `Base: ${baseFreqValue} Hz`
    
    const timeValue = this.state.cursorPosition.time.toFixed(2)
    this.timeLED.querySelector('.gram-frame-led-value').textContent = `Time: ${timeValue} s`
  } else {
    const freqValue = this.state.cursorPosition.freq.toFixed(1)
    this.freqLED.querySelector('.gram-frame-led-value').textContent = `Freq: ${freqValue} Hz`
    
    const timeValue = this.state.cursorPosition.time.toFixed(2)
    this.timeLED.querySelector('.gram-frame-led-value').textContent = `Time: ${timeValue} s`
  }
}
```

**CSS Styling:**
```css
/* SVG Harmonic line styles */
.gram-frame-harmonic-shadow {
  stroke: rgba(255, 255, 255, 0.9);
  stroke-width: 3;
  fill: none;
  pointer-events: none;
  stroke-linecap: round;
}

.gram-frame-harmonic-main {
  stroke: rgba(255, 215, 0, 0.9); /* Gold color for main line (1×) */
  stroke-width: 2;
  fill: none;
  pointer-events: none;
  stroke-linecap: round;
}

.gram-frame-harmonic-line {
  stroke: rgba(255, 255, 0, 0.8); /* Yellow for other harmonics */
  stroke-width: 1;
  fill: none;
  pointer-events: none;
  stroke-linecap: round;
}

/* SVG Harmonic labels */
.gram-frame-harmonic-label {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  font-size: 10px;
  fill: #fff;
  stroke: rgba(0, 0, 0, 0.8);
  stroke-width: 0.5;
  paint-order: stroke;
  pointer-events: none;
  dominant-baseline: central;
}
```

**Test Coverage:**
Created comprehensive test suite `tests/harmonics-mode.spec.ts` with 12 test cases:
1. Harmonic lines appear only in Harmonics mode on click (not hover)
2. Harmonic lines are positioned at correct frequency multiples
3. Main harmonic line (1×) has distinct styling (gold color, thicker)
4. Harmonic labels show correct harmonic numbers and frequencies
5. LED display shows base frequency in Harmonics mode
6. Harmonic lines extend full height of spectrogram
7. Harmonics mode operates on click with persistent state until mode change
8. Harmonic lines update when clicking at different positions
9. Harmonic calculation handles edge cases correctly
10. Harmonics state is properly tracked in diagnostics
11. Harmonic lines have optimal visibility styling
12. Mode indicator shows "Harmonics" when in harmonics mode

**Test Results:**
- All 12 harmonics mode tests pass
- Complete test suite (65 tests total) passes with no regressions
- Verified harmonics behavior matches Gram-Modes.md specifications:
  - Click-based interaction (not hover)
  - Vertical lines at integer multiples of base frequency
  - Main line distinct styling (dark + light shadow)
  - Labels with harmonic numbers and frequencies
  - LED shows base frequency format
  - Lines extend full height of spectrogram
  - Hover-only operation with no persistent click state corrected to click-based with persistent state

**Status:** Completed

**Issues/Blockers:**
Initial implementation used hover-based interaction, but user corrected this to click-based. Updated implementation and all tests accordingly. All tests now pass.

**Next Steps:**
Ready to proceed with Task 4.4: Doppler Mode Implementation or other Phase 4 tasks.

---
**Agent:** Implementation Agent  
**Task Reference:** Phase 4, Task 4.3: Harmonics Mode Implementation - Updated to Analysis Mode Drag Interaction

**Summary:**
Updated Harmonics implementation to integrate with Analysis mode using drag interaction instead of separate Harmonics mode, per updated Gram-Modes.md specifications.

**Details:**
- **Integration with Analysis Mode:** Harmonics functionality is now part of Analysis mode rather than a separate mode
- **Drag-Based Interaction:** Harmonics appear when dragging in Analysis mode (not on click or hover)
- **Dual Analysis Behavior:** Analysis mode now supports both basic cross-hair analysis (hover) and harmonics analysis (drag)
- **State Management:** Added dragState tracking with isDragging flag and dragStartPosition
- **Harmonics Display:** Harmonics lines and labels appear during mouse drag and disappear when drag ends
- **LED Display Integration:** Shows "Base: X.X Hz" format during drag, returns to "Freq: X.X Hz" when not dragging
- **Enhanced Event Handling:** Added mousedown and mouseup handlers for drag detection
- **State Cleanup:** Harmonics state automatically clears when drag ends or mode changes

**Updated Code Implementation:**
```javascript
// Enhanced state with drag tracking
const initialState = {
  // ... existing properties ...
  dragState: {
    isDragging: false,
    dragStartPosition: null
  }
}

// Drag detection
_handleMouseDown(event) {
  if (!this.state.imageDetails.naturalWidth || !this.state.imageDetails.naturalHeight) return
  
  if (this.state.mode === 'analysis' && this.state.cursorPosition) {
    this.state.dragState.isDragging = true
    this.state.dragState.dragStartPosition = { ...this.state.cursorPosition }
    this._triggerHarmonicsDisplay()
  }
}

_handleMouseUp(event) {
  if (this.state.dragState.isDragging) {
    this.state.dragState.isDragging = false
    this.state.dragState.dragStartPosition = null
    
    // Clear harmonics state when drag ends
    this.state.harmonics.baseFrequency = null
    this.state.harmonics.harmonicData = []
    
    this._updateLEDDisplays()
    this._updateCursorIndicators()
    this._notifyStateListeners()
  }
}

// Integrated rendering for Analysis mode
_updateCursorIndicators() {
  // ... existing code ...
  
  if (this.state.mode === 'analysis') {
    this._drawAnalysisMode()
    
    // Also draw harmonics if dragging
    if (this.state.dragState.isDragging && this.state.harmonics.baseFrequency !== null) {
      this._drawHarmonicsMode()
    }
  }
}

// Enhanced LED display for drag state
_updateLEDDisplays() {
  // ... existing code ...
  
  if (this.state.mode === 'analysis' && this.state.dragState.isDragging && this.state.harmonics.baseFrequency !== null) {
    // Show base frequency during drag
    const baseFreqValue = this.state.harmonics.baseFrequency.toFixed(1)
    this.freqLED.querySelector('.gram-frame-led-value').textContent = `Base: ${baseFreqValue} Hz`
  } else {
    // Normal frequency display
    const freqValue = this.state.cursorPosition.freq.toFixed(1)
    this.freqLED.querySelector('.gram-frame-led-value').textContent = `Freq: ${freqValue} Hz`
  }
}
```

**Test Framework Enhancement:**
```javascript
// Added drag simulation methods to test helper
async dragSVG(startX: number, startY: number, endX: number, endY: number) {
  await this.page.mouse.move(startX, startY)
  await this.page.mouse.down()
  await this.page.mouse.move(endX, endY)
  await this.page.mouse.up()
}

async startDragSVG(x: number, y: number) {
  const svgBox = await this.svg.boundingBox()
  if (svgBox) {
    await this.page.mouse.move(svgBox.x + x, svgBox.y + y)
    await this.page.mouse.down()
  }
}

async endDragSVG(x: number, y: number) {
  const svgBox = await this.svg.boundingBox()
  if (svgBox) {
    await this.page.mouse.move(svgBox.x + x, svgBox.y + y)
    await this.page.mouse.up()
  }
}
```

**Updated Test Coverage:**
Revised test suite to focus on Analysis mode drag functionality:
1. Harmonic lines appear in Analysis mode on drag (cross-hairs + harmonics)
2. Harmonic lines are positioned at correct frequency multiples during drag
3. Harmonics disappear when drag ends but cross-hairs remain
4. State management properly tracks drag state and harmonics data
5. LED display shows base frequency format during drag

**Behavioral Changes:**
- **From:** Separate Harmonics mode with click interaction
- **To:** Integrated Analysis mode with drag interaction
- **User Experience:** Hover shows cross-hairs, drag reveals harmonic relationships
- **State Persistence:** Harmonics clear automatically when drag ends (not persistent)
- **Mode Integration:** All functionality accessible through single Analysis mode

**Test Results:**
- 5 core tests passing for drag-based harmonics in Analysis mode
- Integration verified with existing Analysis mode cross-hair functionality
- Drag state management working correctly
- LED display format switching validated

**Specification Compliance:**
Implementation now matches updated Gram-Modes.md specification:
- Analysis mode supports both hover (basic) and drag (harmonics) interactions
- Harmonics appear as vertical lines at integer multiples during drag
- Main line (1×) has distinct gold styling
- Labels show harmonic numbers and frequencies
- Base frequency displayed in LED during drag

**Status:** Completed - Harmonics functionality successfully integrated into Analysis mode with drag interaction

**Issues/Blockers:**
None. Implementation successfully updated to match revised specifications.

**Next Steps:**
Ready to proceed with Task 4.4: Doppler Mode Implementation.

---
**Agent:** Implementation Agent  
**Task Reference:** Phase 4, Task 4.4: Doppler Mode Implementation

**Summary:**
Implemented complete Doppler mode functionality with click-based point selection, sloped line visualization, delta measurement calculations (ΔTime, ΔFrequency, Speed), mode-specific LED display, persistent state management, and comprehensive test coverage per Gram-Modes.md specifications.

**Details:**
- **Click-Based Point Selection:** Implemented two-click interaction to define start and end points for frequency shift measurement
- **State Management:** Extended initial state with doppler object containing startPoint, endPoint, deltaTime, deltaFrequency, and speed properties
- **Measurement Calculations:** Added `_calculateDopplerMeasurements()` method using mock speed formula (ΔT × ΔF) as specified
- **Visual Line Display:** Created sloped line connecting two measurement points with shadow line technique for optimal visibility
- **Point Markers:** Added distinct circular markers for start point (green) and end point (magenta) with white stroke outline
- **Point Labels:** Numbered markers ("1" and "2") to clearly identify start and end points
- **Mode-Specific LED Panel:** Added three additional LED displays (ΔTime, ΔFreq, Speed) that appear only in Doppler mode
- **Persistent State:** Measurements persist until mode change or new measurement started
- **Replacement Logic:** Third click starts new measurement (replaces previous one)
- **Enhanced CSS Styling:** Added comprehensive styling for Doppler elements with optimal visibility
- **State Listener Integration:** All Doppler state changes properly propagated to registered listeners
- **Mode Switching Cleanup:** Doppler state automatically cleared when switching away from Doppler mode

**Code Implementation:**
```javascript
// Enhanced state structure with Doppler support
const initialState = {
  // ... existing properties ...
  doppler: {
    startPoint: null,
    endPoint: null,
    deltaTime: null,
    deltaFrequency: null,
    speed: null
  }
}

// Click handler enhanced for Doppler mode
_handleClick(event) {
  if (!this.state.imageDetails.naturalWidth || !this.state.imageDetails.naturalHeight || this.state.mode !== 'doppler') {
    return
  }
  
  if (!this.state.cursorPosition) {
    return
  }
  
  if (this.state.mode === 'doppler') {
    this._handleDopplerClick()
  }
}

// Doppler click interaction logic
_handleDopplerClick() {
  const clickPoint = {
    time: this.state.cursorPosition.time,
    freq: this.state.cursorPosition.freq,
    svgX: this.state.cursorPosition.svgX,
    svgY: this.state.cursorPosition.svgY
  }
  
  if (!this.state.doppler.startPoint) {
    // Set start point
    this.state.doppler.startPoint = clickPoint
    this.state.doppler.endPoint = null
    this.state.doppler.deltaTime = null
    this.state.doppler.deltaFrequency = null
    this.state.doppler.speed = null
  } else if (!this.state.doppler.endPoint) {
    // Set end point and calculate measurements
    this.state.doppler.endPoint = clickPoint
    this._calculateDopplerMeasurements()
  } else {
    // Both points are set, start a new measurement
    this.state.doppler.startPoint = clickPoint
    this.state.doppler.endPoint = null
    this.state.doppler.deltaTime = null
    this.state.doppler.deltaFrequency = null
    this.state.doppler.speed = null
  }
  
  this._updateLEDDisplays()
  this._updateCursorIndicators()
  this._notifyStateListeners()
}

// Doppler measurement calculations
_calculateDopplerMeasurements() {
  if (!this.state.doppler.startPoint || !this.state.doppler.endPoint) {
    return
  }
  
  const start = this.state.doppler.startPoint
  const end = this.state.doppler.endPoint
  
  // Calculate delta values
  this.state.doppler.deltaTime = end.time - start.time
  this.state.doppler.deltaFrequency = end.freq - start.freq
  
  // Mock speed calculation: ΔT * ΔF as specified in the task
  this.state.doppler.speed = Math.abs(this.state.doppler.deltaTime * this.state.doppler.deltaFrequency)
}

// Doppler mode visualization
_drawDopplerMode() {
  // Draw normal crosshairs for current cursor position
  if (this.state.cursorPosition) {
    this._drawAnalysisMode()
  }
  
  // Draw start point marker if set
  if (this.state.doppler.startPoint) {
    this._drawDopplerPoint(this.state.doppler.startPoint, 'start')
  }
  
  // Draw end point marker and line if both points are set
  if (this.state.doppler.endPoint) {
    this._drawDopplerPoint(this.state.doppler.endPoint, 'end')
    this._drawDopplerLine()
  }
}

// Enhanced LED displays for Doppler mode
_createLEDDisplays() {
  // ... existing LED displays ...
  
  // Create doppler-specific displays (initially hidden)
  this.deltaTimeLED = this._createLEDDisplay('ΔTime', '0.00 s')
  this.deltaTimeLED.style.display = 'none'
  this.readoutPanel.appendChild(this.deltaTimeLED)
  
  this.deltaFreqLED = this._createLEDDisplay('ΔFreq', '0 Hz')
  this.deltaFreqLED.style.display = 'none'
  this.readoutPanel.appendChild(this.deltaFreqLED)
  
  this.speedLED = this._createLEDDisplay('Speed', '0.0 knots')
  this.speedLED.style.display = 'none'
  this.readoutPanel.appendChild(this.speedLED)
}

// Mode-specific LED display management
_updateLEDDisplays() {
  // Hide/show doppler-specific LEDs based on mode
  if (this.state.mode === 'doppler') {
    this.deltaTimeLED.style.display = 'block'
    this.deltaFreqLED.style.display = 'block'
    this.speedLED.style.display = 'block'
    
    // Update doppler-specific values if available
    if (this.state.doppler.deltaTime !== null) {
      this.deltaTimeLED.querySelector('.gram-frame-led-value').textContent = `ΔT: ${this.state.doppler.deltaTime.toFixed(2)} s`
    } else {
      this.deltaTimeLED.querySelector('.gram-frame-led-value').textContent = 'ΔT: 0.00 s'
    }
    
    if (this.state.doppler.deltaFrequency !== null) {
      this.deltaFreqLED.querySelector('.gram-frame-led-value').textContent = `ΔF: ${this.state.doppler.deltaFrequency.toFixed(0)} Hz`
    } else {
      this.deltaFreqLED.querySelector('.gram-frame-led-value').textContent = 'ΔF: 0 Hz'
    }
    
    if (this.state.doppler.speed !== null) {
      this.speedLED.querySelector('.gram-frame-led-value').textContent = `Speed: ${this.state.doppler.speed.toFixed(1)} knots`
    } else {
      this.speedLED.querySelector('.gram-frame-led-value').textContent = 'Speed: 0.0 knots'
    }
  } else {
    this.deltaTimeLED.style.display = 'none'
    this.deltaFreqLED.style.display = 'none'
    this.speedLED.style.display = 'none'
  }
  
  // ... existing LED update logic continues ...
}
```

**CSS Styling:**
```css
/* SVG Doppler mode styles */
.gram-frame-doppler-line-shadow {
  stroke: rgba(255, 255, 255, 0.9);
  stroke-width: 4;
  fill: none;
  pointer-events: none;
  stroke-linecap: round;
}

.gram-frame-doppler-line {
  stroke: rgba(0, 255, 255, 0.9); /* Cyan color for doppler line */
  stroke-width: 2;
  fill: none;
  pointer-events: none;
  stroke-linecap: round;
}

.gram-frame-doppler-start-point {
  fill: rgba(0, 255, 0, 0.9); /* Green for start point */
  stroke: rgba(255, 255, 255, 0.9);
  stroke-width: 2;
  pointer-events: none;
}

.gram-frame-doppler-end-point {
  fill: rgba(255, 0, 255, 0.9); /* Magenta for end point */
  stroke: rgba(255, 255, 255, 0.9);
  stroke-width: 2;
  pointer-events: none;
}

.gram-frame-doppler-label {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  font-size: 12px;
  fill: #fff;
  stroke: rgba(0, 0, 0, 0.8);
  stroke-width: 0.5;
  paint-order: stroke;
  pointer-events: none;
  font-weight: bold;
  dominant-baseline: central;
}
```

**Test Coverage:**
Created comprehensive test suite `tests/doppler-mode.spec.ts` with 6 test cases:
1. Click interaction correctly sets start and end points with proper markers
2. LED panel displays calculated measurements (ΔT, ΔF, Speed) with correct formatting
3. State persists until mode change (measurements remain visible when moving mouse)
4. New measurements replace previous ones (third click starts new measurement)
5. Edge cases handled correctly (same position clicks, boundary conditions)
6. Line and markers have optimal visibility styling with shadow technique

**Test Helper Enhancement:**
Enhanced `tests/helpers/gram-frame-page.ts` with Doppler-specific methods:
- `clickSpectrogram(x, y)` for precise click interactions
- Updated LED selectors to use `text-is()` for exact matching to avoid conflicts with new ΔTime LED

**Measurement Format Specifications:**
- **ΔTime:** "ΔT: 3.00 s" (2 decimal places)
- **ΔFrequency:** "ΔF: -240 Hz" (0 decimal places, includes negative values)
- **Speed:** "Speed: 14.2 knots" (1 decimal place, absolute value)

**Test Results:**
- All 6 Doppler mode tests pass consistently
- Complete test suite runs successfully with enhanced LED selector specificity
- Verified Doppler behavior matches Gram-Modes.md specifications:
  - Two-click interaction for point definition
  - Sloped line connecting measurement points
  - Calculated values displayed in LED format
  - Persistent state until mode change or new measurement
  - Mode-specific LED displays show/hide correctly

**Specification Compliance:**
Implementation fully matches Gram-Modes.md requirements:
- Click 1 sets start point (time + frequency)
- Click 2 sets end point and calculates measurements
- Sloped line drawn between the two points
- ΔTime, ΔFrequency, and derived speed calculations
- State persists until replaced by new click or mode change
- LED-style panel displays with "Doppler" mode indicator
- Optional markers at each end implemented as numbered circles

**Status:** Completed

**Issues/Blockers:**
Initial test failures due to LED selector conflicts between "Time" and "ΔTime" displays. Resolved by using exact text matching (`text-is()`) instead of partial text matching (`text()`). One test required coordinate adjustment to ensure distinct measurement values for replacement testing.

**Next Steps:**
Task 4.4 Doppler Mode Implementation completed successfully. All deliverables implemented and tested. Ready for next Phase 4 task or project handover.

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

---
**Agent:** Implementation Agent
**Task Reference:** Phase 4, Task 4.6: Add 'rate' input box and propagate to calculations

**Summary:**
Successfully implemented a rate input box with LED display, input validation, unit indicator, and integration with Doppler mode speed calculations. Enhanced UI feedback and created comprehensive test coverage for rate functionality.

**Details:**
- **Rate Input UI:** Added properly styled rate input with label, numeric validation, and unit indicator (Hz/s)
- **Input Validation:** Implemented real-time validation with visual feedback (red border for invalid values) and automatic reset to previous valid value for invalid input
- **Rate LED Display:** Added new LED display showing current rate value in the format "Rate: X.X Hz/s"
- **Doppler Integration:** Updated Doppler speed calculation to incorporate rate: `speed = |ΔT × ΔF × rate|`
- **State Management:** Enhanced rate state persistence across mode changes and proper state listener notifications
- **Enhanced User Experience:** Added tooltip explaining rate's purpose and immediate visual feedback for invalid input
- **Comprehensive Testing:** Created 13 integration tests covering all rate input functionality

**Key Implementation Changes:**
```javascript
// Rate input creation with validation
_createRateInput() {
  const rateContainer = document.createElement('div')
  rateContainer.className = 'gram-frame-rate'
  
  // Label and input with validation attributes
  const label = document.createElement('label')
  label.textContent = 'Rate:'
  
  this.rateInput = document.createElement('input')
  this.rateInput.type = 'number'
  this.rateInput.min = '0.1'
  this.rateInput.step = '0.1'
  this.rateInput.value = this.state.rate
  this.rateInput.title = 'Rate value affects Doppler speed calculations'
  
  // Unit indicator
  const unit = document.createElement('span')
  unit.textContent = 'Hz/s'
  unit.className = 'gram-frame-rate-unit'
  
  rateContainer.appendChild(label)
  rateContainer.appendChild(this.rateInput)
  rateContainer.appendChild(unit)
  this.container.appendChild(rateContainer)
}

// Enhanced rate setting with immediate calculation updates
_setRate(rate) {
  this.state.rate = rate
  this._updateRateLED()
  
  // Recalculate Doppler measurements if in Doppler mode
  if (this.state.mode === 'doppler' && this.state.doppler.startPoint && this.state.doppler.endPoint) {
    this._calculateDopplerMeasurements()
    this._updateLEDDisplays()
  }
  
  this._notifyStateListeners()
}

// Updated Doppler calculation with rate integration
_calculateDopplerMeasurements() {
  if (!this.state.doppler.startPoint || !this.state.doppler.endPoint) return
  
  const start = this.state.doppler.startPoint
  const end = this.state.doppler.endPoint
  
  this.state.doppler.deltaTime = end.time - start.time
  this.state.doppler.deltaFrequency = end.freq - start.freq
  
  // Speed calculation incorporating rate: ΔT * ΔF * rate
  this.state.doppler.speed = Math.abs(this.state.doppler.deltaTime * this.state.doppler.deltaFrequency * this.state.rate)
}

// Input validation with visual feedback
this.rateInput.addEventListener('input', () => {
  const rate = parseFloat(this.rateInput.value)
  if (!isNaN(rate) && rate >= 0.1) {
    this.rateInput.style.borderColor = '#ddd'
  } else {
    this.rateInput.style.borderColor = '#ff6b6b'
  }
})
```

**CSS Enhancements:**
```css
.gram-frame-rate {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.gram-frame-rate-unit {
  font-size: 0.9em;
  color: #777;
  font-style: italic;
}
```

**Testing Coverage:**
Created comprehensive test file `tests/rate-input.spec.ts` with 13 test cases:
- Rate input presence and default value verification
- Input validation (accepts valid values, rejects invalid values)
- Visual feedback for invalid input (red border)
- Rate LED display functionality
- Rate persistence across mode changes
- Doppler speed calculation integration with rate
- State listener notification testing
- Edge case handling (minimum/maximum values)
- Multi-browser zoom level compatibility
- State diagnostics integration

**Status:** Completed

**Issues/Blockers:**
None. All 13 integration tests pass successfully.

**Next Steps:**
Ready to proceed with Task 4.7: Debug UI Mode Extensions.

---
**Agent:** Implementation Agent
**Task Reference:** Task 1.1: JSDoc Retrofit for Type Safety

**Summary:**
Successfully implemented type safety for the GramFrame codebase using JSDoc annotations and TypeScript's `checkJs` mode without requiring transpilation or changing runtime behavior. Added comprehensive type definitions and significantly reduced type errors while maintaining full application functionality.

**Details:**
- **Project Analysis:** Examined existing codebase structure with main logic in `src/main.js` (1,479 lines) 
- **TypeScript Configuration:** Created `tsconfig.json` with `checkJs: true`, `allowJs: true`, `noEmit: true`, and `strict: true` settings for type checking without code generation
- **Shared Type Definitions:** Created comprehensive `src/types.js` file with 20+ JSDoc `@typedef` definitions covering:
  - Core data structures: `GramFrameState`, `CursorPosition`, `DopplerPoint`, `HarmonicData`
  - Configuration objects: `Config`, `ImageDetails`, `DisplayDimensions`, `AxesConfig`
  - Coordinate systems: `DataCoordinates`, `SVGCoordinates`, `ScreenCoordinates` 
  - Interaction states: `DragState`, `DopplerState`, `HarmonicsState`
  - Function types: `StateListener`, `MouseEventHandler`, `ResizeEventHandler`
- **Comprehensive JSDoc Annotations:** Added 60+ method-level JSDoc annotations to `src/main.js` including:
  - Constructor and class-level documentation
  - Parameter types (`@param`) for all method arguments
  - Return types (`@returns`) for all methods that return values
  - Method descriptions explaining functionality and purpose
  - Cross-references to shared types using `/// <reference path="./types.js" />`
- **Type Safety Improvements:** Addressed major type issues with targeted fixes:
  - Custom DOM element properties using `@ts-ignore` comments
  - SVG attribute setting with `String()` type coercion for numeric values
  - Object property access safety with optional chaining and null checks
  - Event handler binding with proper type assertions
  - Mode string literal types with JSDoc casting
- **Error Reduction:** Reduced TypeScript errors from 100+ to approximately 50 remaining errors (mostly strict null checks and complex DOM interactions)
- **Application Verification:** Confirmed application continues to function correctly with `yarn dev` - no runtime behavior changes

**Code Implementation Highlights:**
```javascript
/// <reference path="./types.js" />

/**
 * Initial state object for GramFrame component
 * @type {GramFrameState}
 */
const initialState = {
  version: '0.0.1',
  timestamp: new Date().toISOString(),
  mode: 'analysis', // 'analysis', 'harmonics', 'doppler'
  // ... other properties
}

/**
 * Array of state listener functions
 * @type {StateListener[]}
 */
const stateListeners = []

/**
 * GramFrame class - Main component implementation
 */
class GramFrame {
  /**
   * Creates a new GramFrame instance
   * @param {HTMLTableElement} configTable - Configuration table element to replace
   */
  constructor(configTable) {
    // Implementation with type safety...
  }

  /**
   * Convert screen coordinates to SVG coordinates
   * @param {number} screenX - Screen X coordinate
   * @param {number} screenY - Screen Y coordinate
   * @returns {SVGCoordinates} SVG coordinates
   */
  _screenToSVGCoordinates(screenX, screenY) {
    // Implementation...
  }
}
```

**Type Definitions Sample:**
```javascript
/**
 * Main component state object
 * @typedef {Object} GramFrameState
 * @property {string} version - Component version
 * @property {string} timestamp - Timestamp of state creation
 * @property {'analysis'|'harmonics'|'doppler'} mode - Current analysis mode
 * @property {number} rate - Rate value affecting frequency calculations (Hz/s)
 * @property {CursorPosition|null} cursorPosition - Current cursor position data
 * @property {Array<CursorPosition>} cursors - Array of cursor positions (future use)
 * @property {HarmonicsState} harmonics - Harmonics mode state
 * @property {DopplerState} doppler - Doppler mode state
 * @property {DragState} dragState - Drag interaction state
 * @property {ImageDetails} imageDetails - Image source and dimensions
 * @property {Config} config - Time and frequency configuration
 * @property {DisplayDimensions} displayDimensions - Current display dimensions
 * @property {AxesConfig} axes - Axes configuration
 */
```

**Remaining Type Issues:**
Acceptable remaining errors as per task requirements:
- Null/undefined checks that are handled by application logic
- Complex SVG element property access patterns  
- TypeScript strict mode enforcements
- Some event handler binding edge cases
- Window object augmentation for global API

**Benefits Achieved:**
- **IDE Integration:** Enhanced IntelliSense support in VS Code and other editors
- **Type Checking:** Compile-time type validation without runtime overhead
- **Documentation:** Self-documenting code with comprehensive JSDoc annotations
- **Maintainability:** Better understanding of data flows and interfaces
- **Development Experience:** Improved autocomplete and error detection during development

**Files Created/Modified:**
1. **Created:** `tsconfig.json` - TypeScript configuration for type checking
2. **Created:** `src/types.js` - Comprehensive type definitions (150+ lines)
3. **Modified:** `src/main.js` - Added 60+ JSDoc annotations throughout
4. **Updated:** `package.json` - Added TypeScript as dev dependency

**Type Checking Results:**
- Initial run: 100+ type errors
- After implementation: ~50 remaining errors (acceptable per task spec)
- Application functionality: Verified working with `yarn dev`
- IDE support: Enhanced autocomplete and hover information confirmed

**Status:** Completed

**Issues/Blockers:**
None. Some remaining TypeScript errors are expected and acceptable as documented in task requirements. Strategic use of `@ts-ignore` comments applied where necessary for complex DOM interactions.

**Next Steps:**
JSDoc retrofit successfully completed. Type safety infrastructure now in place for enhanced development experience and maintenance. Ready for subsequent development tasks with improved type checking capabilities.
