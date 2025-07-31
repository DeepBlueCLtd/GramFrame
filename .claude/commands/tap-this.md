# Create Task Assignment Prompt with Git Worktree

## Git Worktree Setup
First, create a new git worktree for this GitHub issue:

1. Create the worktrees directory if it doesn't exist: `mkdir -p ../worktrees`
2. Create a new worktree from main branch: `git worktree add ../worktrees/issue-{issue_number} main`
3. Verify worktree creation: `git worktree list`

## Task Assignment Prompt Creation
Read the guide at prompts/01_Manager_Agent_Core_Guides/03_Task_Assignment_Prompts_Guide.md and use it to create a task assignment prompt for GitHub issue #{issue_number} from the upstream repository for this project. 

Analyze the GitHub issue to understand the requirements, scope, and technical details. Then generate a structured task assignment prompt following the guide's template and save it to prompts/tasks/Task_Issue_{issue_number}.md.

The prompt should be ready for a Manager Agent to assign to an Implementation Agent within the APM framework.

## Switch to Worktree
After creating the task prompt, switch to the new worktree to begin work:

1. Change to the worktree directory: `cd ../worktrees/issue-{issue_number}`
2. Verify you're in the correct worktree: `git branch --show-current`

## Create Pull Request (After Implementation)
Once development work is complete in the worktree:

1. Commit your changes: `git add . && git commit -m "fix: description of changes"`
2. Push the branch: `git push -u origin issue-{issue_number}`
3. Create PR with GitHub CLI: `gh pr create --title "Fix: Brief description" --body "Fixes #{issue_number}"`

The worktree is now ready for development work on the GitHub issue.