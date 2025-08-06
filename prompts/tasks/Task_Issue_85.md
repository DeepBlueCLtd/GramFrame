# APM Task Assignment: Decompose main.js Monolithic File

## 1. Agent Role & APM Context

**Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project.

**Your Role:** As an Implementation Agent, your responsibility is to execute the assigned task diligently, following established patterns and architectural guidelines, while logging your work meticulously for project continuity.

**Workflow:** You will receive assignments from the Manager Agent (via the User) and must document all significant work in the Memory Bank to maintain project knowledge and enable future agents to build upon your work effectively.

## 2. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to addressing technical debt and maintainability concerns as outlined in the GramFrame project documentation. While not explicitly detailed in the current [Implementation_Plan.md](../../Implementation_Plan.md), this task supports the overall project quality and future extensibility goals.

**Objective:** Decompose the monolithic `src/main.js` file (currently 695 lines) into smaller, more maintainable modules with clear separation of concerns, without breaking the existing public API or functionality.

**Problem Context:** The `src/main.js` file has grown to contain mixed responsibilities including:
- GramFrame class definition and initialization
- UI component creation and management  
- Event handling setup and management
- Zoom and pan functionality
- State management integration
- ResizeObserver setup
- Mode switching logic
- Configuration processing

**Detailed Action Steps:**

### Phase 1: Analysis and Planning (High Priority)
- **Analyze current method dependencies** in `src/main.js` to understand the relationship between different functional areas
- **Map current responsibilities** to identify logical groupings for extraction
- **Document the public API surface** to ensure no breaking changes during refactoring
- **Review existing architecture** by examining `src/core/`, `src/components/`, and `src/modes/` directories to understand established patterns

### Phase 2: Extract UI Management Module (Phase 2.1)
- **Create `src/components/MainUI.js`** containing UI creation methods:
  - Extract `createSVGContainer()`, `createLEDDisplays()`, `createContainer()`, and related DOM creation methods
  - Move layout management functions and DOM element creation utilities
  - Ensure proper import/export patterns consistent with existing components
- **Update `src/main.js`** to import and utilize the new MainUI class
- **Maintain backward compatibility** by ensuring no changes to public GramFrame API

### Phase 3: Extract Viewport/Zoom Module (Phase 2.2)  
- **Create `src/core/viewport.js`** containing viewport management:
  - Extract zoom/pan logic: `handleZoom()`, `handlePan()`, `resetZoom()` methods
  - Move viewport state management and coordinate transformation utilities
  - Ensure integration with existing coordinate system in `src/utils/coordinates.js`
- **Update imports and dependencies** in main.js to use the new Viewport module

### Phase 4: Enhance Event Management (Phase 2.3)
- **Enhance existing `src/core/events.js`** with additional event handling:
  - Move complex event handler setup and management from main.js
  - Ensure integration with ResizeObserver functionality
  - Maintain compatibility with existing event delegation patterns

### Phase 5: Finalize Main Class (Phase 2.4)
- **Slim down `src/main.js`** to focus on:
  - Core GramFrame class definition and public API methods
  - Component orchestration and initialization logic
  - High-level coordination between extracted modules
- **Ensure target of under 350 lines** for the main file
- **Maintain all existing functionality** without breaking changes

**Architectural Constraints:**
- **Preserve Existing Patterns:** Follow established architectural patterns from existing `src/core/`, `src/components/`, and `src/modes/` modules
- **Maintain API Compatibility:** The public GramFrame API must remain unchanged - no breaking changes allowed
- **Follow Import Conventions:** Use existing import/export patterns consistent with the codebase
- **SVG Architecture:** Respect the established SVG-based rendering architecture (reference existing coordinate transformation patterns)
- **State Management:** Maintain integration with `src/core/state.js` patterns and listener mechanisms

## 3. Expected Output & Deliverables

**Define Success:** The task is successfully completed when:
1. `src/main.js` is reduced to under 350 lines while maintaining all functionality
2. New modules follow established architectural patterns from the existing codebase  
3. All existing functionality works identically (no behavioral changes)
4. All 59 existing Playwright tests continue to pass without modification
5. Public GramFrame API remains completely unchanged
6. TypeScript/JSDoc compliance is maintained across all files

**Specify Deliverables:**
- **New file:** `src/components/MainUI.js` (~150-200 lines) - UI creation and management
- **New file:** `src/core/viewport.js` (~100-150 lines) - Zoom/pan and viewport logic  
- **Enhanced file:** `src/core/events.js` - Expanded event handling capabilities
- **Refactored file:** `src/main.js` - Slimmed to ~200-300 lines focusing on orchestration
- **All existing tests passing** - Verification that no functionality was broken

## 4. Testing and Validation Requirements

**Testing Strategy:**
- **Run full test suite** after each module extraction using `yarn test`
- **Verify type compliance** using `yarn typecheck` after each change
- **Validate no regressions** by ensuring all 59 Playwright tests pass
- **Test development workflow** by running `yarn dev` and verifying hot reload functionality

**Validation Steps:**
1. Extract one module at a time (MainUI first, then viewport, then events)
2. After each extraction, immediately run `yarn test` and `yarn typecheck`
3. Verify the debug page (`debug.html`) continues to function correctly
4. Confirm all mode switching and interaction features still work

## 5. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

**Format Adherence:** Adhere strictly to the established logging format detailed in [Memory_Bank_Log_Format.md](../02_Utility_Prompts_And_Format_Definitions/Memory_Bank_Log_Format.md). Ensure your log includes:
- A reference to GitHub issue #85 and this task assignment
- A clear description of the refactoring actions taken and modules created
- Key architectural decisions made during the decomposition process
- Any challenges encountered and how they were resolved
- Confirmation of successful execution (all tests passing, functionality preserved)
- Before/after line counts for `src/main.js` and summary of extracted functionality

## 6. Risk Mitigation Guidelines

**Incremental Approach:** Extract one module at a time, testing thoroughly after each extraction to isolate any issues.

**Rollback Strategy:** Use git commits after each successful module extraction to enable easy rollback if issues are discovered.

**API Preservation:** Pay special attention to ensuring that any methods called externally or used by the existing test suite remain accessible and function identically.

## 7. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. This is particularly important given the scope of refactoring and the need to preserve existing functionality exactly.