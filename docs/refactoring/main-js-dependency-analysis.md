# Main.js Dependency Analysis for Refactoring

**Date:** 2025-07-21  
**Purpose:** Phase 0 analysis for refactoring main.js (~2100 lines) into modular architecture  
**Branch:** refactor-main-js  
**Baseline Test Status:** ✅ All 84 tests passing  

## Executive Summary

The main.js file contains a complex, tightly-coupled system with 7 major functional areas. The analysis reveals significant challenges for refactoring, particularly around state management, coordinate transformations, and event handling. A phased approach is critical to avoid breaking the extensive test suite.

## 1. Function/Method Inventory

### Public API Methods (12 methods)
- `init()` - Main initialization entry point
- `detectAndReplaceConfigTables(container)` - Scans and replaces config tables  
- `initializeTable(tableOrSelector)` - Manual table initialization
- `addStateListener(callback)` - Adds state change listeners
- `removeStateListener(callback)` - Removes state listeners  
- `toggleCanvasBoundsOverlay()` - Future feature placeholder
- `setDebugGrid(visible)` - Future feature placeholder
- `forceUpdate()` - Forces state updates on all instances
- `getInstances()` - Returns all active instances
- `getInstance(instanceId)` - Gets instance by ID
- `destroy()` - Cleanup method for instances

### Private Methods by Category

#### State Management (8 methods)
- `_switchMode(mode)` - Mode switching logic
- `_setRate(rate)` - Rate value updates  
- `_notifyStateListeners()` - Broadcasts state changes
- `_updateLEDDisplays()` - LED value updates
- `_updateModeLED()` - Mode display updates
- `_updateRateLED()` - Rate display updates
- `_updateDisplayVisibility()` - Updates LED visibility based on mode
- `_calculateDopplerMeasurements()` - Doppler calculations

#### Event Handlers (9 methods)  
- `_handleMouseMove(event)` - Mouse movement tracking
- `_handleMouseLeave(event)` - Mouse leave cleanup
- `_handleClick(event)` - Click processing for Doppler mode
- `_handleMouseDown(event)` - Drag start for Analysis mode
- `_handleMouseUp(event)` - Drag end processing
- `_handleResize()` - Window resize handler
- `_handleSVGResize(containerRect)` - SVG resize calculations
- `_handleDopplerClick()` - Doppler mode click processing
- `_setupEventListeners()` - Sets up all event handlers

#### Coordinate System (5 methods)
- `_screenToSVGCoordinates(screenX, screenY)` - Screen to SVG conversion
- `_svgToDataCoordinates(svgX, svgY)` - SVG to data conversion  
- `_imageToDataCoordinates(imageX, imageY)` - Image to data conversion
- `_dataToSVGCoordinates(freq, time)` - Data to SVG conversion
- `_svgToScreenCoordinates(svgX, svgY)` - SVG to screen conversion

#### Rendering Functions (13 methods)
- `_drawAxes()` - Main axis drawing coordinator
- `_clearAxes()` - Clears existing axes
- `_drawTimeAxis()` - Vertical time axis  
- `_drawFrequencyAxis()` - Horizontal frequency axis
- `_updateCursorIndicators()` - Cursor visual updates
- `_drawAnalysisMode()` - Analysis mode visuals
- `_drawHarmonicsMode()` - Harmonic line rendering
- `_drawDopplerMode()` - Doppler mode visuals
- `_drawDopplerPoint(point, type)` - Individual Doppler points
- `_drawDopplerLine()` - Line between Doppler points  
- `_drawHarmonicLine(harmonic, isMainLine)` - Individual harmonic lines
- `_drawHarmonicLabels(harmonic, isMainLine)` - Harmonic labels

#### UI Components (7 methods)
- `_createLEDDisplays()` - Creates LED display elements
- `_createModeSwitchingUI()` - Creates mode switching buttons
- `_createRateInput()` - Creates rate input control
- `_createLEDDisplay(label, value)` - Creates individual LED displays

