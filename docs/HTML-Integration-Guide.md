# HTML Integration Guide

**Last updated**: 2026-03-26

This guide explains how to embed GramFrame spectrogram viewers in HTML pages. GramFrame auto-discovers configuration tables and replaces them with interactive SVG overlays.

## Quick Start

### 1. Include the Script

```html
<script src="gramframe.js"></script>
```

For standalone use (no build tool), use the IIFE bundle:

```html
<script src="gramframe.bundle.js"></script>
```

The standalone bundle includes CSS inlined automatically — no separate stylesheet needed.

### 2. Add a Configuration Table

```html
<table class="gram-config">
  <tr><td colspan="2"><img src="spectrogram.png" /></td></tr>
  <tr><td>time-start</td><td>0</td></tr>
  <tr><td>time-end</td><td>10</td></tr>
  <tr><td>freq-start</td><td>0</td></tr>
  <tr><td>freq-end</td><td>2000</td></tr>
</table>
```

### 3. Component Auto-Initializes

On `DOMContentLoaded`, GramFrame scans the page for all `<table class="gram-config">` elements and replaces each one with an interactive spectrogram viewer.

## Parameter Reference

The configuration table uses a 2-column format: `parameter | value`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `time-start` | number | Yes | Start time value (bottom of Y-axis) |
| `time-end` | number | Yes | End time value (top of Y-axis). Must be > `time-start` |
| `freq-start` | number | Yes | Start frequency value (left of X-axis) |
| `freq-end` | number | Yes | End frequency value (right of X-axis). Must be > `freq-start` |

The first row must contain an `<img>` element with the spectrogram image (using `colspan="2"`).

### Validation Rules

- All four parameters (`time-start`, `time-end`, `freq-start`, `freq-end`) are **required**
- Values must be valid numbers (parsed with `parseFloat`)
- Start values must be strictly less than end values
- The `<img>` element must have a `src` attribute
- If validation fails, the original table is preserved and an error indicator is shown

## Multiple Instances

You can have multiple independent GramFrame instances on a single page. Each config table becomes its own instance with independent state.

```html
<!-- First spectrogram -->
<table class="gram-config">
  <tr><td colspan="2"><img src="spectrogram-1.png" /></td></tr>
  <tr><td>time-start</td><td>0</td></tr>
  <tr><td>time-end</td><td>30</td></tr>
  <tr><td>freq-start</td><td>0</td></tr>
  <tr><td>freq-end</td><td>5000</td></tr>
</table>

<!-- Second spectrogram (different image and ranges) -->
<table class="gram-config">
  <tr><td colspan="2"><img src="spectrogram-2.png" /></td></tr>
  <tr><td>time-start</td><td>0</td></tr>
  <tr><td>time-end</td><td>60</td></tr>
  <tr><td>freq-start</td><td>100</td></tr>
  <tr><td>freq-end</td><td>20000</td></tr>
</table>
```

Each instance:
- Has its own state (cursor position, mode, markers, etc.)
- Responds independently to mouse interactions
- Can be in different modes simultaneously
- Gets a unique `instanceId` for programmatic access

## Programmatic Initialization

If you need to initialize GramFrame after page load (e.g., for dynamically added content):

```javascript
// Initialize all config tables in a specific container
const container = document.getElementById('my-container')
const instances = GramFrame.detectAndReplaceConfigTables(container)
```

## State Listener API

Listen for state changes across all instances:

```javascript
// Add a listener
const listener = GramFrame.addStateListener(state => {
  console.log('Mode:', state.mode)
  console.log('Cursor:', state.cursorPosition)
})

// Remove a listener
GramFrame.removeStateListener(listener)
```

State is deep-copied before being passed to listeners, so you cannot accidentally mutate internal state.

## File Protocol Compatibility

GramFrame supports `file://` protocol for offline use. The standalone IIFE build (`gramframe.bundle.js`) bundles all CSS inline, avoiding cross-origin restrictions. See [ADR-013](ADRs/ADR-013-File-Protocol-Compatibility.md).

Build the standalone bundle with:

```bash
yarn build:standalone
```

## Troubleshooting

### Table Not Replaced

- Verify the table has `class="gram-config"` (exact class name)
- Ensure the script is loaded before `DOMContentLoaded` fires
- Check the browser console for error messages

### Error Indicator Shown

If a red error box appears below the table:
- **"No image element found"** — First row must contain an `<img>` tag
- **"Image element has no src"** — The `<img>` needs a valid `src` attribute
- **"Missing required time/frequency configuration"** — All four parameters must be present
- **"Invalid time/frequency range"** — Start value must be less than end value
- **"Invalid numeric value"** — Parameter values must be numbers

### Image Not Loading

- Verify the image path is correct relative to the HTML file
- For `file://` protocol, ensure the image is in an accessible directory
- Check browser console for 404 errors

### Multiple Instances Interfering

Each instance is fully independent. If instances seem to interfere:
- Verify each table has its own `<img>` element (not shared)
- Check that state listeners are filtering by `instanceId` if needed

## Related Documentation

- [ADR-005: HTML Table Configuration](ADRs/ADR-005-HTML-Table-Configuration.md) — Design rationale for the table-based config approach
- [ADR-013: File Protocol Compatibility](ADRs/ADR-013-File-Protocol-Compatibility.md) — Offline/file:// support decisions
- [Tech-Architecture.md](Tech-Architecture.md) — Full system architecture
