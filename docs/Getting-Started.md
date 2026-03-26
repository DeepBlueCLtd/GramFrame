# Getting Started

**Last updated**: 2026-03-26

This guide covers everything needed to set up a GramFrame development environment, from cloning the repository to running tests.

## Prerequisites

- **Node.js** — v18 or later (check with `node --version`)
- **Yarn** — v1.22+ (bundled via `packageManager` field in `package.json`; install with `corepack enable`)
- **A modern browser** — Required by Playwright for end-to-end testing (Chromium is installed automatically)

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/DeepBlueCLtd/GramFrame.git
cd GramFrame

# 2. Install dependencies
yarn install

# 3. Install Playwright browsers (first time only)
npx playwright install

# 4. Start the development server
yarn dev
```

Vite will start a dev server (typically at `http://localhost:5173`). Open it in your browser to see the sample spectrogram pages from `sample/`.

## Development Workflow

### Hot Reload

GramFrame uses Vite for development. Changes to source files in `src/` trigger an automatic browser refresh. State listeners are preserved across hot reloads (see [ADR-006](ADRs/ADR-006-Hot-Module-Reload-Support.md)).

### Debug Page

Open `debug.html` (served by Vite at `/debug.html`) for isolated testing. This page includes a live state display panel that shows the full GramFrame state as JSON, updated in real time as you interact with the component.

### Sample Pages

The `sample/` directory contains HTML pages with pre-configured GramFrame instances. These are useful for manual testing and as examples of different configuration setups.

## Essential Commands

| Command | Purpose |
|---------|---------|
| `yarn dev` | Start Vite dev server with hot reload |
| `yarn build` | Build for production (output in `dist/`) |
| `yarn test` | Run all Playwright end-to-end tests |
| `yarn typecheck` | Run TypeScript type checking via JSDoc annotations |

### Running Individual Tests

```bash
# Run a specific test file
npx playwright test tests/phase1.spec.ts

# Run tests matching a pattern
npx playwright test -g "mode switching"

# Run tests with the Playwright UI (interactive)
npx playwright test --ui

# Debug a specific test (step through in browser)
npx playwright test tests/mode-switching.spec.ts --debug
```

## Tooling Overview

| Tool | Role | Config File |
|------|------|-------------|
| **Vite** | Dev server, bundler, HMR | `vite.config.js` |
| **Playwright** | End-to-end browser testing | `playwright.config.ts` |
| **TypeScript** | Type checking (via JSDoc, no compilation) | `tsconfig.json` |
| **JSDoc** | Type annotations in JavaScript source | `src/types.js` |
| **Husky** | Git hooks (pre-commit checks) | `.husky/` |

GramFrame uses JSDoc annotations with TypeScript checking rather than compiling TypeScript. See [ADR-007](ADRs/ADR-007-JSDoc-TypeScript-Integration.md). Type definitions live in `src/types.js`.

The production build is intentionally **unminified** to support field debugging. See [ADR-010](ADRs/ADR-010-Unminified-Production-Build.md).

## Project Structure

```
GramFrame/
├── src/
│   ├── index.js              # Entry point, CSS import, global export
│   ├── main.js               # GramFrame class, initialization, HMR
│   ├── types.js              # JSDoc type definitions
│   ├── gramframe.css          # Component styles
│   ├── api/                   # Public API (GramFrameAPI.js)
│   ├── core/                  # State, events, config, FeatureRenderer
│   ├── modes/                 # BaseMode + Analysis/Harmonics/Doppler/Pan
│   ├── components/            # UI components (LEDs, panels, buttons)
│   ├── rendering/             # SVG cursor and feature rendering
│   └── utils/                 # Coordinates, calculations, SVG helpers
├── tests/                     # Playwright test suite
├── sample/                    # Sample HTML pages
├── docs/                      # Developer documentation and ADRs
├── debug.html                 # Development debug page
├── vite.config.js             # Vite configuration
└── package.json               # Dependencies and scripts
```

## Testing

Tests use Playwright for end-to-end browser testing. See [Testing-Strategy.md](Testing-Strategy.md) for the full testing approach.

The test suite includes:
- **State assertions** — Validate GramFrame state after interactions
- **Visual tests** — Screenshot comparisons for UI consistency
- **Helper utilities** — `GramFramePage` class provides reusable test helpers

Before committing, always run:

```bash
yarn test && yarn typecheck && yarn build
```

## Next Steps

- [Tech-Architecture.md](Tech-Architecture.md) — System architecture overview
- [HTML-Integration-Guide.md](HTML-Integration-Guide.md) — Embedding GramFrame in HTML pages
- [Adding-Graphical-Features.md](Adding-Graphical-Features.md) — Guide to extending visual features
- [Data-and-State-Guide.md](Data-and-State-Guide.md) — State management patterns
- [Rendering-Troubleshooting.md](Rendering-Troubleshooting.md) — Debugging rendering issues
