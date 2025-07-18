# Technical Architecture

## Initialization
- Auto-detects tables with `.gram-frame`
- Replaces each with canvas-based component

## Structure
- Main JS class manages:
  - Image loading
  - Mouse event tracking
  - Harmonic calculation
  - Mode switching

## State Management
- Internal state updated on every interaction
- Broadcast to registered listeners

## Public API
- `addStateListener(fn)`
- `removeStateListener(fn)`
- `toggleCanvasBoundsOverlay()`
- `setDebugGrid(true/false)`
- `switchMode(mode)`
- `setRate(value)`
- `forceUpdate()`
