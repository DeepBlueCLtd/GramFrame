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

# Type checking
yarn typecheck
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
- **Mode System**: Modular architecture with five modes — Pan (default), Analysis, Harmonics, Sidebands and Doppler
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
- `src/core/` - Core system modules:
  - `state.js` - State management and listeners
  - `events.js` - Mouse/wheel event handling and listener teardown
  - `viewport.js` - Zoom, pan and axis updates
  - `configuration.js` - Config table parsing
  - `storage.js` - Annotation persistence (local/sessionStorage)
  - `keyboardControl.js` - Arrow-key control, selection and restyling
  - `FocusManager.js` - Which instance receives keyboard input
  - `FeatureRenderer.js` - Cross-mode feature rendering
  - `browserCompatibility.js` - Legacy-browser feature detection and warning
  - `initialization/` - `DOMSetup.js`, `UISetup.js`, `EventBindings.js`, `ModeInitialization.js`
- `src/modes/` - Mode system architecture:
  - `BaseMode.js` - Abstract base class for all modes
  - `ModeFactory.js` - Mode instantiation factory
  - `analysis/AnalysisMode.js` - Analysis mode with marker persistence
  - `harmonics/HarmonicsMode.js` - Harmonics calculation mode (a `PinSetMode`)
  - `harmonics/ManualHarmonicModal.js` - Manual harmonic-spacing dialog
  - `sideband/SidebandMode.js` - Sidebands mode: a pin set whose origin the
    analyst places (a `PinSetMode`)
  - `doppler/DopplerMode.js` - Doppler speed calculation mode
  - `pan/PanMode.js` - Pan mode (the default mode)
  - `capabilities.js` - Duck-typed mode capabilities (`PersistentFeatureProvider`,
    `PanelOwner`, `PinSetOwner`) and their predicates. How `FeatureRenderer` and `MainUI` find
    what a mode can do without naming it (ADR-017)
  - `shared/BaseDragHandler.js` - The shared drag engine: every pointer drag (move, create, place, pan) and the single `state.drag` projection
  - `shared/PinSetMode.js` - The shared pin-set mode: pin geometry, the
    label/symbol stack, hit testing, rendering, drag wiring and set
    add/update/remove for Harmonics and Sidebands. A subclass supplies only
    where its sets live and what frequency a member index maps to
- `src/components/` - UI component modules:
  - `UIComponents.js` - LED displays, colour picker and layout helpers
  - `MainUI.js` - Unified layout and persistent panels
  - `ModeButtons.js` - Mode switching interface
  - `HarmonicPanel.js` - Harmonics display panel
  - `SidebandPanel.js` - Sidebands display panel (shares the right-hand column
    with the harmonics panel, one shown at a time)
  - `DiffingTable.js` - Shared row-diffing table behind the markers table and harmonics panel
  - `ColorPicker.js` - Colour selection component
  - `SymbolPicker.js` - Symbol selection component
  - `MarkerLabelModal.js` - Add/edit/remove a marker's label
  - `PinToggle.js` - Harmonic-pin visibility toggle
  - `ExpandToggle.js` - Expand/collapse the image to fill the space
  - `StorageWarning.js` - Non-blocking banner when a save fails
  - `LEDDisplay.js` - Digital display component
  - `table.js` - Component scaffold: builds the DOM structure and replaces the
    config table. Nothing else — its five other responsibilities were split out
    (ADR-018), and it is imported by exactly one module, `DOMSetup.js`
  - `spectrogramImage.js` - Spectrogram image load and scaling
  - `svgLayout.js` - SVG layout, viewBox and zoom-transform application
- `src/rendering/` - Rendering system. These modules draw; they do not dispatch:
  - `axes.js` - The axis engine: `renderAxes` and its private tick/label helpers
  - `symbols.js` - Marker/harmonic symbol shapes
  - `labels.js` - Marker label placement and element (feature 231)
- `src/utils/` - Utility modules:
  - `coordinates.js` - The canonical coordinate module: every screen/SVG/image/data
    conversion, zoom-, expand-, render-size- and margin-aware. Also owns
    `getRenderDimensions` and `calculateVisibleDataRange`, which live here rather
    than in a component so `rendering/` and `core/` can use them without a cycle
  - `calculations.js` - Mathematical calculations
  - `doppler.js` - Doppler-specific calculations
  - `harmonicSampling.js` - Pin sampling for dense harmonic sets
  - `markerLabel.js` - Marker label normalisation and table abbreviation
  - `tolerance.js` - Shared hit-test tolerances
  - `cursors.js` - The pointer's cursors. Feature drags use hollow corner
    brackets, never the opaque `grab`/`grabbing` hands, so the marker and the
    gram under the hotspot stay visible; panning keeps the hand
  - `svg.js` - SVG text halo styling
  - `secureHTML.js` - Guidance-panel rendering without innerHTML
  - `timeFormatter.js` - Time formatting utilities
  - `wheelGuidance.js` - Wheel navigation guidance text
  - `version.js` - Version constant (injected at build time)
- `src/api/` - External API interface
- `tests/` - Playwright suite, `tests/unit/` Vitest lane, `tests/smoke/` WebKit smoke, `tests/fixtures/` test pages
- `sample/` - Sample HTML files for testing
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
- Rate affects frequency calculations (acts as frequency divider)
- Axes have configurable margins (left: 60px, bottom: 50px)
- Harmonics are calculated dynamically during drag interactions
- Every notification goes through `dispatch()` in `src/core/state.js`, which
  coalesces on a microtask by default and at animation-frame cadence for
  pointer/wheel/drag paths; `notifyStateListeners` is not exported to modes and
  an ESLint rule enforces that
- State is deep-copied before passing to listeners to prevent mutations — once
  per delivery, and not at all when no listener is registered
- HMR preserves state listeners across hot reloads
- Build output is unminified for field debugging (`minify: false` in vite.config.js)
- TypeScript checking with JSDoc annotations (no TypeScript compilation).
  `strict: true` with **no** per-flag disables since spec 167 — `noImplicitAny`,
  `strictNullChecks` and `strictPropertyInitialization` are all in force, so an
  unguarded `querySelector(...).classList` fails `yarn typecheck` (ADR-007)
- The version is injected from package.json by a Vite define; no build or test
  run writes to a tracked file
- Zoom resizes the image element (viewBox stays fixed) — see ADR-015
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

### Mode-Specific Features
- **Pan Mode**: The default mode; drag to pan when zoomed in, so a first click never places anything
- **Analysis Mode**: Persistent draggable markers with cross-mode visibility and optional
  haloed text labels (upper-right of a crosshair, centred above a shaped symbol)
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
- 167-structural-refactor: Planned Phase 3 — strict type gate burn-down (540 errors), state⇄modes decoupling, table.js split, capability seams, shrunk instance surface
- 166-consolidation: Planned Phase 2 consolidation — one coordinate pipeline, one drag engine, batched notifications, one diffing table, deterministic tests
- 165-quick-fixes: Truthful published state and loud failures, dead-code sweep, docs corrected against the code
- 161-reformat-markers-harmonics: Added a `cross` (symbol-less) default style and in-place restyling of selected markers/harmonic sets (colour + symbol)
- 154-enrich-docs: Added Markdown documentation (no code changes) + N/A (documentation-only feature)
