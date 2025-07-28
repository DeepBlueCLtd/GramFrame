# APM Task Assignment: Refactor Configuration Table Structure to Legacy Format

## 1. Task Assignment

*   **Reference Implementation Plan:** This assignment addresses GitHub Issue #32: "Reflect legacy config param structure"
*   **Objective:** Refactor the GramFrame configuration table structure from the current three-column format (param, min, max) to a simplified two-column format (param, value) that aligns with legacy HTML parameter structures.

*   **Detailed Action Steps:**
    1. **Update the configuration parsing logic in `src/core/configuration.js`:**
        - Modify the `extractConfigData` function (starting at line 115) which currently looks for rows with 3 cells
        - Change the parsing logic from expecting `cells.length >= 3` to `cells.length >= 2`
        - Update the logic to handle separate rows for start/end values:
          - Instead of looking for `param === 'time'` with min/max in cells[1] and cells[2]
          - Look for `param === 'time-start'` and `param === 'time-end'` with values in cells[1]
          - Same pattern for frequency: `freq-start` and `freq-end`
        - Maintain the same state structure in `instance.state.config`

    2. **Update all HTML sample files:**
        - Modify `debug.html` (table starts around line 207) to use the new two-column structure
        - Update `debug-multiple.html` with the same changes
        - Transform existing tables from:
          ```html
          <tr><th>param</th><th>min</th><th>max</th></tr>
          <tr><td>time</td><td>0</td><td>60</td></tr>
          <tr><td>freq</td><td>0</td><td>96</td></tr>
          ```
          To:
          ```html
          <tr><td>time-start</td><td>0</td></tr>
          <tr><td>time-end</td><td>60</td></tr>
          <tr><td>freq-start</td><td>0</td></tr>
          <tr><td>freq-end</td><td>96</td></tr>
          ```
        - Note: The header row can be removed entirely in the new format

    3. **Update the main component logic:**
        - Modify `src/main.js` to work with the new parameter structure
        - Ensure the component correctly interprets the new param naming convention
        - Update any internal state management to reflect the new structure

    4. **Update all test files:**
        - Modify test HTML fixtures to use the new table structure
        - Update test assertions that expect the old structure, particularly:
          - `tests/auto-detection.spec.ts` - references to `gram-config` tables
          - `tests/phase1.spec.ts` - references to configuration table structure
          - Any test utilities in `tests/helpers/` that create or manipulate config tables
        - Search for any test data that uses the three-column format
        - Ensure all existing tests pass with the new format by running `yarn test`

*   **Provide Necessary Context/Assets:**
    - The current implementation expects a three-column table with headers
    - The new format should be simpler and more consistent with legacy HTML structures
    - Consider using suffixes like `-start` and `-end` for range parameters
    - Maintain the same functionality while simplifying the configuration approach
    - Key files and their roles:
      - `src/core/configuration.js`: Contains `extractConfigData` function that parses the table
      - `src/api/GramFrameAPI.js`: Auto-detects tables with class `gram-config`
      - Tables are identified by the CSS class `gram-config` (this should remain unchanged)
      - The first row must still contain the `<img>` element with the spectrogram image

## 2. Expected Output & Deliverables

*   **Define Success:** 
    - All configuration tables use the new two-column format
    - The component correctly parses and uses the new structure
    - All tests pass with the updated format
    - No functionality is lost in the transition

*   **Specify Deliverables:**
    - Modified `src/components/table.js` with updated parsing logic
    - Updated `src/main.js` to handle new parameter structure
    - Modified HTML files (`debug.html`, `debug-multiple.html`)
    - Updated test files and fixtures
    - All tests passing with `yarn test`

## 3. Memory Bank Logging Instructions

*   **Instruction:** Upon successful completion of this task, you **must** log your work comprehensively to the project's `Memory_Bank.md` file.
*   **Format Adherence:** Adhere strictly to the established logging format. Ensure your log includes:
    - Reference to GitHub Issue #32
    - Clear description of the structural changes made
    - Key code modifications in each affected file
    - Any decisions made regarding parameter naming conventions
    - Confirmation that all tests pass

## 4. Quality Assurance

*   **Testing Requirements:**
    - Run `yarn typecheck` to ensure no type errors
    - Run `yarn test` to verify all tests pass
    - Manually test with `yarn dev` using the updated HTML files
    - Verify that existing functionality remains intact

## 5. Clarification Instruction

*   **Instruction:** If any part of this task assignment is unclear, particularly regarding the exact parameter naming convention or handling of edge cases, please state your specific questions before proceeding.