# APM Task Assignment: Create Automated Release Command

## 1. Agent Role & APM Context

**Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project.

**Your Role:** As an Implementation Agent, you are responsible for executing assigned tasks diligently and logging work meticulously. You will implement the specified functionality according to the requirements and established patterns in the codebase.

**Workflow:** You will interact with the Manager Agent (via the User) and must maintain comprehensive documentation in the Memory Bank for future reference and project continuity.

## 2. Task Assignment

**Reference Implementation Plan:** This task corresponds to Issue #114 - a maintenance task for creating release automation tooling that supports the documented release process in `docs/Release-Process.md`.

**Objective:** Create a new Claude command `release-me.md` in `.claude/commands/` that automates version bumping and git tagging as part of the GramFrame release process. This command will streamline the release workflow by handling semantic versioning updates and creating properly formatted git tags.

**Detailed Action Steps:**

1. **Analyze Existing Command Structure:**
   - Examine existing commands in `.claude/commands/` directory (create-pr.md, notify.md, etc.) to understand the established patterns and documentation format
   - Review the command structure, documentation style, and functional approach used by existing commands

2. **Review Release Process Documentation:**
   - Study `docs/Release-Process.md` to understand the complete release workflow context
   - Note the current manual steps: version update in package.json → git tag creation → push tag
   - Understand the required tag format: `v*.*.*` (semantic versioning with 'v' prefix)

3. **Implement Version Parsing and Manipulation:**
   - Create functionality to read and parse the current version from `package.json`
   - Implement semantic version increment logic:
     - `patch`: 1.2.3 → 1.2.4 (default behavior)
     - `minor`: 1.2.3 → 1.3.0 (resets patch to 0)
     - `major`: 1.2.3 → 2.0.0 (resets minor and patch to 0)
   - Validate that version follows semantic versioning format

4. **Implement Git Operations:**
   - Create git tag with format `v{new_version}` (e.g., "v1.2.3")
   - Include error checking for git operations
   - Ensure working directory is clean before making changes

5. **Create Comprehensive Error Handling:**
   - Check for uncommitted changes and fail if present
   - Validate package.json exists and contains valid version
   - Verify git repository state
   - Provide clear, actionable error messages for all failure scenarios
   - Implement fail-fast approach - stop immediately on any error with no changes made

6. **Implement Detailed Logging:**
   - Show current version detection
   - Display new version calculation
   - Log package.json update process
   - Report git tag creation status
   - Provide success confirmation with final version

7. **Create Command Documentation:**
   - Follow the documentation pattern established by existing commands
   - Document command usage, parameters, and behavior
   - Include examples and error scenarios
   - Explain integration with the overall release process

**Provide Necessary Context/Assets:**

- **Existing Command Patterns**: Reference the structure and style of `.claude/commands/create-pr.md` and other commands
- **Package.json Structure**: Current file shows version field as `"version": "0.0.1"` - maintain this JSON format
- **Release Process Context**: The command integrates with the automated release workflow documented in `docs/Release-Process.md`
- **Git Tag Requirements**: Tags must follow `v*.*.*` format to trigger the GitHub Actions release workflow

## 3. Expected Output & Deliverables

**Define Success:** The command is successfully implemented when:
- It correctly parses optional major/minor/patch parameters (defaulting to patch)
- Updates package.json version following semantic versioning rules
- Creates properly formatted git tags (v{version})
- Provides detailed logging throughout execution
- Handles all error scenarios gracefully with clear messages
- Follows established patterns from existing Claude commands

**Specify Deliverables:**
1. **New Command File**: `.claude/commands/release-me.md` with complete implementation
2. **Error Handling**: Comprehensive error detection and reporting
3. **Documentation**: Clear usage instructions and examples within the command file
4. **Integration**: Proper integration with existing release workflow

**Format:** The command should follow the markdown documentation format established by existing commands in the `.claude/commands/` directory.

## 4. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

Adhere strictly to the established logging format. Ensure your log includes:
- A reference to this task (Issue #114 - Create Automated Release Command)
- A clear description of the actions taken
- Key implementation decisions made (error handling approach, version parsing method, etc.)
- Any challenges encountered and how they were resolved
- Code snippets for the core functionality implemented
- Confirmation of successful execution (command testing, validation steps)

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. Key areas that might need clarification:
- Specific command invocation syntax preferences
- Additional error scenarios to handle beyond those specified
- Integration with any existing version management tools
- Testing approach for the new command