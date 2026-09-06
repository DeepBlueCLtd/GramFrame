# [CLAUDE.md](CLAUDE.md)

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
```bash
# Development server with hot reload
yarn dev

# Build for production
yarn build

# Run all tests
yarn test

# Type checking (src/, tests/helpers, tests/unit, scripts/ — must be zero)
yarn typecheck

# The Playwright specs, counted as a ratchet by `yarn hygiene`
yarn typecheck:specs
```

### Test Commands
```bash
# Run a specific test file
npx playwright test tests/analysis-mode.spec.js

# Run tests with UI
npx playwright test --ui

# Debug a specific test
npx playwright test tests/mode-integration.spec.js --debug

# Unit lane (Vitest, no browser)
yarn test:unit

# Lint and debt ratchets
yarn lint
yarn hygiene
```

### Status updates

Send me ntfy notifications at key progress milestones (or at least every 30 minutes) using the notify script shown below. This should happen in my absence, so it is ESSENTIAL so that it happen without asking my permission to send. 

```
# Send progress notification
curl -d "status here" ntfy.sh/iancc2025
```

## Architecture Overview

**GramFrame** is a JavaScript component for interactive spectrogram analysis that transforms HTML config tables into interactive SVG-based overlays for sonar training materials.

### Core Components

- **Main Class**: `GramFrame` in `src/main.js` - Central component managing all functionality
- **Entry Point**: `src/index.js` - Main module export and global registration
- **State Management**: `src/core/state.js` - Centralized state with listener pattern
- **Control Row**: five columns above the gram — the mode rail, the armed mode's guidance, the cursor readouts, the style panel and the three annotation tables. Assembled by `src/components/MainUI.js`; see [Control-Panel.md](docs/Control-Panel.md)
- **Mode System**: Modular architecture with five modes — Pan (default), Analysis, Harmonics, Sidebands and Doppler. `analysis` is the code and storage name; the button an analyst sees reads **Cross Cursor** (`modeRoster.js`, and see [Gram-Modes.md](docs/Gram-Modes.md))
- **Spectrograph Player**: `src/audio/` (decode and analyse a WAV into the gram image) and `src/player/` (the transport and the scrolling view) make an audio-sourced instance; the modes measure it through the unchanged coordinate pipeline (spec 168, ADR-019)
- **Feature Rendering**: `src/core/FeatureRenderer.js` - Cross-mode feature coordination
- **Mode Factory**: `src/modes/ModeFactory.js` - Centralized mode instantiation

### Key Architecture Patterns

1. **SVG-based Rendering**: Uses SVG for precise positioning and scaling of cursors/overlays
2. **Responsive Design**: ResizeObserver ensures components adapt to container changes  
3. **Coordinate System**: Multiple coordinate transformations (screen → SVG → image → data)
4. **State Broadcasting**: Listener pattern allows external systems to react to state changes
5. **Hot Module Reload**: HMR support preserves state during development

### File Structure

Every path below exists; keep this list in step with `src/` when adding modules.

- `src/index.js` - Main entry point and global export
- `src/main.js` - GramFrame class implementation
- `src/types.js` - JSDoc type definitions
- `src/globals.d.ts` - Build-time defines (the injected version)
- `src/gramframe.css` - Component styling
- `src/audio/` - The signal chain of an audio-sourced instance; pure, Vitest-covered:
  - `wavDecoder.js` - RIFF/WAVE → mono `Float32Array` (PCM 8/16/24/32 and float)
  - `fft.js` - Radix-2 FFT with cached tables
  - `spectrogram.js` - Hann-windowed frames → power grid, in ≤ 12 ms slices
  - `colourMap.js` - The colour table and the newest-row-on-top pixel layout
  - `gramImage.js` - Percentile-normalised levels, the size cap, canvas → PNG data URL
  - `audioSource.js` - `fetch`, falling back to the `<name>.wav.js` sidecar over `file://`
