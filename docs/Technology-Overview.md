# GramFrame Technology Overview

**Last updated**: 2026-03-27

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Language | JavaScript (ES2020+) with JSDoc type annotations |
| Type checking | TypeScript compiler in check-only mode (no compilation) |
| Rendering | SVG |
| Build tool | Vite 5 |
| Testing | Playwright (end-to-end) |
| Package manager | Yarn 1.22+ |
| Runtime dependencies | None |

GramFrame has **zero runtime dependencies**. The entire component is self-contained vanilla JavaScript. All dev dependencies (Vite, Playwright, TypeScript, Husky) are build-time or test-time only.

## Architecture

### Component Lifecycle

1. Page loads and includes GramFrame via a `<script>` tag
2. On `DOMContentLoaded`, the library scans the DOM for `<table class="gram-config">` elements
3. Each table is parsed to extract the spectrogram image URL and axis parameters (time range, frequency range)
4. The table is replaced with an interactive SVG overlay containing the spectrogram image, axes, cursors, and measurement UI
5. Each instance receives its own isolated state and event handlers

### SVG-Based Rendering

All overlays (crosshairs, harmonic lines, Doppler curves, markers, axes) are rendered as SVG elements layered over the spectrogram image. SVG was chosen over Canvas for several reasons:

- Precise positioning using a coordinate system that maps directly to data values
- Native support for text labels, styling, and interaction events on individual elements
- Resolution-independent rendering that scales cleanly on high-DPI displays
- DOM-based structure that simplifies debugging via browser dev tools

### Coordinate Systems

GramFrame manages four coordinate spaces and transforms between them:

1. **Screen coordinates** -- mouse position relative to the browser viewport
2. **SVG coordinates** -- position within the SVG viewBox
3. **Image coordinates** -- pixel position on the spectrogram image
4. **Data coordinates** -- calibrated time (seconds) and frequency (Hz) values

All user-facing measurements are displayed in data coordinates. The coordinate pipeline handles arbitrary axis ranges, container resizing, and zoom/pan transformations.

### State Management

Each GramFrame instance maintains a centralised state object (`GramFrameState`) that holds:

- Current mode (Analysis, Harmonics, Doppler, Pan)
- Cursor position across all coordinate systems
- Mode-specific data (markers, harmonic sets, Doppler curve parameters)
- Configuration parameters (axis ranges, margins, zoom level)
- UI state (selected colour, rate divisor, selection)

State changes propagate via a listener pattern. External code can subscribe to state updates and receive deep-copied snapshots, preventing accidental mutation. This pattern also supports Hot Module Reload during development -- state listeners survive code changes.

### Mode System

The interaction model is built around a modular mode system:

```
BaseMode (abstract)
  ├── AnalysisMode   -- frequency/time measurement, harmonic drag
  ├── HarmonicsMode  -- persistent harmonic overlay creation
  ├── DopplerMode    -- Doppler curve fitting, speed calculation
  └── PanMode        -- zoom and pan navigation
```

Each mode extends `BaseMode` and implements a standard lifecycle:

- `activate()` / `deactivate()` -- called on mode switch
- `handleMouseMove()`, `handleMouseDown()`, `handleMouseUp()` -- input events
- `renderCursor()` -- transient visual feedback (e.g. crosshairs)
- `renderPersistentFeatures()` -- durable overlays (e.g. placed markers)
- `updateLEDs()` -- refresh the measurement readout panel

A `ModeFactory` handles instantiation and error containment. The `FeatureRenderer` coordinates cross-mode concerns, such as ensuring Analysis markers remain visible when the user switches to Harmonics mode.

### Configuration via HTML Tables

GramFrame requires no build step or JavaScript configuration. A standard HTML table defines each instance:

```html
<table class="gram-config">
  <tr><td colspan="2"><img src="spectrogram.png"></td></tr>
  <tr><td>time-start</td><td>0</td></tr>
  <tr><td>time-end</td><td>60</td></tr>
  <tr><td>freq-start</td><td>0</td></tr>
  <tr><td>freq-end</td><td>20000</td></tr>
</table>
```

This design means training material authors can add interactive spectrograms using only HTML. The configuration parser extracts the image source, axis parameters, and any optional settings from the table rows.

### Responsive Design

A `ResizeObserver` watches each GramFrame container and triggers re-layout when dimensions change. Axes, margins, and overlays are recalculated to maintain correct positioning. The SVG viewBox is updated to reflect the new container size while preserving data-coordinate accuracy.

### Browser Storage

GramFrame can persist annotations (markers, harmonic sets, Doppler curves) to `localStorage` or `sessionStorage`. Each instance is keyed by its configuration, so multiple spectrograms on the same page maintain independent storage. Context detection distinguishes trainer and student modes.

## Build and Distribution

### Standard Build

`yarn build` produces an ES module suitable for inclusion via modern bundlers or `<script type="module">`. Vite handles bundling, CSS extraction, and asset processing. The production build is **intentionally unminified** to support field debugging in environments where source maps may not be available.

### Standalone Bundle

`yarn build:standalone` produces a single IIFE file (`gramframe.bundle.js`) with CSS inlined. This bundle works over the `file://` protocol without a web server, which is essential for offline or air-gapped deployment scenarios. A single `<script>` tag is all that is needed.

### Development Server

`yarn dev` starts a Vite dev server with Hot Module Reload. Code changes trigger automatic browser refresh while preserving component state (markers, mode, zoom level). Debug pages (`debug.html`, `debug-trainer.html`) provide live state inspection.

## Testing

### End-to-End Tests

All tests use Playwright running against Chromium. The test suite covers:

- Mode switching and interaction workflows
- Marker placement, dragging, and deletion
- Harmonic overlay creation and persistence
- Doppler curve fitting and speed calculation
- Zoom and pan behaviour
- Multi-instance independence
- Keyboard navigation and accessibility

### Test Infrastructure

A `GramFramePage` helper class provides reusable utilities for navigating to pages, selecting modes, performing interactions, and asserting state. Tests run in parallel (2 workers by default) and support both headless and UI modes for debugging.

### Type Checking

`yarn typecheck` runs the TypeScript compiler over JSDoc-annotated JavaScript source files. This provides static type safety without requiring TypeScript compilation or a separate type definition file. Type definitions live in `src/types.js` as JSDoc `@typedef` declarations.

## Key Design Decisions

Architectural decisions are documented as ADRs in `docs/ADRs/`. The most significant include:

| Decision | Rationale |
|----------|-----------|
| SVG over Canvas | Precise positioning, native text/event support, DOM debuggability |
| Centralised state | Single source of truth simplifies cross-mode coordination |
| HTML table configuration | Zero build step; accessible to non-developers authoring training materials |
| JSDoc + TypeScript checking | Type safety without a compilation step; source code is what ships |
| Unminified production build | Readable code in field environments where debugging tools are limited |
| File protocol compatibility | Supports offline, air-gapped deployment via standalone IIFE bundle |
| Viewport-based zoom | Clean scaling without image quality degradation from SVG transforms |
