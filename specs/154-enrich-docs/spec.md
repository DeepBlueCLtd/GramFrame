# Feature Specification: Enrich Repository Documentation

**Feature Branch**: `154-enrich-docs`
**Created**: 2026-03-26
**Status**: Draft
**Input**: User description: "I want to enrich the repository with architecture and system documentation that will help onboard new developers."

## Clarifications

### Session 2026-03-26

- Q: Should 3 new use cases (add graphical feature, data persistence, debug rendering) be separate user stories or part of US1? → A: Separate user stories (US4, US5, US6)
- Q: For "add a new graphical feature" — full SVG pipeline walkthrough or mode extension pattern? → A: Generic code area guide — tips on areas they may need to touch, no prescriptive walkthrough
- Q: For "data stored/persisted" — state.js only or all persistence surfaces? → A: All persistence surfaces — state.js, config parsing, any session persistence
- Q: For "debug a rendering bug" — debugging workflow, code area map, or both? → A: Both — code area map plus debugging tips section

## User Scenarios & Testing *(mandatory)*

### User Story 1 - New Developer Understands the System (Priority: P1)

A new developer joins the project and needs to understand GramFrame's architecture, key patterns, and how components interact — without reading every source file. They navigate to a central architecture document that provides a high-level map of the system: the mode system, rendering pipeline, state management, coordinate transforms, and configuration parsing.

**Why this priority**: Without a clear architectural overview, new developers waste significant time reverse-engineering the system from code, and risk making changes that violate established patterns.

**Independent Test**: A developer unfamiliar with GramFrame can read the architecture documentation and correctly answer: "Where does cursor rendering happen?", "How do modes communicate?", and "How does config get parsed?" — without opening source files.

**Acceptance Scenarios**:

1. **Given** a new developer with JavaScript experience, **When** they read the architecture documentation, **Then** they can identify the purpose and location of each major subsystem (modes, rendering, state, configuration, coordinates).
2. **Given** a developer looking to add a new mode, **When** they consult the architecture documentation, **Then** they can identify the BaseMode contract, ModeFactory registration, and the file structure convention without reading existing mode implementations.

---

### User Story 2 - Developer Sets Up Local Environment (Priority: P2)

A new contributor clones the repository and needs to get a working development environment running. They follow a getting-started guide that covers prerequisites, setup commands, development workflow, and how to run tests.

**Why this priority**: A smooth setup experience is the first gate to contribution. If developers cannot get running quickly, they disengage.

**Independent Test**: A developer with Node.js installed can follow the guide from clone to running `yarn dev` and `yarn test` successfully, with no undocumented steps.

**Acceptance Scenarios**:

1. **Given** a developer who has just cloned the repo, **When** they follow the getting-started guide step by step, **Then** they have a working dev server and passing test suite within 15 minutes.
2. **Given** a developer unfamiliar with the project's tooling, **When** they consult the guide, **Then** they understand the role of Vite, Playwright, and JSDoc type checking in the workflow.

---

### User Story 3 - Developer Understands How to Embed GramFrame (Priority: P3)

A developer or content author needs to embed a GramFrame instance in an HTML page. They consult an integration guide that explains the HTML table configuration format, required parameters, and common customization options.

**Why this priority**: GramFrame's value is realized through embedding. If integration is unclear, adoption stalls.

**Independent Test**: A non-developer with basic HTML knowledge can follow the integration guide to embed a working spectrogram viewer in a standalone HTML page.

**Acceptance Scenarios**:

1. **Given** a content author with HTML knowledge, **When** they follow the integration guide, **Then** they can create a page with a functioning GramFrame spectrogram viewer using only HTML.
2. **Given** a developer embedding multiple instances, **When** they consult the guide, **Then** they understand how to configure independent instances on a single page with different parameters.

---

### User Story 4 - Developer Adds a New Graphical Feature (Priority: P4)

A developer is tasked with adding a new interactive graphical feature (e.g., a new overlay, annotation type, or visual indicator). They consult a code area guide that identifies the key files and subsystems they are likely to touch: SVG rendering utilities, coordinate transforms, event handling, mode registration, and the FeatureRenderer.

**Why this priority**: New graphical features are the most common extension point. Without a guide to relevant code areas, developers waste time navigating an unfamiliar codebase and risk duplicating existing utilities.

**Independent Test**: A developer tasked with adding a new visual overlay can identify the 3-5 source files they need to understand or modify, using only the documentation.

**Acceptance Scenarios**:

1. **Given** a developer who needs to add a new SVG overlay, **When** they consult the code area guide, **Then** they can identify the relevant rendering files, coordinate utilities, and event handlers without reading the entire `src/` tree.
2. **Given** a developer unfamiliar with the coordinate system, **When** they consult the guide, **Then** they understand the transform chain (screen → SVG → image → data) and where each transform is implemented.

---

### User Story 5 - Developer Interacts with Data Persistence (Priority: P5)

A developer needs to understand how GramFrame stores and manages data — runtime state, configuration parsing, and any session persistence. They consult a data and state guide that maps all persistence surfaces: the centralized state in `state.js`, the HTML table configuration parser, and any mechanisms for persisting user annotations or settings across sessions.

