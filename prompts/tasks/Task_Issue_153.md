# APM Task Assignment: Implement Image Width Scaling (Issue #153)

## 1. Agent Role & APM Context

**Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project.

**Your Role:** As an Implementation Agent, you are responsible for executing assigned tasks diligently, following established architectural patterns, and logging your work meticulously in the Memory Bank.

**Workflow:** You will execute this task and report back to the Manager Agent (via the User) upon completion, ensuring all work is properly documented for future reference.

## 2. Task Assignment

**Reference Implementation Plan:** This assignment addresses GitHub Issue #153: "Shrink images more than 1500px width" as a maintenance and enhancement task for the GramFrame system.

**Objective:** Implement automatic image width scaling to ensure any spectrogram images wider than 1,500 pixels are automatically scaled down to 1,500 pixels maximum width, while preserving all existing GramFrame functionality.

**Detailed Action Steps:**

1. **Verify Existing Wide Image Test Setup:**
   - The project already has a wide image test case: `sample/mock-gram-large.png`
   - This image is being used in `debug-multiple.html` (GramFrame Instance 2a, second table)
   - Review this existing test setup to understand the current behavior with large images
   - Use this as the primary test case for validating the scaling implementation

2. **Analyze Current Image Handling:**
   - Review the current image loading and sizing logic in the GramFrame codebase
   - Identify where images are processed and rendered within the component
   - Document the current coordinate transformation system to understand scaling impact
   - **Architectural Context:** Reference ADR-001 (SVG-Based Rendering Architecture) and ADR-002 (Multiple Coordinate Systems) to understand how image scaling will interact with the existing coordinate transformation pipeline

3. **Implement Image Width Scaling Logic:**
   - Add logic to detect images wider than 1,500 pixels during component initialization
   - Implement automatic scaling that:
     - Maintains aspect ratio when scaling down
     - Updates internal coordinate calculations to account for the scaling
     - Preserves all existing functionality (cursors, overlays, interactions)
   - Ensure the scaling is applied before any coordinate system calculations
   - **Guidance:** The scaling should be transparent to the rest of the system - coordinate transformations should work identically regardless of whether an image was scaled

4. **Update Coordinate System Integration:**
   - Verify that the image scaling correctly integrates with the existing coordinate transformation utilities in `src/utils/coordinates.js`
   - Ensure that pixel-to-data coordinate conversions remain accurate after scaling
   - Test that SVG overlay positioning remains precise with scaled images

5. **Preserve Responsive Design:**
   - **Architectural Context:** Reference ADR-003 (Responsive Design with ResizeObserver) to ensure image scaling works correctly with the existing responsive behavior
   - Verify that the ResizeObserver continues to function correctly with scaled images
   - Test that container resizing still triggers appropriate recalculations

6. **Testing and Validation:**
   - Test the new functionality using `debug-multiple.html` with the existing `mock-gram-large.png`
   - Verify that all existing functionality works correctly:
     - Mode switching (Analysis, Harmonics, Doppler)
     - Cursor positioning and dragging
     - Feature rendering and persistence
     - Coordinate-based calculations
   - Test with both the large image (mock-gram-large.png) and existing smaller images (mock-gram.png, mock-gram-3.png)
   - Run the full test suite to ensure no regressions: `yarn test`
   - Use `debug-multiple.html` to visually compare behavior between scaled and non-scaled instances

**Provide Necessary Context/Assets:**
- Current image handling likely occurs during component initialization in `src/main.js`
- The coordinate system utilities in `src/utils/coordinates.js` will need to account for any scaling factor
- The SVG rendering system in `src/rendering/` must work correctly with scaled images
- Configuration parsing in `src/core/configuration.js` may need updates if it handles image dimensions

**Constraints and Requirements:**
- Maximum image width: 1,500 pixels (images wider than this should be scaled down)
- Maintain aspect ratio during scaling
- Preserve all existing GramFrame functionality
- No breaking changes to the public API
- Integration must be transparent to end users

## 3. Expected Output & Deliverables

**Define Success:** The task is successfully completed when:
- Images wider than 1,500 pixels are automatically scaled down to 1,500 pixels maximum width
- All existing GramFrame functionality works identically with both scaled and non-scaled images
- A wide image demonstrator is available for testing
- All existing tests continue to pass
- No regressions in functionality are introduced

**Specify Deliverables:**
- Modified code files implementing the image scaling logic
- Updated coordinate system handling to account for image scaling
- Validation that existing test setup in `debug-multiple.html` works correctly with scaling
- Confirmation that all tests pass (`yarn test` and `yarn typecheck`)
- Documentation of behavior changes (if any) when viewing `debug-multiple.html` with the scaling implementation

**Format:** 
- All code changes should follow existing code conventions and patterns
- Maintain JSDoc documentation for any new functions or significant logic changes
- Ensure proper error handling for edge cases

## 4. Memory Bank Logging Instructions (Mandatory)

Upon successful completion of this task, you **must** log your work comprehensively to the project's Memory Bank system.

**Format Adherence:** Adhere strictly to the established logging format. Ensure your log includes:
- A reference to GitHub Issue #153 and this task assignment
- A clear description of the implementation approach taken
- Code snippets showing key changes made to the image scaling logic
- Any architectural decisions made during implementation
- Results of testing with both wide and normal-sized images
- Confirmation of successful execution (tests passing, functionality preserved)
- Any challenges encountered and how they were resolved

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. Pay particular attention to:
- Whether the scaling should be applied at image load time or during rendering
- How the scaling factor should be communicated to coordinate transformation functions
- Whether existing sample images should be preserved or if new test cases are sufficient