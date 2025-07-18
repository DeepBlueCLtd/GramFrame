# GramFrame Implementation Plan

## Project Overview

GramFrame is a JavaScript component that transforms HTML tables containing spectrogram images into interactive analysis tools. The component allows users to analyze frequency data through different modes (Analysis, Harmonics, Doppler) and provides interactive features like cursor placement and harmonic line visualization.

## Memory Bank Structure

This project will use a **directory-based Memory Bank** located at `/Memory/`. This structure was chosen due to:
- Multiple distinct phases with different functionality areas
- Need to organize test results by feature
- Better organization of implementation details by component

## Implementation Phases

### Phase 1: Bootstrapping + Dev Harness

**Objective**: Complete the initial setup and create a debug environment for development.

| Task ID | Task Description | Assigned Agent | Dependencies | Status |
|---------|-----------------|----------------|--------------|--------|
| 1.1 | Create `debug.html` page that loads a fixed component instance | Implementation Agent | - | To Do |
| 1.2 | Hook up "Hello World" from component inside the debug page | Implementation Agent | 1.1 | To Do |
| 1.3 | Set up hot module reload and visible console logging for state | Implementation Agent | 1.2 | To Do |

**Deliverables**:
- Functional debug.html page
- Basic component initialization
- Hot module reload configuration
- Console logging setup

### Phase 2: Basic Layout and Diagnostics Panel

**Objective**: Implement core visual elements and monitoring tools.

| Task ID | Task Description | Assigned Agent | Dependencies | Status |
|---------|-----------------|----------------|--------------|--------|
| 2.1 | Add Playwright as a dev dependency (only Chrome browser) | Implementation Agent | Phase 1 | To Do |
| 2.2 | Write initial Playwright test: debug page loads and "Hello World" appears | Implementation Agent | 2.1 | To Do |
| 2.3 | Load spectrogram image from config | Implementation Agent | Phase 1 | To Do |
| 2.4 | Read and display min/max time/frequency | Implementation Agent | 2.3 | To Do |
| 2.5 | Add LED-style readout panel below image | Implementation Agent | 2.4 | To Do |
| 2.6 | Diagnostics: display image URL, size, min/max, and mouse coordinates | Implementation Agent | 2.5 | To Do |
| 2.7 | Expose initial `addStateListener()` mechanism | Implementation Agent | 2.6 | To Do |
| 2.8 | Write Playwright tests for basic layout elements | Implementation Agent | 2.1-2.7 | To Do |

**Deliverables**:
- Playwright test setup
- Image loading from config
- Min/max time/frequency display
- LED-style readout panel
- Diagnostics panel with state information
- State listener mechanism
- Test coverage for Phase 2 functionality

### Phase 3: Interaction Foundations

**Objective**: Add mouse tracking and cursor functionality.

| Task ID | Task Description | Assigned Agent | Dependencies | Status |
|---------|-----------------|----------------|--------------|--------|
| 3.1 | Add mouse move tracking | Implementation Agent | Phase 2 | To Do |
| 3.2 | Calculate and display time/frequency at cursor | Implementation Agent | 3.1 | To Do |
| 3.3 | Click to add cursors; drag to reposition | Implementation Agent | 3.2 | To Do |
| 3.4 | Update state listener and diagnostics panel accordingly | Implementation Agent | 3.3 | To Do |
| 3.5 | Extend debug page UI to display updated state | Implementation Agent | 3.4 | To Do |
| 3.6 | Write Playwright tests for interaction features | Implementation Agent | 3.1-3.5 | To Do |

**Deliverables**:
- Mouse tracking implementation
- Time/frequency calculation at cursor position
- Cursor placement and repositioning functionality
- Updated state listener with cursor information
- Enhanced debug UI
- Test coverage for Phase 3 functionality

### Phase 4: Harmonics & Modes

**Objective**: Implement the three analysis modes and harmonic calculations.

| Task ID | Task Description | Assigned Agent | Dependencies | Status |
|---------|-----------------|----------------|--------------|--------|
| 4.1 | Add mode switching UI (Analysis, Harmonics, Doppler) | Implementation Agent | Phase 3 | To Do |
| 4.2 | Implement Analysis mode functionality | Implementation Agent | 4.1 | To Do |
| 4.3 | Implement Harmonics mode with correct line drawing | Implementation Agent | 4.2 | To Do |
| 4.4 | Implement Doppler mode (details TBD) | Implementation Agent | 4.3 | To Do |
| 4.5 | Support multiple cursors and harmonics per cursor | Implementation Agent | 4.3 | To Do |
| 4.6 | Add 'rate' input box and propagate to calculations | Implementation Agent | 4.5 | To Do |
| 4.7 | Extend debug page UI to display mode-specific state | Implementation Agent | 4.1-4.6 | To Do |
| 4.8 | Write Playwright tests for modes and harmonics | Implementation Agent | 4.1-4.7 | To Do |

**Deliverables**:
- Mode switching UI
- Analysis mode implementation
- Harmonics mode with line drawing
- Doppler mode implementation
- Multiple cursor support
- Rate input and calculation integration
- Enhanced debug UI for modes
- Test coverage for Phase 4 functionality

### Phase 5: Final Fit & Polish

**Objective**: Complete auto-detection, testing, and final quality assurance.

| Task ID | Task Description | Assigned Agent | Dependencies | Status |
|---------|-----------------|----------------|--------------|--------|
| 5.1 | Auto-detect and replace config tables | Implementation Agent | Phase 4 | To Do |
| 5.2 | Add canvas boundary and grid toggles to diagnostics page | Implementation Agent | 5.1 | To Do |
| 5.3 | Polish `build` output (dist includes debug page) | Implementation Agent | 5.2 | To Do |
| 5.4 | Implement comprehensive error handling | Implementation Agent | 5.3 | To Do |
| 5.5 | Final QA: browser matrix, multi-instance test | Implementation Agent | 5.4 | To Do |
| 5.6 | Write final Playwright test suite | Implementation Agent | 5.1-5.5 | To Do |
| 5.7 | Documentation review and updates | Implementation Agent | 5.6 | To Do |

**Deliverables**:
- Auto-detection of config tables
- Canvas boundary and grid toggles
- Polished build output
- Comprehensive error handling
- Multi-browser and multi-instance testing
- Complete test suite
- Updated documentation

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Browser compatibility issues | Medium | Medium | Comprehensive testing across browsers, use of standard APIs |
| Performance issues with multiple instances | High | Low | Performance testing with multiple instances, optimization where needed |
| Complex harmonic calculations | Medium | Medium | Incremental testing, clear algorithm documentation |
| Integration challenges in varied host environments | Medium | Medium | Robust error handling, clear documentation for integration |

## Timeline Estimation

- **Phase 1**: 1-2 days
- **Phase 2**: 3-4 days
- **Phase 3**: 2-3 days
- **Phase 4**: 3-5 days
- **Phase 5**: 2-3 days

Total estimated time: 11-17 days

## Success Criteria

1. All functionality specified in the Functional Specification is implemented
2. Component correctly transforms tables with class "spectro-config" into interactive tools
3. All three modes (Analysis, Harmonics, Doppler) function as specified
4. Comprehensive test coverage with Playwright
5. Clean, maintainable codebase with proper documentation
6. No build step required for end users - just include the script