#### Analysis Functions (3 methods)
- `_calculateHarmonics(baseFrequency)` - Harmonic frequency calculations
- `_triggerHarmonicsDisplay()` - Harmonics calculation trigger

#### Lifecycle/Setup (4 methods)
- `_extractConfigData()` - Parses config table data
- `_setupResizeObserver()` - Sets up responsive behavior
- `_cleanupEventListeners()` - Removes event listeners
- `_validateConfigTable(table)` - Validates table structure

## 2. Critical Dependencies

### State Access Patterns
**Heavy State Readers:** Nearly all functions access `this.state`
- `this.state.config.{timeMin, timeMax, freqMin, freqMax}` - All coordinate functions
- `this.state.imageDetails.{naturalWidth, naturalHeight}` - All positioning  
- `this.state.axes.margins` - All SVG positioning
- `this.state.cursorPosition` - All mouse interactions
- `this.state.mode` - Mode-specific logic
- `this.state.rate` - Frequency calculations

**State Modifiers:** 
- Event handlers directly modify state properties
- `_calculateDopplerMeasurements()` updates doppler state
- `_triggerHarmonicsDisplay()` updates harmonics state
- `_switchMode()` clears mode-specific state

### DOM Element Dependencies
**SVG Element References (high coupling):**
- `this.svg` - Main SVG container
- `this.mainGroup` - Content group with margins  
- `this.svgImage` - Spectrogram image element
- `this.timeAxisGroup`, `this.freqAxisGroup` - Axis containers
- `this.cursorGroup` - Cursor indicators

**UI Element References:**
- `this.readoutPanel` - LED display container
- Multiple LED display elements (`this.timeLED`, `this.freqLED`, etc.)
- Mode button elements (`this.modeButtons`)

### Event Handler Context Binding
All event handlers require `.bind(this)` for proper context:
```javascript
this._boundHandleMouseMove = this._handleMouseMove.bind(this)
this._boundHandleMouseLeave = this._handleMouseLeave.bind(this)  
this._boundHandleClick = this._handleClick.bind(this)
// ... etc
```

## 3. Circular Dependency Risks

### High Risk Areas:
1. **EventHandlers ↔ Renderer:** 
   - Event handlers call rendering functions (`_updateCursorIndicators`)
   - Renderers might need event state information

2. **StateManager ↔ EventHandlers:**
   - State changes trigger event handler updates
   - Event handlers directly modify state properties

3. **Renderer ↔ CoordinateSystem:**
   - Renderers need coordinate transformations for positioning
   - Coordinate system needs render dimensions/margins

### Medium Risk Areas:
1. **UIComponents ↔ StateManager:**
   - UI components need state for display updates
   - State changes trigger UI updates

2. **AnalysisEngine ↔ StateManager:**
   - Analysis functions modify state (harmonics, doppler)
   - Analysis triggered by state changes

## 4. Proposed Module Boundaries (Revised)

Based on dependency analysis, here are the safest extraction boundaries:

### Phase 1: Pure Utilities (Lowest Risk)
**Module: `utils/coordinates.js`**
```javascript
// Pure coordinate transformation functions
- _screenToSVGCoordinates()
- _svgToDataCoordinates() 
- _imageToDataCoordinates()
- _dataToSVGCoordinates()
- _svgToScreenCoordinates()
```
**Dependencies:** Minimal state access (config, imageDetails, margins)
**Risk Level:** LOW - Pure functions with clear inputs/outputs

**Module: `utils/calculations.js`**  
```javascript
// Pure calculation functions
- _calculateHarmonics()
- _capitalizeFirstLetter()
```
**Dependencies:** Minimal
**Risk Level:** LOW

### Phase 2: State Management (Medium Risk)
**Module: `core/state.js`**
```javascript
// State object and listener management
- initialState object
- globalStateListeners array  
- _notifyStateListeners()
- State initialization helpers
```
**Dependencies:** None (self-contained)
**Risk Level:** MEDIUM - Central to all functionality

