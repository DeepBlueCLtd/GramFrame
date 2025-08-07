# APM Task Assignment: Refactor Large Files and Improve Module Boundaries

## 1. Agent Role & APM Context

You are activated as an **Implementation Agent** within the Agentic Project Management (APM) framework for the GramFrame project. Your role is to execute assigned refactoring tasks diligently while maintaining all existing functionality and logging your work meticulously to the Memory Bank.

**Your Responsibilities:**
- Execute refactoring tasks with precision and attention to detail
- Ensure all existing functionality remains intact after changes  
- Run tests frequently to validate refactoring doesn't introduce regressions
- Log all work comprehensively to the project's Memory Bank
- Interact with the Manager Agent (via the User) for clarifications and progress updates

## 2. Task Assignment

**Reference Implementation Plan:** This assignment addresses critical technical debt identified in GitHub Issue #88, focusing on code complexity reduction and maintainability improvements. While not explicitly mapped to the current Implementation_Plan.md phases, this refactoring work supports the overall project architecture and maintainability goals.

**Objective:** Reduce code complexity in the GramFrame codebase by breaking up oversized files and improving module boundaries. Focus on the most critical complexity hotspots that impact maintainability and development velocity.

**Priority Focus:** This task targets **Phase 1: Critical Complexity Reduction** as outlined in the issue analysis.

### Detailed Action Steps

You will execute this refactoring in **three focused phases** to minimize risk and ensure functionality preservation:

#### **Phase A: Extract Coordinate Transformation Utilities (Priority #1)**

**Rationale:** Eliminate code duplication (1.42% currently) by consolidating coordinate transformation logic scattered across mode classes.

**Specific Actions:**
1. **Create new utility module**: `src/utils/coordinateTransformations.js`
2. **Extract shared coordinate transformation functions** from:
   - `src/modes/doppler/DopplerMode.js` (`dataToSVG()` method - lines 395+)
   - `src/modes/harmonics/HarmonicsMode.js` (similar transformation patterns)
   - `src/modes/analysis/AnalysisMode.js` (zoom-aware positioning logic)
3. **Consolidate functions into reusable utilities:**
   - `dataToSVG(point, viewport, imageConfig)` - universal coordinate transformation
   - `screenToDataCoordinates(screenPoint, viewport, imageConfig)` 
   - `calculateZoomAwarePosition(point, zoomState, imageConfig)`
   - `isPointInImageBounds(point, imageConfig)` - boundary checking
4. **Update all mode classes** to import and use the new utilities
5. **Run tests after each file modification** to ensure no regressions
6. **Verify elimination of duplicate code** using `npx jscpd src/`

**Expected Outcome:** Reduce code duplication from 1.42% to <1%, create reusable coordinate utilities

#### **Phase B: Refactor Critical High-Complexity Functions (Priority #2)**

**Target the worst complexity offenders identified in the analysis:**

**B1: Break up `HarmonicsMode.renderHarmonicSet()` (CC: 27 → <10)**
- **Location:** `src/modes/harmonics/HarmonicsMode.js` lines 495+
- **Current Issues:** 92-line function with nested loops and complex conditionals
- **Refactoring Approach:**
  1. **Extract rendering sub-functions:**
     - `calculateHarmonicPositions(harmonicSet, viewport)`
     - `renderHarmonicLines(harmonicSet, svgContainer)`  
     - `applyHarmonicStyling(elements, harmonicSet)`
  2. **Separate business logic from rendering:**
     - `getVisibleHarmonics(harmonicSet, viewport)` - filtering logic
     - `formatHarmonicLabels(harmonic)` - text formatting
  3. **Create `HarmonicRenderer` class** if complexity remains high
  4. **Validate with `npx cyclomatic-complexity src/modes/harmonics/HarmonicsMode.js`**

**B2: Refactor `DopplerMode.handleMouseMove()` (CC: 21 → <10)**
- **Location:** `src/modes/doppler/DopplerMode.js` lines 55+  
- **Current Issues:** 90-line monolithic function with deep nesting
- **Refactoring Approach:**
  1. **Extract event handling sub-functions:**
     - `detectMarkerProximity(mousePosition, existingMarkers)` 
     - `updateCursorStyle(proximityState)`
     - `updatePreviewElements(mousePosition, dragState)`
  2. **Create state management utilities:**
     - `updateDragState(currentState, mouseEvent)`
     - `calculateDopplerPreview(startPoint, endPoint, config)`
  3. **Validate with complexity tool after each extraction**

**B3: Split `table.js:renderFrequencyAxis()` (150 lines → <50 lines each)**
- **Location:** `src/components/table.js` lines 408+
- **Current Issues:** Longest single function in codebase
- **Refactoring Approach:**
  1. **Extract mathematical utilities:**
     - `calculateAxisTicks(min, max, containerSize)` - "nice numbers" algorithm
     - `formatFrequencyLabels(frequency, unit)` - label formatting
  2. **Extract rendering utilities:**
     - `renderAxisLine(svgContainer, axisConfig)`
     - `renderAxisTicks(svgContainer, tickPositions, axisConfig)`
     - `renderAxisLabels(svgContainer, labelData, axisConfig)`
  3. **Create main orchestration function** that coordinates the utilities

