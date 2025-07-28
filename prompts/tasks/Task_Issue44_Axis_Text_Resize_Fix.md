# APM Task Assignment: Fix Axis Text Labels Resize Issue

## 1. Agent Role & APM Context

You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project. Your role is to execute the assigned task diligently, implement the required changes with precision, and log your work meticulously in the Memory Bank.

## 2. Task Assignment

**Reference:** This assignment addresses GitHub Issue #44: "axis text labels should not resize with image resize"

**Objective:** Fix the axis text label scaling behavior so that text labels maintain consistent font size when the gram image is resized, preventing them from becoming invisible during page resizing.

**Detailed Action Steps:**

1. **Analyze Current Implementation:**
   - Examine the current axis label rendering code in `src/main.js` 
   - Identify where axis labels are created and styled
   - Understand how the current scaling/resizing logic affects text elements
   - Look for existing coordinate transformation functions in `src/utils/`

2. **Implement Font Size Fix:**
   - Modify the axis label text elements to use fixed font sizes that don't scale with image resize
   - Ensure text remains readable at all zoom levels
   - Consider adjusting axis label intervals dynamically if needed to prevent overcrowding at smaller sizes
   - Maintain the existing axis margins (left: 60px, bottom: 50px as noted in CLAUDE.md)

3. **Test the Fix:**
   - Verify axis labels remain visible and readable during page resize operations
   - Test across different screen sizes and zoom levels
   - Ensure the fix works for both time and frequency axis labels
   - Validate that other components (cursors, overlays) continue to scale properly

4. **Code Quality:**
   - Follow existing code conventions and patterns in the codebase
   - Ensure changes integrate seamlessly with the SVG-based rendering system
   - Maintain compatibility with the responsive design using ResizeObserver

## 3. Expected Output & Deliverables

**Define Success:** 
- Axis text labels maintain consistent, readable font size during image resize operations
- Labels do not become invisible when the gram image shrinks
- Overall component functionality remains intact

**Specify Deliverables:**
- Modified code files (likely `src/main.js` and potentially files in `src/utils/`)
- Verification that `yarn typecheck` passes without errors
- Testing confirmation that the issue is resolved

## 4. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's `Memory_Bank.md` file.

Adhere strictly to the established logging format. Ensure your log includes:
- A reference to GitHub Issue #44 and this task assignment
- A clear description of the changes made to fix the axis text scaling
- Code snippets showing the key modifications
- Any technical decisions made regarding font sizing or label interval adjustments
- Confirmation of successful testing and typecheck validation

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. Pay particular attention to understanding the current scaling mechanism and how text elements should behave differently from other SVG components.