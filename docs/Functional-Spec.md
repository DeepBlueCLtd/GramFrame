# Functional Specification

## Modes
- **Analysis:** Shows frequency at cursor
- **Harmonics:** Adds harmonic lines above cursor base frequency
- **Doppler:** Alternate rendering mode (details TBD)

## Interaction
- Drag to place harmonic cursors (unlimited)
- Toggle between modes via buttons
- Input box for 'rate' divisor (e.g., shaft rate)

## Display
- Green LED-style readouts
- Harmonic lines: bold main line + lighter harmonics
- Top-left label = multiplier (e.g., 2x), top-right = frequency (Hz)

## Configuration
- Defined by `<table class="gram-frame">`
- Hidden on activation
- Includes:
  - Top row: spectrogram image
  - Headers: `param`, `min`, `max`
