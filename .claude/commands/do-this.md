# Implement Task with Git Worktree

## Git Worktree Setup
First, create a new git worktree for this GitHub issue:

1. Create the worktrees directory if it doesn't exist: `mkdir -p ../worktrees`
2. Create a new worktree with new branch: `git worktree add ../worktrees/issue-{issue_number} -b issue-{issue_number} main`
3. Verify worktree creation: `git worktree list`
4. Switch to the worktree directory: `cd ../worktrees/issue-{issue_number}`
5. Verify you're in the correct worktree: `git branch --show-current`

## Task Implementation
Read and implement the task assignment prompt at prompts/tasks/Task_Issue_{issue_number}.md. Follow all instructions in the prompt including:

1. Execute the detailed action steps as specified
2. Deliver the expected outputs and deliverables
3. Test the implementation to ensure it works correctly
4. Log the completed work to Memory_Bank.md following the specified format
5. Run lint and typecheck commands if available to ensure code quality

## Create Pull Request
Once development work is complete in the worktree:

1. Commit your changes: `git add . && git commit -m "fix: description of changes"`
2. Push the branch: `git push -u origin issue-{issue_number}`
3. Create PR with GitHub CLI: `gh pr create --title "Fix: Brief description" --body "Fixes #{issue_number}"`

Complete the task thoroughly, document all work performed, and send a status report when the task is complete.