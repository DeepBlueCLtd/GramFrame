# APM Task Assignment: Implement Zoom Functionality

## 1. Agent Role & APM Context

*   **Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the GramFrame project.
*   **Your Role:** Your responsibility is to execute the assigned tasks diligently, following established architectural patterns, and logging your work meticulously to the Memory Bank.
*   **Workflow:** You will interact with the Manager Agent (via the User) and must document all significant decisions, code changes, and test results in the Memory Bank.

## 2. Task Assignment

*   **Reference Implementation Plan:** This assignment represents a new Phase 6 addition to the Implementation Plan, specifically implementing zoom functionality as specified in [Zoom-Requirements](../../docs/Zoom-Requirements.md).
*   **Objective:** Implement comprehensive zoom and pan functionality for the GramFrame spectrogram viewer that works across all modes (Analysis, Harmonics, and Doppler).
*   **Detailed Action Steps:**
    
    1. **Create Zoom State Management Infrastructure**
        - First, add type definitions to `src/types.js`:
            ```javascript
            /**
             * Zoom state information
             * @typedef {Object} ZoomState
             * @property {number|null} freqMin - Minimum frequency in zoomed view (null = use original)
             * @property {number|null} freqMax - Maximum frequency in zoomed view (null = use original)
             * @property {number|null} timeMin - Minimum time in zoomed view (null = use original)
             * @property {number|null} timeMax - Maximum time in zoomed view (null = use original)
             * @property {number} zoomLevel - Current zoom level (1.0 = no zoom, 2.0 = 2x zoom)
             * @property {boolean} isZoomed - Whether view is currently zoomed
             */
            ```
        - Add the `zoomState` property to the `GramFrameState` typedef in `src/types.js`:
            ```javascript
            /**
             * @property {ZoomState} zoomState - Current zoom state
             */
            ```
        - Add a `zoomState` object to the core state management system in `src/core/state.js`:
            ```javascript
            /** @type {ZoomState} */
            zoomState: {
                freqMin: null,
                freqMax: null,
                timeMin: null,
                timeMax: null,
                zoomLevel: 1.0,
                isZoomed: false
            }
            ```
        - Ensure state changes are properly broadcast to all listeners
        - Add methods for updating zoom state with proper validation and type annotations:
            ```javascript
            /**
             * Updates the zoom state
             * @param {Partial<ZoomState>} updates - Partial zoom state updates
             * @returns {void}
             */
            updateZoomState(updates) {
                // Implementation here
            }
            ```
    
    2. **Update Coordinate Transformation System**
        - Modify all coordinate transformation methods in `src/utils/coordinates.js` to respect zoom state
        - Key methods to update with proper JSDoc annotations:
            ```javascript
            /**
             * Converts SVG coordinates to data coordinates, respecting zoom state
             * @param {number} svgX - SVG x coordinate
             * @param {number} svgY - SVG y coordinate
             * @param {ZoomState} zoomState - Current zoom state
             * @returns {DataCoordinates} Data coordinates (freq, time)
             */
            svgToDataCoordinates(svgX, svgY, zoomState)
            
            /**
             * Converts data coordinates to SVG coordinates, respecting zoom state
             * @param {number} freq - Frequency value in Hz
             * @param {number} time - Time value in seconds
             * @param {ZoomState} zoomState - Current zoom state
             * @returns {SVGCoordinates} SVG coordinates
             */
            dataToSVGCoordinates(freq, time, zoomState)
            ```
        - Ensure transformations remain accurate at all zoom levels
        - Guidance: Use the pattern `zoomState.freqMin ?? this.config.freqMin` (use nullish coalescing for proper null handling)
    
    3. **Implement Double-Click Zoom Behavior**
        - Add double-click event handler to the main SVG overlay
        - Define zoom constants with JSDoc:
            ```javascript
            /** @const {number} Default zoom factor for double-click zoom */
            const ZOOM_FACTOR = 2.0;
            ```
        - Implement zoom handler with proper type annotations:
            ```javascript
            /**
             * Handles double-click zoom
             * @param {MouseEvent} event - The double-click event
             * @returns {void}
             */
            handleDoubleClickZoom(event) {
                // Calculate click position in data coordinates
                // Apply zoom factor centered on clicked location
                // Update zoom state with new bounds
                // Ensure zoomed area doesn't exceed original data bounds
            }
            ```
        - Guidance: Use a configurable `ZOOM_FACTOR` constant (default 2.0) for easy adjustment
    
    4. **Implement Right-Click Pan Functionality**
        - First, add pan state type definition to `src/types.js`:
            ```javascript
            /**
             * Pan drag state
             * @typedef {Object} PanState
             * @property {boolean} isPanning - Whether currently panning
             * @property {ScreenCoordinates|null} panStartPosition - Starting position of pan
             * @property {ZoomState|null} panStartZoomState - Zoom state at pan start
             */
            ```
        - Add right-click + drag event handling to enable panning while zoomed:
            ```javascript
            /**
             * Handles right-click pan start
             * @param {MouseEvent} event - The mouse event
             * @returns {void}
             */
            handlePanStart(event) {
                if (event.button !== 2) return; // Right-click only
                event.preventDefault(); // Suppress context menu
                // Track pan start position and current zoom state
            }
            
            /**
             * Handles pan drag movement
             * @param {MouseEvent} event - The mouse event
             * @returns {void}
             */
            handlePanMove(event) {
                // Calculate pan delta and update zoom bounds
                // Ensure panning respects original data boundaries
            }
            ```
        - Update zoom state continuously during pan for smooth experience
    
    5. **Add Reset Zoom UI Button**
        - Create a new UI component for the Reset Zoom button in `src/components/UIComponents.js`
        - Position the button as an overlay in the top-right corner of the spectrogram:
            ```javascript
            /**
             * Creates a reset zoom button
             * @param {function(): void} onReset - Callback when reset is clicked
             * @returns {HTMLButtonElement} The reset zoom button element
             */
            createResetZoomButton(onReset) {
                const button = document.createElement('button');
                button.className = 'gramframe-reset-zoom';
                button.textContent = 'Reset Zoom';
                button.style.position = 'absolute';
                button.style.top = '10px';
                button.style.right = '10px';
                button.style.zIndex = '1000'; // Ensure it's above the spectrogram
                // Additional styling to match existing UI
                return button;
            }
            ```
        - Implement reset functionality with proper type annotations:
            ```javascript
            /**
             * Resets zoom to original view
             * @returns {void}
             */
            resetZoom() {
                this.state.zoomState = {
                    freqMin: null,
                    freqMax: null,
                    timeMin: null,
                    timeMax: null,
                    zoomLevel: 1.0,
                    isZoomed: false
                };
                this._notifyStateListeners();
            }
            ```
        - Style button to match existing UI components with semi-transparent background
        - Show/hide button based on zoom state (only visible when zoomed)
    
    6. **Update Axis Rendering for Zoom**
        - Modify axis rendering in `src/rendering/axes.js` to use zoom bounds
        - Add proper type annotations for axis functions:
            ```javascript
            /**
             * Renders axes with zoom-aware bounds
             * @param {ZoomState} zoomState - Current zoom state
             * @param {Config} config - Original configuration bounds
             * @returns {void}
             */
            renderAxes(zoomState, config) {
                // Use zoomState bounds or fall back to config bounds
            }
            ```
        - Recalculate tick intervals based on zoomed range for appropriate granularity
        - Update tick labels to show zoomed coordinate values
        - Ensure axis labels remain readable at all zoom levels
        - Guidance: Reference ADR-012 for scale-adjusted font sizing patterns
    
    7. **Update All Mode Overlays**
        - **Analysis Mode**: Ensure markers remain at correct positions when zoomed
        - **Harmonics Mode**: Update harmonic line calculations to use zoomed coordinates
        - **Doppler Mode**: Ensure Doppler curves render correctly in zoomed view
        - All interactive elements must use the updated coordinate transformation methods
        - Add type annotations for mode-specific zoom integration:
            ```javascript
            /**
             * Updates mode rendering for zoom changes
             * @param {ZoomState} zoomState - Current zoom state
             * @returns {void}
             */
            updateForZoom(zoomState) {
                // Mode-specific zoom handling
            }
            ```
        - Guidance: Reference ADR-011 for Feature Renderer cross-mode coordination patterns
    
    8. **Preserve Zoom State Across Mode Switches**
        - Ensure zoom state persists when switching between Analysis, Harmonics, and Doppler modes
        - Mode switch should NOT reset zoom level (as per requirements)
        - Test that all modes render correctly with inherited zoom state
        - Add proper state handling:
            ```javascript
            /**
             * Switches mode while preserving zoom state
             * @param {ModeType} newMode - The mode to switch to
             * @returns {void}
             */
            switchMode(newMode) {
                // Switch mode but preserve zoom state
            }
            ```