- `src/player/` - The player around that chain:
  - `audioSetup.js` - The audio twin of `spectrogramImage.js`: load → analyse → paint → ready, then the deferred annotation restore. Coarsens the analysis rather than refusing when the caps demand it (spec 171)
  - `transport.js` - The `<audio>` element and `instance.player` (play/pause/seek/loop/playback rate/volume/mute), with `preservesPitch` stated rather than inherited
  - `dragSeek.js` - Dragging a *playing* gram: pause under the hand, resume from
    the time the view was released at. The transport's, not a mode's — the
    gesture pairs a pan with a pause and a resume time. Also owns what a
    *click* (a press that never moved) means, both ways: pause, and — for Pan
    mode only — resume
  - `bookmarks.js` - Time bookmarks: playback chrome, in-memory, never saved
    with the gram's annotations
  - `transportKeys.js` - The transport's keyboard shortcuts (Space/K, J/L, Home,
    M, B)
  - `playerView.js` - The waterfall geometry: `viewTop`, its clamp, the follow
    loop, the reveal rule, and the time read off a click on the time axis
- `src/core/` - Core system modules:
  - `state.js` - State management and listeners
  - `featureStyle.js` - What the style controls act on — the defaults for the
    next feature, or the selected one — and the four restyle operations. One
    gate (`getSelectedFeature`) decides, so the tab an analyst can see and what
    a colour click does cannot disagree
  - `panelRefresh.js` - "The tables are stale, redraw them", asked from the
    selection layer, the restyle layer and the control row
  - `preferences.js` - The two chrome preferences: the pin style (per session)
    and the guidance collapse (per user)
  - `annotationCommit.js` - `commitAnnotationChange`: the one cadence every annotation
    mutation performs — mark it changed, refresh the panel showing it, re-render the
    overlay, dispatch (R9-13). A leaf over `state.js`; nothing in `state.js` imports back
  - `events.js` - Mouse/wheel event handling and listener teardown
  - `viewport.js` - Zoom, pan and axis updates
  - `configuration.js` - Config table parsing
  - `storage.js` - Annotation persistence (local/sessionStorage). Saving is
    read-merge-write, so two tabs on one gram are additive rather than
    last-writer-wins; deletions travel as tombstones, because a union cannot
    otherwise tell "never had it" from "deleted it" (issue #269)
  - `keyboardControl.js` - Arrow-key control and restyling
  - `selection.js` - Which feature is selected: setting it, clearing it, and the
    five things that follow (the tables re-diff, the readout retargets, the
    style panel re-arms, and on a player the view scrolls to it). Split from
    `keyboardControl.js`, which is about arrow keys — selection is what they act
    *on*, not part of how they work
  - `selectionTarget.js` - What is selected, described: its name, its time, the
    frequency it is about. A leaf, so the readout column and the player can both
    ask without a cycle back through `selection.js`
  - `wheelPan.js` - The middle-button pan, as a drag on the shared engine. Split
    from `events.js`, which owns *which* gesture happens rather than how each
    one behaves
  - `regionZoom.js` - Region zoom: the Shift + left-drag gesture (spec 170).
    Resolved in `events.js` ahead of mode delegation, like every other
    cross-mode navigation gesture, so no part of it can reach a mode and place
    a feature. Holds the selection's two corners in a module-private session —
    never in `state`, so nothing is broadcast or persisted
  - `FocusManager.js` - Which instance receives keyboard input. It follows DOM
    focus and clicks; Tab is never intercepted, so the host page keeps its own
    keyboard navigation however many grams are on it (issue #261)
  - `FeatureRenderer.js` - Cross-mode feature rendering
  - `browserCompatibility.js` - Legacy-browser feature detection and warning
  - `initialization/` - `DOMSetup.js`, `UISetup.js`, `EventBindings.js`, `ModeInitialization.js`
- `src/modes/` - Mode system architecture:
  - `BaseMode.js` - Abstract base class for all modes
  - `ModeFactory.js` - Mode instantiation factory. `createMode`,
    `getModeInitialStates` and `getAvailableModes` all read `modeRoster.js`;
    only `MODE_CLASSES` names the classes
  - `modeRoster.js` - The one list of which modes exist and what each is
    called. A leaf module with no imports, so the UI can read it without
    pulling in every mode class (issue #263)
  - `analysis/AnalysisMode.js` - Analysis mode with marker persistence
  - `harmonics/HarmonicsMode.js` - Harmonics calculation mode (a `PinSetMode`)
  - `harmonics/ManualHarmonicModal.js` - Manual harmonic-spacing dialog. Built
    with `createElement` and class-scoped selectors — no page-global ids escape
    into the host document; Escape is bound on the document so it works wherever
    the focus is; and closing hands focus back to the button that opened it
    (issue #260). The symbol popup follows the same three rules
  - `sideband/SidebandMode.js` - Sidebands mode: a pin set whose origin the
    analyst places (a `PinSetMode`)
  - `doppler/DopplerMode.js` - Doppler speed calculation mode
  - `pan/PanMode.js` - Pan mode (the default mode)
  - `capabilities.js` - Duck-typed mode capabilities (`PersistentFeatureProvider`,
    `PanelOwner`, `PinSetOwner`, `MarkerOwner`) and their predicates. How `FeatureRenderer` and `MainUI` find
    what a mode can do without naming it (ADR-017)
  - `shared/BaseDragHandler.js` - The shared drag engine: every pointer drag (move, create, place, pan) and the single `state.drag` projection
  - `shared/PinSetMode.js` - The shared pin-set mode: pin geometry, the
    label/symbol stack, hit testing, rendering, drag wiring and set
    add/update/remove for Harmonics and Sidebands. A subclass supplies only
    where its sets live and what frequency a member index maps to
- `src/components/` - UI component modules:
  - `UIComponents.js` - What is left of the shared UI helpers: the LED re-export
  - `MainUI.js` - The control row's five columns, assembled from the modules below
  - `ModeButtons.js` - The mode rail: five stacked tools, then the view controls
    (zoom out, zoom in, fit) in a footer beneath them
  - `GuidancePanel.js` - The armed mode's guidance column, and the 40px rail it
    collapses to. Collapse is remembered per user; with no stored choice the
    column decides by the panel's own width
  - `CursorReadout.js` - The instrument face: time, frequency and doppler speed.
    Reads the pointer, or the selected feature when there is one
  - `AnnotationTables.js` - The three table columns, their headers, count chips
    and the "Clear all annotations" footer
  - `icons.js` - The button glyphs, drawn as inline SVG in `currentColor` so
    they follow the button's states as text does. A mode's glyph rides beside
    its word; a view control's replaces it, keeping the word in a visually
    hidden span
  - `HarmonicPanel.js` - Harmonics display panel
  - `SidebandPanel.js` - Sidebands display panel (its own column beside the
    harmonics panel; both are always visible)
  - `DiffingTable.js` - Shared row-diffing table behind all three tables
  - `tableScroll.js` - Keeping a newly added or newly selected row in view
  - `StylePanel.js` - The style panel and its twin target tabs
  - `styleTarget.js` - What the panel is pointed at, and the four things it can
    do to it (arm, rename, delete, describe)
  - `ColorPicker.js` - The colour slider: the one colour control in the panel
  - `SymbolPicker.js` - The symbol button and its popup, plus the size trial
  - `Segmented.js` - The shared two-option segmented control
  - `PinToggle.js` - Tall pins or mini, for the next created pin set or the
    selected one
  - `ExpandToggle.js` - Expand/collapse the image to fill the space
  - `StorageWarning.js` - Non-blocking banner when a save fails
  - `TransportBar.js` - The playback controls under an audio-sourced gram, the
    scrub track, the visible time span, and the polite live region a screen
    reader hears
  - `TransportBookmarks.js` - The bookmark flags on that track and the saved list
  - `DisplayRangeControls.js` - The contrast floor and ceiling, on that bar
  - `ErrorIndicator.js` - The standard initialisation-error box, shared by the API and the audio setup
  - `LEDDisplay.js` - Digital display component
  - `table.js` - Component scaffold: builds the DOM structure and replaces the
    config table. Nothing else — its five other responsibilities were split out
    (ADR-018), and it is imported by exactly one module, `DOMSetup.js`
  - `spectrogramImage.js` - Spectrogram image load and scaling
  - `svgLayout.js` - SVG layout, viewBox and zoom-transform application
- `src/rendering/` - Rendering system. These modules draw; they do not dispatch:
  - `regionOverlay.js` - The region-zoom rubber band, the dashed outline of the
    view it will produce, the dimmed surround and the live span readout. Draws
    only; the geometry arrives already clamped
  - `axes.js` - The axis engine: `renderAxes` and its private tick/label helpers.
    Both axes use the same nice-number tick engine and label at a precision their
    own tick interval justifies, so no label is finer than its tick and none
    repeats its neighbour (issue #259)
  - `symbols.js` - Marker/harmonic symbol shapes
  - `labels.js` - Marker label placement and element (feature 231)
  - `displayFilter.js` - The contrast controls' `feComponentTransfer`: built into
    the SVG's defs on first use, removed entirely at the resting positions so the
    default is the image as it loaded
  - `selectionHalo.js` - What a selected feature looks like on the gram: its own
    geometry redrawn beneath itself, wider and in translucent white, plus the
    inverted label plate its table row also gets. A pass over the finished
    overlay, so selection costs a few elements rather than a re-render
  - `markerGlyph.js` - What an analysis marker is drawn as: the crosshair, or the
    shaped symbol that replaces it. `drawsCrosshair` is the one answer to "does
    this marker have arms?", so the hit test asks it rather than re-deriving the
    rule and drifting from the drawing (issue #273)
- `src/utils/` - Utility modules:
  - `coordinates.js` - The canonical coordinate module: every screen/SVG/image/data
    conversion, zoom-, expand-, render-size- and margin-aware. Also owns
    `getRenderDimensions` and `calculateVisibleDataRange`, which live here rather
    than in a component so `rendering/` and `core/` can use them without a cycle
  - `regionGeometry.js` - The region-zoom geometry: the selectable area, the
    free selection, the `contain` fit that decides the resulting view, and the
    clamp to the gram's edge. Pure functions over the viewport, so the rules an
    analyst feels are covered without a browser
  - `displayRange.js` - The contrast controls' arithmetic: the two ends never
    cross, and the linear transfer the filter is given
  - `axisFormat.js` - The one statement of "the tick interval decides the
    precision", shared by both axes and by the region-zoom span readout
  - `doppler.js` - Doppler-specific calculations
  - `harmonicSampling.js` - Pin sampling for dense harmonic sets
  - `markerLabel.js` - Marker label normalisation and table abbreviation
  - `tolerance.js` - Shared hit-test tolerances
  - `cursors.js` - The pointer's cursors. Feature drags use hollow corner
    brackets, never the opaque `grab`/`grabbing` hands, so the marker and the
    gram under the hotspot stay visible; panning keeps the hand
  - `labelPlate.js` - The white rounded plate every in-gram text label is drawn
    on, and the geometry the placement rules leave room for it with (issue #243)
  - `secureHTML.js` - Guidance-panel rendering without innerHTML. Builds DOM and
    nothing else; the deciding is `guidanceContent.js`'s
  - `timeFormatter.js` - Time formatting utilities
  - `guidanceContent.js` - What a mode's guidance says, as data: which sections
    it has and whether each line carries a trigger. Pure, so the unit lane
    covers the branches `secureHTML.js` cannot be loaded to exercise
  - `navigationGuidance.js` - The cross-mode navigation guidance text (wheel
    zoom and pan, the wheel-button drag, Shift + drag region zoom)
  - `version.js` - Version constant (injected at build time)
- `src/api/` - External API interface
- `tests/` - Playwright suite, `tests/unit/` Vitest lane, `tests/smoke/` WebKit smoke, `tests/fixtures/` test pages
- `sample/` - Sample HTML files for testing; `sample/audio/` holds four CC BY 4.0 machinery recordings (see its `ATTRIBUTION.md`) and `sample/player.html` plays them
- `scripts/wav2js.mjs` - Wraps a WAV as a `<script>`-loadable sidecar for `file://` pages
- `docs/archive/` - Development-history artefacts (not part of the component)
- `debug.html` - Development debug page

### Configuration System

Components are configured via HTML tables with class `gram-config`:
- First row contains `<img>` element with spectrogram image
- Subsequent rows define individual parameters: `time-start`, `time-end`, `freq-start`, `freq-end`
- Uses 2-column format: `parameter | value` (NOT the legacy 3-column format)
- Tables are automatically detected and replaced on page load

Example configuration:
```html
<table class="gram-config">
  <tr><td colspan="2"><img src="spectrogram.png"></td></tr>
  <tr><td>time-start</td><td>0</td></tr>
  <tr><td>time-end</td><td>60</td></tr>
  <tr><td>freq-start</td><td>0</td></tr>
  <tr><td>freq-end</td><td>20000</td></tr>
</table>
```

### Test Architecture

- **Playwright-based**: End-to-end tests covering all user interactions (`yarn test`)
- **Public API**: `tests/public-api.spec.js` exercises every documented API method
  behaviourally against a fixture that does **not** set `window.GRAMFRAME_DEBUG`,
  so it also catches the `__test__` hooks leaking onto a published page
- **Unit lane**: Vitest over pure-JS modules in `tests/unit/` (`yarn test:unit`)
- **Helper Classes**: `GramFramePage` class provides reusable test utilities
- **State Assertions**: Comprehensive state validation helpers
- **Debug API**: `__test__*` methods exist only on pages that set
  `window.GRAMFRAME_DEBUG = true` (the debug pages and `tests/fixtures/`), so
  they never ship in published material

There is no visual/screenshot regression testing — see
[Testing-Strategy.md](docs/Testing-Strategy.md) for what is and is not covered.

## Development Workflow

1. Use `yarn dev` for development with automatic browser refresh
2. Always run `yarn typecheck` before committing changes
3. Test changes with `yarn test` - all tests must pass
4. Component auto-initializes on page load via `DOMContentLoaded`
5. Use debug.html for isolated testing and state inspection

### Local environment notes

- **Open GitHub Codespaces in MS Edge, not Chrome.** The Codespace fails to
  open in Chrome on this machine; Edge opens it fine. Reach for Edge first
  rather than debugging Chrome.

## Important Implementation Notes

### Architecture
- **Modular Mode System**: Each mode (Pan, Analysis, Harmonics, Sidebands, Doppler) extends BaseMode
- **Feature Persistence**: FeatureRenderer coordinates cross-mode feature visibility
- **Factory Pattern**: ModeFactory centralizes mode instantiation and error handling
- **Separation of Concerns**: Clear separation between rendering, state, events, and UI

### Technical Details
- `state.frequencyRate` affects frequency calculations (it is the frequency divider). The player's `state.player.playbackRate` is a separate quantity; neither is named bare `rate`
- Axes have configurable margins (left: 60px, bottom: 50px)
- Harmonics are calculated dynamically during drag interactions
- `commitAnnotationChange()` in `src/core/state.js` is the cadence every
  annotation mutation follows — bump the revision, refresh the owning panel,
  re-render the overlay, dispatch. The caller passes only its own panel
  refresh, because that is the one part that differs (issue #264)
- A pin set's spacing floor is `MIN_PIN_SPACING`, and it is the same under the
  mouse and under the arrow keys. `PinSetMode.nudgeFreqUpdates` is not
  overridden by a subclass to raise it
- Every notification goes through `dispatch()` in `src/core/state.js`, which
  coalesces on a microtask by default and at animation-frame cadence for
  pointer/wheel/drag paths; `notifyStateListeners` is not exported to modes and
  an ESLint rule enforces that
- State is deep-copied before passing to listeners to prevent mutations — once
  per delivery, and not at all when no listener is registered
- HMR preserves state listeners across hot reloads
- Module size is a ratchet, not a wish. `hygiene-baseline.json` caps every module
  currently over the ~350-line SC-004 heuristic at its present size, and anything
  without a cap must stay under the default — so a new module cannot grow past
  the line and then be grandfathered in. Shrink one by ten lines or more and
  `yarn hygiene` asks you to lower its cap in the same PR (issue #265)
- Build output is unminified for field debugging (`minify: false` in vite.config.js)
- TypeScript checking with JSDoc annotations (no TypeScript compilation).
  `strict: true` with **no** per-flag disables since spec 167 — `noImplicitAny`,
  `strictNullChecks` and `strictPropertyInitialization` are all in force, so an
  unguarded `querySelector(...).classList` fails `yarn typecheck` (ADR-007)
- The version is injected from package.json by a Vite define; no build or test
  run writes to a tracked file
- Zoom resizes the image element (viewBox stays fixed) — see ADR-015
- `zoom.centerX/centerY` are not the centre of the view but the *anchor*: the
  image point that keeps its unzoomed screen position through the transform. A
  caller that wants a given point centred solves for the anchor —
  `viewport.js:zoomToRegion` does, via `anchorForCentre`
- Drag state has one owner (`BaseDragHandler`) and one read-only projection
  (`state.drag`); modes never write drag fields into state
- The engine hands `cursorFor(kind, phase)` a phase name (`idle`/`hover`/`drag`),
  not a ready-made CSS value, so a mode decides what its own drag kind looks
  like — pan keeps the hand, every feature drag takes the hollow brackets from
  `utils/cursors.js`. Hover goes through `applyCursor` like every other
  transition, so a mode's opinion covers it too
- The chosen cursor is applied to the **SVG root** (`BaseMode.updateCursorStyle`,
  inherited by every mode), never to the `<image>` inside it. `cursor` resolves
  on whatever element the pointer hits, and features are drawn over the image as
  its siblings — styling the image leaves the cursor unchanged over the very
  feature being aimed at
- Hit-test tolerance (`utils/tolerance.js`) is a pixel radius, not a data-space
  range: 8 rendered pixels on each axis at any zoom and any gram span. Clamps
  expressed in seconds and hertz cannot say "8 pixels" and silently shrank the
  grab region below the size of the drawn glyph
- `core/state.js` imports no mode. `ModeFactory.getModeInitialStates()` composes
  the initial-state slices and `createInitialState(modeStates)` receives them;
  mode slices are additive and can never overwrite a core key (ADR-014)
- Cross-module collaborators find modes by capability, never by name.
  Adding a mode touches `src/modes/` and `ModeFactory` — not `state.js`,
  `MainUI` or `FeatureRenderer` (ADR-017)
- Each initialization step declares what it needs and returns what it built; the
  constructor is the only place results are adopted onto the instance
- The instance surface is grouped: `instance.ui` (DOM handles), `instance.interaction`
  (selection and restyling), `instance.viewport` (resize watching) and
  `instance.persistence` (storage context). `state`, `configTable`,
  `stateListeners`, `instanceId`, `modes`, `currentMode` and `featureRenderer`
  stay flat — `state` deliberately so, since it is the broadcast state

### Audio-sourced instances (spec 168)
- The config table's first row holds `<audio src>` instead of `<img>`; six optional
  rows (`fft-size`, `hop-size`, `freq-start`, `freq-end`, `window-seconds`,
  `preserve-pitch`) set the analysis and playback. `core/configuration.js` parses
  both kinds
- The gram is one tall image of the whole recording: `config = [0, duration] ×
  [freq-start, freq-end]`, natural size = bins × frames, rendered at 900 × 400.
  `imageDetails.timeStretch` draws it `duration / window-seconds` times taller than
  the axes, and `state.player.viewTop` (the time at the top edge) positions it; both
  are applied in `svgLayout.applyZoomTransform`. Every transform in
  `utils/coordinates.js` reads the live element bounds, so nothing else changes
- The whole gram is drawn from load (spec 171, FR-005): `clampViewTop` is bounded
  by the duration, the image clip is the axes area, and nothing asks whether a
  time has been played before drawing at it — `isTimeRevealed` is gone
- While playing, `core/events.js` and `keyboardControl.js` hold **annotation**
  inert (spec 171, FR-017); a press-and-drag is a drag-seek instead
  (`player/dragSeek.js`: pause under the hand, resume from the released view,
  window-level listeners so a release off the component still resumes), wheel
  zoom works, and hover readouts still run. Shift + drag declines the drag-seek:
  region zoom while playing is not revived
- A press that never moves is a **click**, and means pause (FR-028): the same
  gesture with nothing in the middle, so it lives in `dragSeek.js` too. The
  other half of the toggle is Pan mode's alone — `PanMode` calls
  `resumeFromClick` (FR-029) — because everywhere else a click on a paused gram
  places a feature, and pause-then-annotate is the workflow the player is for
- Contrast (spec 171, US2) is two sliders on the transport bar over the *painted*
  8-bit levels — an SVG `feComponentTransfer`, so no re-analysis — and it is
  contrast, not a dB display range: what the percentile normalisation clipped
  when the PNG was painted is gone. `player.display` is view state like zoom:
  never persisted, never annotation data, absent from image instances
- A recording too tall for the render caps loads at the hop that fits, with a
  caption naming what changed (FR-023/FR-024); one too *wide* is still refused
- Playback rates are 0.25 to 4 and `preservesPitch` is assigned explicitly,
  default true, overridable per exercise by the `preserve-pitch` config row
- Samples cannot be fetched over `file://` (research.md §3.1): the loader falls back
  to a `<name>.wav.js` sidecar from `scripts/wav2js.mjs`. Web Audio is not used —
  the decoder is ours and playback is the `<audio>` element
- Annotation restore and the storage-save listener wait for `player.ready`, because
  the storage fingerprint needs the duration
- The expand toggle is mounted on a player at ready. `ExpandToggle` measures and
  restores from `baseRenderSize(instance)` (the 900 × 400 player area, not the
  bins × frames natural size) and leaves room for the transport bar

### Mode-Specific Features
- **Region zoom (every mode)**: Shift + left-drag a box to zoom to it (spec
  170). The box is free — any proportions — and the resulting view **contains**
  it: zoom is one isotropic level plus a centre, so the level is the smaller of
  what each axis needs, and the slack axis shows more of the gram beside the
  selection. (`contain`, not `cover`; cropping what was deliberately framed is
  the wrong way for a measurement tool to fail.) The overlay draws that
  resulting view as a second dashed outline, so what you draw is still what you
  get plus a stated remainder. The dimming stays on the **selection**: it
  followed the dashed view at first, but a mask that is a different shape from
  the box under the pointer reads as a second thing moving, and the box being
  drawn is the one being aimed. It clamps at 10× rather
  than refusing — visibly, since the preview is capped by the same limit — and
  a release over the axis margins completes it, deliberately unlike a feature
  drag, which is cancelled off-image, because selecting to the very edge is a
  normal thing to want. The **fit** button beside `+`/`−` is the way back out
- **Pan Mode**: The default mode; drag to pan when zoomed in, so a first click never places anything
- **The control row**: five columns — the mode rail, the armed mode's guidance,
  the cursor readouts, the style panel and the three annotation tables —
  separated by hairlines rather than boxed, so the readouts are the first read.
  The mode rail stacks the five tools with a glyph beside each word, and puts
  the view controls (zoom out, zoom in, fit) in a footer beneath them, where
  they stay whichever mode is armed: they act on the view, not on the tool. Fit
  shows a glyph in place of its word, keeping the word in a visually hidden span
  so the accessible name, and every test selector, is still "Fit" (issue #310).
  See [Control-Panel.md](docs/Control-Panel.md)
- **The style panel's twin tabs**: "New features" or "Selected: <name>" — the
  panel states what it is about to change, and the analyst can arm either
  without giving up their selection (`state.styleTarget`). One gate,
  `getSelectedFeature` in `core/featureStyle.js`, decides what a colour click
  actually does, so the tab and the behaviour cannot disagree
- **Marker labels** are edited in the style panel, in a field beside the same
  marker's colour and symbol. The per-row dialog is gone; clearing the field
  removes the label
- **Analysis Mode**: Persistent draggable markers whose grab region follows exactly
  what is drawn — a symbol marker has no crosshair arms to grab (issue #273) — with
  cross-mode visibility and optional
  plated text labels (upper-right of a crosshair, centred above a shaped symbol —
  below an upward-pointing triangle, whose apex points at the data above it)
- **Harmonics Mode**: Real-time harmonic calculation and display
- **Sidebands Mode**: A pin set with a user-placed origin — the fundamental —
  with members spread each side of it and labelled by signed offset
- **Doppler Mode**: Speed calculation from f+/f-/f₀ markers

## Active Technologies
- Markdown documentation (no code changes) + N/A (documentation-only feature) (154-enrich-docs)
- JavaScript (ES2020+, JSDoc-typed, no compilation) + None (zero runtime dependencies, Vite for build) (155-browser-storage)
- Browser Web Storage API (localStorage / sessionStorage) (155-browser-storage)
- JavaScript (ES2020+), JSDoc-typed, no compilation + None at runtime (zero runtime deps); Vite for build (156-expand-image-toggle)
- N/A — expand state is in-memory only (explicitly NOT browser storage) (156-expand-image-toggle)
- JavaScript (ES2020+), JSDoc-typed, no compilation step + None at runtime (zero runtime dependencies); Vite for build (157-student-tonal-expiry)
- Browser Web Storage API — `sessionStorage` (student), `localStorage` (trainer) (157-student-tonal-expiry)
- JavaScript ES2020+, JSDoc-typed (no TS compilation) + None at runtime (zero runtime deps); Vite for build (157-harmonic-pin-symbols)
- Browser Web Storage (localStorage for trainers / sessionStorage for students) (157-harmonic-pin-symbols)
- JavaScript ES2020+, JSDoc-typed (no TS compilation) + None at runtime (zero runtime deps); Vite for build (158-harmonic-pin-sampling)
- N/A — purely presentational; no persisted data or new state (158-harmonic-pin-sampling)
- JavaScript ES2020+, JSDoc-typed (no TS compilation) + None at runtime (zero runtime deps); Vite for build (161-reformat-markers-harmonics)
- Browser Web Storage — additive `symbol` field on markers; `cross` (symbol-less) default; no schema bump (161-reformat-markers-harmonics)
- JavaScript ES2020+, JSDoc-typed, no TypeScript compilation + None at runtime (zero runtime deps); Vite 5 for build (166-consolidation)
- Unchanged — Web Storage (`localStorage` trainer / `sessionStorage` student) (166-consolidation)
- Unchanged — Web Storage (`localStorage` trainer / `sessionStorage` student). No persisted-shape change in this phase. (167-structural-refactor)

## Recent Changes
- 172-control-panel: The upper control panel rebuilt to the design handoff — five hairline-separated columns, a mode rail with the view controls in its foot, a permanent collapsible guidance column, instrument-styled readouts, a twin-tab style panel that states its target, inverted selected rows, and a transport bar with time bookmarks
- 171-player-refinements: The whole gram from load (the reveal rule withdrawn), contrast controls, drag-to-seek and zoom while playing, a 0.25–4 rate ladder with explicit pitch, oversize recordings degraded rather than refused, and a polite transport live region
- 170-region-zoom: Shift-drag a box to zoom into it, in every mode, plus a Fit button and a live aspect-locked selection overlay
- 167-structural-refactor: Planned Phase 3 — strict type gate burn-down (540 errors), state⇄modes decoupling, table.js split, capability seams, shrunk instance surface
- 166-consolidation: Planned Phase 2 consolidation — one coordinate pipeline, one drag engine, batched notifications, one diffing table, deterministic tests
- 165-quick-fixes: Truthful published state and loud failures, dead-code sweep, docs corrected against the code
- 161-reformat-markers-harmonics: Added a `cross` (symbol-less) default style and in-place restyling of selected markers/harmonic sets (colour + symbol)
- 154-enrich-docs: Added Markdown documentation (no code changes) + N/A (documentation-only feature)
