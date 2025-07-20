# APM Task Assignment: Auto-Detect and Replace Config Tables

## 1. Agent Role & APM Context

You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project. Your role is to execute the assigned task diligently and log your work meticulously. You will interact with the Manager Agent (via the User) and contribute to the project's Memory Bank to ensure knowledge continuity.

## 2. Onboarding / Context from Prior Work

The GramFrame project has completed Phase 4, which implemented all two interaction modes (Analysis and Doppler) with multiple cursor support, rate-based calculations, and comprehensive testing. The component now has full functionality for analyzing spectrograms with different modes.

Your task begins Phase 5, which focuses on final fit and polish. This first task in Phase 5 involves implementing the auto-detection and replacement of config tables, which is a core feature of the GramFrame component.

## 3. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to `Phase 5, Task 5.1: Auto-detect and replace config tables` in the Implementation Plan.

**Objective:** Implement functionality to automatically detect HTML tables with the class "gram-config" and replace them with interactive GramFrame components, making the component ready for real-world use.

**Detailed Action Steps:**

1. **Implement table detection mechanism:**
   - Create a function to scan the DOM for tables with the class "gram-config"
   - Ensure the detection runs on page load and can be triggered manually if needed
   - Handle cases where multiple config tables exist on the same page
   - Add logging for detected tables (number found, their IDs or positions)

2. **Extract configuration from tables:**
   - Parse the HTML table structure to extract configuration parameters
   - Extract image URL, min/max time/frequency, and any other configuration data
   - Validate the extracted configuration for completeness and correctness
   - Handle missing or invalid configuration gracefully with appropriate defaults
   - Log any issues with configuration extraction

3. **Create component instances:**
   - For each detected table, create a new GramFrame component instance
   - Pass the extracted configuration to the component
   - Generate a unique ID for each component instance
   - Ensure proper initialization of all component features

4. **Replace tables with components:**
   - Replace each detected table with its corresponding GramFrame component
   - Preserve the original table's position, size, and surrounding context
   - Ensure the replacement is visually smooth and doesn't disrupt page layout
   - Add appropriate CSS classes and attributes to the component container

5. **Implement public API for manual initialization:**
   - Create a public API function for manually initializing GramFrame on specific tables
   - Document the API function parameters and usage
   - Ensure the API is accessible from the global scope
   - Add examples of manual initialization to the debug page

6. **Add error handling and reporting:**
   - Implement comprehensive error handling for the auto-detection process
   - Create user-friendly error messages for common issues
   - Add a debug mode that provides detailed error information
   - Ensure errors don't prevent other components from initializing

7. **Create integration tests:**
   - Implement Playwright tests to verify auto-detection functionality
   - Test with various table configurations and structures
   - Verify that multiple tables on the same page are handled correctly
   - Test error handling with invalid or incomplete tables
   - Ensure manual initialization works as expected

## 4. Expected Output & Deliverables

**Success Criteria:**
- Tables with class "gram-config" are automatically detected and replaced with GramFrame components
- Configuration is correctly extracted from tables
- Multiple tables on the same page are handled properly
- The public API allows manual initialization
- Error handling is comprehensive and user-friendly
- All integration tests pass

**Deliverables:**
- Table detection mechanism implementation
- Configuration extraction functionality
- Component instance creation and table replacement
- Public API for manual initialization
- Error handling and reporting
- Integration tests for auto-detection functionality

## 5. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's `Memory_Bank.md` file. Adhere strictly to the established logging format. Ensure your log includes:
- A reference to the assigned task in the Implementation Plan
- A clear description of the auto-detection implementation
- Code snippets showing the detection and replacement mechanism
- Any challenges encountered and how they were resolved
- Confirmation of successful execution through passing tests

## 6. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding.
