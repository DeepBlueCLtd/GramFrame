# Zoom Support Requirements and Implications (Updated)

## ✅ Zoom Requirements Summary

### Zoom Behavior
- **Zoom Axis**: Both **frequency (horizontal)** and **time (vertical)** axes are zoomed **together**.
- **Zoom Trigger**:
  - **Double-click** — zooms in on the clicked location (e.g., 2× magnification), centered on cursor
- **Zoom Reset**: A **Reset Zoom** button in the UI resets the view to the full spectrogram.

### Navigation While Zoomed
- **Panning method**: Use **right-click + drag** to pan within the zoomed view.
- **Arrow keys** remain a possible fallback, but are not primary.
- **Click-and-drag panning** is not used with the left button due to conflicts in Harmonics and Doppler modes.

### Axis and Cursor Display
- **Axes and tick labels** update dynamically to match the current zoom level.
- **Cursor readout** (frequency and time under mouse) reflects the **zoomed-in coordinate range**.

### Mode Integration
- **Zoom is supported in all modes**: Analysis, Harmonics, and Doppler.
- **Zoom level is preserved** when switching between modes — no automatic reset on mode change.

---

## 🔍 Implementation Implications

### Coordinate Mapping
- All interactive elements (e.g. cursors, harmonics, Doppler lines) must compute positions using `zoomMin/Max` values instead of the original global `min/max`.

```js
let frequency = zoomFreqMin + (mouseX / width) * (zoomFreqMax - zoomFreqMin)
let time = zoomTimeMax - (mouseY / height) * (zoomTimeMax - zoomTimeMin)
```

### UI Overlays
- Harmonic lines, Doppler curves, cursors, etc., must respect the zoomed coordinate system.
- Axes and tick rendering logic should recompute intervals and labels based on the new visible range.

### State Management
- Introduce a `zoomState` object to track current zoom range:
```js
zoomState = {
  freqMin: originalFreqMin,
  freqMax: originalFreqMax,
  timeMin: originalTimeMin,
  timeMax: originalTimeMax
}
```

### Mouse & Keyboard Handling
- **Right-click + drag** pans the image — must suppress default context menu.
- **Double-click** zooms in by fixed factor.
- **Reset Zoom** is triggered by a UI button.
- Optional: Support `Esc` or `R` to reset zoom via keyboard.

### Performance
- SVG overlays and image rendering may need to be re-drawn on zoom or pan events.
- Ensure transformations do not degrade interactivity, especially on touch or low-power devices.

---

## ✅ Next Steps (Optional)
- Define zoom scaling factors and min/max constraints.
- Consider animated transitions when zooming or panning.
- Mock up UI layout with Reset Zoom button and zoom indicators.
