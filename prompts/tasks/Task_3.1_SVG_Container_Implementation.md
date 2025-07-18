# APM Task Assignment: SVG Container Implementation

## 1. Agent Role & APM Context

You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project. Your role is to execute the assigned task diligently and log your work meticulously. You will interact with the Manager Agent (via the User) and contribute to the project's Memory Bank to ensure knowledge continuity.

## 2. Onboarding / Context from Prior Work

The GramFrame project has successfully completed Phase 1 (Bootstrapping + Dev Harness) and Phase 2 (Basic Layout and Diagnostics Panel). The current implementation:

- Has a working debug page (`debug.html`) that loads the component
- Displays a spectrogram image from a configuration
- Shows min/max time/frequency values
- Includes an LED-style readout panel below the image
- Has a diagnostics panel showing image information
- Implements state listener mechanisms

The component currently uses a basic HTML structure to display the spectrogram image. Your task is to refactor this to use SVG as the primary container, which will enable more sophisticated interaction features in subsequent tasks.

## 3. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to `Phase 3, Task 1: SVG Container Implementation` in the Implementation Plan.

**Objective:** Refactor the component to use SVG as the primary container, enabling proper coordinate system transformation and responsive behavior.

**Detailed Action Steps:**

1. **Refactor to use SVG as the primary container:**
   - Replace the current HTML container with an SVG element that will hold both the spectrogram image and future interactive elements
   - Ensure the SVG container has appropriate styling and dimensions to match the current layout
   - Implement proper namespacing for SVG elements
   - Ensure the SVG container rescales on resize as recommended in `docs/Component-Strategy.md`.

2. **Move spectrogram image into SVG:**
   - Use the SVG `<image>` element to embed the spectrogram within the SVG container
   - Maintain the same visual appearance and dimensions as the current implementation
   - Ensure the image loads correctly and displays at the proper size

3. **Implement proper scaling and positioning:**
   - Position the image element correctly within the SVG coordinate space
   - Set appropriate width and height attributes for both the SVG container and image element
   - Ensure the image maintains its aspect ratio when resized

4. **Add coordinate system transformation support:**
   - Implement functions to convert between:
     - Screen coordinates (pixels)
     - SVG coordinates (relative to the SVG viewBox)
     - Data coordinates (time and frequency values)
   - Create helper methods in the component API for these transformations
   - Document the coordinate transformation approach

5. **Implement axes on left/bottom sides with tick marks and labels:**
   - Allocate approximately 20px border around the image for axes
   - Draw time axis (vertical) along the left side with appropriate tick marks and labels
   - Draw frequency axis (horizontal) along the bottom with appropriate tick marks and labels
   - Implement dynamic tick density that adjusts based on available space
   - Ensure axes and labels are properly styled and readable
   - Follow the approach in `docs/Component-Strategy.md` for axis implementation

6. **Ensure responsive behavior with ResizeObserver:**
   - Implement a ResizeObserver to monitor the SVG container's dimensions
   - When the container resizes, update the SVG viewBox and image dimensions accordingly
   - Ensure all coordinate transformations remain accurate after resizing
   - Redraw axes with appropriate tick density when container size changes
   - Follow the approach outlined in the Component-Strategy.md document for dynamic redraw on resize

7. **Create integration tests:**
   - Implement Playwright tests to verify the SVG container functionality
   - Test that the image displays correctly within the SVG
   - Verify that coordinate transformations work accurately
   - Test that axes are rendered correctly with appropriate tick marks and labels
   - Verify that axes update properly when the container is resized
   - Test responsive behavior with different viewport sizes
   - Fix any broken integration tests before proceeding to the next task

## 4. Expected Output & Deliverables

**Success Criteria:**
- The spectrogram image is properly displayed within an SVG container
- Time and frequency axes are rendered on the left and bottom sides with appropriate tick marks and labels
- The component visually appears identical to the previous implementation, with the addition of axes
- Coordinate transformations accurately convert between screen, SVG, and data coordinates
- The component responds properly to container resizing, including dynamic adjustment of axis tick density
- All integration tests pass

**Deliverables:**
- Updated component code with SVG container implementation
- Time and frequency axes implementation with tick marks and labels
- Helper methods for coordinate transformations
- ResizeObserver implementation for responsive behavior
- Integration tests for all new functionality

## 5. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's `Memory_Bank.md` file. Adhere strictly to the established logging format. Ensure your log includes:
- A reference to the assigned task in the Implementation Plan
- A clear description of the actions taken
- Key code snippets showing the SVG implementation and coordinate transformations
- Any challenges encountered and how they were resolved
- Confirmation of successful execution through passing tests

## 6. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding.
