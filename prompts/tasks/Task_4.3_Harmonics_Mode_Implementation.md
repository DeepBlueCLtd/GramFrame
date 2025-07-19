# APM Task Assignment: Harmonics Mode Implementation

## 1. Agent Role & APM Context

You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project. Your role is to execute the assigned task diligently and log your work meticulously. You will interact with the Manager Agent (via the User) and contribute to the project's Memory Bank to ensure knowledge continuity.

## 2. Onboarding / Context from Prior Work

The GramFrame project has completed Task 4.2, which implemented the Analysis mode functionality with cross-hair display and precise frequency/time measurements. The component now has a fully functional Analysis mode that displays cross-hairs following the mouse cursor and shows precise frequency and time values in the LED panel.

Your task builds on this foundation by implementing the Harmonics mode functionality as described in the Gram-Modes.md document.

## 3. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to `Phase 4, Task 4.3: Implement Harmonics mode with correct line drawing` in the Implementation Plan.

**Objective:** Implement the Harmonics mode functionality according to the specifications in Gram-Modes.md, which includes displaying vertical lines at harmonic frequencies and appropriate labels.

**Detailed Action Steps:**

1. **Implement harmonic line calculation:**
   - Use the mouse X-position (frequency) as the base frequency
   - Calculate harmonic frequencies as integer multiples (1×, 2×, 3×, etc.) of the base frequency
   - Determine how many harmonics to display based on the visible frequency range
   - Handle edge cases where harmonics exceed the maximum frequency

2. **Create vertical harmonic lines:**
   - Generate SVG elements for vertical lines at each harmonic frequency
   - Make the lines extend the full height of the spectrogram
   - Style the main line (1×) with distinct styling (dark + light shadow) as specified
   - Style other harmonic lines appropriately for visibility
   - Ensure lines are only visible when in Harmonics mode
   - Implement smooth updates of line positions as the mouse moves

3. **Add harmonic labels:**
   - Create labels for each harmonic line
   - Position labels at the top of each line
   - Add harmonic number (e.g., "2×") to the left of each line
   - Add frequency value (e.g., "440 Hz") to the right of each line
   - Format frequency values with appropriate precision
   - Style labels for readability against the spectrogram background

4. **Update LED display for Harmonics mode:**
   - Show the base frequency in the LED display
   - Format the display appropriately (e.g., "Base: 220.0 Hz")
   - Update the display as the mouse moves
   - Ensure the mode indicator shows "Harmonics"

5. **Implement hover-only interaction:**
   - Ensure the Harmonics mode operates on mouse hover only (no clicks required)
   - Clear any click-based state or UI elements when switching to Harmonics mode
   - Verify that no persistent state is maintained between hover actions

6. **Update state management:**
   - Extend the state to include Harmonics mode specific properties
   - Track the base frequency and calculated harmonics in the state
   - Update the state listener to include Harmonics mode specific data
   - Update the diagnostics panel to show Harmonics mode specific information

7. **Create integration tests:**
   - Implement Playwright tests to verify Harmonics mode functionality
   - Test that harmonic lines appear at correct positions
   - Verify that labels show correct harmonic numbers and frequencies
   - Test that the main line has distinct styling
   - Ensure the Harmonics mode behavior matches the specifications in Gram-Modes.md

## 4. Expected Output & Deliverables

**Success Criteria:**
- Vertical harmonic lines are displayed at integer multiples of the base frequency
- The main line (1×) has distinct styling as specified
- Labels correctly show harmonic numbers and frequency values
- The LED display shows the base frequency and "Harmonics" mode
- The Harmonics mode operates on hover only with no persistent state
- All elements are only visible when Harmonics mode is active
- The state management properly handles Harmonics mode specific data
- All integration tests pass

**Deliverables:**
- Implementation of harmonic line calculation and display
- Harmonic label implementation
- Updated LED display for Harmonics mode
- Hover-only interaction implementation
- Updated state management for Harmonics mode
- Integration tests for Harmonics mode functionality

## 5. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's `Memory_Bank.md` file. Adhere strictly to the established logging format. Ensure your log includes:
- A reference to the assigned task in the Implementation Plan
- A clear description of the Harmonics mode implementation
- Code snippets showing the harmonic calculation and line drawing implementation
- Any challenges encountered and how they were resolved
- Confirmation of successful execution through passing tests

## 6. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding.
