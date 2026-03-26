# Technical Architecture

**Last updated**: 2026-03-26

GramFrame is a JavaScript component for interactive spectrogram analysis. It transforms HTML configuration tables into interactive SVG-based overlays for sonar training materials.

## System Diagram

```
                         ┌──────────────────────────────────────────────┐
                         │              HTML Page                       │
                         │  ┌──────────────────────────────────┐       │
                         │  │   <table class="gram-config">    │       │
                         │  │     <img src="spectrogram.png">  │       │
                         │  │     time-start, time-end, ...    │       │
                         │  └──────────────┬───────────────────┘       │
                         └─────────────────┼───────────────────────────┘
                                           │ DOMContentLoaded
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │            GramFrameAPI (src/api/)            │
                    │  init() → detectAndReplaceConfigTables()      │
                    │  addStateListener() / removeStateListener()   │
                    └──────────────────────┬───────────────────────┘
                                           │ creates
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        GramFrame Instance (src/main.js)                     │
│                                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │    State     │  │    Events    │  │   Rendering  │  │ Configuration  │  │
│  │  (core/     │  │  (core/      │  │  (rendering/ │  │  (core/        │  │
│  │  state.js)  │  │  events.js)  │  │  cursors.js) │  │  configuration │  │
│  │             │  │              │  │              │  │  .js)          │  │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘  └───────┬────────┘  │
│         │                │                  │                   │           │
│         │          ┌─────┴──────┐     ┌─────┴──────┐           │           │
│         │          │ Coordinate │     │  Feature   │           │           │
│         │          │ Transforms │     │  Renderer  │           │           │
│         │          │ (utils/    │     │ (core/     │           │           │
│         │          │ coordinates│     │ Feature    │           │           │
│         │          │ .js)       │     │ Renderer   │           │           │
│         │          └────────────┘     │ .js)       │           │           │
│         │                            └─────┬──────┘           │           │
│         │                                  │                   │           │
│  ┌──────┴──────────────────────────────────┴───────────────────┘──────┐   │
│  │                     Mode System (src/modes/)                       │   │
│  │  ┌───────────────────────────────────────────────────────────┐    │   │
│  │  │                  BaseMode (BaseMode.js)                    │    │   │
│  │  │  activate() | deactivate() | handleMouseMove/Down/Up()     │    │   │
│  │  │  renderPersistentFeatures() | renderCursor() | updateLEDs()│    │   │
│  │  └───────────┬───────────┬──────────────┬──────────┬──────────┘    │   │
│  │              │           │              │          │               │   │
│  │    ┌─────────┴┐  ┌──────┴───┐  ┌───────┴──┐  ┌───┴──────┐       │   │
│  │    │ Analysis │  │Harmonics │  │ Doppler  │  │   Pan    │       │   │
│  │    │  Mode    │  │  Mode    │  │  Mode    │  │  Mode    │       │   │
│  │    └──────────┘  └──────────┘  └──────────┘  └──────────┘       │   │
│  │                                                                   │   │
│  │  ModeFactory.createMode(name, instance) → BaseMode subclass       │   │
│  └───────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Mode System

GramFrame uses a modular mode architecture where each interaction mode extends a common `BaseMode` class. See [ADR-008](ADRs/ADR-008-Modular-Mode-System.md) for the rationale.

### BaseMode Contract (`src/modes/BaseMode.js`)

Every mode must extend `BaseMode` and may override these lifecycle methods:

| Method | Purpose | Called When |
|--------|---------|-------------|
| `activate()` | Mode-specific initialization | Switching **to** this mode |
| `deactivate()` | Mode-specific teardown | Switching **away** from this mode |
| `cleanup()` | Clear transient state (drag flags, temp data) | Before `deactivate()` |
| `handleMouseMove(event, dataCoords)` | Process mouse movement | Mouse moves over SVG |
| `handleMouseDown(event, dataCoords)` | Process click/drag start | Mouse button pressed |
| `handleMouseUp(event, dataCoords)` | Process click/drag end | Mouse button released |
| `handleMouseLeave()` | Process cursor exit | Mouse leaves SVG area |
| `renderPersistentFeatures()` | Draw saved features (markers, curves) | Every render cycle |
| `renderCursor()` | Draw live cursor indicators | Every render cycle |
| `updateLEDs(coords)` | Update LED readout values | Cursor position changes |
| `getGuidanceText()` | Return help text for this mode | Mode activated |
| `getCommandButtons()` | Return mode-specific buttons | Mode UI setup |
| `isEnabled()` | Check if mode can be activated | Mode button rendering |
| `resetState()` | Clear mode-specific state | User reset action |
| `createUI(readoutPanel)` | Build mode-specific UI | Mode activated |
| `destroyUI()` | Remove mode-specific UI | Mode deactivated |
| `static getInitialState()` | Return initial state fields | State initialization |

### ModeFactory (`src/modes/ModeFactory.js`)

`ModeFactory.createMode(modeName, instance)` instantiates modes by name. Valid modes: `analysis`, `harmonics`, `doppler`, `pan`.

In production, an invalid mode name falls back to `BaseMode` to prevent crashes. In development (localhost), it throws to fail fast.

### Mode Directory Convention

Each mode lives in its own directory under `src/modes/`:

```
src/modes/
├── BaseMode.js
├── ModeFactory.js
├── analysis/
│   └── AnalysisMode.js    # Persistent draggable markers
├── harmonics/
│   └── HarmonicsMode.js   # Real-time harmonic calculation
├── doppler/
│   └── DopplerMode.js     # Doppler speed calculation
└── pan/
    └── PanMode.js          # Zoom panning
