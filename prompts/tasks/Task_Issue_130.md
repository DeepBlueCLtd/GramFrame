# APM Task Assignment: Fix Manual Harmonics Visibility When Zoomed

## 1. Agent Role & APM Context

**Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame interactive spectrogram analysis project.

**Your Role:** As an Implementation Agent, you are responsible for executing assigned tasks diligently, implementing code changes according to specifications, and logging your work meticulously to the project's Memory Bank.

**Workflow:** You will work independently to complete the assigned task, then report back to the Manager Agent (via the User) with your results. All work must be documented in the Memory Bank to maintain project continuity.

## 2. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to GitHub Issue #130 in the project's issue tracker, addressing a user experience bug in the Harmonics mode functionality.

**Objective:** Fix the manual harmonics positioning issue where newly added harmonic sets are placed at the center of the overall time period instead of the center of the currently visible (zoomed) time period.

**Detailed Action Steps:**

1. **Analyze Current Implementation:**
   - Examine the manual harmonic modal functionality in `src/modes/harmonics/ManualHarmonicModal.js`
   - Understand how the `anchorTime` is currently calculated (lines 84-90)
   - Study the zoom/viewport system in `src/core/viewport.js` to understand how visible time periods are managed
   - Review the coordinate transformation utilities in `src/utils/coordinateTransformations.js`

2. **Identify the Root Cause:**
   - Determine how the current implementation calculates the anchor time for manual harmonics
   - Verify that it uses the full time range (`timeMin` to `timeMax`) instead of the visible time range
   - Understand the relationship between zoom state and visible time periods

3. **Implement the Fix:**
   - Modify the anchor time calculation in `ManualHarmonicModal.js` to use the center of the visible time period when zoomed
   - **Guidance:** The visible time period should be calculated based on the current zoom level and center point from `state.zoom`
   - **Guidance:** Use coordinate transformation utilities to determine the visible time range based on the current viewport
   - Ensure backward compatibility when zoom level is 1.0 (no zoom)

4. **Update Coordinate Calculation Logic:**
   - Add a helper function to calculate the visible time range based on current zoom state
   - Modify the manual harmonic modal to call this function when determining anchor time
   - **Guidance:** The visible time range calculation should use `state.zoom.level`, `state.zoom.centerX`, and `state.zoom.centerY` along with the base time configuration

5. **Test the Implementation:**
   - Verify that manual harmonics are placed at the center of the visible viewport when zoomed in
   - Confirm that harmonics are immediately visible after creation when the view is zoomed
   - Ensure no regression when not zoomed (zoom level 1.0)
   - Test with various zoom levels and center points

**Required Context/Assets:**

- **Current Issue:** Manual harmonics are placed using `(state.config.timeMin + state.config.timeMax) / 2` which uses the full time range
- **Expected Behavior:** Manual harmonics should use the center of the currently visible time period when zoomed
- **Key Files:**
  - `src/modes/harmonics/ManualHarmonicModal.js` - Contains the current anchor time calculation
  - `src/core/viewport.js` - Contains zoom state management and coordinate systems
  - `src/utils/coordinateTransformations.js` - Contains coordinate transformation utilities
  - `src/modes/harmonics/HarmonicsMode.js` - Contains harmonic set creation logic

**Architecture Reference:** This task relates to ADR-015-Viewport-Based-Zoom which establishes the coordinate transformation patterns for zoom functionality. Review this ADR to understand the established patterns for viewport-based calculations.

## 3. Expected Output & Deliverables

**Define Success:** The task is successfully completed when:
- Manual harmonics are positioned at the center of the visible time period when the view is zoomed in
- Users can immediately see newly created manual harmonics without having to zoom out
- No regression occurs when not zoomed (zoom level 1.0)
- All existing tests pass and the fix is verified through testing

**Specify Deliverables:**
- Modified `src/modes/harmonics/ManualHarmonicModal.js` with updated anchor time calculation
- Any additional helper functions for visible time range calculation
- Updated coordinate transformation logic if needed
- Test verification demonstrating the fix works correctly

**Format:** Code changes should maintain the existing code style and JSDoc documentation patterns used throughout the project.

## 4. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

**Format Adherence:** Adhere strictly to the established logging format. Ensure your log includes:
- A reference to GitHub Issue #130 and this task assignment
- A clear description of the problem and the implemented solution
- Key code changes made to fix the anchor time calculation
- Any new helper functions or utilities created
- Confirmation of successful testing and verification
- Any important technical decisions made during implementation

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. Pay particular attention to the zoom coordinate system and how visible time ranges should be calculated based on the current viewport state.