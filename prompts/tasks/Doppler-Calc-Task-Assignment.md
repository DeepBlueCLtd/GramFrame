# APM Task Assignment: Doppler Curve-Based Speed Estimation Tool Implementation

## 1. Agent Role & APM Context

You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project.

**Your Role:** Execute the assigned Doppler Curve-Based Speed Estimation Tool implementation task diligently and log your work meticulously.

**Workflow:** Interact with the Manager Agent (via the User) as needed and use the project's Memory Bank for all logging and context continuity.

*Note: If a dedicated `Agent_Onboarding_Context.md` file exists within the APM assets, you may reference it for further details. Otherwise, follow this summary.*

---

## 2. Onboarding / Context from Prior Work

- The Doppler-Calc feature specification has been reviewed and stored at `prompts/tasks/Doppler-Calc.md`.
- Previous work includes the setup of the diagnostics panel, responsive layout, state structure refactoring, and spectrogram image handling.
- This task builds upon the existing diagnostics and spectrogram infrastructure.
- Note that for `Harmonics` mode we have introduced code to handle draggable elements, plus calculated lines on the spectrogram image.
---

## 3. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to the Doppler Curve-Based Speed Estimation Tool in the GramFrame Implementation Plan.

**Objective:** Implement the interactive Doppler speed estimation tool, enabling users to fit a Doppler curve on a spectrogram and receive real-time speed estimates based on marker manipulation.

**Phased Implementation of Detailed Action Steps:**

---

### Phase 1: UI Overlay & Marker Placement
1. Implement UI overlays (Canvas or SVG) for the Doppler tool on the spectrogram display, following the spec in `docs/Doppler-Calc.md`.
2. Enable placing and dragging of the `f+`, `f−`, and `f₀` markers, with correct color and pointer behavior.

**Test/Review Checkpoint:**
- Confirm overlays render correctly and markers can be placed and moved as expected.

---

### Phase 2: Curve Drawing & Guides
3. Draw a smooth S-curve interpolating between `f−` and `f+`, dynamically updating as markers are moved.
4. Render vertical guide lines from `f+` and `f−` to the panel edges.

**Test/Review Checkpoint:**
- Verify that the curve and guides update responsively with marker movement.

---

### Phase 3: Speed Calculation & Display
5. Calculate and display the estimated speed in real time using the formula:
   - Δf = (f+ - f−) / 2
   - v = (c / f₀) × Δf (c = 1500 m/s by default)
6. Ensure all marker positions map directly to the spectrogram image space.

**Test/Review Checkpoint:**
- Validate speed calculations and ensure marker positions correspond to spectrogram coordinates.

---

### Phase 4: Mode Handling & UX Polish
7. Implement reset and mode-change behaviors as described in the spec.
8. Ensure the tool is only active in Doppler mode and cleans up overlays/markers when mode changes.
9. Prioritize real-time, low-latency updates and smooth user interactions.

**Final Test/Review:**
- Confirm mode switching, reset, and overall UX meet requirements.

---

**Provide Necessary Context/Assets:**
- Full Doppler-Calc spec: `prompts/tasks/Doppler-Calc.md`
- Data model reference (from spec):
  ```ts
  type DopplerPoint = {
    time: number;       // in seconds
    frequency: number;  // in Hz
  };

  type DopplerFit = {
    fPlus: DopplerPoint;
    fMinus: DopplerPoint;
    fZero: DopplerPoint;
    speed: number;      // in m/s
  };
  ```
- Use project conventions for TypeScript, React, and state management.
- See diagnostics panel and spectrogram image code for integration patterns.
- Constraints: All work must be compatible with the responsive layout and diagnostics panel.

---

## 4. Expected Output & Deliverables

- Fully functional Doppler curve tool, integrated with the spectrogram and diagnostics panel.
- All code, components, and assets committed according to project standards.
- Updated/created files as required (list explicitly in your log).
- All marker interactions, curve rendering, and speed calculations must work as described in the spec.
- The feature must be accessible only in Doppler mode and clean up on mode exit.

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
