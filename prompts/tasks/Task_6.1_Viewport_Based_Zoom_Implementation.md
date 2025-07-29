# APM Task Assignment: Viewport-Based Zoom Implementation

## 1. Agent Role & APM Context

You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame spectrogram analysis project. Your role is to execute assigned tasks diligently and log your work meticulously to the project's Memory Bank. You will receive task assignments from the Manager Agent (via the User) and must communicate any issues or clarifications needed before proceeding.

## 2. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to a new Phase 6 in the Implementation Plan - "Viewport-Based Zoom Architecture Implementation". This phase implements the architectural decision documented in ADR-015: Viewport-Based Zoom Architecture.

**Objective:** Implement a complete viewport-based zoom system that replaces the current SVG rendering architecture with a new structure managed by `table.js`, using SVG viewBox manipulation instead of transforms to achieve zoom functionality while maintaining perfect alignment between image features and overlays.

**Detailed Action Steps:**

### Phase 6.1: Foundation (Minimal Viable Zoom)

1. **Initialize SVG Architecture Restructure**
   - Create new `instance.svg` object structure within `table.js`
   - Begin migration of rendering responsibilities from GramFrame main class to table-level SVG management
   - **Immediately delete any e2e test sub-components that break** due to missing spectrogram functionality during restructure
   - **Add clear obsolescence warnings to Memory_Bank.md** for sections that reference the old SVG architecture
   - Guidance: The new structure should completely replace existing SVG rendering, not augment it

2. **Implement Core Viewport-Based Zoom**
   - Implement `instance.svg` with SVG viewBox manipulation for zoom functionality
   - Create zoom state management that tracks current viewBox parameters (x, y, width, height)
   - Implement zoom level calculations that modify viewBox to show smaller portions of coordinate space
   - **Add comprehensive e2e tests for zoom functionality** including viewBox parameter validation and zoom level calculations
   - Guidance: Use `svg.setAttribute('viewBox', '250 150 500 300')` pattern for 2x zoom of center portion

3. **Add Zoom Control Interface**
   - Implement zoom +/- buttons and pan controls in the existing UI structure
   - Connect controls to viewBox manipulation functions
   - Ensure controls provide smooth, predictable zoom behavior with consistent zoom factors
   - **Add e2e tests for zoom controls** including button interactions and expected viewBox changes
   - Guidance: Integrate with existing UIComponents structure, maintain current styling patterns

4. **Implement Axes and Labels with Zoom**
   - Ensure time/frequency axis rendering works correctly at all zoom levels
   - Implement axis scaling and label updating for zoomed viewports
   - Maintain proper axis margins (left: 60px, bottom: 50px) as specified in architecture
   - Display accurate time/frequency values that correspond to visible viewport
   - **Add e2e tests for axis rendering with zoom** including label accuracy and margin preservation
   - Guidance: Axes must be redrawn for visible coordinate range, similar to current approach but adapted for viewBox

### Phase 6.2: Feature Migration

5. **Migrate Analysis Mode to New Structure**
   - Move Analysis mode marker functionality to work with new SVG structure
   - Ensure persistent draggable markers maintain correct positioning with zoom
   - Preserve cross-mode marker visibility and interactions
   - **Add e2e tests for marker creation/dragging with zoom** including position accuracy and persistence
   - Guidance: Coordinate transformation utilities should remain largely unchanged per ADR-015

6. **Migrate Harmonics Mode to New Structure**
   - Move Harmonics mode calculations and display to new SVG architecture
   - Ensure real-time harmonic calculation works during zoom interactions
   - Maintain harmonic line rendering accuracy across zoom levels
   - **Add e2e tests for harmonics functionality with zoom** including calculation accuracy and line rendering
   - Guidance: Harmonic calculations should work unchanged since they use coordinate utilities

7. **Migrate Doppler Mode to New Structure**
   - Move Doppler mode speed calculations to new SVG structure
   - Ensure bearing and time inputs work correctly with zoomed viewports
   - Maintain calculation accuracy across all zoom levels
   - **Add e2e tests for Doppler functionality with zoom** including speed calculations and input handling
   - Guidance: Mode should work without modification per ADR-015 principles

### Phase 6.3: Integration & Polish

8. **Integrate Zoom State with GramFrame State Management**
   - Ensure zoom state integrates seamlessly with existing state management system
   - Implement state listener notifications for zoom changes
   - Maintain state broadcasting pattern for external systems
   - **Add e2e tests for state persistence** including zoom state in listener notifications
   - Guidance: Deep-copy zoom state before passing to listeners to prevent mutations

9. **Performance Optimization and Comprehensive Testing**
   - Optimize viewBox update performance for smooth zoom interactions
   - Implement proper clipping of content to axis boundaries
   - Ensure efficient handling of frequent viewBox changes
   - **Add comprehensive e2e test coverage** for all zoom scenarios and edge cases
   - Guidance: Modern browsers handle SVG viewBox changes efficiently per ADR-015

10. **Final Integration and Memory Bank Update**
    - Complete integration testing with full regression test suite
    - Validate all modes work correctly with zoom functionality
    - **Update Memory_Bank.md with new architecture details** removing obsolescence warnings
    - Document any architectural changes or lessons learned

**Provide Necessary Context/Assets:**

- **Reference ADR-015: Viewport-Based Zoom Architecture** - Review this ADR thoroughly to understand the architectural rationale and core principles
- **Reference ADR-002: Multiple Coordinate Systems** - Understand existing coordinate transformation system that should remain largely unchanged
- **Current codebase structure** in `/src/` directory, particularly:
  - `src/components/table.js` - Target for new SVG structure
  - `src/main.js` - Current GramFrame class with rendering to be migrated
  - `src/modes/` - Mode classes that need minimal changes
  - `src/utils/coordinates.js` - Coordinate utilities to be preserved
  - `src/core/state.js` - State management system for integration

## 3. Expected Output & Deliverables

**Define Success:**
- Complete viewport-based zoom system implemented using SVG viewBox manipulation
- All existing functionality (Analysis, Harmonics, Doppler modes) working seamlessly with zoom
- Perfect alignment between image features and overlays at all zoom levels maintained automatically
- Comprehensive e2e test suite with no regressions from previous functionality
- Clean architectural separation with zoom managed at table level

**Specify Deliverables:**
- Modified `src/components/table.js` with new `instance.svg` object and zoom management
- Updated mode classes with minimal changes for new structure compatibility
- New zoom control UI integrated with existing interface
- Comprehensive e2e test suite covering all zoom functionality
- Updated Memory_Bank.md reflecting new architecture
- Documentation of any architectural insights or implementation decisions

## 4. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file. Adhere strictly to the established logging format. Ensure your log includes:

- A reference to this Phase 6 task assignment and its relationship to ADR-015
- A clear description of the architectural changes made in the SVG restructure
- Code snippets for key zoom implementation components (viewBox manipulation, coordinate integration)
- Any architectural decisions made or challenges encountered during the migration
- Confirmation of successful execution including test results and functionality validation
- Documentation of any obsolete Memory Bank entries that were updated or removed

## 5. Clarification Instruction

If any part of this task assignment is unclear, especially regarding the architectural restructure or integration with existing systems, please state your specific questions before proceeding. This is a significant architectural change that affects the entire rendering system, so clarity is essential for successful execution.