# APM Task Assignment: Move Pan Toggle to Modes Toolbar

## 1. Task Assignment

### Reference Implementation Plan
This assignment corresponds to GitHub Issue #100 - Move pan toggle to modes toolbar.

### Objective
Relocate the pan toggle button from its current position in the zoom controls to the modes toolbar, alongside the Analysis, Harmonics, and Doppler mode buttons, creating a more cohesive and intuitive interface.

### Detailed Action Steps

1. **Analyze Current Implementation**
   - Review the current pan toggle implementation in `src/main.js` (lines 393-398, 455-467)
   - Understand how the pan toggle is currently integrated with zoom controls
   - Note the existing event handler `_togglePan()` and its functionality
   - Review the current styling in `src/gramframe.css` (lines 967-970)

2. **Modify Mode Buttons Component**
   - Update `src/components/ModeButtons.js` to include the pan toggle button:
     - Add pan toggle button creation after the mode buttons loop (after line 48)
     - Ensure the button uses similar styling classes as mode buttons
     - Use the existing pan toggle icon '↔' with appropriate title
     - Connect to the existing `_togglePan()` method via callback

3. **Update Main Component Integration**
   - In `src/main.js`:
     - Remove pan toggle button creation from zoom controls (lines 393-398)
     - Remove pan toggle from zoom controls container (line 408)
     - Remove pan toggle from zoom controls object (line 419)
     - Update `createModeSwitchingUI` call to pass pan toggle callback
     - Store reference to pan toggle button from mode UI elements

4. **Refactor Pan Toggle State Management**
   - Update `_togglePan()` method to work with new button reference
   - Ensure pan mode state updates work with new button location
   - Update zoom level change handler to reference new button location (lines 546-551)

5. **Update Styling**
   - In `src/gramframe.css`:
     - Add styling for pan toggle as a mode toolbar button
     - Ensure visual consistency with existing mode buttons
     - Maintain the active state styling (similar to current `.gram-frame-pan-toggle.active`)
     - Remove or deprecate old pan toggle specific styles if no longer needed

6. **Update Tests**
   - Search for any tests that interact with pan toggle button
   - Update test selectors to find pan toggle in new location
   - Ensure all pan-related tests continue to pass

7. **Update Documentation**
   - Update any inline comments that reference pan toggle location
   - Ensure JSDoc comments accurately reflect the new structure

### Provide Necessary Context/Assets

**Current Architecture Context:**
- Review ADR-008: Modular Mode System to understand the mode button architecture
- The pan toggle is currently part of the zoom controls, positioned absolutely over the spectrogram
- The modes toolbar uses a flexbox layout with consistent button styling
- Pan mode functionality must remain unchanged - only the UI location changes

**Key Code Locations:**
- Pan toggle creation: `src/main.js:393-398`
- Pan toggle handler: `src/main.js:455-467`
- Mode buttons: `src/components/ModeButtons.js`
- Pan toggle styles: `src/gramframe.css:967-970`
- Mode button styles: Search for `.gram-frame-mode-btn` in CSS

**Important Constraints:**
- The pan toggle should maintain its current functionality exactly
- Keyboard shortcuts (if any) must continue to work
- The button must be disabled when zoom level is 1.0 (not zoomed)
- Visual consistency with mode buttons is critical

## 4. Expected Output & Deliverables

### Define Success
- Pan toggle button appears in the modes toolbar next to the mode buttons
- Pan toggle maintains all current functionality
- Visual consistency with other toolbar buttons
- All tests pass
- No regression in zoom or pan functionality

### Specify Deliverables
1. Modified `src/components/ModeButtons.js` with integrated pan toggle
2. Updated `src/main.js` with refactored pan toggle integration
3. Updated `src/gramframe.css` with appropriate styling
4. Any updated test files
5. Confirmation that `yarn test` passes
6. Confirmation that `yarn typecheck` passes

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