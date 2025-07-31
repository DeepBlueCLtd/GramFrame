# APM Task Assignment: Fix E2E Test Failures in GramFrame

## 1. Agent Role & APM Context

* **Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project.
* **Your Role:** Your role is to execute assigned tasks diligently, focusing on fixing the E2E test failures while maintaining the existing functionality of the codebase.
* **Workflow:** You will interact with the Manager Agent (via the User) and must meticulously document your work in the Memory Bank.

## 2. Context and Current Situation

The GramFrame codebase is currently fully functional, but there are extensive E2E test failures. Based on the test run results:

* **Total tests:** 112
* **Failed tests:** 88
* **Passing tests:** 24
* **Test framework:** Playwright

The failures are primarily in:
1. `advanced-interactions.spec.ts` - Zoom/pan interactions, edge cases, rapid sequences
2. `doppler-mode.spec.ts` - Doppler mode interactions and calculations
3. `harmonics-mode.spec.ts` - Harmonics creation, dragging, UI panel interactions
4. `mode-integration.spec.ts` - Cross-mode state persistence and feature visibility

**Important Context from CLAUDE.md:**
- The codebase recently implemented transform-based zoom functionality (commit 2cd29c0)
- Previous SVG implementation was discarded (commit 49ce724)
- UI-related tests were dropped (commit bcde328)
- Tests previously failing were discarded (commit 98e1d4c)

## 3. Task Assignment

**Objective:** Fix all failing E2E tests to ensure they accurately test the current implementation while maintaining test coverage for critical functionality.

**Detailed Action Steps:**

1. **Initial Analysis and Categorization**
   - Run the full test suite with detailed reporter: `npx playwright test --reporter=list`
   - Categorize failures by type:
     - Timing-related failures (likely due to zoom transform animations)
     - Selector-based failures (likely due to DOM structure changes)
     - Assertion failures (likely due to changed behavior/API)
     - State verification failures (likely due to new state structure)

2. **Fix Zoom and Transform-Related Tests**
   - Focus on `advanced-interactions.spec.ts` zoom tests first
   - Key areas to address:
     - Update tests to work with transform-based zoom instead of previous implementation
     - Add appropriate wait conditions for CSS transform animations
     - Update coordinate calculations to account for transform matrix
   - Guidance: The new zoom implementation uses CSS transforms, so tests need to:
     - Wait for transform transitions to complete
     - Calculate transformed coordinates correctly
     - Account for viewport-based positioning

3. **Update Mode-Specific Tests**
   - **Doppler Mode Tests (`doppler-mode.spec.ts`)**:
     - Verify bearing/speed input interactions still work
     - Update any changed selectors or UI elements
     - Ensure calculation assertions match current implementation
   
   - **Harmonics Mode Tests (`harmonics-mode.spec.ts`)**:
     - Update drag interaction tests for harmonic creation
     - Fix panel visibility and content assertions
     - Ensure color picker and UI panel tests work with current DOM

   - **Analysis Mode Tests** (already mostly passing):
     - Verify marker creation/deletion still works
     - Ensure LED display updates are tested correctly

4. **Fix Cross-Mode Integration Tests**
   - Update `mode-integration.spec.ts` to:
     - Account for any state structure changes
     - Ensure feature persistence works across modes
     - Update visibility assertions for cross-mode features

5. **Common Fixes to Apply**
   - **Timing Issues**: Add appropriate `waitForTimeout` or `waitForSelector` calls
   - **Selector Updates**: Update any changed element selectors
     - Add `data-testid` attributes to source code where needed to avoid brittle selectors
     - Replace complex CSS selectors with reliable `data-testid` selectors
   - **State Structure**: Update state assertions to match current implementation
   - **Coordinate Calculations**: Update any coordinate-based assertions for transform-based positioning
   - **Remove Obsolete Tests**: Remove tests for features that no longer exist

6. **Test Helper Updates**
   - Review and update test helpers in `tests/helpers/`:
     - `GramFramePage.ts` - Update page object methods
     - `state-assertions.ts` - Update state validation helpers
     - Ensure helpers work with transform-based zoom

## 4. Expected Output & Deliverables

**Define Success:** All 112 E2E tests should pass without failures.

**Specific Deliverables:**
1. Modified test files with all tests passing
2. Updated test helper utilities as needed
3. Summary of changes made to each test file
4. Any new helper methods or utilities created
5. Verification that tests still provide meaningful coverage
6. List of `data-testid` attributes added to source code (if any)

**Test Execution Requirements:**
- Run full test suite: `yarn test`
- Ensure no regressions in previously passing tests
- Verify tests are not just disabled but properly fixed

## 5. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's Memory Bank. Your log should include:

* Reference to this task assignment
* Summary of test failures categorized by type
* Detailed list of fixes applied to each test file
* Any patterns or common issues discovered
* Code snippets for significant test modifications
* Confirmation that all tests pass

## 6. Additional Guidelines

**Testing Philosophy:**
- Tests should verify actual functionality, not implementation details
- Avoid brittle selectors; prefer data-testid attributes where possible
- Ensure tests are maintainable and clearly document what they're testing

**Coordination with Source Code:**
- DO NOT modify source code functionality to make tests pass
- Tests must adapt to the current implementation behavior
- **Exception:** You MAY add `data-testid` attributes to source code elements to enable reliable test selectors
- When adding `data-testid` attributes:
  - Use descriptive, semantic names (e.g., `data-testid="harmonics-panel"`, `data-testid="zoom-in-button"`)
  - Add them to key interactive elements and containers
  - Document which test files rely on each `data-testid`
- If a test reveals an actual bug, document it but fix the test to match current behavior

**Performance Considerations:**
- Keep test execution time reasonable
- Use appropriate timeouts (not too short to cause flakiness, not too long to slow suite)
- Batch similar operations where possible

## 7. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. Key areas that may need clarification:
- Specific behavior of the new transform-based zoom system
- Expected state structure after recent refactoring
- Any undocumented changes in the UI or interaction patterns