**Why this priority**: State management touches every feature. Misunderstanding the deep-copy contract or listener pattern leads to subtle mutation bugs.

**Independent Test**: A developer can identify where a given piece of data (e.g., current mode, marker positions, frequency range) is stored and how it flows through the system, using only the documentation.

**Acceptance Scenarios**:

1. **Given** a developer who needs to persist a new piece of user data, **When** they consult the data/state guide, **Then** they can identify the correct persistence surface (state.js, config table, or other) and the pattern for reading/writing it.
2. **Given** a developer debugging unexpected state, **When** they consult the guide, **Then** they understand the listener pattern, deep-copy contract, and how to trace state changes.

---

### User Story 6 - Developer Debugs a Rendering Bug (Priority: P6)

A developer is investigating a bug where an annotation or overlay isn't rendered correctly. They consult a rendering troubleshooting guide that provides both a "where to look" map of rendering code areas and common failure points, plus practical debugging tips for inspecting SVG elements and coordinate transforms in the browser.

**Why this priority**: Rendering bugs in an SVG/coordinate-transform system are notoriously hard to diagnose without knowing the rendering pipeline. A targeted guide prevents hours of trial-and-error.

**Independent Test**: A developer investigating a mispositioned annotation can narrow the issue to the correct subsystem (coordinate transform, SVG rendering, state, or event handling) within 10 minutes using the guide.

**Acceptance Scenarios**:

1. **Given** a developer seeing a mispositioned overlay, **When** they consult the troubleshooting guide, **Then** they can identify whether the issue is in coordinate transforms, SVG element construction, state values, or event handling.
2. **Given** a developer unfamiliar with browser SVG debugging, **When** they consult the guide, **Then** they know how to inspect SVG elements, check computed coordinates, and use the debug page (`debug.html`) for isolated testing.

---

### Edge Cases

- What happens when existing documentation conflicts with new architecture docs? Existing docs MUST be reconciled or marked as superseded.
- How are ADRs (Architecture Decision Records) referenced? New docs MUST cross-reference relevant ADRs rather than duplicating their content.
- What if the codebase changes after documentation is written? Docs MUST include version/date stamps and a note on how to verify currency.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Repository MUST contain a high-level architecture document describing all major subsystems and their interactions.
- **FR-002**: Repository MUST contain a getting-started guide covering prerequisites, installation, development commands, and test execution.
- **FR-003**: Repository MUST contain an integration/embedding guide explaining the HTML table configuration contract with working examples.
- **FR-004**: Architecture documentation MUST include a visual or textual system diagram showing component relationships.
- **FR-005**: All new documentation MUST cross-reference existing ADRs where relevant rather than restating decisions.
- **FR-006**: Documentation MUST be written in Markdown and placed in the `docs/` directory (or updated in-place if a suitable document already exists).
- **FR-007**: The repository README MUST link to all new documentation for discoverability.
- **FR-008**: Repository MUST contain a code area guide for adding new graphical features, identifying key files across rendering, coordinates, events, and mode registration.
- **FR-009**: Repository MUST contain a data and state guide covering all persistence surfaces (runtime state, configuration parsing, session persistence).
- **FR-010**: Repository MUST contain a rendering troubleshooting guide with both a code area map and practical debugging tips for SVG/coordinate issues.

### Key Entities

- **Architecture Document**: High-level system overview covering modes, rendering, state, events, configuration, and coordinate systems.
- **Getting-Started Guide**: Step-by-step setup and development workflow instructions.
- **Integration Guide**: HTML embedding instructions with configuration reference and examples.
- **Code Area Guide**: Map of key files and subsystems relevant to adding new graphical features.
- **Data & State Guide**: Overview of all persistence surfaces and the state management pattern.
- **Rendering Troubleshooting Guide**: Code area map for rendering pipeline plus debugging tips for SVG and coordinate issues.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new developer can identify the correct source file for any given system behavior (e.g., "where are cursors rendered?") within 2 minutes using only the documentation.
- **SC-002**: A new contributor can go from clone to running dev server and passing tests by following documentation alone, with zero undocumented steps.
- **SC-003**: A content author can embed a working GramFrame instance in a new HTML page using only the integration guide, without consulting source code.
- **SC-004**: All new documentation cross-references at least one existing ADR where applicable.
- **SC-005**: A developer tasked with a new graphical feature can identify the relevant source files to modify within 5 minutes using the code area guide.
- **SC-006**: A developer can trace the storage location and data flow for any piece of runtime state using the data/state guide alone.
- **SC-007**: A developer investigating a rendering bug can narrow the issue to the correct subsystem within 10 minutes using the troubleshooting guide.

## Assumptions

- Target audience is developers with JavaScript experience but no prior GramFrame knowledge.
- Existing ADRs (ADR-001 through ADR-015) are accurate and current — new docs will reference rather than replace them.
- The `docs/` directory is the canonical location for project documentation.
- Some existing docs (e.g., `docs/Tech-Architecture.md`, `docs/HTML-Integration-Guide.md`) may already partially cover these topics and should be assessed for enrichment rather than replacement.
- Documentation does not need to cover deployment or CI/CD (out of scope for this feature).
- The code area and troubleshooting guides are reference-style documents (tips and pointers), not step-by-step tutorials.
