# APM Task Assignment: Doppler-Calc Feature Implementation

## 1. Agent Role & APM Context

*   **Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project.
*   **Your Role:** Your role is to execute assigned software implementation tasks diligently and log your work meticulously for review by the Manager Agent.
*   **Workflow:** You will receive tasks like this one, perform the implementation, and then log your results to the project's Memory Bank. The Manager Agent (via the User) will review your work and provide subsequent tasks.

## 2. Onboarding / Context from Prior Work

Significant work has been completed on the GramFrame component. Here is a summary of the current state:

*   **Development Harness:** A `debug.html` page exists that loads the component and provides a live-reloading development environment.
*   **Core UI:** The UI is composed of two main parts:
    1.  A spectrogram panel that displays a sample image (`/sample/mock-gram.png`).
    2.  An LED-style diagnostics panel above the image that displays time and frequency based on mouse position.
*   **State Management:** The component manages state for image dimensions, mouse coordinates, and the current operational mode.
*   **Coordinate System:** The system correctly calculates and displays time and frequency coordinates based on mouse interaction with the spectrogram image.

Your task is to replace the existing `Doppler Mode` with the new `Doppler-Calc` feature.

## 3. Task Assignment

*   **Reference:** This assignment corresponds to the implementation of the `Doppler-Calc` feature, as detailed in `docs/Doppler-Calc.md`. Consider this `Phase 3, Task 1`.
*   **Objective:** Implement the user workflow for estimating the relative speed of a target by visually fitting a Doppler-shifted frequency curve on the spectrogram.

*   **Detailed Action Steps:**

    1.  **State Management:**
        *   Define the `DopplerPoint` and `DopplerFit` types in your component's state management, as specified in `docs/Doppler-Calc.md`.
        *   Add a `dopplerFit` object to the component's state to hold the `fPlus`, `fMinus`, `fZero` points, and the calculated `speed`.
        *   Initialize this state to be empty or null.
        *   Stop for review

    2.  **Event Handling (`click`):**
        *   Modify the existing `click` handler. When the component is in `Doppler` mode, the click logic should be as follows:
            *   The **first click** sets the `fPlus` point (end of engagement).
            *   The **second click** sets the `fMinus` point (start of engagement).
            *   Subsequent clicks in `Doppler` mode should do nothing until the points are reset.
        *   After the second click (`fMinus` is set), you must calculate the initial `fZero` point. Its time coordinate is the midpoint between `fPlus.time` and `fMinus.time`, and its frequency is the midpoint between `fPlus.frequency` and `fMinus.frequency`.
        *   Stop for review

    3.  **UI Rendering (Markers & Curve):**
        *   When `fPlus` is set, render a red dot marker at its coordinates.
        *   When `fMinus` is set, render a blue dot marker at its coordinates.
        *   When `fZero` is set, render a draggable green cross-hair marker at its coordinates.
        *   Once `fPlus` and `fMinus` are set, render a smooth S-curve connecting them. A simple cosine or sigmoid interpolation is sufficient. The curve should visually react to changes in the marker positions.
        *   Stop for review

    4.  **Speed Calculation:**
        *   Implement the speed calculation logic as defined in `docs/Doppler-Calc.md`:
            *   `Δf = (fPlus.frequency - fMinus.frequency) / 2`
            *   `v = (c / fZero.frequency) × Δf` (where `c` = 1500 m/s).
        *   This calculation should be triggered whenever `fPlus`, `fMinus`, or `fZero` are updated.
        *   Stop for review

    5.  **UI Rendering (Speed Readout):**
        *   Create a new UI element to display the calculated speed (`v`) in m/s.
        *   This readout should update in real-time as the Doppler curve is manipulated.
        *   Stop for review

    6.  **Interaction (`drag`):**
        *   Implement drag functionality for all three markers (`fPlus`, `fMinus`, `fZero`).
        *   When any marker is dragged, you must:
            *   Update its corresponding `time` and `frequency` in the state.
            *   Recalculate the speed.
            *   Redraw the S-curve to reflect the new marker positions.
        *   Stop for review

    7.  **Reset Functionality:**
        *   Implement a mechanism to reset the Doppler tool. This can be a dedicated button or triggered by switching out of `Doppler` mode.
        *   Resetting should clear the `dopplerFit` state and remove all related UI elements (markers, curve) from the display.
        *   Stop for review

## 4. Expected Output & Deliverables

*   **Success:** The task is complete when a user can enter `Doppler` mode, place `f+` and `f-` markers, see a curve, drag all three markers to fit a visual target, and see a live-updating speed calculation.
*   **Deliverables:** Modified component source file(s) containing the full implementation of the `Doppler-Calc` feature.

## 5. Memory Bank Logging Instructions (Mandatory)

*   **Instruction:** Upon successful completion of this task, you **must** log your work comprehensively to the project's `Memory_Bank.md` file.
*   **Format Adherence:** Adhere strictly to the established logging format. Ensure your log includes:
    *   A reference to this task (`Phase 3, Task 1`).
    *   A clear description of the actions taken to implement the feature.
    *   Key code snippets for state management, calculation, and rendering.
    *   Confirmation of successful execution (i.e., the feature operates as described).

## 6. Clarification Instruction

*   If any part of this task assignment is unclear, please state your specific questions before proceeding.
