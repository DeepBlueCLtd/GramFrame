# APM Task Assignment: JSDoc Retrofit for Type Safety

## 1. Agent Role & APM Context

* **Introduction:** "You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project."
* **Your Role:** As an Implementation Agent, your responsibility is to execute the assigned task diligently and log your work meticulously. For this task, you will be implementing type safety to the codebase using JSDoc annotations without changing runtime behavior.
* **Workflow:** You will interact with the Manager Agent (via the User) and document your progress in the Memory Bank. Your work will be reviewed and integrated into the project's development flow.

## 2. Task Assignment

* **Reference Implementation Plan:** This assignment corresponds to the JSDoc Retrofit plan outlined in `docs/jsDoc-Retrofit.md`.
* **Objective:** Add type safety to the GramFrame vanilla JavaScript codebase using JSDoc annotations and TypeScript's `checkJs` mode, without requiring transpilation or changing runtime behavior.
* **Detailed Action Steps:**
  1. **Set up TypeScript for type checking:**
     * Create a `tsconfig.json` file in the project root with the following configuration:
       ```json
       {
         "compilerOptions": {
           "checkJs": true,
           "allowJs": true,
           "noEmit": true,
           "strict": true
         },
         "include": ["src/**/*.js"]
       }
       ```
     * Verify the setup by running `tsc --noEmit` to check for existing type errors without generating output files.

  2. **Create a shared types file:**
     * Create `src/types.js` to define custom types that will be used across the application.
     * Document common data structures using JSDoc `@typedef` annotations.
     * Ensure types are well-documented with descriptive comments.

  3. **Begin annotating top-level modules:**
     * Start with core utility files that are used throughout the application.
     * Add JSDoc annotations for function parameters, return types, and object structures.
     * Use the `/// <reference path="./types.js" />` syntax to import shared types.
     * Test type checking after each file is annotated to ensure no regressions.

  4. **Implement editor support verification:**
     * Verify that VS Code or similar editors correctly show type information on hover.
     * Document any areas where type inference is not working as expected.
     * Use `@ts-ignore` comments sparingly and only where absolutely necessary during the transition.

## 3. Expected Output & Deliverables

* **Define Success:** The task will be considered successful when:
  * The `tsconfig.json` file is properly configured
  * The shared `types.js` file is created with appropriate type definitions
  * `main.js` has been fully annotated with JSDoc comments
  * Type checking passes with `tsc --noEmit` without errors (or with documented `@ts-ignore` comments)
  * The application continues to function exactly as before

* **Specific Deliverables:**
  1. A properly configured `tsconfig.json` file
  2. A well-structured `src/types.js` file with common type definitions
  3. 'main.js' fully annotated with jsDoc type information
  4. A brief report on the current state of type checking and any challenges encountered

## 4. Memory Bank Logging Instructions

* **Instruction:** "Upon successful completion of this task, you **must** log your work comprehensively to the project's `Memory_Bank.md` file."
* **Format Adherence:** "Ensure your log includes:
  * A reference to the JSDoc Retrofit task
  * A clear description of the files created and modified
  * Code snippets of key type definitions and annotations
  * Any challenges encountered during implementation
  * Confirmation that the application continues to function as expected
  * Recommendations for the next steps in the JSDoc retrofit process"

## 5. Clarification Instruction

* **Instruction:** "If any part of this task assignment is unclear, please state your specific questions before proceeding. In particular, if you need more information about the existing codebase structure to properly implement the types, please ask for clarification."
