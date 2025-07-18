# GramFrame Memory Bank

This directory serves as the Memory Bank for the GramFrame project, following the Agentic Project Management (APM) framework. It contains a chronological record of all significant actions, decisions, code snippets, and agent outputs throughout the project lifecycle.

## Structure

The Memory Bank is organized by project phases, with each phase having its own directory:

- **Phase_1**: Bootstrapping + Dev Harness
- **Phase_2**: Basic Layout and Diagnostics Panel
- **Phase_3**: Interaction Foundations
- **Phase_4**: Harmonics & Modes
- **Phase_5**: Final Fit & Polish

Within each phase directory, log files are organized by task, following the naming convention `Task_[ID]_[Description]_Log.md`.

## Testing Documentation

This project follows a comprehensive test-driven development approach. For each implementation task, there is a corresponding testing task. Test results should be documented thoroughly using the `Testing_Template.md` file as a guide. Test documentation should include:

- Test cases with expected and actual results
- Edge cases that were tested
- Issues found during testing
- Fixes applied to resolve issues
- Follow-up actions if needed

## Purpose

The Memory Bank serves several critical functions:

1. **Shared Context**: Provides a comprehensive record of project development for all agents and stakeholders
2. **Decision Tracking**: Documents key decisions and their rationales
3. **Knowledge Persistence**: Ensures critical information persists beyond any single agent's context window
4. **Progress Monitoring**: Enables tracking of project progress against the Implementation Plan
5. **Audit Trail**: Maintains a transparent record of all significant project activities
6. **Test Documentation**: Ensures all features are properly tested and verified

## Log Format

Each log entry follows a standardized format:

```markdown
## [Timestamp] - [Action Type]

### Context
[Brief description of the context in which the action was taken]

### Action
[Detailed description of the action taken]

### Outcome
[Results or consequences of the action]

### Next Steps
[Planned follow-up actions, if any]
```

## Usage Guidelines

1. All Implementation Agents must log their activities in the appropriate task log file
2. Each log entry should be comprehensive but concise
3. Code snippets should be properly formatted with markdown code blocks
4. Important decisions and their rationales must be clearly documented
5. Links to relevant external resources should be included when applicable
6. All testing activities must be documented using the testing template format
7. No implementation task should be considered complete until its corresponding testing task is also complete
