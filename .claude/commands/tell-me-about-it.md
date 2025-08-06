# Generate Git Commit Message

This command analyzes staged files and suggests an appropriate git commit message following conventional commit format.

## Process

1. Check for staged files using `git diff --cached --name-only`
2. Analyze the changes to determine:
   - Commit type (feat, fix, test, docs, refactor)
   - Scope based on file locations
   - Nature of changes (additions vs deletions)

3. Generate a commit message suggestion based on:
   - File patterns (e.g., test files → "test" type)
   - Directory structure (e.g., src/modes/ → "feat(modes)")
   - Content analysis (looking for keywords like "fix" or "bug")
   - Change size (more additions → "add new functionality")

4. Present the suggested message and ask whether to:
   - Accept and commit with the suggested message
   - Edit the message before committing
   - Reject and let the user commit manually

## Usage

Stage your files first with `git add`, then run this command to get a commit message suggestion.

The command will analyze your staged changes and provide an appropriate conventional commit message that you can accept, edit, or reject.