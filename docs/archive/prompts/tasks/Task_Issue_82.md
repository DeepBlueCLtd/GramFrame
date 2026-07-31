# APM Task Assignment: Eliminate Generic {Object} Types and Convert TypeScript Tests to JavaScript

## 1. Agent Role & APM Context

**Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame type safety enhancement project.

**Your Role:** Execute the assigned task of eliminating generic `{Object}` types and converting TypeScript tests to JavaScript with comprehensive JSDoc type validation. Log all work meticulously to maintain project continuity.

**Workflow:** You will work independently on this substantial type safety initiative, reporting progress and seeking clarification through the Manager Agent (via the User) as needed. All work must be documented in the Memory Bank for future reference.

## 2. Task Assignment

**Reference Implementation Plan:** This assignment addresses a critical type safety issue identified in GitHub Issue #82, focusing on eliminating 130+ generic `{Object}` types and converting 4,217 lines of TypeScript tests to JavaScript for complete JSDoc type validation.

**Objective:** Transform the GramFrame codebase from generic type annotations to specific, validated JSDoc types while maintaining full test coverage and functionality.

**Detailed Action Steps:**

### Phase 1: Convert TypeScript Tests to JavaScript (Priority 1)
**Files to convert (15 files, ~4,217 lines):**
- Convert `tests/helpers/gram-frame-page.ts` → `.js` with comprehensive JSDoc annotations
- Convert `tests/helpers/coordinate-helpers.ts` → `.js` 
- Convert `tests/helpers/interaction-helpers.ts` → `.js`
- Convert `tests/helpers/state-assertions.ts` → `.js`
- Convert `tests/helpers/test-utils.ts` → `.js`
- Convert `tests/helpers/visual-helpers.ts` → `.js`
- Convert `tests/helpers/mode-helpers.ts` → `.js`
- Convert `tests/helpers/fixtures.ts` → `.js`
- Convert all `tests/*.spec.ts` files → `.js` (8 test specification files)

**Conversion Requirements:**
- Preserve all existing test functionality exactly
- Add comprehensive JSDoc type annotations to all functions and variables
- Ensure Playwright compatibility with JavaScript tests
- Update test configuration files for JavaScript execution
- Validate all tests pass after conversion with `yarn test`

### Phase 2: Eliminate Generic {Object} Types - Strategic Implementation

**Phase 2a: Coordinate Objects (35 occurrences) - Start Here**
- **Target Pattern**: `@param {Object} point`, `@param {Object} svgPos`, etc.
- **Replace with**: `SVGCoordinates`, `DataCoordinates`, `ScreenCoordinates`
- **Primary Files**: `src/rendering/cursors.js`, `src/utils/doppler.js`, `src/utils/coordinates.js`
- **Validation**: Use existing coordinate types from `src/types.js`

**Phase 2b: Configuration Objects (15 occurrences)**
- **Target Pattern**: `@param {Object} config`, `@param {Object} margins`
- **Replace with**: `Config`, `AxesMargins`, `ImageDetails`, `DisplayDimensions`
- **Primary Files**: `src/utils/calculations.js`, `src/components/table.js`

**Phase 2c: Mode-Specific State Objects (12 occurrences)**
- **Target Pattern**: `@param {Object} harmonicSet`, `@param {Object} marker`
- **Replace with**: `HarmonicSet`, `AnalysisMarker`, `DopplerState`  
- **Primary Files**: Mode-specific files in `src/modes/`

**Phase 2d: GramFrame Instance Type (45+ occurrences) - Most Complex**
- **Target Pattern**: `@param {Object} instance - GramFrame instance`
- **Action Required**: Create comprehensive `GramFrame` interface in `src/types.js`
- **Interface Requirements**: Include 30+ properties covering all GramFrame instance methods and properties
- **Primary Files**: All major system files reference GramFrame instances

**Phase 2e: Return Objects & UI Collections (14 occurrences)**
- **Target Pattern**: `@returns {Object} Object containing...`
- **Create New Typedefs**: `ModeUIElements`, `ZoomControlElements`, `LayoutDimensions`
- **Primary Files**: UI components, utility functions

**Phase 2f: Generic Utility Objects (9 occurrences)**
- **Target Pattern**: Movement vectors, color objects, etc.
- **Create New Typedefs**: `MovementVector`, `RGBColor`
- **Primary Files**: Various utility functions

