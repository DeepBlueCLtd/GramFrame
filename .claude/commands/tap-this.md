# Create Task Assignment Prompt

## Task Assignment Prompt Creation
Read the guide at prompts/01_Manager_Agent_Core_Guides/03_Task_Assignment_Prompts_Guide.md and use it to create a task assignment prompt (tap) for GitHub issue #{issue_number} from the upstream repository for this project. 

Analyze the GitHub issue to understand the requirements, scope, and technical details.  Ask for clarification questions if necessary.

Once you have completed the analysis (and before the Task Assignment Prompt is created), create a new branch for this GitHub issue:
1. Create and switch to new branch: `git checkout -b issue-{issue_number}-{issue_title}`
2. Verify you're on the correct branch: `git branch --show-current`

Then generate a structured task assignment prompt following the guide's template and save it to prompts/tasks/Task_Issue_{issue_number}.md.

The prompt should be ready for a Manager Agent to assign to an Implementation Agent within the APM framework.

## Completion
Once the task assignment prompt is created and saved, send a notification with the prompt location and brief summary of the GitHub issue for tracking purposes.