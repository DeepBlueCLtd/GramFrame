# APM Task Assignment: Dependency Analysis and Dead Code Removal

## 1. Agent Role & APM Context

You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame interactive spectrogram analysis project. Your role is to execute assigned tasks diligently and log work meticulously to maintain project continuity and knowledge retention.

## 2. Task Assignment

**Reference GitHub Issue:** This assignment corresponds to GitHub Issue #39: "dependency analysis to remove unused code"

**Objective:** Conduct a comprehensive analysis of the GramFrame codebase to identify and document unused code, produce a dependency tree, and identify unused CSS classes. This analysis will help maintain code quality and reduce bundle size after recent refactoring.

**Detailed Action Steps:**

1. **Analyze JavaScript/TypeScript Dependencies:**
   - Generate a comprehensive dependency tree for the entire codebase starting from entry points (`src/index.js`, `src/main.js`)
   - Use static analysis tools (such as `madge`, `dependency-cruiser`, or similar) to map all module dependencies
   - Identify any modules that are imported but never actually used
   - Document any circular dependencies that may exist

2. **Identify Dead Code:**
   - Scan all JavaScript files in the `src/` directory for unused functions, classes, and variables
   - Use tools like `ts-unused-exports` or similar to detect unused exports
   - Cross-reference function/class usage across the entire codebase
   - Pay special attention to utility functions that may have become orphaned after refactoring

3. **Analyze Test-Only Code:**
   - Identify code that is only referenced from test files (`tests/` directory)
   - Document functions, classes, or modules that serve only testing purposes
   - Distinguish between legitimate test utilities and accidentally orphaned code

4. **CSS Analysis:**
   - Scan `src/gramframe.css` and any other CSS files for unused class definitions
   - Cross-reference CSS classes with their usage in JavaScript files and HTML templates
   - Use tools like `PurgeCSS` or manual analysis to identify unused selectors
   - Check for duplicate or redundant CSS rules

5. **Generate Dependency Report:**
   - Create a structured report documenting all findings
   - Include dependency tree visualization if possible
   - List all identified unused code with file paths and line numbers
   - Categorize findings by risk level (safe to remove vs. needs investigation)

**Provide Necessary Context/Assets:**

- **Codebase Structure:** The GramFrame project follows a modular architecture with:
  - Entry point: `src/index.js`
  - Main class: `src/main.js` 
  - Core modules: `src/core/` (state, events, configuration, FeatureRenderer)
  - Mode system: `src/modes/` (BaseMode, ModeFactory, specific modes)
  - UI components: `src/components/`
  - Utilities: `src/utils/`
  - Rendering: `src/rendering/`

- **Recent Refactoring Context:** The codebase has undergone recent refactoring that may have left orphaned code
- **Build System:** Uses Vite for bundling with unminified output for debugging
- **Testing:** Playwright-based end-to-end tests in `tests/` directory

**Tools and Approach:**
- Use appropriate static analysis tools for JavaScript dependency analysis
- Consider both dynamic imports and static imports
- Account for JSDoc type references when analyzing dependencies
- Be thorough but conservative in recommendations for code removal

## 3. Expected Output & Deliverables

**Define Success:** Successful completion requires a comprehensive analysis report that clearly identifies all unused code, dependencies, and CSS classes with sufficient detail for decision-making.

**Specify Deliverables:**
1. **Dependency Tree Report:** Visual or textual representation of the complete module dependency graph
2. **Dead Code Analysis Report:** Detailed list of unused functions, classes, variables, and modules with file locations
3. **Test-Only Code Documentation:** Separate listing of code only used by tests
4. **CSS Analysis Report:** List of unused CSS classes and selectors
5. **Recommendations Document:** Categorized recommendations for code removal with risk assessment
6. **Summary Report:** Executive summary of findings with quantified impact (file sizes, number of unused items)

**Format:** Markdown documents with clear sections, code snippets where relevant, and actionable recommendations.

## 4. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

Adhere strictly to the established logging format. Ensure your log includes:
- A reference to GitHub Issue #39 and this task assignment
- A clear description of the analysis methods and tools used
- Summary of key findings (quantities of unused code identified)
- Any code snippets or examples of identified issues
- Any key decisions made during the analysis process
- Confirmation of successful delivery of all required reports

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. This includes questions about:
- Preferred analysis tools if you have recommendations
- Scope boundaries (e.g., should external dependencies be analyzed)
- Risk tolerance for code removal recommendations
- Format preferences for reports and visualizations