#### **Phase C: Structural Improvements (Priority #3)**

**C1: Extract Base Drag Handling**
- **Create:** `src/modes/shared/BaseDragHandler.js`
- **Purpose:** Eliminate duplicate drag patterns across all modes  
- **Extract common patterns:** Start drag, update drag, end drag, proximity detection
- **Update all mode classes** to extend or compose with the base handler

**C2: Split `main.js` Constructor (177 lines → <50 lines each)**
- **Extract initialization modules:**
  - `src/core/initialization/DOMSetup.js` - DOM element creation and setup
  - `src/core/initialization/EventBindings.js` - event listener registration  
  - `src/core/initialization/ModeInitialization.js` - mode system setup
- **Create factory/builder pattern** for cleaner initialization sequence

### Implementation Guidelines

**Quality Assurance Requirements:**
1. **Run tests after each file modification:** `yarn test`
2. **Verify complexity reduction:** Use `npx cyclomatic-complexity [file]` after each refactoring
3. **Monitor duplication:** Run `npx jscpd src/` periodically to track improvement
4. **Preserve all functionality:** No feature regression acceptable
5. **Maintain existing interfaces:** External API must remain unchanged

**Refactoring Safety Protocol:**
1. **One file at a time:** Complete and test each file before moving to the next
2. **Incremental commits:** Commit working state after each successful refactoring
3. **Rollback readiness:** Keep original functions commented until tests pass
4. **Cross-mode testing:** Test all modes after changes to shared utilities

### Architectural Context

**Reference these ADRs for context:**
- **ADR-008-Modular-Mode-System.md**: Understand the mode architecture for proper extraction
- **ADR-002-Multiple-Coordinate-Systems.md**: Critical for coordinate transformation utilities
- **ADR-001-SVG-Based-Rendering.md**: Understand rendering patterns for proper separation

**Code Style Consistency:**
- Follow existing patterns in `src/utils/` for new utility modules
- Maintain JSDoc documentation style as established in the codebase
- Use existing import/export patterns from other mode files

## 3. Expected Output & Deliverables

**Define Success:** 
- **Complexity Reduction:** HarmonicsMode CC: 27→<10, DopplerMode CC: 21→<10, table.js largest function <50 lines
- **Duplication Elimination:** Code duplication <1% (from current 1.42%)
- **Functionality Preservation:** All existing features work identically after refactoring
- **Test Coverage Maintained:** All existing tests continue to pass

**Specify Deliverables:**

**Phase A Deliverables:**
- `src/utils/coordinateTransformations.js` - New utility module
- Modified mode files using the new utilities
- Verification report showing duplication reduction

**Phase B Deliverables:**  
- Refactored `HarmonicsMode.renderHarmonicSet()` with extracted functions
- Refactored `DopplerMode.handleMouseMove()` with extracted functions  
- Refactored `table.js:renderFrequencyAxis()` split into focused functions
- Complexity verification showing CC reductions achieved

**Phase C Deliverables:**
- `src/modes/shared/BaseDragHandler.js` - New base class/utility
- Split `main.js` with extracted initialization modules
- Final verification report showing all target metrics achieved

**Final Quality Metrics:**
- Maximum function cyclomatic complexity: <10
- Maximum function length: <50 lines  
- Files >500 lines: Reduce from 5 to ≤3
- Code duplication rate: <1%
- All tests passing: 100%

## 4. Memory Bank Logging Instructions

Upon successful completion of each phase, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

**Adhere strictly to the established logging format. Ensure your log includes:**
- A reference to GitHub Issue #88 and the specific phase completed
- Clear description of the refactoring actions taken
- Code snippets for key extracted functions and utilities created  
- Complexity metrics before/after for each refactored function
- Verification of test suite continuing to pass
- Any challenges encountered during refactoring and how they were resolved
- Confirmation of deliverables completed successfully

**Log Structure Template:**
```
## Issue #88 Phase [A/B/C] - [Description] - [Date]

**Task Reference:** GitHub Issue #88 - Refactor Large Files and Improve Module Boundaries
**Phase:** [A/B/C] - [Phase Name]  
**Complexity Metrics:** [Before] → [After]
**Actions Taken:** [Detailed list]
**Files Modified:** [List with brief descriptions]
**Key Functions Extracted:** [List with signatures]
**Test Results:** [Pass/Fail status]
**Challenges:** [Any issues encountered and solutions]
**Status:** [Completed/In Progress]
```

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. Key areas where clarification might be needed:

- Specific function signatures or interfaces for extracted utilities
- Preferred location for new utility modules  
- Test strategy for validating complex refactoring
- Priority ordering if time constraints arise
- Integration approach for the new coordinate transformation utilities

**Critical Success Factors:**
1. **Preserve functionality** - No regressions acceptable
2. **Achieve complexity targets** - Measurable improvements required
3. **Maintain architecture** - Follow existing patterns and ADRs
4. **Document thoroughly** - Comprehensive Memory Bank logging essential

