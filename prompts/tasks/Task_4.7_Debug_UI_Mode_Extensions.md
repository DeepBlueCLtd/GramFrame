# APM Task Assignment: Debug UI Mode-Specific Extensions

## 1. Agent Role & APM Context

You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project. Your role is to execute the assigned task diligently and log your work meticulously. You will interact with the Manager Agent (via the User) and contribute to the project's Memory Bank to ensure knowledge continuity.

## 2. Onboarding / Context from Prior Work

The GramFrame project has completed Task 4.6, which implemented a rate input box that affects calculations across different modes. The component now has all three modes functioning with multiple cursor support and rate-based calculations.

Your task builds on this foundation by extending the debug page UI to display mode-specific state information, enhancing the development and testing experience.

## 3. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to `Phase 4, Task 4.7: Extend debug page UI to display mode-specific state` in the Implementation Plan.

**Objective:** Enhance the debug page UI to display detailed mode-specific state information for each of the two modes (Analysis, and Doppler), providing better visibility into the component's internal state during development and testing.

**Detailed Action Steps:**

1. **Design and implement mode-specific debug panels:**
   - Create separate sections in the debug UI for each mode (Analysis, Doppler)
   - Implement conditional rendering to show the relevant section based on the active mode
   - Design a clean and organized layout for each mode's debug information
   - Ensure the debug UI updates in real-time as the component state changes

2. **Implement Analysis mode debug display:**
   - Show detailed information about cursor positions
   - Display raw and calculated time/frequency values
   - Show base frequency and all calculated harmonic frequencies
   - Display information about harmonic line positions
   - Include any additional Analysis mode specific state

4. **Implement Doppler mode debug display:**
   - Show start and end point coordinates (both raw and calculated values)
   - Display ΔTime, ΔFrequency, and calculated speed values
   - Show the rate value and how it affects calculations
   - Include any additional Doppler mode specific state

5. **Add interactive debug controls:**
   - Implement controls to manipulate state values directly from the debug UI
   - Add buttons to trigger specific actions or state changes
   - Include options to reset or initialize state values
   - Ensure all controls are clearly labeled and easy to use

6. **Update state listener integration:**
   - Ensure the debug UI properly subscribes to state changes
   - Optimize update frequency to prevent performance issues
   - Add timestamps or indicators for when state changes occur
   - Implement filtering options to focus on specific state properties

7. **Create integration tests:**
   - Implement Playwright tests to verify debug UI functionality
   - Test that the debug UI correctly displays mode-specific information
   - Verify that the debug UI updates properly when the state changes
   - Test interactive controls and their effect on the component state

## 4. Expected Output & Deliverables

**Success Criteria:**
- Mode-specific debug panels are implemented for all three modes
- Each panel displays relevant state information for its mode
- The debug UI updates in real-time as the component state changes
- Interactive controls allow manipulation of state values
- The debug UI is well-organized and easy to use
- All integration tests pass

**Deliverables:**
- Implementation of mode-specific debug panels
- Analysis mode debug display
- Doppler mode debug display
- Interactive debug controls
- Updated state listener integration
- Integration tests for debug UI functionality

## 5. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's `Memory_Bank.md` file. Adhere strictly to the established logging format. Ensure your log includes:
- A reference to the assigned task in the Implementation Plan
- A clear description of the debug UI extensions
- Code snippets showing the mode-specific debug panels
- Any challenges encountered and how they were resolved
- Confirmation of successful execution through passing tests

## 6. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding.
