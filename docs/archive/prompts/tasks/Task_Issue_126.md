# APM Task Assignment: Version.js Server-Only Update Implementation

## 1. Agent Role & APM Context

You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project. Your role is to execute assigned tasks diligently and log work meticulously to maintain project continuity and knowledge preservation.

## 2. Task Assignment

**Reference GitHub Issue:** This assignment addresses GitHub Issue #126 - "Only update `version.js` on server"

**Issue Context:** Currently, the `version.js` file gets updated during local builds via the `generate-version` script, causing it to appear as a changed file that needs to be committed after each version bump. This creates unnecessary version control noise and developer friction.

**Objective:** Implement a placeholder version strategy where:
- Local development uses a placeholder version in `version.js`
- The release pipeline updates `version.js` with the actual version from `package.json` before building
- Developers no longer need to commit `version.js` changes after version bumps

**Detailed Action Steps:**

1. **Modify version.js to use placeholder version:**
   - Change the VERSION constant in `src/utils/version.js` from the current version to a placeholder value `'DEV'`
   - Ensure the file structure and exports remain identical for API compatibility
   - Add a comment explaining this is a placeholder updated during releases

2. **Update package.json scripts to remove local version generation:**
   - Remove `npm run generate-version &&` from the `dev`, `build`, and `build:standalone` scripts
   - Keep the `generate-version` script itself (needed for release pipeline)
   - Ensure local builds work with placeholder version

3. **Modify release.yml workflow to update version before building:**
   - Add a new step after "Install dependencies" and before "Build standalone version"
   - Use the existing `scripts/generate-version.js` to update version.js with actual package.json version
   - Ensure this happens before the build step so the release contains the correct version

4. **Verify the implementation:**
   - Test that local `yarn dev` works without changing version.js
   - Test that local `yarn build` works with placeholder version
   - Confirm that the generate-version script still functions correctly when called manually

**Provide Necessary Context/Assets:**

- Current `src/utils/version.js` exports VERSION constant and getVersion() function
- `scripts/generate-version.js` reads package.json and updates version.js using regex replacement
- Build scripts in package.json currently run generate-version before Vite
- Release workflow in `.github/workflows/release.yml` handles CI/CD builds
- The VERSION constant is used throughout the codebase for version display

## 3. Expected Output & Deliverables

**Define Success:** 
- Local builds (`yarn dev`, `yarn build`) no longer modify `version.js`
- `version.js` contains placeholder `'DEV'` version in repository
- Release workflow successfully updates version before building
- All existing version-related functionality continues to work unchanged

**Specify Deliverables:**
1. Modified `src/utils/version.js` with placeholder version and explanatory comment
2. Updated `package.json` with scripts that don't run generate-version locally
3. Enhanced `.github/workflows/release.yml` with version update step
4. Verification that local builds work without file changes

**Format:** Standard code file modifications with clear, minimal changes to existing structure.

## 4. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

Adhere strictly to the established logging format. Ensure your log includes:
- A reference to GitHub Issue #126 and the placeholder version strategy
- A clear description of the files modified and changes made
- Code snippets showing the key changes (placeholder version, script modifications, workflow step)
- Any key decisions made during implementation
- Confirmation of successful testing (local builds, version script functionality)

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. Pay particular attention to:
- The exact placeholder value to use (suggested: 'DEV')
- The placement of the version update step in the release workflow
- Any concerns about API compatibility or breaking changes