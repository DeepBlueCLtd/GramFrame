# HTML Integration Guide

**Last updated**: 2026-09-05

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

### Before the Component Appears

Until that scan runs, a config table is ordinary HTML, so on a cold load (large spectrogram, slow network) the browser paints it before GramFrame replaces it. The stylesheet dresses that gap up as a loading placeholder: the parameter rows are hidden, the spectrogram is dimmed back and a "Loading spectrogram" caption sits over it. The same caption then covers the component's image panel until the spectrogram's dimensions are known; if the image never loads, it is replaced with a plain failure message.

For the placeholder to be in effect at first paint, the styling must reach the browser before the config table does — put the `<link rel="stylesheet">` (or, for the standalone bundle, the `<script>` that inlines the CSS) in `<head>` rather than at the end of `<body>`.

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
- Values must be a single valid number — the whole cell is parsed, so `1,5`, `10 Hz` and an empty cell are all rejected rather than being read as `1`, `10` and `0`
- Start values must be strictly less than end values
- The first row must contain an `<img>` element, and that element must have a non-empty `src` attribute
- If validation fails, the original table is preserved and an error indicator is shown

## Audio-Sourced Grams (the Spectrograph Player)

A config table may name a WAV recording instead of an image. GramFrame then
decodes the file in the browser, analyses it into a spectrogram, and shows it
as a *waterfall*: press play and the newest sound enters at the top of the gram
while everything already shown slides down, in step with the audio. Pause, and
every annotation tool works on what has been played; the annotations scroll
with the gram when play resumes.

```html
<table class="gram-config">
  <tr><td colspan="2"><audio src="audio/diesel-generator.wav" controls></audio></td></tr>
  <tr><td>window-seconds</td><td>10</td></tr>
  <tr><td>freq-end</td><td>4000</td></tr>
</table>
```

The first row holds an `<audio>` element in place of the `<img>`. Adding
`controls` to it is optional but recommended: before GramFrame runs, or on a
page where it cannot, the browser shows a plain audio player. Every other row
is optional.

| Parameter | Type | Default | Meaning |
|-----------|------|---------|---------|
| `fft-size` | integer, power of two (64–8192) | 1024 | Samples per analysis frame. Larger gives finer frequency resolution and coarser time resolution |
| `hop-size` | integer ≥ 1 | `fft-size / 2` | Samples between frames — the height of one gram row in samples. Larger makes the gram shorter |
| `freq-start` | Hz | 0 | Lowest frequency shown |
| `freq-end` | Hz | half the sample rate | Highest frequency shown. Above the recording's Nyquist frequency it is clamped, with a console warning |
| `window-seconds` | seconds > 0 | 10 | How much of the recording the unzoomed view spans |

`time-start` and `time-end` are ignored on an audio table, with a console
warning: the recording defines its own time range, `0` to its duration.

### What the recording may be

WAV only: PCM 8, 16, 24 or 32-bit or 32-bit float, mono or stereo (stereo is
mixed to mono for both analysis and playback). Keep recordings to a few
minutes. The analysed gram is capped at 32,768 rows by 4,096 columns; a
recording that would exceed the cap is refused with the standard error
indicator, and the message names the `hop-size` that would bring it inside.
Three minutes at 44.1 kHz with the defaults is about 15,500 rows.

### Serving over `file://`

A page opened from the file system cannot fetch a sibling WAV — browsers block
it. Generate a *sidecar* next to each recording once:

```bash
node scripts/wav2js.mjs audio/diesel-generator.wav
# writes audio/diesel-generator.wav.js
```

Ship the `.wav.js` beside the `.wav`. GramFrame looks for it only when the
fetch fails, so pages served over HTTP never load it. The sidecar is the WAV
base64-encoded (about a third larger), so a five-minute 44.1 kHz recording
costs some 35 MB on disk; 22,050 Hz material halves that and still covers
everything below 11 kHz.

### Playback and keys

The bar under the gram offers play/pause, restart, a seek slider, loop, rate
(0.5× to 2×), mute and volume; a click on the time axis also seeks. When a
player has keyboard focus (click on it), `Space` or `K` toggles play,
`J`/`L` seek 5 s back or forward (30 s with `Shift`), `Home` restarts and `M`
mutes. Arrow keys keep nudging a selected annotation. Image-backed grams are
unaffected by any of these.

