# APM Task Assignment: Refactor Inline Imports to Standard Imports (Issue #103)

## 1. Agent Role & APM Context

**Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame interactive spectrogram analysis project.

**Your Role:** As an Implementation Agent, you will execute this assigned task diligently, focusing on code quality improvements while maintaining system functionality. You must log all work meticulously to the Memory Bank.

**Workflow:** You will work independently on this task and report back to the Manager Agent via the User, ensuring comprehensive documentation of your analysis and implementation decisions.

## 2. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to a technical debt and code quality improvement task, focusing on architectural consistency and maintainability improvements as outlined in the project's commitment to clean, maintainable codebase standards.

**Objective:** Replace 5 inline `import` statements for `table.js` and `state.js` with standard ES6 imports at the top of files, while identifying and resolving any underlying circular dependency issues that originally necessitated the inline import pattern.

**Detailed Action Steps:**

### Phase 1: Investigation and Analysis
- **Locate all inline imports:** Identify the exact locations of the 5 inline imports:
  - `/src/core/events.js:180` - `import('./state.js').then(({ notifyStateListeners }) => {`
  - `/src/core/events.js:238` - `import('./state.js').then(({ notifyStateListeners }) => {`
  - `/src/components/table.js:140` - `import('../core/state.js').then(({ notifyStateListeners }) => {`
  - `/src/modes/pan/PanMode.js:179` - `import('../../components/table.js').then(({ applyZoomTransform }) => {`
  - `/src/main.js:459` - `import('./components/table.js').then(({ applyZoomTransform }) => {`

- **Analyze circular dependencies:** Before making changes, investigate the dependency relationships between these modules to understand why inline imports were used:
  - Map out the import/export relationships between `state.js`, `table.js`, and the files that import them
  - Identify specific circular dependency chains that cause issues with standard imports
  - Document your findings for each problematic relationship

- **Reference architectural context:** Review the following ADRs to understand the established patterns:
  - `docs/ADRs/ADR-004-Centralized-State-Management.md` - Understanding state management architecture
  - `docs/ADRs/ADR-008-Modular-Mode-System.md` - Understanding mode system architecture
  - Any relevant patterns from `docs/refactoring/main-js-dependency-analysis.md`

### Phase 2: Solution Design
- **Design dependency resolution strategy:** For each circular dependency identified, propose one of these solutions:
  - **Extract shared dependencies:** Move shared code to separate utility modules
  - **Inversion of control:** Restructure code to inject dependencies rather than import them directly
  - **Event-based communication:** Replace direct imports with event-driven patterns where appropriate
  - **Interface segregation:** Split large modules into smaller, more focused modules

- **Plan implementation sequence:** Determine the order of changes to minimize disruption:
  - Group changes by imported modules (`table.js` imports first, then `state.js`)
  - Identify which changes can be made independently vs. which require coordinated updates

### Phase 3: Implementation
- **Module-by-module conversion:** Implement the refactoring systematically:
  - For each inline import, first resolve any circular dependency issue using your planned solution
  - Convert the inline import to a standard ES6 import at the top of the file
  - Update function signatures and usage patterns as needed to work with the new import structure
  - Ensure all exported functions and values are properly imported and used

- **Test after each change:** Run the full test suite after each module conversion:
  - Execute `yarn test` to ensure no functionality is broken
  - Execute `yarn typecheck` to catch any TypeScript/JSDoc type issues
  - Test in the browser using `yarn dev` and `debug.html` to verify UI functionality

### Phase 4: Validation and Documentation
- **Final verification:**
  - Run complete test suite: `yarn test`
  - Run type checking: `yarn typecheck`  
  - Build production version: `yarn build`
  - Test manual functionality in browser
  - Verify no circular dependency warnings in browser console

- **Document dependency relationships:** Create clear documentation of the resolved dependency structure for future developers

## 3. Expected Output & Deliverables

**Define Success:** Successful completion requires:
- All 5 inline imports converted to standard ES6 imports at file tops
- No circular dependency errors in console or during build
- All existing tests passing (`yarn test`)
- Type checking passing (`yarn typecheck`)
- Production build completing successfully (`yarn build`)
- Manual testing confirming UI functionality intact

**Specify Deliverables:**
- Modified source files with converted imports:
  - `src/core/events.js` (2 imports converted)
  - `src/components/table.js` (1 import converted)
  - `src/modes/pan/PanMode.js` (1 import converted) 
  - `src/main.js` (1 import converted)
- Any new utility modules created to resolve circular dependencies
- Documentation of dependency resolution decisions
- Test results confirmation

**Format:** All code changes should follow existing code style and patterns. Maintain consistent import ordering and formatting with the rest of the codebase.

## 4. Architectural Context and Constraints

**State Management Architecture:** Per ADR-004, the centralized state management system uses a listener pattern. Be careful not to disrupt the state notification mechanisms when refactoring imports.

**Module System Architecture:** Per ADR-008, the modular mode system relies on clean separation of concerns. Ensure that dependency changes don't violate the established mode isolation patterns.

**Constraints:**
- Do not modify the public API of any modules
- Preserve all existing functionality exactly as it currently works
- Maintain Hot Module Reload compatibility (ADR-006)
- Follow existing JSDoc typing patterns (ADR-007)

## 5. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's Memory Bank. Since this project uses a file-based memory bank, create a new file: `Memory/Refactoring/Issue_103_Inline_Import_Refactoring.md`

**Format Adherence:** Adhere strictly to the established logging format. Ensure your log includes:
- Reference to GitHub Issue #103 and this task assignment
- Detailed description of circular dependencies found and resolution strategies used
- Code snippets showing before/after import patterns for each affected file
- Any architectural decisions made during the refactoring process
- Challenges encountered and how they were resolved
- Confirmation of successful execution (tests passing, build succeeding, manual testing results)

## 6. Clarification Instruction

If any part of this task assignment is unclear, or if you discover circular dependencies that require architectural changes not covered in the suggested approaches, please state your specific questions before proceeding. This is particularly important if you find that resolving the circular dependencies requires more extensive refactoring than anticipated.

## 7. Priority and Context

**Priority:** Medium - This is important for code quality and maintainability but not blocking current feature work.

**Background Context:** The inline imports were likely introduced as a workaround for circular dependencies. This refactoring will improve code clarity and consistency, but requires careful analysis to ensure the underlying architectural issues are properly resolved rather than just moved around.