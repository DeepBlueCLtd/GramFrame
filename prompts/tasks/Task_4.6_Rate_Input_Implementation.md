# APM Task Assignment: Rate Input Implementation

## 1. Agent Role & APM Context

You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project. Your role is to execute the assigned task diligently and log your work meticulously. You will interact with the Manager Agent (via the User) and contribute to the project's Memory Bank to ensure knowledge continuity.

## 2. Onboarding / Context from Prior Work

The GramFrame project has completed Task 4.5, which implemented support for multiple cursors in Analysis mode and multiple harmonic sets in Harmonics mode. The component now has enhanced analytical capabilities with the ability to compare multiple points or frequency sets simultaneously.

Your task builds on this foundation by adding a 'rate' input box that will affect calculations across the different modes, particularly for Doppler mode speed calculations.

## 3. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to `Phase 4, Task 4.6: Add 'rate' input box and propagate to calculations` in the Implementation Plan.

**Objective:** Implement a rate input box that allows users to specify a rate value that will be used in calculations across the different modes, particularly affecting the Doppler mode speed calculations.

**Detailed Action Steps:**

1. **Design and implement the rate input UI:**
   - Create an input box for the rate value with appropriate styling
   - Position the input box in a logical location within the component layout
   - Add a label clearly indicating the purpose of the input (e.g., "Rate:")
   - Include a unit indicator (e.g., "Hz/s" or appropriate unit)
   - Ensure the input accepts numeric values only
   - Implement validation to prevent invalid inputs

2. **Implement rate state management:**
   - Add a rate property to the component state
   - Set a reasonable default value for the rate
   - Implement handlers to update the rate when the input changes
   - Ensure the rate value persists across mode changes
   - Add the current rate to the diagnostics panel

3. **Integrate rate into calculations:**
   - Update the Doppler mode speed calculation to incorporate the rate value
   - Modify any other calculations across modes that should use the rate
   - Ensure calculations update immediately when the rate changes
   - Update the LED display to reflect calculations with the new rate

4. **Enhance the UI for rate feedback:**
   - Provide visual feedback when the rate is changed
   - Show how the rate affects calculations in the LED display
   - Consider adding tooltips or help text explaining the rate's purpose
   - Ensure the rate input is accessible and easy to use

5. **Update state listeners:**
   - Extend the state listener to include the rate value
   - Ensure rate changes are properly propagated to any registered listeners
   - Update the diagnostics panel to display the current rate and its effect on calculations

6. **Create integration tests:**
   - Implement Playwright tests to verify rate input functionality
   - Test that the rate input accepts valid values and rejects invalid ones
   - Verify that calculations update correctly when the rate changes
   - Test that the rate persists across mode changes
   - Ensure the rate is properly reflected in the LED display and diagnostics panel

## 4. Expected Output & Deliverables

**Success Criteria:**
- A functional rate input box is implemented with proper validation
- The rate value is stored in the component state and persists across mode changes
- Calculations correctly incorporate the rate value
- The UI provides clear feedback about the rate and its effects
- The state listener includes the rate value
- All integration tests pass

**Deliverables:**
- Implementation of rate input UI
- Rate state management functionality
- Updated calculations incorporating the rate
- Enhanced UI for rate feedback
- Updated state listener for rate changes
- Integration tests for rate functionality

## 5. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's `Memory_Bank.md` file. Adhere strictly to the established logging format. Ensure your log includes:
- A reference to the assigned task in the Implementation Plan
- A clear description of the rate input implementation
- Code snippets showing the rate integration with calculations
- Any challenges encountered and how they were resolved
- Confirmation of successful execution through passing tests

## 6. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding.
