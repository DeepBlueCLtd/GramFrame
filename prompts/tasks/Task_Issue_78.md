# APM Task Assignment: Keyboard Fine Control for Harmonic Spacing and Marker Positioning

## 1. Agent Role & APM Context

You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project. Your role is to execute assigned tasks diligently and log your work meticulously to the project's Memory Bank. You will interact with the Manager Agent via the User and must ensure all work is properly documented for future reference.

## 2. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to GitHub Issue #78 for implementing keyboard fine control functionality across all GramFrame modes.

**Objective:** Add keyboard arrow key support for fine-grained control of marker and harmonic positioning with variable increment sizes based on modifier keys, including a selection system for table entries.

**Detailed Action Steps:**

1. **Analyze Current Architecture:**
   - Review the existing state management system in `src/core/state.js`
   - Examine current marker and harmonic implementation across modes:
     - Analysis mode: `src/modes/analysis/AnalysisMode.js` 
     - Harmonics mode: `src/modes/harmonics/HarmonicsMode.js`
     - Doppler mode: `src/modes/doppler/DopplerMode.js`
   - Study the table rendering components for markers and harmonic sets
   - Review coordinate transformation utilities in `src/utils/coordinates.js`

2. **Implement Selection System:**
   - Add selection state tracking to the centralized state management system
   - Implement click handlers for table entries in markers and harmonic sets tables
   - Add visual feedback (reverse colors highlighting) for selected entries
   - Ensure auto-selection occurs when creating/adjusting markers or harmonics
   - Clear previous selections when new items are selected
   - Support clicking selected entries again to clear selection

3. **Implement Keyboard Event Handling:**
   - Create keyboard event listeners for arrow keys (`←`, `→`, `↑`, `↓`)
   - Detect Shift modifier key state for increment size selection
   - Prevent conflicts with browser keyboard shortcuts
   - Ensure keyboard events only affect selected markers/harmonics
   - Implement proper event handling scope (document-level vs component-level)

4. **Implement Movement Logic:**
   - Create movement functions with variable increment sizes:
     - Arrow keys alone: 1-pixel increments (fine control)
     - Shift + Arrow keys: 5-pixel increments (faster movement)
   - Map arrow key directions to coordinate movements:
     - `←`/`→`: Horizontal movement (time axis)
     - `↑`/`↓`: Vertical movement (frequency axis)
   - Utilize existing coordinate transformation utilities for pixel-to-data conversions
   - Update marker/harmonic positions in the state management system

5. **Cross-Mode Integration:**
   - Ensure functionality works consistently across Analysis, Harmonics, and Doppler modes
   - Integrate with the existing FeatureRenderer for cross-mode feature coordination
   - Maintain compatibility with existing mouse/touch functionality
   - Test mode switching behavior with selected items

6. **State Management Integration:**
   - Broadcast state changes to listeners as per existing patterns
   - Ensure deep-copying of state before passing to listeners
   - Maintain existing state structure and compatibility
   - Handle state persistence during hot module reloads

**Provide Necessary Context/Assets:**
- The project uses a modular mode system with BaseMode as the abstract base class
- State management follows a listener pattern with centralized state in `src/core/state.js`
- SVG-based rendering with precise coordinate transformations
- Multiple coordinate systems: screen → SVG → image → data
- Existing ResizeObserver ensures responsive design compatibility

## 3. Expected Output & Deliverables

**Define Success:** 
- Users can click table entries to select markers/harmonics for keyboard control
- Selected entries show clear visual feedback
- Arrow keys move selected items with appropriate increment sizes
- Functionality works across all three modes without conflicts
- Existing mouse/touch controls remain unchanged
- All state changes are properly broadcast

**Specify Deliverables:**
- Modified files implementing the selection system and keyboard controls
- Updated state management to handle selection tracking
- Enhanced table components with click handlers and visual feedback
- Keyboard event handling system integrated with existing architecture
- Cross-mode compatibility ensuring consistent behavior
- All changes tested and verified to work with existing functionality

## 4. Technical Constraints & Requirements

- Must integrate with existing state management system in `src/core/state.js`
- Must work across Analysis, Harmonics, and Doppler modes consistently
- Must not conflict with browser keyboard shortcuts
- Must maintain existing mouse/touch functionality
- Must use existing coordinate transformation utilities
- Must follow established architectural patterns (SVG-based rendering, listener pattern)
- Must preserve state during hot module reloads
- Must broadcast state changes to external listeners

## 5. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

Adhere strictly to the established logging format from [Memory_Bank_Log_Format.md](../02_Utility_Prompts_And_Format_Definitions/Memory_Bank_Log_Format.md). Ensure your log includes:
- A reference to GitHub Issue #78 and this task assignment
- A clear description of the implementation approach taken
- Key code modifications and architectural decisions
- Any challenges encountered and how they were resolved
- Confirmation of successful execution across all modes
- Testing results and verification of functionality

## 6. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. Pay particular attention to the interaction between the selection system, keyboard controls, and existing state management patterns.