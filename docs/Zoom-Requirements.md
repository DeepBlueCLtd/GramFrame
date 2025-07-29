# Zoom Support Requirements and Implications

## ✅ Zoom Requirements Summary

### Zoom Behavior
- **Zoom Axis**: Both **frequency (horizontal)** and **time (vertical)** axes are zoomed **together**.
- **Zoom Trigger**:
  - **Mouse wheel** — zooms in/out centered on the mouse cursor
  - **Double-click** — zooms in on the clicked location (e.g., 2× magnification)
- **Zoom Reset**: A **Reset Zoom** button in the UI resets the view to the full spectrogram.

### Navigation While Zoomed
- **Panning method**: Use **arrow keys** or **WASD** keys to pan within the zoomed view.
- **Click-and-drag panning** is **not available**, due to its existing use in Harmonics and Doppler modes.

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