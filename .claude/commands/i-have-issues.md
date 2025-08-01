# Create GitHub Issue

This command creates a GitHub issue based on the information you provide, with the expectation that the user will then run `tap-this` to generate a Task Assignment Prompt (tap) to cover this issue.

## Issue Creation Process
Interview me to gather the required information for creating a comprehensive GitHub issue. I favour multiple choice questions, asked one at a time.

## Required Information for a Good GitHub Issue

To create an effective GitHub issue, I need to gather:

1. **Issue Type** - Bug report, feature request, enhancement, documentation, etc.
2. **Clear Title** - Concise summary of the issue/request
3. **Problem Description** - What is the current situation or problem?
4. **Expected Behavior** - What should happen instead?
5. **Steps to Reproduce** - (For bugs) How to recreate the issue
6. **Acceptance Criteria** - What defines success/completion?
7. **Priority/Severity** - How urgent or important is this?
8. **Labels** - Appropriate GitHub labels for categorization
9. **Assignee** - Who should work on this (if known)
10. **Additional Context** - Screenshots, logs, related issues, etc.

## Process

After gathering the information through our interview:

1. Structure the issue content with proper markdown formatting
2. Create the GitHub issue using: `gh issue create --title "Issue Title" --body "Detailed description"`
3. Apply appropriate labels using: `gh issue edit {issue_number} --add-label "label1,label2"`
4. Assign if specified using: `gh issue edit {issue_number} --add-assignee "username"`

Let's begin the interview to gather the necessary information for your GitHub issue.