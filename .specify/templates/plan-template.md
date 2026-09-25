# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: JavaScript (ES2020+), JSDoc-typed, no compilation step
**Primary Dependencies**: None at runtime (zero runtime dependencies); Vite 5 for build
**Storage**: Browser Web Storage — `localStorage` (trainer) / `sessionStorage` (student)
**Testing**: Playwright (`yarn test`) and Vitest (`yarn test:unit`)
**Target Platform**: Evergreen browsers, including pages served over `file://`
**Project Type**: Library — a single-bundle browser component
**Performance Goals**: [feature-specific, or N/A]
**Constraints**: [feature-specific, e.g. no new runtime dependency; module caps in `hygiene-baseline.json`]
**Scale/Scope**: [feature-specific, or N/A]

The first six lines are the repository's constants. Restate them verbatim unless
this feature changes one, so the agent context file collects one entry rather
than a differently worded copy per feature. A feature that stores nothing says
`N/A` for Storage; the context script records nothing for that.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Gates determined based on constitution file]

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── main.js, index.js     # the GramFrame class and the entry point
├── core/                 # state, events, viewport, configuration, storage, selection
├── modes/                # one directory per mode; shared/ holds the drag engine and pin sets
├── components/           # the control row, tables, panels, transport bar
├── rendering/            # axes, symbols, labels, overlays — draw only, never dispatch
├── audio/ and player/    # the audio-sourced instance: decode → analyse → paint, and playback
└── utils/                # coordinates, geometry, formatting — pure functions

tests/            # Playwright specs; helpers/, unit/ (Vitest), smoke/ (WebKit), fixtures/
sample/, demo/    # sample pages, and the demo pages at their published paths
docs/ADRs/        # architecture decisions
```

**Structure Decision**: [Which of these directories this feature touches, and
any new module — each new module also needs its `CLAUDE.md` file-list entry]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
