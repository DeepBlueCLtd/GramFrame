# Data and State Guide

**Last updated**: 2026-03-26

This guide covers how GramFrame stores and manages data at runtime — the centralized state object, the listener pattern, configuration parsing, and what (if anything) persists across sessions.

## State Management (`src/core/state.js`)

All runtime data for a GramFrame instance lives in a single `state` object. See [ADR-004](ADRs/ADR-004-Centralized-State-Management.md).

### State Shape

```javascript
{
  // Identity
  version: '0.0.1',
  instanceId: 'gramframe-1234567890-0',

  // Mode
  mode: 'analysis',           // 'analysis' | 'harmonics' | 'doppler' | 'pan'
  previousMode: null,         // Previous mode name, or null

  // Global settings
  rate: 1,                    // Frequency divider for calculations
  selectedColor: '#ff6b6b',   // Active color for new features

  // Cursor
  cursorPosition: {           // null when cursor is outside the spectrogram
    x, y,                     // Screen-relative coordinates
    svgX, svgY,               // SVG viewBox coordinates
    imageX, imageY,           // Image-relative coordinates
    freq, time                // Data coordinates
  },

  // Image and config (from HTML table)
  imageDetails: { url, naturalWidth, naturalHeight },
  config: { timeMin, timeMax, freqMin, freqMax },

  // Layout
  displayDimensions: { width, height },
  margins: { left: 60, bottom: 50, right: 15, top: 15 },

  // Zoom
  zoom: { level: 1.0, centerX: 0.5, centerY: 0.5 },

  // Selection (keyboard navigation)
  selection: { selectedType, selectedId, selectedIndex },

  // Mode-specific state (merged from each mode's getInitialState())
  analysis: { markers: [...], ... },
  harmonics: { harmonicSets: [...], ... },
  doppler: { fPlus, fMinus, fZero, ... },
  // ...
}
```

### Listener Registration

```javascript
// Global listener (applies to all instances)
GramFrame.addStateListener(state => {
  console.log('Current mode:', state.mode)
  console.log('Cursor freq:', state.cursorPosition?.freq)
})

// Remove listener
GramFrame.removeStateListener(myListener)
```

Listeners are stored in two places:
- **Per-instance**: `instance.stateListeners[]` — specific to one GramFrame instance
- **Global**: `globalStateListeners[]` — automatically applied to all instances (via `addGlobalStateListener`)

### Deep-Copy Contract

**State is always deep-copied before being passed to listeners.** The copy is made via `JSON.parse(JSON.stringify(state))`. This means:

- Listeners receive a snapshot — they cannot mutate internal state
- Each listener call gets an independent copy
- Functions and DOM references are not preserved in the copy (they are stripped by JSON serialization)
- Listener errors are caught individually — one failing listener doesn't break others

### State Initialization

`createInitialState()` produces a fresh deep copy of the template state object. Mode-specific initial state is collected from each mode class via `static getInitialState()` and merged into the template. This runs once per instance creation.

### Where State Changes Happen

State is mutated directly on `instance.state` by:
- **Event handlers** (`src/core/events.js`) — cursor position
- **Mode handlers** (e.g., `AnalysisMode.handleMouseDown`) — markers, harmonic sets
- **UI interactions** — mode switching (`_switchMode`), rate changes (`_setRate`)
- **Zoom operations** (`src/core/viewport.js`) — zoom level and center

After mutation, `notifyStateListeners(instance.state, instance.stateListeners)` broadcasts the change.

## Configuration Parsing (`src/core/configuration.js`)

Configuration flows from HTML to runtime state during initialization:

```
HTML table (class="gram-config")
    │
    ├─ Row 1: <img src="..."> → state.imageDetails.url
    │
    └─ Rows 2+: parameter | value pairs
         ├─ time-start  → state.config.timeMin
         ├─ time-end    → state.config.timeMax
         ├─ freq-start  → state.config.freqMin
         └─ freq-end    → state.config.freqMax
```

### Parsing Flow

1. `GramFrameAPI.detectAndReplaceConfigTables()` finds `<table class="gram-config">` elements
2. For each table, a `GramFrame` instance is created, passing the table element
3. `extractConfigData(instance)` runs during construction:
   - Extracts the `<img>` element's `src` URL
   - Iterates `<tr>` elements, looking for 2-cell rows
   - Matches cell text against known parameter names
   - Parses values with `parseFloat()`
4. Validation: both time and frequency ranges must be present, with start < end
5. On validation failure, an error is thrown and displayed as a red indicator on the page

### Parameter Validation

| Check | Error |
|-------|-------|
| No `<img>` in table | "No image element found in config table" |
| `<img>` without `src` | "Image element has no src attribute" |
| Missing time-start or time-end | "Missing required time configuration" |
| Missing freq-start or freq-end | "Missing required frequency configuration" |
| time-start >= time-end | "Invalid time range: start must be less than end" |
| freq-start >= freq-end | "Invalid frequency range: start must be less than end" |
| Non-numeric value | Warning logged, row skipped |

## Persistence Overview

### What Is Ephemeral (Lost on Page Reload)

All GramFrame runtime state is **ephemeral**. Nothing persists across browser sessions:

- Cursor position
- Analysis markers
- Harmonic sets
- Doppler curve data
- Mode selection
- Rate value
- Zoom level and pan position
- Color selection

### What Is "Persistent" Within a Session

Some data survives **mode switches** within a single session:

- **Analysis markers** — Visible across all modes via FeatureRenderer
- **Harmonic sets** — Visible across all modes via FeatureRenderer
- **Doppler curves** — Visible across all modes via FeatureRenderer
- **Rate value** — Shared across all modes
- **Selected color** — Shared across all modes

### Configuration Is Read-Only

Config values (`timeMin`, `timeMax`, `freqMin`, `freqMax`) are parsed once from the HTML table during initialization and never change afterward. The image URL is similarly fixed.

## Tracing Data Flow

To trace where any piece of data lives:

1. **Is it config?** → Set during initialization from HTML table, lives in `state.config` or `state.imageDetails`
2. **Is it cursor-related?** → Updated on every mouse event, lives in `state.cursorPosition`
3. **Is it mode-specific?** → Stored in `state.[modeName]` (e.g., `state.analysis.markers`), updated by the mode's event handlers
4. **Is it UI state?** → `state.mode`, `state.rate`, `state.selectedColor`, `state.zoom` — updated by UI interaction handlers

## Related Documentation

- [ADR-004: Centralized State Management](ADRs/ADR-004-Centralized-State-Management.md)
- [ADR-005: HTML Table Configuration](ADRs/ADR-005-HTML-Table-Configuration.md)
- [Tech-Architecture.md](Tech-Architecture.md) — Full system architecture
