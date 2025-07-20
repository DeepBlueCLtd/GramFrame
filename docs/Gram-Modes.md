# Gram Component Interaction Modes

This document describes the two interaction modes of the spectrogram-based analysis tool: **Analysis** and **Doppler**. Each section includes a business overview, UI behaviour, and a detailed interaction walkthrough.

---

## 🔍 Analysis Mode

### Purpose
Measure precise frequency (X) and time (Y) positions by hovering over the spectrogram image, and reveal harmonic relationships by dragging to set a base frequency.

### Business Context
Used by analysts or trainees to identify and examine features such as tonal events, broadband pulses, or ambient shifts in sonar data. Also used to determine if high-frequency tonals share a common origin, such as a propeller shaft or mechanical source, by testing for integer multiple relationships.

### Features
- **Cross-hairs**: A pair of vertical and horizontal lines follow the mouse during hover.
- **X = Frequency**, **Y = Time**
- **Hover interaction**: Shows cross-hairs with precise frequency and time values.
- **Drag interaction**: Reveals harmonic relationships based on the dragged frequency.
- **LED-style panel**: Displays live frequency and time values.
- **Harmonic lines**: Vertical lines at integer multiples of base frequency (during drag).

### Interaction Walkthrough - Hover (Basic Analysis)

**1. Initial State**
- Mode set to **Analysis**
- Spectrogram visible
- No overlays shown initially

**2. User Interaction**
- Mouse moves over a tonal feature

**3. Expected UI Response**
- Cross-hairs follow cursor
- Panel displays:
  - `Freq: 734.2 Hz`
  - `Time: 5.84 s`

**4. Visible Screen Elements**
- Cross-hairs (vertical and horizontal lines)
- LED-style panel with real-time readout
- Mode label: "Analysis"

### Interaction Walkthrough - Drag (Harmonics Analysis)

**1. Initial State**
- Mode set to **Analysis**
- Spectrogram visible

**2. User Interaction**
- User presses mouse button and drags across spectrogram

**3. Expected UI Response**
- Harmonic lines appear dynamically based on mouse X-position (frequency)
- Vertical lines shown at 1×, 2×, 3×... of base frequency
- Labels displayed:
  - Left of line: Harmonic number (e.g., "2×")
  - Right of line: Frequency (e.g., "440 Hz")
- Main line (1×) drawn with distinct styling (dark + light shadow)

**4. Visible Screen Elements**
- Vertical harmonic lines at integer multiples
- LED-style panel showing base frequency
- Mode label: "Analysis"

---

## 🛰️ Doppler Mode

### Purpose
Estimate emitter/receiver speed by defining frequency shift over time.

### Business Context
Used during tactical or post-mission analysis to derive platform speeds from tonal slopes on a spectrogram.

### Features
- **Click 1**: Set start point (time + frequency)
- **Click 2**: Set end point
- **Sloped line** drawn between the two
- **Calculation**:
  - ΔTime
  - ΔFrequency
  - Derived speed (e.g., knots or m/s)
- **State**: Persistent until replaced by a new click

### Interaction Walkthrough

**1. Initial State**
- Mode set to **Doppler**
- Spectrogram visible

**2. User Interaction**
- Click at `3.00s`, `820 Hz`
- Click at `6.00s`, `580 Hz`

**3. Expected UI Response**
- Line appears between points
- Readouts:
  - `ΔT: 3.00 s`
  - `ΔF: -240 Hz`
  - `Speed: 14.2 knots`

**4. Visible Screen Elements**
- Sloped line connecting two points
- LED-style panel with deltas and speed
- Markers at each end (optional)
- “Reset” or “Clear” button (optional)
- Mode label: “Doppler”

---

## 🧩 Shared UI Tasks

- [ ] Implement visual mode switcher with active mode indicator
- [ ] Ensure consistent styling for overlays and readouts
- [ ] Mode-specific overlays should not interfere with others
- [ ] Measurement panel format: LED-style, persistent across modes
- [ ] Implement hover vs. drag detection for Analysis mode to switch between basic analysis and harmonics analysis