*   **Provide Necessary Context/Assets:**
    - Review [Zoom-Requirements](../../docs/Zoom-Requirements.md) for complete requirements and implications
    - Reference [ADR-001-SVG-Based-Rendering](../../docs/ADRs/ADR-001-SVG-Based-Rendering.md) for understanding the rendering architecture
    - Reference [ADR-002-Multiple-Coordinate-Systems](../../docs/ADRs/ADR-002-Multiple-Coordinate-Systems.md) for coordinate transformation patterns
    - Reference [ADR-004-Centralized-State-Management](../../docs/ADRs/ADR-004-Centralized-State-Management.md) for state update patterns
    - Reference [ADR-008-Modular-Mode-System](../../docs/ADRs/ADR-008-Modular-Mode-System.md)  for mode-specific implementation patterns
    - The existing coordinate system uses these ranges:
        - Frequency: horizontal axis (left to right)
        - Time: vertical axis (bottom to top - note inverted Y)
        - SVG coordinates have margins: left=60px, bottom=50px

## 3. Expected Output & Deliverables

*   **Define Success:** 
    - Zoom functionality works smoothly across all three modes
    - Double-click zooms in 2x centered on click location
    - Right-click + drag pans the zoomed view
    - Reset Zoom button returns to full view
    - Axes and all overlays render correctly at any zoom level
    - Zoom state persists across mode switches
    - No performance degradation during zoom/pan operations

