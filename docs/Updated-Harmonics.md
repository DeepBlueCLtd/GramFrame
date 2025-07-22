
# GramFrame Harmonic Overlay — Technical Specification

## 1. Overview

This document defines the behavior and design requirements for interactive harmonic overlays in the `GramFrame` spectrogram visualization component. Harmonic sets are used by analysts to identify and compare frequency-domain patterns in time-aligned acoustic data.

The design supports:
- Multiple simultaneous harmonic sets
- Persistent overlay after mouse release
- Real-time drag interaction to adjust both frequency spacing and vertical position (time)
- Display of each set’s properties in a summary panel
- Reduced visual clutter via partial-height overlays

---

## 2. Coordinate System

- **X-axis**: Frequency in Hz (increasing left to right)
- **Y-axis**: Time in seconds or milliseconds (increasing top to bottom)
- **Origin**: May be non-zero on the frequency axis (e.g. 200–400 Hz)
- Harmonics are displayed as vertical lines at regular frequency intervals
- Harmonic overlays occupy only a fraction (typically 20%) of the spectrogram’s vertical extent

---

## 3. Harmonic Set Data Model

Each harmonic set is defined by:

```ts
HarmonicSet {
  id: string               // Unique identifier
  color: string            // Display color for lines
  anchorTime: number       // Time position (Y-axis) in seconds/ms
  spacing: number          // Frequency spacing (Hz)
}
```

Derived display properties:
- Line positions: `x = spacing * n` where `n` is constrained to the set of harmonics that will fit on the current image.
- Line vertical placement: centered on `anchorTime`, limited to 20% of full SVG height

---

## 4. Interaction Model

### 4.1 Add New Harmonic Set

- Triggered via clicking on the gram whilst in `Analysis` mode.
- Mouse cursor starts at a position representing the 10th harmonic if the frequency axis origin > 0, else 5th harmonic.
- Initial spacing is inferred from cursor position
- Color is auto-assigned from a rotating palette

### 4.2 Drag-to-Adjust

- Hovering over a harmonic line changes the cursor to a grab cursor.
- Clicking and dragging any harmonic line to adjust:
  - **Horizontally**: updates spacing
  - **Vertically**: updates anchor time
- No explicit mode switch — both properties update together during drag
- Drag logic ensures the clicked harmonic remains under the cursor

### 4.3 Delete Harmonic Set

- Each set is listed in a sidebar panel with a delete button
- Deletion immediately removes the set from the display and state model

---

## 5. Harmonic Listing Panel

This panel displays a summary of all active sets:

| Color | Spacing (Hz) | Rate |
|-------|--------------|------|
| 🔶    | 215.4        | 3.65 |
| 🟢    | 302.7        | 1.73 |

- **Spacing**: Interval between harmonics
- **Rate**: Calculated as `cursor frequency / spacing`
- Delete button shown to right of each harmonic set in the panel.

---

## 6. Suggested Implementation Sequence

1. **Implement Harmonic Set creation**
   - When in `Analysis` mode, clicking on the gram will create a new harmonic set.
   - The cursor will start at a position representing the 10th harmonic if the frequency axis origin > 0, else 5th harmonic.
   - Initial spacing is inferred from cursor position
   - Color is auto-assigned from a rotating palette
   - Harmonics set left on gram when mouse released.

2. **Implement Drag Logic**
   - Capture click on harmonic line
   - Compute new spacing and time on drag

3. **Support Multiple Sets**
   - Track harmonic sets in a collection
   - Assign distinct colors

4. **Add Side Panel**
   - Display list of harmonic sets with spacing/rate
   - Implement delete buttons

5. **Add Hover & Visual Feedback**
   - Highlight draggable harmonics on hover

6. **Clutter Management**
   - Restrict overlay height to 20%
   - Optionally fade inactive sets

---

## 7. Most Important Tests

### Functional
- ✅ Harmonics remain visible after creation
- ✅ Harmonic spacing updates live during horizontal drag
- ✅ Anchor time updates live during vertical drag
- ✅ Harmonic lines reposition consistently with spacing and time
- ✅ Harmonic set is removed upon delete button click

### Edge Cases
- ✅ Correct behavior when frequency axis origin > 0
- ✅ Correct spacing/rate calculation when clicking 10th harmonic
- ✅ No overlap artifacts when multiple sets are close together

### Visual
- ✅ Color coding is distinct and readable
- ✅ Lines update smoothly on drag
- ✅ Side panel accurately reflects spacing and rate

---

## 8. Notes

- Time resolution and frequency axis mapping should be decoupled from screen resolution
- Spacing and anchorTime should use physical units (Hz, seconds), not pixels
- All harmonic overlays must remain interactive and update dynamically

