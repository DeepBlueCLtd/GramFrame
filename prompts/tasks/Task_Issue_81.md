# APM Task Assignment: Region Zoom Controls with Aspect Ratio Support

## 1. Agent Role & APM Context

**Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project.

**Your Role:** As an Implementation Agent, you are responsible for executing assigned tasks diligently and logging work meticulously. You will implement the region zoom functionality according to the specifications outlined in this assignment.

**Workflow:** You will interact with the Manager Agent (via the User) to receive task assignments and provide progress updates. All completed work must be comprehensively logged to the project's Memory Bank to maintain continuity and knowledge transfer.

## 2. Task Assignment

**Reference Implementation Plan:** This assignment addresses GitHub Issue #81 and implements a new feature request for region zoom controls with aspect ratio support in the GramFrame spectrogram interface.

**Objective:** Implement a comprehensive region zoom system that allows users to select arbitrary rectangular areas on the spectrogram and zoom into those regions while maintaining coordinate system integrity and handling aspect ratio changes.

**Detailed Action Steps:**

1. **Add Toggle Zoom Tool Button**
   - Create a new zoom tool button in the existing control interface (`src/components/UIComponents.js`)
   - Implement toggle state management for the zoom tool
   - Ensure visual feedback shows when zoom mode is active

2. **Implement Mutually Exclusive Behavior with Pan**
   - Modify the existing pan button functionality to deactivate when zoom is selected
   - Ensure zoom tool deactivates when pan mode is activated
   - Update state management to handle mutual exclusion properly

3. **Create Region Selection Functionality**
   - Implement click-and-drag region selection on the spectrogram SVG
   - Allow users to select rectangular areas of any dimensions (arbitrary aspect ratios)
   - Provide visual feedback during region selection (e.g., selection rectangle overlay)
   - Handle edge cases such as minimum selection size and boundary constraints

4. **Implement Core Zoom Functionality**
   - Create zoom logic that focuses the view on the selected region
   - Handle aspect ratio changes when the selected region has different proportions than the current view
   - Ensure smooth transition between normal and zoomed states

5. **Update Image Rendering System**
   - Modify image display logic to handle cropped/zoomed regions
   - Ensure proper scaling and positioning of the spectrogram image within the new zoom bounds
   - Maintain image quality and clarity during zoom operations

6. **Adapt Axis Rendering**
   - Update `src/rendering/axes.js` to handle new zoom dimensions
   - Recalculate time and frequency axis scales for the zoomed region
   - Ensure axis labels and tick marks remain accurate and readable

7. **Preserve Coordinate System Integrity**
   - Update `src/utils/coordinates.js` to maintain accurate coordinate transformations after zoom
   - Ensure all coordinate conversions (screen → SVG → image → data) remain valid
   - Test coordinate accuracy with cursors and markers in zoomed state

8. **Add Zoom Reset/Out Controls**
   - Implement zoom out functionality to return to previous zoom level
   - Add reset zoom functionality to return to original full view
   - Show/hide these controls appropriately based on zoom state

9. **Ensure Cross-Mode Compatibility**
   - Test zoom functionality with Analysis, Harmonics, and Doppler modes
   - Ensure features and cursors remain accurately positioned after zoom
   - Coordinate with `src/core/FeatureRenderer.js` for feature positioning accuracy

**Provide Necessary Context/Assets:**

**Key Files to Modify:**
- `src/components/UIComponents.js` - Add zoom toggle button and pan/zoom mutual exclusion
- `src/rendering/axes.js` - Update axis rendering for zoom bounds
- `src/utils/coordinates.js` - Maintain coordinate system integrity
- `src/core/FeatureRenderer.js` - Ensure feature positioning accuracy
- `src/main.js` - Integrate zoom functionality into main GramFrame class

**Architecture Context:**
- The GramFrame uses SVG-based rendering with precise coordinate transformations
- State management follows a centralized pattern with listener notifications
- The component supports responsive design with ResizeObserver
- All modes (Analysis, Harmonics, Doppler) must maintain functionality after zoom

**Technical Constraints:**
- Maintain the existing coordinate transformation system architecture
- Preserve responsive behavior during zoom operations
- Ensure memory efficiency when handling zoomed image regions
- Support arbitrary aspect ratio changes while maintaining visual quality

## 3. Expected Output & Deliverables

**Define Success:**
- Users can toggle between zoom and pan modes using dedicated buttons
- Users can click and drag to select any rectangular region on the spectrogram
- The view smoothly zooms into the selected region, adapting to aspect ratio changes
- All coordinate systems remain accurate, with cursors and features positioning correctly
- Zoom out/reset functionality allows users to return to previous states
- All existing modes (Analysis, Harmonics, Doppler) continue to function correctly in zoomed state

**Specify Deliverables:**
- Modified `src/components/UIComponents.js` with zoom toggle button and mutual exclusion logic
- Updated `src/rendering/axes.js` with zoom-aware axis rendering
- Enhanced `src/utils/coordinates.js` with zoom-compatible coordinate transformations
- Modified `src/core/FeatureRenderer.js` ensuring accurate feature positioning during zoom
- Updated `src/main.js` integrating zoom functionality
- New zoom-related utility functions as needed
- Visual feedback for region selection (selection rectangle overlay)
- Zoom reset/out controls that appear when in zoomed state

**Format:** All code should follow the existing project conventions, use proper JSDoc annotations, and maintain the unminified build output for field debugging.

## 4. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

**Format Adherence:** Adhere strictly to the established logging format detailed in [Memory_Bank_Log_Format.md](../02_Utility_Prompts_And_Format_Definitions/Memory_Bank_Log_Format.md). Ensure your log includes:
- A reference to GitHub Issue #81 and this task assignment
- A clear description of the zoom functionality implementation approach
- Key architectural decisions made for handling aspect ratio changes
- Code snippets of the main zoom logic and coordinate system updates
- Integration points with existing pan functionality and mode system
- Any challenges encountered with coordinate transformations or image rendering
- Confirmation of successful execution with all modes tested
- Performance considerations and memory usage impact

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. Pay particular attention to:
- The exact behavior expected for aspect ratio handling during zoom
- Integration requirements with the existing pan functionality
- Performance expectations for large spectrogram images during zoom
- Visual design preferences for the zoom selection interface