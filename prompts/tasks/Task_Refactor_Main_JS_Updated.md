# APM Task Assignment: Refactor main.js into Modular Architecture

## 1. Agent Role & APM Context

You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project. Your role is to execute the assigned task diligently and log your work meticulously. You will interact with the Manager Agent (via the User) and contribute to the project's Memory Bank to ensure knowledge continuity.

## 2. Onboarding / Context from Prior Work

The GramFrame project has successfully completed Phase 1 (Bootstrapping + Dev Harness) and parts of Phase 2 (Basic Layout and Diagnostics Panel). The current implementation includes:

- A working debug page with hot module reload
- Spectrogram image loading and display
- Coordinate calculations based on min/max time/frequency values
- LED-style readout panel for displaying measurements
- Mode switching between 'analysis' and 'doppler' modes
- Event handling for mouse interactions

All functionality is currently contained in a single `main.js` file (~2,100 lines) which has grown too large for effective maintenance. As we prepare to implement more complex features, we need to refactor this file into a more maintainable, modular structure while preserving all existing functionality.

## 3. Task Assignment

**Objective:** Refactor the `main.js` file into a modular architecture with separate files for different concerns, while maintaining all existing functionality.

**Detailed Action Steps:**

1. **Analyze the current structure and identify logical modules:**
   - Review the `main.js` file to identify distinct responsibilities
   - Map out dependencies between different parts of the code
   - Create a refactoring plan that outlines which components to extract first

2. **Create a modular directory structure:**
   - Create a `src/components/` directory for UI components
   - Create a `src/core/` directory for core functionality
   - Create a `src/utils/` directory for utility functions
   - Create a `src/api/` directory for public API methods

3. **Extract state management:**
   - Move the `initialState` object to `src/core/state.js`
   - Extract state listener functionality to the same file
   - Create proper exports for state-related functions
   - Ensure state management remains consistent with the current implementation

4. **Extract utility functions:**
   - Create `src/utils/coordinates.js` for coordinate transformation functions
   - Create `src/utils/dom.js` for DOM manipulation helpers
   - Create `src/utils/drawing.js` for SVG/canvas drawing utilities
   - Ensure each utility file has clear exports and documentation

5. **Extract UI components:**
   - Create `src/components/LEDDisplay.js` for the LED readout functionality
   - Create `src/components/ModeSelector.js` for mode switching UI
   - Create `src/components/RateInput.js` for rate input controls
   - Ensure each component is properly encapsulated with clear interfaces

6. **Extract event handling:**
   - Create `src/core/events.js` for mouse event handling logic
   - Ensure event handlers maintain proper context and state access
   - Update event binding to work with the new modular structure

7. **Refactor the main GramFrame class:**
   - Update `src/core/GramFrame.js` to import from the newly created modules
   - Maintain the same public interface and behavior
   - Refactor the constructor to use the extracted components
   - Ensure all functionality works as before

8. **Create a dedicated API module:**
   - Move the public API methods to `src/api/index.js`
   - Maintain the same public methods and behavior
   - Ensure backward compatibility with existing code

9. **Create a new entry point:**
   - Create `src/index.js` that imports and exports the necessary components
   - Ensure the global GramFrame object is still available in the browser
   - Maintain compatibility with existing usage patterns

## 4. Implementation Guidelines

- **Refactoring Approach:**
  - Implement changes incrementally, one file at a time
  - Test after each extraction to ensure functionality is preserved
  - Start with pure utility functions that have minimal dependencies
  - Then move on to more complex components with state dependencies
  - Leave the main class refactoring for last, once all dependencies are in place

- **Code Style:**
  - Use ES modules (import/export) for all files
  - Follow existing code style conventions:
    - No trailing semicolons in TypeScript files
    - Use single quotes for strings except in JSON files
    - Place React Hook files in the same folder as the component they are used in
  - Maintain consistent naming conventions with the existing codebase
  - Avoid using the `any` type in TypeScript

- **Testing:**
  - After each significant change, verify that:
    - The component renders correctly
    - Mouse interactions work as expected
    - LED displays update properly
    - Mode switching functions correctly
    - All public API methods work as before

- **Documentation:**
  - Maintain or improve JSDoc comments for all functions and classes
  - Add module-level documentation explaining the purpose of each file
  - Update type definitions as needed

## 5. Expected Output & Deliverables

**Success Criteria:**
- The codebase is split into logical modules with clear responsibilities
- All existing functionality works exactly as before
- The code is more maintainable and easier to extend
- The public API remains unchanged from a user perspective

**Deliverables:**
- A refactored codebase with the following structure:
  ```
  src/
  ├── api/
  │   └── index.js
  ├── components/
  │   ├── LEDDisplay.js
  │   ├── ModeSelector.js
  │   └── RateInput.js
  ├── core/
  │   ├── GramFrame.js
  │   ├── events.js
  │   └── state.js
  ├── utils/
  │   ├── coordinates.js
  │   ├── dom.js
  │   └── drawing.js
  ├── index.js
  └── types.js
  ```
- Verification that all functionality works as before
- Updated documentation reflecting the new structure

## 6. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's `Memory_Bank.md` file. Adhere strictly to the established logging format. Ensure your log includes:
- A reference to the refactoring task
- A clear description of the new module structure
- Key decisions made during the refactoring process
- Any challenges encountered and how they were resolved
- Confirmation of successful execution through manual testing

## 7. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. Remember to refactor one file at a time and get confirmation before moving on to the next file, as per the user's rules.
