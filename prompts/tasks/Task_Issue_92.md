# APM Task Assignment: Create Drag-to-Zoom Demonstrator Project

## 1. Agent Role & APM Context

**Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame drag-to-zoom enhancement project.

**Your Role:** You will execute the assigned tasks diligently, implementing a demonstrator project that validates coordinate transformation and zoom functionality before integration into the main GramFrame codebase.

**Workflow:** You will work under the direction of the Manager Agent (via the User) and must log all work meticulously to the Memory Bank for project continuity.

## 2. Task Assignment

**Reference GitHub Issue:** This assignment corresponds to GitHub Issue #92: "Create drag-to-zoom demonstrator project to address coordinate transformation complexity"

**Objective:** Create a separate mini-project demonstrator that implements pan and zoom functionality with core features to validate coordinate system transformations before integrating into the main GramFrame component.

**Context:** The main GramFrame component has complex architecture with multiple coordinate systems (screen → SVG → image → data) that make implementing zoom difficult. This demonstrator approach will validate coordinate math and integration patterns before production implementation.

**Detailed Action Steps:**

### Phase 1: Clean Implementation (RESTART APPROACH)
**Strategy Change:** After encountering coordinate transformation complexity due to multiple abstraction layers, we are restarting with a clean, simplified approach using the most challenging test case first.

**Primary Test Case:** `sample/test-image-offset-axes.png`
- **Image dimensions**: 1000×500 pixels
- **Data coordinate ranges**: 100-900 Hz, 100-500 time units
- **Key challenge**: Image pixels ≠ data coordinates, non-zero ranges

**SVG-to-Data Coordinate Mapping (1:1 direct alignment):**
- **SVG coordinate space**: 100-900, 100-500 (matches data coordinates exactly)
- **Data coordinate space**: 100-900 Hz, 100-500 time (logical coordinates)
- **Image dimensions**: 1000×500 pixels (physical image size)
- **Key insight**: SVG coordinates = data coordinates (1:1), image pixels ≠ data coordinates

1. **Create clean coordinate system from scratch:**
   - Remove existing JS files and rebuild with offset-axes image as default
   - Implement direct SVG-to-data coordinate mapping without abstraction layers
   - Use direct 1:1 mapping: `dataX = svgX`, `dataY = svgY` (SVG coordinates = data coordinates)
   - Create unit tests for coordinate math functions

2. **Build minimal UI with coordinate validation:**
   - Display real-time cursor coordinates (screen, SVG, data)
   - Use offset-axes test image for immediate validation of non-zero ranges
   - Implement visual debugging to verify coordinate transformations

3. **Implement pan functionality:**
   - Create pan mode that allows dragging to move the view
   - Implement view offset state management with separate X/Y zoom levels
   - Update coordinate transformations to account for pan offset

4. **Implement zoom functionality:**
   - Create zoom mode with rectangle selection for zoom-in
   - Support aspect-ratio changing zoom (separate X/Y scaling)
   - Implement right-click for zoom out or reset to 1:1 scale
   - Ensure zoom interactions work correctly with non-zero coordinate ranges

### Phase 2: GramFrame Pattern Adoption
6. **Refactor to BaseMode structure:**
   - Implement `BaseMode` class following GramFrame patterns
   - Create `PanMode` and `ZoomMode` classes extending BaseMode
   - Implement mode switching functionality
   - Ensure BaseMode integration doesn't break coordinate transformations

7. **Implement state management patterns:**
   - Create centralized state management following GramFrame's state.js patterns
   - Implement listener pattern for state changes
   - Ensure shared zoom/pan state across all modes
   - Test mode switching with state persistence

8. **Mirror GramFrame APIs:**
   - Gradually adopt GramFrame API patterns for integration compatibility
   - Implement ResizeObserver integration for responsive behavior
   - Ensure SVG-based rendering compatibility