Begin with **Phase A (coordinate transformation utilities)** as this provides the highest impact with lowest risk, establishing reusable utilities that will support the subsequent phases.

## PHASE C CONTINUATION - Priority #3 Implementation

**IMPORTANT:** Phases A and B have been completed successfully. This section defines the remaining work for Priority #3 (Structural Improvements) that was previously marked as out of scope.

#### **Phase C1: Extract Base Drag Handling (Priority #3.1)**

**Rationale:** Eliminate duplicate drag patterns across all three modes by creating a shared base drag handler.

**Specific Actions:**
1. **Create shared drag handler module**: `src/modes/shared/BaseDragHandler.js`
2. **Analyze common drag patterns** across:
   - `src/modes/analysis/AnalysisMode.js` - marker dragging functionality
   - `src/modes/doppler/DopplerMode.js` - marker dragging and proximity detection
   - `src/modes/harmonics/HarmonicsMode.js` - harmonic set dragging
3. **Extract common drag lifecycle methods:**
   - `startDrag(event, dataCoords, dragTarget)` - Initialize drag operation
   - `updateDrag(event, dataCoords, dragTarget)` - Handle drag movement
   - `endDrag(event, dataCoords, dragTarget)` - Finalize drag operation
   - `detectDragProximity(mousePos, targets)` - Proximity detection
4. **Create base class or composition pattern** for shared drag functionality
5. **Update all mode classes** to use the shared drag handler
6. **Run tests after each mode update** to ensure no regressions

**Expected Outcome:** Eliminate duplicate drag handling code across modes, create reusable drag infrastructure

#### **Phase C2: Split main.js Constructor (Priority #3.2)**

**Rationale:** The constructor is 177 lines long (lines 67-244), making it difficult to maintain and test individual initialization concerns.

**Current Constructor Structure Analysis:**
- **Lines 67-79:** State and property initialization
- **Lines 80-136:** DOM element property declarations  
- **Lines 137-144:** Configuration extraction and table setup
- **Lines 145-163:** Unified layout creation and mode UI setup
- **Lines 169-175:** Spectrogram image setup
- **Lines 176-199:** Mode infrastructure initialization
- **Lines 201-220:** Mode UI recreation with command buttons
- **Lines 221-244:** Event listeners and final initialization

**Specific Actions:**
1. **Create initialization modules:**
   - `src/core/initialization/DOMSetup.js` - DOM element creation and property setup
   - `src/core/initialization/EventBindings.js` - Event listener registration and cleanup
   - `src/core/initialization/ModeInitialization.js` - Mode system setup and configuration
   - `src/core/initialization/UISetup.js` - Unified layout and mode UI creation

2. **Extract initialization functions:**
   ```javascript
   // DOMSetup.js
   export function initializeDOMProperties(instance)
   export function setupSpectrogramComponents(instance)
   
   // EventBindings.js  
   export function setupAllEventListeners(instance)
   export function setupStateListeners(instance)
   
   // ModeInitialization.js
   export function initializeModeInfrastructure(instance)
   export function setupModeUI(instance)
   
   // UISetup.js
   export function createUnifiedLayoutStructure(instance)
   export function setupPersistentContainers(instance)
   ```

3. **Refactor constructor to orchestrate initialization:**
   ```javascript
   constructor(configTable) {
     // Core state initialization (< 10 lines)
     this.state = createInitialState()
     this.configTable = configTable
     this.stateListeners = []
     this.instanceId = ''
     
     // Delegate to initialization modules (< 15 lines)
     initializeDOMProperties(this)
     extractConfigData(this)
     createUnifiedLayoutStructure(this)
     initializeModeInfrastructure(this)
     setupModeUI(this)
     setupAllEventListeners(this)
     setupStateListeners(this)
     
     // Final state notification (< 5 lines)
     notifyStateListeners(this.state, this.stateListeners)
   }
   ```

4. **Create factory/builder pattern** for cleaner initialization sequence
5. **Update imports** to include new initialization modules
6. **Ensure each module is <50 lines** and has focused responsibilities

**Expected Outcome:** Constructor reduced from 177 → <30 lines, with initialization logic split into focused modules of <50 lines each

#### **Implementation Guidelines for Phase C**

**Quality Assurance Requirements:**
1. **Run tests after each module creation:** `yarn test`
2. **Verify no functionality changes:** All existing features must work identically
3. **Maintain existing interfaces:** External API must remain unchanged
4. **Follow existing code patterns:** Use established JSDoc and import/export styles

**Refactoring Safety Protocol:**
1. **One module at a time:** Complete and test each extraction before moving to the next
2. **Incremental commits:** Commit working state after each successful extraction
3. **Preserve original code:** Keep original functions commented until tests pass
4. **Cross-mode testing:** Test all modes after changes to shared utilities

**Success Metrics for Phase C:**
- **Base drag handler created:** Shared functionality across all modes
- **Constructor length:** 177 → <30 lines
- **Initialization modules:** 4 focused modules, each <50 lines
- **Test coverage maintained:** All 59 tests continue to pass
- **No regressions:** All existing functionality preserved