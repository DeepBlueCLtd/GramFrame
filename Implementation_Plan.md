# GramFrame Implementation Plan

## Project Overview

GramFrame is a JavaScript component that transforms HTML tables containing spectrogram images into interactive analysis tools. The component allows users to analyze frequency data through different modes (Analysis, Harmonics, Doppler) and provides interactive features like cursor placement and harmonic line visualization.

## Memory Bank Structure

This project will use a **directory-based Memory Bank** located at `/Memory/`. This structure was chosen due to:
- Multiple distinct phases with different functionality areas
- Need to organize test results by feature
- Better organization of implementation details by component

## Testing Philosophy

This project follows a comprehensive testing approach to ensure code quality and prevent regressions:

1. **Test-Driven Development**: Where appropriate, tests should be written before implementing functionality
2. **Unit Testing**: Each component and function should have unit tests
3. **Integration Testing**: Features should be tested in combination using Playwright
4. **Test Coverage**: Each task must include corresponding test coverage before being considered complete
5. **Continuous Testing**: Tests should be run after each significant code change

## Implementation Phases

### Phase 1: Bootstrapping + Dev Harness

**Objective**: Complete the initial setup and create a debug environment for development.

| Task ID | Task Description | Assigned Agent | Dependencies | Status |
|---------|-----------------|----------------|--------------|--------|
| 1.1 | Create `debug.html` page that loads a fixed component instance | Implementation Agent | - | To Do |
| 1.1.1 | Write unit tests for component initialization | Implementation Agent | 1.1 | To Do |
| 1.2 | Hook up "Hello World" from component inside the debug page | Implementation Agent | 1.1, 1.1.1 | To Do |
| 1.2.1 | Write tests to verify component rendering | Implementation Agent | 1.2 | To Do |
| 1.3 | Set up hot module reload and visible console logging for state | Implementation Agent | 1.2, 1.2.1 | To Do |
| 1.3.1 | Verify logging functionality with tests | Implementation Agent | 1.3 | To Do |

**Deliverables**:
- Functional debug.html page
- Basic component initialization
- Hot module reload configuration
- Console logging setup
- Unit tests for all Phase 1 functionality

### Phase 2: Basic Layout and Diagnostics Panel

**Objective**: Implement core visual elements and monitoring tools.

| Task ID | Task Description | Assigned Agent | Dependencies | Status |
|---------|-----------------|----------------|--------------|--------|
| 2.1 | Add Playwright as a dev dependency (only Chrome browser) | Implementation Agent | Phase 1 | To Do |
| 2.2 | Create test infrastructure and write initial Playwright test | Implementation Agent | 2.1 | To Do |
| 2.3 | Load spectrogram image from config | Implementation Agent | Phase 1 | To Do |
| 2.3.1 | Write tests for image loading functionality | Implementation Agent | 2.3 | To Do |
| 2.4 | Read and display min/max time/frequency | Implementation Agent | 2.3, 2.3.1 | To Do |
| 2.4.1 | Test min/max extraction and display | Implementation Agent | 2.4 | To Do |
| 2.5 | Add LED-style readout panel below image | Implementation Agent | 2.4, 2.4.1 | To Do |
| 2.5.1 | Test LED panel rendering and formatting | Implementation Agent | 2.5 | To Do |
| 2.6 | Diagnostics: display image URL, size, min/max, and mouse coordinates | Implementation Agent | 2.5, 2.5.1 | To Do |
| 2.6.1 | Test diagnostics panel information accuracy | Implementation Agent | 2.6 | To Do |
| 2.7 | Expose initial `addStateListener()` mechanism | Implementation Agent | 2.6, 2.6.1 | To Do |
| 2.7.1 | Write tests for state listener functionality | Implementation Agent | 2.7 | To Do |
| 2.8 | Write comprehensive Playwright tests for all Phase 2 functionality | Implementation Agent | 2.1-2.7.1 | To Do |

