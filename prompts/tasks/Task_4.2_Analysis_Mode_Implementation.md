# APM Task Assignment: Analysis Mode Implementation

## 1. Agent Role & APM Context

You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project. Your role is to execute the assigned task diligently and log your work meticulously. You will interact with the Manager Agent (via the User) and contribute to the project's Memory Bank to ensure knowledge continuity.

## 2. Onboarding / Context from Prior Work

The GramFrame project has completed Task 4.1, which implemented the mode switching UI for the three interaction modes (Analysis, Harmonics, and Doppler). The component now has a UI element that allows users to switch between these modes, with the current mode tracked in the component state and displayed in the LED panel.

Your task builds on this foundation by implementing the specific functionality for the Analysis mode as described in the Gram-Modes.md document.

## 3. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to `Phase 4, Task 4.2: Implement Analysis mode functionality` in the Implementation Plan.

**Objective:** Implement the Analysis mode functionality according to the specifications in Gram-Modes.md, which includes cross-hair display and precise frequency/time measurements.

**Detailed Action Steps:**

1. **Implement cross-hair cursor display:**
   - Create SVG elements for vertical and horizontal lines that follow the mouse cursor
   - Style the cross-hairs for optimal visibility against the spectrogram
   - Ensure the cross-hairs extend across the full width and height of the spectrogram
   - Make the cross-hairs only visible when in Analysis mode
   - Implement smooth movement of the cross-hairs with mouse movement

2. **Enhance frequency and time display:**
   - Format the frequency display with appropriate precision (e.g., "Freq: 734.2 Hz")
   - Format the time display with appropriate precision (e.g., "Time: 5.84 s")
   - Update the LED panel to show these formatted values
   - Ensure values update smoothly as the mouse moves

3. **Implement hover-only interaction:**
   - Ensure the Analysis mode operates on mouse hover only (no clicks required)
   - Clear any click-based state or UI elements when switching to Analysis mode
   - Verify that no persistent state is maintained between hover actions

4. **Update state management:**
   - Extend the state to include Analysis mode specific properties
   - Ensure proper state updates when the mouse moves in Analysis mode
   - Update the state listener to include Analysis mode specific data
   - Update the diagnostics panel to show Analysis mode specific information

5. **Create integration tests:**
   - Implement Playwright tests to verify Analysis mode functionality
   - Test that cross-hairs appear and move correctly with the mouse
   - Verify that frequency and time values are displayed with correct formatting
   - Test that the mode operates correctly on hover only
   - Ensure the Analysis mode behavior matches the specifications in Gram-Modes.md

## 4. Expected Output & Deliverables

**Success Criteria:**
- Cross-hair cursor display is implemented and follows the mouse
- Frequency and time values are displayed with appropriate formatting
- The Analysis mode operates on hover only with no persistent state
- All elements are only visible when Analysis mode is active
- The state management properly handles Analysis mode specific data
- All integration tests pass

**Deliverables:**
- Implementation of cross-hair cursor display
- Enhanced frequency and time display formatting
- Hover-only interaction implementation
- Updated state management for Analysis mode
- Integration tests for Analysis mode functionality

## 5. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's `Memory_Bank.md` file. Adhere strictly to the established logging format. Ensure your log includes:
- A reference to the assigned task in the Implementation Plan
- A clear description of the Analysis mode implementation
- Code snippets showing the cross-hair implementation and formatting logic
- Any challenges encountered and how they were resolved
- Confirmation of successful execution through passing tests

## 6. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding.
