# Research: Enrich Repository Documentation

**Branch**: `154-enrich-docs` | **Date**: 2026-03-26

## Existing Documentation Assessment

### docs/Tech-Architecture.md — ENRICH for US1

- **Current state**: Shallow overview covering initialization, structure, state management, and public API methods.
- **Gaps**: Missing subsystem interaction diagram, coordinate transform pipeline, mode system internals, FeatureRenderer role, event handling flow.
- **Decision**: Enrich in-place with full architecture guide content.
- **Rationale**: Existing file is the natural home for architecture docs; replacing avoids orphaned links.
- **Alternatives considered**: New file `Architecture-Guide.md` — rejected to avoid split/duplication.

### docs/HTML-Integration-Guide.md — ENRICH for US3

- **Current state**: 3-step integration walkthrough for basic single-instance embedding.
- **Gaps**: No multi-instance examples, no parameter reference table, no troubleshooting section.
- **Decision**: Enrich in-place with expanded examples and parameter reference.
- **Rationale**: Existing guide is well-structured; additive changes preserve existing links.
- **Alternatives considered**: Separate "Advanced Integration" doc — rejected as unnecessary split.

### docs/GramFrame-Walkthrough.md — NO CHANGE

- **Current state**: End-user facing, polished step-by-step guide.
- **Decision**: Leave as-is. This targets end users, not developers.

### docs/Gram-Modes.md — REFERENCE ONLY

- **Current state**: Analysis mode interaction spec; Doppler underdeveloped.
- **Decision**: Reference from architecture guide (US1) but do not modify. Mode-specific detail belongs here; architecture guide provides the high-level map.

### docs/Testing-and-QA.md, Testing-Strategy.md — NO CHANGE

- **Decision**: Referenced from Getting-Started guide (US2) for test workflow. Not modified.

### docs/Component-Strategy.md — REFERENCE ONLY

- **Decision**: Cross-reference from rendering troubleshooting guide (US6) for resize/redraw context.

### README.md — UPDATE

- **Current state**: Landing page with features and basic usage.
- **Gaps**: No documentation index or links to developer guides.
- **Decision**: Add a "Documentation" section with links to all guides.

## New Documents Required

| Document | User Story | Purpose |
|----------|-----------|---------|
| `docs/Getting-Started.md` | US2 | Prerequisites, clone, install, dev server, tests, tooling overview |
| `docs/Adding-Graphical-Features.md` | US4 | Code area map for SVG rendering, coordinates, events, modes |
| `docs/Data-and-State-Guide.md` | US5 | State.js patterns, config parsing, persistence surfaces |
| `docs/Rendering-Troubleshooting.md` | US6 | Rendering pipeline map, coordinate pitfalls, SVG debugging tips |

## ADR Cross-Reference Map

| ADR | Relevant To |
|-----|-------------|
| ADR-001 SVG-Based Rendering | US1 (architecture), US4 (graphical features), US6 (troubleshooting) |
| ADR-002 Multiple Coordinate Systems | US1 (architecture), US4 (graphical features), US6 (troubleshooting) |
| ADR-004 Centralized State Management | US1 (architecture), US5 (data/state) |
| ADR-005 HTML Table Configuration | US1 (architecture), US3 (integration) |
| ADR-008 Modular Mode System | US1 (architecture), US4 (graphical features) |
| ADR-010 Unminified Production Build | US2 (getting started) |
| ADR-011 Feature Renderer | US1 (architecture), US4 (graphical features) |
| ADR-013 File Protocol Compatibility | US3 (integration) |

## Key Decisions

1. **Enrich over replace**: Existing docs (`Tech-Architecture.md`, `HTML-Integration-Guide.md`) are enriched in-place to preserve external links and git history.
2. **Reference over duplicate**: ADR content is cross-referenced, never restated.
3. **Developer audience**: All new docs target JavaScript developers, not end users (end-user docs already exist in `GramFrame-Walkthrough.md`).
4. **No code changes**: This feature is documentation-only. No source files modified.
