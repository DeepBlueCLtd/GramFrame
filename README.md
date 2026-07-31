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

## Developer Documentation

- [Getting Started](docs/Getting-Started.md) — Prerequisites, setup, and development workflow
- [Technical Architecture](docs/Tech-Architecture.md) — System architecture, mode system, rendering pipeline, state management
- [HTML Integration Guide](docs/HTML-Integration-Guide.md) — Embedding GramFrame in HTML pages
- [Adding Graphical Features](docs/Adding-Graphical-Features.md) — Code area guide for new visual features
- [Data and State Guide](docs/Data-and-State-Guide.md) — State management patterns and data flow
- [Rendering Troubleshooting](docs/Rendering-Troubleshooting.md) — Debugging rendering and coordinate issues
- [Architecture Decision Records](docs/ADRs/) — Design decisions and rationale

## Annotation Persistence

Annotations (analysis markers, harmonic sets, and Doppler curves) are saved to
browser storage automatically. The storage backend depends on whether the page
is detected as a **trainer** or **student** context:

| Context   | Storage          | Lifetime                                      |
|-----------|------------------|-----------------------------------------------|
| Trainer   | `localStorage`   | Permanent — survives browser restarts         |
| Student   | `sessionStorage` | Cleared when the browser tab/session closes   |

### How the context is detected

A page is treated as a **trainer** page if **either** of the following is true:

1. The page contains an element with `id="gf-persistent"` (anywhere in the DOM), or
2. The page contains an anchor (`<a>`) element whose exact trimmed text is `ANALYSIS`.

If neither is present, the page is treated as a **student** page.

To opt a page into permanent (trainer) persistence, add a marker element, e.g.:

```html
<span id="gf-persistent" hidden></span>
```

The detection is re-evaluated on every save/load, and the storage key is
namespaced per page path (`gramframe::<pathname>`) — only the storage backend
(local vs. session) differs between contexts.

## Target Audience

Trainees or students using sonar training manuals in HTML format.

## Usage

Include the JavaScript file via `<script>`, and place a config table with the appropriate class on your HTML page. The component will auto-initialize after page load.

## Checking the version

To identify which version of GramFrame an instance is running — useful when
reporting or debugging an issue:

- **In the UI:** hover over the **Pan** button. A tooltip shows `GramFrame vX.Y.Z`.
  (The tooltip is available even before zooming in, while the button is disabled.)
- **Programmatically:** read `state.version` via the public API:
  ```js
  GramFrame.addStateListener(state => console.log(state.version))
  ```

Released builds show the real version (e.g. `v0.1.12`); local development builds
show `vDEV` until `yarn generate-version` runs.
