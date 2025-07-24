# Task Assignment Prompt: Persistent Markers in Analysis Mode

## Purpose
Implement persistent markers functionality in `Analysis` mode, as described in [Issue #30](https://github.com/DeepBlueCLtd/GramFrame/issues/30). This feature will allow users to leave crosshair markers on the spectrogram by clicking, with each marker shown in a rotating color and displayed in a new markers table in the readout panel.

## Background & Context
- Current `Analysis` mode only shows a temporary cursor on hover.
- There is no persistent marker or marker history for user reference.
- The `Harmonics` mode already uses a set of colored lines; use a similar color scheme for marker rotation.

## Requirements
1. **Marker Placement:**
   - In `Analysis` mode, clicking on the spectrogram should add a persistent marker (crosshair, ~20x20px) at the clicked location.
   - Each marker uses a different color as selected by the user in the color picker (re-use the picker from the one in `Harmonics` mode)
   - Markers persist until the user leaves the page or resets them via right-click, or clicking the delete button in the markers table.

2. **Marker Display:**
   - Each marker is rendered as a crosshair overlay on the spectrogram.
   - All active markers remain visible; new clicks add new markers.

3. **Markers Table in Readout Panel:**
   - Add a `markers` table to the readout panel below the spectrogram.
   - Table columns: marker color (as a swatch), time, and frequency for each marker, with a delete button.
   - Table updates live as markers are added.

4. **Color Rotation:**
   - Use a set of visually distinct colors for markers, rotating through them as new markers are added.
   - Ensure colors are accessible and visible on the spectrogram background.

## Implementation Guidance
- Follow existing code style and UI patterns (see `UIComponents.js` and related files).
- Reuse utility functions and color palettes where possible.
- Log state changes and marker additions for debugging.
- Ensure that marker rendering and table updates are performant, even with multiple markers.

## Acceptance Criteria
- Clicking on the spectrogram while in `Analysis` mode reliably adds a persistent marker at the clicked location, shown as a crosshair in a rotating color.
- The readout panel displays a table of all markers, showing color, time, and frequency.
- Markers persist while the user remains on the page.
- No regression of existing functionality in `Analysis` mode or other modes.

## References
- [Issue #30: Persistent markers in `Analysis` mode](https://github.com/DeepBlueCLtd/GramFrame/issues/30)
- [UIComponents.js](/src/components/UIComponents.js) for UI patterns
- [Harmonics mode implementation] for color palette inspiration

## Logging Instructions
- Log each marker addition with its color, time, and frequency to the console for debugging.
- Log any errors or edge cases encountered during marker placement or table updates.
