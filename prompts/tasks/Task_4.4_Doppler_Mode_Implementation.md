# APM Task Assignment: Doppler Mode Implementation

## 1. Agent Role & APM Context

You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project. Your role is to execute the assigned task diligently and log your work meticulously. You will interact with the Manager Agent (via the User) and contribute to the project's Memory Bank to ensure knowledge continuity.

## 2. Onboarding / Context from Prior Work

The GramFrame project has completed Task 4.3, which implemented the Harmonics mode functionality with vertical lines at harmonic frequencies and appropriate labels. The component now has both Analysis and Harmonics modes functioning according to specifications.

Your task builds on this foundation by implementing the Doppler mode functionality as described in the Gram-Modes.md document.

## 3. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to `Phase 4, Task 4.4: Implement Doppler mode` in the Implementation Plan.

**Objective:** Implement the Doppler mode functionality according to the specifications in Gram-Modes.md, which includes click-based interaction to define a sloped line and calculate derived speed.

**Detailed Action Steps:**

1. **Implement click-based interaction:**
   - Add event listeners for mouse clicks when in Doppler mode
   - Track the first click position (start point) and second click position (end point)
   - Store both time and frequency values for each click point
   - Reset the points when switching to other modes
   - Implement a way to clear/reset the points within Doppler mode (optional)

2. **Create sloped line visualization:**
   - Draw an SVG line connecting the start and end points
   - Style the line appropriately for visibility against the spectrogram
   - Add optional markers at each end of the line
   - Ensure the line is only visible when in Doppler mode and after the first click
   - Update the line when the second point is set

3. **Calculate and display measurement values:**
   - Calculate ΔTime (time difference between points)
   - Calculate ΔFrequency (frequency difference between points)
   - Derive speed calculation based on the frequency shift formula. Mock this calculation by just multiplying time and frequency deltas (e.g., ΔT * ΔF)
   - Format values with appropriate precision (e.g., "ΔT: 3.00 s", "ΔF: -240 Hz", "Speed: 14.2 knots")
   - Update the LED panel to show these calculated values

4. **Implement persistent state:**
   - Maintain the selected points and calculations until explicitly reset
   - Allow new measurements to replace previous ones
   - Implement a reset mechanism if specified (optional)

5. **Update state management:**
   - Extend the state to include Doppler mode specific properties
   - Track the start and end points and calculated values in the state
   - Update the state listener to include Doppler mode specific data
   - Update the diagnostics panel to show Doppler mode specific information

6. **Create integration tests:**
   - Implement Playwright tests to verify Doppler mode functionality
   - Test the click interaction to set start and end points
   - Verify that the line appears correctly between points
   - Test that calculations (ΔT, ΔF, Speed) are correct
   - Ensure the Doppler mode behavior matches the specifications in Gram-Modes.md

## 4. Expected Output & Deliverables

**Success Criteria:**
- Click interaction correctly sets start and end points
- A sloped line is displayed between the selected points
- ΔTime, ΔFrequency, and derived speed are calculated correctly
- The LED display shows the calculated values and "Doppler" mode
- The state persists until explicitly reset or new points are selected
- All elements are only visible when Doppler mode is active
- The state management properly handles Doppler mode specific data
- All integration tests pass

**Deliverables:**
- Implementation of click-based interaction for point selection
- Sloped line visualization between points
- Calculation of ΔTime, ΔFrequency, and derived speed
- Updated LED display for Doppler mode
- Persistent state management for Doppler mode
- Integration tests for Doppler mode functionality

## 5. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's `Memory_Bank.md` file. Adhere strictly to the established logging format. Ensure your log includes:
- A reference to the assigned task in the Implementation Plan
- A clear description of the Doppler mode implementation
- Code snippets showing the click interaction and calculation implementation
- Any challenges encountered and how they were resolved
- Confirmation of successful execution through passing tests

## 6. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding.