**Deliverables**:
- Playwright test setup
- Image loading from config
- Min/max time/frequency display
- LED-style readout panel
- Diagnostics panel with state information
- State listener mechanism
- Comprehensive test coverage for all Phase 2 functionality

### Phase 3: Interaction Foundations

**Objective**: Add mouse tracking and cursor functionality.

| Task ID | Task Description | Assigned Agent | Dependencies | Status |
|---------|-----------------|----------------|--------------|--------|
| 3.1 | Add mouse move tracking | Implementation Agent | Phase 2 | To Do |
| 3.1.1 | Write tests for mouse tracking accuracy | Implementation Agent | 3.1 | To Do |
| 3.2 | Calculate and display time/frequency at cursor | Implementation Agent | 3.1, 3.1.1 | To Do |
| 3.2.1 | Test time/frequency calculation accuracy | Implementation Agent | 3.2 | To Do |
| 3.3 | Click to add cursors; drag to reposition | Implementation Agent | 3.2, 3.2.1 | To Do |
| 3.3.1 | Test cursor addition and repositioning | Implementation Agent | 3.3 | To Do |
| 3.4 | Update state listener and diagnostics panel accordingly | Implementation Agent | 3.3, 3.3.1 | To Do |
| 3.4.1 | Test state updates with cursor interactions | Implementation Agent | 3.4 | To Do |
| 3.5 | Extend debug page UI to display updated state | Implementation Agent | 3.4, 3.4.1 | To Do |
| 3.5.1 | Test debug UI updates with state changes | Implementation Agent | 3.5 | To Do |
| 3.6 | Write comprehensive Playwright tests for all Phase 3 functionality | Implementation Agent | 3.1-3.5.1 | To Do |

**Deliverables**:
- Mouse tracking implementation
- Time/frequency calculation at cursor position
- Cursor placement and repositioning functionality
- Updated state listener with cursor information
- Enhanced debug UI
- Comprehensive test coverage for all Phase 3 functionality

### Phase 4: Harmonics & Modes

**Objective**: Implement the three analysis modes and harmonic calculations.

| Task ID | Task Description | Assigned Agent | Dependencies | Status |
|---------|-----------------|----------------|--------------|--------|
| 4.1 | Add mode switching UI (Analysis, Harmonics, Doppler) | Implementation Agent | Phase 3 | To Do |
| 4.1.1 | Test mode switching UI functionality | Implementation Agent | 4.1 | To Do |
| 4.2 | Implement Analysis mode functionality | Implementation Agent | 4.1, 4.1.1 | To Do |
| 4.2.1 | Test Analysis mode calculations and display | Implementation Agent | 4.2 | To Do |
| 4.3 | Implement Harmonics mode with correct line drawing | Implementation Agent | 4.2, 4.2.1 | To Do |
| 4.3.1 | Test harmonic line calculations and rendering | Implementation Agent | 4.3 | To Do |
| 4.4 | Implement Doppler mode (details TBD) | Implementation Agent | 4.3, 4.3.1 | To Do |
| 4.4.1 | Test Doppler mode functionality | Implementation Agent | 4.4 | To Do |
| 4.5 | Support multiple cursors and harmonics per cursor | Implementation Agent | 4.3, 4.3.1 | To Do |
| 4.5.1 | Test multiple cursor interactions and harmonic calculations | Implementation Agent | 4.5 | To Do |
| 4.6 | Add 'rate' input box and propagate to calculations | Implementation Agent | 4.5, 4.5.1 | To Do |
| 4.6.1 | Test rate input and its effect on calculations | Implementation Agent | 4.6 | To Do |
| 4.7 | Extend debug page UI to display mode-specific state | Implementation Agent | 4.1-4.6.1 | To Do |
| 4.7.1 | Test debug UI mode-specific displays | Implementation Agent | 4.7 | To Do |
| 4.8 | Write comprehensive Playwright tests for all Phase 4 functionality | Implementation Agent | 4.1-4.7.1 | To Do |

