# APM Task Assignment: E2E Tests for Doppler Mode Feature

## 1. Agent Role & APM Context

You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project.

**Your Role:** Implement comprehensive end-to-end (E2E) tests for the Doppler Mode feature, ensuring all user workflows, UI behaviors, and calculations function as specified. Log your work meticulously.

**Workflow:** Interact with the Manager Agent (via the User) as needed and use the project's Memory Bank for all logging and context continuity.

---

## 2. Onboarding / Context from Prior Work

- The Doppler Mode feature enables users to fit a Doppler curve on a spectrogram, interact with draggable markers, and receive real-time speed estimates. Implementation details are in `docs/Doppler-Calc.md` and `prompts/tasks/Doppler-Calc-Task-Assignment.md`.
- Prior work includes the full implementation of Doppler Mode, including marker placement, curve drawing, speed calculation, mode switching, and UI overlays.
- The diagnostics panel, responsive layout, and spectrogram image handling are already in place.
- E2E testing infrastructure is to be built using Playwright (see GramFrame Implementation Progress memory).
- The `src` directory contains the main codebase, including components, core logic, rendering, and utilities.

---

## 3. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to the E2E testing phase for the Doppler Curve-Based Speed Estimation Tool in the GramFrame Implementation Plan.

**Objective:** Design and implement E2E tests that verify the complete Doppler Mode user workflow and all critical behaviors, as described in the Doppler-Calc spec.

**Detailed Action Steps:**

1. **Test Environment Setup:**
   - Ensure Playwright is installed as a dev dependency.
   - Set up Playwright configuration for the GramFrame project, targeting the debug/dev harness page.

2. **Doppler Mode Activation:**
   - Test that Doppler Mode can be activated via the mode selector.
   - Verify that all Doppler-specific UI elements (markers, curve, readout) are hidden when not in Doppler mode.

3. **Marker Placement & Dragging:**
   - Simulate user placing `f+` (red) and `f−` (blue) markers by clicking/dragging on the spectrogram.
   - Test that markers appear at the correct positions and are draggable.
   - Verify that the inflexion (`f₀`, green cross-hair) appears at the midpoint and is draggable.

4. **Curve and Guide Rendering:**
   - Test that the S-shaped Doppler curve is drawn between `f−` and `f+`, and updates in real time as markers move.
   - Verify vertical guide lines extend from `f+` and `f−` to the panel edges.

5. **Speed Calculation & Display:**
   - Test that the speed readout updates live as markers are moved.
   - Validate that speed calculations match expected values for known marker placements (use the formula: Δf = (f+ - f−)/2, v = (c/f₀) × Δf, c = 1500 m/s).

6. **Reset & Mode Change:**
   - Test that clicking the reset button clears all markers and overlays.
   - Verify that switching out of Doppler mode disables the tool and clears all Doppler overlays.

7. **Bounds & UX:**
   - Test that markers cannot be placed or dragged outside the spectrogram bounds.
   - Verify pointer/cursor changes (e.g., to `grab` when over markers).
   - Test for smooth, low-latency updates during drag operations.

8. **Accessibility & Responsiveness:**
   - Verify that the feature works correctly on different screen sizes.
   - Test keyboard navigation and accessibility where applicable.

**Guidance:**
- Reference the Doppler-Calc spec (`docs/Doppler-Calc.md`) for all expected behaviors and UI details.
- Use selectors and test IDs that are robust to UI changes.
- Ensure tests are clear, maintainable, and cover both typical and edge-case user flows.
- If any required test hooks or selectors are missing, coordinate with the implementation team to add them.

---

## 4. Expected Output & Deliverables

- Playwright test files covering all above scenarios, stored in the appropriate `tests/e2e/` directory (or as per project convention).
- Any updated configuration or helper files required for E2E testing.
- A summary log in `Memory_Bank.md` referencing:
  - The assigned testing task in the Implementation Plan.
  - A description of the E2E test coverage and outcomes.
  - Any issues found or fixed during testing.

---

## 5. Memory Bank Logging Instructions (Mandatory)

Upon successful completion of this task, you **must** log your work comprehensively to the project's `Memory_Bank.md` file.

Adhere strictly to the established logging format. Ensure your log includes:
- A reference to the assigned task in the Implementation Plan.
- A clear description of the actions taken.
- Any code snippets generated or modified.
- Any key decisions made or challenges encountered.
- Confirmation of successful execution (e.g., tests passing, output generated).

*If a dedicated `Memory_Bank_Log_Format.md` file exists, reference it. Otherwise, follow the points above.*

---

## 6. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding.
