# APM Task Assignment: Refactor main.js into Modular Structure

## 1. Agent Role & APM Context

You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project. Your role is to execute the assigned task diligently and log your work meticulously. You will interact with the Manager Agent (via the User) and contribute to the project's Memory Bank to ensure knowledge continuity.

## 2. Onboarding / Context from Prior Work

The GramFrame project has successfully completed Phase 1 (Bootstrapping + Dev Harness) and parts of Phase 2 (Basic Layout and Diagnostics Panel). The current implementation includes a working debug page, spectrogram image display, LED-style readout panel, and diagnostics panel.

The main functionality is currently contained in a single `main.js` file which has grown to over 29KB. As we prepare to implement more complex features in Phase 3 (Interaction Foundations), we need to refactor this file into a more maintainable, modular structure.

## 3. Task Assignment

**Objective:** Refactor the `main.js` file into a modular structure with separate files for different concerns, while maintaining all existing functionality.

**Detailed Action Steps:**

1. **Create a modular directory structure:**
   - Create appropriate directories for different types of code (e.g., components, core, utils, api)
   - Follow modern JavaScript/TypeScript project organization practices

2. **Extract state management:**
   - Move initial state object and state listener functionality to a dedicated file
   - Ensure state management remains consistent with the current implementation

3. **Extract utility functions:**
   - Move coordinate transformation functions to a separate utility file
   - Extract axes drawing functionality to its own file
   - Create DOM manipulation helpers for common operations

4. **Create component modules:**
   - Extract LED display component to its own file
   - Extract mode selector component to its own file
   - Extract rate input component to its own file
   - Ensure each component is properly encapsulated with clear interfaces

5. **Refactor the main GramFrame class:**
   - Update the class to import from the newly created modules
   - Maintain the same public interface and behavior
   - Ensure all functionality works as before

6. **Create a dedicated API module:**
   - Move the public API (GramFrameAPI) to its own file
   - Maintain the same public methods and behavior

7. **Create a new entry point:**
   - Create an index.js file that imports and exports the necessary components
   - Ensure the global GramFrame object is still available in the browser

8. **Update build configuration:**
   - Ensure Vite is configured to handle the new module structure
   - Verify that hot module reload still works with the new structure

9. **Run tests periodically:**
   - Run existing tests after each significant refactoring step
   - Ensure there are no regression errors
   - Fix any issues that arise during testing

## 4. Implementation Guidelines

- **Code Style:**
  - Use ES modules (import/export) for all files
  - Follow existing code style (e.g., no trailing semicolons in TypeScript)
  - Use single quotes for strings except in JSON files
  - Maintain consistent naming conventions

- **Refactoring Approach:**
  - Implement changes incrementally, testing after each significant change
  - Start with extracting pure functions that have minimal dependencies
  - Then move on to more complex components with state dependencies
  - Leave the main class refactoring for last, once all dependencies are in place

- **TypeScript Considerations:**
  - If adding type annotations, avoid using `any` type
  - Create appropriate interfaces for component props and state
  - Place React Hook files in the same folder as the component they are used in

## 5. Expected Output & Deliverables

**Success Criteria:**
- The codebase is split into logical modules with clear responsibilities
- All existing functionality works exactly as before
- All tests pass without regression errors
- The code is more maintainable and easier to extend
- The public API remains unchanged from a user perspective

**Deliverables:**
- Refactored codebase with modular structure
- Updated build configuration if necessary
- Passing tests confirming no regression issues

## 6. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's `Memory_Bank.md` file. Adhere strictly to the established logging format. Ensure your log includes:
- A reference to the refactoring task
- A clear description of the new module structure
- Key decisions made during the refactoring process
- Any challenges encountered and how they were resolved
- Confirmation of successful execution through passing tests

## 7. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding.
