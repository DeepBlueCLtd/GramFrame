# APM Task Assignment: Spectrogram SVG Component Reinstatement

## 1. Agent Role & APM Context

You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame spectrogram analysis component project.

**Your Role:** Execute assigned tasks diligently, implement the spectrogram SVG overlay system, and log work meticulously to the Memory Bank.

**Workflow:** You will interact with the Manager Agent (via the User) and contribute detailed progress logs to the Memory Bank for project continuity and future reference.

## 2. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to implementing the core spectrogram display functionality that was previously removed from the codebase.

**Objective:** Reinstate the spectrogram component by replacing the image element with an SVG-based overlay system that displays time and frequency axes on the edges of the image, includes zoom controls, and maintains all existing interactive functionality.

**Detailed Action Steps:**

### Phase 1: SVG Container and Image Integration

1. **Create SVG Container Structure:**
   - Modify `src/components/table.js` to add SVG container creation in `createComponentStructure()`
   - Add SVG element with proper viewBox setup to `mainCell`
   - Ensure SVG maintains aspect ratio with image dimensions
   - Guidance: Use `calculateLayoutDimensions()` from `src/utils/svg.js` for proper margin calculations

2. **Integrate Spectrogram Image Display:**
   - Load and display the spectrogram image within the SVG container
   - Position image element within SVG coordinate system
   - Ensure image scaling preserves coordinate accuracy
   - Guidance: Leverage existing `imageDetails` state from `src/core/state.js` for dimensions

3. **Update DOM Structure:**
   - Restore SVG display element references in `src/main.js` constructor
   - Connect SVG element to existing coordinate transformation utilities
   - Update CSS targeting to include SVG container styling

### Phase 2: Axes Rendering System

4. **Implement Time Axis:**
   - Create time axis along bottom edge with appropriate tick marks
   - Calculate tick positions based on `config.timeMin` and `config.timeMax`
   - Add time labels with proper formatting using `src/utils/timeFormatter.js`
   - Guidance: Use margins (left: 60px, bottom: 50px) as specified in CLAUDE.md

5. **Implement Frequency Axis:**
   - Create frequency axis along left edge with logarithmic or linear scaling
   - Calculate tick positions based on `config.freqMin` and `config.freqMax`
   - Include rate scaling factor in frequency calculations
   - Add frequency labels with Hz units

6. **Axis Styling and Responsive Behavior:**
   - Apply military-style axis styling from `src/gramframe.css`
   - Ensure axes update on container resize using existing ResizeObserver
   - Handle zoom level changes for axis scaling

### Phase 3: Zoom Controls Implementation

7. **Create Zoom Control UI:**
   - Add zoom in/out buttons to the UI alongside existing mode controls
   - Implement zoom level state management in existing state system
   - Connect zoom controls to SVG viewBox transformations
   - Guidance: Follow existing UI component patterns from `src/components/UIComponents.js`

8. **Implement Zoom Functionality:**
   - Add zoom level to state management system
   - Implement viewBox manipulation for zoom operations
   - Maintain cursor coordinate accuracy during zoom
   - Preserve existing coordinate transformation functions in `src/utils/coordinates.js`

### Phase 4: Integration and Event Handling

9. **Restore Event Handling:**
   - Re-enable mouse event handling in `src/core/events.js`
   - Connect SVG element to existing coordinate transformation pipeline
   - Ensure all existing modes (Analysis, Harmonics, Doppler) work with SVG overlay
   - Update cursor coordinate calculations for SVG coordinate system

10. **Update Feature Rendering:**
    - Restore functionality in `src/core/FeatureRenderer.js`
    - Re-enable cursor and feature rendering on SVG overlay
    - Ensure cross-mode feature persistence works with SVG system
    - Update rendering methods in all mode classes

11. **CSS and Styling Integration:**
    - Ensure existing `.gram-frame-svg` styles apply correctly
    - Update military theme styling for axes and zoom controls
    - Maintain responsive behavior with existing table layout system

### Technical Integration Requirements:

- **Preserve Existing Architecture:** Maintain the modular mode system, state management, and coordinate transformation utilities
- **Coordinate System Consistency:** Ensure `screenToSVGCoordinates()`, `imageToDataCoordinates()`, and `dataToSVGCoordinates()` functions work seamlessly with the new SVG container
- **State Management:** Integrate zoom level and SVG display state into existing state system without breaking current functionality
- **Event Handling:** Restore all mouse/touch interactions while preserving the existing event delegation pattern
- **Performance:** Maintain responsive behavior during resize operations and zoom changes

## 3. Expected Output & Deliverables

**Define Success:** 
- Spectrogram image displays within SVG container with proper scaling
- Time and frequency axes render correctly with appropriate labels and ticks
- Zoom controls function properly with smooth zoom in/out operations
- All existing modes (Analysis, Harmonics, Doppler) work without regression
- Coordinate transformations maintain accuracy across zoom levels
- ResponsiveObserver continues to work for container resizing

**Specify Deliverables:**
- Modified `src/components/table.js` with SVG container creation
- Updated `src/main.js` with restored SVG element references
- New or updated axes rendering functionality
- Zoom control UI components and functionality
- Restored event handling in `src/core/events.js`
- Updated `src/core/FeatureRenderer.js` with SVG rendering
- All existing tests continue to pass

**Format:** Standard JavaScript ES6 modules following existing code patterns and JSDoc documentation standards.

## 4. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

**Format Adherence:** Adhere strictly to the established logging format. Ensure your log includes:
- A reference to this assigned task (Task 7.1: Spectrogram SVG Component Reinstatement)
- A clear description of the actions taken for each phase
- Any code snippets generated or modified
- Key decisions made regarding coordinate system integration and zoom implementation
- Any challenges encountered with SVG/image integration
- Confirmation of successful execution (all modes working, tests passing, zoom functional)

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. Pay particular attention to:
- Integration points with existing coordinate transformation system
- Zoom level state management approach
- Axis rendering positioning and margin requirements
- Event handling restoration without breaking existing mode functionality