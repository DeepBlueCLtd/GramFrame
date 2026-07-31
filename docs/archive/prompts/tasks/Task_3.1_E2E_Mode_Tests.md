# APM Task Assignment: Comprehensive E2E Tests for Mode Mouse Interactions

## 1. Agent Role & APM Context

**Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project.

**Your Role:** Execute the assigned testing task diligently and log your work meticulously. You will be creating comprehensive end-to-end tests covering all mouse interactions across Analysis, Harmonics, and Doppler modes.

**Workflow:** You will interact with the Manager Agent (via the User) and document all work in the Memory Bank for future reference.

## 2. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to comprehensive test coverage for the new capabilities in Analysis, Harmonics, and Doppler modes as outlined in the current codebase.

**Objective:** Create comprehensive Playwright-based e2e tests that cover all mouse interactions and capabilities across the three modes (Analysis, Harmonics, Doppler), ensuring complete coverage of user workflows and edge cases.

**Detailed Action Steps:**

### Phase 1: Analysis Mode Test Coverage
1. **Create comprehensive Analysis mode tests** in `tests/analysis-mode.spec.ts`:
   - **Mouse hover interactions**: Test cursor position updates in Time and Frequency LEDs
   - **Click-to-create markers**: Test marker creation at various positions
   - **Marker persistence**: Verify markers remain visible when switching modes
   - **Marker table updates**: Test that the markers table reflects all active markers
   - **Color picker integration**: Test marker creation with different colors
   - **Marker deletion**: Test both button-based deletion and right-click deletion
   - **Drag interactions**: Test any drag-based marker repositioning if implemented
   - **Cross-mode visibility**: Test that Analysis markers remain visible in other modes

### Phase 2: Harmonics Mode Test Coverage
2. **Create comprehensive Harmonics mode tests** in `tests/harmonics-mode.spec.ts`:
   - **Fundamental frequency selection**: Test click/drag to set fundamental frequency
   - **Real-time harmonic calculation**: Test harmonic display updates during drag
   - **Harmonic overlay rendering**: Test visual harmonic lines/overlays
   - **UI panel interactions**: Test harmonics display panel functionality
   - **Manual harmonic modal**: Test manual harmonic entry if available
   - **Cross-mode integration**: Test interaction with Analysis markers
   - **Color picker functionality**: Test harmonic color selection

### Phase 3: Doppler Mode Test Coverage
3. **Create comprehensive Doppler mode tests** in `tests/doppler-mode.spec.ts`:
   - **Speed calculation workflow**: Test complete Doppler speed calculation
   - **Bearing input interactions**: Test bearing value entry and validation
   - **Time selection**: Test time point selection via mouse interactions
   - **Calculation display**: Test speed calculation results display
   - **UI input validation**: Test edge cases and invalid inputs
   - **Cross-mode functionality**: Test integration with other mode features

### Phase 4: Cross-Mode Integration Tests
4. **Create cross-mode interaction tests** in `tests/mode-integration.spec.ts`:
   - **Mode switching**: Test smooth transitions between all modes
   - **State persistence**: Test that each mode's state persists during switches
   - **Feature visibility**: Test cross-mode feature visibility (Analysis markers, etc.)
   - **UI consistency**: Test that UI elements update correctly on mode changes
   - **Event handling**: Test that mouse events are handled correctly in each mode

### Phase 5: Advanced Mouse Interaction Tests
5. **Create advanced interaction tests** in `tests/advanced-interactions.spec.ts`:
   - **Zoom and pan interactions**: Test mouse interactions while zoomed/panned
   - **Edge case positioning**: Test interactions at spectrogram boundaries
   - **Rapid interaction sequences**: Test fast mouse movements and clicks
   - **Multi-touch simulation**: Test complex interaction patterns
   - **Error state handling**: Test interactions during error conditions

### Phase 6: Helper Utilities Enhancement
6. **Enhance test helper utilities** in `tests/helpers/`:
   - **Mode-specific helpers**: Add utilities for each mode's unique interactions
   - **Coordinate transformation helpers**: Add utilities for converting between coordinate systems
   - **State validation helpers**: Add comprehensive state assertion utilities
   - **Mouse interaction helpers**: Add advanced mouse interaction utilities
   - **Visual validation helpers**: Add screenshot comparison utilities if needed

**Guidance Notes:**
- **Use existing GramFramePage class**: Build upon the existing page object model in `tests/helpers/gram-frame-page.ts`
- **Follow existing test patterns**: Use the patterns established in `tests/state-listener.spec.ts` and `tests/auto-detection.spec.ts`
- **Coordinate system awareness**: Account for SVG coordinate transformations and margins (left: 60px, bottom: 50px)
- **State-driven testing**: Use the state display in debug.html for comprehensive state validation
- **Mode-specific features**: Test each mode's unique capabilities as implemented in their respective classes
- **Cross-browser compatibility**: Ensure tests work across different browsers supported by Playwright

## 3. Expected Output & Deliverables

**Define Success:** Successful completion includes:
- Complete test coverage for all mouse interactions across all three modes
- All tests passing consistently
- Comprehensive edge case coverage
- Proper integration with existing test infrastructure

**Specify Deliverables:**
- `tests/analysis-mode.spec.ts` - Comprehensive Analysis mode tests
- `tests/harmonics-mode.spec.ts` - Comprehensive Harmonics mode tests  
- `tests/doppler-mode.spec.ts` - Comprehensive Doppler mode tests
- `tests/mode-integration.spec.ts` - Cross-mode integration tests
- `tests/advanced-interactions.spec.ts` - Advanced mouse interaction tests
- Enhanced helper utilities in `tests/helpers/`
- Updated test documentation if needed

**Format:** All tests should follow Playwright testing conventions and use the existing fixture setup from `tests/helpers/fixtures.ts`.

## 4. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

**Format Adherence:** Adhere strictly to the established logging format. Ensure your log includes:
- A reference to this task assignment
- A clear description of all test files created and their coverage areas
- Key testing patterns and utilities developed
- Any challenges encountered and how they were resolved
- Confirmation of successful test execution and coverage metrics

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. This includes questions about:
- Specific mouse interaction patterns to test
- Expected behavior in edge cases
- Integration requirements with existing test infrastructure
- Coverage expectations for any particular mode