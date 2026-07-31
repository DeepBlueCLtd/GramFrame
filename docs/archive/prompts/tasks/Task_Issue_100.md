# APM Task Assignment: Implement Pan as a Mode Extending BaseMode

## 1. Task Assignment

### Reference Implementation Plan
This assignment corresponds to GitHub Issue #100 - Move pan toggle to modes toolbar.

### Objective
Transform the pan functionality from a toggle overlay into a proper mode that extends BaseMode, making it the 4th interaction mode alongside Analysis, Harmonics, and Doppler. This resolves the conflict where users cannot drag harmonics when pan is active, as both compete for mouse drag interactions.

### Detailed Action Steps

1. **Create PanMode Class**
   - Create new file `src/modes/pan/PanMode.js` that extends BaseMode
   - Implement required BaseMode methods:
     - `activate()` - Enable pan cursor and set up pan state
     - `deactivate()` - Reset pan state and cursor
     - `handleMouseDown()` - Start pan drag operation
     - `handleMouseMove()` - Update pan position during drag
     - `handleMouseUp()` - End pan drag operation
     - `getGuidanceText()` - Return pan mode guidance
   - Move pan-specific logic from `src/core/events.js` into PanMode class
   - Ensure pan only works when zoom level > 1.0

2. **Update Mode Registration**
   - In `src/modes/ModeFactory.js`:
     - Import the new PanMode class
     - Add 'pan' to the mode registry
   - Update type definitions in `src/types.js`:
     - Add 'pan' to ModeType: `@typedef {'analysis' | 'harmonics' | 'doppler' | 'pan'} ModeType`

3. **Refactor Pan State Management**
   - Move pan-specific state from `state.zoom.panMode` to mode-specific state
   - Remove `_togglePan()` method from main.js
   - Remove `_panImage()` method from main.js and integrate into PanMode
   - Remove pan-specific event handling from `src/core/events.js` (lines 146-171, 220-235, 256-264)

4. **Update Mode Buttons Component**
   - In `src/components/ModeButtons.js`:
     - Add 'pan' to the modes array (line 25)
     - Ensure pan button appears with other mode buttons
     - Use '↔' icon for pan mode button

5. **Handle Zoom Integration**
   - Pan mode button should be disabled when zoom level is 1.0
   - When zoom resets to 1.0, automatically switch to previous mode if in pan mode
   - Update zoom controls to work with new pan mode architecture

6. **Remove Old Pan Toggle UI**
   - Remove pan toggle button from zoom controls (lines 393-398, 408, 419 in main.js)
   - Remove pan toggle styles from `src/gramframe.css` (lines 967-970)
   - Clean up any references to panToggleButton in zoom controls

7. **Update Initial State**
   - Add pan mode initial state to state.js
   - Ensure pan mode has proper initial state structure

8. **Update Tests**
   - Create new test file for pan mode if needed
   - Update any existing tests that reference pan toggle
   - Ensure mode switching tests include pan mode

### Provide Necessary Context/Assets

**Current Architecture Context:**
- Review ADR-008: Modular Mode System to understand how modes extend BaseMode
- Pan currently intercepts mouse events in `src/core/events.js` before they reach the active mode
- This creates conflicts - users cannot drag harmonics when pan is active
- Making pan a proper mode resolves this by making interactions mutually exclusive

**Key Code Locations:**
- Current pan logic in events.js: lines 146-171 (mouse move), 220-235 (mouse down), 256-264 (mouse up)
- Pan toggle creation: `src/main.js:393-398`
- Pan methods: `src/main.js:455-467` (_togglePan), `src/main.js:513-540` (_panImage)
- Mode factory: `src/modes/ModeFactory.js`
- Mode buttons: `src/components/ModeButtons.js`
- Example mode implementation: `src/modes/analysis/AnalysisMode.js`

**Important Constraints:**
- Pan only works when zoom level > 1.0
- When zoom resets to 1.0, must exit pan mode if active
- Pan cursor should be 'grab' when not dragging, 'grabbing' when dragging
- Must maintain zoom offset state during pan operations

## 4. Expected Output & Deliverables

### Define Success
- Pan is a proper mode that appears as the 4th button in the modes toolbar
- Users can switch between Analysis, Harmonics, Doppler, and Pan modes
- Pan mode prevents conflicts with other drag operations (like harmonic dragging)
- Pan only available when zoomed in (button disabled at 1:1 zoom)
- All tests pass with no regressions

### Specify Deliverables
1. New `src/modes/pan/PanMode.js` implementing pan as a proper mode
2. Updated `src/modes/ModeFactory.js` with pan mode registration
3. Updated `src/components/ModeButtons.js` to include pan as 4th mode
4. Updated `src/types.js` with pan in ModeType definition
5. Cleaned up `src/main.js` with pan logic removed
6. Cleaned up `src/core/events.js` with pan interception removed
7. Updated `src/gramframe.css` with pan button styling
8. Updated tests to handle new pan mode
9. Confirmation that `yarn test` passes
10. Confirmation that `yarn typecheck` passes

## 5. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

Adhere strictly to the established logging format as specified in [Memory_Bank_Log_Format.md](../02_Utility_Prompts_And_Format_Definitions/Memory_Bank_Log_Format.md). Ensure your log includes:
- A reference to GitHub Issue #100
- A clear description of the changes made to relocate the pan toggle
- Key code snippets showing the integration into ModeButtons.js
- Any challenges encountered (e.g., maintaining state references, styling consistency)
- Confirmation of successful test execution

## 6. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. Pay particular attention to:
- How the pan toggle callback should be passed between components
- Whether the pan toggle should be styled exactly like mode buttons or have subtle differences
- How to handle the disabled state when not zoomed