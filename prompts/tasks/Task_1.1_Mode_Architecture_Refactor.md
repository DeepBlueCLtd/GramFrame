# APM Task Assignment: Mode Architecture Refactor

## 1. Agent Role & APM Context

**Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame Mode Architecture Refactoring project.

**Your Role:** As an Implementation Agent, you will execute assigned tasks diligently, following architectural patterns precisely, and logging all work meticulously to the Memory Bank. You are responsible for implementing clean, maintainable code that adheres to the established patterns and interfaces.

**Workflow:** You report progress and deliverables to the Manager Agent (via the User). All significant work and decisions must be documented in the Memory Bank for future reference and continuity.

## 2. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to the core architecture refactoring to separate GramFrame's three modes (Analysis, Harmonics, Doppler) into distinct, modular components with a common interface.

**Objective:** Refactor the existing mode-dependent conditional logic scattered across multiple files into a clean, polymorphic architecture using a common Mode interface. This will improve maintainability, testability, and extensibility of the codebase.

**Current Architecture Issues:**
- Mode logic is scattered across 7+ files with heavy conditional branching
- ~500+ lines of mode-specific conditional logic in `src/main.js`, `src/core/events.js`, and `src/rendering/cursors.js`
- Tight coupling between modes and shared resources (cursors, LEDs, readout panels)
- Difficulty in testing individual mode behaviors in isolation

**Phased Refactoring Strategy:**

This refactoring will be implemented in 5 phases, with tests passing after each phase to ensure stability and enable easy rollback if issues arise.

**Phase 1: Create Infrastructure (Tests Must Pass)**
1. **Create Base Mode Interface**
   - Create `src/modes/BaseMode.js` with the following interface:
     - Constructor accepting `(instance, state)` parameters
     - Lifecycle methods: `activate()`, `deactivate()`  
     - Event handling: `handleClick()`, `handleMouseDown()`, `handleMouseMove()`, `handleMouseUp()`, `handleContextMenu()`
     - Rendering: `render(svg)`, `updateCursor(coords)`
     - UI: `updateReadout(coords)`, `updateLEDs(coords)`, `getGuidanceText()`
     - State: `resetState()`, `getStateSnapshot()`
   - **Guidance:** Use JSDoc type annotations for interface documentation. All methods should have default implementations that can be overridden.

2. **Create Mode Factory**
   - Create `src/modes/ModeFactory.js` to instantiate modes
   - Implement `createMode(modeName, instance, state)` factory method
   - **Guidance:** Factory should return instances based on modeName parameter. Include error handling for invalid mode names.

3. **Add Infrastructure to Main Class**
   - Add mode factory initialization to `src/main.js` constructor
   - Add `this.modes` property and `this.currentMode` property
   - **Do NOT modify existing mode switching logic yet**
   - **Validation:** Run `yarn test && yarn typecheck` - all tests must pass. No behavior should change.

**Phase 2: Extract Analysis Mode (Tests Must Pass)**
4. **Implement Analysis Mode**
   - Create `src/modes/analysis/AnalysisMode.js` extending BaseMode
   - Extract analysis-specific logic from:
     - `src/rendering/cursors.js:40-95` (drawAnalysisMode)
     - `src/components/UIComponents.js:56-62` (LED visibility)
     - `src/components/UIComponents.js:145-149` (guidance text)
   - **Guidance:** Analysis mode primarily handles crosshair rendering and basic time/frequency display. Keep implementation minimal as it's the default/base behavior.

5. **Update Main Class for Analysis Mode**
   - Modify `_switchMode()` method in `src/main.js` to use new pattern ONLY for analysis mode
   - Keep existing conditional logic for harmonics and doppler modes unchanged
   - Update event handlers to delegate to `currentMode` for analysis, keep conditionals for other modes
   - **Validation:** Run `yarn test` - analysis mode should work via new pattern, harmonics/doppler unchanged.

**Phase 3: Extract Harmonics Mode (Tests Must Pass)**
6. **Implement Harmonics Mode**
   - Create `src/modes/harmonics/HarmonicsMode.js` extending BaseMode
   - Extract harmonics-specific logic from:
     - `src/core/events.js:230-267, 438-439` (drag handling and click routing)
     - `src/rendering/cursors.js:101-182` (harmonic set rendering)
     - `src/components/UIComponents.js:63-69, 247-277` (UI updates)
     - `src/main.js:294-353` (harmonic set management methods)
   - **Guidance:** Harmonics mode manages baseFrequency, harmonicData arrays, and harmonicSets. Ensure drag interactions for harmonic sets are preserved exactly as in current implementation.

7. **Update Main Class for Analysis + Harmonics**
   - Extend `_switchMode()` method to handle analysis + harmonics via new pattern
   - Keep doppler using existing conditional logic
   - Update event handlers to delegate for analysis/harmonics, keep conditionals for doppler
   - **Validation:** Run `yarn test` - 2/3 modes should use new pattern, doppler unchanged.

