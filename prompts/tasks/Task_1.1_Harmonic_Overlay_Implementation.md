# APM Task Assignment: Harmonic Overlay Implementation

## 1. Agent Role & APM Context

**Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame Harmonic Overlay Enhancement project.

**Your Role:** As an Implementation Agent, you are responsible for executing assigned tasks diligently and logging work meticulously. You will implement the interactive harmonic overlay functionality as specified in the technical requirements.

**Workflow:** You will interact with the Manager Agent (via the User) and must maintain comprehensive documentation in the Memory Bank for future reference and project continuity.

## 2. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to implementing the complete harmonic overlay functionality as detailed in `docs/Updated-Harmonics.md`.

**Objective:** Replace the current harmonics feature with a comprehensive interactive harmonic overlay system for the GramFrame spectrogram component that supports multiple simultaneous harmonic sets with persistent overlays, real-time drag interactions, and a management panel.

**Detailed Action Steps:**

### Phase 1: Harmonic Set Data Model & Storage
- **Implement HarmonicSet data structure** with properties:
  - `id`: string (unique identifier)
  - `color`: string (display color for lines) 
  - `anchorTime`: number (time position in seconds/ms)
  - `spacing`: number (frequency spacing in Hz)
- **Create harmonic sets collection** in the main GramFrame state to track multiple active sets
- **Implement color palette system** for auto-assigning distinct colors to new harmonic sets
- **Add state management methods** for adding, updating, and removing harmonic sets

### Phase 2: Harmonic Set Creation
- **Implement click-to-create functionality** when in 'Harmonics' mode:
  - Detect clicks on the spectrogram area
  - Calculate initial cursor position representing 10th harmonic (if frequency origin > 0) or 5th harmonic
  - Infer initial spacing from cursor position using coordinate transformations
  - Auto-assign color from rotating palette
  - Create new HarmonicSet instance and add to collection
- **Ensure harmonic lines persist** after mouse release (do not disappear)
- **E2E tests** to verify harmonics are created and persist after mouse release

### Phase 3: SVG Rendering System
Note: there is an existing system of harmonics rendering, which will be replaced by this new system.  But, much of the logic can be re-used.
- **Implement harmonic line rendering** as vertical SVG lines:
  - Calculate line positions using `x = spacing * n` for each harmonic in the visible frequency range
  - Restrict vertical extent to 20% of full SVG height for clutter reduction
  - Center lines vertically on the `anchorTime` position
  - Apply appropriate stroke color and styling
- **Coordinate transformation logic** is already present in repo for accurate positioning between screen, SVG, image, and data coordinates

### Phase 4: Drag Interaction System  
- **Implement hover detection** for harmonic lines with cursor changes to grab cursor
- **Implement click-and-drag functionality**:
  - Capture mouse down events on harmonic lines
  - Track mouse movement during drag operations
  - **Horizontal drag**: Update spacing property in real-time
  - **Vertical drag**: Update anchorTime property in real-time
  - Ensure the clicked harmonic remains under cursor during drag
  - Update harmonic line positions dynamically during drag
- **Implement drag constraint logic** to maintain proper harmonic relationships

### Phase 5: Harmonic Management Panel
- **Create side panel UI component** to display active harmonic sets in tabular format:
  - Color indicator (visual swatch or emoji)
  - Spacing value in Hz
  - Rate calculation (`cursor frequency / spacing`)
  - Delete button for each set
- **Implement delete functionality** that immediately removes sets from both display and state
- **Ensure panel updates** reflect real-time changes during drag operations
- **E2E tests** to verify display and delete functionality.

### Phase 6: Mode Management Integration
- **Integrate with existing mode system** to ensure harmonic functionality only active in 'Harmonics' mode
- **Implement mode cleanup** - delete all harmonic sets when user exits harmonics mode
- **Ensure proper state transitions** between modes

### Phase 7: Testing & Validation
- **Implement comprehensive test coverage** for all functionality, where not tested already:
  - Harmonic set creation and persistence
  - Real-time drag updates for spacing and anchor time
  - Multiple simultaneous harmonic sets
  - Management panel accuracy
  - Mode transitions and cleanup
  - Edge cases (frequency origin > 0, boundary conditions)

**Provide Necessary Context/Assets:**
- The main implementation should extend the existing `GramFrame` class in `src/main.js`
- Use the existing coordinate transformation utilities in `src/utils/`
- Follow established patterns for SVG manipulation and event handling
- Integrate with the existing state management and listener system
- The specification document at `docs/Updated-Harmonics.md` contains complete behavioral requirements
- Reference existing cursor and analysis functionality for implementation patterns

## 3. Expected Output & Deliverables

**Define Success:** The harmonic overlay system is fully functional with:
- Multiple harmonic sets can be created by clicking in harmonics mode
- Each set persists after creation with distinct colors
- Drag interactions update spacing and anchor time in real-time
- Management panel accurately displays and allows deletion of sets
- All harmonics clear when exiting harmonics mode
- No regression in existing GramFrame functionality

**Specify Deliverables:**
- Modified `src/main.js` with complete harmonic overlay implementation
- Updated CSS in `src/gramframe.css` for harmonic line styling and panel UI
- New utility functions in appropriate `src/utils/` modules if needed
- Comprehensive test cases covering all specified functionality
- All existing tests continue to pass

**Format:** Code should follow existing conventions in the codebase, use JSDoc type annotations, and maintain the established architecture patterns.

## 4. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's `Memory_Bank.md` file.

**Format Adherence:** Adhere strictly to the established logging format. Ensure your log includes:
- A reference to this assigned task and the Updated-Harmonics.md specification
- A clear description of the implementation approach and key architectural decisions
- Code snippets highlighting the core harmonic overlay functionality
- Any challenges encountered during coordinate system integration or drag interaction implementation
- Confirmation of successful execution including test results and functionality verification
- Notes on integration points with existing GramFrame systems

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. Pay particular attention to coordinate system transformations, SVG positioning logic, and integration with the existing GramFrame architecture if you need clarification on these aspects.