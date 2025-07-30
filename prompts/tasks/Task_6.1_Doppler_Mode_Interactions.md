# APM Task Assignment: Implement Doppler Mode Interactions

## 1. Task Assignment

* **Reference Implementation Plan:** This assignment corresponds to the Doppler Mode implementation as described in `docs/Doppler-Calc.md` and extends the modular mode system established in Phase 4.
* **Objective:** Implement complete user interaction handling for Doppler mode, including marker placement, dragging, curve rendering, and speed calculations.
* **Detailed Action Steps:**
**Note:**  this file of legacy code includes functionality/code that could prove useful in implementation of this feature, including doppler curve creation, rendering, and dragging: https://github.com/DeepBlueCLtd/GramFrame/blob/main/src/modes/doppler/DopplerMode.js

  1. Implement marker placement interaction workflow
     - Handle first click to place f+ (fPlus) marker at cursor position
     - Handle drag to create diagonal line from f+ to preview f- position
     - On mouse release, place f- (fMinus) marker and calculate f₀ (fZero) midpoint
     - Ensure markers store both time and frequency coordinates as DopplerPoint type
  2. Implement marker dragging functionality
     - Detect when cursor hovers over existing markers (f+, f-, f₀)
     - Change cursor to 'grab' when hovering over draggable markers
     - Handle drag operations for all three markers
     - Update f₀ position automatically when f+ or f- is dragged (maintain midpoint)
     - Recalculate speed during and after drag operations
  3. Implement S-curve rendering between markers
     - Draw smooth S-shaped Doppler curve from f- to f+ using SVG path
     - Curve should pass through f₀ inflection point
     - Add vertical extension lines from f+ upward and f- downward
     - Update curve dynamically during marker dragging
     - Use red color for the curve (#ff0000)
  4. Implement marker visual representations
     - f+ marker: red dot or circle
     - f- marker: blue dot or circle  
     - f₀ marker: green cross-hair (draggable inflection point)
     - Add appropriate SVG elements to cursorGroup
  5. Implement right-click reset functionality
     - Clear all doppler markers on right-click
     - Reset doppler state appropriately
     - Update speed LED to show 0.0
  6. Add renderPersistentFeatures method to DopplerMode
     - Implement method to render all doppler features when called by FeatureRenderer
     - Should render markers and curve based on current state
     - Ensure proper cleanup before re-rendering
* **Provide Necessary Context/Assets:**
  - Review `docs/ADRs/ADR-001-SVG-Based-Rendering.md` for SVG rendering patterns
  - Review `docs/ADRs/ADR-008-Modular-Mode-System.md` for mode architecture
  - Coordinate transformations are handled by `src/utils/coordinates.js`
  - Doppler calculations are in `src/utils/doppler.js`
  - State structure defined in DopplerMode.getInitialState()
  - FeatureRenderer at `src/core/FeatureRenderer.js` calls renderPersistentFeatures()

## 2. Expected Output & Deliverables

* **Define Success:** 
  - Users can place doppler markers by clicking and dragging
  - Markers are draggable with appropriate cursor feedback
  - S-curve renders correctly and updates during drag
  - Speed calculations update in real-time
  - Right-click resets all markers
  - Features persist across mode switches via FeatureRenderer
* **Specify Deliverables:**
  - Updated `src/modes/doppler/DopplerMode.js` with complete interaction handling
  - Implementation of all mouse event handlers (handleMouseDown, handleMouseMove, handleMouseUp, handleContextMenu)
  - renderPersistentFeatures method implementation
  - Proper state management for all doppler interactions

## 3. Memory Bank Logging Instructions

* **Instruction:** Upon successful completion of this task, you **must** log your work comprehensively to the project's Memory Bank file.
* **Format Adherence:** Adhere strictly to the established logging format. Ensure your log includes:
  - A reference to this doppler mode interaction task
  - Clear description of the interaction workflows implemented
  - Key code snippets for marker placement and dragging logic
  - Any challenges with SVG curve rendering or coordinate calculations
  - Confirmation of successful interaction testing

## 4. Clarification Instruction

* **Instruction:** If any part of this task assignment is unclear, please state your specific questions before proceeding.