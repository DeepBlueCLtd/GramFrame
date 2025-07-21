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

**Phase 0: Pre-Refactoring Analysis (CRITICAL)**
1. **Create comprehensive dependency analysis:**
   - Map all function calls within `main.js` to identify dependencies
   - Identify which functions access state directly vs through parameters
   - Document public vs private method boundaries
   - Create a dependency graph to identify potential circular import risks
   - Analyze event handling patterns and state access patterns

2. **Establish safety measures:**
   - Create feature branch for refactoring work: `git checkout -b refactor-main-js`
   - Run full test suite to establish baseline: `yarn test`
   - Document current HMR behavior to ensure preservation
   - Create rollback plan with git checkpoints at each major step

**Phase 1: Setup & Planning**
3. **Validate module boundaries:**
   - Use dependency analysis to refine proposed module structure
   - Ensure no circular dependencies will be created
   - Identify shared dependencies that need careful handling
   - Plan import/export strategy to avoid breaking changes

4. **Create a modular directory structure:**
   - Create a `src/components/` directory for UI components
   - Create a `src/core/` directory for core functionality
   - Create a `src/utils/` directory for utility functions
   - Create a `src/api/` directory for public API methods

**Phase 2: Incremental Extraction**
5. **Extract pure utility functions first (lowest risk):**
   - Create `src/utils/coordinates.js` for coordinate transformation functions
   - Create `src/utils/dom.js` for DOM manipulation helpers  
   - Create `src/utils/drawing.js` for SVG/canvas drawing utilities
   - **Testing checkpoint**: Run `yarn test` after each utility extraction

6. **Extract state management (medium risk):**
   - Move the `initialState` object to `src/core/state.js`
   - Extract state listener functionality carefully to avoid breaking patterns
   - Create proper exports for state-related functions
   - **Critical**: Preserve listener pattern behavior exactly
   - **Testing checkpoint**: Verify state updates and listener notifications work

7. **Extract UI components (higher risk due to state dependencies):**
   - Create `src/components/UIComponents.js` (combine LED, Mode, Rate into single file initially)
   - Avoid over-granular separation that could create import complexity
   - Ensure components maintain proper state access patterns
   - **Testing checkpoint**: Verify UI renders and responds to interactions

8. **Extract event handling (highest risk):**
   - Create `src/core/events.js` for mouse event handling logic
   - **Critical**: Maintain proper context binding and state access
   - Design to avoid circular dependencies with state management
   - **Testing checkpoint**: Verify all mouse interactions work correctly

9. **Refactor the main GramFrame class:**
   - Update `src/core/GramFrame.js` to import from the newly created modules
   - Maintain the same public interface and behavior exactly
   - **Critical**: Preserve HMR functionality
   - **Testing checkpoint**: Full integration test

10. **Create entry point and API:**
    - Create `src/index.js` that imports and exports the necessary components
    - Move public API methods to maintain exact same interface
    - Ensure global GramFrame object remains available
    - **Final testing checkpoint**: Complete end-to-end verification

## 4. Implementation Guidelines

- **Safety-First Refactoring Approach:**
  - **MANDATORY**: Run `yarn test` before starting and after every extraction
  - Use git commits as checkpoints: commit working state before each phase
  - If any test fails, immediately rollback and reassess approach
  - Never proceed to next step until current step passes all tests
  - Maximum one module extraction per session - get confirmation before continuing

- **Dependency Management:**
  - Create dependency analysis document before starting any extractions
  - Identify and resolve circular dependency risks during planning phase
  - Design imports to follow unidirectional data flow where possible
  - Use dependency injection patterns for complex state/event relationships

- **Hot Module Reload Preservation:**
  - Test HMR after each major change (especially main class refactor)
  - Document any HMR behavior changes and work to restore original behavior
  - Consider HMR impact when designing module boundaries

- **Testing Strategy (Enhanced):**
  - **Automated**: Run `yarn test` after every file extraction
  - **Manual verification** after each step:
    - Component renders correctly on debug.html
    - Mouse interactions work (hover, click, drag)
    - LED displays update in real-time
    - Mode switching functions correctly
    - Rate input updates calculations
    - State listeners fire correctly
  - **Integration testing**: Full workflow test after major extractions

- **Code Style:**
  - Use ES modules (import/export) for all files
  - Follow existing code style conventions:
    - No trailing semicolons in TypeScript files
    - Use single quotes for strings except in JSON files
  - Maintain consistent naming conventions with the existing codebase
  - Avoid using the `any` type in TypeScript

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
- **Phase 0 Analysis Document**: Comprehensive dependency mapping and risk assessment
- **Refactored codebase** with the following structure (subject to revision based on dependency analysis):
  ```
  src/
  ├── api/
  │   └── index.js          # Public API methods
  ├── components/
  │   └── UIComponents.js   # Combined UI components (avoid over-granularity)
  ├── core/
  │   ├── GramFrame.js      # Main class
  │   ├── events.js         # Event handling
  │   └── state.js          # State management & listeners
  ├── utils/
  │   ├── coordinates.js    # Coordinate transformations
  │   ├── dom.js           # DOM utilities
  │   └── drawing.js       # SVG/drawing utilities
  ├── index.js             # Main entry point
  └── types.js             # Type definitions
  ```
- **Full test suite passing**: All existing tests must pass
- **HMR functionality preserved**: Hot module reload works as before
- **Git history**: Clean commits at each successful phase
- **Documentation**: Updated JSDoc and module documentation

## 6. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's `Memory_Bank.md` file. Adhere strictly to the established logging format. Ensure your log includes:
- A reference to the refactoring task
- A clear description of the new module structure
- Key decisions made during the refactoring process
- Any challenges encountered and how they were resolved
- Confirmation of successful execution through manual testing

## 7. Risk Mitigation & Rollback Plan

**High-Risk Areas Identified:**
- State listener pattern preservation
- Event handler context binding  
- Circular dependency creation
- HMR functionality disruption

**Rollback Strategy:**
- Each phase must be committed to git before proceeding
- If tests fail at any point, immediately rollback to previous commit
- Maximum one module extraction per work session
- Get explicit confirmation before proceeding to next extraction

**Success Gates:**
- Phase 0: Dependency analysis complete and approved
- Each extraction: All tests pass + manual verification complete
- Final: Full integration test + HMR verification + user acceptance

## 8. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. **CRITICAL**: This refactoring must start with Phase 0 dependency analysis - do not begin any code extraction until this analysis is complete and approved.

Remember: Maximum one module extraction per session, with mandatory testing and confirmation before proceeding.
