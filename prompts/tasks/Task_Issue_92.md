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

### Phase 1: Blank State Development
1. **Create demonstrator directory structure:**
   - Create `zoom-demonstrator/` directory in project root
   - Set up minimal module structure: `main.js`, `coordinates.js`, `ui.js`
   - Create `index.html` for testing the demonstrator

2. **Implement core coordinate transformation system:**
   - Build coordinate transformation chain supporting: screen → SVG → image → data
   - Implement zoom scaling factor in coordinate transformations, with zoom-in, zoom-out, and reset zoom buttons
   - Create unit tests for coordinate math functions
   - Use test images `sample/test-image.png` and `sample/test-image-scaled.png` for validation

3. **Add cursor positioning for validation:**
   - Display real-time cursor coordinates (pixel + logical coordinates)
   - Use grid pattern test images for visual verification of transformations
   - Implement visual debugging aids for coordinate validation

4. **Implement pan functionality:**
   - Create pan mode that allows dragging to move the view
   - Implement view offset state management
   - Update coordinate transformations to account for pan offset

5. **Implement zoom functionality:**
   - Create zoom mode with rectangle selection for zoom-in
   - Implement right-click for 2x zoom out or reset to 1:1 scale
   - Maintain zoom state and integrate with coordinate transformations
   - Ensure zoom interactions don't conflict with pan operations

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
- Use existing test images: `sample/test-image.png` (coordinate grid) and `sample/test-image-scaled.png` (900×300 scaled version)
- Maintain compatibility with GramFrame's SVG-based rendering architecture
- Follow established coordinate transformation patterns from `src/utils/coordinates.js`
- Ensure clean separation of event handling to avoid conflicts
- All coordinate math must include comprehensive unit tests

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
- [ ] Phase 1: Standalone demonstrator with pan/zoom + cursor validation using test images
- [ ] Phase 2: Refactor to BaseMode patterns while maintaining functionality  
- [ ] Phase 3: Achieve full API compliance with GramFrame architecture
- [ ] Extract reusable coordinate transformation functions with unit tests
- [ ] Document integration approach and validate coordinate accuracy

## 4. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

**Format Adherence:** Adhere strictly to the established logging format. Ensure your log includes:
- A reference to GitHub Issue #92 and this task assignment
- A clear description of the actions taken for each phase
- Key code snippets for coordinate transformation functions
- Any architectural decisions made regarding BaseMode integration
- Challenges encountered with coordinate system complexity
- Confirmation of successful execution (tests passing, demonstrator working)
- Documentation of reusable functions extracted for main codebase integration

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. Pay particular attention to:
- Coordinate transformation requirements and accuracy expectations
- BaseMode integration patterns from existing GramFrame architecture  
- Test image usage and coordinate validation approaches
- Unit testing expectations for coordinate math functions