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
- Defined by `<table class="gram-config">`
- Hidden on activation
- Uses 2-column format: `parameter | value`
- Includes:
  - Top row: spectrogram image
  - Parameters: `time-start`, `time-end`, `freq-start`, `freq-end`