Changing the rate changes the audible pitch (the browser's default); the gram
is never re-analysed, so the frequency readouts stay true.

The expand toggle (⤡) at the top-left of the gram works as it does on an
image: it grows the axes area to fill the window, with the transport bar kept
in view, and shows the most detail the screen allows. Zoom and pan compose
with it.

From script, `GramFrame.getPlayer(index)` returns the player of the
`index`-th instance (`null` for an image-backed one) with `play()`, `pause()`,
`seek(seconds)`, `restart()`, `setLoop()`, `setRate()`, `setVolume()` and
`setMute()`. `play()` returns the element's promise, which rejects if the
browser refuses to start audio without a user gesture. The broadcast state
carries a `player` object with the duration, playhead, transport flags and
the analysis parameters in force.

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

## Expand API

A landscape gram can be expanded to fill the space around it. The toggle is a
button on the component; these two methods drive the same state from a host
page:

```javascript
// Is the first instance currently expanded?
const expanded = GramFrame.getExpandState()

// Expand (or collapse) every landscape instance on the page
GramFrame.setExpandState(true)
```

Expand state is in-memory only — deliberately not persisted, so a reload starts
collapsed.

## Annotation Persistence (Trainer vs. Student)

GramFrame can persist annotations (analysis markers, harmonic sets, sideband sets, doppler
curves) in browser storage. The storage backend depends on whether the page is
detected as a **trainer** page or a **student** page:

- **Trainer pages** use `localStorage` — annotations persist permanently, so an
  instructor can author them once and have them survive browser restarts.
- **Student pages** use `sessionStorage` — annotations are ephemeral and cleared
  when the browser tab/session closes.

A page is treated as a trainer page if **any** of the following explicit flags is
present anywhere in the page, in order of preference:

| Form | Example | Notes |
|------|---------|-------|
| Class | `<span class="gf-persistent"></span>` | **Recommended** — DITA-friendly |
| Data attribute | `<span data-gf-persistent></span>` | DITA-friendly |
| Id | `<span id="gf-persistent"></span>` | Legacy; kept for backward compatibility |

The flag element can be hidden and placed anywhere on the page — detection runs
over the whole document with no ordering constraints.

```html
<!-- Mark this page as a trainer/instructor page -->
<span class="gf-persistent" hidden></span>
```

A legacy heuristic also treats a page as trainer context if it contains an
anchor whose exact text is `ANALYSIS`. This is fragile (it false-positives on
any page with such a link) and is retained only for backward compatibility —
prefer an explicit flag above.

### Why a class and data-attribute, not just an id

The AAAC training material is produced through a DITA-OT / Oxygen WebHelp
publishing pipeline. **DITA-OT topic-scopes and uniquifies every `@id`** in its
HTML output, so an authored `id="gf-persistent"` is rewritten to something
page-specific (e.g. `id="ariaid-title1_gf-persistent"`) and
`getElementById('gf-persistent')` never matches — instructor pages would
silently fall back to ephemeral `sessionStorage`.

A DITA `@outputclass`, by contrast, is passed straight through to the HTML
`@class` **verbatim and un-mangled** (this is exactly how `table.gram-config`
itself is detected), and classes are not uniquified. So `.gf-persistent` is
reliably emittable from DITA and stable on every page.

DITA integrators add the class to an instructor-only marker they already emit
(profiled out of the student build via DITAVAL), so no extra authoring is
required — students get no flag and stay ephemeral:

```xml
<p outputclass="gf-persistent" audience="instructor">…</p>
```

→ renders to `class="p gf-persistent"` on instructor pages only. No id, no
post-processing, no client-side shim.

## File Protocol Compatibility

GramFrame supports `file://` protocol for offline use. The standalone IIFE build (`gramframe.bundle.js`) bundles all CSS inline, avoiding cross-origin restrictions. See [ADR-013](ADRs/ADR-013-File-Protocol-Compatibility.md).

Build the standalone bundle with:

```bash
yarn build:standalone
```

## Troubleshooting

### Table Not Replaced

- Verify the table has `class="gram-config"` (exact class name)
- Check the browser console for error messages

The script may be loaded at any point — before `DOMContentLoaded` or long after.
A bundle injected late initialises immediately instead of waiting for an event
that has already fired (issue #272), so a lazily-appended `<script>`, a deferred
loader, or a DITA/HTML5 output that scripts its own includes all work. To add
tables after that, call `GramFrame.detectAndReplaceConfigTables(container)`.

### Error Indicator Shown

If a red error box appears below the table:
- **"No image element found"** — First row must contain an `<img>` tag (or an `<audio>` for a player)
- **"Audio-sourced gram failed"** — the recording could not be fetched or decoded, or its gram would exceed the size cap; the message says which. Over `file://`, check the `.wav.js` sidecar is beside the WAV
- **"Image element has no src"** — The `<img>` needs a valid `src` attribute
- **"Missing required time/frequency configuration"** — All four parameters must be present
- **"Invalid time/frequency range"** — Start value must be less than end value
- **"Invalid numeric value"** — Parameter values must be numbers

### Image Not Loading

- Verify the image path is correct relative to the HTML file
- For `file://` protocol, ensure the image is in an accessible directory
- Check browser console for 404 errors

### Clear Gram Button Missing, or Annotations Not Persisting

Both symptoms have the same cause: the page was detected as a **student** page
(see [Annotation Persistence](#annotation-persistence-trainer-vs-student)).
Nothing removes the button after the component starts, so a page that once had
it and now does not was never a trainer page to begin with — the flag is
missing from that page, or arrived too late.

To check, on the page in question:

- Inspect the component's container: it carries `data-gf-context="trainer"` or
  `data-gf-context="student"`.
- Open the browser console. Each instance logs one line on start-up, e.g.
  `GramFrame: instance 0 is on a student page (no gf-persistent flag … and no
  "ANALYSIS" anchor was on the page when the component initialised)`. On a
  trainer page the line names the element that matched.

Common reasons a page in an instructor publication comes out as student:

- The topic has no `gf-persistent` flag — it was omitted, or profiled out.
  Every topic needs its own flag; detection does not carry over between pages.
- The page relies on the legacy `ANALYSIS` anchor and that navigation link is
  built by script after `DOMContentLoaded`. Detection runs once, at start-up,
  and is not re-evaluated — use an explicit flag in the topic body instead.
- The flag sits inside the `gram-config` table, which is removed when the first
  gram on the page is built, so a second gram on the same page does not see it.
  Put the flag outside the table.

Note that on a student page annotations go to `sessionStorage` and expire after
24 hours, so a missing button also means the work will not persist.

### Multiple Instances Interfering

Each instance is fully independent. If instances seem to interfere:
- Verify each table has its own `<img>` element (not shared)
- Check that state listeners are filtering by `instanceId` if needed

## Related Documentation

- [ADR-005: HTML Table Configuration](ADRs/ADR-005-HTML-Table-Configuration.md) — Design rationale for the table-based config approach
- [ADR-013: File Protocol Compatibility](ADRs/ADR-013-File-Protocol-Compatibility.md) — Offline/file:// support decisions
- [Tech-Architecture.md](Tech-Architecture.md) — Full system architecture