### Phase 3: Create Missing @typedef Definitions
**Required new type definitions (~8-10 new interfaces in `src/types.js`):**
- `GramFrame` - Complete GramFrame instance interface (30+ properties)
- `ModeUIElements` - Mode switching UI element collections
- `ZoomControlElements` - Zoom control UI references  
- `LayoutDimensions` - SVG layout calculation results
- `MovementVector` - Keyboard navigation parameters `{dx, dy}`
- `RGBColor` - Color picker results `{r, g, b}`
- `DOMElementCollection` - Generic DOM element reference patterns

**Provide Necessary Context/Assets:**

**Existing Type Foundation:** Reference `src/types.js` which contains comprehensive `@typedef` definitions that are currently underutilized. Many functions ignore existing typedefs and use generic `{Object}` instead.

**Key Files for Analysis:**
- `src/types.js` - Existing type definitions to build upon
- `src/main.js` - GramFrame class implementation for interface creation
- `src/core/state.js` - State management patterns
- `src/modes/` - Mode-specific implementations

**CRITICAL VALIDATION REQUIREMENT:**
**DO NOT START ANY NEW PHASE WITHOUT BOTH `yarn typecheck` AND `yarn test` PASSING SUCCESSFULLY**

**Validation Strategy:**
```bash
# MANDATORY: Before starting ANY new phase
yarn typecheck && yarn test

# MANDATORY: After completing each phase
yarn typecheck && yarn test

# After each file modification  
yarn typecheck && npx playwright test [relevant-test]

# Progress tracking
echo "Remaining: $(grep -r '{Object}' src/ --include='*.js' | wc -l)"
```

**Phase Transition Requirements:**
- Phase 1 → Phase 2: Must pass `yarn typecheck && yarn test`
- Phase 2a → Phase 2b: Must pass `yarn typecheck && yarn test`  
- Phase 2b → Phase 2c: Must pass `yarn typecheck && yarn test`
- Phase 2c → Phase 2d: Must pass `yarn typecheck && yarn test`
- Phase 2d → Phase 2e: Must pass `yarn typecheck && yarn test`
- Phase 2e → Phase 2f: Must pass `yarn typecheck && yarn test`
- Phase 2f → Phase 3: Must pass `yarn typecheck && yarn test`
- Before final completion: Must pass `yarn typecheck && yarn test`

**Failure Protocol:** If either command fails, STOP immediately and fix issues before proceeding to the next phase.

**Architectural Context:** This task builds upon the existing JSDoc type system established in `src/types.js`. The goal is to eliminate generic typing while leveraging the strong foundation already in place. Reference the coordinate transformation system and state management patterns when creating new type definitions.

## 3. Expected Output & Deliverables

**Define Success:** 
- Zero generic `{Object}` types remain in the codebase
- All TypeScript tests converted to JavaScript with JSDoc validation
- All existing functionality preserved
- Full type checking enabled for JavaScript files

**Specify Deliverables:**
- **130+ type replacements** - All generic objects replaced with specific typedefs
- **8-10 new interfaces** - Complete type coverage for all system components  
- **4,217+ lines converted** - All TypeScript tests converted to JavaScript
- **Zero type errors** - Clean `yarn typecheck` validation across codebase
- **All tests passing** - `yarn test` shows 100% pass rate

**Format Requirements:**
- All new `@typedef` definitions in `src/types.js` following existing patterns
- JSDoc annotations following project conventions
- Consistent naming patterns for new type definitions
- Test files maintain existing Playwright test structure

## 4. Memory Bank Logging Instructions (Mandatory)

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

**Format Adherence:** Adhere strictly to the established logging format found in [Memory_Bank_Log_Format.md](../02_Utility_Prompts_And_Format_Definitions/Memory_Bank_Log_Format.md). Ensure your log includes:
- A reference to GitHub Issue #82 and this task assignment
- A clear description of the phased approach taken
- Key code snippets for new type definitions created
- Any critical decisions made during GramFrame interface design
- Confirmation of successful execution (all tests passing, zero type errors)
- Count of generic `{Object}` types eliminated (target: 130+)
- Summary of TypeScript to JavaScript conversion results

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. This is a substantial refactoring that affects the entire codebase - clarity is essential for success.

**Key Areas That May Need Clarification:**
- Specific property requirements for the GramFrame interface
- Handling of complex nested object types in coordinate transformations
- Test configuration changes needed for JavaScript execution
- Priority ordering if time constraints require phase completion