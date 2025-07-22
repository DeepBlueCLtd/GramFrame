# Task: Reduce Harmonics Line Width

## 1. Overview

The current method for displaying harmonic lines uses a 3-pixel wide composite line (a colored line with a white shadow) to ensure visibility against varied backgrounds. This width is too thick and can lead to inaccuracies when reading precise frequency values from the spectrogram.

This task is to replace the current implementation with a new strategy that renders a visually clear, 1-pixel wide line for each harmonic.

## 2. The Goal

- The harmonic lines must be rendered as 1-pixel wide.
- The lines must remain clearly visible against both light and dark portions of the spectrogram image.
- The proposed solution is to use a dashed line that alternates between the harmonic set's specific color and white.

## 3. Technical Pointers

- The relevant code for drawing harmonic lines is located in `src/rendering/cursors.js` within the `drawHarmonicSetLines` function.
- Currently, this function draws two lines for each harmonic: a white `shadowLine` (3px) and a colored `mainLine` (2px). You will need to replace these two SVG elements with a single SVG `line` element.
- To create the dashed line effect, you can use the `stroke-dasharray` SVG attribute. This attribute takes a list of comma or space-separated lengths that specify the lengths of dashes and gaps. For example, `stroke-dasharray="5, 5"` creates a line with 5px dashes followed by 5px gaps.
- You will need to implement a two-color dash effect. Since SVG `stroke-dasharray` does not support alternating colors directly on a single line, the recommended approach is to draw **two** dashed lines in the same location:
    1. A white dashed line.
    2. A colored dashed line with an offset (`stroke-dashoffset`) that makes it appear in the gaps of the white line.
- Both lines should have a `stroke-width` of `1`.

## 4. Expected Output & Deliverables

- **Code Changes**: Modify `drawHarmonicSetLines` in `src/rendering/cursors.js` to implement the 1px dashed line rendering strategy.
- **Verification**: The `debug.html` page should be used to visually confirm that the new harmonic lines are rendered correctly and are clearly visible.
- **No New Tests**: No new Playwright tests are required for this task, but existing tests must continue to pass.
