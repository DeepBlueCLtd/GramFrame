# Spectrogram Interaction Component

This component provides an interactive overlay for sonar spectrogram images, enabling users to place harmonic cursors, adjust scaling via a rate input, and switch between multiple analysis modes.

## Key Features

- Modes: Analysis, Harmonics, Doppler
- Harmonic line overlays with frequency labels
- Retro-style LED readouts for measurement
- Drag-to-place cursor system with unlimited cursors
- Embedded via HTML config tables
- Fully self-contained JavaScript (no build step)
- Developer diagnostics mode available via standalone page

## Target Audience

Trainees or students using sonar training manuals in HTML format.

## Usage

Include the JavaScript file via `<script>`, and place a config table with the appropriate class on your HTML page. The component will auto-initialize after page load.
