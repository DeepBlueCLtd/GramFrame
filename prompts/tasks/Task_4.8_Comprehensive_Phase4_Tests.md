# APM Task Assignment: Comprehensive Phase 4 Testing

## 1. Agent Role & APM Context

You are activated as a Testing Agent within the Agentic Project Management (APM) framework for the GramFrame project. Your role is to create comprehensive tests for the implemented functionality and ensure the quality and reliability of the component. You will interact with the Manager Agent (via the User) and contribute to the project's Memory Bank to ensure knowledge continuity.

## 2. Onboarding / Context from Prior Work

The GramFrame project has completed all implementation tasks for Phase 4, which includes:
- Task 4.1: Mode switching UI implementation
- Task 4.2: Analysis mode functionality
- Task 4.3: Harmonics mode with line drawing
- Task 4.4: Doppler mode implementation
- Task 4.5: Multiple cursors and harmonics per cursor support
- Task 4.6: Rate input box and calculation integration
- Task 4.7: Debug UI mode-specific extensions

The component now has all three interaction modes fully implemented with multiple cursor support, rate-based calculations, and enhanced debug UI. Your task is to create comprehensive Playwright tests to verify all Phase 4 functionality.

## 3. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to `Phase 4, Task 4.8: Write comprehensive Playwright tests for all Phase 4 functionality` in the Implementation Plan.

**Objective:** Create a comprehensive suite of Playwright tests that verify all functionality implemented in Phase 4, ensuring the component behaves correctly across all modes and interaction scenarios.

**Detailed Action Steps:**

1. **Set up test environment:**
   - Review existing test infrastructure from Phase 2 and Phase 3
   - Ensure Playwright is properly configured for testing all Phase 4 functionality
   - Set up test fixtures and helpers for mode-specific testing
   - Create utility functions for common test operations

2. **Implement mode switching tests:**
   - Test that all three modes (Analysis, Harmonics, Doppler) can be selected
   - Verify that the UI correctly reflects the active mode
   - Test that mode changes properly update the component state
   - Verify that the LED display updates with mode changes
   - Test that switching modes clears mode-specific state as appropriate

3. **Implement Analysis mode tests:**
   - Test cross-hair display and movement with mouse cursor
   - Verify frequency and time calculations and formatting
   - Test multiple cursor functionality if implemented
   - Verify that Analysis mode operates on hover only
   - Test edge cases (e.g., cursor at boundaries, outside spectrogram)

4. **Implement Harmonics mode tests:**
   - Test harmonic line display at correct positions
   - Verify harmonic number and frequency labels
   - Test that the main line has distinct styling
   - Verify multiple harmonic sets functionality if implemented
   - Test edge cases (e.g., harmonics beyond visible range)

5. **Implement Doppler mode tests:**
   - Test click interaction to set start and end points
   - Verify line drawing between points
   - Test ΔTime, ΔFrequency, and speed calculations
   - Verify that the state persists until reset
   - Test rate input integration with calculations
   - Test edge cases (e.g., vertical or horizontal lines)

6. **Implement integration tests across modes:**
   - Test state preservation/clearing when switching between modes
   - Verify that the LED display shows appropriate information for each mode
   - Test that the debug UI correctly displays mode-specific information
   - Verify that the rate input affects calculations across modes as appropriate
   - Test multiple instance scenarios if applicable

7. **Implement performance and stability tests:**
   - Test component behavior with rapid mode switching
   - Verify performance with multiple cursors or harmonic sets
   - Test memory usage and potential leaks
   - Verify component stability under stress conditions

## 4. Expected Output & Deliverables

**Success Criteria:**
- Comprehensive test coverage for all Phase 4 functionality
- All tests pass consistently
- Tests are well-organized and maintainable
- Edge cases are properly tested
- Performance and stability are verified

**Deliverables:**
- Mode switching test suite
- Analysis mode test suite
- Harmonics mode test suite
- Doppler mode test suite
- Cross-mode integration test suite
- Performance and stability test suite
- Test documentation and coverage report

## 5. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's `Memory_Bank.md` file. Adhere strictly to the established logging format. Ensure your log includes:
- A reference to the assigned task in the Implementation Plan
- A clear description of the test suites implemented
- Code snippets showing key test cases
- Test coverage statistics
- Any challenges encountered and how they were resolved
- Confirmation of successful execution through passing tests

## 6. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding.
