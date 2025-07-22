# Doppler Curve-Based Speed Estimation Tool

## Feature Overview

- **Feature Name**: Doppler Speed Estimation via Curve Interaction
- **Purpose**: Allow users to estimate the relative speed of a target by visually fitting a Doppler-shifted frequency curve on a spectrogram.
- **Activation**: This feature is only active when the display panel is in **`Doppler` mode**.

---

## User Workflow

1. **User enters `Doppler` mode** (via mode selector).
2. **User drags cursor to create diagonal line, representing f+ to f-**
3. **Smooth S-Shaped line drawn between f+ and f-, extending vertically out at either end**
4. **A cross-hair appears at the **midpoint in time** between `f−` and `f+`:
   - Initially represents the inflexion point (`f₀`)
   - User drags this cross-hair to match the curve to the Doppler trace
5. **f0 crosshair shown at mid point of line (in frequency and time values)**
6. **When cursor goes over f+, f- or f0 markers, pointer switches to `grab`**
7. **When any marker is dragged, calculate and display estimated speed**
7. The **user may drag `f+` or `f−` markers** to re-fit the curve as needed:
   - Curve is re-bent and `f₀` midpoint time is updated
   - Speed is recalculated accordingly
8. At any time, the user can **reset the markers** or **switch out of Doppler mode**.

---

## UI Components

- **Spectrogram Image** (background)
- **Markers**:
  - `f-` (start): blue dot
  - `f+` (end): red dot
  - `f₀` (inflexion): green cross-hair (draggable)
- **Doppler Curve**:
  - Smooth red S-curve interpolating `f-` to `f+`
  - Adjusts dynamically when any marker is moved
- **Vertical Lines**:
  - Extend from `f+` and `f-` to the top and bottom of the panel (respectively)
  - Help visually anchor the engagement period
- **Speed Readout Box**:
  - Displays computed speed in m/s
  - Updates live during drag operations

---

## Coordinate System

- **Y-axis**: Time (in seconds), increasing bottom to top
- **X-axis**: Frequency (Hz or kHz), increasing left to right

---

## Mathematical Model

Let:
- `f+` = frequency at end of engagement
- `f−` = frequency at start
- `f₀` = frequency at inflexion (cross-hair position)
- `c` = speed of sound in water (default: 1500 m/s)

Computed values:
```
Δf = (f+ - f−) / 2
v = (c / f₀) × Δf
```

---

## Data Model

```ts
type DopplerPoint = {
  time: number;       // in seconds
  frequency: number;  // in Hz
};

type DopplerFit = {
  fPlus: DopplerPoint;
  fMinus: DopplerPoint;
  fZero: DopplerPoint;
  speed: number;      // in m/s
};
```

---

## Events and Interactions

| Event         | Description |
|---------------|-------------|
| `click`       | Place `f+`, then `f−` |
| `drag(f+)`    | Update curve endpoint and recalculate |
| `drag(f−)`    | Update curve start point and recalculate |
| `drag(f₀)`    | Move inflexion point to match Doppler trace |
| `reset`       | Clear all points and overlays |
| `mode change` | Exit `Doppler` mode disables tool and clears markers |

---

## Implementation Notes

- Render overlay using Canvas or SVG
- All marker positions map directly to the spectrogram image space
- Vertical guide lines should extend full panel height
- Doppler curve should update in real-time with minimal latency
