# APM Task Assignment: Persistent Gram Features

## 1. Task Overview
Modify GramFrame so that features (such as markers and harmonic sets) created in one mode (analysis, harmonics, or doppler) remain visible and persistent when switching between modes. Features should no longer be deleted or hidden when changing modes. Instead, all features should be visible across all modes, supporting workflows where reference points are needed in multiple contexts.

## 2. Context & Current State
- Currently, GramFrame supports three modes: `analysis`, `harmonics`, and `doppler`.
- Each mode allows analysts to create persistent features (e.g., markers, harmonic sets) on the spectrogram.
- Switching modes currently deletes features created in the previous mode.
- Stakeholders require that features remain visible and accessible when switching modes, to facilitate cross-mode reference and annotation workflows.
- The UI currently removes and replaces mode-specific components on mode switch, which contributes to feature loss.

## 3. Requirements
- **Persistence:** Features created in any mode must remain visible and persistent when switching to another mode.
- **Visibility:** All features should be visible in all modes. For example, markers added in `analysis` mode must be visible in `harmonics` and `doppler` modes, and vice versa.
- **Deletion:** Users must still be able to delete features, but only via the table UI in the mode where the feature was created (e.g., delete markers via the analysis table, harmonic sets via the harmonics table).
- **In-Memory Data Structure:** Refactor the in-memory data management so that mode-specific datasets persist across mode switches, rather than being reset or lost when the UI changes.
- **UI Consistency:** Ensure that switching modes does not remove or reset persistent features from the display, even if UI components are replaced.

## 4. Implementation Guidance
- Review and refactor the relevant state/data structures to ensure features are not lost on mode switch.
- Update the mode-switching logic to preserve and display all persistent features, regardless of the current mode.
- Maintain the existing workflow for deleting features via the appropriate mode’s table UI.
- **Consider core changes:** Evaluate whether updates to the core `BaseMode` class (`src/modes/BaseMode.js`) are required to support persistent, cross-mode features and shared state. Ensure any common logic is placed at the appropriate abstraction level.
- Add or update tests to verify that features persist and remain visible across all modes, and that deletion works as specified.
- Log all significant state changes and mode transitions for debugging and traceability.
- **Update the project memory log:** For every feature creation, deletion, and mode switch event, record a structured entry in the memory log. Each entry should include: timestamp, event type (creation, deletion, mode switch), feature ID(s), mode name(s), and any relevant context. Ensure the memory log is easily accessible for future agents or stakeholders.

## 5. Acceptance Criteria
- Switching modes does not delete or hide any previously created features.
- All features are visible in all modes.
- Features can only be deleted through their respective mode’s table UI.
- No regression in existing feature creation or deletion workflows.
- State changes and mode transitions are logged.
- **The memory log is updated for all feature creation, deletion, and mode switch events, with sufficient detail for future reference.**

## 6. Logging & Memory Log Instructions
- Log all feature creation, deletion, and mode switch events, including relevant feature IDs and mode names, both in the console/debug log and in the project memory log.
- Each memory log entry must include: timestamp, event type, feature ID(s), mode name(s), and any relevant context.
- Ensure logs and memory log entries are clear, structured, and accessible for debugging, auditing, and onboarding future agents.

## 7. Expected Files & Methods to Change
- `src/modes/BaseMode.js`: Core mode lifecycle and shared state logic (e.g., `activate`, `deactivate`, and state management)
- Mode subclass files, e.g.:
  - `src/modes/analysis/AnalysisMode.js`
  - `src/modes/harmonics/HarmonicsMode.js`
  - `src/modes/doppler/DopplerMode.js`
- Any files managing persistent feature state or memory log utilities
- Associated UI components if they directly manage feature visibility or deletion tables

## 8. References
- [Issue #47: Persistent gram features](https://github.com/DeepBlueCLtd/GramFrame/issues/47)
- Implementation Plan and related documentation as needed.