**Deliverables**:
- Mode switching UI
- Analysis mode implementation
- Harmonics mode with line drawing
- Doppler mode implementation
- Multiple cursor support
- Rate input and calculation integration
- Enhanced debug UI for modes
- Comprehensive test coverage for all Phase 4 functionality

### Phase 5: Final Fit & Polish

**Objective**: Complete auto-detection, testing, and final quality assurance.

| Task ID | Task Description | Assigned Agent | Dependencies | Status |
|---------|-----------------|----------------|--------------|--------|
| 5.1 | Auto-detect and replace config tables | Implementation Agent | Phase 4 | To Do |
| 5.1.1 | Test auto-detection with various table configurations | Implementation Agent | 5.1 | To Do |
| 5.2 | Add canvas boundary and grid toggles to diagnostics page | Implementation Agent | 5.1, 5.1.1 | To Do |
| 5.2.1 | Test boundary and grid toggle functionality | Implementation Agent | 5.2 | To Do |
| 5.3 | Polish `build` output (dist includes debug page) | Implementation Agent | 5.2, 5.2.1 | To Do |
| 5.3.1 | Verify build output and distribution files | Implementation Agent | 5.3 | To Do |
| 5.4 | Implement comprehensive error handling | Implementation Agent | 5.3, 5.3.1 | To Do |
| 5.4.1 | Test error handling with edge cases and invalid inputs | Implementation Agent | 5.4 | To Do |
| 5.5 | Final QA: browser matrix, multi-instance test | Implementation Agent | 5.4, 5.4.1 | To Do |
| 5.5.1 | Document browser compatibility test results | Implementation Agent | 5.5 | To Do |
| 5.6 | Write comprehensive Playwright test suite covering all functionality | Implementation Agent | 5.1-5.5.1 | To Do |
| 5.7 | Documentation review and updates | Implementation Agent | 5.6 | To Do |

**Deliverables**:
- Auto-detection of config tables
- Canvas boundary and grid toggles
- Polished build output
- Comprehensive error handling
- Multi-browser and multi-instance testing
- Complete test suite with high coverage
- Updated documentation

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Browser compatibility issues | Medium | Medium | Comprehensive testing across browsers, use of standard APIs |
| Performance issues with multiple instances | High | Low | Performance testing with multiple instances, optimization where needed |
| Complex harmonic calculations | Medium | Medium | Test-driven development approach, incremental testing, clear algorithm documentation |
| Integration challenges in varied host environments | Medium | Medium | Robust error handling, clear documentation for integration |
| Test coverage gaps | High | Medium | Enforce test-first development, code reviews focused on test coverage |
| Regression issues when adding new features | High | Medium | Comprehensive test suite run after each significant change |
| Test maintenance overhead | Medium | Medium | Well-structured test organization, avoid test duplication |
| False positives in automated tests | Medium | Low | Regular review and refinement of test cases, clear test documentation |

## Timeline Estimation

- **Phase 1**: 2-3 days (increased to account for test-first development)
- **Phase 2**: 4-5 days (increased to account for comprehensive testing of visual elements)
- **Phase 3**: 3-4 days (increased to account for interaction testing complexity)
- **Phase 4**: 4-6 days (increased to account for mode-specific testing)
- **Phase 5**: 3-4 days (increased to account for cross-browser testing and final QA)

Total estimated time: 16-22 days

*Note: The timeline has been adjusted to account for the comprehensive testing approach. While this increases the initial development time, it will reduce debugging and maintenance time in the long run by catching issues earlier in the development process.*

## Success Criteria

1. All functionality specified in the Functional Specification is implemented
2. Component correctly transforms tables with class "spectro-config" into interactive tools
3. All three modes (Analysis, Harmonics, Doppler) function as specified
4. Comprehensive test coverage with Playwright
5. Clean, maintainable codebase with proper documentation
6. No build step required for end users - just include the script
