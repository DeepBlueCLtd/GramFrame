# APM Task Assignment: Unified Readout Layout Implementation

## 1. Agent Role & APM Context

**Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project.

**Your Role:** Execute the assigned task diligently, implement the unified readout layout to make Analysis Markers and Harmonic sets always visible, and log your work meticulously to the Memory Bank.

**Workflow:** You will work independently on this task and report completion status back to the Manager Agent via the User. Your implementation must be thorough and include proper testing validation.

## 2. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to a new task `Phase 4, Task 4.9: Unified Readout Layout Implementation` extending the existing Phase 4: Harmonics & Modes functionality.

**Objective:** Refactor the GramFrame readout UI from individual mode-specific layouts to a unified 3-column layout where Analysis Markers and Harmonic sets are always visible regardless of the active mode. This addresses GitHub issue #64 requirements for simultaneous display of multiple readout tables.

**Detailed Action Steps:**

1. **Modify Main GramFrame Class Layout Infrastructure:**
   - Update `src/main.js` to import required layout components (`createFullFlexLayout`, `createFlexColumn`, `createColorPicker`) and `formatTime` utility
   - Replace the current mode-specific UI creation approach with a unified layout creation in the constructor
   - Add new method `createUnifiedLayout()` that creates the 3-column structure:
     - **Left Column (30%)**: Common controls (time/freq LEDs, doppler speed LED, color selector)
     - **Middle Column (35%)**: Analysis Markers table (always visible)
     - **Right Column (35%)**: Harmonics sets table (always visible)
   - Add property declarations for the new UI containers: `leftColumn`, `middleColumn`, `rightColumn`, `timeLED`, `freqLED`, `speedLED`, `colorPicker`, `markersContainer`, `harmonicsContainer`

2. **Implement Universal Cursor Movement System:**
   - Add method `updateUniversalCursorReadouts(dataCoords)` to update time/freq LEDs regardless of active mode
   - Integrate this method into the existing mouse move handling to ensure all modes trigger LED updates
   - **Guidance:** This method should use the existing `formatTime()` utility for time display and format frequency to 1 decimal place

3. **Refactor Mode System for New Layout:**
   - **AnalysisMode Changes:**
     - Modify `createUI()` to skip LED creation (now handled centrally) and only manage the markers table population
     - Update `updateCursorPosition()` to work with centrally managed LEDs
     - Ensure marker creation and table management continue to work with the persistent middle column container
   - **HarmonicsMode Changes:**
     - Modify `createUI()` to skip color picker creation (now handled centrally) and only manage harmonics table population
     - Update harmonic panel creation to use the persistent right column container
     - Ensure manual button and harmonic set management work with the new layout
   - **DopplerMode Changes:**
     - Modify `createUI()` to skip speed LED creation (now handled centrally)
     - Update speed calculation display to work with the centrally managed speed LED

4. **Update Mode Switching Logic:**
   - Modify `_switchMode()` method to avoid destroying the unified layout
   - Update mode activation/deactivation to work with persistent UI elements
   - Ensure proper cleanup of mode-specific state while preserving the layout structure
   - **Guidance:** Only clear transient interaction state during mode switches, not the persistent UI containers

5. **CSS and Styling Updates:**
   - Update `src/gramframe.css` with new layout classes:
     - `.gram-frame-unified-layout` for the main 3-column container
     - `.gram-frame-left-column`, `.gram-frame-middle-column`, `.gram-frame-right-column` for column styling
     - Ensure responsive behavior and proper scrolling for table containers
   - **Guidance:** Use flexbox with appropriate flex ratios (30%-35%-35%) and ensure minimum widths prevent layout collapse

## 3. Expected Output & Deliverables

**Define Success:** 
- All three columns (common controls, Analysis Markers table, Harmonics sets table) are always visible regardless of active mode
- Time/freq LEDs update universally during cursor movement in any mode
- All existing mode functionality (marker placement, harmonic creation, doppler calculations) continues to work
- Smooth mode switching without UI destruction/recreation
- All existing tests continue to pass

**Specify Deliverables:**
- Modified `src/main.js` with unified layout implementation
- Updated mode classes (`AnalysisMode.js`, `HarmonicsMode.js`, `DopplerMode.js`) that work with the new layout
- Updated CSS in `src/gramframe.css` for the new layout styling
- Verification that all existing Playwright tests pass without modification

**Format:** 
- Code changes should maintain existing patterns and conventions
- All existing JSDoc comments and type annotations must be preserved
- Follow the established error handling patterns

## 4. Memory Bank Logging Instructions (Mandatory)

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

**Format Adherence:** Adhere strictly to the established logging format. Ensure your log includes:
- A reference to this task assignment (Task 4.9: Unified Readout Layout Implementation)
- A clear description of the architectural changes made to the readout system
- Key code snippets showing the unified layout implementation
- Any technical decisions made during implementation (e.g., flex ratios, container structure)
- Confirmation of successful execution with all tests passing
- Any challenges encountered with mode system integration and their solutions

## 5. Clarification Instruction

If any part of this task assignment is unclear, particularly regarding the interaction between the unified layout and existing mode-specific functionality, please state your specific questions before proceeding.

## 6. Additional Context

**Architectural Context:** This task builds upon ADR-008: Modular Mode System Architecture. The unified layout preserves the mode-based interaction patterns while providing a consistent visual interface that shows all relevant information simultaneously.

**GitHub Issue Reference:** This implementation addresses GitHub issue #64: "Users would like to be able to always see the tables of Analysis Markers and harmonic sets" with the specific 3-column layout requirements.

**Integration Notes:** This refactoring must maintain backward compatibility with existing state management, event handling, and feature rendering systems. The FeatureRenderer and mode-specific persistent features should continue to work without modification.