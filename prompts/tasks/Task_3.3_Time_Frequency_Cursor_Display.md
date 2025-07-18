# APM Task Assignment: Time/Frequency Cursor Display

## 1. Agent Role & APM Context

You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project. Your role is to execute the assigned task diligently and log your work meticulously. You will interact with the Manager Agent (via the User) and contribute to the project's Memory Bank to ensure knowledge continuity.

## 2. Onboarding / Context from Prior Work

The GramFrame project has successfully completed:
- Task 3.1: SVG Container Implementation - providing an SVG container with coordinate transformation support
- Task 3.2: Mouse Tracking - implementing mouse movement tracking and coordinate conversion

The component now tracks mouse movement over the spectrogram and converts screen coordinates to data space (time and frequency values). Your task builds on this foundation by implementing visual feedback for the cursor position and updating the LED display with the current time and frequency values.

## 3. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to `Phase 3, Task 3: Time/Frequency Cursor Display` in the Implementation Plan.

**Objective:** Calculate time and frequency values at the cursor position, update the LED display with these values, and add a visual indicator for the cursor position.

**Detailed Action Steps:**

1. **Calculate time and frequency values at cursor position:**
   - Use the coordinate conversion functions to determine precise time and frequency values
   - Apply appropriate rounding or formatting to these values for display
   - Handle edge cases where the cursor is outside the valid data range
   - Ensure calculations remain accurate regardless of container size

2. **Update LED display with current values:**
   - Connect the mouse tracking data to the existing LED display components
   - Update the time and frequency values in the LED display as the mouse moves
   - Format the values appropriately (e.g., proper decimal places, units)
   - Implement smooth updates to prevent flickering during rapid mouse movement

3. **Add visual indicator for cursor position:**
   - Create SVG elements (e.g., crosshair, lines, or point) to indicate the cursor position
   - Position these elements accurately based on the mouse coordinates
   - Style the indicator elements for clear visibility against the spectrogram
   - Ensure the indicators move smoothly with the mouse
   - Make the indicators responsive to container resizing

4. **Create integration tests:**
   - Implement Playwright tests to verify cursor display functionality
   - Test that LED values update correctly with mouse movement
   - Verify visual indicators appear and move with the cursor
   - Test calculation accuracy at different positions on the spectrogram
   - Ensure edge cases are handled properly
   - Fix any broken integration tests before proceeding to the next task

## 4. Expected Output & Deliverables

**Success Criteria:**
- Time and frequency values are accurately calculated at the cursor position
- LED display updates correctly with the current values as the mouse moves
- Visual indicators clearly show the cursor position on the spectrogram
- All elements respond properly to container resizing
- All integration tests pass

**Deliverables:**
- Implementation of time/frequency calculation at cursor position
- LED display update functionality
- Visual cursor position indicators
- Integration tests for all new functionality

## 5. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's `Memory_Bank.md` file. Adhere strictly to the established logging format. Ensure your log includes:
- A reference to the assigned task in the Implementation Plan
- A clear description of the cursor display implementation
- Code snippets showing the LED update mechanism and visual indicators
- Any challenges encountered and how they were resolved
- Confirmation of successful execution through passing tests

## 6. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding.
