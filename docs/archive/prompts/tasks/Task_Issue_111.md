# APM Task Assignment: Add Version Display to Pan Mode Guidance UI

## 1. Agent Role & APM Context

You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project. Your role is to execute assigned tasks diligently and log work meticulously to maintain project continuity.

The GramFrame project is an interactive spectrogram analysis component that transforms HTML config tables into interactive SVG-based overlays for sonar training materials.

## 2. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to a UI enhancement task that extends the existing mode switching and guidance panel functionality described in the Implementation Plan.

**GitHub Issue Reference:** Issue #111 - Add version number display to pan mode guidance UI

**Objective:** Add the current version number (from package.json) as a subtle watermark/badge in the corner of the pan mode guidance area to assist support teams when helping users identify which version of GramFrame they are running.

**Detailed Action Steps:**

1. **Implement Build-Time Version Injection:**
   - Modify the Vite build configuration (`vite.config.js`) to inject the version number from `package.json` during the build process
   - Create a mechanism to make the version accessible to the JavaScript runtime (similar to approach referenced in issue #110)
   - Consider creating a `version.js` file or injecting version as a global variable during build

2. **Create Version Display Component:**
   - Design and implement a subtle version display component that shows the current version number
   - Position the version display in the corner of the pan mode guidance area (`.gram-frame-guidance` panel)
   - Ensure the display is non-intrusive and doesn't interfere with existing UI elements
   - Style the component to be visible but subtle - consider using reduced opacity or smaller font size

3. **Integrate Version Display with Mode System:**
   - Modify the mode switching UI in `src/components/ModeButtons.js` to include the version display
   - Ensure the version display is visible when the pan mode guidance panel is shown
   - Verify the version display appears correctly in the guidance panel area created by the `createModeSwitchingUI` function

4. **Update CSS Styling:**
   - Add appropriate CSS classes for the version display component in `src/gramframe.css`
   - Ensure proper positioning and styling that maintains the subtle, non-intrusive appearance
   - Consider positioning options: bottom-right corner, top-right corner, or other suitable location within the guidance panel

**Provide Necessary Context/Assets:**

- **Current Architecture:** The mode switching UI is handled by `ModeButtons.js` which creates a guidance panel (`.gram-frame-guidance`) where the version should be displayed
- **Build System:** The project uses Vite with both standard and standalone build configurations. The version injection should work for both builds
- **Current Version:** Package.json shows version "0.0.1" 
- **Styling:** The component uses CSS classes with `gram-frame-` prefix for styling consistency
- **File Structure:** Main component files are in `src/components/`, utilities in `src/utils/`, and CSS in `src/gramframe.css`

**Constraints:**
- Version display must be subtle and non-intrusive to user experience
- Version should be automatically updated from package.json during build process
- Implementation should not require runtime access to package.json (build-time injection only)
- Must work with both development and production builds
- Should follow existing code patterns and naming conventions

## 3. Expected Output & Deliverables

**Define Success:** 
- Version number is visible in the pan mode guidance UI as a subtle watermark/badge
- Version is automatically injected from package.json during build process
- Display is positioned appropriately and doesn't interfere with existing functionality
- Implementation works in both development and production builds

**Specify Deliverables:**
- Modified `vite.config.js` with version injection mechanism
- Updated `src/components/ModeButtons.js` to include version display in guidance panel
- Enhanced CSS styling in `src/gramframe.css` for version display component
- Any additional utility files needed for version management (e.g., `version.js`)

**Format:** 
- All code changes should follow existing patterns and conventions
- CSS classes should use the `gram-frame-` prefix
- Version display should be implemented as a reusable component

## 4. Memory Bank Logging Instructions (Mandatory)

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

Adhere strictly to the established logging format from [Memory_Bank_Log_Format.md](../02_Utility_Prompts_And_Format_Definitions/Memory_Bank_Log_Format.md). Ensure your log includes:
- A reference to GitHub Issue #111 and this task assignment
- A clear description of the build-time version injection implementation
- Code snippets for the version display component and integration points
- Any key decisions made regarding positioning and styling
- Confirmation of successful execution (version displays correctly in both dev and production builds)
- Any challenges encountered during implementation

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. Particular areas where clarification might be needed:
- Preferred method for build-time version injection in Vite
- Exact positioning preferences within the guidance panel
- Styling preferences for the version display (font size, opacity, etc.)
- Integration approach with the existing mode switching system