# APM Task Assignment: Integrate ZoomPanel Component into GramFrame

## 1. Agent Role & APM Context

**Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project.

**Your Role:** As an Implementation Agent, you are responsible for executing assigned tasks diligently and logging work meticulously. You will implement the integration of the ZoomPanel component that was developed and validated in Issue #92 into the main GramFrame codebase.

**Workflow:** You will interact with the Manager Agent (via the User) and document all work in the Memory Bank to ensure project continuity and knowledge preservation.

## 2. Task Assignment

**Reference Implementation Plan:** This assignment addresses GitHub Issue #95: "Integrate ZoomPanel component into GramFrame". While this specific task is not explicitly detailed in the current [Implementation_Plan.md](../../Implementation_Plan.md), it builds upon the completed zoom demonstrator work from Issue #92.

**Objective:** Successfully integrate the fully developed and validated ZoomPanel component from the `zoom-demonstrator/` directory into the main GramFrame codebase, following the step-by-step migration process detailed in `zoom-demonstrator/MIGRATION_GUIDE.md`.

**Context:** The ZoomPanel component has completed all three phases of development:
- ✅ Phase 1: Clean coordinate transformation implementation
- ✅ Phase 2: BaseMode architecture adoption  
- ✅ Phase 3: API compliance validation and testing

**Detailed Action Steps:**

1. **Copy Core Utilities** (Step 1 from Migration Guide):
   - Copy `zoom-demonstrator/coordinates.js` to `src/core/coordinates.js`
   - Copy `zoom-demonstrator/transformManager.js` to `src/core/transformManager.js`
   - Copy `zoom-demonstrator/types.js` to `src/types/zoom-types.js`

2. **Integrate Mode Classes** (Step 2 from Migration Guide):
   - Create `src/modes/zoom/` directory
   - Copy `zoom-demonstrator/PanMode.js` to `src/modes/zoom/PanMode.js`
   - Copy `zoom-demonstrator/ZoomMode.js` to `src/modes/zoom/ZoomMode.js`

3. **Update Mode Factory** (Step 3 from Migration Guide):
   - Edit `src/modes/ModeFactory.js` to import and register PanMode and ZoomMode
   - Add case statements for 'pan' and 'zoom' modes in the createMode method

4. **Update State Management** (Step 4 from Migration Guide):
   - Edit `src/core/state.js` to include zoom state initialization
   - Import PanMode and ZoomMode to get their initial states
   - Add zoomState object with scaleX, scaleY, panX, panY properties

5. **Update Main GramFrame Component** (Step 5 from Migration Guide):
   - Edit `src/main.js` to import TransformManager
   - Initialize TransformManager in constructor
   - Add zoom methods: `zoomByFactor()`, `resetZoom()`, `applyTransform()`

6. **Update UI Components** (Step 6 from Migration Guide):
   - Edit `src/components/UIComponents.js` to add zoom control buttons
   - Add event listeners for zoom in, zoom out, and reset functions

7. **Update Mode Switching UI** (Step 7 from Migration Guide):
   - Edit `src/components/ModeButtons.js` to include pan and zoom mode buttons
   - Add appropriate icons and labels for the new modes

8. **Update Event Handling** (Step 8 from Migration Guide):
   - Modify event delegation in main component to use TransformManager
   - Update coordinate calculations to use TransformManager's `getAllCoordinates()` method

9. **Update Axis Rendering** (Step 9 from Migration Guide):
   - Integrate axis updates after zoom/pan operations
   - Ensure axes reflect the current zoom/pan state correctly

10. **Add ResizeObserver Support** (Step 10 from Migration Guide):
    - Add ResizeObserver setup in main component
    - Ensure responsive behavior when container size changes

**Provide Necessary Context/Assets:**

- **Migration Guide**: Follow `zoom-demonstrator/MIGRATION_GUIDE.md` exactly for implementation steps
- **Integration Documentation**: Reference `zoom-demonstrator/INTEGRATION.md` for architectural context
- **Reusable Functions**: Use utilities from `zoom-demonstrator/reusableFunctions.js` as needed
- **Test Resources**: Leverage existing test files for validation:
  - `zoom-demonstrator/coordinateTests.js` for coordinate transformation testing
  - `zoom-demonstrator/apiComplianceTests.js` for API compliance verification

**Critical Implementation Notes:**
- Maintain 1:1 SVG-to-data coordinate mapping (not viewBox manipulation)
- Use transform-based zoom/pan operations
- Preserve separate X/Y zoom levels for aspect-ratio changes
- Implement pan limits to prevent showing beyond image boundaries
- Follow existing GramFrame BaseMode patterns exactly
- Ensure proper state management with listener pattern

## 3. Expected Output & Deliverables

**Define Success:** The task is successfully completed when:
- All zoom-demonstrator components are integrated into main GramFrame codebase
- Pan and Zoom modes are available in the mode switcher
- Zoom controls (zoom in, zoom out, reset) are functional
- Coordinate transformations work correctly across all test configurations
- All existing GramFrame functionality continues to work without regression
- State management properly handles zoom/pan state changes
- Axes update correctly during zoom/pan operations

**Specify Deliverables:**
- Modified `src/core/coordinates.js` with zoom-demonstrator coordinate utilities
- Modified `src/core/transformManager.js` with transform management
- New `src/types/zoom-types.js` with zoom-related type definitions
- New `src/modes/zoom/PanMode.js` and `src/modes/zoom/ZoomMode.js`
- Updated `src/modes/ModeFactory.js` with zoom mode registration
- Updated `src/core/state.js` with zoom state integration
- Updated `src/main.js` with TransformManager integration and zoom methods
- Updated `src/components/UIComponents.js` with zoom controls
- Updated `src/components/ModeButtons.js` with zoom mode buttons
- Updated event handling to use TransformManager coordinate methods
- Functional ResizeObserver integration

**Validation Requirements:**
- Run coordinate transformation tests to verify accuracy
- Test mode switching between all modes including pan/zoom
- Verify zoom controls work correctly
- Confirm axes update properly during zoom/pan operations
- Ensure no regression in existing functionality

## 4. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

**Format Adherence:** Adhere strictly to the established logging format. Ensure your log includes:
- A reference to GitHub Issue #95 and the ZoomPanel integration task
- A clear description of all actions taken during the integration process
- Any code snippets generated or modified during integration
- Any key decisions made or challenges encountered during the migration
- Confirmation of successful execution (e.g., tests passing, zoom functionality working)
- Details about any deviations from the Migration Guide and the reasoning

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. Pay particular attention to:
- Whether any existing GramFrame patterns conflict with the zoom-demonstrator approach
- If any additional testing beyond the provided test suites is required
- How to handle any potential conflicts between existing coordinate systems and the new TransformManager