**Phase 4: Extract Doppler Mode (Tests Must Pass)**
8. **Implement Doppler Mode** 
   - Create `src/modes/doppler/DopplerMode.js` extending BaseMode
   - Extract doppler-specific logic from:
     - `src/core/events.js:472-616` (marker placement and drag handling)
     - `src/rendering/cursors.js:251-551` (marker and curve rendering)
     - `src/components/UIComponents.js:70-88, 280-288` (UI updates)
     - `src/main.js:387-406` (Doppler reset functionality)
     - Move `src/utils/doppler.js` calculations into this mode
   - **Guidance:** Doppler mode handles f+, f-, f₀ markers with drag interactions, S-curve rendering, speed calculations, and preview functionality. Preserve all existing marker placement and drag behavior.

9. **Complete Main Class Refactor**
   - Complete `_switchMode()` method refactor to use polymorphic pattern for all modes
   - Remove all remaining conditional mode logic from main.js
   - Update all event handlers to use `this.currentMode.handleX()` delegation
   - **Validation:** Run `yarn test` - all modes should use new pattern, no conditional logic remains.

**Phase 5: Clean Up (Tests Must Pass)**
10. **Remove Unused Conditional Code**
    - Remove unused conditional mode logic from `src/core/events.js`
    - Remove unused conditional mode logic from `src/rendering/cursors.js`
    - Remove unused conditional mode logic from `src/components/UIComponents.js`
    - Ensure all mode-specific logic is now contained within mode classes

11. **Final State Management Updates**
    - Ensure `src/core/state.js` mode-specific state properties are properly encapsulated
    - Each mode should manage its own state section (harmonics.*, doppler.*)
    - **Guidance:** State structure can remain the same, but access should be through mode methods rather than direct property access in conditional blocks.

12. **Final Validation and Optimization**
    - **Validation:** Run `yarn test && yarn typecheck` - all tests must pass
    - Perform final cleanup and optimization
    - Ensure no dead code remains

**Provide Necessary Context/Assets:**
- Current mode switching occurs in `src/main.js:183-265` 
- Event delegation patterns exist in `src/core/events.js:119-616`
- Mode-specific rendering is in `src/rendering/cursors.js:14-551`
- UI state management is in `src/components/UIComponents.js:55-289`
- Existing polymorphic patterns can be found in the component architecture

**Constraints:**
- All existing functionality must be preserved exactly
- No breaking changes to the public API
- All tests must continue to pass
- Maintain existing coordinate transformation logic
- Preserve HMR (Hot Module Reload) support

## 3. Expected Output & Deliverables

**Define Success:** The refactoring is successful when:
- All mode-specific conditional logic is eliminated from main.js, events.js, and cursors.js
- Each mode is self-contained in its own directory with clear separation of concerns
- All existing functionality works identically to before the refactor
- Code is more maintainable with clear interfaces and reduced coupling
- **Tests pass after each phase, providing 5 validation checkpoints**

**Specify Deliverables:**

**Phase 1 Deliverables:**
1. `src/modes/BaseMode.js` - Base interface with comprehensive JSDoc documentation
2. `src/modes/ModeFactory.js` - Mode instantiation factory
3. Modified `src/main.js` constructor with mode infrastructure (no behavior changes)
4. **Validation:** `yarn test && yarn typecheck` must pass

**Phase 2 Deliverables:**
5. `src/modes/analysis/AnalysisMode.js` - Analysis mode implementation
6. Modified `src/main.js` with analysis mode using new pattern
7. **Validation:** `yarn test` must pass with analysis mode refactored

**Phase 3 Deliverables:**
8. `src/modes/harmonics/HarmonicsMode.js` - Harmonics mode implementation
9. Modified `src/main.js` with analysis + harmonics using new pattern
10. **Validation:** `yarn test` must pass with 2/3 modes refactored

**Phase 4 Deliverables:**
11. `src/modes/doppler/DopplerMode.js` - Doppler mode implementation
12. Completed `src/main.js` refactor with all modes using polymorphic pattern
13. **Validation:** `yarn test` must pass with all modes refactored

**Phase 5 Deliverables:**
14. Cleaned `src/core/events.js` with unused conditional logic removed
15. Cleaned `src/rendering/cursors.js` with unused conditional logic removed
16. Cleaned `src/components/UIComponents.js` with unused conditional logic removed
17. **Final Validation:** `yarn test && yarn typecheck` must pass

**Format:** All code should follow existing codebase conventions with JSDoc type annotations. Use the same coding style, import patterns, and error handling as the current codebase.

## 4. Memory Bank Logging Instructions

Upon successful completion of **each phase**, you **must** log your work comprehensively to the project's `Memory_Bank.md` file.

**Format Adherence:** Adhere strictly to the established logging format. For each phase, ensure your log includes:
- A reference to this assigned task and the specific phase completed (e.g., "Task 1.1 Mode Architecture Refactor - Phase 2")
- A clear description of the changes implemented in that phase
- Code snippets showing key implementations for that phase
- Any key decisions made regarding architecture or implementation approach
- **Confirmation that all tests passed for that phase** (`yarn test` and `yarn typecheck` as applicable)
- Notes on any challenges encountered during that phase
- **If any phase fails:** Document the failure, rollback steps taken, and recommendations for resolution

**Final Summary Log:** After completing all 5 phases, create a comprehensive summary log entry covering:
- Complete architectural transformation achieved
- Performance or maintainability improvements gained
- Any lessons learned during the phased approach
- Final confirmation of all functionality preserved

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. Pay particular attention to:
- The exact interface methods required for each mode
- How to handle shared state between modes
- Event coordinate transformation preservation
- Maintaining backward compatibility with existing API