### Phase 3: API Compliance & Integration
9. **Validate coordinate transformation integration:**
   - Test coordinate transformations work correctly across zoom/pan operations
   - Validate integration with existing GramFrame coordinate systems
   - Ensure accuracy with scaled test images (pixel space ≠ coordinate space)

10. **Extract reusable functions:**
    - Create reusable coordinate transformation functions
    - Document integration approach and API compatibility
    - Prepare for migration to main codebase

**Constraints & Requirements:**
- **Primary test case**: `sample/test-image-offset-axes.png` (1000×500 pixels, 100-900 Hz, 100-500 time)
- **Secondary test cases**: `sample/test-image.png` and `sample/test-image-scaled.png` for compatibility validation
- Maintain direct 1:1 SVG-to-data coordinate mapping without axis label space
- Implement separate X/Y zoom levels for aspect-ratio changing zoom
- Use transform-based zoom/pan (not viewBox manipulation)
- All coordinate math must include comprehensive unit tests
- Clean, minimal architecture - avoid multiple abstraction layers that hide coordinate transformation errors

## 3. Expected Output & Deliverables

**Define Success:** 
- Working demonstrator with pan and zoom functionality
- Validated coordinate transformations across all zoom/pan operations  
- BaseMode-compatible architecture ready for integration
- Comprehensive unit tests for coordinate math
- Real-time coordinate display showing accurate transformations

**Specify Deliverables:**
- `zoom-demonstrator/` directory with complete demonstrator project
- `zoom-demonstrator/index.html` - Test page for demonstrator
- `zoom-demonstrator/main.js` - Main demonstrator class
- `zoom-demonstrator/coordinates.js` - Coordinate transformation functions with unit tests
- `zoom-demonstrator/ui.js` - UI components and event handling
- `zoom-demonstrator/PanMode.js` - Pan mode BaseMode implementation
- `zoom-demonstrator/ZoomMode.js` - Zoom mode BaseMode implementation
- Working pan functionality (drag to move view)
- Working zoom functionality (drag rectangle to zoom in, right-click to zoom out/reset)
- Real-time cursor coordinate display (pixel + logical coordinates)
- Unit tests demonstrating coordinate transformation accuracy
- Documentation of integration approach

**Success Criteria:**
- [ ] Phase 1: Clean demonstrator with offset-axes image as primary test case
  - [ ] Direct SVG-to-data coordinate mapping (100-900/100-500 SVG = 100-900/100-500 data)
  - [ ] Real-time coordinate display showing screen, SVG, and data coordinates
  - [ ] Pan functionality with drag-to-move and proper coordinate transformation
  - [ ] Zoom functionality with rectangle selection and aspect-ratio changing zoom
  - [ ] Separate X/Y zoom levels and transform-based implementation
- [ ] Phase 2: Refactor to BaseMode patterns while maintaining functionality  
- [ ] Phase 3: Achieve full API compliance with GramFrame architecture
- [ ] Extract reusable coordinate transformation functions with unit tests
- [ ] Validate coordinate accuracy across all three test images

## 4. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

**Format Adherence:** Adhere strictly to the established logging format. Ensure your log includes:
- A reference to GitHub Issue #92 and this task assignment
- A clear description of the restart strategy and rationale
- Key code snippets for direct SVG-to-data coordinate transformation functions
- Documentation of 1:1 coordinate mapping approach (no axis label space)
- Lessons learned from coordinate transformation complexity
- Architectural decisions made regarding clean, minimal approach
- Confirmation of successful execution with offset-axes test image
- Documentation of reusable functions extracted for main codebase integration

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. Pay particular attention to:
- Direct SVG-to-data coordinate mapping requirements (1:1 without axis label space)
- Offset-axes test image coordinate validation (100-900/100-500 SVG = 100-900/100-500 data, 1000×500 pixels)
- Transform-based zoom/pan implementation (not viewBox manipulation)
- Separate X/Y zoom levels for aspect-ratio changing zoom
- Clean architecture approach to avoid coordinate transformation errors
- Unit testing expectations for coordinate math functions with non-zero ranges