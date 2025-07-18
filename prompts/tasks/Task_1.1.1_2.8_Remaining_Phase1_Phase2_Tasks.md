# APM Task Assignment: Completing Phase 1 & 2 Testing and Remaining Implementation

## 1. Agent Role & APM Context

You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project. Your role is to execute the assigned tasks diligently and log your work meticulously in the Memory Bank.

As an Implementation Agent, you will work on implementing Playwright testing for both Phase 1 and Phase 2 features, as well as completing the remaining implementation tasks for Phase 2 of the GramFrame project. Your work will be reviewed by the Manager Agent (via the User), and you should maintain detailed logs of your progress in the Memory Bank.

## 2. Onboarding / Context from Prior Work

The GramFrame project has made significant progress in both Phase 1 and Phase 2. Here's a summary of what has been completed:

### Phase 1 (Completed Implementation):
- Created `debug.html` page that loads a fixed component instance
- Hooked up "Hello World" from component inside the debug page
- Set up hot module reload and visible console logging for state

### Phase 2 (Completed Implementation):
- Loaded spectrogram image from config
- Read and displayed min/max time/frequency
- Added LED-style readout panel below image

Additional improvements have been made to the codebase:
- Responsive layout with side-by-side component and diagnostics
- State structure refactoring to eliminate duplication
- Improved coordinate handling with proper scaling and bounds checking

However, testing for both Phase 1 and Phase 2 features remains to be implemented, along with some implementation tasks for Phase 2.

## 3. Task Assignment

This assignment corresponds to the remaining tasks in Phase 1 and Phase 2 as outlined in the `Implementation_Plan.md`.

### Objective:
Implement Playwright testing for both Phase 1 and Phase 2 features, and complete the remaining implementation tasks for Phase 2, including the diagnostics panel and state listener mechanism.

### Detailed Action Steps:

#### Setup Testing Infrastructure First:
1. **Task 2.1**: Add Playwright as a dev dependency (only Chrome browser)
   - Install Playwright using yarn as the package manager
   - Configure Playwright to use only Chrome browser for testing
   - Add necessary configuration files for Playwright

2. **Task 2.2**: Create test infrastructure and write initial Playwright test
   - Set up the basic test infrastructure for Playwright tests
   - Create a simple initial test to verify the test setup using `debug.html` and inspecting the `State Display`.
   - Ensure the test can be run and reports results correctly

#### Phase 1 Testing Tasks (Using Playwright):
1. **Task 1.1.1 + 1.2.1 + 1.3.1**: Create Playwright tests for Phase 1 features
   - Create tests for component initialization in the debug page
   - Test that the component renders correctly with all expected DOM elements
   - Verify that console logging works for state changes
   - Test that hot module reload preserves state as expected
   - Create test helpers and utilities that can be reused for Phase 2 testing

#### Phase 2 Implementation Tasks:
1. **Task 2.6**: Diagnostics: display image URL, size, min/max, and mouse coordinates
   - Implement a diagnostics panel that shows image URL and size
   - Display min/max time/frequency values in the panel
   - Add real-time display of mouse coordinates within the image
   - Ensure the panel updates dynamically as the user interacts with the component

2. **Task 2.7**: Expose initial `addStateListener()` mechanism
   - Implement a state listener mechanism that allows external code to subscribe to state changes
   - Ensure the listener is called whenever relevant state changes occur
   - Document the listener API for future use

#### Phase 2 Testing Tasks (Using Playwright):
1. **Task 2.3.1**: Test image loading functionality
   - Create tests to verify that the spectrogram image loads correctly from config
   - Test different image sources and error handling
   - Verify that the image dimensions are correctly processed

2. **Task 2.4.1**: Test min/max extraction and display
   - Create tests to verify that min/max time/frequency values are correctly extracted
   - Test the display of these values in the component
   - Verify calculations based on these values

3. **Task 2.5.1**: Test LED panel rendering and formatting
   - Create tests for the LED-style readout panel
   - Verify that the panel updates correctly with new values
   - Test the formatting and appearance of the LED display

4. **Task 2.6.1**: Test diagnostics panel information accuracy
   - Create tests to verify that the diagnostics panel displays correct information
   - Test that the panel updates properly with mouse movements
   - Verify the accuracy of all displayed values

5. **Task 2.7.1**: Test state listener functionality
   - Create tests to verify that the state listener mechanism works correctly
   - Test that listeners are called at appropriate times
   - Verify that listeners receive the correct state information

6. **Task 2.8**: Write comprehensive Playwright tests for all Phase 1 and Phase 2 functionality
   - Create end-to-end tests covering all implemented functionality
   - Test the integration of all components
   - Verify that the system works correctly as a whole

## 4. Expected Output & Deliverables

### Testing Infrastructure:
- Playwright installed and configured as a dev dependency using yarn
- Test infrastructure set up and working with Chrome browser

### Implementation Deliverables:
- Diagnostics panel implemented and displaying all required information
- State listener mechanism implemented and documented

### Testing Deliverables:
- Complete Playwright test suite covering both Phase 1 and Phase 2 functionality:
  - Component initialization and rendering tests
  - Console logging and hot module reload tests
  - Image loading tests
  - Min/max extraction and display tests
  - LED panel tests
  - Diagnostics panel tests
  - State listener tests
  - Comprehensive end-to-end tests

All code should follow the project's coding standards, including:
- Using yarn as the package manager
- Not using trailing semi-colons in TypeScript code
- Using single quotes for JavaScript strings (except in JSON files)
- Avoiding the `any` type in TypeScript code
- Following the project's file organization structure (React Hooks files should be stored in the same folder as the component they are used in)

## 5. Memory Bank Logging Instructions

Upon successful completion of each task, you **must** log your work comprehensively to the project's `Memory_Bank.md` file. Adhere strictly to the established logging format. Ensure your log includes:
- A reference to the assigned task in the Implementation Plan
- A clear description of the actions taken
- Any code snippets generated or modified
- Any key decisions made or challenges encountered
- Confirmation of successful execution (e.g., tests passing, output generated)

For detailed guidance on the Memory Bank structure and logging format, refer to the `02_Memory_Bank_Guide.md` in the project's prompts directory.

## 6. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. This is a complex set of tasks that builds upon previous work, so it's important to have a clear understanding before starting.