### Phase 3: UI Components (Medium Risk)  
**Module: `components/UIComponents.js`** (Combined to avoid over-granularity)
```javascript
// All UI creation and management
- _createLEDDisplays()
- _createModeSwitchingUI() 
- _createRateInput()
- _createLEDDisplay()
- _updateLEDDisplays()
- _updateDisplayVisibility()
- _updateModeLED()
- _updateRateLED()
```
**Dependencies:** StateManager, DOM manipulation
**Risk Level:** MEDIUM - State dependent but UI-focused

### Phase 4: Analysis Engine (Medium Risk)
**Module: `core/analysis.js`**
```javascript  
// Analysis calculations and triggers
- _calculateDopplerMeasurements()
- _triggerHarmonicsDisplay()
```
**Dependencies:** StateManager, Coordinates
**Risk Level:** MEDIUM - State modification but isolated logic

### Phase 5: Event Handling (High Risk)
**Module: `core/events.js`**
```javascript
// Event handler orchestration
- _setupEventListeners()  
- _cleanupEventListeners()
- All _handle* methods
```
**Dependencies:** StateManager, Renderer, Coordinates, Analysis
**Risk Level:** HIGH - Complex interdependencies

### Phase 6: Renderer (High Risk)
**Module: `core/renderer.js`**
```javascript
// All SVG rendering and visual updates
- All _draw* methods
- _updateCursorIndicators()  
- _clearAxes()
```
**Dependencies:** Coordinates, StateManager, DOM elements
**Risk Level:** HIGH - Heavy DOM coupling

### Phase 7: Main Class (Highest Risk)
**Module: `core/GramFrame.js`**
```javascript
// Main class coordination
- Constructor and initialization
- _extractConfigData()
- _setupResizeObserver()  
- Public API methods
- destroy()
```
**Dependencies:** ALL other modules
**Risk Level:** HIGHEST - Integration point

## 5. Safety Recommendations

### Git Strategy
- ✅ Feature branch created: `refactor-main-js`
- ✅ Baseline tests verified: 84/84 passing
- Commit after each successful module extraction
- Never proceed if tests fail

### Testing Strategy  
- **Automated:** Run `yarn test` after every extraction
- **Manual verification checklist:**
  - Component renders on debug.html
  - Mouse tracking works (hover, click, drag)  
  - LED displays update correctly
  - Mode switching functions
  - Rate input updates calculations
  - HMR still works

### Rollback Plan
- Each phase committed separately
- Immediate rollback on test failures  
- Maximum one module extraction per session
- Get confirmation before proceeding to next phase

### Critical Integration Points
1. **State Object Access:** Design dependency injection pattern
2. **DOM Element References:** Consider element registry/accessor pattern
3. **Event Context Binding:** Plan context preservation strategy  
4. **HMR Preservation:** Test HMR after main class refactor

## 6. Recommended Extraction Order

1. **Phase 1a:** Extract `utils/coordinates.js` (5 functions)
2. **Phase 1b:** Extract `utils/calculations.js` (2 functions)  
3. **Phase 2:** Extract `core/state.js` (state + listeners)
4. **Phase 3:** Extract `components/UIComponents.js` (8 functions)
5. **Phase 4:** Extract `core/analysis.js` (2 functions)
6. **Phase 5:** Extract `core/events.js` (9 functions)
7. **Phase 6:** Extract `core/renderer.js` (13 functions)
8. **Phase 7:** Refactor `core/GramFrame.js` (main class)
9. **Phase 8:** Create `index.js` entry point and API layer

## 7. Success Metrics

- ✅ All 84 tests continue to pass
- ✅ HMR functionality preserved  
- ✅ No performance degradation
- ✅ Public API unchanged
- ✅ State listener pattern intact
- ✅ Clean module boundaries with no circular dependencies

## 8. Next Steps

**Ready for Phase 1a:** Extract coordinate transformation utilities to `src/utils/coordinates.js`

This analysis provides the foundation for safe, incremental refactoring while preserving all existing functionality.