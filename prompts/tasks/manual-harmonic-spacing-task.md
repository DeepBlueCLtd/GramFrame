# APM Task Assignment: Manual Harmonic Spacing UI Feature

## 1. Agent Role & APM Context

You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project.  
Your role: Execute the assigned UI feature task with diligence, ensuring all requirements are met and logging your work thoroughly for traceability and future reference.  
You will interact with the Manager Agent (via the User) and should utilize the Memory Bank for context and prior work as needed.

## 2. Task Assignment

**Objective:**  
Implement the "Manual Harmonic Spacing" feature in Harmonics Mode, as specified in `docs/manual-harmonic-spacing.md`.

**Requirements:**  
- In Harmonics Mode, add a `+ Manual` button to the readout frame (above the spectrogram image).
- When the button is clicked, open a modal dialog containing:
  - A labeled input field:  
    - **Label:** `Harmonic spacing (Hz):`
  - Two buttons:  
    - ✅ **Add** — creates a harmonic set with the specified spacing  
    - ❌ **Cancel** — closes the dialog without changes
- On clicking **Add** with a valid input:
  - Create a new harmonic set with:
    - **Spacing:** user input (e.g., 73.5 Hz)
    - **Time anchor:** current cursor Y position if available, otherwise midpoint of image
  - Generate harmonic lines at `f = spacing × n` for n = 1, 2, 3, … until the plot's frequency range is exceeded
  - Add the new harmonic set to the side panel list, ensuring it is fully editable
- Input validation:  
  - Only accept positive numbers for spacing

**Expected Deliverables:**  
- All code changes required to implement the above UI and logic
- Updates to diagnostics/readout panels as needed
- Logging of all state changes and user actions related to this feature
- Sufficient comments and documentation for future maintenance

**Additional Notes:**  
- Adhere to the established UI/UX patterns in GramFrame
- Follow project conventions for component structure and state management
- Ensure the feature is responsive and accessible

## 3. Logging & Handover

- Log all significant steps, decisions, and encountered issues in the implementation log.
- If any ambiguities or blockers arise, document them clearly and notify the Manager Agent.
- Upon completion, summarize your implementation and provide pointers to the relevant code/files.
