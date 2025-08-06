# APM Task Assignment: Automate GitHub Releases with Tag-Based Versioning

## 1. Agent Role & APM Context

**Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project.

**Your Role:** As an Implementation Agent, you will execute the assigned task diligently and log your work meticulously. You are responsible for implementing the automated GitHub release system according to the specifications provided.

**Workflow:** You will work independently on this task and report back to the Manager Agent (via the User) upon completion. All work must be documented in the Memory Bank for future reference.

## 2. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to a new infrastructure enhancement that will support the ongoing development workflow for the GramFrame project, facilitating streamlined distribution of built assets.

**Objective:** Implement an automated GitHub Actions workflow that creates releases when version tags are pushed to the repository, including appropriate asset bundling and version management.

**Detailed Action Steps:**

1. **Create GitHub Actions Workflow File:**
   - Create `.github/workflows/release.yml` with appropriate triggers and permissions
   - Configure workflow to trigger on version tag push (pattern: `v*.*.*`)
   - Ensure workflow uses semantic versioning format

2. **Implement Build Process Integration:**
   - Use existing `yarn build` command to compile the project
   - Ensure build process completes successfully before creating release
   - Handle build failures gracefully with appropriate error messaging

3. **Configure Asset Bundling:**
   - Bundle the built `dist/` folder for distribution
   - Include a simple test file for verification purposes
   - Include a mock gram image for testing functionality
   - Create a compressed archive of these assets

4. **Implement Version Management System:**
   - Extract version number from the pushed tag
   - Validate tag format follows semantic versioning (x.x.x)
   - Use tag version for release naming and asset versioning

5. **Configure Release Creation:**
   - Automatically generate release notes from commits/PRs since last tag
   - Create GitHub release with descriptive title and generated notes
   - Attach bundled assets to the release
   - Mark release as appropriate (draft/prerelease/stable)

6. **Implement PR Label-Based Version Increment (Preparation):**
   - Document the approach for future PR label integration
   - Prepare structure for handling `major`, `minor`, and `patch` labels
   - Note: Full implementation of automatic version bumping can be a separate task

7. **Add Error Handling and Logging:**
   - Implement comprehensive error handling throughout workflow
   - Provide clear failure messages for debugging
   - Log important steps for workflow transparency

**Provide Necessary Context/Assets:**
- Current project uses Vite for building (`yarn build` command)
- Project follows semantic versioning in package.json (currently v0.0.1)
- Existing build process creates `dist/` folder with compiled assets
- Sample files exist in `sample/` directory that can be used as test assets
- Project uses yarn package manager throughout

**Constraints and Requirements:**
- Must be compatible with existing development workflow
- Should not interfere with current CI/CD processes
- Must handle edge cases gracefully (invalid tags, build failures)
- Release assets should be minimal but functional for end users

## 3. Expected Output & Deliverables

**Define Success:** 
The task is complete when:
- GitHub Actions workflow successfully triggers on version tag push
- Workflow builds project and creates release with attached assets
- Error handling prevents incomplete or broken releases
- Documentation explains the release process for future use

**Specify Deliverables:**
- `.github/workflows/release.yml` - Main workflow file
- Updated documentation explaining the release process
- Test verification that workflow functions correctly
- Clear instructions for maintainers on how to create releases

**Format:** 
- YAML workflow file following GitHub Actions best practices
- Documentation in Markdown format
- Clear, commented code for maintainability

## 4. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

**Format Adherence:** Adhere strictly to the established logging format. Ensure your log includes:
- A reference to GitHub Issue #110 and this task assignment
- A clear description of the GitHub Actions workflow created
- Key decisions made regarding asset bundling and release process
- Any challenges encountered during implementation
- Code snippets of the workflow configuration
- Confirmation of successful execution (workflow testing results)
- Instructions for maintainers on using the new release system

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. Key areas that may require clarification:
- Specific assets to include in release bundle
- Release naming conventions preferences
- Error handling requirements
- Testing methodology for the workflow