```

### FeatureRenderer (`src/core/FeatureRenderer.js`)

The `FeatureRenderer` coordinates cross-mode feature visibility. See [ADR-011](ADRs/ADR-011-Feature-Renderer-Cross-Mode-Coordination.md).

When rendering is triggered (mouse move, mode switch, zoom), `FeatureRenderer.renderAllPersistentFeatures()`:

1. Clears the SVG cursor group (`cursorGroup.innerHTML = ''`)
2. Checks each mode for existing features (markers, harmonic sets, Doppler curves)
3. Delegates to each mode's `renderPersistentFeatures()` method

This ensures analysis markers remain visible while in harmonics mode, and vice versa.

## Rendering Pipeline

GramFrame uses SVG for all interactive overlays. See [ADR-001](ADRs/ADR-001-SVG-Based-Rendering.md).

### SVG Structure

The component creates an SVG element overlaying the spectrogram image. Key SVG groups:

- **`spectrogramImage`** — `<image>` element displaying the spectrogram PNG
- **`axesGroup`** — Axis tick marks and labels (time on Y-axis, frequency on X-axis)
- **`cursorGroup`** — All interactive features: markers, harmonic lines, Doppler curves, cursor indicators

### Cursor and Feature Rendering (`src/rendering/cursors.js`)

`updateCursorIndicators(instance)` is the main render entry point:

1. Clears `cursorGroup`
2. Calls `featureRenderer.renderAllPersistentFeatures()` to redraw all saved features

Modes add SVG elements to `cursorGroup` using utilities from `src/utils/svg.js`:

- `createSVGLine(x1, y1, x2, y2, className)` — Creates `<line>` elements
- `createSVGText(x, y, text, className, anchor)` — Creates `<text>` elements
- `createSVGCircle(cx, cy, r, className)` — Creates `<circle>` elements

### Coordinate Transform Chain

Four coordinate systems are used. See [ADR-002](ADRs/ADR-002-Multiple-Coordinate-Systems.md).

```
Screen Coords ──→ SVG Coords ──→ Image Coords ──→ Data Coords
(browser px)      (viewBox)      (natural px)      (time/freq)
```

**Functions** (in `src/utils/coordinates.js`):

| Function | Input | Output | Notes |
|----------|-------|--------|-------|
| `screenToSVGCoordinates(screenX, screenY, svg, imageDetails)` | Browser-relative px | SVG viewBox coordinates | Uses `viewBox` scale factors |
| `imageToDataCoordinates(imageX, imageY, config, imageDetails, rate)` | Image-relative px | `{freq, time}` | Rate acts as frequency divider |

The intermediate screen-to-image conversion happens in `events.js` → `screenToDataWithZoom()`, which accounts for zoom level and margins when converting SVG coordinates to image-relative coordinates.

**Coordinate axes**:
- **X-axis** = Frequency (horizontal, left to right)
- **Y-axis** = Time (vertical, Y=0 at top, time increases upward in data space)

## State Management

See [ADR-004](ADRs/ADR-004-Centralized-State-Management.md).

### State Structure (`src/core/state.js`)

All runtime data lives in a single `state` object on each `GramFrame` instance. Key fields:

```javascript
{
  version: '0.0.1',
  instanceId: '',
  mode: 'analysis',           // Current active mode
  previousMode: null,         // For mode switching history
  rate: 1,                    // Frequency divider
  selectedColor: '#ff6b6b',   // Active color for new features
  cursorPosition: null,       // Current cursor {x, y, svgX, svgY, freq, time}
  imageDetails: { url, naturalWidth, naturalHeight },
  config: { timeMin, timeMax, freqMin, freqMax },
  displayDimensions: { width, height },
  margins: { left: 60, bottom: 50, right: 15, top: 15 },
  zoom: { level: 1.0, centerX: 0.5, centerY: 0.5 },
  selection: { selectedType, selectedId, selectedIndex },
  // ...plus mode-specific fields from each mode's getInitialState()
}
```

### Listener Pattern

State changes are broadcast to registered listeners via `notifyStateListeners(state, listeners)`:

1. State is **deep-copied** via `JSON.parse(JSON.stringify(state))` before passing to listeners — this prevents external code from mutating internal state
2. Each listener is called inside a try/catch to isolate failures
3. Listeners are registered per-instance and globally (via `addGlobalStateListener`)

### State Initialization

`createInitialState()` returns a fresh deep copy of the template state (including mode-specific fields from each mode's `static getInitialState()`). Each GramFrame instance gets its own independent state copy.

## Event Handling

### Event Flow (`src/core/events.js`)

`setupEventListeners(instance)` binds these handlers to the SVG element:

| Event | Handler | Purpose |
|-------|---------|---------|
| `mousemove` | `handleMouseMove` | Update cursor position, delegate to mode, update LEDs |
| `mousedown` | `handleMouseDown` | Set focus, delegate to mode for click/drag |
| `mouseup` | `handleMouseUp` | Delegate to mode for drag end |
| `mouseleave` | `handleMouseLeave` | Clear cursor, notify listeners |
| `contextmenu` | `handleContextMenu` | Right-click delegation to mode |

All mouse handlers convert screen coordinates to data coordinates via `screenToDataWithZoom()`, then delegate to the current mode's handler. This is the mode-specific event delegation pattern — the event system doesn't know mode details, it just passes data coordinates to `currentMode.handleMouseMove(event, dataCoords)`.

### ResizeObserver (`src/core/events.js`)

`setupResizeObserver(instance)` uses `ResizeObserver` to monitor the container element. On resize, it triggers `instance._handleResize()` which recalculates SVG viewBox, axis positions, and feature positions. See [ADR-003](ADRs/ADR-003-Responsive-Design-ResizeObserver.md).

A `window.resize` listener provides fallback coverage.

## Configuration

See [ADR-005](ADRs/ADR-005-HTML-Table-Configuration.md).

### HTML Table Parsing (`src/core/configuration.js`)

`extractConfigData(instance)` parses the HTML config table:

1. Finds the `<img>` element in the first row → stores `imageDetails.url`
2. Iterates remaining rows, looking for 2-cell rows: `parameter | value`
3. Parses numeric values for: `time-start`, `time-end`, `freq-start`, `freq-end`
4. Validates: both time and frequency ranges must be present and valid (start < end)
5. Throws on missing/invalid config, which the API catches and displays as an error indicator

### Auto-Discovery

On `DOMContentLoaded`, `GramFrameAPI.init()` calls `detectAndReplaceConfigTables(document)` which finds all `<table class="gram-config">` elements and replaces each with a GramFrame instance.

## Public API

The public API is exposed via `window.GramFrame` (see `src/api/GramFrameAPI.js`):

| Method | Purpose |
|--------|---------|
| `init()` | Initialize all config tables on the page |
| `detectAndReplaceConfigTables(container)` | Scan a container for config tables |
| `addStateListener(callback)` | Register for state change notifications |
| `removeStateListener(callback)` | Unregister a state listener |

## HMR Support

Vite Hot Module Replacement preserves state listeners across code changes during development. See [ADR-006](ADRs/ADR-006-Hot-Module-Reload-Support.md). The `import.meta.hot.accept()` handler in `src/main.js`:

1. Saves existing global state listeners
2. Clears the listener registry
3. Re-initializes GramFrame instances
4. Restores saved listeners

## Related ADRs

- [ADR-001: SVG-Based Rendering](ADRs/ADR-001-SVG-Based-Rendering.md)
- [ADR-002: Multiple Coordinate Systems](ADRs/ADR-002-Multiple-Coordinate-Systems.md)
- [ADR-003: Responsive Design with ResizeObserver](ADRs/ADR-003-Responsive-Design-ResizeObserver.md)
- [ADR-004: Centralized State Management](ADRs/ADR-004-Centralized-State-Management.md)
- [ADR-005: HTML Table Configuration](ADRs/ADR-005-HTML-Table-Configuration.md)
- [ADR-006: Hot Module Reload Support](ADRs/ADR-006-Hot-Module-Reload-Support.md)
- [ADR-007: JSDoc TypeScript Integration](ADRs/ADR-007-JSDoc-TypeScript-Integration.md)
- [ADR-008: Modular Mode System](ADRs/ADR-008-Modular-Mode-System.md)
- [ADR-010: Unminified Production Build](ADRs/ADR-010-Unminified-Production-Build.md)
- [ADR-011: Feature Renderer Cross-Mode Coordination](ADRs/ADR-011-Feature-Renderer-Cross-Mode-Coordination.md)