*   **Specify Deliverables:**
    - Modified state management with zoom support
    - Updated coordinate transformation system
    - New event handlers for zoom and pan
    - Reset Zoom UI button component
    - Updated axis rendering logic
    - Modified mode implementations to support zoom
    - All code changes properly documented with JSDoc comments and type annotations

## 4. Memory Bank Logging Instructions

*   **Instruction:** Upon successful completion of this task, you **must** log your work comprehensively to the project's Memory Bank at [Memory_Bank](../../Memory_Bank.md) .
*   **Format Adherence:** Create the following structure:
    ```
    /Memory/Phase_6_Zoom/
    ├── Task_6.1_Core_Implementation/
    │   ├── zoom_state_management.md
    │   ├── coordinate_transformations.md
    │   ├── event_handlers.md
    │   └── code_snippets/
    └── implementation_summary.md
    ```
*   **Log Content:** Include:
    - Reference to this task assignment
    - Description of implementation approach for each component
    - Key code snippets showing zoom calculations
    - Any challenges encountered and solutions
    - Performance considerations addressed
    - Confirmation of successful testing across all modes

## 5. Testing Considerations

While formal test implementation will be assigned to a Testing Agent, please verify your implementation by:
- Testing zoom at various levels (2x, 4x, 8x)
- Verifying pan boundaries are respected
- Checking all three modes with zoom active
- Testing zoom reset functionality
- Verifying coordinate readouts remain accurate when zoomed
- Ensuring no visual artifacts or performance issues

## 6. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. Pay particular attention to:
- Integration with existing coordinate transformation system
- Maintaining compatibility with all three modes
- Performance optimization strategies for smooth zoom/pan
- Type safety requirements with JSDoc annotations