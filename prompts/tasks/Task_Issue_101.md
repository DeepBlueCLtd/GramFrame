# APM Task Assignment: Issue #101 - SVG Feature Clipping Implementation

## 1. Task Assignment

**Reference Implementation Plan:** This assignment addresses GitHub Issue #101: "Mode-specific SVG features should not be rendered outside graph area" - a high-priority bug affecting visual integrity across all modes.

**Objective:** Implement proper SVG clipping for all mode-specific features to ensure they are contained within the graph area boundaries and do not extend into margin areas where axes and labels are located.

## 2. Technical Context & Current Issue

**Current Architecture:**
- SVG structure in `src/components/table.js:50-77` creates separate groups:
  - `imageClipRect` (line 60) with `clipPath` applied only to `spectrogramImage` (line 66)  
  - `cursorGroup` (line 70-72) where all mode-specific features render
  - `axesGroup` (line 74-77) for axis rendering
- **Problem:** `cursorGroup` has NO clipping applied, allowing features to render in margin areas

**Affected Components:**
- All modes: Analysis, Harmonics, Doppler, and Pan
- SVG rendering in `src/rendering/cursors.js` (drawDopplerPreview, drawPreviewMarker functions)
- Feature persistence system in `src/core/FeatureRenderer.js`
- Coordinate transformations in `src/utils/coordinates.js`

**Margin Configuration:** `src/core/state.js:61-66`
```javascript
margins: {
  left: 60,    // Space for time axis labels
  bottom: 50,  // Space for frequency axis labels  
  right: 15,   // Small right margin
  top: 15      // Small top margin
}
```

## 3. Detailed Implementation Actions

### Action 1: Extend SVG Clipping Infrastructure
**File:** `src/components/table.js:50-77`
- Create a second `clipPath` element with unique ID for cursor group features (similar to existing `imageClip` pattern on lines 55-58)
- Apply this new `clipPath` to the `cursorGroup` element using the same `clip-path` attribute pattern as the image (line 66)
- Ensure the clipping rectangle uses identical dimensions to `imageClipRect` (see `updateSVGLayout` function lines 175-179)

### Action 2: Synchronize Clipping Rectangle Updates  
**File:** `src/components/table.js:175-179` in `updateSVGLayout` function
- Extend the existing `imageClipRect` update logic to also update the new cursor group clipping rectangle
- Ensure both clipping rectangles maintain identical dimensions: `margins.left`, `margins.top`, `axesWidth`, and `axesHeight`

### Action 3: Validate Cross-Mode Feature Rendering
**Files:** `src/core/FeatureRenderer.js`, all mode files in `src/modes/*/`
- Test that persistent features (Analysis markers, Harmonics curves, Doppler curves) respect clipping boundaries
- Verify no regression in feature visibility during mode switches
- Confirm zoom/pan operations maintain proper clipping

### Action 4: Update Type Definitions
**File:** `src/types.js`
- Add the new cursor clipping rectangle property to the `GramFrameInstance` interface (similar to `imageClipRect` on line 330)

## 4. Expected Output & Deliverables

**Define Success:** 
- All SVG features are visually contained within the graph area defined by margin boundaries
- No visual elements appear in margin areas (left: 60px, bottom: 50px, right: 15px, top: 15px)
- Features maintain correct behavior during zoom/pan operations and mode switches

**Deliverables:**
1. Modified `src/components/table.js` with dual clipping path implementation
2. Updated `src/types.js` with new property definitions
3. Verification that all existing features across Analysis, Harmonics, Doppler, and Pan modes respect clipping boundaries
4. Confirmed functionality during zoom/pan operations

## 5. Memory Bank Logging Instructions (Mandatory)

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

Adhere strictly to the established logging format. Ensure your log includes:
- A reference to GitHub Issue #101 and the SVG clipping implementation
- Clear description of the dual clipping path approach implemented
- Code snippets showing the key SVG clipping infrastructure changes
- Any challenges encountered with coordinate systems or margin calculations
- Confirmation of successful execution across all modes with visual testing

## 6. Clarification Instruction

If any part of this task assignment is unclear, particularly regarding the SVG coordinate system, clipping implementation approach, or testing requirements across different modes, please state your specific questions before proceeding.