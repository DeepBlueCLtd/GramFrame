# APM Task Assignment: Harmonics Mode Implementation

## 1. Agent Role & APM Context

You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project. Your role is to execute assigned tasks diligently and log your work meticulously to the Memory Bank. You will work under the guidance of the Manager Agent and contribute to the overall project success through careful implementation of the harmonics analysis features.

## 2. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to `Phase 4, Task 4.3` in the [Implementation_Plan.md](../../Implementation_Plan.md): "Implement Harmonics feature with correct line drawing".

**Objective:** Implement a complete harmonics mode that allows analysts to create, manipulate, and manage multiple harmonic sets for identifying frequency-domain patterns in spectrogram data.

### Detailed Action Steps

Based on the technical specifications in [Updated-Harmonics.md](../../docs/Updated-Harmonics.md), [Gram-Modes.md](../../docs/Gram-Modes.md), and [manual-harmonic-spacing.md](../../docs/manual-harmonic-spacing.md), implement the following functionality:

#### 4.3.1 Harmonic Set Creation
- **Click-to-Create:** When in Harmonics mode, clicking on the spectrogram creates a new harmonic set
- **Initial Positioning:** Place the cursor at the 10th harmonic if frequency axis origin > 0, otherwise at the 5th harmonic
- **Color assignment:** Use the existing `Harmonic Color` control to assign a color to the new harmonic set
- **Persistence:** Harmonic sets remain visible after mouse release

#### 4.3.2 Drag-to-Adjust Interaction
Before starting this task, check for implementation of existing features in `AnalysisMode.js`, particularly 
those related to creating and updating harmonics sets, so they can be re-used.

- **Hover Detection:** Show grab cursor when hovering over harmonic lines
- **Dual-axis Dragging:** 
  - Horizontal drag updates frequency spacing
  - Vertical drag updates anchor time position
- **Real-time Updates:** Harmonics recalculate and redraw during drag operations
- **Constraint Logic:** Ensure the dragged harmonic line remains under the cursor

#### 4.3.3 Manual Harmonic Creation **COMPLETED**
- **Manual Button:** Add `+ Manual` button to the readout panel in Harmonics mode
- **Modal Dialog:** Implement modal with:
  - Input field for "Harmonic spacing (Hz):"
  - Add and Cancel buttons
  - Input validation (positive decimal ≥ 1.0 Hz)
- **Creation Logic:** Generate harmonics at `f = spacing × n` starting from n=1

#### 4.3.4 Harmonic Management Panel **COMPLETED**
- **Side Panel Display:** Show table with columns: Color, Spacing (Hz), Rate
- **Rate Calculation:** Calculate as `cursor frequency / spacing`
- **Delete Functionality:** Each set has a delete button that removes it immediately
- **Visual Coordination:** Color coding matches harmonic line colors

#### 4.3.5 Visual Implementation
- **Vertical Lines:** Draw harmonics as vertical lines at calculated frequencies
- **Height Constraint:** Limit harmonic overlays to 20% of spectrogram height
- **Color Distinction:** Ensure each harmonic set has a unique, readable color
- **Smooth Updates:** Implement smooth visual transitions during drag operations

#### 4.3.6 Mode Integration
- **Mode Switching:** Integrate with existing mode system (Analysis, Harmonics, Doppler)
- **Cross-mode Coordination:** Work with FeatureRenderer for cross-mode feature visibility

### Technical Context & Constraints

**Coordinate System Reference:** Review [ADR-002-Multiple-Coordinate-Systems.md](../../docs/ADRs/ADR-002-Multiple-Coordinate-Systems.md) to understand the coordinate transformations between screen, SVG, image, and data coordinates.

**Existing Architecture:** Build upon the modular mode system established in [ADR-008-Modular-Mode-System.md](../../docs/ADRs/ADR-008-Modular-Mode-System.md). Extend the BaseMode class and integrate with ModeFactory.

**State Management:** Utilize the centralized state system from [ADR-004-Centralized-State-Management.md](../../docs/ADRs/ADR-004-Centralized-State-Management.md) for harmonic set data and listener notifications.

**File Locations:**
- Main implementation: `src/modes/harmonics/HarmonicsMode.js`
- Manual modal component: `src/modes/harmonics/ManualHarmonicModal.js`
- Type definitions: `src/modes/harmonics/types.js`
- Harmonic panel component: `src/components/HarmonicPanel.js`

## 3. Expected Output & Deliverables

**Define Success:** The harmonics mode is fully functional with:
- Click-to-create harmonic sets with proper initial positioning
- Drag-to-adjust functionality for both spacing and time
- Manual harmonic creation via modal dialog
- Management panel showing all active harmonic sets
- Proper cleanup when switching modes
- Visual feedback and smooth interactions

**Specify Deliverables:**
- Modified `src/modes/harmonics/HarmonicsMode.js` with complete functionality
- New `src/modes/harmonics/ManualHarmonicModal.js` component
- Updated `src/components/HarmonicPanel.js` with management features
- Updated type definitions in `src/modes/harmonics/types.js`
- Integration with existing mode switching system
- Updated CSS styles for harmonic overlays and UI components

**Testing Requirements:** Ensure the implementation supports the test scenarios outlined in section 7 of [Updated-Harmonics.md](../../docs/Updated-Harmonics.md), including:
- Harmonic persistence after creation
- Live spacing updates during horizontal drag
- Anchor time updates during vertical drag
- Proper behavior with frequency axis origin > 0
- Correct spacing/rate calculations

## 4. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

**Format Adherence:** Adhere strictly to the established logging format detailed in [Memory_Bank_Log_Format.md](../02_Utility_Prompts_And_Format_Definitions/Memory_Bank_Log_Format.md). Ensure your log includes:
- A reference to Phase 4, Task 4.3 in the Implementation Plan
- A clear description of the harmonics mode implementation approach
- Key architectural decisions made during implementation
- Any challenges encountered and how they were resolved
- Code snippets for critical functionality (harmonic calculations, drag logic)
- Confirmation of successful integration with existing mode system
- Summary of visual and interaction features implemented

## 5. Clarification Instruction

If any part of this task assignment is unclear, particularly regarding the coordinate system transformations, harmonic calculation algorithms, or integration with the existing mode system, please state your specific questions before proceeding.