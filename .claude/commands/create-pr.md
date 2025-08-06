# Create Pull Request

This command creates a pull request for the current branch, analyzing the changes and generating an appropriate PR title and description.

## Process

1. Check current branch and verify it's not the main branch
2. Analyze git log and diff to understand changes since branching from main
3. Generate PR title and description based on:
   - Commit messages and change patterns
   - Files modified (scope analysis)
   - Issue number, if known
4. Push branch if not already pushed
5. Create PR using GitHub CLI

## Branch Analysis

The command will:
- Identify the base branch (usually `main`)
- Get commit history since branching: `git log main..HEAD`
- Analyze file changes: `git diff main...HEAD --name-only`
- Extract issue number from branch name if present

## PR Generation

Based on the analysis, it will create:
- **Title**: Follows conventional commit format (feat/fix/etc.) with brief description
- **Body**: Includes summary bullets of changes and references issue if applicable
- **Test plan**: Basic checklist for testing the changes

## Usage

Run from any feature branch to create a PR. The command will:
1. Ensure you're not on main/master
2. Push the current branch if needed
3. Generate appropriate PR title and description
4. Create the PR using `gh pr create`
5. Return the PR URL for easy access

Note: Requires GitHub CLI (`gh`) to be installed and authenticated.

## Attribution
Do not record the contribution of Claude Code, Claude, or anthropic to the changes.