# APM Task Assignment: Multiple Cursors and Harmonics Support

## 1. Agent Role & APM Context

You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project. Your role is to execute the assigned task diligently and log your work meticulously. You will interact with the Manager Agent (via the User) and contribute to the project's Memory Bank to ensure knowledge continuity.

## 2. Onboarding / Context from Prior Work

The GramFrame project has completed Task 4.4, which implemented the Doppler mode functionality with click-based interaction to define a sloped line and calculate derived speed. The component now has all three modes (Analysis, Harmonics, and Doppler) functioning according to their basic specifications.

Your task builds on this foundation by extending the functionality to support multiple cursors and harmonics per cursor, enhancing the analytical capabilities of the component.

## 3. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to `Phase 4, Task 4.5: Support multiple cursors and harmonics per cursor` in the Implementation Plan.

**Objective:** Extend the component to support multiple cursors in Analysis mode and multiple harmonic sets in Harmonics mode, allowing for more complex analysis scenarios.

**Detailed Action Steps:**

1. **Implement multiple cursor support in Analysis mode:**
   - Add functionality to create additional cursors via a click or keyboard shortcut
   - Store and manage multiple cursor positions in the component state
   - Display distinct cross-hairs for each cursor with different colors or styles
   - Show frequency and time values for all active cursors in the LED panel
   - Implement a mechanism to select, move, or remove individual cursors
   - Ensure smooth interaction when multiple cursors are present

2. **Implement multiple harmonic sets in Harmonics mode:**
   - Allow creation of additional harmonic sets based on different base frequencies
   - Store and manage multiple harmonic sets in the component state
   - Display distinct harmonic lines for each set with different colors or styles
   - Show base frequencies for all active harmonic sets in the LED panel
   - Implement a mechanism to select, modify, or remove individual harmonic sets
   - Ensure clear visual distinction between different harmonic sets

3. **Update state management for multiple elements:**
   - Extend the state structure to track multiple cursors and harmonic sets
   - Implement unique identifiers for each cursor or harmonic set
   - Update state listeners to handle multiple elements
   - Ensure proper state updates when adding, modifying, or removing elements

4. **Enhance the UI for multiple element management:**
   - Add UI controls for adding, selecting, and removing cursors/harmonic sets
   - Implement visual indicators to show which element is currently selected or active
   - Create a compact display format for showing multiple values in the LED panel
   - Ensure the UI remains intuitive and uncluttered despite the added complexity

5. **Update the diagnostics panel:**
   - Show information for all active cursors and harmonic sets
   - Display which element is currently selected or active
   - Include counts of active elements by type

6. **Create integration tests:**
   - Implement Playwright tests to verify multiple cursor functionality
   - Test creation, selection, modification, and removal of cursors and harmonic sets
   - Verify correct display of multiple elements with distinct visual styles
   - Test that the LED panel correctly shows values for all active elements
   - Ensure proper state management with multiple elements

## 4. Expected Output & Deliverables

**Success Criteria:**
- Multiple cursors can be created, selected, moved, and removed in Analysis mode
- Multiple harmonic sets can be created, modified, and removed in Harmonics mode
- Each cursor or harmonic set has a distinct visual style for clear identification
- The LED panel shows values for all active elements in a readable format
- The UI remains intuitive and responsive with multiple elements
- The state management correctly handles multiple elements
- All integration tests pass

**Deliverables:**
- Implementation of multiple cursor support in Analysis mode
- Implementation of multiple harmonic sets in Harmonics mode
- Enhanced state management for multiple elements
- Updated UI for multiple element management
- Updated diagnostics panel for multiple elements
- Integration tests for multiple element functionality

## 5. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's `Memory_Bank.md` file. Adhere strictly to the established logging format. Ensure your log includes:
- A reference to the assigned task in the Implementation Plan
- A clear description of the multiple cursor and harmonic set implementation
- Code snippets showing the state management and UI enhancements
- Any challenges encountered and how they were resolved
- Confirmation of successful execution through passing tests

## 6. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding.
