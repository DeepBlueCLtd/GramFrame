# APM Task Assignment: Enhance Frequency Axis with Denser Markers and Labels

## 1. Agent Role & APM Context

You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame interactive spectrogram analysis project. Your role is to execute assigned tasks diligently and log work meticulously. You will interact with the Manager Agent (via the User) and contribute to the project's Memory Bank upon completion.

## 2. Task Assignment

**Reference Implementation Plan:** This assignment addresses GitHub Issue #63 from the upstream repository, which requests more dense frequency markers and labels on the x-axis.

**Objective:** Enhance the frequency axis (x-axis) rendering to provide more granular frequency markers and labels, improving the usability of the spectrogram analysis tool.

**Current State Analysis:**
The frequency axis is currently rendered in `src/components/table.js` in the `renderFrequencyAxis` function (lines 389-434). The current implementation:
- Uses a fixed `tickCount = 5` which provides only 5 evenly spaced frequency labels
- Labels show rounded frequency values with "Hz" suffix (e.g., "250Hz")
- The issue requests labels every 5Hz with ticks at 2.5Hz intervals, with 5Hz labels being slightly smaller

**Detailed Action Steps:**

1. **Analyze Current Frequency Range and Scale Requirements:**
   - Examine how the current frequency range (freqMin to freqMax) maps to the display
   - Calculate appropriate intervals based on the frequency span to determine when to use 5Hz intervals vs other intervals
   - Consider the rate parameter that affects frequency scaling (`displayFreqMin = freqMin / rate`)

2. **Implement Intelligent Tick Spacing Algorithm:**
   - Replace the fixed `tickCount = 5` approach with a dynamic spacing algorithm
   - For initial scale, implement 5Hz major tick intervals with labels
   - Add 2.5Hz minor tick intervals (ticks only, no labels)
   - Ensure the algorithm adapts to different frequency ranges gracefully
   - Consider edge cases where 5Hz intervals might be too dense or sparse

3. **Enhance Visual Hierarchy:**
   - Implement different tick sizes: major ticks (5Hz) should be longer than minor ticks (2.5Hz)
   - Make 5Hz labels slightly smaller than the current labels as requested
   - Maintain proper spacing and readability
   - Use CSS classes to differentiate between major and minor elements

4. **Update Styling:**
   - Add new CSS classes for minor ticks and smaller labels in `src/gramframe.css`
   - Ensure visual consistency with existing axis styling
   - Test that the enhanced axis remains readable at different scales

5. **Handle Dynamic Frequency Ranges:**
   - Ensure the algorithm works for various frequency ranges (e.g., 200-400Hz, 0-1000Hz, etc.)
   - Implement appropriate fallback behavior for very small or very large frequency ranges
   - Maintain performance with increased number of ticks and labels

6. **Test and Validate:**
   - Test with the existing sample spectrograms in the project
   - Verify that rate parameter still affects frequency scaling correctly
   - Ensure no visual overlap or crowding of labels
   - Confirm that the enhancement works across different browser environments

**Provide Necessary Context/Assets:**

**Key Files to Modify:**
- `src/components/table.js` - Primary implementation in `renderFrequencyAxis` function
- `src/gramframe.css` - Add styling for new tick/label classes

**Current Implementation Reference:**
The `renderFrequencyAxis` function (lines 389-434 in `src/components/table.js`) currently:
- Creates 5 evenly spaced ticks and labels
- Uses `Math.round(freq) + 'Hz'` for label formatting
- Applies rate scaling with `displayFreqMin = freqMin / rate`

**Testing Resources:**
- Use `debug.html` for development testing
- Sample configurations are available in the project
- Run `yarn dev` for hot reload during development

## 3. Expected Output & Deliverables

**Define Success:** 
- Frequency axis displays more granular markers with 5Hz label intervals and 2.5Hz tick intervals at initial scale
- 5Hz labels are slightly smaller than current labels
- Algorithm adapts appropriately to different frequency ranges
- Visual hierarchy is clear between major (5Hz) and minor (2.5Hz) ticks
- No performance degradation or visual crowding

**Specify Deliverables:**
- Modified `src/components/table.js` with enhanced `renderFrequencyAxis` function
- Updated `src/gramframe.css` with new styling classes for tick/label hierarchy
- Preserved functionality of rate parameter affecting frequency calculations
- Maintained compatibility with existing spectrogram configurations

**Format:** 
- Code should follow existing project conventions and patterns
- Maintain existing JSDoc commenting style
- Preserve hot module reload compatibility

## 4. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file. Adhere strictly to the established logging format detailed in [Memory_Bank_Log_Format.md](../02_Utility_Prompts_And_Format_Definitions/Memory_Bank_Log_Format.md). Ensure your log includes:

- A reference to GitHub Issue #63 and this task assignment
- Clear description of the frequency axis enhancement algorithm implemented
- Code snippets showing the key changes to tick spacing and visual hierarchy
- Any challenges encountered with dynamic frequency range handling
- Confirmation of successful testing with various frequency ranges and rate parameters
- Documentation of any new CSS classes or styling changes made

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. Key areas where clarification might be needed:
- Specific frequency ranges to optimize for
- Exact visual specifications for "slightly smaller" labels
- Performance considerations for maximum number of ticks to display
- Fallback behavior for edge cases in frequency ranges