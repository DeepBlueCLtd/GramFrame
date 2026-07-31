# APM Task Assignment: Implement file:// Protocol Compatibility for GramFrame

## 1. Agent Role & APM Context

**Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project.

**Your Role:** As an Implementation Agent, you will execute the assigned task diligently, implementing the required changes to enable file:// protocol compatibility while maintaining all existing functionality.

**Workflow:** You will interact with the Manager Agent (via the User) and must meticulously log your work to the Memory Bank for project continuity and knowledge sharing.

## 2. Task Assignment

**Issue Reference:** This assignment addresses GitHub Issue #106: "Feature: Ensure file:// protocol compatibility for standalone HTML deployment"

**Objective:** Modify the GramFrame build process and code structure to enable full functionality when HTML files are opened directly from the file system using the file:// protocol, without requiring a web server.

### Critical Context from Issue Analysis:

The current build output has multiple blocking issues when accessed via file://:
1. ES Module CORS blocking - `<script type="module">` triggers CORS policy
2. Absolute path references - `/assets/` paths fail to resolve
3. External resource loading - CSS and images blocked by CORS

### Detailed Action Steps:

1. **Analyze Current Build Configuration**
   - Review `vite.config.js` to understand current build settings
   - Document the current output format and bundling approach
   - Identify all external resource dependencies (CSS, images, fonts)

2. **Implement IIFE Build Format**
   - Modify Vite configuration to output as IIFE (Immediately Invoked Function Expression) format
   - Configuration should include:
     ```javascript
     build: {
       rollupOptions: {
         output: {
           format: 'iife',
           name: 'GramFrame',
           inlineDynamicImports: true,
           entryFileNames: 'gramframe.bundle.js',
           assetFileNames: '[name][extname]'
         }
       },
       base: './',  // Use relative paths
       assetsInlineLimit: 100000  // Inline smaller assets as base64
     }
     ```
   - Ensure all dependencies are bundled into a single file

3. **Convert to Relative Paths**
   - Update all asset references to use relative paths (`./assets/` instead of `/assets/`)
   - Modify the build output to ensure CSS and other assets use relative paths
   - Test that paths resolve correctly when accessed from different directory depths

4. **Inline Critical Resources**
   - Configure CSS to be injected via JavaScript rather than external stylesheets
   - Convert small images to base64 data URIs where appropriate
   - For the main gramframe.css, ensure it's bundled within the JavaScript

5. **Remove ES Module Dependencies**
   - Update HTML templates to use standard script tags without `type="module"`
   - Ensure the bundle self-initializes without module imports
   - Implement a global namespace pattern similar to sorttable.js:
     ```javascript
     (function() {
       // Initialize styles
       const style = document.createElement('style');
       style.textContent = /* bundled CSS */;
       document.head.appendChild(style);
       
       // Define global GramFrame
       window.GramFrame = {
         // Component definition
       };
       
       // Auto-initialize on DOMContentLoaded
       document.addEventListener('DOMContentLoaded', function() {
         // Auto-detection and initialization logic
       });
     })();
     ```

6. **Create Test HTML Files**
   - Create `test-file-protocol.html` that loads the bundled version
   - Include multiple GramFrame instances to test multi-component support
   - Ensure the test file can be opened directly without a server

7. **Implement Backwards Compatibility**
   - Maintain the existing module-based build for development (`yarn dev`)
   - Create a separate production build configuration for file:// compatibility
   - Consider adding a build script like `yarn build:standalone` for the file-compatible version

8. **Test Comprehensive Functionality**
   - Test all three modes (Analysis, Harmonics, Doppler) work correctly
   - Verify cursor positioning and coordinate transformations
   - Ensure state management and event handling function properly
   - Test on both Windows (via Explorer) and macOS (via Finder)
   - Verify console shows successful initialization without errors

### Provide Necessary Context/Assets:

**Reference ADRs:** 
- Review ADR-001: SVG-Based Rendering Architecture - The rendering approach must remain unchanged
- Review ADR-010: Unminified Production Build - Maintain unminified output for field debugging

**Working Example Reference:**
Analyze the sorttable.js implementation pattern: https://github.com/DeepBlueCLtd/Fi3ldMan/blob/main/template/resources/sorttable.js
- Note its use of IIFE pattern
- Observe the global namespace approach
- Study how it self-initializes without external dependencies

**Current File Structure:**
- Main entry: `src/index.js`
- Component class: `src/main.js`
- Styles: `src/gramframe.css`
- Build config: `vite.config.js`

## 3. Expected Output & Deliverables

**Define Success:** 
- GramFrame components render and function correctly when HTML is opened via file:// protocol
- No CORS errors in console
- All modes and features work identically to the server-hosted version

**Specify Deliverables:**
1. Modified `vite.config.js` with new build configuration
2. Updated build script in `package.json` (e.g., `build:standalone`)
3. Modified source files to support IIFE pattern if needed
4. Test file `test-file-protocol.html` demonstrating functionality
5. Documentation update in README.md explaining the standalone build process

## 4. Memory Bank Logging Instructions

**Instruction:** Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

**Format Adherence:** Adhere strictly to the established logging format. Ensure your log includes:
- A reference to GitHub Issue #106 and this task assignment
- Clear description of the build configuration changes made
- Code snippets showing the key modifications (vite.config.js changes, IIFE wrapper structure)
- Any challenges encountered with bundling or path resolution
- Confirmation of successful testing on file:// protocol
- Test results from both Windows and macOS platforms

Reference the [Memory_Bank_Log_Format.md](../02_Utility_Prompts_And_Format_Definitions/Memory_Bank_Log_Format.md) for the exact format requirements.

## 5. Clarification Instruction

If any part of this task assignment is unclear, particularly regarding:
- The extent of changes allowed to the existing codebase
- Preferences for maintaining dual build outputs vs. single unified build
- Specific browser compatibility requirements
- Treatment of large assets that may not inline well

Please state your specific questions before proceeding.

## 6. Priority Considerations

This is marked as **High Priority** as it affects the primary deployment method for end users who receive HTML files with embedded spectrograms. The solution must:
- Not break existing functionality
- Maintain performance characteristics
- Preserve the development workflow
- Support all existing features and modes

Begin by analyzing the current build configuration and creating a proof-of-concept with a minimal IIFE bundle to validate the approach.