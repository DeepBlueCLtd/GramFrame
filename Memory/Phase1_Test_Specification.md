# Test Specification: GramFrame Phase 1

## Overview

This document outlines the test specifications for Phase 1 of the GramFrame component implementation, focusing on the bootstrapping and development harness tasks.

## Test Scope

- Task 1.1: Create `debug.html` page that loads a fixed component instance manually
- Task 1.2: Set up CSS styling for the component
- Task 1.3: Hook up "Hello World" from component inside the debug page
- Task 1.4: Set up hot module reload and visible console logging for state

## Test Cases

### 1. Debug Page Loading

**Description**: Verify that the debug.html page loads correctly and displays the expected UI elements.

**Test Steps**:
1. Navigate to the debug.html page
2. Verify the page title is "GramFrame Debug Page"
3. Verify the page contains a component container
4. Verify the page contains a diagnostics panel

**Expected Results**:
- Page loads without errors
- All UI elements are visible and properly styled
- Page title is "GramFrame Debug Page"

### 2. Component Initialization

**Description**: Verify that the GramFrame component initializes correctly when the page loads.

**Test Steps**:
1. Navigate to the debug.html page
2. Observe the component initialization process
3. Check the state display in the diagnostics panel

**Expected Results**:
- Component initializes without errors
- "Hello World" message appears
- State display shows the initial component state
- The spectrogram config table is replaced with the component UI

### 3. CSS Styling

**Description**: Verify that the component is properly styled according to the design requirements.

**Test Steps**:
1. Navigate to the debug.html page
2. Inspect the component container
3. Inspect the LED readout panel
4. Inspect the mode switching UI
5. Inspect the rate input

**Expected Results**:
- Component container has the correct layout and styling
- LED readout panel has green text on black background
- Mode switching UI buttons are properly styled
- Rate input is properly styled

### 4. Canvas Rendering

**Description**: Verify that the spectrogram image is properly rendered on the canvas.

**Test Steps**:
1. Navigate to the debug.html page
2. Inspect the canvas element
3. Verify the spectrogram image is displayed

**Expected Results**:
- Canvas element is created
- Spectrogram image is rendered on the canvas
- Canvas dimensions match the image dimensions

### 5. State Management

**Description**: Verify that the component state is properly managed and displayed.

**Test Steps**:
1. Navigate to the debug.html page
2. Move the mouse over the spectrogram image
3. Observe the state changes in the diagnostics panel

**Expected Results**:
- State updates when mouse moves over the canvas
- LED displays show the current time and frequency values
- State display in diagnostics panel updates in real-time

### 6. Mode Switching

**Description**: Verify that the mode switching UI works correctly.

**Test Steps**:
1. Navigate to the debug.html page
2. Click on the "Harmonics" mode button
3. Click on the "Doppler" mode button
4. Click on the "Analysis" mode button

**Expected Results**:
- Active mode button is highlighted
- Mode is updated in the component state
- Mode LED display shows the current mode

### 7. Rate Input

**Description**: Verify that the rate input works correctly.

**Test Steps**:
1. Navigate to the debug.html page
2. Enter a new rate value (e.g., 2.5)
3. Press Enter or click outside the input

**Expected Results**:
- Rate value is updated in the component state
- State display in diagnostics panel shows the new rate value

### 8. Debug Controls

**Description**: Verify that the debug controls work correctly.

**Test Steps**:
1. Navigate to the debug.html page
2. Click the "Toggle Canvas Bounds" button
3. Click the "Toggle Debug Grid" button
4. Click the "Force Update" button

**Expected Results**:
- Console logs show the appropriate messages for each button click
- Toggle Grid button changes state when clicked

## Edge Cases and Error Handling

### 1. Invalid Rate Input

**Description**: Verify that the component handles invalid rate input correctly.

**Test Steps**:
1. Navigate to the debug.html page
2. Enter a negative rate value (e.g., -1)
3. Enter a non-numeric value (e.g., "abc")

**Expected Results**:
- Component rejects negative values
- Component rejects non-numeric values
- Rate input maintains its previous valid value

### 2. Missing Image

**Description**: Verify that the component handles missing spectrogram images gracefully.

**Test Steps**:
1. Modify the debug.html page to use a non-existent image URL
2. Reload the page

**Expected Results**:
- Component displays an appropriate error message
- No JavaScript errors occur

## Test Environment

- Browser: Chrome (latest version)
- Development server: Vite
- Test data: Sample spectrogram image and config table in debug.html

## Test Dependencies

- Task 1.1 must be completed before testing
- Task 1.2 must be completed before testing CSS styling
- Vite development server must be running

## Notes

- These tests focus on manual verification for Phase 1
- Automated Playwright tests will be added in Phase 2
- Hot module reload functionality will be tested as part of Task 1.4
