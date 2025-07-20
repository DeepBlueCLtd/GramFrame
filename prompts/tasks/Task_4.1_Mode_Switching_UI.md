# APM Task Assignment: Mode Switching UI Implementation

## 1. Agent Role & APM Context

You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project. Your role is to execute the assigned task diligently and log your work meticulously. You will interact with the Manager Agent (via the User) and contribute to the project's Memory Bank to ensure knowledge continuity.

## 2. Onboarding / Context from Prior Work

The GramFrame project has successfully completed Phase 3, which established the interaction foundations including mouse tracking, time/frequency calculation at cursor position, and cursor display functionality. The component now tracks mouse movement over the spectrogram, converts screen coordinates to data space (time and frequency values), and displays these values in an LED-style readout panel.

Your task begins Phase 4, which will implement the three interaction modes (Analysis, Harmonics, and Doppler) as described in the Gram-Modes.md document. This first task focuses on creating the UI for switching between these modes.

## 3. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to `Phase 4, Task 4.1: Add mode switching UI (Analysis, Harmonics, Doppler)` in the Implementation Plan.

**Objective:** Create a user interface component that allows switching between the three interaction modes: Analysis, Harmonics, and Doppler.

**Detailed Action Steps:**

1. **Create a mode switching UI component:**
   - Design and implement a mode selector UI component (e.g., tabs, buttons, or dropdown)
   - Include visual indicators for all three modes: Analysis, Harmonics, and Doppler
   - Ensure the active mode is clearly highlighted/indicated
   - Style the UI to match the existing LED-style aesthetic
   - Position the mode selector appropriately within the component layout

2. **Implement mode state management:**
   - Add a mode property to the component state
   - Implement mode change handlers to update the state when a mode is selected
   - Set Analysis mode as the default initial mode
   - Ensure mode changes trigger appropriate UI updates
   - Add the current mode to the LED display panel

3. **Update state listener mechanism:**
   - Extend the state listener to include the current mode
   - Ensure mode changes are properly propagated to any registered listeners
   - Update the diagnostics panel to display the current mode

4. **Prepare for mode-specific behaviors:**
   - Create a structure for mode-specific rendering and interaction handling
   - Set up conditional rendering based on the active mode
   - Implement placeholder functionality for each mode to be filled in by subsequent tasks

5. **Create integration tests:**
   - Implement Playwright tests to verify mode switching functionality
   - Test that the UI correctly reflects the current mode
   - Verify that mode changes are properly tracked in the state
   - Test that the LED display updates with the mode change
   - Ensure the diagnostics panel correctly shows the current mode

## 4. Expected Output & Deliverables

**Success Criteria:**
- A functional mode switching UI is implemented
- The component state correctly tracks the current mode
- The active mode is clearly indicated in the UI
- Mode changes are properly propagated to state listeners
- The LED display and diagnostics panel show the current mode
- All integration tests pass

**Deliverables:**
- Mode switching UI component implementation
- Mode state management functionality
- Extended state listener for mode changes
- Integration tests for mode switching functionality

## 5. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's `Memory_Bank.md` file. Adhere strictly to the established logging format. Ensure your log includes:
- A reference to the assigned task in the Implementation Plan
- A clear description of the mode switching UI implementation
- Code snippets showing the mode state management and UI components
- Any challenges encountered and how they were resolved
- Confirmation of successful execution through passing tests

## 6. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding.
